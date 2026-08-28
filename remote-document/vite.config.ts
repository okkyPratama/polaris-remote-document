import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // Template & config endpoints: /api/v1/... → http://localhost:8082/document/api/v1/...
      '/api/v1': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/v1/, '/document/api/v1'),
      },
      // PDF endpoints: /api/pdf/... → http://localhost:8082/document/api/v1/pdf/...
      '/api/pdf': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pdf/, '/document/api/v1/pdf'),
      },
    },
  },
})
