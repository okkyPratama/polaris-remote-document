import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPost = vi.hoisted(() => vi.fn())

vi.mock('@polaris/service', () => ({
  fetcher: { post: mockPost },
}))

import { companiesApi } from './companies.api'

describe('companiesApi', () => {
  beforeEach(() => {
    mockPost.mockReset()
  })

  // ─── getAll ──────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns mapped companies with status conversion', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: 'co-1',
              code: 'PT-001',
              name: 'PT Example',
              status: 'ACTIVE',
              createdAt: '2026-03-15T10:30:00Z',
              warehouseCount: 3,
              CompanyGroupCode: 'GRP-A',
              CompanyGroupName: 'Group A',
            },
          ],
          paging: { totalItems: 1 },
        },
      })

      const result = await companiesApi.getAll()

      expect(result.total).toBe(1)
      expect(result.data[0]).toMatchObject({
        id: 'co-1',
        code: 'PT-001',
        name: 'PT Example',
        status: 'AKTIF',
        warehouseCount: 3,
        companyGroupCode: 'GRP-A',
        companyGroupName: 'Group A',
      })
    })

    it('maps INACTIVE status to NONAKTIF', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [{ id: 'co-2', code: 'X', name: 'X', status: 'INACTIVE', createdAt: '' }],
          paging: { totalItems: 1 },
        },
      })

      const result = await companiesApi.getAll()

      expect(result.data[0].status).toBe('NONAKTIF')
    })

    it('applies search filter on name', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await companiesApi.getAll({ search: 'example' })

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'name',
        operator: 'ilike',
        value: '%example%',
      })
    })

    it('maps AKTIF status filter to ACTIVE', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await companiesApi.getAll({ status: 'AKTIF' })

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'status',
        operator: '=',
        value: 'ACTIVE',
      })
    })

    it('applies companyGroupIdNull filter', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await companiesApi.getAll({ companyGroupIdNull: true })

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'CompanyGroupID',
        operator: 'isnull',
        value: '',
      })
    })

    it('formats createdAt date correctly', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [{ id: 'co-1', code: 'X', name: 'X', status: 'ACTIVE', createdAt: '2026-07-02T14:05:00Z' }],
          paging: { totalItems: 1 },
        },
      })

      const result = await companiesApi.getAll()

      // The format depends on the local timezone — just check it's not empty and has the expected structure
      expect(result.data[0].createdAt).toMatch(/\d{2} \w{3} \d{4} \d{2}:\d{2}/)
    })
  })

  // ─── getById ─────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns mapped company with warehouses', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: 'co-1',
              code: 'PT-001',
              name: 'PT Example',
              status: 'ACTIVE',
              createdAt: '2026-01-01',
              warehouses: [
                { code: 'WH-JKT', name: 'WH Jakarta', city: 'Jakarta', status: 'ACTIVE' },
                { code: 'WH-SBY', name: 'WH Surabaya', city: 'Surabaya', status: 'INACTIVE' },
              ],
            },
          ],
        },
      })

      const company = await companiesApi.getById('co-1')

      expect(company.warehouses).toHaveLength(2)
      expect(company.warehouses![0]).toMatchObject({
        code: 'WH-JKT',
        status: 'AKTIF',
      })
      expect(company.warehouses![1].status).toBe('NONAKTIF')
    })

    it('throws when company not found', async () => {
      mockPost.mockResolvedValue({ data: { data: [] } })

      await expect(companiesApi.getById('x')).rejects.toThrow('Company not found')
    })
  })

  // ─── create ──────────────────────────────────────────────────────────

  describe('create', () => {
    it('posts correct payload', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Berhasil' })

      const msg = await companiesApi.create({
        code: 'PT-NEW',
        name: 'PT Baru',
        companyGroupId: 'grp-1',
        contactName: 'Andi',
        email: 'andi@co.id',
        phone: '08111',
        address: 'Jl. New',
        status: 'AKTIF',
      })

      expect(mockPost).toHaveBeenCalledWith('/master-data/companies/save', {
        code: 'PT-NEW',
        name: 'PT Baru',
        companyGroupId: 'grp-1',
        contactName: 'Andi',
        contactEmail: 'andi@co.id',
        contactPhone: '08111',
        address: 'Jl. New',
        status: 'ACTIVE',
      })
      expect(msg).toBe('Berhasil')
    })
  })

  // ─── update ──────────────────────────────────────────────────────────

  describe('update', () => {
    it('posts correct payload with id (code excluded)', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Updated' })

      await companiesApi.update('co-1', {
        code: 'PT-001',
        name: 'PT Updated',
        contactName: 'Budi',
        email: 'budi@co.id',
        phone: '08222',
        address: 'Jl. Upd',
        status: 'NONAKTIF',
      })

      const body = mockPost.mock.calls[0][1]
      expect(body.id).toBe('co-1')
      expect(body.code).toBeUndefined() // code not updatable
      expect(body.name).toBe('PT Updated')
      expect(body.status).toBe('INACTIVE')
    })
  })

  // ─── delete ──────────────────────────────────────────────────────────

  describe('delete', () => {
    it('posts id and returns message', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Deleted' })

      const msg = await companiesApi.delete('co-1')

      expect(mockPost).toHaveBeenCalledWith('/master-data/companies/delete', { id: 'co-1' })
      expect(msg).toBe('Deleted')
    })
  })

  // ─── assignWarehouse ─────────────────────────────────────────────────

  describe('assignWarehouse', () => {
    it('posts companyId and warehouseId', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Assigned' })

      const msg = await companiesApi.assignWarehouse('co-1', 'wh-1')

      expect(mockPost).toHaveBeenCalledWith('/master-data/companies/assignWarehouse', {
        companyId: 'co-1',
        warehouseId: 'wh-1',
      })
      expect(msg).toBe('Assigned')
    })
  })
})
