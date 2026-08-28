import path from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@polaris/ui': path.resolve(__dirname, '../../packages/polaris-ui/src/index.ts'),
      '@polaris/service': path.resolve(__dirname, '../../packages/service/src/index.ts'),
      '@polaris/config': path.resolve(__dirname, '../../packages/config/src/index.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
})
