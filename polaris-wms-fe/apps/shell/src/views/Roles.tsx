import { lazy } from 'react'
import { RemoteWrapper } from '@/components/RemoteWrapper'
import { useAuthContext } from '@/contexts/AuthProvider'
import {
  PERMISSION_ROLE_CREATE,
  PERMISSION_ROLE_UPDATE,
  PERMISSION_ROLE_DELETE,
} from '@polaris/config'

const RolesPage = lazy(() => import('remote-admin/views/roles'))

export function Roles() {
  const { hasPermission } = useAuthContext()

  return (
    <RemoteWrapper>
      <RolesPage
        canCreate={hasPermission(PERMISSION_ROLE_CREATE)}
        canUpdate={hasPermission(PERMISSION_ROLE_UPDATE)}
        canDelete={hasPermission(PERMISSION_ROLE_DELETE)}
      />
    </RemoteWrapper>
  )
}
