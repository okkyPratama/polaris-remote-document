import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPost = vi.hoisted(() => vi.fn())

vi.mock('@polaris/service', () => ({
  fetcher: { post: mockPost },
}))

import { carrierServiceTypeApi } from './carrierServiceType.api'

describe('carrierServiceTypeApi', () => {
  beforeEach(() => {
    mockPost.mockReset()
  })

  // ─── getAll ──────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns mapped service types with total', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: 'cst-1',
              businessPartyId: 'bp-jne',
              carrierName: 'JNE Express',
              carrierCode: 'JNE',
              serviceCode: 'REG',
              serviceName: 'Regular',
              transportMode: 'ROAD',
              transitTimeMinDays: 2,
              transitTimeMaxDays: 4,
              slaDays: 5,
              notes: 'Max 30kg',
              status: 'ACTIVE',
              createdBy: 'admin',
              createdAt: '2026-07-01T00:00:00Z',
            },
          ],
          paging: { totalItems: 1 },
        },
      })

      const result = await carrierServiceTypeApi.getAll()

      expect(result.total).toBe(1)
      expect(result.data[0]).toMatchObject({
        id: 'cst-1',
        businessPartyId: 'bp-jne',
        carrierName: 'JNE Express',
        carrierCode: 'JNE',
        serviceCode: 'REG',
        serviceName: 'Regular',
        transportMode: 'ROAD',
        transitTimeMinDays: 2,
        transitTimeMaxDays: 4,
        slaDays: 5,
        notes: 'Max 30kg',
        status: 'ACTIVE',
      })
    })

    it('applies search filter on serviceName', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await carrierServiceTypeApi.getAll({ search: 'regular' })

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'serviceName',
        operator: 'ilike',
        value: '%regular%',
      })
    })

    it('applies carrierId filter', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await carrierServiceTypeApi.getAll({ carrierId: 'bp-jne' })

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'carrierId',
        operator: '=',
        value: 'bp-jne',
      })
    })

    it('applies status filter when not ALL', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await carrierServiceTypeApi.getAll({ status: 'ACTIVE' })

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'status',
        operator: '=',
        value: 'ACTIVE',
      })
    })

    it('skips status filter when ALL', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await carrierServiceTypeApi.getAll({ status: 'ALL' })

      const body = mockPost.mock.calls[0][1]
      const statusFilter = body.filters?.and?.find((f: { field: string }) => f.field === 'status')
      expect(statusFilter).toBeUndefined()
    })

    it('handles null transit times and sla', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: 'cst-2',
              serviceCode: 'CUSTOM',
              serviceName: 'Custom',
              status: 'ACTIVE',
              transitTimeMinDays: null,
              transitTimeMaxDays: null,
              slaDays: null,
              createdAt: '',
            },
          ],
          paging: { totalItems: 1 },
        },
      })

      const result = await carrierServiceTypeApi.getAll()

      expect(result.data[0].transitTimeMinDays).toBeNull()
      expect(result.data[0].transitTimeMaxDays).toBeNull()
      expect(result.data[0].slaDays).toBeNull()
    })

    it('falls back to alternative field names (carrierId → businessPartyId)', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: 'cst-3',
              carrierId: 'bp-abc',
              businessPartyName: 'ABC Logistics',
              businessPartyCode: 'ABC',
              serviceCode: 'EXP',
              serviceName: 'Express',
              status: 'ACTIVE',
              createdAt: '',
            },
          ],
          paging: { totalItems: 1 },
        },
      })

      const result = await carrierServiceTypeApi.getAll()

      expect(result.data[0].businessPartyId).toBe('bp-abc')
      expect(result.data[0].carrierName).toBe('ABC Logistics')
      expect(result.data[0].carrierCode).toBe('ABC')
    })

    it('returns empty array when no data', async () => {
      mockPost.mockResolvedValue({ data: { data: null, paging: {} } })

      const result = await carrierServiceTypeApi.getAll()

      expect(result.data).toEqual([])
      expect(result.total).toBe(0)
    })
  })

  // ─── getById ─────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns mapped service type detail', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: 'cst-1',
              businessPartyId: 'bp-jne',
              carrierName: 'JNE',
              carrierCode: 'JNE',
              serviceCode: 'YES',
              serviceName: 'Yakin Esok Sampai',
              transportMode: 'ROAD',
              transitTimeMinDays: 1,
              transitTimeMaxDays: 1,
              slaDays: 1,
              status: 'ACTIVE',
              createdAt: '2026-07-01',
            },
          ],
        },
      })

      const st = await carrierServiceTypeApi.getById('cst-1')

      expect(mockPost).toHaveBeenCalledWith('/master-data/carrier-service-types/detailById', { id: 'cst-1' })
      expect(st).toMatchObject({
        serviceCode: 'YES',
        serviceName: 'Yakin Esok Sampai',
        transitTimeMinDays: 1,
      })
    })

    it('throws when service type not found', async () => {
      mockPost.mockResolvedValue({ data: { data: [] } })

      await expect(carrierServiceTypeApi.getById('nonexistent')).rejects.toThrow('Data tipe layanan tidak ditemukan')
    })
  })

  // ─── create ──────────────────────────────────────────────────────────

  describe('create', () => {
    it('posts correct payload with uppercase serviceCode', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Tipe layanan berhasil ditambahkan' })

      const msg = await carrierServiceTypeApi.create({
        businessPartyId: 'bp-jne',
        serviceCode: 'yes',
        serviceName: 'Yakin Esok Sampai',
        transportMode: 'ROAD',
        transitTimeMinDays: '1',
        transitTimeMaxDays: '',
        slaDays: '1',
        notes: 'Max 30kg per paket',
      })

      expect(mockPost).toHaveBeenCalledWith('/master-data/carrier-service-types/save', {
        businessPartyId: 'bp-jne',
        serviceCode: 'YES', // uppercased
        serviceName: 'Yakin Esok Sampai',
        transportMode: 'ROAD',
        transitTimeMinDays: 1,
        transitTimeMaxDays: null, // empty string → null
        slaDays: 1,
        notes: 'Max 30kg per paket',
      })
      expect(msg).toBe('Tipe layanan berhasil ditambahkan')
    })

    it('converts empty transportMode to null', async () => {
      mockPost.mockResolvedValue({ externalDesc: '' })

      await carrierServiceTypeApi.create({
        businessPartyId: 'bp-1',
        serviceCode: 'REG',
        serviceName: 'Regular',
        transportMode: '',
        transitTimeMinDays: '3',
        transitTimeMaxDays: '5',
        slaDays: '',
        notes: '',
      })

      const body = mockPost.mock.calls[0][1]
      expect(body.transportMode).toBeNull()
      expect(body.transitTimeMinDays).toBe(3)
      expect(body.transitTimeMaxDays).toBe(5)
      expect(body.slaDays).toBeNull()
    })
  })

  // ─── update ──────────────────────────────────────────────────────────

  describe('update', () => {
    it('posts payload with id and uppercased serviceCode', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Updated' })

      const msg = await carrierServiceTypeApi.update('cst-1', {
        businessPartyId: 'bp-jne',
        serviceCode: 'reg',
        serviceName: 'Regular Updated',
        transportMode: 'AIR',
        transitTimeMinDays: '1',
        transitTimeMaxDays: '2',
        slaDays: '2',
        notes: 'Updated notes',
      })

      const body = mockPost.mock.calls[0][1]
      expect(body.id).toBe('cst-1')
      expect(body.serviceCode).toBe('REG')
      expect(body.transportMode).toBe('AIR')
      expect(msg).toBe('Updated')
    })
  })

  // ─── deactivate ──────────────────────────────────────────────────────

  describe('deactivate', () => {
    it('posts id and returns message', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Nonaktif' })

      const msg = await carrierServiceTypeApi.deactivate('cst-1')

      expect(mockPost).toHaveBeenCalledWith('/master-data/carrier-service-types/deactivate', { id: 'cst-1' })
      expect(msg).toBe('Nonaktif')
    })
  })
})
