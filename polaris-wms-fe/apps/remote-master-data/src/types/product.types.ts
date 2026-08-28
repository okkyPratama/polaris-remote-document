import { z } from 'zod'

// ─── Enums / Constants ──────────────────────────────────────────────

export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'

export type LpnTrackingLevel = 'LPN_PALLET_ONLY' | 'LPN_CARTON' | 'LPN_INNER' | 'SERIALIZED'

export type ExpiryDateRule = 'EXACT' | 'END_OF_MONTH'

export type AlternateCodeType = 'CUSTOMER_REF' | 'LEGACY' | 'RETAILER' | 'CROSS_REF'

export const LPN_TRACKING_LEVEL_OPTIONS: { value: LpnTrackingLevel; label: string }[] = [
  { value: 'LPN_PALLET_ONLY', label: 'Pallet Only' },
  { value: 'LPN_CARTON', label: 'Carton' },
  { value: 'LPN_INNER', label: 'Inner Pack' },
  { value: 'SERIALIZED', label: 'Serialized' },
]

export const EXPIRY_DATE_RULE_OPTIONS: { value: ExpiryDateRule; label: string }[] = [
  { value: 'EXACT', label: 'Tanggal Pasti' },
  { value: 'END_OF_MONTH', label: 'Akhir Bulan' },
]

export const ALTERNATE_CODE_TYPE_OPTIONS: { value: AlternateCodeType; label: string }[] = [
  { value: 'CUSTOMER_REF', label: 'Customer Ref' },
  { value: 'LEGACY', label: 'Legacy' },
  { value: 'RETAILER', label: 'Retailer' },
  { value: 'CROSS_REF', label: 'Cross Ref' },
]

export const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'INACTIVE', label: 'Nonaktif' },
  { value: 'ARCHIVED', label: 'Diarsipkan' },
]

// ─── Alternate Code ─────────────────────────────────────────────────

export interface ProductAlternateCode {
  id: string
  productId: string
  codeType: AlternateCodeType
  codeValue: string
}

// ─── Product Entity ─────────────────────────────────────────────────

export interface Product {
  id: string
  skuCode: string
  name: string
  description: string
  ownerId: string
  ownerName: string
  categoryId: string
  categoryName: string
  gtin: string
  supplierSkuCode: string
  easyCode: string
  baseUom: string
  status: ProductStatus
  version: number
  // Tracking rules
  lotTracking: boolean
  expiryTracking: boolean
  lpnTrackingLevel: LpnTrackingLevel
  weightTracking: boolean
  // Operational flags
  allowReceiving: boolean
  allowOutbound: boolean
  isHazardous: boolean
  // Shelf life
  shelfLifeInboundMinDays: number | null
  shelfLifeOutboundMinDays: number | null
  expiryWarningDays: number | null
  expiryDateRule: ExpiryDateRule | null
  // Over-receipt
  overReceiptPct: number | null
  // Weights
  declaredGrossWeightKg: number | null
  declaredNetWeightKg: number | null
  declaredTareWeightKg: number | null
  // Dimensions
  lengthCm: number | null
  widthCm: number | null
  heightCm: number | null
  // Default UOMs
  defaultReceivingUom: string
  defaultIssuingUom: string
  // Alternate codes
  alternateCodes: ProductAlternateCode[]
  // Tracking lock indicator
  hasReceipts: boolean
  // Audit
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

// ─── Search Params ──────────────────────────────────────────────────

export interface ProductSearchParams {
  search?: string
  ownerId?: string
  categoryId?: string
  status?: 'ALL' | ProductStatus
  page?: number
  pageSize?: number
}

// ─── Owner Option (for filter dropdown) ─────────────────────────────

export interface OwnerOption {
  id: string
  code: string
  name: string
}

// ─── Category Option ────────────────────────────────────────────────

export interface CategoryOption {
  id: string
  code: string
  name: string
}

// ─── Form Schema ────────────────────────────────────────────────────

export const productFormSchema = z.object({
  skuCode: z.string().min(1, 'Kode SKU wajib diisi').max(64, 'Maks 64 karakter'),
  name: z.string().min(1, 'Nama produk wajib diisi').max(128, 'Maks 128 karakter'),
  description: z.string(),
  ownerId: z.string().min(1, 'Owner wajib dipilih'),
  categoryId: z.string(),
  gtin: z.string(),
  supplierSkuCode: z.string(),
  easyCode: z.string(),
  baseUom: z.string(),
  // Tracking rules
  lotTracking: z.boolean(),
  expiryTracking: z.boolean(),
  lpnTrackingLevel: z.enum(['LPN_PALLET_ONLY', 'LPN_CARTON', 'LPN_INNER', 'SERIALIZED']),
  weightTracking: z.boolean(),
  // Operational flags
  allowReceiving: z.boolean(),
  allowOutbound: z.boolean(),
  isHazardous: z.boolean(),
  // Shelf life
  shelfLifeInboundMinDays: z.number().nullable(),
  shelfLifeOutboundMinDays: z.number().nullable(),
  expiryWarningDays: z.number().nullable(),
  expiryDateRule: z.enum(['EXACT', 'END_OF_MONTH']).nullable(),
  // Over-receipt
  overReceiptPct: z.number().nullable(),
  // Weights
  declaredGrossWeightKg: z.number().nullable(),
  declaredNetWeightKg: z.number().nullable(),
  declaredTareWeightKg: z.number().nullable(),
  // Dimensions
  lengthCm: z.number().nullable(),
  widthCm: z.number().nullable(),
  heightCm: z.number().nullable(),
  // Default UOMs
  defaultReceivingUom: z.string(),
  defaultIssuingUom: z.string(),
  // Alternate codes
  alternateCodes: z.array(z.object({
    id: z.string().optional(),
    codeType: z.enum(['CUSTOMER_REF', 'LEGACY', 'RETAILER', 'CROSS_REF']),
    codeValue: z.string().min(1, 'Kode wajib diisi'),
  })),
})

export type ProductFormData = z.infer<typeof productFormSchema>

export const defaultProductFormValues: ProductFormData = {
  skuCode: '',
  name: '',
  description: '',
  ownerId: '',
  categoryId: '',
  gtin: '',
  supplierSkuCode: '',
  easyCode: '',
  baseUom: 'EA',
  lotTracking: true,
  expiryTracking: false,
  lpnTrackingLevel: 'LPN_CARTON',
  weightTracking: false,
  allowReceiving: true,
  allowOutbound: true,
  isHazardous: false,
  shelfLifeInboundMinDays: null,
  shelfLifeOutboundMinDays: null,
  expiryWarningDays: null,
  expiryDateRule: null,
  overReceiptPct: null,
  declaredGrossWeightKg: null,
  declaredNetWeightKg: null,
  declaredTareWeightKg: null,
  lengthCm: null,
  widthCm: null,
  heightCm: null,
  defaultReceivingUom: '',
  defaultIssuingUom: '',
  alternateCodes: [],
}

export function toProductFormData(source: Product): ProductFormData {
  return {
    skuCode: source.skuCode,
    name: source.name,
    description: source.description || '',
    ownerId: source.ownerId,
    categoryId: source.categoryId || '',
    gtin: source.gtin || '',
    supplierSkuCode: source.supplierSkuCode || '',
    easyCode: source.easyCode || '',
    baseUom: source.baseUom || 'EA',
    lotTracking: source.lotTracking,
    expiryTracking: source.expiryTracking,
    lpnTrackingLevel: source.lpnTrackingLevel,
    weightTracking: source.weightTracking,
    allowReceiving: source.allowReceiving,
    allowOutbound: source.allowOutbound,
    isHazardous: source.isHazardous,
    shelfLifeInboundMinDays: source.shelfLifeInboundMinDays,
    shelfLifeOutboundMinDays: source.shelfLifeOutboundMinDays,
    expiryWarningDays: source.expiryWarningDays,
    expiryDateRule: source.expiryDateRule,
    overReceiptPct: source.overReceiptPct,
    declaredGrossWeightKg: source.declaredGrossWeightKg,
    declaredNetWeightKg: source.declaredNetWeightKg,
    declaredTareWeightKg: source.declaredTareWeightKg,
    lengthCm: source.lengthCm,
    widthCm: source.widthCm,
    heightCm: source.heightCm,
    defaultReceivingUom: source.defaultReceivingUom || '',
    defaultIssuingUom: source.defaultIssuingUom || '',
    alternateCodes: source.alternateCodes.map((c) => ({
      id: c.id,
      codeType: c.codeType,
      codeValue: c.codeValue,
    })),
  }
}
