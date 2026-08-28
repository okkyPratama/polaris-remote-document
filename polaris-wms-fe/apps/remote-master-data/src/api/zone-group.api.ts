import { fetcher } from '@polaris/service'
import type {
  SpatialOption,
  ZoneGroup,
  ZoneGroupFormData,
  ZoneGroupSearchParams,
} from '../types/spatial.types'
import {
  mapSpatialOptions,
  parsePutawayMode,
  parseSpatialStatus,
} from './spatial-api.parsers'

function mapApiZoneGroup(raw: Record<string, unknown>): ZoneGroup {
  return {
    id: raw.id as string,
    warehouseId: (raw.warehouseId as string) || '',
    warehouseCode: (raw.warehouseCode as string) || undefined,
    warehouseName: (raw.warehouseName as string) || undefined,
    code: raw.code as string,
    name: raw.name as string,
    temperatureMin: typeof raw.temperatureMin === 'number' ? raw.temperatureMin : null,
    temperatureMax: typeof raw.temperatureMax === 'number' ? raw.temperatureMax : null,
    handlingRulesJson:
      typeof raw.handlingRulesJson === 'string' ? raw.handlingRulesJson : null,
    defaultPutawayMode: parsePutawayMode(raw.defaultPutawayMode),
    status: parseSpatialStatus(raw.status, 'Zone Group'),
    createdBy: (raw.createdBy as string) || undefined,
    createdAt: (raw.createdAt as string) || '',
    updatedBy: (raw.updatedBy as string) || undefined,
    updatedAt: (raw.updatedAt as string) || undefined,
  }
}

/** Map form values to API body — numbers or null, never empty strings. */
function toMutationBody(payload: ZoneGroupFormData, id?: string) {
  const body: Record<string, unknown> = {
    name: payload.name,
    temperatureMin: payload.temperatureMin ?? null,
    temperatureMax: payload.temperatureMax ?? null,
    handlingRulesJson: payload.handlingRulesJson ?? null,
    defaultPutawayMode: payload.defaultPutawayMode,
    status: payload.status,
  }

  if (!id) {
    body.code = payload.code
  } else {
    body.id = id
  }

  // Do not send warehouseId — trusted scope comes from the shared fetcher.
  return body
}

export const zoneGroupApi = {
  getAll: async (
    params?: ZoneGroupSearchParams
  ): Promise<{ data: ZoneGroup[]; total: number }> => {
    const filters: { field: string; operator: string; value: unknown }[] = []

    if (params?.search) {
      filters.push({ field: 'name', operator: 'ilike', value: `%${params.search}%` })
    }

    if (params?.status && params.status !== 'ALL') {
      filters.push({ field: 'status', operator: '=', value: params.status })
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
    }>('/master-data/zone-groups/getAll', body)

    const data = (res.data?.data || []).map(mapApiZoneGroup)
    const total = res.data?.paging?.totalItems ?? res.data?.paging?.count ?? data.length

    return { data, total }
  },

  /** ACTIVE, unpaginated compact options for Zone dropdown consumers. */
  getOptions: async (): Promise<SpatialOption[]> => {
    const res = await fetcher.post<{ data: unknown[] }>('/master-data/zone-groups/options', {})
    return mapSpatialOptions(res.data?.data)
  },

  getById: async (id: string): Promise<ZoneGroup> => {
    const res = await fetcher.post<{ data: Record<string, unknown>[] }>(
      '/master-data/zone-groups/detailById',
      { id }
    )
    const raw = res.data?.data?.[0]
    if (!raw) throw new Error('Zone Group not found')
    return mapApiZoneGroup(raw)
  },

  create: async (payload: ZoneGroupFormData): Promise<string> => {
    const res = await fetcher.post('/master-data/zone-groups/save', toMutationBody(payload))
    return res.externalDesc || ''
  },

  update: async (id: string, payload: ZoneGroupFormData): Promise<string> => {
    const res = await fetcher.post(
      '/master-data/zone-groups/edit',
      toMutationBody(payload, id)
    )
    return res.externalDesc || ''
  },

  delete: async (id: string): Promise<string> => {
    const res = await fetcher.post('/master-data/zone-groups/delete', { id })
    return res.externalDesc || ''
  },
}
