import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPost = vi.hoisted(() => vi.fn())

vi.mock('@polaris/service', () => ({
  fetcher: { post: mockPost },
}))

import { codesApi } from './codes.api'

describe('codesApi', () => {
  beforeEach(() => {
    mockPost.mockReset()
  })

  // ─── getAll ──────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns mapped codes with status conversion', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: 'code-1',
              typeCode: 'UOM_GROUP',
              typeCodeDescription: 'Satuan Ukuran',
              isSystem: true,
              status: 'ACTIVE',
              detailCount: 5,
              createdBy: 'admin',
              createdAt: '2026-01-01',
            },
          ],
          paging: { totalItems: 1 },
        },
      })

      const result = await codesApi.getAll()

      expect(result.total).toBe(1)
      expect(result.data[0]).toMatchObject({
        id: 'code-1',
        typeCode: 'UOM_GROUP',
        isSystem: true,
        status: 'AKTIF',
        detailCount: 5,
      })
    })

    it('maps INACTIVE status to NONAKTIF', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [{ id: 'c-2', typeCode: 'X', status: 'INACTIVE' }],
          paging: { totalItems: 1 },
        },
      })

      const result = await codesApi.getAll()

      expect(result.data[0].status).toBe('NONAKTIF')
    })

    it('applies search filter on typeCode', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await codesApi.getAll({ search: 'UOM' })

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'typeCode',
        operator: 'ilike',
        value: '%UOM%',
      })
    })

    it('applies AKTIF status filter as ACTIVE', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await codesApi.getAll({ status: 'AKTIF' })

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'status',
        operator: '=',
        value: 'ACTIVE',
      })
    })

    it('uses typeCode as default sortBy', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await codesApi.getAll()

      const body = mockPost.mock.calls[0][1]
      expect(body.paging.sortBy).toBe('typeCode')
      expect(body.paging.sortDir).toBe('ASC')
    })

    it('accepts custom sortBy and sortDir', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await codesApi.getAll({ sortBy: 'created_at', sortDir: 'DESC' })

      const body = mockPost.mock.calls[0][1]
      expect(body.paging.sortBy).toBe('created_at')
      expect(body.paging.sortDir).toBe('DESC')
    })
  })

  // ─── getById ─────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns code with mapped details', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: 'code-1',
              typeCode: 'UOM_GROUP',
              typeCodeDescription: 'UOM',
              isSystem: true,
              status: 'ACTIVE',
              details: [
                { id: 'd1', codeId: 'EA', codeName: 'Each', sequence: 1, ownerId: '', warehouseId: '', status: 'ACTIVE' },
                { id: 'd2', codeId: 'IP', codeName: 'Inner Pack', sequence: 2, ownerId: 'o1', warehouseId: '', status: 'INACTIVE' },
              ],
            },
          ],
        },
      })

      const code = await codesApi.getById('code-1')

      expect(code).toBeDefined()
      expect(code!.details).toHaveLength(2)
      expect(code!.details![0]).toMatchObject({
        codeId: 'EA',
        codeName: 'Each',
        status: 'AKTIF',
      })
      expect(code!.details![1].status).toBe('NONAKTIF')
    })

    it('returns undefined when not found', async () => {
      mockPost.mockResolvedValue({ data: { data: [] } })

      const code = await codesApi.getById('nonexistent')

      expect(code).toBeUndefined()
    })
  })

  // ─── create ──────────────────────────────────────────────────────────

  describe('create', () => {
    it('posts correct payload', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Created' })

      const msg = await codesApi.create({
        typeCode: 'ZONE_TYPE',
        typeCodeDescription: 'Tipe Zona',
      })

      expect(mockPost).toHaveBeenCalledWith('/master-data/codes/save', {
        typeCode: 'ZONE_TYPE',
        typeCodeDescription: 'Tipe Zona',
        status: 'ACTIVE',
      })
      expect(msg).toBe('Created')
    })

    it('maps NONAKTIF status to INACTIVE', async () => {
      mockPost.mockResolvedValue({ externalDesc: '' })

      await codesApi.create({ typeCode: 'X', typeCodeDescription: 'X', status: 'NONAKTIF' })

      const body = mockPost.mock.calls[0][1]
      expect(body.status).toBe('INACTIVE')
    })
  })

  // ─── update ──────────────────────────────────────────────────────────

  describe('update', () => {
    it('posts id with updated fields', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Updated' })

      const msg = await codesApi.update('code-1', {
        typeCodeDescription: 'Updated Desc',
        status: 'NONAKTIF',
      })

      expect(mockPost).toHaveBeenCalledWith('/master-data/codes/edit', {
        id: 'code-1',
        typeCodeDescription: 'Updated Desc',
        status: 'INACTIVE',
      })
      expect(msg).toBe('Updated')
    })
  })

  // ─── delete ──────────────────────────────────────────────────────────

  describe('delete', () => {
    it('posts id and returns message', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Deleted' })

      const msg = await codesApi.delete('code-1')

      expect(mockPost).toHaveBeenCalledWith('/master-data/codes/delete', { id: 'code-1' })
      expect(msg).toBe('Deleted')
    })
  })

  // ─── createDetail ────────────────────────────────────────────────────

  describe('createDetail', () => {
    it('posts correct payload with owner and warehouse scope', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Detail created' })

      const msg = await codesApi.createDetail({
        typeCodeId: 'code-1',
        codeDetailId: 'EA',
        codeName: 'Each',
        sequence: 1,
        ownerId: 'owner-1',
        warehouseId: 'wh-1',
      })

      expect(mockPost).toHaveBeenCalledWith('/master-data/codes/detail/save', {
        typeCodeId: 'code-1',
        codeId: 'EA',
        codeName: 'Each',
        sequence: 1,
        ownerId: 'owner-1',
        warehouseId: 'wh-1',
        status: 'ACTIVE',
      })
      expect(msg).toBe('Detail created')
    })

    it('defaults ownerId and warehouseId to empty when null', async () => {
      mockPost.mockResolvedValue({ externalDesc: '' })

      await codesApi.createDetail({
        typeCodeId: 'code-1',
        codeDetailId: 'X',
        codeName: 'X',
        ownerId: null,
        warehouseId: null,
      })

      const body = mockPost.mock.calls[0][1]
      expect(body.ownerId).toBe('')
      expect(body.warehouseId).toBe('')
    })
  })

  // ─── updateDetail ────────────────────────────────────────────────────

  describe('updateDetail', () => {
    it('posts correct payload', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Updated' })

      await codesApi.updateDetail('d-1', {
        codeDetailId: 'IP',
        codeName: 'Inner Pack Updated',
        sequence: 5,
        status: 'AKTIF',
      })

      const body = mockPost.mock.calls[0][1]
      expect(body.id).toBe('d-1')
      expect(body.codeId).toBe('IP')
      expect(body.codeName).toBe('Inner Pack Updated')
      expect(body.sequence).toBe(5)
      expect(body.status).toBe('ACTIVE')
    })
  })

  // ─── deleteDetail ────────────────────────────────────────────────────

  describe('deleteDetail', () => {
    it('posts id and returns message', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Deleted' })

      const msg = await codesApi.deleteDetail('d-1')

      expect(mockPost).toHaveBeenCalledWith('/master-data/codes/detail/delete', { id: 'd-1' })
      expect(msg).toBe('Deleted')
    })
  })

  // ─── lookup ──────────────────────────────────────────────────────────

  describe('lookup', () => {
    it('returns mapped code details', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            { id: 'd1', codeId: 'EA', codeName: 'Each', sequence: 1, ownerId: '', warehouseId: '', status: 'ACTIVE' },
          ],
        },
      })

      const details = await codesApi.lookup('UOM_GROUP', 'owner-1', 'wh-1')

      expect(mockPost).toHaveBeenCalledWith('/master-data/codes/lookup', {
        typeCode: 'UOM_GROUP',
        ownerId: 'owner-1',
        warehouseId: 'wh-1',
      })
      expect(details).toHaveLength(1)
      expect(details[0]).toMatchObject({ codeId: 'EA', status: 'AKTIF' })
    })

    it('returns empty array when no data', async () => {
      mockPost.mockResolvedValue({ data: { data: null } })

      const details = await codesApi.lookup('X', '', '')

      expect(details).toEqual([])
    })
  })
})
