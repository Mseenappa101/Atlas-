import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The document API (api/) runs separately; in dev, forward /api to it.
    proxy: { '/api': 'http://localhost:8787' },
  },
})
