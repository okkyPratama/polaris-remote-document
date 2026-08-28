import { lazy } from 'react'
import { RemoteWrapper } from '@/components/RemoteWrapper'
import { useAuthContext } from '@/contexts/AuthProvider'
import {
  PERMISSION_PRODUCT_CREATE,
  PERMISSION_PRODUCT_UPDATE,
  PERMISSION_PRODUCT_DELETE,
} from '@polaris/config'

const ProductsPage = lazy(() => import('remote-master-data/views/products'))

export function Products() {
  const { hasPermission } = useAuthContext()

  return (
    <RemoteWrapper>
      <ProductsPage
        canCreate={hasPermission(PERMISSION_PRODUCT_CREATE)}
        canUpdate={hasPermission(PERMISSION_PRODUCT_UPDATE)}
        canDelete={hasPermission(PERMISSION_PRODUCT_DELETE)}
      />
    </RemoteWrapper>
  )
}
