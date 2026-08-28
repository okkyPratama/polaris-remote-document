import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      federation({
        name: 'remote-document',
        filename: 'remoteEntry.js',
        exposes: {
          './views/templates': './src/views/templates/index.tsx',
          './views/template-editor': './src/views/template-editor/index.tsx',
          './views/print-from-url': './src/views/print-from-url/index.tsx',
        },
        shared: [
          'react',
          'react-dom',
          'react-router-dom',
          '@tanstack/react-query',
        ],
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      conditions: ['development', 'module', 'import', 'browser', 'default'],
    },
    optimizeDeps: {
      exclude: ['@polaris/service'],
    },
    build: {
      target: 'esnext',
      minify: true,
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          minifyInternalExports: false,
        },
      },
    },
    server: {
      port: 5010,
      proxy: {
        // Rewrite: /api/v1/master-data/... → master-data-service /api/v1/master-data/...
        '/api/v1/master-data': {
          target: env.VITE_MASTER_DATA_URL || 'http://10.193.1.228:30081',
          changeOrigin: true,
          configure: (proxy) => {
            // Inject dev session token so master-data calls work without login
            const devToken = env.VITE_DEV_SESSION_TOKEN || ''
            if (devToken) {
              proxy.on('proxyReq', (proxyReq) => {
                proxyReq.setHeader('X-session-token', devToken)
                proxyReq.setHeader('user-username', env.VITE_DEV_USERNAME || 'dev-user')
                proxyReq.setHeader('appname', 'polaris')
                proxyReq.setHeader('appversion', '1.0.0')
              })
            }
          },
        },
        // Rewrite: /api/v1/templates/... → /document/api/v1/templates/...
        '/api/v1/templates': {
          target: env.VITE_API_URL || 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (p: string) => p.replace(/^\/api\/v1\/templates/, '/document/api/v1/templates'),
        },
        // Rewrite: /api/v1/template-assignments/... → /document/api/v1/template-assignments/...
        '/api/v1/template-assignments': {
          target: env.VITE_API_URL || 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (p: string) => p.replace(/^\/api\/v1\/template-assignments/, '/document/api/v1/template-assignments'),
        },
        // Rewrite: /api/v1/documents/... → /document/api/v1/documents/...
        '/api/v1/documents': {
          target: env.VITE_API_URL || 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (p: string) => p.replace(/^\/api\/v1\/documents/, '/document/api/v1/documents'),
        },
        // Rewrite: /api/v1/pdf/... → /document/api/v1/pdf/...
        '/api/v1/pdf': {
          target: env.VITE_API_URL || 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (p: string) => p.replace(/^\/api\/v1\/pdf/, '/document/api/v1/pdf'),
        },
        // Fallback for other /api calls
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  }
})
