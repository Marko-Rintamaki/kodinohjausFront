import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // Kuuntele kaikkia IP-osoitteita (ei vain localhost)
    port: 5173,
    strictPort: true,  // Epäonnistu jos portti on käytössä
    cors: true,       // Salli CORS cross-origin pyynnöt
    hmr: {
      clientPort: 5173 // Hot Module Replacement portti
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})