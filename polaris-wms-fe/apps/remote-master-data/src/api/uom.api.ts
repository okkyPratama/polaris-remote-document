import { fetcher } from '@polaris/service'
import type {
  UomConvertRequest,
  UomConvertResult,
  UomDisplayRequest,
  UomDisplayResult,
  UomHierarchy,
  UomHierarchyFormData,
  UomLevel,
  UomLevelFormData,
  UomSearchParams,
  UomStatus,
} from '../types/uom.types'

function mapApiUomLevel(raw: Record<string, unknown>): UomLevel {
  const status: UomStatus = (raw.status as string) === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
  const factorToParent = raw.conversionFactorToParent

  return {
    id: (raw.id as string) || '',
    uomCode: (raw.uomCode as string) || '',
    displayName: (raw.displayName as string) || '',
    level: typeof raw.level === 'number' ? raw.level : Number(raw.level) || 0,
    conversionFactorToEa:
      typeof raw.conversionFactorToEa === 'number'
        ? raw.conversionFactorToEa
        : Number(raw.conversionFactorToEa) || 0,
    // Preserve API null (EA); never coerce to 0 or invent a value.
    conversionFactorToParent:
      factorToParent === null || factorToParent === undefined
        ? null
        : typeof factorToParent === 'number'
          ? factorToParent
          : Number(factorToParent),
    parentUomCode:
      raw.parentUomCode === null || raw.parentUomCode === undefined
        ? null
        : (raw.parentUomCode as string),
    status,
  }
}

function mapApiUomHierarchy(raw: Record<string, unknown>): UomHierarchy {
  const status: UomStatus = (raw.status as string) === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
  const rawLevels = Array.isArray(raw.levels) ? (raw.levels as Record<string, unknown>[]) : []
  const levels = rawLevels
    .map(mapApiUomLevel)
    .sort((left, right) => left.level - right.level)

  return {
    id: (raw.id as string) || '',
    ownerId: (raw.ownerId as string) || '',
    skuCode: (raw.skuCode as string) || '',
    status,
    levels,
    createdBy: (raw.createdBy as string) || undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : undefined,
    updatedBy: (raw.updatedBy as string) || undefined,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
  }
}

function mapApiConvertResult(raw: Record<string, unknown>): UomConvertResult {
  return {
    quantityEa: typeof raw.quantityEa === 'number' ? raw.quantityEa : Number(raw.quantityEa) || 0,
    fromQuantity:
      typeof raw.fromQuantity === 'number' ? raw.fromQuantity : Number(raw.fromQuantity) || 0,
    fromUomCode: (raw.fromUomCode as string) || '',
    fromDisplayName: (raw.fromDisplayName as string) || '',
    display: (raw.display as string) || '',
  }
}

function mapApiDisplayResult(raw: Record<string, unknown>): UomDisplayResult {
  return {
    quantityEa: typeof raw.quantityEa === 'number' ? raw.quantityEa : Number(raw.quantityEa) || 0,
    displayQuantity:
      typeof raw.displayQuantity === 'number'
        ? raw.displayQuantity
        : Number(raw.displayQuantity) || 0,
    displayUomCode: (raw.displayUomCode as string) || '',
    displayName: (raw.displayName as string) || '',
    display: (raw.display as string) || '',
  }
}

/** Map form level → API body. Omits empty id; never sends conversionFactorToParent. */
function toLevelBody(level: UomLevelFormData): Record<string, unknown> {
  const body: Record<string, unknown> = {
    uomCode: level.uomCode,
    displayName: level.displayName,
    level: level.level,
    conversionFactorToEa: level.conversionFactorToEa,
    parentUomCode: level.parentUomCode,
    status: level.status,
  }

  const id = level.id?.trim()
  if (id) {
    body.id = id
  }

  return body
}

/**
 * Map form hierarchy → API body.
 * Sends full levels atomically. Does not send createdBy / updatedBy / deletedBy
 * (backend takes actor from trusted username).
 */
function toMutationBody(payload: UomHierarchyFormData, id?: string): Record<string, unknown> {
  const levels = [...payload.levels]
    .sort((left, right) => left.level - right.level)
    .map(toLevelBody)

  const body: Record<string, unknown> = {
    ownerId: payload.ownerId,
    skuCode: payload.skuCode,
    status: payload.status,
    levels,
  }

  if (id) {
    body.id = id
  }

  return body
}

export const uomApi = {
  getAll: async (
    params?: UomSearchParams
  ): Promise<{ data: UomHierarchy[]; total: number }> => {
    const body = {
      keyword: params?.keyword ?? '',
      ownerId: params?.ownerId ?? '',
      status: params?.status && params.status !== 'ALL' ? params.status : '',
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 25,
    }

    const res = await fetcher.post<{
      data: Record<string, unknown>[]
      paging?: { totalItems?: number; count?: number }
    }>('/master-data/uom/getAll', body)

    const rows = res.data?.data ?? []
    const data = rows.map(mapApiUomHierarchy)
    const total = res.data?.paging?.totalItems ?? res.data?.paging?.count ?? data.length

    return { data, total }
  },

  getById: async (id: string): Promise<UomHierarchy> => {
    const res = await fetcher.post<{ data: Record<string, unknown>[] }>(
      '/master-data/uom/detailById',
      { id }
    )
    const raw = res.data?.data?.[0]
    if (!raw) {
      const err = new Error('UOM hierarchy not found') as Error & { httpCode: number }
      err.httpCode = 404
      throw err
    }
    return mapApiUomHierarchy(raw)
  },

  create: async (payload: UomHierarchyFormData): Promise<string> => {
    const res = await fetcher.post('/master-data/uom/save', toMutationBody(payload))
    return res.externalDesc || ''
  },

  update: async (id: string, payload: UomHierarchyFormData): Promise<string> => {
    const res = await fetcher.post('/master-data/uom/edit', toMutationBody(payload, id))
    return res.externalDesc || ''
  },

  delete: async (id: string): Promise<string> => {
    const res = await fetcher.post('/master-data/uom/delete', { id })
    return res.externalDesc || ''
  },

  convert: async (payload: UomConvertRequest): Promise<UomConvertResult> => {
    const res = await fetcher.post<{ data: Record<string, unknown>[] }>(
      '/master-data/uom/convert',
      {
        ownerId: payload.ownerId,
        skuCode: payload.skuCode,
        quantity: payload.quantity,
        fromUomCode: payload.fromUomCode,
      }
    )
    const raw = res.data?.data?.[0]
    if (!raw) throw new Error('UOM convert result not found')
    return mapApiConvertResult(raw)
  },

  display: async (payload: UomDisplayRequest): Promise<UomDisplayResult> => {
    const res = await fetcher.post<{ data: Record<string, unknown>[] }>(
      '/master-data/uom/display',
      {
        ownerId: payload.ownerId,
        skuCode: payload.skuCode,
        quantityEa: payload.quantityEa,
      }
    )
    const raw = res.data?.data?.[0]
    if (!raw) throw new Error('UOM display result not found')
    return mapApiDisplayResult(raw)
  },
}
