import { fetcher } from '@polaris/service'
import type { User, UserRole, UserWarehouse, UserOwner, UserFormData } from '../types/user.types'

function mapApiUser(raw: Record<string, unknown>): User {
  const roles: UserRole[] = Array.isArray(raw.roles)
    ? typeof raw.roles[0] === 'string'
      ? (raw.roles as string[]).map((name) => ({ id: '', code: name, name, isSystem: false }))
      : (raw.roles as UserRole[])
    : []

  const warehouses: UserWarehouse[] = Array.isArray(raw.warehouses)
    ? typeof raw.warehouses[0] === 'string'
      ? (raw.warehouses as string[]).map((id) => ({ id, warehouseId: id, warehouseName: id }))
      : (raw.warehouses as UserWarehouse[])
    : []

  const owners: UserOwner[] = Array.isArray(raw.owners) ? (raw.owners as UserOwner[]) : []

  return {
    id: raw.id as string,
    keycloakId: (raw.keycloakId as string) || '',
    username: (raw.username as string) || '',
    email: (raw.email as string) || '',
    fullName: (raw.fullName as string) || '',
    status: (raw.status as string) === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
    isDeleted: (raw.isDeleted as boolean) || false,
    createdBy: (raw.createdBy as string) || '',
    createdAt: (raw.createdAt as string) || '',
    updatedBy: (raw.updatedBy as string) || '',
    updatedAt: (raw.updatedAt as string) || '',
    roles,
    warehouses,
    warehouseCount: (raw.warehouseCount as number) || warehouses.length,
    owners,
    lastLoginAt: (raw.lastLoginAt as string | null) ?? null,
    activeSessions: (raw.activeSessions as number) || 0,
  }
}

export const usersApi = {
  getAll: async (params?: {
    search?: string
    status?: 'ALL' | 'ACTIVE' | 'INACTIVE'
    roleCode?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: User[]; total: number }> => {
    const filters: { field: string; operator: string; value: unknown }[] = []

    if (params?.search) {
      filters.push({ field: 'fullname', operator: 'ilike', value: `%${params.search}%` })
    }

    // if (params?.search) {
    //   filters.push({ field: 'username', operator: 'ilike', value: `%${params.search}%` })
    // }

    if (params?.status && params.status !== 'ALL') {
      filters.push({ field: 'status', operator: '=', value: params.status })
    }

    if (params?.roleCode) {
      filters.push({ field: 'role_code', operator: '=', value: params.roleCode })
    }

    const body = {
      filters: filters.length > 0 ? { and: filters } : {},
      paging: {
        page: params?.page || 1,
        pageSize: params?.pageSize || 25,
        sortBy: 'created_at',
        sortDirection: 'desc',
      },
    }
    const res = await fetcher.post<{
      data: Record<string, unknown>[]
      paging: { count: number; totalItems: number }
    }>('/admin/users/getAll', body)

    const users = (res.data?.data || []).map(mapApiUser)
    const total = res.data?.paging?.totalItems || res.data?.paging?.count || users.length

    return { data: users, total }
  },

  getById: async (id: string): Promise<User | null> => {
    const body = { id }
    const res = await fetcher.post<{ data: Record<string, unknown>[] }>('/admin/users/detailById', body)
    const raw = res.data?.data?.[0]
    if (!raw?.id) return null
    return mapApiUser(raw)
  },

  create: async (payload: UserFormData): Promise<string> => {
    const body = {
      username: payload.username,
      email: payload.email,
      fullName: payload.fullName,
      sendResetEmail: true,
      roleIds: payload.roleIds ?? [],
      warehouseIds: payload.warehouseIds ?? [],
      ownerIds: payload.ownerIds ?? [],
      status: payload.status ?? 'ACTIVE',
    }
    const res = await fetcher.post('/admin/users/save', body)
    return res.externalDesc || ''
  },

  update: async (id: string, payload: UserFormData): Promise<string> => {
    const body = {
      id,
      username: payload.username,
      email: payload.email,
      fullName: payload.fullName,
      roleIds: payload.roleIds ?? [],
      warehouseIds: payload.warehouseIds ?? [],
      ownerIds: payload.ownerIds ?? [],
      status: payload.status ?? 'ACTIVE',
    }
    const res = await fetcher.post('/admin/users/edit', body)
    return res.externalDesc || ''
  },

  deactivate: async (id: string, reason?: string): Promise<{ sessionsInvalidated: number; message: string }> => {
    const body = { id, reason: reason ?? '' }
    const res = await fetcher.post<{ data: { sessionsInvalidated: number }[] }>('/admin/users/deactivate', body)
    return { sessionsInvalidated: res.data?.data?.[0]?.sessionsInvalidated ?? 0, message: res.externalDesc || '' }
  },

  reactivate: async (id: string): Promise<string> => {
    const body = { id }
    const res = await fetcher.post('/admin/users/reactivate', body)
    return res.externalDesc || ''
  },
}
