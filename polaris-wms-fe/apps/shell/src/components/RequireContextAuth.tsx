import { Navigate } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthProvider'
import { Loading } from '@polaris/ui'
import type { ReactNode } from 'react'

interface RequireContextAuthProps {
  children: ReactNode
}

/**
 * Auth guard for select-context page.
 * Requires authentication but does NOT require a selected warehouse
 * (since that's what the user is about to select).
 */
export function RequireContextAuth({ children }: RequireContextAuthProps) {
  const { isAuthenticated, loading } = useAuthContext()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f1f3f8]">
        <Loading size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />
  }

  return <>{children}</>
}
