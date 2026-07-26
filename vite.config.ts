import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Kraft Life runs on 5180 — keep clear of Kraft Klothing dress app ports.
export default defineConfig({
  plugins: [react()],
  // Default `/` for local/tunnel; set VITE_BASE=/Kraft_Life/ for GitHub Pages.
  base: process.env.VITE_BASE || '/',
  server: {
    port: 5180,
    strictPort: true,
    host: true,
    // Allow Cloudflare / tunnel preview hosts while keeping port 5180.
    allowedHosts: true,
  },
  preview: {
    port: 5180,
    strictPort: true,
    host: true,
  },
})
