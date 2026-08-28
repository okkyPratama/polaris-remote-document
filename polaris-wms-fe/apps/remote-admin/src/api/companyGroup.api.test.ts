import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPost = vi.hoisted(() => vi.fn())

vi.mock('@polaris/service', () => ({
  fetcher: { post: mockPost },
}))

import { companyGroupApi } from './companyGroup.api'

describe('companyGroupApi', () => {
  beforeEach(() => {
    mockPost.mockReset()
  })

  // ─── getAll ──────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns mapped company groups with status conversion', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: 'grp-1',
              code: 'GRP-A',
              name: 'Group A',
              status: 'ACTIVE',
              companyCount: 3,
              contactName: 'Andi',
              contactEmail: 'andi@co.id',
              createdAt: '2026-03-15T10:30:00Z',
            },
          ],
          paging: { totalItems: 1 },
        },
      })

      const result = await companyGroupApi.getAll()

      expect(result.total).toBe(1)
      expect(result.data[0]).toMatchObject({
        id: 'grp-1',
        code: 'GRP-A',
        name: 'Group A',
        status: 'AKTIF',
        companyCount: 3,
        contactName: 'Andi',
      })
    })

    it('maps INACTIVE status to NONAKTIF', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [{ id: 'grp-2', code: 'X', name: 'X', status: 'INACTIVE', createdAt: '' }],
          paging: { totalItems: 1 },
        },
      })

      const result = await companyGroupApi.getAll()

      expect(result.data[0].status).toBe('NONAKTIF')
    })

    it('applies search filter on name', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await companyGroupApi.getAll({ search: 'group' })

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'name',
        operator: 'ilike',
        value: '%group%',
      })
    })

    it('maps AKTIF status filter to ACTIVE', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await companyGroupApi.getAll({ status: 'AKTIF' })

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'status',
        operator: '=',
        value: 'ACTIVE',
      })
    })

    it('maps NONAKTIF status filter to INACTIVE', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await companyGroupApi.getAll({ status: 'NONAKTIF' })

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'status',
        operator: '=',
        value: 'INACTIVE',
      })
    })

    it('skips status filter when ALL', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await companyGroupApi.getAll({ status: 'ALL' })

      const body = mockPost.mock.calls[0][1]
      const statusFilter = body.filters.and.find((f: { field: string }) => f.field === 'status')
      expect(statusFilter).toBeUndefined()
    })

    it('formats createdAt date', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [{ id: 'grp-1', code: 'X', name: 'X', status: 'ACTIVE', createdAt: '2026-07-02T14:05:00Z' }],
          paging: { totalItems: 1 },
        },
      })

      const result = await companyGroupApi.getAll()

      expect(result.data[0].createdAt).toMatch(/\d{2} \w{3} \d{4} \d{2}:\d{2}/)
    })

    it('returns empty array when no data', async () => {
      mockPost.mockResolvedValue({ data: { data: null, paging: {} } })

      const result = await companyGroupApi.getAll()

      expect(result.data).toEqual([])
      expect(result.total).toBe(0)
    })
  })

  // ─── getById ─────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns mapped group with entities (companies)', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: 'grp-1',
              code: 'GRP-A',
              name: 'Group A',
              status: 'ACTIVE',
              createdAt: '2026-01-01',
              companies: [
                { code: 'CO-001', name: 'PT A', status: 'ACTIVE' },
                { code: 'CO-002', name: 'PT B', status: 'INACTIVE' },
              ],
            },
          ],
        },
      })

      const group = await companyGroupApi.getById('grp-1')

      expect(mockPost).toHaveBeenCalledWith('/master-data/company-groups/detailById', { id: 'grp-1' })
      expect(group).toBeDefined()
      expect(group!.entities).toHaveLength(2)
      expect(group!.entities![0]).toMatchObject({ code: 'CO-001', status: 'AKTIF' })
      expect(group!.entities![1]).toMatchObject({ code: 'CO-002', status: 'NONAKTIF' })
    })

    it('returns undefined when not found', async () => {
      mockPost.mockResolvedValue({ data: { data: [] } })

      const group = await companyGroupApi.getById('nonexistent')

      expect(group).toBeUndefined()
    })
  })

  // ─── create ──────────────────────────────────────────────────────────

  describe('create', () => {
    it('posts correct payload with status mapping', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Group berhasil dibuat' })

      const msg = await companyGroupApi.create({
        code: 'GRP-NEW',
        name: 'New Group',
        contactName: 'Budi',
        contactEmail: 'budi@co.id',
        contactPhone: '08111',
        address: 'Jl. New',
        status: 'AKTIF',
      })

      expect(mockPost).toHaveBeenCalledWith('/master-data/company-groups/save', {
        code: 'GRP-NEW',
        name: 'New Group',
        contactName: 'Budi',
        contactEmail: 'budi@co.id',
        contactPhone: '08111',
        address: 'Jl. New',
        status: 'ACTIVE',
      })
      expect(msg).toBe('Group berhasil dibuat')
    })

    it('maps NONAKTIF to INACTIVE', async () => {
      mockPost.mockResolvedValue({ externalDesc: '' })

      await companyGroupApi.create({ code: 'X', name: 'X', status: 'NONAKTIF' })

      const body = mockPost.mock.calls[0][1]
      expect(body.status).toBe('INACTIVE')
    })
  })

  // ─── update ──────────────────────────────────────────────────────────

  describe('update', () => {
    it('posts correct payload with id (code excluded)', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Updated' })

      const msg = await companyGroupApi.update('grp-1', {
        code: 'GRP-A',
        name: 'Group A Updated',
        contactName: 'Andi',
        contactEmail: 'andi@co.id',
        contactPhone: '08222',
        address: 'Jl. Upd',
        status: 'AKTIF',
      })

      const body = mockPost.mock.calls[0][1]
      expect(body.id).toBe('grp-1')
      expect(body.name).toBe('Group A Updated')
      expect(body.code).toBeUndefined() // code not sent on update
      expect(body.status).toBe('ACTIVE')
      expect(msg).toBe('Updated')
    })
  })

  // ─── delete ──────────────────────────────────────────────────────────

  describe('delete', () => {
    it('posts id and returns message', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Deleted' })

      const msg = await companyGroupApi.delete('grp-1')

      expect(mockPost).toHaveBeenCalledWith('/master-data/company-groups/delete', { id: 'grp-1' })
      expect(msg).toBe('Deleted')
    })
  })

  // ─── assignCompany ───────────────────────────────────────────────────

  describe('assignCompany', () => {
    it('posts companyGroupId and companyId', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Assigned' })

      const msg = await companyGroupApi.assignCompany('grp-1', 'co-1')

      expect(mockPost).toHaveBeenCalledWith('/master-data/company-groups/assignCompany', {
        companyGroupId: 'grp-1',
        companyId: 'co-1',
      })
      expect(msg).toBe('Assigned')
    })
  })
})
