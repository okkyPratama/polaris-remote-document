import { describe, expect, it } from 'vitest'
import { businessPartyFormSchema, defaultBusinessPartyFormValues, toBusinessPartyFormData } from './businessParty.types'
import type { BusinessParty } from './businessParty.types'

describe('businessPartyFormSchema', () => {
  const validData = {
    code: 'UNI-001',
    name: 'Unilever Indonesia',
    npwp: '01.234.567.8-901.000',
    taxId: 'TAX-001',
    contactName: 'Budi',
    contactEmail: 'budi@uni.com',
    contactPhone: '08111222333',
    address: 'Jl. Raya 1',
    city: 'Jakarta',
    province: 'DKI',
    zipcode: '10110',
    countryCode: 'ID',
    status: 'ACTIVE' as const,
    roles: ['OWNER'] as const,
  }

  it('passes with valid data', () => {
    const result = businessPartyFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('passes with multiple roles', () => {
    const result = businessPartyFormSchema.safeParse({
      ...validData,
      roles: ['OWNER', 'SUPPLIER', 'CONSIGNEE', 'COURIER'],
    })
    expect(result.success).toBe(true)
  })

  // ─── Code validation ─────────────────────────────────────────────────

  it('rejects empty code', () => {
    const result = businessPartyFormSchema.safeParse({ ...validData, code: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('code')
      expect(result.error.issues[0].message).toMatch(/wajib/)
    }
  })

  it('rejects code longer than 32 chars', () => {
    const result = businessPartyFormSchema.safeParse({ ...validData, code: 'A'.repeat(33) })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/32/)
    }
  })

  // ─── Name validation ─────────────────────────────────────────────────

  it('rejects empty name', () => {
    const result = businessPartyFormSchema.safeParse({ ...validData, name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name')
    }
  })

  it('rejects name longer than 128 chars', () => {
    const result = businessPartyFormSchema.safeParse({ ...validData, name: 'B'.repeat(129) })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/128/)
    }
  })

  // ─── Roles validation ────────────────────────────────────────────────

  it('rejects empty roles array', () => {
    const result = businessPartyFormSchema.safeParse({ ...validData, roles: [] })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/satu tipe/)
    }
  })

  it('rejects invalid role value', () => {
    const result = businessPartyFormSchema.safeParse({ ...validData, roles: ['INVALID'] })
    expect(result.success).toBe(false)
  })

  // ─── Status validation ───────────────────────────────────────────────

  it('accepts INACTIVE status', () => {
    const result = businessPartyFormSchema.safeParse({ ...validData, status: 'INACTIVE' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid status', () => {
    const result = businessPartyFormSchema.safeParse({ ...validData, status: 'NONAKTIF' })
    expect(result.success).toBe(false)
  })

  // ─── Optional string trimming ────────────────────────────────────────

  it('trims optional string fields', () => {
    const result = businessPartyFormSchema.safeParse({
      ...validData,
      contactName: '  Budi  ',
      city: '  Jakarta  ',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.contactName).toBe('Budi')
      expect(result.data.city).toBe('Jakarta')
    }
  })

  it('transforms null/undefined optional strings to empty string', () => {
    const result = businessPartyFormSchema.safeParse({
      ...validData,
      npwp: null,
      taxId: undefined,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.npwp).toBe('')
      expect(result.data.taxId).toBe('')
    }
  })

  // ─── Extension attributes ────────────────────────────────────────────

  it('accepts owner extension with numeric fields', () => {
    const result = businessPartyFormSchema.safeParse({
      ...validData,
      ownerAttr: {
        internalAlias: 'UNI',
        overReceiptPct: '5',
        ediCode: 'EDI',
        serviceModel: '',
        expiryPolicyLevel: '',
        expiryWarnDays: '30',
        barcodeParser: '',
        skuPrefix: '',
        notes: '',
      },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.ownerAttr!.overReceiptPct).toBe(5)
      expect(result.data.ownerAttr!.expiryWarnDays).toBe(30)
    }
  })

  it('transforms empty string numeric fields to null', () => {
    const result = businessPartyFormSchema.safeParse({
      ...validData,
      ownerAttr: {
        internalAlias: '',
        overReceiptPct: '',
        ediCode: '',
        serviceModel: '',
        expiryPolicyLevel: '',
        expiryWarnDays: null,
        barcodeParser: '',
        skuPrefix: '',
        notes: '',
      },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.ownerAttr!.overReceiptPct).toBeNull()
      expect(result.data.ownerAttr!.expiryWarnDays).toBeNull()
    }
  })

  it('rejects non-numeric value in numeric extension field', () => {
    const result = businessPartyFormSchema.safeParse({
      ...validData,
      ownerAttr: {
        internalAlias: '',
        overReceiptPct: 'abc',
        ediCode: '',
        serviceModel: '',
        expiryPolicyLevel: '',
        expiryWarnDays: '',
        barcodeParser: '',
        skuPrefix: '',
        notes: '',
      },
    })
    expect(result.success).toBe(false)
  })
})

describe('defaultBusinessPartyFormValues', () => {
  it('has correct defaults', () => {
    expect(defaultBusinessPartyFormValues.status).toBe('ACTIVE')
    expect(defaultBusinessPartyFormValues.countryCode).toBe('ID')
    expect(defaultBusinessPartyFormValues.roles).toEqual([])
  })
})

describe('toBusinessPartyFormData', () => {
  it('converts BusinessParty entity to form data', () => {
    const party: BusinessParty = {
      id: 'bp-1',
      code: 'UNI-001',
      name: 'Unilever',
      npwp: 'NPWP-123',
      taxId: 'TAX-456',
      contactName: 'Budi',
      contactEmail: 'budi@uni.com',
      contactPhone: '08111',
      address: 'Jl. 1',
      city: 'Jakarta',
      province: 'DKI',
      zipcode: '10110',
      countryCode: 'ID',
      roles: ['OWNER', 'SUPPLIER'],
      status: 'ACTIVE',
      ownerAttr: { internalAlias: 'UNI', overReceiptPct: 5, ediCode: 'E1' },
      supplierAttr: { supplierCode: 'S-001', leadTimeDays: 7, originCity: 'Jakarta' },
      createdAt: '2026-01-01',
    }

    const formData = toBusinessPartyFormData(party)

    expect(formData.code).toBe('UNI-001')
    expect(formData.roles).toEqual(['OWNER', 'SUPPLIER'])
    expect(formData.ownerAttr!.internalAlias).toBe('UNI')
    expect(formData.ownerAttr!.overReceiptPct).toBe(5)
    expect(formData.supplierAttr!.supplierCode).toBe('S-001')
    expect(formData.supplierAttr!.leadTimeDays).toBe(7)
  })

  it('defaults missing attrs to empty', () => {
    const party: BusinessParty = {
      id: 'bp-2',
      code: 'X',
      name: 'X',
      npwp: '',
      taxId: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
      city: '',
      province: '',
      zipcode: '',
      countryCode: '',
      roles: ['COURIER'],
      status: 'ACTIVE',
      createdAt: '',
    }

    const formData = toBusinessPartyFormData(party)

    expect(formData.countryCode).toBe('ID') // default fallback
    expect(formData.carrierAttr!.transportMode).toBe('')
  })
})
