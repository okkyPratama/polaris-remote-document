import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import federation from '@originjs/vite-plugin-federation'

const resolveRemoteEntryUrl = (
  configuredUrl: string | undefined,
  fallbackBase: string
) => {
  const url = (configuredUrl?.trim() || fallbackBase).replace(/\/+$/, '')

  if (/\/remoteEntry\.js(?:[?#].*)?$/.test(url)) {
    return url
  }

  return `${url}/assets/remoteEntry.js`
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      federation({
        name: 'host',
        filename: 'remoteEntry.js',
        remotes: {
          'remote-admin': env.VITE_URL_REMOTE_ADMIN,
          'remote-master-data': resolveRemoteEntryUrl(
            env.VITE_URL_REMOTE_MASTER_DATA,
            '/remote-master-data'
          ),
          'remote-document': resolveRemoteEntryUrl(
            env.VITE_URL_REMOTE_DOCUMENT,
            '/remote-document'
          ),
        },
        shared: [
          'react',
          'react-dom',
          'react-router-dom',
          'zustand',
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
      proxy: {
        // Document service — must be before the generic /api catch-all
        '/api/v1/templates': {
          target: env.VITE_DOCUMENT_API_URL || 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (p: string) => p.replace(/^\/api\/v1\/templates/, '/document/api/v1/templates'),
        },
        '/api/v1/template-assignments': {
          target: env.VITE_DOCUMENT_API_URL || 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (p: string) => p.replace(/^\/api\/v1\/template-assignments/, '/document/api/v1/template-assignments'),
        },
        '/api/v1/documents': {
          target: env.VITE_DOCUMENT_API_URL || 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (p: string) => p.replace(/^\/api\/v1\/documents/, '/document/api/v1/documents'),
        },
        '/api/v1/pdf': {
          target: env.VITE_DOCUMENT_API_URL || 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (p: string) => p.replace(/^\/api\/v1\/pdf/, '/document/api/v1/pdf'),
        },
        // Default API proxy (master-data, auth, etc.)
        '/api': {
          target: env.VITE_API_BASE_URL,
          changeOrigin: true,
        },
        '^/auth/(session|logout)': {
          target: env.VITE_API_BASE_URL,
          changeOrigin: true,
        },
        '/sessions': {
          target: env.VITE_API_BASE_URL,
          changeOrigin: true,
        },
      },
    },
  }
})
