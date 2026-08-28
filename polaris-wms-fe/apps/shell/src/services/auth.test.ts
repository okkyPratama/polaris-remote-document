import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock import.meta.env
vi.stubGlobal('import', { meta: { env: {} } })

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock crypto.subtle for PKCE
vi.stubGlobal('crypto', {
  getRandomValues: (arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256)
    return arr
  },
  subtle: {
    digest: async (_algo: string, data: ArrayBuffer) => {
      // Simple mock — return same data as hash for testing purposes
      return data
    },
  },
  randomUUID: () => 'test-uuid-1234',
})

// Mock @polaris/service
vi.mock('@polaris/service', () => ({
  gatewayHeaders: { 'Content-Type': 'application/json' },
}))

import { authService } from './auth'

describe('authService', () => {
  let storage: Record<string, string>

  beforeEach(() => {
    storage = {}
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => storage[key] ?? null)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => { storage[key] = value })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => { delete storage[key] })
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─── checkAuth ───────────────────────────────────────────────────────

  describe('checkAuth', () => {
    it('returns false when no token in localStorage', () => {
      expect(authService.checkAuth()).toBe(false)
    })

    it('returns true for non-JWT token (UUID session token)', () => {
      storage['token'] = 'simple-session-token-without-dots'
      expect(authService.checkAuth()).toBe(true)
    })

    it('returns true for valid JWT with future expiry', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      const payload = btoa(JSON.stringify({ sub: 'user-1', exp: futureExp }))
      storage['token'] = `header.${payload}.signature`
      expect(authService.checkAuth()).toBe(true)
    })

    it('returns false for expired JWT', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 100
      const payload = btoa(JSON.stringify({ sub: 'user-1', exp: pastExp }))
      storage['token'] = `header.${payload}.signature`
      expect(authService.checkAuth()).toBe(false)
    })
  })

  // ─── exchangeCode ────────────────────────────────────────────────────

  describe('exchangeCode', () => {
    it('posts authorization code to token endpoint', async () => {
      // Set PKCE verifier
      storage['pkce_code_verifier'] = 'test-verifier-123'

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'kc-access-token',
          refresh_token: 'kc-refresh-token',
          id_token: 'kc-id-token',
        }),
      })

      const result = await authService.exchangeCode('auth-code-xyz')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('token')
      expect(options.method).toBe('POST')
      // Body should contain the code and verifier
      const body = options.body as string
      expect(body).toContain('code=auth-code-xyz')
      expect(body).toContain('code_verifier=test-verifier-123')

      expect(result.access_token).toBe('kc-access-token')
      expect(result.refresh_token).toBe('kc-refresh-token')
    })

    it('removes pkce_code_verifier from sessionStorage after use', async () => {
      storage['pkce_code_verifier'] = 'test-verifier'

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'x', refresh_token: 'y', id_token: 'z' }),
      })

      await authService.exchangeCode('code')

      // sessionStorage.removeItem should have been called
      expect(storage['pkce_code_verifier']).toBeUndefined()
    })

    it('throws when token exchange fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error_description: 'Invalid code' }),
      })

      await expect(authService.exchangeCode('bad-code')).rejects.toThrow('Invalid code')
    })
  })

  // ─── createPolarisSession ────────────────────────────────────────────

  describe('createPolarisSession', () => {
    it('exchanges keycloak token for polaris session', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              sessionToken: 'polaris-session-abc',
              userId: 'user-123',
              warehouses: [{ id: 'wh-1', code: 'WH-JKT', name: 'WH Jakarta' }],
            },
          ],
        }),
      })

      const result = await authService.createPolarisSession('kc-access-token')

      expect(result.sessionToken).toBe('polaris-session-abc')
      expect(result.userId).toBe('user-123')
      expect(result.warehouses).toHaveLength(1)

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('/auth/session')
      expect(options.headers.Authorization).toBe('Bearer kc-access-token')
    })

    it('throws when response has no sessionToken', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{}] }),
      })

      await expect(authService.createPolarisSession('token')).rejects.toThrow(/Response sesi tidak valid/)
    })

    it('throws with status info when API returns error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ externalDesc: 'User tidak aktif' }),
      })

      await expect(authService.createPolarisSession('token')).rejects.toThrow('User tidak aktif')
    })
  })

  // ─── getCurrentSession ───────────────────────────────────────────────

  describe('getCurrentSession', () => {
    it('fetches current session with session token header', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              userId: 'u-1',
              username: 'admin',
              currentWarehouseId: 'wh-1',
              ownerContextIds: ['owner-1'],
              roles: [{ id: 'r1', code: 'ADMIN', name: 'Administrator', isSystem: true }],
              permissions: [{ id: 'p1', key: 'user:view', resource: 'user', action: 'view' }],
              directPermissions: [],
              expiresAt: '2026-08-01T00:00:00Z',
            },
          ],
        }),
      })

      const session = await authService.getCurrentSession('session-token-abc')

      expect(session.userId).toBe('u-1')
      expect(session.username).toBe('admin')
      expect(session.ownerContextIds).toEqual(['owner-1'])
      expect(session.roles).toHaveLength(1)
      expect(session.permissions).toHaveLength(1)

      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers['X-Session-Token']).toBe('session-token-abc')
    })

    it('throws when fetch fails', async () => {
      mockFetch.mockResolvedValue({ ok: false })

      await expect(authService.getCurrentSession('token')).rejects.toThrow('Gagal mengambil data sesi')
    })
  })

  // ─── refreshToken ────────────────────────────────────────────────────

  describe('refreshToken', () => {
    it('posts refresh token and returns new tokens', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
        }),
      })

      const result = await authService.refreshToken('old-refresh-token')

      expect(result.access_token).toBe('new-access')
      expect(result.refresh_token).toBe('new-refresh')

      const body = mockFetch.mock.calls[0][1].body as string
      expect(body).toContain('refresh_token=old-refresh-token')
      expect(body).toContain('grant_type=refresh_token')
    })

    it('throws when refresh fails', async () => {
      mockFetch.mockResolvedValue({ ok: false })

      await expect(authService.refreshToken('expired-token')).rejects.toThrow('Gagal refresh token')
    })
  })

  // ─── getKeycloakLoginUrl ─────────────────────────────────────────────

  describe('getKeycloakLoginUrl', () => {
    it('generates login URL with PKCE params', async () => {
      const url = await authService.getKeycloakLoginUrl()

      expect(url).toContain('response_type=code')
      expect(url).toContain('code_challenge=')
      expect(url).toContain('code_challenge_method=S256')
      expect(url).toContain('scope=openid')

      // Should store verifier in sessionStorage
      expect(storage['pkce_code_verifier']).toBeDefined()
      expect(storage['pkce_code_verifier'].length).toBeGreaterThan(10)
    })

    it('adds prompt=login when force_login is set', async () => {
      storage['force_login'] = '1'

      const url = await authService.getKeycloakLoginUrl()

      expect(url).toContain('prompt=login')
      // force_login should be cleared
      expect(storage['force_login']).toBeUndefined()
    })
  })
})
