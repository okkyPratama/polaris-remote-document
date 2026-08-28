import { defineConfig, loadEnv } from 'vite'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    define: {
      // Embed environment variables saat build time
      'process.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL),
      'process.env.VITE_API_TIMEOUT': JSON.stringify(env.VITE_API_TIMEOUT),
      'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV),
      'process.env.APP_ENV': JSON.stringify(env.APP_ENV),
      'process.env.VITE_URL_REMOTE_ADMIN': JSON.stringify(env.VITE_URL_REMOTE_ADMIN),
    },
    build: {
      lib: {
        entry: {
          index: resolve(__dirname, 'src/index.ts'),
          fetcher: resolve(__dirname, 'src/fetcher.ts'),
          query: resolve(__dirname, 'src/query.ts'),
        },
        formats: ['es'],
      },
      rollupOptions: {
        external: ['react', 'react-dom', '@tanstack/react-query', 'axios'],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
            '@tanstack/react-query': 'ReactQuery',
            axios: 'axios',
          },
        },
      },
      sourcemap: true,
    },
    plugins: [dts()],
  }
})
