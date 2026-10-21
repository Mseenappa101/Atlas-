# TODO

## Post-launch performance: prerender (SSG) the content pages

**Why.** Launch-acceptable now: mobile Lighthouse is Home 90, Explore/Sprint/Placement ~74–84
(up from the font work), **CLS 0.000 on all four pages**, added JS ~39 KB gzipped (Framer Motion is a
42 KB lazy chunk). The content pages cap at ~84 because this is an **empty-root SPA** — the HTML ships an
empty `#root`, so content paints only after the ~190 KB JS loads and executes (FCP/LCP ~3–3.7 s on
throttled mobile). The one lever that gets them to a solid 90+ is prerendering the content into the HTML.

**Already done (so don't redo):**
- Self-hosted variable fonts in `/public/fonts` + preload, no render-blocking Google-Fonts CSS
  (`render-blocking-resources: none`). Exact `@capsizecss/metrics` fallback overrides.
- CLS fully fixed (scramble-headline height lock, reserved lazy-component heights, reserved stat/marquee
  widths). Framer Motion off the critical path (CSS + IntersectionObserver reveals; interactive motion
  lazy-loaded).

**Scope when picked up:**
1. `src/entry-server.jsx` exporting `render(url)` using `renderToString` + `StaticRouter`
   (`react-router-dom/server`). Refactor `App` so the router is injected: `BrowserRouter` on the client
   entry, `StaticRouter` on the server entry.
2. Build an SSR bundle (`vite build --ssr src/entry-server.jsx`); extend `scripts/prerender-meta.mjs` (or a
   new `prerender.mjs`) to `render()` each static route and inject the HTML into that route's
   `dist/<route>/index.html` `#root` (it already writes per-route HTML, currently meta-only).
3. `src/main.jsx`: `hydrateRoot` when `#root` has children, else `createRoot`.
4. **Hydration safety (the tricky part):**
   - Date-driven values (`Countdown`, `site.config` `nextSprint()`, `foundingOpen()`) render at build time
     server-side vs runtime client-side → mismatch. Render a stable placeholder server-side and fill the
     real value in `useEffect` (or `suppressHydrationWarning` on those nodes).
   - `DraftTag` checks `window.location.hostname` → returns null server-side, renders on non-firmward.org
     client. Guard it so server/client agree (on production/firmward.org it's null on both — fine; the
     mismatch only shows on preview).
   - Audit any render-time browser access (most are guarded with `typeof window`): `matchMedia`,
     `localStorage`, `sessionStorage`, `IntersectionObserver`, `ScrambleHeadline`'s `useLayoutEffect`
     (use an isomorphic layout effect to avoid the SSR warning). `SmoothScroll`/`Toaster` render null/
     empty server-side — verify.
   - Providers (`SessionProvider`/`AccessProvider`/`MyListProvider`) must not fetch during render
     (`useEffect` only — `renderToString` skips effects, so OK) and must render an SSR-safe initial state.
5. **Prerender these fully:** `/sprint`, `/placement`, `/membership`, `/workshop`, `/families`, `/about`,
   `/sprint/course` (locked state), `/thanks/*`, legal pages, `/` (home). **Explore:** prerender the shell
   only (nav + filter bar + map placeholder); firm data hydrates client-side (it's anon Supabase-direct).
6. Validate: FCP/LCP should drop sharply (content in HTML); confirm **no hydration warnings** in the
   console and that interactivity (filters, drawers, scramble, tilts) still works. Re-run mobile Lighthouse.

**Explicitly NOT the fix:** route-based code-splitting — for a cold-loaded page it adds a sequential chunk
round trip and can *hurt* FCP. SSG (content in the HTML) is the right tool.
