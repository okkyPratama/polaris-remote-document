import { lazy } from 'react'
import { RemoteWrapper } from '@/components/RemoteWrapper'
import { useAuthContext } from '@/contexts/AuthProvider'
import {
  PERMISSION_CODE_CREATE,
  PERMISSION_CODE_UPDATE,
  PERMISSION_CODE_DELETE,
  PERMISSION_CODE_DETAIL_CREATE,
  PERMISSION_CODE_DETAIL_UPDATE,
  PERMISSION_CODE_DETAIL_DELETE,
} from '@polaris/config'

const CodesPage = lazy(() => import('remote-admin/views/codes'))

export function Codes() {
  const { hasPermission } = useAuthContext()

  return (
    <RemoteWrapper>
      <CodesPage
        canCreate={hasPermission(PERMISSION_CODE_CREATE)}
        canUpdate={hasPermission(PERMISSION_CODE_UPDATE)}
        canDelete={hasPermission(PERMISSION_CODE_DELETE)}
        canCreateDetail={hasPermission(PERMISSION_CODE_DETAIL_CREATE)}
        canUpdateDetail={hasPermission(PERMISSION_CODE_DETAIL_UPDATE)}
        canDeleteDetail={hasPermission(PERMISSION_CODE_DETAIL_DELETE)}
      />
    </RemoteWrapper>
  )
}
