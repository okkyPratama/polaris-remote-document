import { lazy } from 'react'
import { RemoteWrapper } from '@/components/RemoteWrapper'
import { useAuthContext } from '@/contexts/AuthProvider'
import {
  PERMISSION_ZONE_GROUP_CREATE,
  PERMISSION_ZONE_GROUP_EDIT,
  PERMISSION_ZONE_GROUP_DELETE,
} from '@polaris/config'

const ZoneGroupsPage = lazy(() => import('remote-master-data/views/zone-groups'))

export function ZoneGroups() {
  const { hasPermission } = useAuthContext()

  return (
    <RemoteWrapper>
      <ZoneGroupsPage
        canCreate={hasPermission(PERMISSION_ZONE_GROUP_CREATE)}
        canUpdate={hasPermission(PERMISSION_ZONE_GROUP_EDIT)}
        canDelete={hasPermission(PERMISSION_ZONE_GROUP_DELETE)}
      />
    </RemoteWrapper>
  )
}
