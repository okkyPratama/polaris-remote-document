import { fetcher } from '@polaris/service'
import type { Warehouse, WarehouseFormData } from '../types/warehouse.types'

/** Map raw API warehouse to FE Warehouse type */
function mapApiWarehouse(raw: Record<string, unknown>): Warehouse {
  const apiStatus = raw.status as string
  const tempZoneStr = (raw.temperatureZone as string) || ''
  const tempZones = tempZoneStr ? tempZoneStr.split(',').map((z) => z.trim()).filter(Boolean) as Warehouse['tempZones'] : []

  return {
    id: raw.id as string,
    code: raw.code as string,
    name: raw.name as string,
    address: (raw.address as string) || '',
    city: (raw.city as string) || '',
    province: (raw.province as string) || '',
    createdAt: (raw.createdAt as string) || '',
    createdBy: (raw.createdBy as string) || '',
    timezone: (raw.timezone as string) || '',
    companyId: raw.companyId as string | undefined,
    companyCode: (raw.companyCode as string) || '',
    companyName: (raw.companyName as string) || '',
    postalCode: (raw.postalCode as string) || undefined,
    countryCode: raw.countryCode as string | undefined,
    latitude: raw.latitude as number | undefined,
    longitude: raw.longitude as number | undefined,
    status: apiStatus === 'ACTIVE' ? 'AKTIF' : 'NONAKTIF',
    activeSince: (raw.createdAt as string) || '',
    capacity: (raw.palletCapacity as number) || 0,
    area: (raw.areaSize as number) || 0,
    pic: (raw.pic as string) || '',
    phone: (raw.phonePic as string) || '',
    tempZones,
  }
}

export const warehouseApi = {
  getById: async (id: string): Promise<Warehouse> => {
    const body = { id }
    const res = await fetcher.post<{ data: Record<string, unknown>[] }>(
      '/master-data/warehouses/detailById',
      body
    )
    const raw = res.data?.data?.[0]
    if (!raw) throw new Error('Warehouse not found')
    return mapApiWarehouse(raw)
  },

  /** Daftar gudang dengan paginasi & filter */
  getAll: async (params?: {
    search?: string
    status?: 'ALL' | 'AKTIF' | 'NONAKTIF'
    page?: number
    pageSize?: number
    companyIdNull?: boolean
  }): Promise<{ data: Warehouse[]; total: number }> => {
    const filters: { field: string; operator: string; value: unknown }[] = []

    if (params?.search) {
      filters.push({ field: 'name', operator: 'ilike', value: `%${params.search}%` })
    }

    if (params?.status && params.status !== 'ALL') {
      const apiStatus = params.status === 'AKTIF' ? 'ACTIVE' : 'INACTIVE'
      filters.push({ field: 'status', operator: '=', value: apiStatus })
    }

    if (params?.companyIdNull) {
      filters.push({ field: 'companyId', operator: 'isnull', value: '' })
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
    const res = await fetcher.post<{
      data: Record<string, unknown>[]
      paging?: { totalItems?: number; count?: number }
    }>('/master-data/warehouses/getAll', body)

    const data = (res.data?.data || []).map(mapApiWarehouse)
    const total = res.data?.paging?.totalItems ?? res.data?.paging?.count ?? data.length

    return { data, total }
  },

  /** Buat gudang baru */
  create: async (payload: WarehouseFormData): Promise<string> => {
    const mappingBody = {
      code: payload.code,
      name: payload.name,
      companyId: payload.companyId,
      address: payload.address,
      city: payload.city,
      province: payload.province,
      postalCode: payload.postalCode,
      palletCapacity: payload.capacity ? Number(payload.capacity) : 0,
      areaSize: payload.area ? Number(payload.area) : 0,
      pic: payload.pic,
      phonePic: payload.phone,
      temperatureZone: (payload.tempZones || []).join(','),
      status: payload.status === 'AKTIF' ? 'ACTIVE' : 'INACTIVE',
    }
    const res = await fetcher.post('/master-data/warehouses/save', mappingBody)
    return res.externalDesc || ''
  },

  /** Update gudang */
  update: async (id: string, payload: WarehouseFormData): Promise<string> => {
    const mappingBody = {
      id,
      name: payload.name,
      address: payload.address,
      city: payload.city,
      province: payload.province,
      postalCode: payload.postalCode,
      palletCapacity: payload.capacity ? Number(payload.capacity) : 0,
      areaSize: payload.area ? Number(payload.area) : 0,
      pic: payload.pic,
      phonePic: payload.phone,
      temperatureZone: (payload.tempZones || []).join(','),
      status: payload.status === 'AKTIF' ? 'ACTIVE' : 'INACTIVE',
    }
    const res = await fetcher.post('/master-data/warehouses/edit', mappingBody)
    return res.externalDesc || ''
  },

  /** Hapus gudang */
  delete: async (id: string): Promise<string> => {
    const body = { id }
    const res = await fetcher.post('/master-data/warehouses/delete', body)
    return res.externalDesc || ''
  },
}
