import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@polaris/ui'
import CompanyGroupsPage from './views/company-groups'
import CompaniesPage from './views/companies'
import WarehousePage from './views/warehouse'
import CodesPage from './views/codes'
import RolesPage from './views/roles'
import UsersPage from './views/users'
import SettingsPage from './views/settings'

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
        <Toaster />
        <Routes>
          <Route path="/" element={<CompanyGroupsPage canCreate canUpdate canDelete />} />
          <Route path="/company-groups" element={<CompanyGroupsPage canCreate canUpdate canDelete />} />
          <Route path="/companies" element={<CompaniesPage canCreate canUpdate canDelete />} />
          <Route path="/warehouses" element={<WarehousePage canCreate canUpdate canDelete />} />
          <Route path="/codes" element={<CodesPage canCreate canUpdate canDelete canCreateDetail canUpdateDetail canDeleteDetail />} />
          <Route path="/roles" element={<RolesPage canCreate canUpdate canDelete />} />
          <Route path="/users" element={<UsersPage canCreate canUpdate canDelete />} />
          <Route path="/settings" element={<SettingsPage canCreate canUpdate canDelete canCreateDetail canUpdateDetail canDeleteDetail />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
