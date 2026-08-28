import { lazy } from 'react'
import { RemoteWrapper } from '@/components/RemoteWrapper'
import { useAuthContext } from '@/contexts/AuthProvider'
import {
  PERMISSION_COMPANY_GROUP_CREATE,
  PERMISSION_COMPANY_GROUP_UPDATE,
  PERMISSION_COMPANY_GROUP_DELETE,
} from '@polaris/config'

const CompanyGroupsPage = lazy(() => import('remote-admin/views/company-groups'))

export function CompanyGroups() {
  const { hasPermission } = useAuthContext()

  return (
    <RemoteWrapper>
      <CompanyGroupsPage
        canCreate={hasPermission(PERMISSION_COMPANY_GROUP_CREATE)}
        canUpdate={hasPermission(PERMISSION_COMPANY_GROUP_UPDATE)}
        canDelete={hasPermission(PERMISSION_COMPANY_GROUP_DELETE)}
      />
    </RemoteWrapper>
  )
}
