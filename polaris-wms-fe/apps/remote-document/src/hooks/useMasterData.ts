import { useQuery } from '@tanstack/react-query'
import { masterDataApi, type MasterDataOption } from '../api/master-data.api'
import type { SingleSelectOption } from '@polaris/ui'

// ─── Query Keys ───────────────────────────────────────────────────────────────

const MASTER_DATA_KEYS = {
  companies: ['master-data', 'companies'] as const,
  warehouses: ['master-data', 'warehouses'] as const,
  owners: ['master-data', 'owners'] as const,
}

// ─── Auth / Dev Check ─────────────────────────────────────────────────────────
// In dev mode, always allow fetching — the Vite proxy injects the session token
// via VITE_DEV_SESSION_TOKEN env var. In production, only fetch when token exists.
const isDev = import.meta.env.DEV

function canFetchMasterData(): boolean {
  // Dev mode: always allow — proxy handles auth headers
  if (isDev) return true
  // Production: require a real token in localStorage
  if (typeof window === 'undefined') return false
  return !!(localStorage.getItem('token') || localStorage.getItem('session_token'))
}

// ─── Helper: Convert MasterDataOption → SingleSelectOption ────────────────────

function toSelectOption(item: MasterDataOption): SingleSelectOption {
  return {
    value: item.id,
    label: `${item.code} — ${item.name}`,
    description: item.name,
  }
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Fetches company options from master-data-service.
 * Data is cached and shared across components.
 */
export function useCompanyOptions() {
  return useQuery({
    queryKey: MASTER_DATA_KEYS.companies,
    queryFn: masterDataApi.getCompanyOptions,
    staleTime: 5 * 60 * 1000, // 5 minutes — master data rarely changes
    enabled: canFetchMasterData(),
    retry: isDev ? 0 : 1, // Don't retry in dev to avoid 401 loops
    select: (data) => data.map(toSelectOption),
  })
}

/**
 * Fetches warehouse options from master-data-service.
 */
export function useWarehouseOptions() {
  return useQuery({
    queryKey: MASTER_DATA_KEYS.warehouses,
    queryFn: masterDataApi.getWarehouseOptions,
    staleTime: 5 * 60 * 1000,
    enabled: canFetchMasterData(),
    retry: isDev ? 0 : 1,
    select: (data) => data.map(toSelectOption),
  })
}

/**
 * Fetches owner (business party with role OWNER) options from master-data-service.
 */
export function useOwnerOptions() {
  return useQuery({
    queryKey: MASTER_DATA_KEYS.owners,
    queryFn: masterDataApi.getOwnerOptions,
    staleTime: 5 * 60 * 1000,
    enabled: canFetchMasterData(),
    retry: isDev ? 0 : 1,
    select: (data) => data.map(toSelectOption),
  })
}

/**
 * Convenience: returns an async loader function compatible with SingleSelect's loadOptions prop.
 * Filters the cached options client-side by query string.
 */
export function useCompanyOptionsLoader() {
  const { data: options = [], isLoading } = useCompanyOptions()

  const loadOptions = async (query: string): Promise<SingleSelectOption[]> => {
    if (!query) return options
    const q = query.toLowerCase()
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q)
    )
  }

  return { loadOptions, isLoading, options }
}

export function useWarehouseOptionsLoader() {
  const { data: options = [], isLoading } = useWarehouseOptions()

  const loadOptions = async (query: string): Promise<SingleSelectOption[]> => {
    if (!query) return options
    const q = query.toLowerCase()
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q)
    )
  }

  return { loadOptions, isLoading, options }
}

export function useOwnerOptionsLoader() {
  const { data: options = [], isLoading } = useOwnerOptions()

  const loadOptions = async (query: string): Promise<SingleSelectOption[]> => {
    if (!query) return options
    const q = query.toLowerCase()
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q)
    )
  }

  return { loadOptions, isLoading, options }
}
