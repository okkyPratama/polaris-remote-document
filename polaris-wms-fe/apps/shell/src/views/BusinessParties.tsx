import { lazy } from 'react'
import { RemoteWrapper } from '@/components/RemoteWrapper'
import { useAuthContext } from '@/contexts/AuthProvider'
import {
  PERMISSION_BUSINESS_PARTY_CREATE,
  PERMISSION_BUSINESS_PARTY_DELETE,
  PERMISSION_BUSINESS_PARTY_UPDATE,
} from '@polaris/config'

type RoleFilter = 'ALL' | 'OWNER' | 'SUPPLIER' | 'CONSIGNEE' | 'CARRIER'

const BusinessPartiesPage = lazy(() => import('remote-master-data/views/business-parties'))

function BusinessPartiesRemote({ initialRole }: { initialRole: RoleFilter }) {
  const { hasPermission } = useAuthContext()

  return (
    <RemoteWrapper>
      <BusinessPartiesPage
        initialRole={initialRole}
        canCreate={hasPermission(PERMISSION_BUSINESS_PARTY_CREATE)}
        canUpdate={hasPermission(PERMISSION_BUSINESS_PARTY_UPDATE)}
        canDelete={hasPermission(PERMISSION_BUSINESS_PARTY_DELETE)}
      />
    </RemoteWrapper>
  )
}

export function Customers() {
  return <BusinessPartiesRemote initialRole="OWNER" />
}

export function Partners() {
  return <BusinessPartiesRemote initialRole="ALL" />
}

export function Suppliers() {
  return <BusinessPartiesRemote initialRole="SUPPLIER" />
}

export function Consignees() {
  return <BusinessPartiesRemote initialRole="CONSIGNEE" />
}

export function Carriers() {
  return <BusinessPartiesRemote initialRole="CARRIER" />
}