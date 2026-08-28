import { beforeEach, describe, expect, it, vi } from 'vitest'
import { zoneGroupApi } from './zone-group.api'
import { zoneApi } from './zone.api'
import { locationApi } from './location.api'

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
}))

vi.mock('@polaris/service', () => ({
  fetcher: {
    post: postMock,
  },
}))

function respondWith(raw: Record<string, unknown>) {
  postMock.mockResolvedValueOnce({
    data: {
      data: [raw],
      paging: { totalItems: 1 },
    },
  })
}

const validZoneGroup = {
  id: 'zg-1',
  warehouseId: 'wh-1',
  code: 'ZG-1',
  name: 'Zone Group 1',
  temperatureMin: null,
  temperatureMax: null,
  handlingRulesJson: null,
  defaultPutawayMode: 'EMPTY_FIRST',
  status: 'ACTIVE',
  createdAt: '2026-08-13T00:00:00Z',
}

const validZone = {
  id: 'z-1',
  warehouseId: 'wh-1',
  zoneGroupId: 'zg-1',
  code: 'Z-1',
  name: 'Zone 1',
  allowedActivities: ['STORAGE', 'PICK'],
  status: 'ACTIVE',
  createdAt: '2026-08-13T00:00:00Z',
}

const validLocation = {
  id: 'loc-1',
  warehouseId: 'wh-1',
  zoneId: 'z-1',
  code: 'LOC-1',
  name: 'Location 1',
  locationType: 'STORAGE',
  sequence: 1,
  maxLpnCount: null,
  maxWeightKg: null,
  status: 'ACTIVE',
  createdAt: '2026-08-13T00:00:00Z',
}

describe('Spatial API response mapping', () => {
  beforeEach(() => {
    postMock.mockReset()
  })

  it('rejects unknown Zone Group status', async () => {
    respondWith({ ...validZoneGroup, status: 'BROKEN' })

    await expect(zoneGroupApi.getAll()).rejects.toThrow(
      'Invalid Zone Group status received from API: BROKEN'
    )
  })

  it('rejects unknown Zone Group putaway mode', async () => {
    respondWith({ ...validZoneGroup, defaultPutawayMode: 'FIFO' })

    await expect(zoneGroupApi.getAll()).rejects.toThrow(
      'Invalid Zone Group putaway mode received from API: FIFO'
    )
  })

  it('rejects unknown Zone status', async () => {
    respondWith({ ...validZone, status: 'BROKEN' })

    await expect(zoneApi.getAll()).rejects.toThrow(
      'Invalid Zone status received from API: BROKEN'
    )
  })

  it('rejects unknown Zone activity', async () => {
    respondWith({
      ...validZone,
      allowedActivities: ['STORAGE', 'TELEPORT'],
    })

    await expect(zoneApi.getAll()).rejects.toThrow(
      'Invalid Zone activity received from API: TELEPORT'
    )
  })

  it('rejects unknown Location status', async () => {
    respondWith({ ...validLocation, status: 'DAMAGED' })

    await expect(locationApi.getAll()).rejects.toThrow(
      'Invalid Location status received from API: DAMAGED'
    )
  })

  it('rejects unknown Location type', async () => {
    respondWith({ ...validLocation, locationType: 'FLOOR' })

    await expect(locationApi.getAll()).rejects.toThrow(
      'Invalid Location type received from API: FLOOR'
    )
  })

  it('posts Zone Group options without pagination or filter payload', async () => {
    postMock.mockResolvedValueOnce({
      data: {
        data: [
          { id: 'zg-1', code: 'ZG-DRY', name: 'Dry Storage' },
          { id: 'zg-2', code: 'ZG-COLD', name: 'Cold Storage', status: 'ACTIVE' },
        ],
      },
    })

    const options = await zoneGroupApi.getOptions()

    expect(postMock).toHaveBeenCalledTimes(1)
    expect(postMock).toHaveBeenCalledWith('/master-data/zone-groups/options', {})
    const body = postMock.mock.calls[0][1] as Record<string, unknown>
    expect(body).not.toHaveProperty('paging')
    expect(body).not.toHaveProperty('filters')
    expect(body).not.toHaveProperty('page')
    expect(body).not.toHaveProperty('pageSize')
    expect(body).not.toHaveProperty('status')
    expect(options).toEqual([
      { id: 'zg-1', code: 'ZG-DRY', name: 'Dry Storage' },
      { id: 'zg-2', code: 'ZG-COLD', name: 'Cold Storage' },
    ])
  })

  it('posts warehouse-wide Zone options without pagination or zoneGroupId', async () => {
    postMock.mockResolvedValueOnce({
      data: {
        data: [
          { id: 'z-1', code: 'Z-DRY', name: 'Dry Zone' },
          { id: 'z-2', code: 'Z-COLD', name: 'Cold Zone', status: 'ACTIVE' },
        ],
      },
    })

    const options = await zoneApi.getOptions()

    expect(postMock).toHaveBeenCalledTimes(1)
    expect(postMock).toHaveBeenCalledWith('/master-data/zones/options', {})
    const body = postMock.mock.calls[0][1] as Record<string, unknown>
    expect(body).not.toHaveProperty('paging')
    expect(body).not.toHaveProperty('filters')
    expect(body).not.toHaveProperty('page')
    expect(body).not.toHaveProperty('pageSize')
    expect(body).not.toHaveProperty('status')
    expect(body).not.toHaveProperty('zoneGroupId')
    expect(options).toEqual([
      { id: 'z-1', code: 'Z-DRY', name: 'Dry Zone' },
      { id: 'z-2', code: 'Z-COLD', name: 'Cold Zone' },
    ])
  })

  it('posts parent-scoped Zone options with zoneGroupId only', async () => {
    postMock.mockResolvedValueOnce({
      data: {
        data: [{ id: 'z-1', code: 'Z-DRY', name: 'Dry Zone' }],
      },
    })

    await zoneApi.getOptions('zg-1')

    expect(postMock).toHaveBeenCalledWith('/master-data/zones/options', {
      zoneGroupId: 'zg-1',
    })
  })

  it('keeps Zone Group grid getAll on the paginated endpoint', async () => {
    respondWith(validZoneGroup)

    await zoneGroupApi.getAll({ page: 1, pageSize: 25 })

    expect(postMock).toHaveBeenCalledWith(
      '/master-data/zone-groups/getAll',
      expect.objectContaining({
        paging: expect.objectContaining({ page: 1, pageSize: 25 }),
      })
    )
  })
})
