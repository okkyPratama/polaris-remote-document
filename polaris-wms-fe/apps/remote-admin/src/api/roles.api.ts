import { fetcher } from '@polaris/service'
import type { Role, RoleFormData } from '../types/role.types'

/** Mapping response API ke format Role FE */
function mapApiRole(raw: Record<string, unknown>): Role {
  const isSystem = raw.isSystem as boolean
  return {
    id: raw.id as string,
    code: raw.code as string,
    name: raw.name as string,
    description: (raw.description as string) || '',
    isSystem,
    status: (raw.status as string) === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
    scopes: (raw.scopes as Role['scopes']) || [],
    permissionCount: (raw.permissionCount as number) || 0,
    createdBy: raw.createdBy as string,
    createdAt: raw.createdAt as string,
    updatedBy: raw.updatedBy as string,
    updatedAt: raw.updatedAt as string,
    type: isSystem ? 'SYSTEM' : 'CUSTOM',
    userCount: (raw.userCount as number) || 0,
    permissions: ((raw.permissions as Record<string, unknown>[]) || []).map((p) => ({
      id: p.id as string,
      key: p.key as string,
      resource: p.resource as string,
      action: p.action as string,
      module: (p.module as string) || (p.resource as string),
      description: (p.description as string) || `${p.resource}:${p.action}`,
    })),
  }
}

export const rolesApi = {
  /** Daftar role dengan paginasi & filter */
  getAll: async (params?: { search?: string; type?: string; page?: number; pageSize?: number }): Promise<{ data: Role[]; total: number }> => {
    const filters: { field: string; operator: string; value: unknown }[] = [
      { field: 'status', operator: '=', value: 'ACTIVE' },
    ]

    if (params?.search) {
      filters.push({ field: 'name', operator: 'ilike', value: `%${params.search}%` })
    }

    if (params?.type && params.type !== 'ALL') {
      filters.push({ field: 'is_system', operator: '=', value: params.type === 'SYSTEM' })
    }

    const body = {
      filters: { and: filters },
      paging: {
        page: params?.page || 1,
        pageSize: params?.pageSize || 25,
        sortBy: 'created_at',
        sortDir: 'DESC',
      },
    }
    const res = await fetcher.post<{ data: Record<string, unknown>[]; paging: { count: number; totalItems: number } }>('/admin/roles/getAll', body)

    const roles = (res.data?.data || []).map(mapApiRole)
    const total = res.data?.paging?.totalItems || res.data?.paging?.count || roles.length

    return { data: roles, total }
  },

  /** Ambil detail role berdasarkan ID */
  getById: async (id: string): Promise<Role | undefined> => {
    const body = { id }
    const res = await fetcher.post<{ data: Record<string, unknown>[] }>('/admin/roles/detailById', body)
    const raw = res.data?.data?.[0]
    if (!raw) return undefined
    const mapped = mapApiRole(raw)
    return mapped
  },

  /** Buat role kustom */
  create: async (payload: RoleFormData): Promise<string> => {
    const body = {
      code: payload.code,
      name: payload.name,
      description: payload.description ?? '',
      scopes: (payload.warehouseIds || []).map((warehouseId) => ({
        companyId: null,
        warehouseId,
      })),
      permissionIds: payload.permissionIds,
    }
    const res = await fetcher.post('/admin/roles/save', body)
    return res.externalDesc || ''
  },

  /** Edit role kustom */
  update: async (id: string, payload: RoleFormData): Promise<string> => {
    const body = {
      id,
      name: payload.name,
      description: payload.description ?? '',
      scopes: (payload.warehouseIds || []).map((warehouseId) => ({
        companyId: null,
        warehouseId,
      })),
      permissionIds: payload.permissionIds,
    }
    const res = await fetcher.post('/admin/roles/edit', body)
    return res.externalDesc || ''
  },

  /** Hapus (soft delete) role kustom */
  delete: async (id: string): Promise<string> => {
    const body = { id }
    const res = await fetcher.post('/admin/roles/delete', body)
    return res.externalDesc || ''
  },
}
