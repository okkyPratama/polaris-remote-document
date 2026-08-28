import type { ReactNode } from 'react'

export interface PermissionGuardProps {
  /** Single permission or array — user needs at least ONE */
  permission: string | string[]
  /** Function to check permission (injected from auth context) */
  hasPermission: (permission: string) => boolean
  /** Content to render when permitted */
  children: ReactNode
  /** Optional fallback when not permitted */
  fallback?: ReactNode
}

/**
 * PermissionGuard — conditionally render UI based on user permissions.
 *
 * Usage:
 * ```tsx
 * import { PERMISSION_COMPANY_CREATE } from '@polaris/config'
 *
 * <PermissionGuard permission={PERMISSION_COMPANY_CREATE} hasPermission={hasPermission}>
 *   <Button>Tambah Perusahaan</Button>
 * </PermissionGuard>
 * ```
 */
export function PermissionGuard({
  permission,
  hasPermission,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const permissions = Array.isArray(permission) ? permission : [permission]
  const isAllowed = permissions.some((p) => hasPermission(p))

  return isAllowed ? <>{children}</> : <>{fallback}</>
}

PermissionGuard.displayName = 'PermissionGuard'
