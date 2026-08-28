import { z } from 'zod'

export type UomStatus = 'ACTIVE' | 'INACTIVE'

export const UOM_STATUS_OPTIONS = [
  { value: 'ACTIVE' as const, label: 'Aktif' },
  { value: 'INACTIVE' as const, label: 'Nonaktif' },
]

export function uomStatusLabel(status: string): string {
  return UOM_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status
}

export interface UomLevel {
  id: string
  uomCode: string
  displayName: string
  level: number
  conversionFactorToEa: number
  conversionFactorToParent: number | null
  parentUomCode: string | null
  status: UomStatus
}

export interface UomHierarchy {
  id: string
  ownerId: string
  skuCode: string
  status: UomStatus
  levels: UomLevel[]
  createdBy?: string
  createdAt?: string
  updatedBy?: string
  updatedAt?: string
}

export interface UomSearchParams {
  keyword?: string
  ownerId?: string
  status?: 'ALL' | UomStatus
  page?: number
  pageSize?: number
}

export interface UomCodeOption {
  code: string
  name: string
}

export interface UomConvertRequest {
  ownerId: string
  skuCode: string
  quantity: number
  fromUomCode: string
}

export interface UomConvertResult {
  quantityEa: number
  fromQuantity: number
  fromUomCode: string
  fromDisplayName: string
  display: string
}

export interface UomDisplayRequest {
  ownerId: string
  skuCode: string
  quantityEa: number
}

export interface UomDisplayResult {
  quantityEa: number
  displayQuantity: number
  displayUomCode: string
  displayName: string
  display: string
}

const normalizedRequiredString = (message: string, max: number) =>
  z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, message).max(max, `Maksimal ${max} karakter`))

const normalizedCode = (message: string, max: number) =>
  z
    .string()
    .transform((value) => value.trim().toUpperCase())
    .pipe(z.string().min(1, message).max(max, `Maksimal ${max} karakter`))

const nullableParentCode = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return null
    const normalized = value.trim().toUpperCase()
    return normalized.length > 0 ? normalized : null
  })
  .pipe(z.string().max(32, 'Kode parent maksimal 32 karakter').nullable())

const positiveSafeInteger = (message: string) =>
  z
    .union([z.number(), z.string()])
    .transform((value) => {
      if (typeof value === 'number') return value
      const trimmed = value.trim()
      return trimmed.length > 0 ? Number(trimmed) : Number.NaN
    })
    .pipe(
      z
        .number({ message })
        .int(message)
        .positive(message)
        .max(Number.MAX_SAFE_INTEGER, 'Nilai melebihi batas aman')
    )

export const uomLevelFormSchema = z.object({
  id: z.string().trim().max(36, 'ID maksimal 36 karakter').optional().default(''),
  uomCode: normalizedCode('UOM wajib dipilih', 32),
  displayName: normalizedRequiredString('Nama tampilan wajib diisi', 128),
  level: positiveSafeInteger('Level harus berupa bilangan bulat positif').pipe(
    z.number().min(1, 'Level minimal 1').max(5, 'Level maksimal 5')
  ),
  conversionFactorToEa: positiveSafeInteger(
    'Faktor konversi ke EA harus berupa bilangan bulat positif'
  ),
  parentUomCode: nullableParentCode,
  status: z.enum(['ACTIVE', 'INACTIVE']),
})

export const uomHierarchyFormSchema = z
  .object({
    ownerId: normalizedRequiredString('Owner wajib dipilih', 36),
    skuCode: normalizedCode('Kode SKU wajib diisi', 64),
    status: z.enum(['ACTIVE', 'INACTIVE']),
    levels: z
      .array(uomLevelFormSchema)
      .min(1, 'Hierarchy wajib memiliki EA')
      .max(5, 'Hierarchy maksimal 5 level'),
  })
  .superRefine((data, ctx) => {
    const sortedLevels = [...data.levels].sort((left, right) => left.level - right.level)
    const seenCodes = new Set<string>()
    const seenLevels = new Set<number>()

    for (const [index, level] of data.levels.entries()) {
      if (seenCodes.has(level.uomCode)) {
        ctx.addIssue({
          code: 'custom',
          path: ['levels', index, 'uomCode'],
          message: `UOM ${level.uomCode} tidak boleh duplikat`,
        })
      }
      seenCodes.add(level.uomCode)

      if (seenLevels.has(level.level)) {
        ctx.addIssue({
          code: 'custom',
          path: ['levels', index, 'level'],
          message: `Level ${level.level} tidak boleh duplikat`,
        })
      }
      seenLevels.add(level.level)
    }

    const eaLevels = data.levels.filter((level) => level.uomCode === 'EA')
    if (eaLevels.length !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['levels'],
        message: 'Hierarchy wajib memiliki tepat satu EA',
      })
    } else {
      const ea = eaLevels[0]
      const eaIndex = data.levels.indexOf(ea)
      if (ea.level !== 1) {
        ctx.addIssue({ code: 'custom', path: ['levels', eaIndex, 'level'], message: 'EA harus level 1' })
      }
      if (ea.conversionFactorToEa !== 1) {
        ctx.addIssue({
          code: 'custom',
          path: ['levels', eaIndex, 'conversionFactorToEa'],
          message: 'Faktor EA harus 1',
        })
      }
      if (ea.parentUomCode !== null) {
        ctx.addIssue({
          code: 'custom',
          path: ['levels', eaIndex, 'parentUomCode'],
          message: 'EA tidak memiliki parent',
        })
      }
      if (ea.status !== 'ACTIVE') {
        ctx.addIssue({
          code: 'custom',
          path: ['levels', eaIndex, 'status'],
          message: 'EA harus aktif',
        })
      }
    }

    for (let index = 1; index < sortedLevels.length; index += 1) {
      const current = sortedLevels[index]
      const parent = sortedLevels[index - 1]
      const originalIndex = data.levels.indexOf(current)

      if (current.uomCode === 'EA') continue

      if (current.parentUomCode !== parent.uomCode) {
        ctx.addIssue({
          code: 'custom',
          path: ['levels', originalIndex, 'parentUomCode'],
          message: `Parent harus UOM level sebelumnya (${parent.uomCode})`,
        })
      }
      if (current.conversionFactorToEa <= parent.conversionFactorToEa) {
        ctx.addIssue({
          code: 'custom',
          path: ['levels', originalIndex, 'conversionFactorToEa'],
          message: `Faktor harus lebih besar dari parent (${parent.conversionFactorToEa})`,
        })
      } else if (current.conversionFactorToEa % parent.conversionFactorToEa !== 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['levels', originalIndex, 'conversionFactorToEa'],
          message: `Faktor harus habis dibagi faktor parent (${parent.conversionFactorToEa})`,
        })
      }
    }
  })
  .transform((data) => ({
    ...data,
    levels: [...data.levels].sort((left, right) => left.level - right.level),
  }))

export type UomLevelFormData = z.output<typeof uomLevelFormSchema>
export type UomHierarchyFormData = z.output<typeof uomHierarchyFormSchema>

export const defaultEaLevel: UomLevelFormData = {
  id: '',
  uomCode: 'EA',
  displayName: 'Each',
  level: 1,
  conversionFactorToEa: 1,
  parentUomCode: null,
  status: 'ACTIVE',
}

export const defaultUomHierarchyFormValues: UomHierarchyFormData = {
  ownerId: '',
  skuCode: '',
  status: 'ACTIVE',
  levels: [defaultEaLevel],
}
