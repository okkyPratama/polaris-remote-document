import { lazy } from 'react'
import { RemoteWrapper } from '@/components/RemoteWrapper'
import { useAuthContext } from '@/contexts/AuthProvider'
import {
  PERMISSION_CONFIG_CREATE,
  PERMISSION_CONFIG_UPDATE,
  PERMISSION_CONFIG_DELETE,
  PERMISSION_CONFIG_DETAIL_CREATE,
  PERMISSION_CONFIG_DETAIL_UPDATE,
  PERMISSION_CONFIG_DETAIL_DELETE,
} from '@polaris/config'

const SettingsPage = lazy(() => import('remote-admin/views/settings'))

export function Settings() {
  const { hasPermission } = useAuthContext()

  return (
    <RemoteWrapper>
      <SettingsPage
        canCreate={hasPermission(PERMISSION_CONFIG_CREATE)}
        canUpdate={hasPermission(PERMISSION_CONFIG_UPDATE)}
        canDelete={hasPermission(PERMISSION_CONFIG_DELETE)}
        canCreateDetail={hasPermission(PERMISSION_CONFIG_DETAIL_CREATE)}
        canUpdateDetail={hasPermission(PERMISSION_CONFIG_DETAIL_UPDATE)}
        canDeleteDetail={hasPermission(PERMISSION_CONFIG_DETAIL_DELETE)}
      />
    </RemoteWrapper>
  )
}
