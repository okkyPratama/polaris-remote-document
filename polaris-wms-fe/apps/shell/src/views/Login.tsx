import { useEffect, useRef } from 'react'
import { authService } from '@/services/auth'
import { Loading } from '@polaris/ui'

/**
 * Login page — redirect ke Keycloak login.
 * Setelah logout, Keycloak session sudah di-kill via logout endpoint,
 * jadi redirect ke sini → redirect ke Keycloak → tampil login form.
 */
export function Login() {
  const hasRedirected = useRef(false)

  useEffect(() => {
    // If user already has valid token, skip to app
    if (authService.checkAuth()) {
      window.location.replace('/select-context')
      return
    }

    // Guard: jangan redirect ke Keycloak berulang kali dalam waktu singkat
    // Ini mencegah loop yang bikin account locked
    const lastRedirect = sessionStorage.getItem('last_login_redirect')
    const now = Date.now()
    if (lastRedirect && now - Number(lastRedirect) < 5000) {
      // Sudah redirect kurang dari 5 detik lalu — kemungkinan loop
      hasRedirected.current = true
      return
    }

    if (hasRedirected.current) return
    hasRedirected.current = true

    sessionStorage.setItem('last_login_redirect', String(now))
    authService.getKeycloakLoginUrl().then((url) => {
      window.location.href = url
    })
  }, [])

  // Jika terdeteksi loop, tampilkan pesan manual
  if (hasRedirected.current && sessionStorage.getItem('last_login_redirect')) {
    const lastRedirect = Number(sessionStorage.getItem('last_login_redirect'))
    if (Date.now() - lastRedirect < 5000) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f1f3f8]">
          <div className="text-center">
            <p className="text-sm text-[#ef3340] mb-2">Login gagal berulang kali.</p>
            <p className="text-xs text-[#485885] mb-4">Periksa koneksi atau hubungi admin jika akun ter-lock.</p>
            <button
              onClick={() => {
                sessionStorage.removeItem('last_login_redirect')
                authService.getKeycloakLoginUrl().then((url) => {
                  window.location.href = url
                })
              }}
              className="text-sm text-white bg-[#001871] px-4 py-2 rounded-lg hover:opacity-90"
            >
              Coba Login Lagi
            </button>
          </div>
        </div>
      )
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f1f3f8]">
      <div className="text-center">
        <Loading size="lg" />
        <p className="mt-4 text-xs text-[#485885]">Mengalihkan ke halaman login...</p>
      </div>
    </div>
  )
}
