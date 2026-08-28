import { describe, expect, it } from 'vitest'
import { mapSpatialOption, mapSpatialOptions } from './spatial-api.parsers'

describe('mapSpatialOption', () => {
  it('accepts a valid compact { id, code, name } item', () => {
    expect(
      mapSpatialOption({ id: 'zg-1', code: 'ZG-DRY', name: 'Dry Storage' })
    ).toEqual({ id: 'zg-1', code: 'ZG-DRY', name: 'Dry Storage' })
  })

  it('strips extra fields', () => {
    expect(
      mapSpatialOption({
        id: 'zg-1',
        code: 'ZG-DRY',
        name: 'Dry Storage',
        warehouseId: 'wh-1',
        warehouseCode: 'WH-1',
        temperatureMin: 0,
        temperatureMax: 8,
        status: 'ACTIVE',
        createdAt: '2026-08-13T00:00:00Z',
        createdBy: 'admin',
      })
    ).toEqual({ id: 'zg-1', code: 'ZG-DRY', name: 'Dry Storage' })
  })

  it('rejects malformed items without coercing', () => {
    expect(() => mapSpatialOption(null)).toThrow(/Invalid Spatial option/)
    expect(() => mapSpatialOption('zg-1')).toThrow(/Invalid Spatial option/)
    expect(() => mapSpatialOption({ code: 'ZG-DRY', name: 'Dry' })).toThrow(
      /Invalid Spatial option/
    )
    expect(() => mapSpatialOption({ id: '', code: 'ZG-DRY', name: 'Dry' })).toThrow(
      /Invalid Spatial option/
    )
    expect(() => mapSpatialOption({ id: 1, code: 'ZG-DRY', name: 'Dry' })).toThrow(
      /Invalid Spatial option/
    )
    expect(() =>
      mapSpatialOption({ id: 'zg-1', code: 'ZG-DRY', name: '' })
    ).toThrow(/Invalid Spatial option/)
  })
})

describe('mapSpatialOptions', () => {
  it('preserves backend order and does not re-sort', () => {
    expect(
      mapSpatialOptions([
        { id: 'zg-b', code: 'ZG-B', name: 'Beta' },
        { id: 'zg-a', code: 'ZG-A', name: 'Alpha' },
      ]).map((item) => item.code)
    ).toEqual(['ZG-B', 'ZG-A'])
  })

  it('rejects a non-array payload', () => {
    expect(() => mapSpatialOptions({ id: 'zg-1', code: 'ZG-DRY', name: 'Dry' })).toThrow(
      /Invalid Spatial options/
    )
  })

  it('rejects when any item is malformed', () => {
    expect(() =>
      mapSpatialOptions([
        { id: 'zg-1', code: 'ZG-DRY', name: 'Dry' },
        { id: 'zg-2', code: 'ZG-WET' },
      ])
    ).toThrow(/Invalid Spatial option/)
  })
})
