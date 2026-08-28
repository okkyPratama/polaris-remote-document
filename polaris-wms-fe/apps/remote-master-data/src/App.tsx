import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MasterDataPage from './views/master-data'
import BusinessPartiesPage from './views/business-parties'
import CarrierServiceTypesPage from './views/carrier-service-types'
import ProductsPage from './views/products'
import ZoneGroupsPage from './views/spatial/zone-groups'
import ZonesPage from './views/spatial/zones'
import LocationsPage from './views/spatial/locations'
import UomPage from './views/uom'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MasterDataPage />} />
          <Route path="/master-data" element={<MasterDataPage />} />
          <Route path="/business-parties" element={<BusinessPartiesPage canCreate canUpdate />} />
          <Route path="/products" element={<ProductsPage canCreate canUpdate canDelete />} />
          <Route path="/carrier-service-types" element={<CarrierServiceTypesPage canCreate canUpdate canDelete />} />
          <Route path="/zone-groups" element={<ZoneGroupsPage canCreate canUpdate canDelete />} />
          <Route path="/zones" element={<ZonesPage canCreate canUpdate canDelete />} />
          <Route path="/locations" element={<LocationsPage canCreate canUpdate canDelete />} />
          <Route path="/uom" element={<UomPage canCreate canUpdate canDelete />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
