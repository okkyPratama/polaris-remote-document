import { fetcher, formatTimestamp } from '@polaris/service'
import type {
  Product,
  ProductAlternateCode,
  ProductFormData,
  ProductSearchParams,
  ProductStatus,
  LpnTrackingLevel,
  ExpiryDateRule,
  AlternateCodeType,
  CategoryOption,
} from '../types/product.types'

// ─── Mappers ────────────────────────────────────────────────────────

function mapAlternateCodes(raw: unknown): ProductAlternateCode[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const obj = item as Record<string, unknown>
      return {
        id: (obj.id as string) || '',
        productId: (obj.productId as string) || '',
        codeType: (obj.codeType as AlternateCodeType) || 'CUSTOMER_REF',
        codeValue: (obj.codeValue as string) || '',
      }
    })
    .filter((item) => item.id && item.codeValue)
}

function mapApiProduct(raw: Record<string, unknown>): Product {
  return {
    id: (raw.id as string) || '',
    // Backend returns `code`, frontend uses `skuCode`
    skuCode: (raw.code as string) || (raw.skuCode as string) || '',
    name: (raw.name as string) || '',
    description: (raw.description as string) || '',
    ownerId: (raw.ownerId as string) || '',
    ownerName: (raw.ownerName as string) || '',
    categoryId: (raw.categoryId as string) || '',
    categoryName: (raw.categoryName as string) || '',
    gtin: (raw.gtin as string) || '',
    supplierSkuCode: (raw.supplierSkuCode as string) || '',
    easyCode: (raw.easyCode as string) || '',
    baseUom: (raw.baseUom as string) || 'EA',
    status: ((raw.status as string) || 'ACTIVE') as ProductStatus,
    version: (raw.version as number) || 1,
    // Tracking rules — backend uses `lotTrackingEnabled`, `expiryTrackingEnabled`, `weightTrackingEnabled`
    lotTracking: (raw.lotTrackingEnabled ?? raw.lotTracking) !== false,
    expiryTracking: (raw.expiryTrackingEnabled ?? raw.expiryTracking) === true,
    lpnTrackingLevel: ((raw.lpnTrackingLevel as string) || 'LPN_CARTON') as LpnTrackingLevel,
    weightTracking: (raw.weightTrackingEnabled ?? raw.weightTracking) === true,
    // Operational flags
    allowReceiving: raw.allowReceiving !== false,
    allowOutbound: raw.allowOutbound !== false,
    isHazardous: raw.isHazardous === true,
    // Shelf life
    shelfLifeInboundMinDays: typeof raw.shelfLifeInboundMinDays === 'number' ? raw.shelfLifeInboundMinDays : null,
    shelfLifeOutboundMinDays: typeof raw.shelfLifeOutboundMinDays === 'number' ? raw.shelfLifeOutboundMinDays : null,
    expiryWarningDays: typeof raw.expiryWarningDays === 'number' ? raw.expiryWarningDays : null,
    expiryDateRule: (raw.expiryDateRule as ExpiryDateRule) || null,
    // Over-receipt
    overReceiptPct: typeof raw.overReceiptPct === 'number' ? raw.overReceiptPct : null,
    // Weights
    declaredGrossWeightKg: typeof raw.declaredGrossWeightKg === 'number' ? raw.declaredGrossWeightKg : null,
    declaredNetWeightKg: typeof raw.declaredNetWeightKg === 'number' ? raw.declaredNetWeightKg : null,
    declaredTareWeightKg: typeof raw.declaredTareWeightKg === 'number' ? raw.declaredTareWeightKg : null,
    // Dimensions
    lengthCm: typeof raw.lengthCm === 'number' ? raw.lengthCm : null,
    widthCm: typeof raw.widthCm === 'number' ? raw.widthCm : null,
    heightCm: typeof raw.heightCm === 'number' ? raw.heightCm : null,
    // Default UOMs
    defaultReceivingUom: (raw.defaultReceivingUom as string) || '',
    defaultIssuingUom: (raw.defaultIssuingUom as string) || '',
    // Alternate codes
    alternateCodes: mapAlternateCodes(raw.alternateCodes),
    // Lock indicator
    hasReceipts: raw.hasReceipts === true,
    // Audit
    createdBy: (raw.createdBy as string) || '',
    createdAt: formatTimestamp(raw.createdAt as string | undefined) || '',
    updatedBy: (raw.updatedBy as string) || '',
    updatedAt: formatTimestamp(raw.updatedAt as string | undefined) || '',
  }
}

// ─── Mutation Body Builder ──────────────────────────────────────────

function toSaveBody(payload: ProductFormData, id?: string) {
  const body: Record<string, unknown> = {
    // Backend expects `code` field, not `skuCode`
    code: payload.skuCode,
    name: payload.name,
    description: payload.description || null,
    ownerId: payload.ownerId,
    categoryId: payload.categoryId || null,
    gtin: payload.gtin || null,
    supplierSkuCode: payload.supplierSkuCode || null,
    easyCode: payload.easyCode || null,
    baseUom: payload.baseUom || 'EA',
    lotTracking: payload.lotTracking,
    expiryTracking: payload.expiryTracking,
    lpnTrackingLevel: payload.lpnTrackingLevel,
    weightTracking: payload.weightTracking,
    allowReceiving: payload.allowReceiving,
    allowOutbound: payload.allowOutbound,
    isHazardous: payload.isHazardous,
    shelfLifeInboundMinDays: payload.shelfLifeInboundMinDays,
    shelfLifeOutboundMinDays: payload.shelfLifeOutboundMinDays,
    expiryWarningDays: payload.expiryWarningDays,
    expiryDateRule: payload.expiryDateRule || null,
    overReceiptPct: payload.overReceiptPct,
    declaredGrossWeightKg: payload.declaredGrossWeightKg,
    declaredNetWeightKg: payload.declaredNetWeightKg,
    declaredTareWeightKg: payload.declaredTareWeightKg,
    lengthCm: payload.lengthCm,
    widthCm: payload.widthCm,
    heightCm: payload.heightCm,
    defaultReceivingUom: payload.defaultReceivingUom || null,
    defaultIssuingUom: payload.defaultIssuingUom || null,
    alternateCodes: payload.alternateCodes.map((c) => ({
      id: c.id || undefined,
      codeType: c.codeType,
      codeValue: c.codeValue,
    })),
  }
  if (id) body.id = id
  return body
}

// ═══════════════════════════════════════════════════════════════════════
// API Service
// ═══════════════════════════════════════════════════════════════════════

export const productsApi = {
  // ─── List ───────────────────────────────────────────────────────────

  getAll: async (params?: ProductSearchParams): Promise<{ data: Product[]; total: number }> => {
    const filters: Array<{ field: string; operator: string; value: unknown }> = []

    if (params?.search) {
      filters.push({ field: 'keyword', operator: '=', value: params.search })
    }
    if (params?.ownerId) {
      filters.push({ field: 'ownerId', operator: '=', value: params.ownerId })
    }
    if (params?.categoryId) {
      filters.push({ field: 'categoryId', operator: '=', value: params.categoryId })
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
      paging: { totalItems: number; count: number }
    }>('/master-data/products/getAll', body)

    const data = (res.data?.data || []).map(mapApiProduct)
    const total = res.data?.paging?.totalItems || res.data?.paging?.count || data.length
    return { data, total }
  },

  // ─── Search (multi-field keyword lookup) ────────────────────────────

  search: async (keyword: string, ownerId?: string, searchFields?: string[]): Promise<Product[]> => {
    const body: Record<string, unknown> = {
      keyword,
      ownerId: ownerId || '',
      searchFields: searchFields || ['sku_code', 'name', 'gtin', 'easy_code', 'alternate_codes'],
    }

    const res = await fetcher.post<{
      data: Record<string, unknown>[]
      paging: { totalItems: number }
    }>('/master-data/products/search', body)

    return (res.data?.data || []).map(mapApiProduct)
  },

  // ─── Detail ─────────────────────────────────────────────────────────

  getById: async (id: string): Promise<Product> => {
    const res = await fetcher.post<{ data: Record<string, unknown>[] }>('/master-data/products/detailById', { id })
    const raw = res.data?.data?.[0]
    if (!raw) throw new Error('Produk tidak ditemukan')
    return mapApiProduct(raw)
  },

  // ─── Create / Edit / Delete ─────────────────────────────────────────

  create: async (payload: ProductFormData): Promise<string> => {
    const res = await fetcher.post('/master-data/products/save', toSaveBody(payload))
    return res.externalDesc || ''
  },

  update: async (id: string, payload: ProductFormData): Promise<string> => {
    const res = await fetcher.post('/master-data/products/edit', toSaveBody(payload, id))
    return res.externalDesc || ''
  },

  delete: async (id: string): Promise<string> => {
    const res = await fetcher.post('/master-data/products/delete', { id })
    return res.externalDesc || ''
  },

  // ─── Deactivate / Reactivate ────────────────────────────────────────

  deactivate: async (id: string): Promise<string> => {
    const res = await fetcher.post('/master-data/products/deactivate', { id })
    return res.externalDesc || ''
  },

  reactivate: async (id: string): Promise<string> => {
    const res = await fetcher.post('/master-data/products/reactivate', { id })
    return res.externalDesc || ''
  },

  // ─── Category Options ───────────────────────────────────────────────

  getCategoryOptions: async (): Promise<CategoryOption[]> => {
    const body = {
      filters: {},
      paging: { page: 1, pageSize: 100, sortBy: 'name', sortDir: 'ASC' },
    }
    const res = await fetcher.post<{ data: Record<string, unknown>[] }>('/master-data/product-categories/getAll', body)
    return (res.data?.data || []).map((raw) => ({
      id: (raw.id as string) || '',
      code: (raw.code as string) || '',
      name: (raw.name as string) || '',
    })).filter((x) => x.id)
  },
}
