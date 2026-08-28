import { gatewayHeaders } from '@polaris/service'

const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL || ''
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM || ''
const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || ''
const KEYCLOAK_CLIENT_SECRET = import.meta.env.VITE_KEYCLOAK_CLIENT_SECRET || ''
const VITE_API_URL = '/api/v1'

const REDIRECT_URI = `${window.location.origin}/auth/callback`
const TOKEN_ENDPOINT = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`
const AUTH_ENDPOINT = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth`
const LOGOUT_ENDPOINT = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout`

// ═══════════════════════════════════════════════════════
// PKCE Helper — Pembuatan code_verifier dan code_challenge
// ═══════════════════════════════════════════════════════

function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(digest))
}

function base64UrlEncode(buffer: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// ═══════════════════════════════════════════════════════
// Auth Service — Layanan autentikasi Keycloak + Polaris
// ═══════════════════════════════════════════════════════

export const authService = {
  /**
   * Buat URL login Keycloak dengan PKCE.
   * Menyimpan code_verifier di sessionStorage untuk dipakai saat exchangeCode.
   */
  async getKeycloakLoginUrl(): Promise<string> {
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = await generateCodeChallenge(codeVerifier)

    // Simpan verifier untuk tukar token nanti
    sessionStorage.setItem('pkce_code_verifier', codeVerifier)

    const params = new URLSearchParams({
      client_id: KEYCLOAK_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'openid profile email',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })

    // Setelah logout, paksa Keycloak tampilkan form login (jangan reuse SSO session)
    const forceLogin = sessionStorage.getItem('force_login')
    if (forceLogin) {
      params.set('prompt', 'login')
      sessionStorage.removeItem('force_login')
    }

    return `${AUTH_ENDPOINT}?${params.toString()}`
  },

  /**
   * Tukar authorization code ke token Keycloak (dengan PKCE code_verifier).
   */
  async exchangeCode(code: string): Promise<{ access_token: string; refresh_token: string; id_token: string }> {
    const codeVerifier = sessionStorage.getItem('pkce_code_verifier')

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: KEYCLOAK_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code,
    })

    // PKCE: sertakan code_verifier
    if (codeVerifier) {
      body.set('code_verifier', codeVerifier)
      sessionStorage.removeItem('pkce_code_verifier')
    }

    // Sertakan client_secret jika dikonfigurasi (confidential client)
    if (KEYCLOAK_CLIENT_SECRET) {
      body.set('client_secret', KEYCLOAK_CLIENT_SECRET)
    }

    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Gagal tukar token:', errorData)
      throw new Error(errorData?.error_description || 'Gagal menukar authorization code')
    }

    return response.json()
  },

  /**
   * Buat sesi Polaris — tukar token Keycloak ke session token Polaris.
   * Response berisi: sessionToken, userId, dan daftar warehouse yang diauthorisasi.
   */
  async createPolarisSession(keycloakToken: string): Promise<{
    sessionToken: string
    userId: string
    warehouses: { id: string; code: string; name: string }[]
  }> {
    const response = await fetch(`${VITE_API_URL}/auth/session`, {
      method: 'POST',
      headers: {
        ...gatewayHeaders,
        Authorization: `Bearer ${keycloakToken}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const status = response.status
      const message = errorData?.externalDesc || errorData?.message || `HTTP ${status}`

      // Buat error dengan info tambahan supaya UI bisa bedakan jenis error
      const err = new Error(message) as Error & { status?: number; errorCode?: string }
      err.status = status
      err.errorCode = errorData?.externalCode?.toString() || undefined
      throw err
    }

    const result = await response.json()
    // Format response: { data: [...] } atau nested { data: { data: [...] } }
    const payload = Array.isArray(result.data) ? result.data[0] : result.data?.data?.[0] || result.data
    if (!payload?.sessionToken) {
      throw new Error(`Response sesi tidak valid: ${JSON.stringify(result)}`)
    }
    return payload
  },

  /**
   * Ambil data sesi aktif — username, roles, warehouse context, expiry.
   * Menggunakan header X-Session-Token.
   */
  async getCurrentSession(sessionToken: string): Promise<{
    userId: string
    username: string
    currentWarehouseId: string
    ownerContextIds: string[] | null
    roles: { id: string; code: string; name: string; isSystem: boolean }[]
    directPermissions: { id: string; key: string; resource: string; action: string }[]
    permissions: { id: string; key: string; resource: string; action: string }[]
    expiresAt: string
  }> {
    const username = localStorage.getItem('polaris_username')
    const response = await fetch(`${VITE_API_URL}/sessions/current`, {
      method: 'POST',
      headers: {
        ...gatewayHeaders,
        'X-Session-Token': sessionToken,
        'Content-Type': 'application/json',
        ...(username ? { 'user-username': username } : {}),
      },
      body: '{}',
    })

    if (!response.ok) {
      throw new Error('Gagal mengambil data sesi')
    }

    const result = await response.json()
    const payload = Array.isArray(result.data) ? result.data[0] : result.data?.data?.[0]
    if (!payload) {
      throw new Error('Response sesi tidak valid')
    }
    return payload
  },

  /**
   * Refresh token Keycloak — minta access_token baru menggunakan refresh_token.
   */
  async refreshToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: KEYCLOAK_CLIENT_ID,
      refresh_token: refreshToken,
    })

    if (KEYCLOAK_CLIENT_SECRET) {
      body.set('client_secret', KEYCLOAK_CLIENT_SECRET)
    }

    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    if (!response.ok) {
      throw new Error('Gagal refresh token')
    }

    return response.json()
  },

  /**
   * Cek apakah user masih terautentikasi (token ada dan belum expire).
   */
  checkAuth(): boolean {
    const token = localStorage.getItem('token')
    if (!token) return false

    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const now = Math.floor(Date.now() / 1000)
      return payload.exp > now
    } catch {
      // Token bukan JWT (UUID session token) — anggap valid selama ada
      return true
    }
  },

  /**
   * Ganti konteks warehouse — update warehouse aktif di session backend.
   */
  async switchContext(sessionToken: string, warehouseId: string): Promise<void> {
    const response = await fetch(`${VITE_API_URL}/sessions/switchContext`, {
      method: 'POST',
      headers: {
        ...gatewayHeaders,
        'X-Session-Token': sessionToken,
        'Content-Type': 'application/json',
        'user-username': localStorage.getItem('polaris_username') || '',
      },
      body: JSON.stringify({ warehouseId }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData?.externalDesc || 'Gagal mengganti konteks warehouse')
    }
  },

  /**
   * Logout:
   * 1. Invalidasi sesi Polaris di backend
   * 2. Hapus semua state autentikasi lokal
   * 3. Akhiri sesi SSO Keycloak
   */
  async logout(): Promise<void> {
    const sessionToken = localStorage.getItem('token')
    const idToken = localStorage.getItem('id_token')

    // 1. Invalidasi sesi Polaris (best effort — tidak block jika gagal)
    if (sessionToken) {
      try {
        await fetch(`${VITE_API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            ...gatewayHeaders,
            'X-Session-Token': sessionToken,
            'Content-Type': 'application/json',
            'user-username': localStorage.getItem('polaris_username') || '',
          },
          body: '{}',
        })
      } catch {
        // Abaikan — sesi akan expire sendiri
      }
    }

    // 2. Hapus semua state autentikasi lokal
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('id_token')
    localStorage.removeItem('user')
    localStorage.removeItem('selected_warehouse')
    localStorage.removeItem('authorized_warehouses')
    localStorage.removeItem('polaris_user_id')
    localStorage.removeItem('polaris_username')
    localStorage.removeItem('session_expires_at')
    localStorage.removeItem('polaris_warehouse_timezone')
    sessionStorage.removeItem('pkce_code_verifier')

    // Tandai agar login berikutnya paksa tampilkan form Keycloak
    sessionStorage.setItem('force_login', '1')

    // 3. Akhiri sesi SSO Keycloak
    const params = new URLSearchParams({
      client_id: KEYCLOAK_CLIENT_ID,
      post_logout_redirect_uri: `${window.location.origin}/auth/login`,
    })

    if (idToken) {
      params.set('id_token_hint', idToken)
    }

    window.location.href = `${LOGOUT_ENDPOINT}?${params.toString()}`
  },
}
