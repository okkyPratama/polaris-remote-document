import { fetcher, type ApiError } from '@polaris/service'
import type {
  Location,
  LocationBulkItem,
  LocationBulkRowError,
  LocationBulkSaveResponse,
  LocationFormData,
  LocationSearchParams,
} from '../types/spatial.types'
import { parseLocationStatus, parseLocationType } from './spatial-api.parsers'

function mapApiLocation(raw: Record<string, unknown>): Location {
  const nameRaw = raw.name
  const name =
    typeof nameRaw === 'string' && nameRaw.trim().length > 0 ? nameRaw : null

  return {
    id: raw.id as string,
    warehouseId: (raw.warehouseId as string) || '',
    zoneId: (raw.zoneId as string) || '',
    zoneCode: (raw.zoneCode as string) || undefined,
    zoneName: (raw.zoneName as string) || undefined,
    code: raw.code as string,
    name,
    locationType: parseLocationType(raw.locationType),
    sequence: typeof raw.sequence === 'number' ? raw.sequence : Number(raw.sequence) || 0,
    maxLpnCount: typeof raw.maxLpnCount === 'number' ? raw.maxLpnCount : null,
    maxWeightKg: typeof raw.maxWeightKg === 'number' ? raw.maxWeightKg : null,
    status: parseLocationStatus(raw.status),
    createdBy: (raw.createdBy as string) || undefined,
    createdAt: (raw.createdAt as string) || '',
    updatedBy: (raw.updatedBy as string) || undefined,
    updatedAt: (raw.updatedAt as string) || undefined,
  }
}

/**
 * Map form values to API body.
 * Sends `zoneId`; never sends `warehouseId` (derived from parent Zone).
 * Create sends status ACTIVE; edit omits status so ACTIVE→INACTIVE cannot be smuggled via UI.
 * BLOCKED goes through /locations/block only.
 */
function toMutationBody(payload: LocationFormData, id?: string) {
  const body: Record<string, unknown> = {
    zoneId: payload.zoneId,
    name: payload.name,
    locationType: payload.locationType,
    sequence: payload.sequence,
    maxLpnCount: payload.maxLpnCount,
    maxWeightKg: payload.maxWeightKg,
  }

  if (!id) {
    body.code = payload.code
    body.status = 'ACTIVE'
  } else {
    body.id = id
  }

  return body
}

function toBulkItemBody(item: LocationBulkItem) {
  return {
    zoneId: item.zoneId,
    code: item.code.trim(),
    name: item.name,
    locationType: item.locationType,
    sequence: item.sequence,
    maxLpnCount: item.maxLpnCount,
    maxWeightKg: item.maxWeightKg,
    status: 'ACTIVE',
  }
}

function mapBulkRowError(raw: Record<string, unknown>): LocationBulkRowError {
  const messages = Array.isArray(raw.messages)
    ? raw.messages.filter((m): m is string => typeof m === 'string')
    : []
  return {
    index: typeof raw.index === 'number' ? raw.index : Number(raw.index) || 0,
    code: typeof raw.code === 'string' ? raw.code : undefined,
    messages,
  }
}

function unwrapBulkSavePayload(payload: unknown): LocationBulkSaveResponse | null {
  if (!payload) return null

  let candidate: unknown = payload

  // ResponseContent shape: { data: [ LocationBulkSaveResp ] }
  if (
    candidate &&
    typeof candidate === 'object' &&
    'data' in candidate &&
    Array.isArray((candidate as { data: unknown }).data)
  ) {
    candidate = (candidate as { data: unknown[] }).data[0]
  } else if (Array.isArray(candidate)) {
    candidate = candidate[0]
  }

  if (!candidate || typeof candidate !== 'object') return null

  const raw = candidate as Record<string, unknown>
  const createdCount =
    typeof raw.createdCount === 'number' ? raw.createdCount : Number(raw.createdCount) || 0
  const errors = Array.isArray(raw.errors)
    ? raw.errors
        .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
        .map(mapBulkRowError)
    : []

  return { createdCount, errors }
}

/** Typed extraction of bulk row errors from a rejected ApiError. */
export function extractLocationBulkFailure(error: unknown): {
  message: string
  createdCount: number
  errors: LocationBulkRowError[]
} {
  const apiError = error as ApiError
  const message =
    apiError?.errorMessage?.[0] ||
    apiError?.message ||
    'Bulk location creation failed. No records were created.'

  const bulk = unwrapBulkSavePayload(apiError?.data)
  return {
    message,
    createdCount: bulk?.createdCount ?? 0,
    errors: bulk?.errors ?? [],
  }
}

export const locationApi = {
  getAll: async (
    params?: LocationSearchParams
  ): Promise<{ data: Location[]; total: number }> => {
    const filters: { field: string; operator: string; value: unknown }[] = []

    if (params?.search) {
      filters.push({ field: 'name', operator: 'ilike', value: `%${params.search}%` })
    }

    if (params?.status && params.status !== 'ALL') {
      filters.push({ field: 'status', operator: '=', value: params.status })
    }

    if (params?.zoneId) {
      filters.push({ field: 'zoneId', operator: '=', value: params.zoneId })
    }

    if (params?.locationType && params.locationType !== 'ALL') {
      filters.push({ field: 'locationType', operator: '=', value: params.locationType })
    }

    // Empty sortBy preserves backend default: sequence ASC, code ASC.
    const body = {
      filters: { and: filters },
      paging: {
        page: params?.page || 1,
        pageSize: params?.pageSize || 25,
        sortBy: '',
        sortDir: '',
      },
    }

    const res = await fetcher.post<{
      data: Record<string, unknown>[]
      paging?: { totalItems?: number; count?: number }
    }>('/master-data/locations/getAll', body)

    const data = (res.data?.data || []).map(mapApiLocation)
    const total = res.data?.paging?.totalItems ?? res.data?.paging?.count ?? data.length

    return { data, total }
  },

  getById: async (id: string): Promise<Location> => {
    const res = await fetcher.post<{ data: Record<string, unknown>[] }>(
      '/master-data/locations/detailById',
      { id }
    )
    const raw = res.data?.data?.[0]
    if (!raw) throw new Error('Location not found')
    return mapApiLocation(raw)
  },

  create: async (payload: LocationFormData): Promise<string> => {
    const res = await fetcher.post('/master-data/locations/save', toMutationBody(payload))
    return res.externalDesc || ''
  },

  update: async (id: string, payload: LocationFormData): Promise<string> => {
    const res = await fetcher.post(
      '/master-data/locations/edit',
      toMutationBody(payload, id)
    )
    return res.externalDesc || ''
  },

  delete: async (id: string): Promise<string> => {
    const res = await fetcher.post('/master-data/locations/delete', { id })
    return res.externalDesc || ''
  },

  bulkCreate: async (items: LocationBulkItem[]): Promise<LocationBulkSaveResponse> => {
    const res = await fetcher.post<{ data: Record<string, unknown>[] }>(
      '/master-data/locations/bulkSave',
      { items: items.map(toBulkItemBody) }
    )
    const raw = res.data?.data?.[0]
    return unwrapBulkSavePayload(raw) ?? { createdCount: 0, errors: [] }
  },
}
