/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_API_TIMEOUT: string
  readonly VITE_URL_SERVICE_CUSTOMER: string
  readonly VITE_URL_REMOTE_COMPANY: string
  readonly VITE_URL_REMOTE_MASTER_DATA: string
  readonly VITE_KEYCLOAK_URL: string
  readonly VITE_KEYCLOAK_REALM: string
  readonly VITE_KEYCLOAK_CLIENT_ID: string
  readonly VITE_KEYCLOAK_CLIENT_SECRET: string
  readonly APP_ENV: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Module federation remote declarations
declare module 'remote-admin/views/company-groups' {
  const Component: React.ComponentType<{
    canCreate?: boolean
    canUpdate?: boolean
    canDelete?: boolean
  }>
  export default Component
}
declare module 'remote-admin/views/companies' {
  const Component: React.ComponentType<{
    canCreate?: boolean
    canUpdate?: boolean
    canDelete?: boolean
  }>
  export default Component
}
declare module 'remote-master-data/views/business-parties' {
  const Component: React.ComponentType<{
    initialRole?: 'ALL' | 'OWNER' | 'SUPPLIER' | 'CONSIGNEE' | 'CARRIER'
    canCreate?: boolean
    canUpdate?: boolean
    canDelete?: boolean
  }>
  export default Component
}
declare module 'remote-admin/views/warehouse' {
  const Component: React.ComponentType<{
    canCreate?: boolean
    canUpdate?: boolean
    canDelete?: boolean
  }>
  export default Component
}
declare module 'remote-master-data/views/zone-groups' {
  const Component: React.ComponentType<{
    canCreate?: boolean
    canUpdate?: boolean
    canDelete?: boolean
  }>
  export default Component
}
declare module 'remote-master-data/views/zones' {
  const Component: React.ComponentType<{
    canCreate?: boolean
    canUpdate?: boolean
    canDelete?: boolean
  }>
  export default Component
}
declare module 'remote-master-data/views/locations' {
  const Component: React.ComponentType<{
    canCreate?: boolean
    canUpdate?: boolean
    canDelete?: boolean
  }>
  export default Component
}
declare module 'remote-admin/views/roles' {
  const Component: React.ComponentType<{
    canCreate?: boolean
    canUpdate?: boolean
    canDelete?: boolean
  }>
  export default Component
}
declare module 'remote-admin/views/users' {
  const Component: React.ComponentType<{
    canCreate?: boolean
    canUpdate?: boolean
    canDelete?: boolean
  }>
  export default Component
}
declare module 'remote-admin/views/settings' {
  const Component: React.ComponentType<{
    canCreate?: boolean
    canUpdate?: boolean
    canDelete?: boolean
    canCreateDetail?: boolean
    canUpdateDetail?: boolean
    canDeleteDetail?: boolean
  }>
  export default Component
}
declare module 'remote-admin/views/codes' {
  const Component: React.ComponentType<{
    canCreate?: boolean
    canUpdate?: boolean
    canDelete?: boolean
    canCreateDetail?: boolean
    canUpdateDetail?: boolean
    canDeleteDetail?: boolean
  }>
  export default Component
}
declare module 'remote-master-data/views/uom' {
  const Component: React.ComponentType<{
    ownerContextIds?: string[] | null
    canCreate?: boolean
    canUpdate?: boolean
    canDelete?: boolean
  }>
  export default Component
}

declare module 'remote-master-data/views/carrier-service-types' {
  const Component: React.ComponentType<{
    canCreate?: boolean
    canUpdate?: boolean
    canDelete?: boolean
  }>
  export default Component
}

declare module 'remote-master-data/views/products' {
  const Component: React.ComponentType<{
    canCreate?: boolean
    canUpdate?: boolean
    canDelete?: boolean
  }>
  export default Component
}