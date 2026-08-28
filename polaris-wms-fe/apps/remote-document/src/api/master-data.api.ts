import { fetcher } from '@polaris/service'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MasterDataOption {
  id: string
  code: string
  name: string
}

// ─── Dev Mode Direct Fetch ────────────────────────────────────────────────────
// In dev mode, bypass the shared fetcher (which has a 401 → redirect interceptor)
// and call the master-data endpoints directly. The Vite proxy injects auth headers.
const isDev = import.meta.env.DEV

async function devFetch<T>(url: string, body: unknown = {}): Promise<T> {
  const res = await fetch(`/api/v1${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    console.warn(`[master-data] ${url} returned ${res.status}. Is VITE_DEV_SESSION_TOKEN set in .env.development?`)
    return [] as unknown as T
  }
  const json = await res.json()
  // Response shape: { httpCode, data: { data: [...] } } or { httpCode, data: [...] }
  return json.data?.data || json.data || []
}

// ─── Headers for master-data-service (production path) ────────────────────────
function getMasterDataHeaders(): Record<string, string> {
  return {
    'user-username': localStorage.getItem('polaris_username') || 'system',
    'X-session-token': localStorage.getItem('session_token') || localStorage.getItem('token') || '',
    appname: 'polaris',
    appversion: '1.0.0',
  }
}

// ─── Master Data API ──────────────────────────────────────────────────────────

export const masterDataApi = {
  /**
   * Get company options — POST /master-data/companies/options
   */
  getCompanyOptions: async (): Promise<MasterDataOption[]> => {
    if (isDev) {
      return devFetch<MasterDataOption[]>('/master-data/companies/options', {})
    }
    const res = await fetcher.post<{ data: MasterDataOption[] }>(
      '/master-data/companies/options',
      {},
      { headers: getMasterDataHeaders() }
    )
    return res.data?.data || (res.data as unknown as MasterDataOption[]) || []
  },

  /**
   * Get warehouse options — POST /master-data/warehouses/options
   */
  getWarehouseOptions: async (): Promise<MasterDataOption[]> => {
    if (isDev) {
      return devFetch<MasterDataOption[]>('/master-data/warehouses/options', {})
    }
    const res = await fetcher.post<{ data: MasterDataOption[] }>(
      '/master-data/warehouses/options',
      {},
      { headers: getMasterDataHeaders() }
    )
    return res.data?.data || (res.data as unknown as MasterDataOption[]) || []
  },

  /**
   * Get owner (business party) options — POST /master-data/business-parties/options
   */
  getOwnerOptions: async (): Promise<MasterDataOption[]> => {
    if (isDev) {
      return devFetch<MasterDataOption[]>('/master-data/business-parties/options', { partyRole: 'OWNER' })
    }
    const res = await fetcher.post<{ data: MasterDataOption[] }>(
      '/master-data/business-parties/options',
      { partyRole: 'OWNER' },
      { headers: getMasterDataHeaders() }
    )
    return res.data?.data || (res.data as unknown as MasterDataOption[]) || []
  },
}
