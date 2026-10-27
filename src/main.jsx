import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { AppShell } from './App.jsx'
import { captureUtm } from './lib/tracking'

captureUtm()

const root = document.getElementById('root')
const tree = (
  <StrictMode>
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  </StrictMode>
)

// Only these routes are prerendered at build time (scripts/prerender.mjs). Vercel's catch-all rewrite
// serves the home index.html for every OTHER route, so #root carries home's markup even on, say, /credits
// — hydrating that against the wrong route would throw a mismatch. So: hydrate ONLY when the current
// path is actually prerendered; otherwise discard the fallback markup and mount fresh.
const PRERENDERED = new Set(['/', '/sprint', '/membership', '/placement'])
const path = window.location.pathname.replace(/\/+$/, '') || '/'

if (root.firstElementChild && PRERENDERED.has(path)) {
  // Hydrate after the browser has painted the static content and gone idle, so React doesn't take the
  // main thread during the LCP window (the prerendered cover/hero paints first). The markup is already
  // interactive as plain HTML (real <a> links), so the brief delay to full interactivity is invisible.
  const hydrate = () => hydrateRoot(root, tree)
  if ('requestIdleCallback' in window) requestIdleCallback(hydrate, { timeout: 1800 })
  else setTimeout(hydrate, 200)
} else {
  root.replaceChildren() // drop any fallback (home) markup before a fresh client render
  createRoot(root).render(tree)
}
