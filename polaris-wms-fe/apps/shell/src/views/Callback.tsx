import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { fetcher } from '@polaris/service'
import { authService } from '@/services/auth'
import { useAuthContext } from '@/contexts/AuthProvider'
import { Loading } from '@polaris/ui'

// ═══════════════════════════════════════════════════════
// Error Classification
// ═══════════════════════════════════════════════════════

interface AuthErrorInfo {
  title: string
  message: string
  suggestion: string
  technical?: string
  severity: 'warning' | 'error'
}

function classifyAuthError(err: unknown, phase: 'token_exchange' | 'session_create'): AuthErrorInfo {
  const error = err as Error & { status?: number; errorCode?: string }
  const message = error?.message || 'Unknown error'
  const status = error?.status

  // Network error — server tidak bisa dijangkau
  if (error instanceof TypeError && message.includes('fetch')) {
    return {
      title: 'Server Tidak Dapat Dijangkau',
      message: 'Tidak dapat terhubung ke server. Server mungkin sedang down atau ada masalah jaringan.',
      suggestion: 'Pastikan Anda terhubung ke jaringan yang benar (VPN/intranet). Jika masalah berlanjut, hubungi tim Infrastructure.',
      technical: `Network Error: ${message}`,
      severity: 'error',
    }
  }

  // Timeout
  if (message.includes('timeout') || message.includes('timed out')) {
    return {
      title: 'Server Tidak Merespon',
      message: 'Server membutuhkan waktu terlalu lama untuk merespon.',
      suggestion: 'Coba lagi dalam beberapa saat. Jika masalah berlanjut, hubungi tim Infrastructure.',
      technical: `Timeout: ${message}`,
      severity: 'error',
    }
  }

  // 502 Bad Gateway — backend down
  if (status === 502) {
    return {
      title: 'Backend Service Tidak Tersedia',
      message: 'API Gateway tidak dapat menghubungi backend service. Kemungkinan service sedang down atau belum di-deploy.',
      suggestion: 'Hubungi tim Backend/DevOps untuk memeriksa status service. Biasanya perlu restart pod/container.',
      technical: `HTTP 502 Bad Gateway — ${message}`,
      severity: 'error',
    }
  }

  // 503 Service Unavailable
  if (status === 503) {
    return {
      title: 'Service Sedang Maintenance',
      message: 'Service sedang tidak tersedia, kemungkinan sedang dalam proses deployment atau maintenance.',
      suggestion: 'Tunggu beberapa menit lalu coba lagi.',
      technical: `HTTP 503 Service Unavailable — ${message}`,
      severity: 'warning',
    }
  }

  // 504 Gateway Timeout
  if (status === 504) {
    return {
      title: 'Gateway Timeout',
      message: 'API Gateway timeout menunggu respon dari backend.',
      suggestion: 'Backend mungkin overloaded. Coba lagi dalam beberapa saat atau hubungi tim Infrastructure.',
      technical: `HTTP 504 Gateway Timeout — ${message}`,
      severity: 'error',
    }
  }

  // 401/403 — auth-specific
  if (status === 401 || status === 403) {
    return {
      title: 'Akses Ditolak',
      message: 'Token autentikasi tidak valid atau user tidak memiliki akses ke sistem ini.',
      suggestion: 'Pastikan akun Anda sudah didaftarkan di Polaris. Hubungi admin jika belum memiliki akses.',
      technical: `HTTP ${status} — ${message}`,
      severity: 'error',
    }
  }

  // Token exchange specific errors
  if (phase === 'token_exchange') {
    return {
      title: 'Gagal Menukar Token',
      message: 'Proses autentikasi dengan Keycloak gagal. Authorization code mungkin sudah expired.',
      suggestion: 'Klik "Coba Login Lagi" di bawah. Jika masih gagal, clear browser cache dan coba kembali.',
      technical: `Token Exchange Error: ${message}`,
      severity: 'warning',
    }
  }

  // Generic session creation error
  if (phase === 'session_create' && status && status >= 500) {
    return {
      title: 'Server Error',
      message: `Backend mengembalikan error (HTTP ${status}). Ada masalah di sisi server.`,
      suggestion: 'Hubungi tim Backend dan sertakan informasi teknis di bawah.',
      technical: `HTTP ${status} — ${message}`,
      severity: 'error',
    }
  }

  // Fallback
  return {
    title: 'Autentikasi Gagal',
    message: message || 'Terjadi kesalahan saat proses login.',
    suggestion: 'Coba login ulang. Jika masalah berlanjut, hubungi tim support.',
    technical: `${phase}: ${message}`,
    severity: 'error',
  }
}

// ═══════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════

/**
 * Keycloak callback page.
 * Keycloak redirects here with ?code=xxx after user logs in.
 * We exchange the code for tokens, store them, then navigate to select-context.
 */
export function KeycloakCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuthContext()
  const [errorInfo, setErrorInfo] = useState<AuthErrorInfo | null>(null)
  const [showTechnical, setShowTechnical] = useState(false)
  const hasRun = useRef(false)

  useEffect(() => {
    // Only run once
    if (hasRun.current) return
    hasRun.current = true

    const code = searchParams.get('code')

    if (!code) {
      setErrorInfo({
        title: 'Kode Otorisasi Tidak Ditemukan',
        message: 'Redirect dari Keycloak tidak menyertakan authorization code.',
        suggestion: 'Klik "Coba Login Lagi" untuk memulai proses login dari awal.',
        severity: 'warning',
      })
      return
    }

    // Already authenticated — skip exchange
    if (authService.checkAuth()) {
      refreshUser()
      navigate('/select-context', { replace: true })
      return
    }

    // No PKCE verifier means this wasn't a proper login flow
    const hasVerifier = sessionStorage.getItem('pkce_code_verifier')
    if (!hasVerifier) {
      setErrorInfo({
        title: 'Sesi Login Expired',
        message: 'Data sesi login tidak ditemukan. Kemungkinan halaman di-refresh atau browser session expired.',
        suggestion: 'Klik "Coba Login Lagi" untuk memulai proses login dari awal.',
        severity: 'warning',
      })
      return
    }

    authService
      .exchangeCode(code)
      .then(async (data) => {
        // Simpan id_token untuk logout nanti
        if (data.id_token) {
          localStorage.setItem('id_token', data.id_token)
        }
        localStorage.setItem('refresh_token', data.refresh_token)

        // Tukar Keycloak token → Polaris session
        let session
        try {
          session = await authService.createPolarisSession(data.access_token)
        } catch (sessionErr) {
          console.error('Create Polaris session failed:', sessionErr)
          setErrorInfo(classifyAuthError(sessionErr, 'session_create'))
          return
        }

        // Simpan Polaris session token (ini yang dipakai untuk semua API call)
        fetcher.setAuthToken(session.sessionToken)
        localStorage.setItem('polaris_user_id', session.userId)

        // Decode username dari Keycloak JWT untuk header user-username
        try {
          const jwtPayload = JSON.parse(atob(data.access_token.split('.')[1]))
          const username = jwtPayload.preferred_username || jwtPayload.username || jwtPayload.name || jwtPayload.sub
          if (username) {
            localStorage.setItem('polaris_username', username)
          }
        } catch { /* ignore decode errors */ }

        // Simpan warehouse list untuk selector
        if (session.warehouses && session.warehouses.length > 0) {
          localStorage.setItem('authorized_warehouses', JSON.stringify(session.warehouses))
        }

        refreshUser()
        navigate('/select-context', { replace: true })
      })
      .catch((err) => {
        console.error('Token exchange failed:', err)
        setErrorInfo(classifyAuthError(err, 'token_exchange'))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (errorInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f1f3f8] p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-[#e2e5ed] p-6">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              errorInfo.severity === 'error' ? 'bg-red-50' : 'bg-amber-50'
            }`}>
              <svg className={`w-6 h-6 ${errorInfo.severity === 'error' ? 'text-[#ef3340]' : 'text-amber-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {errorInfo.severity === 'error' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                )}
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-base font-semibold text-[#1a1a2e] text-center mb-2">
            {errorInfo.title}
          </h2>

          {/* Message */}
          <p className="text-sm text-[#485885] text-center mb-3">
            {errorInfo.message}
          </p>

          {/* Suggestion */}
          <div className="bg-[#f8f9fc] rounded-lg p-3 mb-4">
            <p className="text-xs text-[#485885]">
              <span className="font-medium text-[#1a1a2e]">💡 Yang bisa dilakukan:</span>
              <br />
              {errorInfo.suggestion}
            </p>
          </div>

          {/* Technical details (collapsible) */}
          {errorInfo.technical && (
            <div className="mb-4">
              <button
                onClick={() => setShowTechnical(!showTechnical)}
                className="text-xs text-[#485885] hover:text-[#001871] flex items-center gap-1"
              >
                <svg className={`w-3 h-3 transition-transform ${showTechnical ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
                Detail Teknis
              </button>
              {showTechnical && (
                <div className="mt-2 bg-[#1a1a2e] rounded-lg p-3">
                  <code className="text-xs text-[#a0aec0] break-all font-mono">
                    {errorInfo.technical}
                  </code>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <a
              href="/auth/login"
              className="w-full text-center text-sm text-white bg-[#001871] px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
            >
              Coba Login Lagi
            </a>
            <button
              onClick={() => window.location.reload()}
              className="w-full text-sm text-[#485885] hover:text-[#001871] px-4 py-2 rounded-lg border border-[#e2e5ed] hover:border-[#001871] transition-colors"
            >
              Refresh Halaman
            </button>
          </div>

          {/* Timestamp */}
          <p className="text-[10px] text-[#a0aec0] text-center mt-4">
            {new Date().toLocaleString('id-ID')} • Polaris WMS
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f1f3f8]">
      <div className="text-center">
        <Loading size="lg" />
        <p className="mt-4 text-xs text-[#485885]">Mengautentikasi...</p>
      </div>
    </div>
  )
}
