import { lazy } from 'react'
import { RemoteWrapper } from '@/components/RemoteWrapper'
import { useAuthContext } from '@/contexts/AuthProvider'
import {
  PERMISSION_WAREHOUSE_CREATE,
  PERMISSION_WAREHOUSE_UPDATE,
  PERMISSION_WAREHOUSE_DELETE,
} from '@polaris/config'

const WarehousesPage = lazy(() => import('remote-admin/views/warehouse'))

export function Warehouses() {
  const { hasPermission } = useAuthContext()

  return (
    <RemoteWrapper>
      <WarehousesPage
        canCreate={hasPermission(PERMISSION_WAREHOUSE_CREATE)}
        canUpdate={hasPermission(PERMISSION_WAREHOUSE_UPDATE)}
        canDelete={hasPermission(PERMISSION_WAREHOUSE_DELETE)}
      />
    </RemoteWrapper>
  )
}
