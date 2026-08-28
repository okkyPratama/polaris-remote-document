import { z } from 'zod'

/** Spatial entity lifecycle status (matches master-data ACTIVE/INACTIVE). */
export type SpatialStatus = 'ACTIVE' | 'INACTIVE'

/** UI labels (Indonesian) — API values stay ACTIVE/INACTIVE/BLOCKED. */
export function spatialStatusLabel(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'Aktif'
    case 'INACTIVE':
      return 'Nonaktif'
    case 'BLOCKED':
      return 'Diblokir'
    default:
      return status
  }
}

export const SPATIAL_STATUS_OPTIONS = [
  { value: 'ACTIVE' as const, label: 'Aktif' },
  { value: 'INACTIVE' as const, label: 'Nonaktif' },
]

/** Grup Zona default putaway modes (REQ-002). */
export type PutawayMode = 'EMPTY_FIRST' | 'CONSOLIDATE' | 'RANDOM'

export const PUTAWAY_MODES: PutawayMode[] = ['EMPTY_FIRST', 'CONSOLIDATE', 'RANDOM']

export const PUTAWAY_MODE_OPTIONS = [
  { value: 'EMPTY_FIRST' as const, label: 'Kosong dulu' },
  { value: 'CONSOLIDATE' as const, label: 'Konsolidasi' },
  { value: 'RANDOM' as const, label: 'Acak' },
]

export function putawayModeLabel(mode: string | null | undefined): string {
  if (!mode) return '—'
  return PUTAWAY_MODE_OPTIONS.find((opt) => opt.value === mode)?.label ?? mode
}

/**
 * Grup Zona — Warehouse → Grup Zona → Zone → Location.
 */
export interface ZoneGroup {
  id: string
  warehouseId: string
  warehouseCode?: string
  warehouseName?: string
  code: string
  name: string
  temperatureMin: number | null
  temperatureMax: number | null
  handlingRulesJson: string | null
  defaultPutawayMode: PutawayMode
  status: SpatialStatus
  createdBy?: string
  createdAt: string
  updatedBy?: string
  updatedAt?: string
}

export interface ZoneGroupSearchParams {
  search?: string
  status?: 'ALL' | SpatialStatus
  page?: number
  pageSize?: number
}

/**
 * Compact Spatial dropdown option (ACTIVE, unpaginated).
 * Not a grid entity — extra warehouse/status/audit fields are not part of this contract.
 */
export interface SpatialOption {
  id: string
  code: string
  name: string
}

/** Coerce empty form values to `null`; keep finite numbers. */
const nullableNumber = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((val, ctx) => {
    if (val === '' || val === null || val === undefined) return null
    const n = typeof val === 'number' ? val : Number(String(val).trim())
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: 'custom', message: 'Harus berupa angka' })
      return z.NEVER
    }
    return n
  })

const optionalJsonString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((val) => {
    if (val === null || val === undefined) return null
    const trimmed = val.trim()
    return trimmed.length === 0 ? null : trimmed
  })

export const zoneGroupFormSchema = z
  .object({
    code: z.string().min(1, 'Kode grup zona wajib diisi').max(32, 'Kode maksimal 32 karakter'),
    name: z.string().min(1, 'Nama grup zona wajib diisi').max(128, 'Nama maksimal 128 karakter'),
    temperatureMin: nullableNumber,
    temperatureMax: nullableNumber,
    handlingRulesJson: optionalJsonString,
    defaultPutawayMode: z.enum(['EMPTY_FIRST', 'CONSOLIDATE', 'RANDOM'], {
      message: 'Mode Putaway wajib dipilih',
    }),
    status: z.enum(['ACTIVE', 'INACTIVE']),
  })
  .superRefine((data, ctx) => {
    if (
      data.temperatureMin !== null &&
      data.temperatureMax !== null &&
      data.temperatureMin > data.temperatureMax
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['temperatureMin'],
        message: 'Suhu minimum harus lebih kecil atau sama dengan suhu maksimum',
      })
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['temperatureMax'],
        message: 'Suhu maksimum harus lebih besar atau sama dengan suhu minimum',
      })
    }

    if (data.handlingRulesJson !== null) {
      try {
        JSON.parse(data.handlingRulesJson)
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['handlingRulesJson'],
          message: 'Handling rules harus berupa JSON yang valid',
        })
      }
    }
  })

export type ZoneGroupFormData = z.output<typeof zoneGroupFormSchema>

export const defaultZoneGroupFormValues: ZoneGroupFormData = {
  code: '',
  name: '',
  temperatureMin: null,
  temperatureMax: null,
  handlingRulesJson: null,
  defaultPutawayMode: 'EMPTY_FIRST',
  status: 'ACTIVE',
}

/** Zone operational activities (REQ-002). */
export type ZoneActivity =
  | 'RECEIPT'
  | 'PUTAWAY'
  | 'STORAGE'
  | 'PICK'
  | 'ISSUE'
  | 'MOVEMENT'
  | 'STAGING'
  | 'COUNT'

export const ZONE_ACTIVITIES: ZoneActivity[] = [
  'RECEIPT',
  'PUTAWAY',
  'STORAGE',
  'PICK',
  'ISSUE',
  'MOVEMENT',
  'STAGING',
  'COUNT',
]

export const ZONE_ACTIVITY_OPTIONS = [
  { value: 'RECEIPT' as const, label: 'Penerimaan' },
  { value: 'PUTAWAY' as const, label: 'Putaway' },
  { value: 'STORAGE' as const, label: 'Penyimpanan' },
  { value: 'PICK' as const, label: 'Pick' },
  { value: 'ISSUE' as const, label: 'Pengeluaran' },
  { value: 'MOVEMENT' as const, label: 'Perpindahan' },
  { value: 'STAGING' as const, label: 'Staging' },
  { value: 'COUNT' as const, label: 'Stock opname' },
]

export function zoneActivityLabel(activity: string): string {
  return ZONE_ACTIVITY_OPTIONS.find((opt) => opt.value === activity)?.label ?? activity
}

const ZONE_ACTIVITY_SET = new Set<string>(ZONE_ACTIVITIES)

export function isValidZoneActivity(value: unknown): value is ZoneActivity {
  return typeof value === 'string' && ZONE_ACTIVITY_SET.has(value)
}

/**
 * Zone — child of Grup Zona within a Warehouse.
 */
export interface Zone {
  id: string
  warehouseId: string
  zoneGroupId: string
  zoneGroupCode?: string
  zoneGroupName?: string
  code: string
  name: string
  allowedActivities: ZoneActivity[]
  status: SpatialStatus
  createdBy?: string
  createdAt: string
  updatedBy?: string
  updatedAt?: string
}

export interface ZoneSearchParams {
  search?: string
  status?: 'ALL' | SpatialStatus
  zoneGroupId?: string
  page?: number
  pageSize?: number
}

export const zoneFormSchema = z.object({
  zoneGroupId: z.string().min(1, 'Grup Zona wajib dipilih'),
  code: z.string().min(1, 'Kode zona wajib diisi').max(32, 'Kode maksimal 32 karakter'),
  name: z.string().min(1, 'Nama zona wajib diisi').max(128, 'Nama maksimal 128 karakter'),
  allowedActivities: z
    .array(z.enum(['RECEIPT', 'PUTAWAY', 'STORAGE', 'PICK', 'ISSUE', 'MOVEMENT', 'STAGING', 'COUNT']))
    .superRefine((activities, ctx) => {
      const seen = new Set<string>()
      for (let i = 0; i < activities.length; i++) {
        const activity = activities[i]
        if (seen.has(activity)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [i],
            message: 'Aktivitas tidak boleh duplikat',
          })
        }
        seen.add(activity)
      }
    }),
  status: z.enum(['ACTIVE', 'INACTIVE']),
})

export type ZoneFormData = z.output<typeof zoneFormSchema>

export const defaultZoneFormValues: ZoneFormData = {
  zoneGroupId: '',
  code: '',
  name: '',
  allowedActivities: [],
  status: 'ACTIVE',
}

/** Location status — BLOCKED is display-only; set via /locations/block. */
export type LocationStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED'

export type LocationType =
  | 'STORAGE'
  | 'RECEIVING'
  | 'SHIPPING'
  | 'TRANSIT'
  | 'ADJUSTMENT'

export const LOCATION_TYPES: LocationType[] = [
  'STORAGE',
  'RECEIVING',
  'SHIPPING',
  'TRANSIT',
  'ADJUSTMENT',
]

export const LOCATION_TYPE_OPTIONS = [
  { value: 'STORAGE' as const, label: 'Penyimpanan' },
  { value: 'RECEIVING' as const, label: 'Penerimaan' },
  { value: 'SHIPPING' as const, label: 'Pengiriman' },
  { value: 'TRANSIT' as const, label: 'Transit' },
  { value: 'ADJUSTMENT' as const, label: 'Penyesuaian' },
]

export function locationTypeLabel(type: string): string {
  return LOCATION_TYPE_OPTIONS.find((opt) => opt.value === type)?.label ?? type
}

/** Coerce empty → null; keep finite integers. */
const nullablePositiveInt = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((val, ctx) => {
    if (val === '' || val === null || val === undefined) return null
    const n = typeof val === 'number' ? val : Number(String(val).trim())
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      ctx.addIssue({ code: 'custom', message: 'Harus berupa bilangan bulat' })
      return z.NEVER
    }
    if (n <= 0) {
      ctx.addIssue({ code: 'custom', message: 'Harus lebih besar dari 0' })
      return z.NEVER
    }
    return n
  })

/** Coerce empty → null; keep finite numbers > 0. */
const nullablePositiveNumber = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((val, ctx) => {
    if (val === '' || val === null || val === undefined) return null
    const n = typeof val === 'number' ? val : Number(String(val).trim())
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: 'custom', message: 'Harus berupa angka' })
      return z.NEVER
    }
    if (n <= 0) {
      ctx.addIssue({ code: 'custom', message: 'Harus lebih besar dari 0' })
      return z.NEVER
    }
    return n
  })

const sequenceInt = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((val, ctx) => {
    if (val === '' || val === null || val === undefined) return 0
    const n = typeof val === 'number' ? val : Number(String(val).trim())
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      ctx.addIssue({ code: 'custom', message: 'Urutan harus bilangan bulat' })
      return z.NEVER
    }
    return n
  })

const optionalName = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((val) => {
    if (val === null || val === undefined) return null
    const trimmed = val.trim()
    return trimmed.length === 0 ? null : trimmed
  })

/**
 * Location — bin/slot under a Zone.
 */
export interface Location {
  id: string
  warehouseId: string
  zoneId: string
  zoneCode?: string
  zoneName?: string
  code: string
  name: string | null
  locationType: LocationType
  sequence: number
  maxLpnCount: number | null
  maxWeightKg: number | null
  status: LocationStatus
  createdBy?: string
  createdAt: string
  updatedBy?: string
  updatedAt?: string
}

export interface LocationSearchParams {
  search?: string
  status?: 'ALL' | LocationStatus
  zoneId?: string
  locationType?: 'ALL' | LocationType
  page?: number
  pageSize?: number
}

export const locationFormSchema = z.object({
  zoneId: z.string().min(1, 'Zona wajib dipilih'),
  code: z.string().min(1, 'Kode lokasi wajib diisi').max(32, 'Kode maksimal 32 karakter'),
  name: optionalName,
  locationType: z.enum(['STORAGE', 'RECEIVING', 'SHIPPING', 'TRANSIT', 'ADJUSTMENT'], {
    message: 'Tipe lokasi wajib dipilih',
  }),
  sequence: sequenceInt,
  maxLpnCount: nullablePositiveInt,
  maxWeightKg: nullablePositiveNumber,
  /** Form status — BLOCKED is only set via the dedicated block endpoint. */
  status: z.enum(['ACTIVE', 'INACTIVE']),
})

export type LocationFormData = z.output<typeof locationFormSchema>

export const defaultLocationFormValues: LocationFormData = {
  zoneId: '',
  code: '',
  name: null,
  locationType: 'STORAGE',
  sequence: 0,
  maxLpnCount: null,
  maxWeightKg: null,
  status: 'ACTIVE',
}

/** Bulk create item — status is always ACTIVE on submit. */
export interface LocationBulkItem {
  zoneId: string
  code: string
  name: string | null
  locationType: LocationType
  sequence: number
  maxLpnCount: number | null
  maxWeightKg: number | null
}

export interface LocationBulkRowError {
  index: number
  code?: string
  messages: string[]
}

export interface LocationBulkSaveResponse {
  createdCount: number
  errors?: LocationBulkRowError[]
}

export interface LocationBulkFormData {
  items: LocationBulkItem[]
}

export const locationBulkItemSchema = z.object({
  zoneId: z.string().min(1, 'Zona wajib dipilih'),
  code: z.string().min(1, 'Kode lokasi wajib diisi').max(32, 'Kode maksimal 32 karakter'),
  name: optionalName,
  locationType: z.enum(['STORAGE', 'RECEIVING', 'SHIPPING', 'TRANSIT', 'ADJUSTMENT'], {
    message: 'Tipe lokasi wajib dipilih',
  }),
  sequence: sequenceInt,
  maxLpnCount: nullablePositiveInt,
  maxWeightKg: nullablePositiveNumber,
})

export const locationBulkFormSchema = z
  .object({
    items: z.array(locationBulkItemSchema).min(1, 'Minimal satu baris Location diperlukan'),
  })
  .superRefine((data, ctx) => {
    const seen = new Map<string, number>()
    data.items.forEach((item, index) => {
      const key = item.code.trim().toUpperCase()
      if (!key) return
      const prev = seen.get(key)
      if (prev !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items', index, 'code'],
          message: `Kode duplikat dengan baris ${prev + 1} (tidak membedakan huruf besar/kecil)`,
        })
      } else {
        seen.set(key, index)
      }
    })
  })

export function createEmptyBulkItem(zoneId = ''): LocationBulkItem {
  return {
    zoneId,
    code: '',
    name: null,
    locationType: 'STORAGE',
    sequence: 0,
    maxLpnCount: null,
    maxWeightKg: null,
  }
}
