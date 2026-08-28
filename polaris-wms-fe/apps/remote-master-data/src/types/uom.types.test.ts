import { describe, expect, it } from 'vitest'
import { uomHierarchyFormSchema } from './uom.types'

const validHierarchy = {
  ownerId: ' owner-1 ',
  skuCode: ' sku-001 ',
  status: 'ACTIVE' as const,
  levels: [
    {
      id: '',
      uomCode: ' ea ',
      displayName: ' Each ',
      level: 1,
      conversionFactorToEa: 1,
      parentUomCode: null,
      status: 'ACTIVE' as const,
    },
    {
      id: '',
      uomCode: ' ct ',
      displayName: ' Carton ',
      level: 3,
      conversionFactorToEa: 12,
      parentUomCode: ' ea ',
      status: 'ACTIVE' as const,
    },
  ],
}

describe('uomHierarchyFormSchema', () => {
  it('normalizes identity/codes and accepts backend-compatible level gaps', () => {
    const result = uomHierarchyFormSchema.parse(validHierarchy)

    expect(result.ownerId).toBe('owner-1')
    expect(result.skuCode).toBe('SKU-001')
    expect(result.levels[0]).toMatchObject({ uomCode: 'EA', displayName: 'Each' })
    expect(result.levels[1]).toMatchObject({ uomCode: 'CT', parentUomCode: 'EA', level: 3 })
  })

  it('sorts hierarchy by level before submission', () => {
    const result = uomHierarchyFormSchema.parse({
      ...validHierarchy,
      levels: [...validHierarchy.levels].reverse(),
    })

    expect(result.levels.map((level) => level.uomCode)).toEqual(['EA', 'CT'])
  })

  it('requires exactly one valid and active EA base', () => {
    expect(
      uomHierarchyFormSchema.safeParse({
        ...validHierarchy,
        levels: validHierarchy.levels.filter((level) => level.uomCode.trim() !== 'ea'),
      }).success
    ).toBe(false)

    for (const patch of [
      { level: 2 },
      { conversionFactorToEa: 2 },
      { parentUomCode: 'CT' },
      { status: 'INACTIVE' as const },
    ]) {
      const levels = [{ ...validHierarchy.levels[0], ...patch }]
      expect(uomHierarchyFormSchema.safeParse({ ...validHierarchy, levels }).success).toBe(false)
    }
  })

  it('rejects duplicate UOM codes and levels', () => {
    expect(
      uomHierarchyFormSchema.safeParse({
        ...validHierarchy,
        levels: [...validHierarchy.levels, { ...validHierarchy.levels[1], level: 4 }],
      }).success
    ).toBe(false)

    expect(
      uomHierarchyFormSchema.safeParse({
        ...validHierarchy,
        levels: [
          validHierarchy.levels[0],
          { ...validHierarchy.levels[1], uomCode: 'IP', level: 1 },
        ],
      }).success
    ).toBe(false)
  })

  it('rejects broken parent chains and invalid cumulative factors', () => {
    for (const patch of [
      { parentUomCode: 'IP' },
      { conversionFactorToEa: 1 },
    ]) {
      const levels = [validHierarchy.levels[0], { ...validHierarchy.levels[1], ...patch }]
      expect(uomHierarchyFormSchema.safeParse({ ...validHierarchy, levels }).success).toBe(false)
    }

    const nonDivisibleLevels = [
      validHierarchy.levels[0],
      validHierarchy.levels[1],
      {
        ...validHierarchy.levels[1],
        uomCode: 'CS',
        level: 4,
        conversionFactorToEa: 25,
        parentUomCode: 'CT',
      },
    ]
    expect(
      uomHierarchyFormSchema.safeParse({ ...validHierarchy, levels: nonDivisibleLevels }).success
    ).toBe(false)
  })

  it('rejects non-positive, decimal, unsafe, and more than five levels', () => {
    for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      const levels = [
        validHierarchy.levels[0],
        { ...validHierarchy.levels[1], conversionFactorToEa: value },
      ]
      expect(uomHierarchyFormSchema.safeParse({ ...validHierarchy, levels }).success).toBe(false)
    }

    const levels = [validHierarchy.levels[0]]
    for (let index = 2; index <= 6; index += 1) {
      levels.push({
        ...validHierarchy.levels[1],
        uomCode: `U${index}`,
        level: index,
        conversionFactorToEa: 12 ** (index - 1),
        parentUomCode: index === 2 ? 'EA' : `U${index - 1}`,
      })
    }
    expect(uomHierarchyFormSchema.safeParse({ ...validHierarchy, levels }).success).toBe(false)
  })
})
