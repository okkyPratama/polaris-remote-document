import { lazy } from 'react'
import { RemoteWrapper } from '@/components/RemoteWrapper'
import { useAuthContext } from '@/contexts/AuthProvider'
import {
  PERMISSION_ZONE_CREATE,
  PERMISSION_ZONE_EDIT,
  PERMISSION_ZONE_DELETE,
} from '@polaris/config'

const ZonesPage = lazy(() => import('remote-master-data/views/zones'))

export function Zones() {
  const { hasPermission } = useAuthContext()

  return (
    <RemoteWrapper>
      <ZonesPage
        canCreate={hasPermission(PERMISSION_ZONE_CREATE)}
        canUpdate={hasPermission(PERMISSION_ZONE_EDIT)}
        canDelete={hasPermission(PERMISSION_ZONE_DELETE)}
      />
    </RemoteWrapper>
  )
}
