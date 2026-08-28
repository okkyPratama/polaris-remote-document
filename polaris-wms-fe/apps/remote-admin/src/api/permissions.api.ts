import { fetcher } from '@polaris/service'
import type { PermissionDomain, PermissionItem } from '../types/role.types'

/** Kelompokkan flat permission list ke PermissionDomain[] by module */
function groupPermissionsByModule(items: PermissionItem[]): PermissionDomain[] {
  const map = new Map<string, PermissionItem[]>()
  for (const p of items) {
    const key = p.module || p.resource || 'other'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(p)
  }
  return Array.from(map.entries()).map(([domain, permissions]) => ({
    domain,
    label: domain.charAt(0).toUpperCase() + domain.slice(1),
    permissions,
  }))
}

export const permissionsApi = {
  /** Ambil semua permission dari API, dikelompokkan per module */
  getAll: async (params?: { module?: string; page?: number; pageSize?: number }): Promise<PermissionDomain[]> => {
    const filters: { field: string; operator: string; value: unknown }[] = []

    if (params?.module) {
      filters.push({ field: 'module', operator: '=', value: params.module })
    }

    const body = {
      filters: filters.length > 0 ? { and: filters } : {},
      paging: {
        page: params?.page || 1,
        pageSize: params?.pageSize || 200,
        sortBy: 'resource',
        sortDir: 'ASC',
      },
    }
    const res = await fetcher.post<{ data: Record<string, unknown>[] }>('/admin/permissions/getAll', body)

    const items: PermissionItem[] = (res.data?.data || []).map((raw) => ({
      id: raw.id as string,
      key: raw.key as string,
      resource: raw.resource as string,
      action: raw.action as string,
      module: (raw.module as string) || (raw.resource as string),
      description: (raw.description as string) || `${raw.resource}:${raw.action}`,
    }))

    return groupPermissionsByModule(items)
  },
}
