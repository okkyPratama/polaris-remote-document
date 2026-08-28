import { fetcher } from '@polaris/service'
import type { SpatialOption, Zone, ZoneFormData, ZoneSearchParams } from '../types/spatial.types'
import { mapSpatialOptions, parseSpatialStatus, parseZoneActivities } from './spatial-api.parsers'

function mapApiZone(raw: Record<string, unknown>): Zone {
  return {
    id: raw.id as string,
    warehouseId: (raw.warehouseId as string) || '',
    zoneGroupId: (raw.zoneGroupId as string) || '',
    zoneGroupCode: (raw.zoneGroupCode as string) || undefined,
    zoneGroupName: (raw.zoneGroupName as string) || undefined,
    code: raw.code as string,
    name: raw.name as string,
    allowedActivities: parseZoneActivities(raw.allowedActivities),
    status: parseSpatialStatus(raw.status, 'Zone'),
    createdBy: (raw.createdBy as string) || undefined,
    createdAt: (raw.createdAt as string) || '',
    updatedBy: (raw.updatedBy as string) || undefined,
    updatedAt: (raw.updatedAt as string) || undefined,
  }
}

/**
 * Map form values to API body.
 * Sends `zoneGroupId`; never sends `warehouseId` (derived from parent Zone Group).
 */
function toMutationBody(payload: ZoneFormData, id?: string) {
  const body: Record<string, unknown> = {
    zoneGroupId: payload.zoneGroupId,
    name: payload.name,
    allowedActivities: payload.allowedActivities,
    status: payload.status,
  }

  if (!id) {
    body.code = payload.code
  } else {
    body.id = id
  }

  return body
}

export const zoneApi = {
  getAll: async (params?: ZoneSearchParams): Promise<{ data: Zone[]; total: number }> => {
    const filters: { field: string; operator: string; value: unknown }[] = []

    if (params?.search) {
      filters.push({ field: 'name', operator: 'ilike', value: `%${params.search}%` })
    }

    if (params?.status && params.status !== 'ALL') {
      filters.push({ field: 'status', operator: '=', value: params.status })
    }

    if (params?.zoneGroupId) {
      filters.push({ field: 'zoneGroupId', operator: '=', value: params.zoneGroupId })
    }

    const body = {
      filters: { and: filters },
      paging: {
        page: params?.page || 1,
        pageSize: params?.pageSize || 25,
        sortBy: 'createdAt',
        sortDir: 'DESC',
      },
    }

    const res = await fetcher.post<{
      data: Record<string, unknown>[]
      paging?: { totalItems?: number; count?: number }
    }>('/master-data/zones/getAll', body)

    const data = (res.data?.data || []).map(mapApiZone)
    const total = res.data?.paging?.totalItems ?? res.data?.paging?.count ?? data.length

    return { data, total }
  },

  /**
   * ACTIVE compact options. Omit zoneGroupId for warehouse-wide Location dropdowns.
   * Pass zoneGroupId for parent-scoped Zone Rules / cascade.
   */
  getOptions: async (zoneGroupId?: string): Promise<SpatialOption[]> => {
    const scopedId = zoneGroupId?.trim()
    const body = scopedId ? { zoneGroupId: scopedId } : {}
    const res = await fetcher.post<{ data: unknown[] }>('/master-data/zones/options', body)
    return mapSpatialOptions(res.data?.data)
  },

  getById: async (id: string): Promise<Zone> => {
    const res = await fetcher.post<{ data: Record<string, unknown>[] }>(
      '/master-data/zones/detailById',
      { id }
    )
    const raw = res.data?.data?.[0]
    if (!raw) throw new Error('Zone not found')
    return mapApiZone(raw)
  },

  create: async (payload: ZoneFormData): Promise<string> => {
    const res = await fetcher.post('/master-data/zones/save', toMutationBody(payload))
    return res.externalDesc || ''
  },

  update: async (id: string, payload: ZoneFormData): Promise<string> => {
    const res = await fetcher.post('/master-data/zones/edit', toMutationBody(payload, id))
    return res.externalDesc || ''
  },

  delete: async (id: string): Promise<string> => {
    const res = await fetcher.post('/master-data/zones/delete', { id })
    return res.externalDesc || ''
  },
}
