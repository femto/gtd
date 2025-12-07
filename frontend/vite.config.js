import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['gtd.nebulame.com', '.nebulame.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:3334',
        changeOrigin: true
      }
    }
  }
})
