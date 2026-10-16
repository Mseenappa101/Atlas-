# ATLAS scraper worker

Long-running process that keeps `listings` fresh. Each cycle (default every 5 min) it:

1. Polls submitted Claude batches and applies finished extractions.
2. Checks every active `sources` row whose `next_check_at` is due (up to 200; 8 at a time; ≥10s between requests to one host; robots.txt respected).
3. For pages: normalizes the text and hashes it. If the hash is unchanged it stops there. If the page changed but has no law-student terms, it closes that source's open listings. Otherwise it queues an `extraction_jobs` row.
4. For Greenhouse/Lever/USAJOBS sources: reads the public JSON API and classifies roles with keyword rules (no LLM).
5. Submits queued jobs to `claude-haiku-4-5` as one Message Batch (50% off), under the monthly budget.
6. Writes one `scrape_runs` row.

Sources are rechecked every `check_interval_minutes` (default 480 = 3×/day, ±10% jitter). Failures back off 1h, 2h, 4h… up to 7 days. A source is deactivated after 10 failures in a row.

## Env vars

| Var | Default | |
|---|---|---|
| `VITE_SUPABASE_URL` (or `SUPABASE_URL`) | — | required |
| `SUPABASE_SERVICE_ROLE_KEY` | — | required; the worker bypasses RLS |
| `ANTHROPIC_API_KEY` | — | falls back to `VITE_ANTHROPIC_API_KEY`, with a warning |
| `USAJOBS_API_KEY` | unset | enables the USAJOBS sources (seed creates them only when set) |
| `LLM_MONTHLY_BUDGET_USD` | 40 | hard cap; once it's reached, new jobs are marked `skipped` |
| `WORKER_CYCLE_SECONDS` | 300 | |
| `EXTRACT_MODE` | `batch` | `direct` = call Claude immediately (useful for testing) |
| `WORKER_CONCURRENCY` / `WORKER_SOURCES_PER_CYCLE` / `WORKER_HOST_GAP_SECONDS` | 8 / 200 / 10 | |

Locally these are read from `.env.local`. In production, pass them as real environment variables.

## Run locally

```bash
npm run worker:seed -- --dry-run   # counts only
npm run worker:seed                # create sources (idempotent)
node worker/index.js --dry-run --limit 5               # fetch/hash/prefilter 5 firms.json URLs, no DB
node worker/index.js --dry-run --extract --url <url>   # + one live Haiku call, prints JSON and cost
npm run worker:once                # one real cycle, then exit
npm run worker                     # loop forever (Ctrl-C / SIGTERM finishes current work, then exits)
```

## Deploy ($5–20/mo)

Any small Docker host works: 1 vCPU / 2 GB RAM is enough. Chromium only starts for JS-rendered pages.

```bash
docker build -f worker/Dockerfile -t atlas-worker .
docker run -d --restart unless-stopped --name atlas-worker \
  -e VITE_SUPABASE_URL=... -e SUPABASE_SERVICE_ROLE_KEY=... -e ANTHROPIC_API_KEY=... \
  -e LLM_MONTHLY_BUDGET_USD=40 atlas-worker
```

- **Hetzner** (CX22, ~€4/mo): install Docker, then run the commands above.
- **Railway**: new service from the repo, set Dockerfile path to `worker/Dockerfile`, add the env vars.
- **Fly.io**: `fly launch --dockerfile worker/Dockerfile --no-deploy`, then `fly secrets set ...`, then `fly deploy`. It needs no HTTP service, so remove the `[http_service]` block from `fly.toml`.

Run exactly one instance. Two workers would double-check sources and double-submit jobs.

## Monitoring spend and health

In the Supabase SQL editor:

```sql
select * from llm_spend_by_month order by month desc;          -- calls, tokens, cost_usd per month
select * from scrape_runs order by started_at desc limit 20;   -- per-cycle counts + notes (budget warnings)
select last_status, count(*) from sources group by 1 order by 2 desc;
select url, last_status, consecutive_failures from sources where not active;
```

`cost_usd` is computed from the actual token usage at Haiku 4.5 prices ($1/M input, $5/M output; batch = half).
