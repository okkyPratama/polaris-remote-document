import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPost = vi.hoisted(() => vi.fn())

vi.mock('@polaris/service', () => ({
  fetcher: { post: mockPost },
}))

import { warehouseApi } from './warehouse.api'

describe('warehouseApi', () => {
  beforeEach(() => {
    mockPost.mockReset()
  })

  // ─── getAll ──────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns mapped warehouses with status conversion', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: 'wh-1',
              code: 'WH-JKT',
              name: 'Warehouse Jakarta',
              address: 'Jl. Raya 1',
              city: 'Jakarta',
              province: 'DKI',
              status: 'ACTIVE',
              createdAt: '2026-01-01',
              createdBy: 'admin',
              timezone: 'Asia/Jakarta',
              palletCapacity: 500,
              areaSize: 1200,
              pic: 'Budi',
              phonePic: '081234567890',
              temperatureZone: 'Ambient,Chiller',
              companyId: 'co-1',
              companyCode: 'CO-001',
              companyName: 'PT Example',
            },
          ],
          paging: { totalItems: 1 },
        },
      })

      const result = await warehouseApi.getAll()

      expect(result.total).toBe(1)
      expect(result.data[0]).toMatchObject({
        id: 'wh-1',
        code: 'WH-JKT',
        name: 'Warehouse Jakarta',
        status: 'AKTIF', // mapped from ACTIVE
        capacity: 500,
        area: 1200,
        pic: 'Budi',
        phone: '081234567890',
        tempZones: ['Ambient', 'Chiller'],
        companyName: 'PT Example',
      })
    })

    it('maps INACTIVE status to NONAKTIF', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: 'wh-2',
              code: 'WH-SBY',
              name: 'WH Surabaya',
              status: 'INACTIVE',
              createdAt: '2026-01-01',
            },
          ],
          paging: { totalItems: 1 },
        },
      })

      const result = await warehouseApi.getAll()

      expect(result.data[0].status).toBe('NONAKTIF')
    })

    it('applies search filter', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await warehouseApi.getAll({ search: 'jakarta' })

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'name',
        operator: 'ilike',
        value: '%jakarta%',
      })
    })

    it('maps AKTIF status filter to ACTIVE for API', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await warehouseApi.getAll({ status: 'AKTIF' })

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'status',
        operator: '=',
        value: 'ACTIVE',
      })
    })

    it('maps NONAKTIF status filter to INACTIVE for API', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await warehouseApi.getAll({ status: 'NONAKTIF' })

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'status',
        operator: '=',
        value: 'INACTIVE',
      })
    })

    it('skips status filter when ALL', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await warehouseApi.getAll({ status: 'ALL' })

      const body = mockPost.mock.calls[0][1]
      const statusFilter = body.filters.and.find((f: { field: string }) => f.field === 'status')
      expect(statusFilter).toBeUndefined()
    })

    it('applies companyIdNull filter', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await warehouseApi.getAll({ companyIdNull: true })

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'companyId',
        operator: 'isnull',
        value: '',
      })
    })

    it('handles empty temperatureZone string', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [{ id: 'wh-3', code: 'X', name: 'X', status: 'ACTIVE', createdAt: '', temperatureZone: '' }],
          paging: { totalItems: 1 },
        },
      })

      const result = await warehouseApi.getAll()

      expect(result.data[0].tempZones).toEqual([])
    })

    it('returns empty data when API returns null', async () => {
      mockPost.mockResolvedValue({ data: { data: null, paging: {} } })

      const result = await warehouseApi.getAll()

      expect(result.data).toEqual([])
    })
  })

  // ─── getById ─────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns mapped warehouse detail', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: 'wh-1',
              code: 'WH-JKT',
              name: 'WH Jakarta',
              status: 'ACTIVE',
              createdAt: '2026-01-01',
              palletCapacity: 100,
              areaSize: 500,
              temperatureZone: 'Freezer',
            },
          ],
        },
      })

      const wh = await warehouseApi.getById('wh-1')

      expect(mockPost).toHaveBeenCalledWith('/master-data/warehouses/detailById', { id: 'wh-1' })
      expect(wh).toMatchObject({
        id: 'wh-1',
        status: 'AKTIF',
        capacity: 100,
        area: 500,
        tempZones: ['Freezer'],
      })
    })

    it('throws when warehouse not found', async () => {
      mockPost.mockResolvedValue({ data: { data: [] } })

      await expect(warehouseApi.getById('nonexistent')).rejects.toThrow('Warehouse not found')
    })
  })

  // ─── create ──────────────────────────────────────────────────────────

  describe('create', () => {
    it('posts correct payload with status and tempZone mapping', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Gudang berhasil dibuat' })

      const msg = await warehouseApi.create({
        code: 'WH-NEW',
        name: 'New Warehouse',
        companyId: 'co-1',
        address: 'Jl. Baru 1',
        city: 'Bandung',
        province: 'Jabar',
        postalCode: '40100',
        capacity: '200',
        area: '800',
        pic: 'Andi',
        phone: '08111',
        tempZones: ['Ambient', 'Freezer'],
        status: 'AKTIF',
      })

      expect(mockPost).toHaveBeenCalledWith('/master-data/warehouses/save', {
        code: 'WH-NEW',
        name: 'New Warehouse',
        companyId: 'co-1',
        address: 'Jl. Baru 1',
        city: 'Bandung',
        province: 'Jabar',
        postalCode: '40100',
        palletCapacity: 200,
        areaSize: 800,
        pic: 'Andi',
        phonePic: '08111',
        temperatureZone: 'Ambient,Freezer',
        status: 'ACTIVE',
      })
      expect(msg).toBe('Gudang berhasil dibuat')
    })

    it('maps NONAKTIF status to INACTIVE', async () => {
      mockPost.mockResolvedValue({ externalDesc: '' })

      await warehouseApi.create({
        code: 'X',
        name: 'X',
        address: 'X',
        city: 'X',
        province: 'X',
        pic: 'X',
        status: 'NONAKTIF',
      })

      const body = mockPost.mock.calls[0][1]
      expect(body.status).toBe('INACTIVE')
    })

    it('defaults capacity and area to 0 when empty', async () => {
      mockPost.mockResolvedValue({ externalDesc: '' })

      await warehouseApi.create({
        code: 'X',
        name: 'X',
        address: 'X',
        city: 'X',
        province: 'X',
        pic: 'X',
      })

      const body = mockPost.mock.calls[0][1]
      expect(body.palletCapacity).toBe(0)
      expect(body.areaSize).toBe(0)
    })
  })

  // ─── update ──────────────────────────────────────────────────────────

  describe('update', () => {
    it('posts correct payload with id (code excluded)', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Updated' })

      const msg = await warehouseApi.update('wh-1', {
        code: 'WH-JKT',
        name: 'WH Jakarta Updated',
        address: 'Jl. New',
        city: 'Jakarta',
        province: 'DKI',
        pic: 'Budi',
        capacity: '300',
        area: '1000',
        tempZones: ['Chiller'],
        status: 'AKTIF',
      })

      const body = mockPost.mock.calls[0][1]
      expect(body.id).toBe('wh-1')
      expect(body.name).toBe('WH Jakarta Updated')
      expect(body.code).toBeUndefined() // code not sent on update
      expect(body.palletCapacity).toBe(300)
      expect(body.temperatureZone).toBe('Chiller')
      expect(body.status).toBe('ACTIVE')
      expect(msg).toBe('Updated')
    })
  })

  // ─── delete ──────────────────────────────────────────────────────────

  describe('delete', () => {
    it('posts id and returns message', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Deleted' })

      const msg = await warehouseApi.delete('wh-1')

      expect(mockPost).toHaveBeenCalledWith('/master-data/warehouses/delete', { id: 'wh-1' })
      expect(msg).toBe('Deleted')
    })
  })
})
