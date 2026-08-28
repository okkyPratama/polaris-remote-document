import axios, { type AxiosInstance } from 'axios'
import { config } from './config'
import type { ApiResponse, ApiError } from './types'

interface RequestConfig {
  headers?: Record<string, string>
  params?: Record<string, unknown>
  timeout?: number
  /** AbortSignal untuk pembatalan request */
  signal?: AbortSignal
  /** Skip inject header X-Warehouse-Id dari selected_warehouse localStorage */
  skipWarehouseContext?: boolean
}

class ApiFetcher {
  private instance: AxiosInstance
  private isRefreshing = false
  private refreshSubscribers: Array<(token: string) => void> = []

  constructor() {
    this.instance = axios.create({
      timeout: config.admin.timeout,
      headers: config.admin.headers,
    })

    this.setupInterceptors()
  }

  /**
   * Subscribe ke antrian refresh — request yang gagal 401 menunggu token baru.
   */
  private subscribeTokenRefresh(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb)
  }

  /**
   * Selesai refresh — jalankan semua request yang menunggu.
   */
  private onTokenRefreshed(newToken: string) {
    this.refreshSubscribers.forEach((cb) => cb(newToken))
    this.refreshSubscribers = []
  }

  /**
   * Gagal refresh — reject semua request yang menunggu.
   */
  private onRefreshFailed() {
    this.refreshSubscribers = []
  }

  /**
   * Attempt refresh token via Keycloak.
   * Return new session token jika berhasil, null jika gagal.
   */
  private async attemptRefresh(): Promise<string | null> {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) return null

    try {
      // 1. Refresh Keycloak token
      const keycloakUrl = import.meta.env?.VITE_KEYCLOAK_URL || ''
      const keycloakRealm = import.meta.env?.VITE_KEYCLOAK_REALM || ''
      const clientId = import.meta.env?.VITE_KEYCLOAK_CLIENT_ID || ''
      const clientSecret = import.meta.env?.VITE_KEYCLOAK_CLIENT_SECRET || ''

      const tokenEndpoint = `${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/token`

      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: refreshToken,
      })

      if (clientSecret) {
        body.set('client_secret', clientSecret)
      }

      const keycloakRes = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })

      if (!keycloakRes.ok) return null

      const keycloakData = await keycloakRes.json()

      // Simpan refresh token baru
      localStorage.setItem('refresh_token', keycloakData.refresh_token)
      if (keycloakData.id_token) {
        localStorage.setItem('id_token', keycloakData.id_token)
      }

      // 2. Tukar Keycloak access_token ke Polaris session baru
      const sessionRes = await fetch('/api/v1/auth/session', {
        method: 'POST',
        headers: {
          ...config.admin.headers,
          Authorization: `Bearer ${keycloakData.access_token}`,
        },
        body: '{}',
      })

      if (!sessionRes.ok) return null

      const sessionResult = await sessionRes.json()
      const payload = Array.isArray(sessionResult.data)
        ? sessionResult.data[0]
        : sessionResult.data?.data?.[0] || sessionResult.data

      if (!payload?.sessionToken) return null

      // 3. Simpan token baru
      localStorage.setItem('token', payload.sessionToken)
      if (payload.userId) {
        localStorage.setItem('polaris_user_id', payload.userId)
      }

      return payload.sessionToken
    } catch {
      return null
    }
  }

  private setupInterceptors() {
    // Interceptor request — pasang header standar di setiap request
    this.instance.interceptors.request.use(
      (reqConfig) => {
        // baseURL selalu relatif (/api/v1) — proxy yang handle target
        // Dev local: Vite proxy di shell | Production: Nginx proxy ke backend
        reqConfig.baseURL = '/api/v1'

        const headers = reqConfig.headers as unknown as Record<string, string | undefined>
        const skipWarehouseContext = headers['X-Skip-Warehouse-Context'] === '1'

        // Token autentikasi — session token dari Polaris
        const token = this.getToken()
        if (token) {
          reqConfig.headers['X-Session-Token'] = token
        }

        // Header standar sesuai ketentuan teknis
        reqConfig.headers['X-Request-Id'] = this.generateUUID()
        reqConfig.headers['X-Correlation-Id'] = this.generateUUID()
        reqConfig.headers['X-Organization-Id'] = localStorage.getItem('organization_id') || ''
        reqConfig.headers['X-User-Id'] = this.getUserId()
        reqConfig.headers['X-Timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone
        reqConfig.headers['X-Language'] = navigator.language
        reqConfig.headers['X-Platform'] = 'web'

        // Konteks warehouse (untuk endpoint operasional)
        const warehouseId = this.getWarehouseId()
        if (!skipWarehouseContext && warehouseId) {
          reqConfig.headers['X-Warehouse-Id'] = warehouseId
        }

        // Internal control header, jangan ikut dikirim ke backend.
        if (skipWarehouseContext) {
          delete headers['X-Skip-Warehouse-Context']
        }

        // Username (dibutuhkan backend untuk field audit)
        const username = this.getUsername()
        if (username) {
          reqConfig.headers['user-username'] = username
        }

        // 🔍 Debug: log full URL sebelum request dikirim
        // const fullUrl = `${reqConfig.baseURL || ''}${reqConfig.url || ''}`
        // console.log(`[API] ${reqConfig.method?.toUpperCase()} ${fullUrl}`, reqConfig.data || '')

        return reqConfig
      },
      (error) => Promise.reject(error)
    )

    // Interceptor response — tangani error secara global
    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const isCallbackPage =
          typeof window !== 'undefined' &&
          window.location.pathname.includes('/auth/callback')

        const originalRequest = error.config

        // Error jaringan / timeout (tidak ada response dari server)
        if (!error.response) {
          const isTimeout = error.code === 'ECONNABORTED'
          const isAborted = error.code === 'ERR_CANCELED'

          if (!isAborted) {
            this.showToast('error', 'Koneksi Gagal',
              isTimeout
                ? 'Request melebihi batas waktu. Silakan coba lagi.'
                : 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'
            )
          }

          const apiError: ApiError = {
            httpCode: 0,
            message: isTimeout ? 'Request timeout' : 'Gagal terhubung ke server',
            status: 0,
            errorMessage: [],
            errors: [],
          }
          return Promise.reject(apiError)
        }

        const status = error.response.status

        // 401 — Attempt refresh token sebelum redirect ke login
        if (status === 401 && !isCallbackPage && !originalRequest._retry) {
          // Jika sudah ada proses refresh berjalan, queue request ini
          if (this.isRefreshing) {
            return new Promise((resolve) => {
              this.subscribeTokenRefresh((newToken: string) => {
                originalRequest.headers.Authorization = `Bearer ${newToken}`
                resolve(this.instance(originalRequest))
              })
            })
          }

          originalRequest._retry = true
          this.isRefreshing = true

          const newToken = await this.attemptRefresh()

          if (newToken) {
            this.isRefreshing = false
            this.onTokenRefreshed(newToken)
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            return this.instance(originalRequest)
          }

          // Refresh gagal → logout
          this.isRefreshing = false
          this.onRefreshFailed()
          this.clearAuthToken()
          this.showToast('error', 'Sesi Berakhir', 'Sesi Anda telah berakhir. Silakan login kembali.')
          setTimeout(() => { window.location.href = '/auth/login' }, 1500)
        }

        // 403 — Akses ditolak
        if (status === 403) {
          this.showToast('error', 'Akses Ditolak', 'Anda tidak memiliki izin untuk melakukan aksi ini.')
        }

        // 500+ — Error server
        if (status >= 500) {
          this.showToast('error', 'Kesalahan Server', 'Terjadi kesalahan pada server. Silakan coba lagi nanti.')
        }

        const apiError: ApiError = {
          httpCode: status,
          message: error.response?.data?.message || error.message || 'Terjadi kesalahan',
          status,
          errorMessage: error.response?.data?.errorMessage || [],
          errors: error.response?.data?.errors || [],
          data: error.response?.data?.data,
        }

        return Promise.reject(apiError)
      }
    )
  }

  private showToast(type: 'error' | 'warning' | 'info', title: string, message: string) {
    try {
      import('sonner').then(({ toast }) => {
        if (type === 'error') toast.error(title, { description: message, duration: Infinity })
        else if (type === 'warning') toast.warning(title, { description: message, duration: Infinity })
        else toast.info(title, { description: message, duration: 3000 })
      })
    } catch {
      console.error(`[${type.toUpperCase()}] ${title}: ${message}`)
    }
  }

  private generateUUID(): string {
    return crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token')
    }
    return null
  }

  private getUserId(): string {
    if (typeof window !== 'undefined') {
      try {
        const token = localStorage.getItem('token')
        if (!token) return ''
        const payload = JSON.parse(atob(token.split('.')[1]))
        return payload.sub || ''
      } catch {
        return ''
      }
    }
    return ''
  }

  private getUsername(): string | null {
    if (typeof window !== 'undefined') {
      // Username disimpan saat loadUser berhasil di AuthProvider
      const username = localStorage.getItem('polaris_username')
      if (username) return username

      // Fallback: coba decode dari JWT jika token adalah JWT (bukan Polaris session token)
      try {
        const token = localStorage.getItem('token')
        if (!token) return null
        const parts = token.split('.')
        if (parts.length !== 3) return null
        const payload = JSON.parse(atob(parts[1]))
        return payload.preferred_username || payload.username || payload.name || null
      } catch {
        return null
      }
    }
    return null
  }

  private getWarehouseId(): string | null {
    if (typeof window !== 'undefined') {
      try {
        const wh = localStorage.getItem('selected_warehouse')
        if (!wh) return null
        return JSON.parse(wh).id || JSON.parse(wh).code || null
      } catch {
        return null
      }
    }
    return null
  }

  setAuthToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token)
    }
  }

  clearAuthToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
    }
  }

  async get<T = unknown>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    const headers = {
      ...(config?.headers || {}),
      ...(config?.skipWarehouseContext ? { 'X-Skip-Warehouse-Context': '1' } : {}),
    }
    const response = await this.instance.get<ApiResponse<T>>(url, {
      headers,
      params: config?.params,
      timeout: config?.timeout,
      signal: config?.signal,
    })
    return response.data
  }

  async getRaw<T = unknown>(url: string, config?: RequestConfig): Promise<T> {
    const headers = {
      ...(config?.headers || {}),
      ...(config?.skipWarehouseContext ? { 'X-Skip-Warehouse-Context': '1' } : {}),
    }
    const response = await this.instance.get<T>(url, {
      headers,
      params: config?.params,
      timeout: config?.timeout,
      signal: config?.signal,
    })
    return response.data
  }

  async post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    const headers = {
      ...(config?.headers || {}),
      ...(config?.skipWarehouseContext ? { 'X-Skip-Warehouse-Context': '1' } : {}),
    }
    const response = await this.instance.post<ApiResponse<T>>(url, data, {
      headers,
      params: config?.params,
      timeout: config?.timeout,
      signal: config?.signal,
    })
    return response.data
  }

  async postRaw<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    const headers = {
      ...(config?.headers || {}),
      ...(config?.skipWarehouseContext ? { 'X-Skip-Warehouse-Context': '1' } : {}),
    }
    const response = await this.instance.post<T>(url, data, {
      headers,
      params: config?.params,
      timeout: config?.timeout,
      signal: config?.signal,
    })
    return response.data
  }

  async put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    const headers = {
      ...(config?.headers || {}),
      ...(config?.skipWarehouseContext ? { 'X-Skip-Warehouse-Context': '1' } : {}),
    }
    const response = await this.instance.put<ApiResponse<T>>(url, data, {
      headers,
      params: config?.params,
      timeout: config?.timeout,
      signal: config?.signal,
    })
    return response.data
  }

  async patch<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    const headers = {
      ...(config?.headers || {}),
      ...(config?.skipWarehouseContext ? { 'X-Skip-Warehouse-Context': '1' } : {}),
    }
    const response = await this.instance.patch<ApiResponse<T>>(url, data, {
      headers,
      params: config?.params,
      timeout: config?.timeout,
      signal: config?.signal,
    })
    return response.data
  }

  async patchRaw<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    const headers = {
      ...(config?.headers || {}),
      ...(config?.skipWarehouseContext ? { 'X-Skip-Warehouse-Context': '1' } : {}),
    }
    const response = await this.instance.patch<T>(url, data, {
      headers,
      params: config?.params,
      timeout: config?.timeout,
      signal: config?.signal,
    })
    return response.data
  }

  async delete<T = unknown>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    const headers = {
      ...(config?.headers || {}),
      ...(config?.skipWarehouseContext ? { 'X-Skip-Warehouse-Context': '1' } : {}),
    }
    const response = await this.instance.delete<ApiResponse<T>>(url, {
      headers,
      params: config?.params,
      timeout: config?.timeout,
      signal: config?.signal,
    })
    return response.data
  }
}

export const fetcher = new ApiFetcher()
export default fetcher
