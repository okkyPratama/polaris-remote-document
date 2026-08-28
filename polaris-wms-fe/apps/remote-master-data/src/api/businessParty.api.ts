import { fetcher } from '@polaris/service'
import type {
  BusinessParty,
  BusinessPartyCarrierAttr,
  BusinessPartyConsigneeAttr,
  BusinessPartyFormData,
  BusinessPartyOwnerAttr,
  BusinessPartyRole,
  BusinessPartySearchParams,
  BusinessPartyStatus,
  BusinessPartySupplierAttr,
  ConsigneeAddress,
  ConsigneeWarehouseAccess,
  OwnerWarehouseAccess,
  SupplierWarehouseAccess,
  WarehouseOption,
} from '../types/businessParty.types'

// ─── Constants ──────────────────────────────────────────────────────

const ROLE_SET = new Set<BusinessPartyRole>(['OWNER', 'SUPPLIER', 'CONSIGNEE', 'COURIER'])

// ─── Role Normalization ─────────────────────────────────────────────

function normalizeRole(value: unknown): BusinessPartyRole | null {
  if (typeof value !== 'string') return null
  const upper = value.toUpperCase() === 'CARRIER' ? 'COURIER' : value.toUpperCase()
  return ROLE_SET.has(upper as BusinessPartyRole) ? (upper as BusinessPartyRole) : null
}

function normalizeRoles(value: unknown): BusinessPartyRole[] {
  if (!Array.isArray(value)) return []
  const result: BusinessPartyRole[] = []
  const seen = new Set<BusinessPartyRole>()
  for (const item of value) {
    const role = normalizeRole(item)
    if (!role || seen.has(role)) continue
    seen.add(role)
    result.push(role)
  }
  return result
}

// ─── Extension Attribute Mappers ────────────────────────────────────

function mapOwnerAttr(raw: unknown): BusinessPartyOwnerAttr | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const obj = raw as Record<string, unknown>
  return {
    internalAlias: (obj.internalAlias as string) || '',
    overReceiptPct: typeof obj.overReceiptPct === 'number' ? obj.overReceiptPct : null,
    ediCode: (obj.ediCode as string) || '',
    serviceModel: (obj.serviceModel as string) || '',
    expiryPolicyLevel: (obj.expiryPolicyLevel as string) || '',
    expiryWarnDays: typeof obj.expiryWarnDays === 'number' ? obj.expiryWarnDays : null,
    barcodeParser: (obj.barcodeParser as string) || '',
    skuPrefix: (obj.skuPrefix as string) || '',
    notes: (obj.notes as string) || '',
  }
}

function mapSupplierAttr(raw: unknown): BusinessPartySupplierAttr | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const obj = raw as Record<string, unknown>
  return {
    supplierCode: (obj.supplierCode as string) || '',
    ediCode: (obj.ediCode as string) || '',
    leadTimeDays: typeof obj.leadTimeDays === 'number' ? obj.leadTimeDays : null,
    originCity: (obj.originCity as string) || '',
    originCountry: (obj.originCountry as string) || '',
    notes: (obj.notes as string) || '',
  }
}

function mapConsigneeAttr(raw: unknown): BusinessPartyConsigneeAttr | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const obj = raw as Record<string, unknown>
  return {
    ediCode: (obj.ediCode as string) || '',
    notes: (obj.notes as string) || '',
  }
}

function mapCarrierAttr(raw: unknown): BusinessPartyCarrierAttr | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const obj = raw as Record<string, unknown>
  return {
    transportMode: (obj.transportMode as string) || '',
    ediCode: (obj.ediCode as string) || '',
    trackingUrl: (obj.trackingUrl as string) || '',
    awbFormat: (obj.awbFormat as string) || '',
    notes: (obj.notes as string) || '',
  }
}

// ─── Warehouse Access Mappers ───────────────────────────────────────

function mapOwnerWarehouses(raw: unknown): OwnerWarehouseAccess[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const obj = item as Record<string, unknown>
      return {
        id: (obj.id as string) || '',
        warehouseId: (obj.warehouseId as string) || '',
        warehouseCode: (obj.warehouseCode as string) || '',
        warehouseName: (obj.warehouseName as string) || '',
        serviceModel: (obj.serviceModel as string) || undefined,
        createdBy: (obj.createdBy as string) || undefined,
        createdAt: (obj.createdAt as string) || undefined,
      }
    })
    .filter((item) => item.id && item.warehouseId)
}

function mapSupplierWarehouses(raw: unknown): SupplierWarehouseAccess[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const obj = item as Record<string, unknown>
      return {
        id: (obj.id as string) || '',
        warehouseId: (obj.warehouseId as string) || '',
        warehouseCode: (obj.warehouseCode as string) || '',
        warehouseName: (obj.warehouseName as string) || '',
        createdBy: (obj.createdBy as string) || undefined,
        createdAt: (obj.createdAt as string) || undefined,
      }
    })
    .filter((item) => item.id && item.warehouseId)
}

function mapConsigneeWarehouses(raw: unknown): ConsigneeWarehouseAccess[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const obj = item as Record<string, unknown>
      return {
        id: (obj.id as string) || '',
        warehouseId: (obj.warehouseId as string) || '',
        warehouseCode: (obj.warehouseCode as string) || '',
        warehouseName: (obj.warehouseName as string) || '',
        createdBy: (obj.createdBy as string) || undefined,
        createdAt: (obj.createdAt as string) || undefined,
      }
    })
    .filter((item) => item.id && item.warehouseId)
}

// ─── Consignee Address Mapper ───────────────────────────────────────

function mapConsigneeAddresses(raw: unknown): ConsigneeAddress[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const obj = item as Record<string, unknown>
      return {
        id: (obj.id as string) || '',
        addressLabel: (obj.addressLabel as string) || '',
        address: (obj.address as string) || undefined,
        city: (obj.city as string) || undefined,
        province: (obj.province as string) || undefined,
        country: (obj.country as string) || undefined,
        contactPerson: (obj.contactPerson as string) || undefined,
        contactPhone: (obj.contactPhone as string) || undefined,
        deliveryWindowStart: (obj.deliveryWindowStart as string) || undefined,
        deliveryWindowEnd: (obj.deliveryWindowEnd as string) || undefined,
        handlingInstructions: (obj.handlingInstructions as string) || undefined,
        isDefault: obj.isDefault === true,
        createdBy: (obj.createdBy as string) || undefined,
        createdAt: (obj.createdAt as string) || undefined,
      }
    })
    .filter((item) => item.id && item.addressLabel)
}

// ─── Warehouse Option Helpers ───────────────────────────────────────

function mapWarehouseOption(raw: Record<string, unknown>): WarehouseOption {
  return {
    id: (raw.id as string) || (raw.warehouseId as string) || '',
    code: (raw.code as string) || (raw.warehouseCode as string) || '',
    name: (raw.name as string) || (raw.warehouseName as string) || '',
  }
}

function readWarehouseOptionsFromStorage(): WarehouseOption[] {
  if (typeof window === 'undefined') return []
  try {
    const results: WarehouseOption[] = []

    // authorized_warehouses
    const authRaw = localStorage.getItem('authorized_warehouses')
    if (authRaw) {
      const parsed = JSON.parse(authRaw)
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (!item || typeof item !== 'object') continue
          const row = item as Record<string, unknown>
          const id = (row.id as string) || (row.warehouseId as string) || (row.code as string) || ''
          if (id) results.push({ id, code: (row.code as string) || '', name: (row.name as string) || '' })
        }
      }
    }

    // selected_warehouse
    const selRaw = localStorage.getItem('selected_warehouse')
    if (selRaw) {
      const row = JSON.parse(selRaw) as Record<string, unknown>
      const id = (row.id as string) || (row.warehouseId as string) || ''
      if (id) results.push({ id, code: (row.code as string) || '', name: (row.name as string) || '' })
    }

    return results
  } catch {
    return []
  }
}

function deduplicateWarehouseOptions(options: WarehouseOption[]): WarehouseOption[] {
  const seen = new Set<string>()
  const result: WarehouseOption[] = []
  for (const item of options) {
    if (!item.id || seen.has(item.id)) continue
    seen.add(item.id)
    result.push(item)
  }
  return result
}

// ─── Main Entity Mapper ─────────────────────────────────────────────

function mapApiBusinessParty(raw: Record<string, unknown>): BusinessParty {
  const status = (raw.status as string) === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'

  // Resolve roles: prefer `roles[]` array, fallback to boolean flags
  const roles = normalizeRoles(raw.roles)
  if (roles.length === 0) {
    if (raw.isOwner === true) roles.push('OWNER')
    if (raw.isSupplier === true) roles.push('SUPPLIER')
    if (raw.isConsignee === true) roles.push('CONSIGNEE')
    if (raw.isCourier === true) roles.push('COURIER')
  }

  return {
    id: (raw.id as string) || '',
    code: (raw.code as string) || '',
    name: (raw.name as string) || '',
    npwp: (raw.npwp as string) || '',
    taxId: (raw.taxId as string) || '',
    contactName: (raw.contactName as string) || '',
    contactEmail: (raw.contactEmail as string) || '',
    contactPhone: (raw.contactPhone as string) || '',
    address: (raw.address as string) || '',
    city: (raw.city as string) || '',
    province: (raw.province as string) || '',
    zipcode: (raw.zipcode as string) || '',
    countryCode: (raw.countryCode as string) || '',
    roles,
    status: status as BusinessPartyStatus,
    ownerAttr: mapOwnerAttr(raw.ownerAttr),
    supplierAttr: mapSupplierAttr(raw.supplierAttr),
    consigneeAttr: mapConsigneeAttr(raw.consigneeAttr),
    carrierAttr: mapCarrierAttr(raw.carrierAttr),
    ownerWarehouses: mapOwnerWarehouses(raw.ownerWarehouses),
    supplierWarehouses: mapSupplierWarehouses(raw.supplierWarehouses),
    consigneeWarehouses: mapConsigneeWarehouses(raw.consigneeWarehouses),
    consigneeAddresses: mapConsigneeAddresses(raw.consigneeAddresses),
    createdBy: (raw.createdBy as string) || undefined,
    createdAt: (raw.createdAt as string) || '',
    updatedBy: (raw.updatedBy as string) || undefined,
    updatedAt: (raw.updatedAt as string) || undefined,
  }
}

// ─── Mutation Body Builder ──────────────────────────────────────────

function toMutationBody(payload: BusinessPartyFormData, id?: string) {
  const body: Record<string, unknown> = {
    code: payload.code,
    name: payload.name,
    npwp: payload.npwp,
    taxId: payload.taxId,
    contactName: payload.contactName,
    contactEmail: payload.contactEmail,
    contactPhone: payload.contactPhone,
    address: payload.address,
    city: payload.city,
    province: payload.province,
    zipcode: payload.zipcode,
    countryCode: payload.countryCode,
    roles: payload.roles,
    status: payload.status,
  }

  if (payload.roles.includes('OWNER')) {
    body.ownerAttr = {
      internalAlias: payload.ownerAttr?.internalAlias || '',
      ediCode: payload.ownerAttr?.ediCode || '',
      expiryPolicyLevel: payload.ownerAttr?.expiryPolicyLevel || '',
      expiryWarnDays: payload.ownerAttr?.expiryWarnDays ?? null,
      barcodeParser: payload.ownerAttr?.barcodeParser || '',
      skuPrefix: payload.ownerAttr?.skuPrefix || '',
      notes: payload.ownerAttr?.notes || '',
    }
  }

  if (payload.roles.includes('SUPPLIER')) {
    body.supplierAttr = {
      supplierCode: payload.supplierAttr?.supplierCode || '',
      ediCode: payload.supplierAttr?.ediCode || '',
      leadTimeDays: payload.supplierAttr?.leadTimeDays ?? null,
      originCity: payload.supplierAttr?.originCity || '',
      originCountry: payload.supplierAttr?.originCountry || '',
      notes: payload.supplierAttr?.notes || '',
    }
  }

  if (payload.roles.includes('CONSIGNEE')) {
    body.consigneeAttr = {
      ediCode: payload.consigneeAttr?.ediCode || '',
      notes: payload.consigneeAttr?.notes || '',
    }
  }

  if (payload.roles.includes('COURIER')) {
    body.carrierAttr = {
      transportMode: payload.carrierAttr?.transportMode || '',
      ediCode: payload.carrierAttr?.ediCode || '',
      trackingUrl: payload.carrierAttr?.trackingUrl || '',
      awbFormat: payload.carrierAttr?.awbFormat || '',
      notes: payload.carrierAttr?.notes || '',
    }
  }

  if (id) body.id = id

  return body
}

// ═══════════════════════════════════════════════════════════════════════
// API Service
// ═══════════════════════════════════════════════════════════════════════

export const businessPartiesApi = {
  // ─── List ───────────────────────────────────────────────────────────

  getAll: async (params?: BusinessPartySearchParams): Promise<{ data: BusinessParty[]; total: number }> => {
    const filters: Array<{ field: string; operator: string; value: unknown }> = []

    if (params?.status && params.status !== 'ALL') {
      filters.push({ field: 'status', operator: '=', value: params.status })
    }
    if (params?.role) {
      filters.push({ field: 'role', operator: '=', value: params.role })
    }
    if (params?.search) {
      filters.push({ field: 'name', operator: 'ilike', value: `%${params.search}%` })
    }

    const body = {
      filters: filters.length > 0 ? { and: filters } : {},
      paging: {
        page: params?.page || 1,
        pageSize: params?.pageSize || 25,
        sortBy: 'createdAt',
        sortDir: 'DESC',
      },
    }

    const res = await fetcher.post<{
      data: Record<string, unknown>[]
      paging: { totalItems: number; count: number }
    }>('/master-data/business-parties/getAll', body)

    const data = (res.data?.data || []).map(mapApiBusinessParty)
    const total = res.data?.paging?.totalItems || res.data?.paging?.count || data.length

    return { data, total }
  },

  // ─── Detail ─────────────────────────────────────────────────────────

  getById: async (id: string): Promise<BusinessParty> => {
    const res = await fetcher.post<{ data: Record<string, unknown>[] }>('/master-data/business-parties/detailById', { id })
    const raw = res.data?.data?.[0]
    if (!raw) throw new Error('Data mitra tidak ditemukan')
    return mapApiBusinessParty(raw)
  },

  // ─── Create / Edit / Delete ─────────────────────────────────────────

  create: async (payload: BusinessPartyFormData): Promise<string> => {
    const res = await fetcher.post('/master-data/business-parties/save', toMutationBody(payload))
    return res.externalDesc || ''
  },

  update: async (id: string, payload: BusinessPartyFormData): Promise<string> => {
    const res = await fetcher.post('/master-data/business-parties/edit', toMutationBody(payload, id))
    return res.externalDesc || ''
  },

  remove: async (id: string): Promise<string> => {
    const res = await fetcher.post('/master-data/business-parties/delete', { id })
    return res.externalDesc || ''
  },

  // ─── Deactivate / Reactivate ────────────────────────────────────────

  deactivate: async (id: string): Promise<string> => {
    const res = await fetcher.post('/master-data/business-parties/deactivate', { id })
    return res.externalDesc || ''
  },

  reactivate: async (id: string): Promise<string> => {
    const res = await fetcher.post('/master-data/business-parties/reactivate', { id })
    return res.externalDesc || ''
  },

  // ─── Warehouse Options (for assign modal) ──────────────────────────

  getWarehouseOptions: async (): Promise<WarehouseOption[]> => {
    const body = {
      filters: { and: [{ field: 'status', operator: '=', value: 'ACTIVE' }] },
      paging: { page: 1, pageSize: 100, sortBy: 'createdAt', sortDir: 'DESC' },
    }

    let apiOptions: WarehouseOption[] = []
    try {
      const res = await fetcher.post<{
        data: Record<string, unknown>[]
      }>('/master-data/warehouses/getAll', body, { skipWarehouseContext: true })

      apiOptions = (res.data?.data || []).map(mapWarehouseOption).filter((x) => x.id)
    } catch {
      // silent — fallback to localStorage
    }

    const storageOptions = readWarehouseOptionsFromStorage()
    return deduplicateWarehouseOptions([...apiOptions, ...storageOptions])
  },

  // ─── Owner Warehouse Access ─────────────────────────────────────────

  assignOwnerWarehouse: async (ownerId: string, warehouseId: string): Promise<string> => {
    const res = await fetcher.post('/master-data/owner-warehouse-access/save', { ownerId, warehouseId })
    return res.externalDesc || ''
  },

  removeOwnerWarehouse: async (accessId: string): Promise<string> => {
    const res = await fetcher.post('/master-data/owner-warehouse-access/delete', { ownerWarehouseAccessId: accessId })
    return res.externalDesc || ''
  },

  // ─── Supplier Warehouse Access ──────────────────────────────────────

  assignSupplierWarehouse: async (supplierId: string, warehouseId: string): Promise<string> => {
    const res = await fetcher.post('/master-data/supplier-warehouse-access/save', { supplierId, warehouseId })
    return res.externalDesc || ''
  },

  removeSupplierWarehouse: async (accessId: string): Promise<string> => {
    const res = await fetcher.post('/master-data/supplier-warehouse-access/delete', { supplierWarehouseAccessId: accessId })
    return res.externalDesc || ''
  },

  // ─── Consignee Warehouse Access ─────────────────────────────────────

  assignConsigneeWarehouse: async (consigneeId: string, warehouseId: string): Promise<string> => {
    const res = await fetcher.post('/master-data/consignee-warehouse-access/save', { consigneeId, warehouseId })
    return res.externalDesc || ''
  },

  removeConsigneeWarehouse: async (accessId: string): Promise<string> => {
    const res = await fetcher.post('/master-data/consignee-warehouse-access/delete', { ConsigneeWarehouseAccessId: accessId })
    return res.externalDesc || ''
  },
}
