import { useAuthContext } from '@/contexts/AuthProvider'
import { Loading } from '@polaris/ui'
import type { ReactNode } from 'react'

interface RequirePermissionProps {
  children: ReactNode
  permission: string
}

/**
 * Route guard — cek apakah user punya permission tertentu.
 * - Auth/session still loading → loading UI (hindari flash 403 / false allow)
 * - Loaded but missing permission (including empty permission set) → 403
 * - Has permission → render children
 */
export function RequirePermission({ children, permission }: RequirePermissionProps) {
  const { hasPermission, loading } = useAuthContext()

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loading size="lg" />
      </div>
    )
  }

  if (!hasPermission(permission)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#fef2f2] flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef3340" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[#1f2b59] mb-1">Akses Ditolak</h2>
          <p className="text-sm text-[#485885] mb-4">
            Anda tidak memiliki izin untuk mengakses halaman ini.
          </p>
          <p className="text-xs text-[#949eb8]">
            Hubungi administrator jika Anda memerlukan akses.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
