import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryProvider } from '@polaris/service'
import { AuthProvider } from '@/contexts/AuthProvider'
import { AuthLayout, DefaultLayout } from '@/components/MainLayout'
import { RequirePermission } from '@/components/RequirePermission'
import {
  PERMISSION_COMPANY_GROUP_VIEW,
  PERMISSION_COMPANY_VIEW,
  PERMISSION_ROLE_VIEW,
  PERMISSION_WAREHOUSE_VIEW,
  PERMISSION_ZONE_GROUP_VIEW,
  PERMISSION_ZONE_VIEW,
  PERMISSION_LOCATION_VIEW,
  PERMISSION_USER_VIEW,
  PERMISSION_CODE_VIEW,
  PERMISSION_CONFIG_VIEW,
  PERMISSION_UOM_VIEW,
  PERMISSION_BUSINESS_PARTY_VIEW,
  PERMISSION_PRODUCT_VIEW,
  PERMISSION_DOCUMENT_VIEW,
} from '@polaris/config'
import { Login, KeycloakCallback, Landing, NotFound, SelectContextSearch, CompanyGroups, Companies, Roles, Users, Warehouses, Codes, ZoneGroups, Zones, Locations, Settings, Uom, Partners, Customers, Suppliers, Consignees, Carriers, CarrierServiceTypes, Products, DocumentTemplates, DocumentTemplateEditor } from '@/views'

export default function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route element={<AuthLayout />}>
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/callback" element={<KeycloakCallback />} />
            </Route>

            {/* Context selection */}
            <Route path="/select-context" element={<SelectContextSearch />} />

            {/* Protected routes */}
            <Route element={<DefaultLayout />}>
              <Route path="/" element={<Landing />} />
              <Route path="/company-groups" element={<RequirePermission permission={PERMISSION_COMPANY_GROUP_VIEW}><CompanyGroups /></RequirePermission>} />
              <Route path="/companies" element={<RequirePermission permission={PERMISSION_COMPANY_VIEW}><Companies /></RequirePermission>} />
              <Route path="/roles" element={<RequirePermission permission={PERMISSION_ROLE_VIEW}><Roles /></RequirePermission>} />
              <Route path="/warehouses" element={<RequirePermission permission={PERMISSION_WAREHOUSE_VIEW}><Warehouses /></RequirePermission>} />
              <Route path="/zone-groups" element={<RequirePermission permission={PERMISSION_ZONE_GROUP_VIEW}><ZoneGroups /></RequirePermission>} />
              <Route path="/zones" element={<RequirePermission permission={PERMISSION_ZONE_VIEW}><Zones /></RequirePermission>} />
              <Route path="/locations" element={<RequirePermission permission={PERMISSION_LOCATION_VIEW}><Locations /></RequirePermission>} />
              <Route path="/users" element={<RequirePermission permission={PERMISSION_USER_VIEW}><Users /></RequirePermission>} />
              <Route path="/codes" element={<RequirePermission permission={PERMISSION_CODE_VIEW}><Codes /></RequirePermission>} />
              <Route path="/settings" element={<RequirePermission permission={PERMISSION_CONFIG_VIEW}><Settings /></RequirePermission>} />
              <Route
                path="/uom"
                element={
                  <RequirePermission permission={PERMISSION_UOM_VIEW}>
                    <Uom />
                  </RequirePermission>
                }
              />
              <Route path="/products" element={<RequirePermission permission={PERMISSION_PRODUCT_VIEW}><Products /></RequirePermission>} />
              <Route path="/business-parties" element={<RequirePermission permission={PERMISSION_BUSINESS_PARTY_VIEW}><Partners /></RequirePermission>} />
              <Route path="/business-parties/customers" element={<RequirePermission permission={PERMISSION_BUSINESS_PARTY_VIEW}><Customers /></RequirePermission>} />
              <Route path="/business-parties/suppliers" element={<RequirePermission permission={PERMISSION_BUSINESS_PARTY_VIEW}><Suppliers /></RequirePermission>} />
              <Route path="/business-parties/consignees" element={<RequirePermission permission={PERMISSION_BUSINESS_PARTY_VIEW}><Consignees /></RequirePermission>} />
              <Route path="/business-parties/carriers" element={<RequirePermission permission={PERMISSION_BUSINESS_PARTY_VIEW}><Carriers /></RequirePermission>} />
              <Route path="/business-parties/carrier-service-types" element={<RequirePermission permission={PERMISSION_BUSINESS_PARTY_VIEW}><CarrierServiceTypes /></RequirePermission>} />

              <Route path="/partners" element={<Navigate to="/business-parties" replace />} />
              <Route path="/customers" element={<Navigate to="/business-parties/customers" replace />} />
              <Route path="/suppliers" element={<Navigate to="/business-parties/suppliers" replace />} />
              <Route path="/consignees" element={<Navigate to="/business-parties/consignees" replace />} />
              <Route path="/carriers" element={<Navigate to="/business-parties/carriers" replace />} />

              {/* Document */}
              <Route path="/documents/templates" element={<RequirePermission permission={PERMISSION_DOCUMENT_VIEW}><DocumentTemplates /></RequirePermission>} />
              <Route path="/documents/template-editor/:id?" element={<RequirePermission permission={PERMISSION_DOCUMENT_VIEW}><DocumentTemplateEditor /></RequirePermission>} />

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryProvider>
  )
}
