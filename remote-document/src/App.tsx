import { Component, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import TemplateListPage from '@/pages/TemplateListPage'
import TemplateEditorPage from '@/pages/TemplateEditorPage'
import PrintFromUrlPage from '@/pages/PrintFromUrlPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// ─── Error Boundary ───────────────────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '12px', padding: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#ef3340' }}>Terjadi Kesalahan</div>
          <div style={{ fontSize: '12px', color: '#485885', maxWidth: '500px', textAlign: 'center', fontFamily: 'monospace', background: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca' }}>
            {this.state.error?.message ?? 'Unknown error'}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }) }}
              style={{ padding: '6px 16px', fontSize: '12px', background: '#001871', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              Coba Lagi
            </button>
            <Link to="/" onClick={() => { this.setState({ hasError: false, error: null }) }}
              style={{ padding: '6px 16px', fontSize: '12px', background: '#f1f3f8', color: '#1f2b59', border: '1px solid #ebebeb', borderRadius: '8px', textDecoration: 'none' }}
            >
              Kembali ke Home
            </Link>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<TemplateListPage />} />
            <Route path="/editor/:id?" element={<TemplateEditorPage />} />
            <Route path="/print" element={<PrintFromUrlPage />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
