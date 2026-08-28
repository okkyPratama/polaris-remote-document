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
        name: 'remote-admin',
        filename: 'remoteEntry.js',
        exposes: {
          './views/company-groups': './src/views/company-groups/index.tsx',
          './views/companies': './src/views/companies/index.tsx',
          './views/warehouse': './src/views/warehouse/index.tsx',
          './views/roles': './src/views/roles/index.tsx',
          './views/users': './src/views/users/index.tsx',
          './views/codes': './src/views/codes/index.tsx',
          './views/settings': './src/views/settings/index.tsx',
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
      proxy: {
        '/api': {
          target: env.VITE_API_URL,
          changeOrigin: true,
        },
      },
    },
  }
})
