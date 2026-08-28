import { describe, expect, it } from 'vitest'
import { userFormSchema } from './user.types'

describe('userFormSchema', () => {
  const validData = {
    username: 'admin',
    fullName: 'Admin User',
    email: 'admin@polaris.id',
    status: 'ACTIVE' as const,
  }

  it('passes with valid data', () => {
    const result = userFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('passes with optional roleIds and warehouseIds', () => {
    const result = userFormSchema.safeParse({
      ...validData,
      roleIds: ['r1', 'r2'],
      warehouseIds: ['w1'],
      ownerIds: ['o1'],
    })
    expect(result.success).toBe(true)
  })

  // ─── Username validation ─────────────────────────────────────────────

  it('rejects empty username', () => {
    const result = userFormSchema.safeParse({ ...validData, username: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('username')
    }
  })

  it('rejects username with spaces', () => {
    const result = userFormSchema.safeParse({ ...validData, username: 'admin user' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/spasi/)
    }
  })

  // ─── FullName validation ─────────────────────────────────────────────

  it('rejects empty fullName', () => {
    const result = userFormSchema.safeParse({ ...validData, fullName: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('fullName')
    }
  })

  // ─── Email validation ────────────────────────────────────────────────

  it('rejects empty email', () => {
    const result = userFormSchema.safeParse({ ...validData, email: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email format', () => {
    const result = userFormSchema.safeParse({ ...validData, email: 'notanemail' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/email/)
    }
  })

  it('rejects email with spaces', () => {
    const result = userFormSchema.safeParse({ ...validData, email: 'admin @co.id' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.match(/spasi/))).toBe(true)
    }
  })

  // ─── Status validation ───────────────────────────────────────────────

  it('rejects invalid status', () => {
    const result = userFormSchema.safeParse({ ...validData, status: 'SUSPENDED' })
    expect(result.success).toBe(false)
  })

  it('accepts INACTIVE status', () => {
    const result = userFormSchema.safeParse({ ...validData, status: 'INACTIVE' })
    expect(result.success).toBe(true)
  })
})
