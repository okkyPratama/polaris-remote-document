import { fetcher } from '@polaris/service'
import type { Code, CodeDetail } from '../types/code.types'

export type { Code, CodeDetail } from '../types/code.types'

function mapApiCodeDetail(raw: Record<string, unknown>): CodeDetail {
  return {
    id: raw.id as string,
    codeId: (raw.codeId as string) || '',
    codeName: (raw.codeName as string) || '',
    sequence: (raw.sequence as number) || 0,
    ownerId: (raw.ownerId as string) || '',
    warehouseId: (raw.warehouseId as string) || '',
    ownerName: (raw.ownerName as string) || '',
    warehouseName: (raw.warehouseName as string) || '',
    status: (raw.status as string) === 'ACTIVE' ? 'AKTIF' : 'NONAKTIF',
    createdBy: raw.createdBy as string | undefined,
    createdAt: raw.createdAt as string | undefined,
    updatedBy: raw.updatedBy as string | undefined,
    updatedAt: raw.updatedAt as string | undefined,
  }
}

function mapApiCode(raw: Record<string, unknown>): Code {
  const rawDetails = raw.details as Record<string, unknown>[] | undefined
  const details: CodeDetail[] | undefined = rawDetails?.map(mapApiCodeDetail)

  return {
    id: raw.id as string,
    typeCode: (raw.typeCode as string) || '',
    typeCodeDescription: (raw.typeCodeDescription as string) || '',
    isSystem: (raw.isSystem as boolean) || false,
    status: (raw.status as string) === 'ACTIVE' ? 'AKTIF' : 'NONAKTIF',
    detailCount: (raw.detailCount as number) || 0,
    details,
    createdBy: raw.createdBy as string | undefined,
    createdAt: raw.createdAt as string | undefined,
    updatedBy: raw.updatedBy as string | undefined,
    updatedAt: raw.updatedAt as string | undefined,
  }
}

export const codesApi = {
  getAll: async (params?: {
    search?: string
    status?: 'ALL' | 'AKTIF' | 'NONAKTIF'
    page?: number
    pageSize?: number
    sortBy?: string
    sortDir?: 'ASC' | 'DESC'
  }): Promise<{ data: Code[]; total: number }> => {
    const filters: { field: string; operator: string; value: unknown }[] = []

    if (params?.search) {
      filters.push({ field: 'typeCode', operator: 'ilike', value: `%${params.search}%` })
    }
    if (params?.status && params.status !== 'ALL') {
      filters.push({ field: 'status', operator: '=', value: params.status === 'AKTIF' ? 'ACTIVE' : 'INACTIVE' })
    }

    const body = {
      filters: { and: filters },
      paging: {
        page: params?.page || 1,
        pageSize: params?.pageSize || 25,
        sortBy: params?.sortBy || 'typeCode',
        sortDir: params?.sortDir || 'ASC',
      },
    }

    const res = await fetcher.post<{
      data: Record<string, unknown>[]
      paging?: { totalItems?: number; count?: number }
    }>('/master-data/codes/getAll', body)

    const data = (res.data?.data || []).map(mapApiCode)
    const total = res.data?.paging?.totalItems ?? res.data?.paging?.count ?? data.length
    return { data, total }
  },

  getById: async (id: string): Promise<Code | undefined> => {
    const body = { id }
    const res = await fetcher.post<{ data: Record<string, unknown>[] }>(
      '/master-data/codes/detailById',
      body
    )
    const raw = res.data?.data?.[0]
    if (!raw) return undefined
    return mapApiCode(raw)
  },

  // ─── Code Header CRUD ───

  create: async (payload: { typeCode: string; typeCodeDescription: string; status?: string }): Promise<string> => {
    const body = {
      typeCode: payload.typeCode,
      typeCodeDescription: payload.typeCodeDescription,
      status: payload.status === 'NONAKTIF' ? 'INACTIVE' : 'ACTIVE',
    }
    const res = await fetcher.post('/master-data/codes/save', body)
    return res.externalDesc || ''
  },

  update: async (id: string, payload: { typeCodeDescription?: string; status?: string }): Promise<string> => {
    const body = {
      id,
      typeCodeDescription: payload.typeCodeDescription,
      status: payload.status === 'NONAKTIF' ? 'INACTIVE' : 'ACTIVE',
    }
    const res = await fetcher.post('/master-data/codes/edit', body)
    return res.externalDesc || ''
  },

  delete: async (id: string): Promise<string> => {
    const res = await fetcher.post('/master-data/codes/delete', { id })
    return res.externalDesc || ''
  },

  // ─── Code Detail CRUD ───

  createDetail: async (payload: { typeCodeId: string; codeDetailId: string; codeName: string; sequence?: number; status?: string; ownerId?: string | null; warehouseId?: string | null }): Promise<string> => {
    const body = {
      typeCodeId: payload.typeCodeId,
      codeId: payload.codeDetailId,
      codeName: payload.codeName,
      sequence: payload.sequence || 0,
      ownerId: payload.ownerId ?? '',
      warehouseId: payload.warehouseId ?? '',
      status: payload.status === 'NONAKTIF' ? 'INACTIVE' : 'ACTIVE',
    }
    const res = await fetcher.post('/master-data/codes/detail/save', body)
    return res.externalDesc || ''
  },

  updateDetail: async (id: string, payload: { codeDetailId?: string; codeName?: string; sequence?: number; status?: string; ownerId?: string | null; warehouseId?: string | null }): Promise<string> => {
    const body = {
      id,
      codeId: payload.codeDetailId,
      codeName: payload.codeName,
      sequence: payload.sequence,
      ownerId: payload.ownerId ?? '',
      warehouseId: payload.warehouseId ?? '',
      status: payload.status === 'NONAKTIF' ? 'INACTIVE' : 'ACTIVE',
    }
    const res = await fetcher.post('/master-data/codes/detail/edit', body)
    return res.externalDesc || ''
  },

  deleteDetail: async (id: string): Promise<string> => {
    const res = await fetcher.post('/master-data/codes/detail/delete', { id })
    return res.externalDesc || ''
  },

  /** Lookup code details by typeCode with ownerId and warehouseId */
  lookup: async (typeCode: string, ownerId: string, warehouseId: string): Promise<CodeDetail[]> => {
    const body = { typeCode, ownerId, warehouseId }
    const res = await fetcher.post<{ data: Record<string, unknown>[] }>(
      '/master-data/codes/lookup',
      body
    )
    return (res.data?.data || []).map(mapApiCodeDetail)
  },
}
