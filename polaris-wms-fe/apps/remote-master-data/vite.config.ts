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
        name: 'remote-master-data',
        filename: 'remoteEntry.js',
        exposes: {
          './views/master-data': './src/views/master-data/index.tsx',
          './views/business-parties': './src/views/business-parties/index.tsx',
          './views/products': './src/views/products/index.tsx',
          './views/carrier-service-types': './src/views/carrier-service-types/index.tsx',
          './views/zone-groups': './src/views/spatial/zone-groups/index.tsx',
          './views/zones': './src/views/spatial/zones/index.tsx',
          './views/locations': './src/views/spatial/locations/index.tsx',
          './views/uom': './src/views/uom/index.tsx',
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
      port: 5004,
      proxy: {
        '/api': {
          target: env.VITE_API_URL,
          changeOrigin: true,
        },
      },
    },
  }
})
