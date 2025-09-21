import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './', // Make paths relative for multi-domain deployment
  plugins: [react()],
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 5173
  }
})
