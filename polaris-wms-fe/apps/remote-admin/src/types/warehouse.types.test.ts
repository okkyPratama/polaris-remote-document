import { describe, expect, it } from 'vitest'
import { warehouseFormSchema } from './warehouse.types'

describe('warehouseFormSchema', () => {
  const validData = {
    code: 'WH-JKT',
    name: 'Warehouse Jakarta',
    address: 'Jl. Raya Industri No. 1',
    city: 'Jakarta',
    province: 'DKI Jakarta',
    pic: 'Budi Santoso',
  }

  it('passes with minimum required fields', () => {
    const result = warehouseFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('passes with all optional fields', () => {
    const result = warehouseFormSchema.safeParse({
      ...validData,
      companyId: 'co-1',
      postalCode: '10110',
      capacity: '500',
      area: '1200',
      phone: '021-1234567',
      tempZones: ['Ambient', 'Chiller', 'Freezer'],
      timezone: 'Asia/Jakarta',
      status: 'AKTIF',
    })
    expect(result.success).toBe(true)
  })

  // ─── Code validation ─────────────────────────────────────────────────

  it('rejects empty code', () => {
    const result = warehouseFormSchema.safeParse({ ...validData, code: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('code')
      expect(result.error.issues[0].message).toMatch(/wajib/)
    }
  })

  // ─── Name validation ─────────────────────────────────────────────────

  it('rejects empty name', () => {
    const result = warehouseFormSchema.safeParse({ ...validData, name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name')
    }
  })

  // ─── Address validation ──────────────────────────────────────────────

  it('rejects empty address', () => {
    const result = warehouseFormSchema.safeParse({ ...validData, address: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('address')
    }
  })

  // ─── City validation ─────────────────────────────────────────────────

  it('rejects empty city', () => {
    const result = warehouseFormSchema.safeParse({ ...validData, city: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('city')
    }
  })

  // ─── Province validation ─────────────────────────────────────────────

  it('rejects empty province', () => {
    const result = warehouseFormSchema.safeParse({ ...validData, province: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('province')
    }
  })

  // ─── PIC validation ──────────────────────────────────────────────────

  it('rejects empty pic', () => {
    const result = warehouseFormSchema.safeParse({ ...validData, pic: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('pic')
    }
  })

  // ─── Status validation ───────────────────────────────────────────────

  it('accepts AKTIF status', () => {
    const result = warehouseFormSchema.safeParse({ ...validData, status: 'AKTIF' })
    expect(result.success).toBe(true)
  })

  it('accepts NONAKTIF status', () => {
    const result = warehouseFormSchema.safeParse({ ...validData, status: 'NONAKTIF' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid status value', () => {
    const result = warehouseFormSchema.safeParse({ ...validData, status: 'ACTIVE' })
    expect(result.success).toBe(false)
  })
})
