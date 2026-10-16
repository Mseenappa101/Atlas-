# FIRMWARD document API

A small Node HTTP server (no framework) that parses and builds resumes and writes cover letters with Claude
(`claude-sonnet-5`). It uses Supabase for auth, data and file storage. It needs migration
`003_profiles_and_documents.sql`.

```
npm run api                       # listens on :8787
npm run test:api                  # unit tests, no network
node api/test/e2e.js              # HTTP end-to-end on live Supabase, no Claude spend
E2E_CLAUDE=1 node api/test/e2e.js # same plus real parse/build/letters (about $0.10–0.20)
node api/test/live-claude.js      # prompt checks only, writes outputs to $TMPDIR/firmward-live
node api/test/fixtures/make-fixtures.js  # rebuild the sample PDF/DOCX (fictional person)
```

## Env

Read from the environment, falling back to `.env.local` for local dev.

| Name | Default | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` (or `SUPABASE_URL`) | required | |
| `SUPABASE_SERVICE_ROLE_KEY` | required | Server only. Verifies tokens and bypasses RLS. |
| `ANTHROPIC_API_KEY` | required | Falls back to `VITE_ANTHROPIC_API_KEY`. Rename it: `VITE_` vars get bundled into the browser build. |
| `API_PORT` | `8787` | |
| `API_ALLOWED_ORIGINS` | `http://localhost:5173` | Comma list of exact origins, e.g. `https://firmward.org,http://localhost:5173`. |
| `DAILY_GENERATION_CAP` | `30` | Claude calls per user per rolling 24h, counted from `generation_log`. |

`e2e.js` also needs `VITE_SUPABASE_ANON_KEY` so it can sign in as the test user.

## Routes

All routes except health need `Authorization: Bearer <supabase access token>`. Errors always look like
`{ error: '<code>', message: '<sentence a student can read>' }`.

| Route | Returns | Errors |
|---|---|---|
| `GET /api/health` | `{ ok: true }` | |
| `GET /api/me/usage` | `{ plan, letters_used, letters_limit }` | 401 |
| `POST /api/resume/parse` `{ file_base64, file_name, mime_type }` | `{ resume }` | 400, 413 `file_too_large`, 415 `unsupported_file`, 422 `not_a_resume`, 429 `daily_cap`, 502 `ai_failed` |
| `POST /api/resume/build` `{ answers }` | `{ resume }` | 400, 429, 502 |
| `PUT /api/resume` `{ resume }` | `{ resume }` | 400 `invalid_resume` |
| `POST /api/letters` `{ firm_id?, listing_id?, notes? }` | `{ document, usage }` | 400, 402 `limit_reached` (+`used`, `limit`), 404, 409 `no_resume`, 422 `no_firm`, 429, 502 |

Notes:
- The file type comes from the file's bytes (`%PDF-`, or a zip containing `word/document.xml`), not from
  `mime_type` or the file name.
- Every resume returned or saved passes through `sanitizeResume` (`resume.js`), so the frontend always gets
  the full shape with strings and string arrays.
- Builder output is pinned to the answers: name, email, phone and location are copied verbatim; GPA is
  dropped unless the student gave it; any employer the student didn't name is dropped.
- Every Claude call, including failed ones, writes a `generation_log` row. Failed letters write no
  `documents` row, so they don't count toward the free limit.
- CORS allows `PUT` as well as GET/POST/OPTIONS, because `PUT /api/resume` needs it in a browser.

## Files

`index.js` (server, routing, auth, shutdown) · `routes.js` (handlers) · `claude.js` (one structured-output
call + logging + daily cap) · `resume.js` (schema, sanitizer, prompts) · `letters.js` (prompt, assembly) ·
`files.js` (base64, type sniffing, DOCX text) · `db.js` · `http.js` · `config.js`

## Deploy

It runs like the worker: one small long-lived Node 22 process, with no build step. Both can run on the
same host. They don't share a port or any state.

```
docker build -f api/Dockerfile -t firmward-api .
docker run --env-file .env.production -p 8787:8787 firmward-api
```

Or on a plain VM, without Docker: `npm ci --omit=dev && npm run api` under systemd or pm2, next to
`npm run worker`. Put it behind HTTPS (Caddy, nginx or the platform's proxy) and point the frontend at
`https://<api host>/api/...`. Set `API_ALLOWED_ORIGINS` to the site's origin. On SIGTERM the server stops
taking new connections and lets in-flight Claude calls finish (up to about 2.5 minutes), so give the
platform's stop timeout that much room.
