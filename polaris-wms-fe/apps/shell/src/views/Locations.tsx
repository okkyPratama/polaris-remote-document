import { lazy } from 'react'
import { RemoteWrapper } from '@/components/RemoteWrapper'
import { useAuthContext } from '@/contexts/AuthProvider'
import {
  PERMISSION_LOCATION_CREATE,
  PERMISSION_LOCATION_EDIT,
  PERMISSION_LOCATION_DELETE,
} from '@polaris/config'

const LocationsPage = lazy(() => import('remote-master-data/views/locations'))

export function Locations() {
  const { hasPermission } = useAuthContext()

  return (
    <RemoteWrapper>
      <LocationsPage
        canCreate={hasPermission(PERMISSION_LOCATION_CREATE)}
        canUpdate={hasPermission(PERMISSION_LOCATION_EDIT)}
        canDelete={hasPermission(PERMISSION_LOCATION_DELETE)}
      />
    </RemoteWrapper>
  )
}
