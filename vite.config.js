import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // The marketing routes are prerendered, so their HTML paints before any JS. Don't emit eager
    // <link rel="modulepreload"> for the entry graph (react, supabase, …): those hints make the JS
    // race the render-blocking CSS and the LCP image for slow-network bandwidth before first paint.
    // The deferred entry script still loads and hydrates — just after the content is visible.
    modulePreload: false,
  },
  server: {
    // The document API (api/) runs separately; in dev, forward /api to it.
    proxy: { '/api': 'http://localhost:8787' },
  },
})
