import { describe, expect, it } from 'vitest'
import { roleFormSchema } from './role.types'

describe('roleFormSchema', () => {
  const validData = {
    code: 'OPERATOR',
    name: 'Operator',
    description: 'Warehouse operator role',
    warehouseIds: ['wh-1'],
    permissionIds: ['p1', 'p2'],
  }

  it('passes with valid data', () => {
    const result = roleFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('passes without optional fields', () => {
    const result = roleFormSchema.safeParse({
      code: 'ADMIN',
      name: 'Admin',
      permissionIds: ['p1'],
    })
    expect(result.success).toBe(true)
  })

  // ─── Code validation ─────────────────────────────────────────────────

  it('rejects empty code', () => {
    const result = roleFormSchema.safeParse({ ...validData, code: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('code')
      expect(result.error.issues[0].message).toMatch(/wajib/)
    }
  })

  // ─── Name validation ─────────────────────────────────────────────────

  it('rejects empty name', () => {
    const result = roleFormSchema.safeParse({ ...validData, name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name')
    }
  })

  // ─── PermissionIds validation ────────────────────────────────────────

  it('rejects empty permissionIds array', () => {
    const result = roleFormSchema.safeParse({ ...validData, permissionIds: [] })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('permissionIds')
      expect(result.error.issues[0].message).toMatch(/1 izin/)
    }
  })

  it('rejects missing permissionIds', () => {
    const { permissionIds: _, ...noPerms } = validData
    const result = roleFormSchema.safeParse(noPerms)
    expect(result.success).toBe(false)
  })

  // ─── Optional fields ─────────────────────────────────────────────────

  it('accepts empty description', () => {
    const result = roleFormSchema.safeParse({ ...validData, description: '' })
    expect(result.success).toBe(true)
  })

  it('accepts empty warehouseIds (no scope restriction)', () => {
    const result = roleFormSchema.safeParse({ ...validData, warehouseIds: [] })
    expect(result.success).toBe(true)
  })
})
