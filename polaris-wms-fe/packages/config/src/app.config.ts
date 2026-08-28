// ═══════════════════════════════════════════════════════
// Application Configuration
// ═══════════════════════════════════════════════════════

export const appConfig = {
  api: {
    timeout: 30000,
    retryAttempts: 3,
  },
  auth: {
    tokenKey: 'token',
    refreshTokenKey: 'refresh_token',
    idTokenKey: 'id_token',
    warehouseKey: 'selected_warehouse',
  },
  pagination: {
    defaultPageSize: 10,
    maxPageSize: 200,
    pageSizeOptions: [5, 10, 20, 50, 100, 200],
  },
}
