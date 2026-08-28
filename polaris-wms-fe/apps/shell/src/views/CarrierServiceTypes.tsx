import { lazy } from 'react'
import { RemoteWrapper } from '@/components/RemoteWrapper'
import { useAuthContext } from '@/contexts/AuthProvider'
import {
  PERMISSION_BUSINESS_PARTY_CREATE,
  PERMISSION_BUSINESS_PARTY_DELETE,
  PERMISSION_BUSINESS_PARTY_UPDATE,
} from '@polaris/config'

const CarrierServiceTypesPage = lazy(() => import('remote-master-data/views/carrier-service-types'))

export function CarrierServiceTypes() {
  const { hasPermission } = useAuthContext()

  return (
    <RemoteWrapper>
      <CarrierServiceTypesPage
        canCreate={hasPermission(PERMISSION_BUSINESS_PARTY_CREATE)}
        canUpdate={hasPermission(PERMISSION_BUSINESS_PARTY_UPDATE)}
        canDelete={hasPermission(PERMISSION_BUSINESS_PARTY_DELETE)}
      />
    </RemoteWrapper>
  )
}
