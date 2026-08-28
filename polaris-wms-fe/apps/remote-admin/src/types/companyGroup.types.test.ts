import { describe, expect, it } from 'vitest'
import { companyGroupFormSchema } from './companyGroup.types'

describe('companyGroupFormSchema', () => {
  const validData = {
    code: 'GRP-A',
    name: 'Group A',
  }

  it('passes with minimum required fields', () => {
    const result = companyGroupFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('passes with all optional fields', () => {
    const result = companyGroupFormSchema.safeParse({
      ...validData,
      industry: 'Logistics',
      description: 'A logistics group',
      contactName: 'Budi',
      contactEmail: 'budi@company.id',
      contactPhone: '08111222333',
      address: 'Jl. Raya 1',
      status: 'AKTIF',
    })
    expect(result.success).toBe(true)
  })

  // ─── Code validation ─────────────────────────────────────────────────

  it('rejects empty code', () => {
    const result = companyGroupFormSchema.safeParse({ ...validData, code: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('code')
      expect(result.error.issues[0].message).toMatch(/wajib/)
    }
  })

  // ─── Name validation ─────────────────────────────────────────────────

  it('rejects empty name', () => {
    const result = companyGroupFormSchema.safeParse({ ...validData, name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name')
      expect(result.error.issues[0].message).toMatch(/wajib/)
    }
  })

  // ─── Email validation ────────────────────────────────────────────────

  it('rejects invalid email format', () => {
    const result = companyGroupFormSchema.safeParse({ ...validData, contactEmail: 'notanemail' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('contactEmail')
    }
  })

  it('accepts empty string email (optional)', () => {
    const result = companyGroupFormSchema.safeParse({ ...validData, contactEmail: '' })
    expect(result.success).toBe(true)
  })

  it('accepts valid email', () => {
    const result = companyGroupFormSchema.safeParse({ ...validData, contactEmail: 'test@co.id' })
    expect(result.success).toBe(true)
  })

  // ─── Status validation ───────────────────────────────────────────────

  it('accepts AKTIF status', () => {
    const result = companyGroupFormSchema.safeParse({ ...validData, status: 'AKTIF' })
    expect(result.success).toBe(true)
  })

  it('accepts NONAKTIF status', () => {
    const result = companyGroupFormSchema.safeParse({ ...validData, status: 'NONAKTIF' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid status value', () => {
    const result = companyGroupFormSchema.safeParse({ ...validData, status: 'ACTIVE' })
    expect(result.success).toBe(false)
  })
})
