import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Kraft Life runs on 5180 — keep clear of Kraft Klothing dress app ports.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    strictPort: true,
    host: true,
  },
  preview: {
    port: 5180,
    strictPort: true,
    host: true,
  },
})
