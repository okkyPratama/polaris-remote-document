import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { fetcher, queryClient, resolveWarehouseTimezone, clearWarehouseTimezone, WAREHOUSE_CHANGED_EVENT, getSelectedWarehouse } from '@polaris/service'
import { authService } from '@/services/auth'
import { toast } from '@polaris/ui'

// ═══════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════

const STORAGE_KEYS = {
  TOKEN: 'token',
  REFRESH_TOKEN: 'refresh_token',
  ID_TOKEN: 'id_token',
  SESSION_EXPIRES_AT: 'session_expires_at',
  USER_ID: 'polaris_user_id',
  USERNAME: 'polaris_username',
  PERMISSIONS: 'polaris_permissions',
  SELECTED_WAREHOUSE: 'selected_warehouse',
  AUTHORIZED_WAREHOUSES: 'authorized_warehouses',
} as const

const SESSION_CHECK_INTERVAL = 30 * 1000
const EXPIRY_WARNING_SECONDS = 5 * 60

const PERMISSION_ALIASES: Record<string, string[]> = {
  'partner:view': [
    'business-party:view',
    'customer:view',
    'supplier:view',
    'consignee:view',
    'carrier:view',
  ],
  'partner:create': ['partner:edit', 'business-party:create'],
  'partner:update': ['partner:edit', 'business-party:update', 'business-party:edit'],
  'partner:delete': ['business-party:delete'],
}

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════

interface User {
  sub: string
  name: string
  email: string
  preferred_username: string
  roles: string[]
  permissions: string[]
  warehouses: string[]
  /** null = unrestricted owner scope; [] = no owners; ids = scoped owners */
  ownerContextIds: string[] | null
}

export interface Warehouse {
  id: string
  code: string
  name: string
  company: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  selectedWarehouse: Warehouse | null
  setSelectedWarehouse: (warehouse: Warehouse) => Promise<void>
  hasPermission: (permission: string) => boolean
  hasRole: (role: string) => boolean
  canAccessWarehouse: (warehouseCode: string) => boolean
  logout: () => void
  refreshUser: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  loading: true,
  selectedWarehouse: null,
  setSelectedWarehouse: async () => {},
  hasPermission: () => false,
  hasRole: () => false,
  canAccessWarehouse: () => false,
  logout: () => {},
  refreshUser: () => {},
})

// ═══════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════

function clearAuthStorage() {
  localStorage.removeItem(STORAGE_KEYS.TOKEN)
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
  localStorage.removeItem(STORAGE_KEYS.ID_TOKEN)
  localStorage.removeItem(STORAGE_KEYS.SESSION_EXPIRES_AT)
  localStorage.removeItem(STORAGE_KEYS.USER_ID)
  localStorage.removeItem(STORAGE_KEYS.USERNAME)
  localStorage.removeItem(STORAGE_KEYS.SELECTED_WAREHOUSE)
  localStorage.removeItem(STORAGE_KEYS.AUTHORIZED_WAREHOUSES)
  sessionStorage.setItem('force_login', '1')
}

function decodeUsernameFromJwt(accessToken: string): string | null {
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]))
    return payload.preferred_username || payload.username || payload.name || payload.sub || null
  } catch {
    return null
  }
}

// ═══════════════════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════════════════

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedWarehouse, setSelectedWarehouseState] = useState<Warehouse | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.SELECTED_WAREHOUSE)
    return stored ? JSON.parse(stored) : null
  })
  const expiryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasWarnedRef = useRef(false)

  const logout = useCallback(async () => {
    if (expiryTimerRef.current) {
      clearInterval(expiryTimerRef.current)
    }
    queryClient.clear()
    fetcher.clearAuthToken()
    clearWarehouseTimezone()
    localStorage.removeItem(STORAGE_KEYS.USERNAME)
    localStorage.removeItem(STORAGE_KEYS.PERMISSIONS)
    setUser(null)
    setSelectedWarehouseState(null)
    await authService.logout()
  }, [])

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN)
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }

    // Set user minimal dulu supaya isAuthenticated = true (hindari redirect loop)
    setUser((prev) => {
      if (prev) return prev
      return {
        sub: localStorage.getItem(STORAGE_KEYS.USER_ID) || '',
        name: '',
        email: '',
        preferred_username: '',
        roles: [],
        permissions: [],
        warehouses: [],
        ownerContextIds: null,
      }
    })

    // Coba fetch session, dengan 1x retry setelah refresh token.
    // Jika session expired (lokal maupun backend reject), akan coba refresh dulu sebelum logout.
    let currentToken = token
    let retried = false

    while (true) {
      try {
        const session = await authService.getCurrentSession(currentToken)
        localStorage.setItem(STORAGE_KEYS.SESSION_EXPIRES_AT, session.expiresAt)
        localStorage.setItem(STORAGE_KEYS.USERNAME, session.username)

        // Parse warehouse codes dari localStorage
        const storedWarehouses = localStorage.getItem(STORAGE_KEYS.AUTHORIZED_WAREHOUSES)
        const warehouseCodes: string[] = storedWarehouses
          ? (JSON.parse(storedWarehouses) as { id: string; code: string; name: string }[]).map((w) => w.code)
          : []

        // Map roles and permissions
        const roles = (session.roles || []).map((r) => r.code)
        const roleSetFallback = Array.isArray((session as { roleSet?: string[] }).roleSet)
          ? (session as { roleSet?: string[] }).roleSet!
          : []
        const permissionEntries = [
          ...(session.permissions || []),
          ...(session.directPermissions || []),
        ]

        const permissions = permissionEntries
          .map((p) => p.key || `${p.resource}:${p.action}`)
          .filter((key): key is string => typeof key === 'string' && key.length > 0)

        setUser({
          sub: session.userId,
          name: session.username,
          email: '',
          preferred_username: session.username,
          roles: roles.length > 0 ? roles : roleSetFallback,
          permissions,
          warehouses: warehouseCodes,
          ownerContextIds: session.ownerContextIds,
        })
        break
      } catch {
        // Sudah retry 1x → give up
        if (retried) break

        // Coba refresh token
        const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
        if (!refreshToken) break

        try {
          const refreshed = await authService.refreshToken(refreshToken)
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshed.refresh_token)

          const newSession = await authService.createPolarisSession(refreshed.access_token)
          localStorage.setItem(STORAGE_KEYS.TOKEN, newSession.sessionToken)
          if (newSession.userId) localStorage.setItem(STORAGE_KEYS.USER_ID, newSession.userId)

          const username = decodeUsernameFromJwt(refreshed.access_token)
          if (username) localStorage.setItem(STORAGE_KEYS.USERNAME, username)

          currentToken = newSession.sessionToken
          retried = true
          // Loop lagi dengan token baru
        } catch {
          // Refresh gagal → break ke force logout
          break
        }
      }
    }

    // Kalau setelah loop user masih placeholder (sub kosong / belum di-set dari API),
    // berarti semua attempt gagal → force logout
    setUser((prev) => {
      if (prev && prev.name) return prev // berhasil di-enrich dari API

      // Gagal → clear dan redirect
      clearAuthStorage()
      toast.error('Sesi Berakhir', 'Sesi Anda telah berakhir. Silakan login kembali.')
      setTimeout(() => { window.location.href = '/auth/login' }, 1500)
      return null
    })

    setLoading(false)
  }, [])

  const checkSessionExpiry = useCallback(() => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN)
    if (!token) return

    const expiresAt = localStorage.getItem(STORAGE_KEYS.SESSION_EXPIRES_AT)
    if (!expiresAt) return

    try {
      const timeLeftMs = new Date(expiresAt).getTime() - Date.now()

      if (timeLeftMs <= 0) {
        // Session expired — coba refresh via loadUser (yang sudah handle retry + refresh token)
        loadUser()
        return
      }

      if (timeLeftMs <= EXPIRY_WARNING_SECONDS * 1000 && !hasWarnedRef.current) {
        hasWarnedRef.current = true
        const minutesLeft = Math.ceil(timeLeftMs / 60000)
        toast.warning(
          'Session Expiring',
          `Your session will expire in ${minutesLeft} minutes. Save your work.`
        )
      }
    } catch {
      // Ignore malformed date
    }
  }, [loadUser])

  useEffect(() => {
    loadUser()
    expiryTimerRef.current = setInterval(checkSessionExpiry, SESSION_CHECK_INTERVAL)
    return () => {
      if (expiryTimerRef.current) clearInterval(expiryTimerRef.current)
    }
  }, [loadUser, checkSessionExpiry])

  useEffect(() => {
    const onWarehouseChanged = () => {
      const stored = getSelectedWarehouse()
      if (stored) {
        setSelectedWarehouseState({
          id: stored.id,
          code: stored.code,
          name: stored.name,
          company: stored.company ?? '',
        })
        void loadUser()
      }
    }
    window.addEventListener(WAREHOUSE_CHANGED_EVENT, onWarehouseChanged)
    return () => window.removeEventListener(WAREHOUSE_CHANGED_EVENT, onWarehouseChanged)
  }, [loadUser])

  const setSelectedWarehouse = useCallback(async (warehouse: Warehouse) => {
    const previousWarehouse = selectedWarehouse
    const previousStored = localStorage.getItem(STORAGE_KEYS.SELECTED_WAREHOUSE)

    queryClient.clear()
    setSelectedWarehouseState(warehouse)
    localStorage.setItem(STORAGE_KEYS.SELECTED_WAREHOUSE, JSON.stringify(warehouse))

    const token = localStorage.getItem(STORAGE_KEYS.TOKEN)
    if (!token) return

    try {
      await authService.switchContext(token, warehouse.id)
      await resolveWarehouseTimezone(warehouse.id)
      await loadUser()
    } catch (err) {
      queryClient.clear()
      setSelectedWarehouseState(previousWarehouse)
      if (previousStored) {
        localStorage.setItem(STORAGE_KEYS.SELECTED_WAREHOUSE, previousStored)
      } else {
        localStorage.removeItem(STORAGE_KEYS.SELECTED_WAREHOUSE)
      }

      const message = err instanceof Error ? err.message : 'Gagal mengganti konteks warehouse'
      toast.error('Gagal ganti gudang', message)
      throw err
    }
  }, [selectedWarehouse, loadUser])

  const hasPermission = useCallback((permission: string): boolean => {
    const wanted = permission.toLowerCase()
    const granted = (user?.permissions ?? []).map((p) => p.toLowerCase())
    if (granted.includes(wanted)) return true

    const aliases = PERMISSION_ALIASES[wanted] ?? []
    return aliases.some((alias) => granted.includes(alias.toLowerCase()))
  }, [user])

  const hasRole = useCallback((role: string): boolean => {
    return user?.roles.includes(role) ?? false
  }, [user])

  const canAccessWarehouse = useCallback((warehouseCode: string): boolean => {
    return user?.warehouses.includes(warehouseCode) ?? false
  }, [user])

  const refreshUser = useCallback(() => {
    hasWarnedRef.current = false
    loadUser()
  }, [loadUser])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        selectedWarehouse,
        setSelectedWarehouse,
        hasPermission,
        hasRole,
        canAccessWarehouse,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}
