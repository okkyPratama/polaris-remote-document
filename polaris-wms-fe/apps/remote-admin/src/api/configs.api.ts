import { fetcher } from '@polaris/service'

export interface ConfigHeader {
  id: string
  configKey: string
  configValue: string
  dataType: 'INT' | 'DECIMAL' | 'STRING' | 'BOOLEAN' | 'JSON'
  description?: string
  scope?: string
  category?: string
  configGroup?: string
  typeCode?: string
  status: 'ACTIVE' | 'INACTIVE'
  detailCount: number
  details?: ConfigDetail[]
  createdBy?: string
  createdAt?: string
  updatedBy?: string
  updatedAt?: string
}

export interface ConfigDetail {
  id: string
  configId: string
  configKey?: string
  productId?: string
  productName?: string
  ownerId?: string
  ownerName?: string
  warehouseId?: string
  warehouseName?: string
  companyId?: string
  companyName?: string
  configValue: string
  status?: string
  createdBy?: string
  createdAt?: string
  updatedBy?: string
  updatedAt?: string
}

export interface ConfigResolved {
  configKey: string
  resolvedValue: string
  dataType: string
  resolvedFrom: 'HEADER' | 'PRODUCT' | 'OWNER' | 'WAREHOUSE' | 'COMPANY' | 'CUSTOMER_WAREHOUSE'
  scopeId?: string
  scopeName?: string
}

function mapApiConfigDetail(d: Record<string, unknown>): ConfigDetail {
  return {
    id: d.id as string,
    configId: (d.configId as string) || '',
    configKey: d.configKey as string | undefined,
    productId: d.productId as string | undefined,
    productName: d.productName as string | undefined,
    ownerId: d.ownerId as string | undefined,
    ownerName: d.ownerName as string | undefined,
    warehouseId: d.warehouseId as string | undefined,
    warehouseName: d.warehouseName as string | undefined,
    companyId: d.companyId as string | undefined,
    companyName: d.companyName as string | undefined,
    configValue: (d.configValue as string) || '',
    status: d.status as string | undefined,
    createdBy: d.createdBy as string | undefined,
    createdAt: d.createdAt as string | undefined,
    updatedBy: d.updatedBy as string | undefined,
    updatedAt: d.updatedAt as string | undefined,
  }
}

function mapApiConfigHeader(raw: Record<string, unknown>): ConfigHeader {
  const rawDetails = raw.details as Record<string, unknown>[] | undefined
  const details: ConfigDetail[] | undefined = rawDetails?.map(mapApiConfigDetail)

  return {
    id: raw.id as string,
    configKey: (raw.configKey as string) || '',
    configValue: (raw.configValue as string) || '',
    dataType: (raw.dataType as ConfigHeader['dataType']) || 'STRING',
    description: raw.description as string | undefined,
    scope: raw.scope as string | undefined,
    category: raw.category as string | undefined,
    configGroup: raw.configGroup as string | undefined,
    typeCode: raw.typeCode as string | undefined,
    status: (raw.status as ConfigHeader['status']) || 'ACTIVE',
    detailCount: (raw.detailCount as number) || 0,
    details,
    createdBy: raw.createdBy as string | undefined,
    createdAt: raw.createdAt as string | undefined,
    updatedBy: raw.updatedBy as string | undefined,
    updatedAt: raw.updatedAt as string | undefined,
  }
}

export const configsApi = {
  /** List all config headers with details */
  getAll: async (params?: {
    search?: string
    category?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: ConfigHeader[]; total: number }> => {
    const and: { field: string; operator: string; value: unknown }[] = []

    if (params?.search) {
      and.push({ field: 'configKey', operator: 'ilike', value: `%${params.search}%` })
    }
    if (params?.category) {
      and.push({ field: 'category', operator: '=', value: params.category })
    }

    const body = {
      filters: and.length > 0 ? { and } : {},
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
    }>('/master-data/master-configs/getAll', body)

    const data = (res.data?.data || []).map(mapApiConfigHeader)
    const total = res.data?.paging?.totalItems ?? res.data?.paging?.count ?? data.length
    return { data, total }
  },

  /** Get config header detail by id */
  getById: async (id: string): Promise<ConfigHeader | undefined> => {
    const body = { id }
    const res = await fetcher.post<{ data: Record<string, unknown>[] }>(
      '/master-data/master-configs/detailById',
      body
    )
    const raw = res.data?.data?.[0]
    if (!raw) return undefined
    return mapApiConfigHeader(raw)
  },

  /** Resolve config value for a given context */
  resolve: async (configKey: string, warehouseId?: string, ownerId?: string): Promise<ConfigResolved | undefined> => {
    const body = { configKey, warehouseId, ownerId }
    const res = await fetcher.post<{ data: Record<string, unknown>[] }>(
      '/master-data/master-configs/resolve',
      body
    )
    const raw = res.data?.data?.[0]
    if (!raw) return undefined
    return {
      configKey: (raw.configKey as string) || '',
      resolvedValue: (raw.resolvedValue as string) || '',
      dataType: (raw.dataType as string) || 'STRING',
      resolvedFrom: (raw.resolvedFrom as ConfigResolved['resolvedFrom']) || 'HEADER',
      scopeId: raw.scopeId as string | undefined,
      scopeName: raw.scopeName as string | undefined,
    }
  },

  /** Create config header */
  save: async (payload: {
    configKey: string
    configValue: string
    dataType: string
    description?: string
    category?: string
    configGroup?: string
    typeCode?: string
    scope?: string
  }): Promise<string> => {
    const res = await fetcher.post('/master-data/master-configs/save', payload)
    return res.externalDesc || ''
  },

  /** Update config header */
  edit: async (id: string, payload: {
    configValue?: string
    description?: string
    category?: string
    configGroup?: string
  }): Promise<string> => {
    const res = await fetcher.post('/master-data/master-configs/edit', { id, ...payload })
    return res.externalDesc || ''
  },

  /** Delete config header (soft delete) */
  delete: async (id: string): Promise<string> => {
    const res = await fetcher.post('/master-data/master-configs/delete', { id })
    return res.externalDesc || ''
  },

  /** Add config detail (override) */
  addDetail: async (payload: {
    configId: string
    productId?: string | null
    ownerId?: string | null
    warehouseId?: string | null
    companyId?: string | null
    configValue: string
    status?: string
  }): Promise<string> => {
    const res = await fetcher.post('/master-data/master-configs/detail/save', payload)
    return res.externalDesc || ''
  },

  /** Update config detail */
  editDetail: async (id: string, payload: {
    productId?: string | null
    ownerId?: string | null
    warehouseId?: string | null
    companyId?: string | null
    configValue: string
    status?: string
  }): Promise<string> => {
    const res = await fetcher.post('/master-data/master-configs/detail/edit', { id, ...payload })
    return res.externalDesc || ''
  },

  /** Delete config detail (soft delete) */
  deleteDetail: async (id: string): Promise<string> => {
    const res = await fetcher.post('/master-data/master-configs/detail/delete', { id })
    return res.externalDesc || ''
  },
}
