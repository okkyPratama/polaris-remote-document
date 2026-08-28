import { lazy } from 'react'
import { RemoteWrapper } from '@/components/RemoteWrapper'
import { useAuthContext } from '@/contexts/AuthProvider'
import {
  PERMISSION_USER_CREATE,
  PERMISSION_USER_UPDATE,
  PERMISSION_USER_DELETE,
} from '@polaris/config'

const UsersPage = lazy(() => import('remote-admin/views/users'))

export function Users() {
  const { hasPermission } = useAuthContext()

  return (
    <RemoteWrapper>
      <UsersPage
        canCreate={hasPermission(PERMISSION_USER_CREATE)}
        canUpdate={hasPermission(PERMISSION_USER_UPDATE)}
        canDelete={hasPermission(PERMISSION_USER_DELETE)}
      />
    </RemoteWrapper>
  )
}
