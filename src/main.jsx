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

// Routes prerendered at build time (/, /sprint, /membership, /placement) ship real HTML in #root.
// Hydrate them — but after the browser has painted the static content and gone idle, so React doesn't
// take the main thread during the LCP window (the prerendered cover/hero paints first). The markup is
// already interactive as plain HTML (real <a> links), so the brief delay to full interactivity is
// invisible and TBT stays low. Non-prerendered routes mount fresh immediately.
if (root.firstElementChild) {
  const hydrate = () => hydrateRoot(root, tree)
  if ('requestIdleCallback' in window) requestIdleCallback(hydrate, { timeout: 1800 })
  else setTimeout(hydrate, 200)
} else {
  createRoot(root).render(tree)
}
