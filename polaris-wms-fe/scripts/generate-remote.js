#!/usr/bin/env node

/**
 * Generate a new remote MFE app from template.
 * Usage: node scripts/generate-remote.js <remote-name>
 * Example: node scripts/generate-remote.js remote-inventory
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const remoteName = process.argv[2]

if (!remoteName) {
  console.error('❌ Usage: node scripts/generate-remote.js <remote-name>')
  console.error('   Example: node scripts/generate-remote.js remote-inventory')
  process.exit(1)
}

if (!remoteName.startsWith('remote-')) {
  console.error('❌ Remote name must start with "remote-". Example: remote-inventory')
  process.exit(1)
}

const featureName = remoteName.replace('remote-', '')
const pascalName = featureName.charAt(0).toUpperCase() + featureName.slice(1)
const packageName = `@polaris/${remoteName}`
const appDir = path.join(ROOT, 'apps', remoteName)

// Check if already exists
if (fs.existsSync(appDir)) {
  console.error(`❌ Directory apps/${remoteName} already exists!`)
  process.exit(1)
}

// Find next available port (start from 5003)
const appsDir = path.join(ROOT, 'apps')
const existingRemotes = fs.readdirSync(appsDir).filter(d => d.startsWith('remote-'))
const nextPort = 5002 + existingRemotes.length + 1

console.log(`\n🚀 Generating remote: ${remoteName}`)
console.log(`   Package: ${packageName}`)
console.log(`   Port: ${nextPort}`)
console.log(`   Feature: ${pascalName}`)
console.log('')

// Create directory structure
const dirs = [
  '',
  'src',
  'src/api',
  'src/hooks',
  'src/types',
  'src/views',
  `src/views/${featureName}`,
]

dirs.forEach(dir => {
  fs.mkdirSync(path.join(appDir, dir), { recursive: true })
})

// package.json
fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify({
  name: packageName,
  private: true,
  version: '0.0.1',
  type: 'module',
  scripts: {
    dev: `vite --port ${nextPort}`,
    build: 'tsc -b && vite build',
    'build:watch': 'pnpm build --watch',
    preview: `vite preview --port ${nextPort}`,
    lint: 'tsc --noEmit',
    'check-types': 'tsc --noEmit',
    clean: 'rm -rf dist',
  },
  dependencies: {
    '@tanstack/react-query': '^5.84.1',
    'lucide-react': '^0.508.0',
    react: '^19.1.0',
    'react-dom': '^19.1.0',
    'react-router-dom': '^7.5.3',
    'react-hook-form': 'latest',
    zod: 'latest',
    '@hookform/resolvers': 'latest',
    sonner: '^2.0.7',
  },
  devDependencies: {
    '@originjs/vite-plugin-federation': '^1.4.1',
    '@polaris/config': 'workspace:*',
    '@polaris/service': 'workspace:*',
    '@polaris/ui': 'workspace:*',
    '@tailwindcss/vite': '^4.1.5',
    '@types/node': '^22.15.17',
    '@types/react': '^19.1.3',
    '@types/react-dom': '^19.1.3',
    '@vitejs/plugin-react': '^4.4.1',
    tailwindcss: '^4.1.5',
    typescript: '^5.8.3',
    vite: '^6.3.5',
  },
}, null, 2))

// tsconfig.json
fs.writeFileSync(path.join(appDir, 'tsconfig.json'), JSON.stringify({
  compilerOptions: {
    target: 'ES2022',
    module: 'ESNext',
    moduleResolution: 'bundler',
    lib: ['ES2022', 'DOM', 'DOM.Iterable'],
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    jsx: 'react-jsx',
    jsxImportSource: 'react',
    isolatedModules: true,
    noEmit: true,
    paths: {
      '@polaris/ui': ['../../packages/polaris-ui/src/index.ts'],
      '@polaris/service': ['../../packages/service/src/index.ts'],
      '@polaris/config': ['../../packages/config/src/index.ts'],
    },
  },
  include: ['src/**/*'],
  exclude: ['node_modules', 'dist'],
}, null, 2))

// vite.config.ts
fs.writeFileSync(path.join(appDir, 'vite.config.ts'),
`import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name: '${remoteName}',
      filename: 'remoteEntry.js',
      exposes: {
        './views/${featureName}': './src/views/${featureName}/index.tsx',
      },
      shared: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
      ],
    }),
  ],
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
    port: ${nextPort},
  },
})
`)

// index.html
fs.writeFileSync(path.join(appDir, 'index.html'),
`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${pascalName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`)

// src/tailwind.css
fs.writeFileSync(path.join(appDir, 'src/tailwind.css'),
`@import "tailwindcss";
@import "@polaris/ui/styles.css";
`)

// src/main.tsx
fs.writeFileSync(path.join(appDir, 'src/main.tsx'),
`import { createRoot } from 'react-dom/client'
import App from './App'
import './tailwind.css'

createRoot(document.getElementById('root')!).render(<App />)
`)

// src/App.tsx
fs.writeFileSync(path.join(appDir, 'src/App.tsx'),
`import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ${pascalName}Page from './views/${featureName}'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<${pascalName}Page />} />
        <Route path="/${featureName}" element={<${pascalName}Page />} />
      </Routes>
    </BrowserRouter>
  )
}
`)

// src/views/{feature}/index.tsx
fs.writeFileSync(path.join(appDir, `src/views/${featureName}/index.tsx`),
`export default function ${pascalName}Page() {
  return (
    <div className="flex flex-col gap-3.5 animate-[fadeUp_0.22s_ease-out]">
      <div>
        <h1 className="text-[17px] font-bold text-[#001871] tracking-tight">${pascalName}</h1>
        <p className="text-xs text-[#485885] mt-0.5">Halaman ${pascalName}</p>
      </div>
    </div>
  )
}
`)

// src/types/{feature}.types.ts
fs.writeFileSync(path.join(appDir, `src/types/${featureName}.types.ts`),
`import { z } from 'zod'

// TODO: Define ${pascalName} types and schema

export interface ${pascalName} {
  id: number
  name: string
}

export const ${featureName}FormSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
})

export type ${pascalName}FormData = z.infer<typeof ${featureName}FormSchema>
`)

// src/api/{feature}.api.ts
fs.writeFileSync(path.join(appDir, `src/api/${featureName}.api.ts`),
`import type { ${pascalName} } from '../types/${featureName}.types'

// TODO: Replace with actual API calls via @polaris/service fetcher

export const ${featureName}Api = {
  getAll: async (): Promise<${pascalName}[]> => {
    // TODO: return (await fetcher.get('/...'))
    return []
  },

  create: async (payload: any): Promise<${pascalName}> => {
    console.log('API create:', payload)
    return { id: Date.now(), ...payload }
  },
}
`)

// src/hooks/use{Feature}Query.ts
fs.writeFileSync(path.join(appDir, `src/hooks/use${pascalName}Query.ts`),
`import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ${featureName}Api } from '../api/${featureName}.api'
import { toast } from '@polaris/ui'
import { MSG_CREATE_SUCCESS, MSG_CREATE_ERROR } from '@polaris/config'

export const ${featureName}Keys = {
  all: ['${featureName}'] as const,
  lists: () => [...${featureName}Keys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...${featureName}Keys.lists(), { filters }] as const,
}

export const use${pascalName}List = (filters?: Record<string, unknown>) => {
  return useQuery({
    queryKey: ${featureName}Keys.list(filters),
    queryFn: () => ${featureName}Api.getAll(),
    staleTime: 5 * 60 * 1000,
  })
}

export const useCreate${pascalName} = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: any) => ${featureName}Api.create(payload),
    onSuccess: () => {
      toast.success('Berhasil', MSG_CREATE_SUCCESS)
      queryClient.invalidateQueries({ queryKey: ${featureName}Keys.lists() })
    },
    onError: () => {
      toast.error('Gagal', MSG_CREATE_ERROR)
    },
  })
}
`)

// .env.development
fs.writeFileSync(path.join(appDir, '.env.development'),
`VITE_API_URL=http://localhost:8080
VITE_API_TIMEOUT=30000
APP_ENV=development
`)

console.log(`✅ Remote "${remoteName}" generated successfully!`)
console.log('')
console.log('Next steps:')
console.log(`  1. Run: pnpm install`)
console.log(`  2. Add remote URL to shell's .env.development:`)
console.log(`     VITE_URL_REMOTE_${featureName.toUpperCase()}=http://localhost:${nextPort}/assets/remoteEntry.js`)
console.log(`  3. Add remote to shell's vite.config.ts remotes:`)
console.log(`     '${remoteName}': env.VITE_URL_REMOTE_${featureName.toUpperCase()}`)
console.log(`  4. Start: pnpm dev:${remoteName}`)
console.log('')
