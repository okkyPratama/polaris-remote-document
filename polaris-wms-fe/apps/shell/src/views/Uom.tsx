import { lazy } from 'react'
import { RemoteWrapper } from '@/components/RemoteWrapper'
import { useAuthContext } from '@/contexts/AuthProvider'
import {
  PERMISSION_UOM_CREATE,
  PERMISSION_UOM_EDIT,
  PERMISSION_UOM_DELETE,
} from '@polaris/config'

const UomPage = lazy(() => import('remote-master-data/views/uom'))

export function Uom() {
  const { hasPermission, user } = useAuthContext()

  return (
    <RemoteWrapper>
      <UomPage
        ownerContextIds={user?.ownerContextIds}
        canCreate={hasPermission(PERMISSION_UOM_CREATE)}
        canUpdate={hasPermission(PERMISSION_UOM_EDIT)}
        canDelete={hasPermission(PERMISSION_UOM_DELETE)}
      />
    </RemoteWrapper>
  )
}
