import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TemplatesPage from './views/templates'
import TemplateEditorPage from './views/template-editor'
import PrintFromUrlPage from './views/print-from-url'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<TemplatesPage canCreate canUpdate canDelete />} />
          <Route path="/documents/templates" element={<TemplatesPage canCreate canUpdate canDelete />} />
          <Route path="/documents/template-editor" element={<TemplateEditorPage />} />
          <Route path="/documents/template-editor/:id" element={<TemplateEditorPage />} />
          <Route path="/documents/print" element={<PrintFromUrlPage />} />
          {/* Fallback: if fetcher redirects to /auth/login (401 in standalone dev), go back to home */}
          <Route path="/auth/login" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
