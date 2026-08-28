import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  UomCodeDetail,
  UomCodeHeader,
} from '../api/uom-code-options.api'

const { getAll, getById } = vi.hoisted(() => ({
  getAll: vi.fn(),
  getById: vi.fn(),
}))

vi.mock('../api/uom-code-options.api', () => ({
  uomCodeOptionsApi: {
    getAll,
    getById,
  },
}))

vi.mock('../api/uom.api', () => ({
  uomApi: {},
}))

import { fetchUomCodeOptions } from './useUoms'

const OWNER_A = 'owner-a'
const OWNER_B = 'owner-b'

function makeDetail(
  overrides: Partial<UomCodeDetail> & Pick<UomCodeDetail, 'codeId' | 'codeName'>
): UomCodeDetail {
  return {
    codeId: overrides.codeId,
    codeName: overrides.codeName,
    sequence: overrides.sequence ?? 0,
    ownerId: overrides.ownerId ?? '',
    warehouseId: overrides.warehouseId ?? '',
    status: overrides.status ?? 'AKTIF',
  }
}

function makeHeader(overrides?: Partial<UomCodeHeader>): UomCodeHeader {
  return {
    id: 'uom-group-header',
    typeCode: 'UOM_GROUP',
    status: 'AKTIF',
    ...overrides,
  }
}

describe('fetchUomCodeOptions', () => {
  beforeEach(() => {
    getAll.mockReset()
    getById.mockReset()
  })

  it('returns options from exact active UOM_GROUP header', async () => {
    getAll.mockResolvedValue([
      makeHeader({ typeCode: 'UOM_GROUP_X' }),
      makeHeader({ id: 'uom-group-header', typeCode: 'UOM_GROUP', status: 'AKTIF' }),
    ])
    getById.mockResolvedValue({
      ...makeHeader(),
      details: [
        makeDetail({ codeId: 'EA', codeName: 'Each', sequence: 1 }),
        makeDetail({ codeId: 'IP', codeName: 'Inner Pack', sequence: 2 }),
      ],
    })

    const options = await fetchUomCodeOptions(OWNER_A)

    expect(getById).toHaveBeenCalledWith('uom-group-header')
    expect(options).toEqual([
      { code: 'EA', name: 'Each' },
      { code: 'IP', name: 'Inner Pack' },
    ])
  })

  it('drops inactive, warehouse-specific, and other-owner details', async () => {
    getAll.mockResolvedValue([makeHeader()])
    getById.mockResolvedValue({
      ...makeHeader(),
      details: [
        makeDetail({ codeId: 'EA', codeName: 'Each', sequence: 1 }),
        makeDetail({ codeId: 'ZZ', codeName: 'Inactive', sequence: 2, status: 'NONAKTIF' }),
        makeDetail({
          codeId: 'WH',
          codeName: 'Warehouse scoped',
          sequence: 3,
          warehouseId: 'wh-1',
        }),
        makeDetail({
          codeId: 'OB',
          codeName: 'Other owner',
          sequence: 4,
          ownerId: OWNER_B,
        }),
      ],
    })

    const options = await fetchUomCodeOptions(OWNER_A)

    expect(options).toEqual([{ code: 'EA', name: 'Each' }])
  })

  it('lets owner-specific detail override global for the same codeId', async () => {
    getAll.mockResolvedValue([makeHeader()])
    getById.mockResolvedValue({
      ...makeHeader(),
      details: [
        makeDetail({ codeId: 'IP', codeName: 'Inner Pack Global', sequence: 2, ownerId: '' }),
        makeDetail({
          codeId: 'IP',
          codeName: 'Inner Pack Owner A',
          sequence: 9,
          ownerId: OWNER_A,
        }),
        makeDetail({ codeId: 'EA', codeName: 'Each', sequence: 1 }),
      ],
    })

    const options = await fetchUomCodeOptions(OWNER_A)

    expect(options).toEqual([
      { code: 'EA', name: 'Each' },
      { code: 'IP', name: 'Inner Pack Owner A' },
    ])
  })

  it('sorts by sequence ASC then codeId ASC', async () => {
    getAll.mockResolvedValue([makeHeader()])
    getById.mockResolvedValue({
      ...makeHeader(),
      details: [
        makeDetail({ codeId: 'CT', codeName: 'Carton', sequence: 2 }),
        makeDetail({ codeId: 'CS', codeName: 'Case', sequence: 2 }),
        makeDetail({ codeId: 'PL', codeName: 'Pallet', sequence: 3 }),
        makeDetail({ codeId: 'EA', codeName: 'Each', sequence: 1 }),
      ],
    })

    const options = await fetchUomCodeOptions(OWNER_A)

    expect(options.map((option) => option.code)).toEqual(['EA', 'CS', 'CT', 'PL'])
  })

  it('rejects when UOM_GROUP header is missing or inactive', async () => {
    getAll.mockResolvedValue([makeHeader({ typeCode: 'OTHER', status: 'AKTIF' })])

    await expect(fetchUomCodeOptions(OWNER_A)).rejects.toThrow(
      /Master Code UOM_GROUP tidak tersedia atau tidak aktif/
    )

    getAll.mockResolvedValue([
      makeHeader({ typeCode: 'UOM_GROUP', status: 'NONAKTIF' }),
    ])

    await expect(fetchUomCodeOptions(OWNER_A)).rejects.toThrow(
      /Master Code UOM_GROUP tidak tersedia atau tidak aktif/
    )
    expect(getById).not.toHaveBeenCalled()
  })
})
