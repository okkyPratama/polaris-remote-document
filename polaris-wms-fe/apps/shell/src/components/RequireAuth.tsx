import { Navigate } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthProvider'
import { Loading } from '@polaris/ui'
import type { ReactNode } from 'react'

interface RequireAuthProps {
  children: ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated, loading, selectedWarehouse } = useAuthContext()

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

  // User authenticated but hasn't selected a warehouse yet
  if (!selectedWarehouse) {
    return <Navigate to="/select-context" replace />
  }

  return <>{children}</>
}
