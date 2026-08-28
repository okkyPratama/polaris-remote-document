import { fetcher } from '@polaris/service'
import type {
  CarrierServiceType,
  CarrierServiceTypeFormData,
  CarrierServiceTypeSearchParams,
  CarrierServiceTypeStatus,
  TransportMode,
} from '../types/carrierServiceType.types'

function mapApiServiceType(raw: Record<string, unknown>): CarrierServiceType {
  return {
    id: (raw.id as string) || '',
    businessPartyId: (raw.businessPartyId as string) || (raw.carrierId as string) || '',
    carrierName: (raw.carrierName as string) || (raw.businessPartyName as string) || '',
    carrierCode: (raw.carrierCode as string) || (raw.businessPartyCode as string) || '',
    serviceCode: (raw.serviceCode as string) || '',
    serviceName: (raw.serviceName as string) || '',
    transportMode: (raw.transportMode as TransportMode) || null,
    transitTimeMinDays: raw.transitTimeMinDays != null ? Number(raw.transitTimeMinDays) : null,
    transitTimeMaxDays: raw.transitTimeMaxDays != null ? Number(raw.transitTimeMaxDays) : null,
    slaDays: raw.slaDays != null ? Number(raw.slaDays) : null,
    notes: (raw.notes as string) || '',
    status: ((raw.status as string) === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE') as CarrierServiceTypeStatus,
    createdBy: (raw.createdBy as string) || undefined,
    createdAt: (raw.createdAt as string) || '',
    updatedBy: (raw.updatedBy as string) || undefined,
    updatedAt: (raw.updatedAt as string) || undefined,
  }
}

export const carrierServiceTypeApi = {
  getAll: async (params?: CarrierServiceTypeSearchParams): Promise<{ data: CarrierServiceType[]; total: number }> => {
    const filters: { field: string; operator: string; value: unknown }[] = []

    if (params?.search) {
      filters.push({ field: 'serviceName', operator: 'ilike', value: `%${params.search}%` })
    }
    if (params?.carrierId) {
      filters.push({ field: 'carrierId', operator: '=', value: params.carrierId })
    }
    if (params?.status && params.status !== 'ALL') {
      filters.push({ field: 'status', operator: '=', value: params.status })
    }

    const body = {
      filters: filters.length > 0 ? { and: filters } : {},
      paging: {
        page: params?.page || 1,
        pageSize: params?.pageSize || 25,
        sortBy: 'created_at',
        sortDir: 'DESC',
      },
    }

    const res = await fetcher.post<{
      data: Record<string, unknown>[]
      paging?: { totalItems?: number; count?: number }
    }>('/master-data/carrier-service-types/getAll', body)

    const data = (res.data?.data || []).map(mapApiServiceType)
    const total = res.data?.paging?.totalItems ?? res.data?.paging?.count ?? data.length

    return { data, total }
  },

  getById: async (id: string): Promise<CarrierServiceType> => {
    const res = await fetcher.post<{ data: Record<string, unknown>[] }>(
      '/master-data/carrier-service-types/detailById',
      { id }
    )
    const raw = res.data?.data?.[0]
    if (!raw) throw new Error('Data tipe layanan tidak ditemukan')
    return mapApiServiceType(raw)
  },

  create: async (payload: CarrierServiceTypeFormData): Promise<string> => {
    const body = {
      carrierId: payload.businessPartyId,
      serviceCode: payload.serviceCode.toUpperCase(),
      serviceName: payload.serviceName,
      transportMode: payload.transportMode || null,
      transitTimeMinDays: payload.transitTimeMinDays ? Number(payload.transitTimeMinDays) : null,
      transitTimeMaxDays: payload.transitTimeMaxDays ? Number(payload.transitTimeMaxDays) : null,
      slaDays: payload.slaDays ? Number(payload.slaDays) : null,
      notes: payload.notes || '',
    }
    const res = await fetcher.post('/master-data/carrier-service-types/save', body)
    return res.externalDesc || ''
  },

  update: async (id: string, payload: CarrierServiceTypeFormData): Promise<string> => {
    const body = {
      id,
      serviceName: payload.serviceName,
      transportMode: payload.transportMode || null,
      transitTimeMinDays: payload.transitTimeMinDays ? Number(payload.transitTimeMinDays) : null,
      transitTimeMaxDays: payload.transitTimeMaxDays ? Number(payload.transitTimeMaxDays) : null,
      slaDays: payload.slaDays ? Number(payload.slaDays) : null,
      notes: payload.notes || '',
    }
    const res = await fetcher.post('/master-data/carrier-service-types/edit', body)
    return res.externalDesc || ''
  },

  deactivate: async (id: string): Promise<string> => {
    const res = await fetcher.post('/master-data/carrier-service-types/deactivate', { id })
    return res.externalDesc || ''
  },
}
