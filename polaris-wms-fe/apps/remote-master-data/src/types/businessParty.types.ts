import { z } from 'zod'

export type BusinessPartyStatus = 'ACTIVE' | 'INACTIVE'

export type BusinessPartyRole = 'OWNER' | 'SUPPLIER' | 'CONSIGNEE' | 'COURIER'

// ─── Extension Attributes ───────────────────────────────────────────

export interface BusinessPartyOwnerAttr {
  internalAlias?: string
  overReceiptPct?: number | null
  ediCode?: string
  serviceModel?: string
  expiryPolicyLevel?: string
  expiryWarnDays?: number | null
  barcodeParser?: string
  skuPrefix?: string
  notes?: string
}

export interface BusinessPartySupplierAttr {
  supplierCode?: string
  ediCode?: string
  leadTimeDays?: number | null
  originCity?: string
  originCountry?: string
  notes?: string
}

export interface BusinessPartyConsigneeAttr {
  ediCode?: string
  notes?: string
}

export interface BusinessPartyCarrierAttr {
  transportMode?: string
  ediCode?: string
  trackingUrl?: string
  awbFormat?: string
  notes?: string
}

// ─── Warehouse Access ───────────────────────────────────────────────

export interface OwnerWarehouseAccess {
  id: string
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  serviceModel?: string
  createdBy?: string
  createdAt?: string
}

export interface SupplierWarehouseAccess {
  id: string
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  createdBy?: string
  createdAt?: string
}

export interface ConsigneeWarehouseAccess {
  id: string
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  createdBy?: string
  createdAt?: string
}

// ─── Consignee Addresses ────────────────────────────────────────────

export interface ConsigneeAddress {
  id: string
  addressLabel: string
  address?: string
  city?: string
  province?: string
  country?: string
  contactPerson?: string
  contactPhone?: string
  deliveryWindowStart?: string
  deliveryWindowEnd?: string
  handlingInstructions?: string
  isDefault: boolean
  createdBy?: string
  createdAt?: string
}

// ─── Warehouse Option ───────────────────────────────────────────────

export interface WarehouseOption {
  id: string
  code: string
  name: string
}

// ─── Main Entity ────────────────────────────────────────────────────

export interface BusinessParty {
  id: string
  code: string
  name: string
  npwp: string
  taxId: string
  contactName: string
  contactEmail: string
  contactPhone: string
  address: string
  city: string
  province: string
  zipcode: string
  countryCode: string
  roles: BusinessPartyRole[]
  status: BusinessPartyStatus
  ownerAttr?: BusinessPartyOwnerAttr
  supplierAttr?: BusinessPartySupplierAttr
  consigneeAttr?: BusinessPartyConsigneeAttr
  carrierAttr?: BusinessPartyCarrierAttr
  ownerWarehouses?: OwnerWarehouseAccess[]
  supplierWarehouses?: SupplierWarehouseAccess[]
  consigneeWarehouses?: ConsigneeWarehouseAccess[]
  consigneeAddresses?: ConsigneeAddress[]
  createdBy?: string
  createdAt: string
  updatedBy?: string
  updatedAt?: string
}

export interface BusinessPartySearchParams {
  search?: string
  role?: BusinessPartyRole
  status?: 'ALL' | BusinessPartyStatus
  page?: number
  pageSize?: number
}

const optionalTrimmedString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value): string => {
    if (value === null || value === undefined) return ''
    return value.trim()
  })

const optionalNullableNumber = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value, ctx): number | null => {
    if (value === '' || value === null || value === undefined) return null
    const n = typeof value === 'number' ? value : Number(String(value).trim())
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Harus berupa angka' })
      return z.NEVER
    }
    return n
  })

export const businessPartyFormSchema = z.object({
  code: z.string().min(1, 'Kode wajib diisi').max(32, 'Kode maksimal 32 karakter'),
  name: z.string().min(1, 'Nama wajib diisi').max(128, 'Nama maksimal 128 karakter'),
  npwp: optionalTrimmedString,
  taxId: optionalTrimmedString,
  contactName: optionalTrimmedString,
  contactEmail: optionalTrimmedString,
  contactPhone: optionalTrimmedString,
  address: optionalTrimmedString,
  city: optionalTrimmedString,
  province: optionalTrimmedString,
  zipcode: optionalTrimmedString,
  countryCode: optionalTrimmedString,
  status: z.enum(['ACTIVE', 'INACTIVE']),
  roles: z.array(z.enum(['OWNER', 'SUPPLIER', 'CONSIGNEE', 'COURIER'])).min(1, 'Minimal pilih satu tipe mitra'),
  ownerAttr: z
    .object({
      internalAlias: optionalTrimmedString,
      overReceiptPct: optionalNullableNumber,
      ediCode: optionalTrimmedString,
      serviceModel: optionalTrimmedString,
      expiryPolicyLevel: optionalTrimmedString,
      expiryWarnDays: optionalNullableNumber,
      barcodeParser: optionalTrimmedString,
      skuPrefix: optionalTrimmedString,
      notes: optionalTrimmedString,
    })
    .optional(),
  supplierAttr: z
    .object({
      supplierCode: optionalTrimmedString,
      ediCode: optionalTrimmedString,
      leadTimeDays: optionalNullableNumber,
      originCity: optionalTrimmedString,
      originCountry: optionalTrimmedString,
      notes: optionalTrimmedString,
    })
    .optional(),
  consigneeAttr: z
    .object({
      ediCode: optionalTrimmedString,
      notes: optionalTrimmedString,
    })
    .optional(),
  carrierAttr: z
    .object({
      transportMode: optionalTrimmedString,
      ediCode: optionalTrimmedString,
      trackingUrl: optionalTrimmedString,
      awbFormat: optionalTrimmedString,
      notes: optionalTrimmedString,
    })
    .optional(),
})

export type BusinessPartyFormInput = z.input<typeof businessPartyFormSchema>
export type BusinessPartyFormData = z.infer<typeof businessPartyFormSchema>

export const defaultBusinessPartyFormValues: BusinessPartyFormData = {
  code: '',
  name: '',
  npwp: '',
  taxId: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  address: '',
  city: '',
  province: '',
  zipcode: '',
  countryCode: 'ID',
  status: 'ACTIVE',
  roles: [],
  ownerAttr: {
    internalAlias: '',
    overReceiptPct: null,
    ediCode: '',
    serviceModel: '',
    expiryPolicyLevel: '',
    expiryWarnDays: null,
    barcodeParser: '',
    skuPrefix: '',
    notes: '',
  },
  supplierAttr: {
    supplierCode: '',
    ediCode: '',
    leadTimeDays: null,
    originCity: '',
    originCountry: '',
    notes: '',
  },
  consigneeAttr: {
    ediCode: '',
    notes: '',
  },
  carrierAttr: {
    transportMode: '',
    ediCode: '',
    trackingUrl: '',
    awbFormat: '',
    notes: '',
  },
}

export function toBusinessPartyFormData(source: BusinessParty): BusinessPartyFormData {
  return {
    code: source.code,
    name: source.name,
    npwp: source.npwp || '',
    taxId: source.taxId || '',
    contactName: source.contactName || '',
    contactEmail: source.contactEmail || '',
    contactPhone: source.contactPhone || '',
    address: source.address || '',
    city: source.city || '',
    province: source.province || '',
    zipcode: source.zipcode || '',
    countryCode: source.countryCode || 'ID',
    status: source.status,
    roles: source.roles,
    ownerAttr: {
      internalAlias: source.ownerAttr?.internalAlias || '',
      overReceiptPct: source.ownerAttr?.overReceiptPct ?? null,
      ediCode: source.ownerAttr?.ediCode || '',
      serviceModel: source.ownerAttr?.serviceModel || '',
      expiryPolicyLevel: source.ownerAttr?.expiryPolicyLevel || '',
      expiryWarnDays: source.ownerAttr?.expiryWarnDays ?? null,
      barcodeParser: source.ownerAttr?.barcodeParser || '',
      skuPrefix: source.ownerAttr?.skuPrefix || '',
      notes: source.ownerAttr?.notes || '',
    },
    supplierAttr: {
      supplierCode: source.supplierAttr?.supplierCode || '',
      ediCode: source.supplierAttr?.ediCode || '',
      leadTimeDays: source.supplierAttr?.leadTimeDays ?? null,
      originCity: source.supplierAttr?.originCity || '',
      originCountry: source.supplierAttr?.originCountry || '',
      notes: source.supplierAttr?.notes || '',
    },
    consigneeAttr: {
      ediCode: source.consigneeAttr?.ediCode || '',
      notes: source.consigneeAttr?.notes || '',
    },
    carrierAttr: {
      transportMode: source.carrierAttr?.transportMode || '',
      ediCode: source.carrierAttr?.ediCode || '',
      trackingUrl: source.carrierAttr?.trackingUrl || '',
      awbFormat: source.carrierAttr?.awbFormat || '',
      notes: source.carrierAttr?.notes || '',
    },
  }
}
