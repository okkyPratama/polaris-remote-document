import { lazy } from 'react'
import { RemoteWrapper } from '@/components/RemoteWrapper'
import { useAuthContext } from '@/contexts/AuthProvider'
import {
  PERMISSION_COMPANY_CREATE,
  PERMISSION_COMPANY_UPDATE,
  PERMISSION_COMPANY_DELETE,
} from '@polaris/config'

const CompaniesPage = lazy(() => import('remote-admin/views/companies'))

export function Companies() {
  const { hasPermission } = useAuthContext()

  return (
    <RemoteWrapper>
      <CompaniesPage
        canCreate={hasPermission(PERMISSION_COMPANY_CREATE)}
        canUpdate={hasPermission(PERMISSION_COMPANY_UPDATE)}
        canDelete={hasPermission(PERMISSION_COMPANY_DELETE)}
      />
    </RemoteWrapper>
  )
}
