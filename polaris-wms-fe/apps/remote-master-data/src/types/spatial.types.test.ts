import { describe, expect, it } from 'vitest'
import {
  locationBulkFormSchema,
  locationFormSchema,
  zoneFormSchema,
  zoneGroupFormSchema,
} from '../types/spatial.types'

describe('zoneGroupFormSchema', () => {
  const base = {
    code: 'ZG-1',
    name: 'Dry',
    temperatureMin: null as number | null,
    temperatureMax: null as number | null,
    handlingRulesJson: null as string | null,
    defaultPutawayMode: 'EMPTY_FIRST' as const,
    status: 'ACTIVE' as const,
  }

  it('accepts valid temperature range', () => {
    const result = zoneGroupFormSchema.safeParse({
      ...base,
      temperatureMin: 5,
      temperatureMax: 15,
    })
    expect(result.success).toBe(true)
  })

  it('rejects temperatureMin greater than temperatureMax', () => {
    const result = zoneGroupFormSchema.safeParse({
      ...base,
      temperatureMin: 20,
      temperatureMax: 10,
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid handling-rules JSON', () => {
    const result = zoneGroupFormSchema.safeParse({
      ...base,
      handlingRulesJson: '{"priority":1}',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid handling-rules JSON', () => {
    const result = zoneGroupFormSchema.safeParse({
      ...base,
      handlingRulesJson: '{not-json',
    })
    expect(result.success).toBe(false)
  })

  it('accepts putaway-mode enum values', () => {
    for (const mode of ['EMPTY_FIRST', 'CONSOLIDATE', 'RANDOM'] as const) {
      expect(zoneGroupFormSchema.safeParse({ ...base, defaultPutawayMode: mode }).success).toBe(
        true
      )
    }
  })

  it('rejects unsupported putaway mode', () => {
    const result = zoneGroupFormSchema.safeParse({
      ...base,
      defaultPutawayMode: 'FIFO',
    })
    expect(result.success).toBe(false)
  })
})

describe('zoneFormSchema', () => {
  const base = {
    zoneGroupId: 'zg-1',
    code: 'ZN-1',
    name: 'Zone 1',
    allowedActivities: [] as string[],
    status: 'ACTIVE' as const,
  }

  it('accepts supported activity values including empty list', () => {
    expect(zoneFormSchema.safeParse(base).success).toBe(true)
    expect(
      zoneFormSchema.safeParse({
        ...base,
        allowedActivities: ['RECEIPT', 'PUTAWAY', 'STORAGE'],
      }).success
    ).toBe(true)
  })

  it('rejects unsupported activity values', () => {
    const result = zoneFormSchema.safeParse({
      ...base,
      allowedActivities: ['FLY'],
    })
    expect(result.success).toBe(false)
  })

  it('rejects duplicate activities', () => {
    const result = zoneFormSchema.safeParse({
      ...base,
      allowedActivities: ['RECEIPT', 'RECEIPT'],
    })
    expect(result.success).toBe(false)
  })
})

describe('locationFormSchema', () => {
  const base = {
    zoneId: 'z-1',
    code: 'LOC-1',
    name: null as string | null,
    locationType: 'STORAGE' as const,
    sequence: 0,
    maxLpnCount: null as number | null,
    maxWeightKg: null as number | null,
    status: 'ACTIVE' as const,
  }

  it('accepts zero sequence and empty capacities', () => {
    expect(locationFormSchema.safeParse(base).success).toBe(true)
  })

  it('accepts positive capacities and decimal weight', () => {
    expect(
      locationFormSchema.safeParse({
        ...base,
        maxLpnCount: 10,
        maxWeightKg: 12.5,
      }).success
    ).toBe(true)
  })

  it('rejects zero/negative/decimal LPN capacity', () => {
    expect(locationFormSchema.safeParse({ ...base, maxLpnCount: 0 }).success).toBe(false)
    expect(locationFormSchema.safeParse({ ...base, maxLpnCount: -1 }).success).toBe(false)
    expect(locationFormSchema.safeParse({ ...base, maxLpnCount: 1.5 }).success).toBe(false)
  })

  it('rejects decimal sequence', () => {
    expect(locationFormSchema.safeParse({ ...base, sequence: 1.2 }).success).toBe(false)
  })

  it('excludes BLOCKED from normal form status', () => {
    expect(locationFormSchema.safeParse({ ...base, status: 'BLOCKED' }).success).toBe(false)
  })
})

describe('locationBulkFormSchema', () => {
  const row = {
    zoneId: 'z-1',
    code: 'LOC-01',
    name: null as string | null,
    locationType: 'STORAGE' as const,
    sequence: 0,
    maxLpnCount: null as number | null,
    maxWeightKg: null as number | null,
  }

  it('requires at least one row', () => {
    expect(locationBulkFormSchema.safeParse({ items: [] }).success).toBe(false)
  })

  it('accepts multiple valid rows', () => {
    expect(
      locationBulkFormSchema.safeParse({
        items: [row, { ...row, code: 'LOC-02' }],
      }).success
    ).toBe(true)
  })

  it('rejects case-insensitive duplicate codes', () => {
    const result = locationBulkFormSchema.safeParse({
      items: [row, { ...row, code: 'loc-01' }],
    })
    expect(result.success).toBe(false)
  })
})
