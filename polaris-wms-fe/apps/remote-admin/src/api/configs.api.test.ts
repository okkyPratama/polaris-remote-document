import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPost = vi.hoisted(() => vi.fn())

vi.mock('@polaris/service', () => ({
  fetcher: { post: mockPost },
}))

import { configsApi } from './configs.api'

describe('configsApi', () => {
  beforeEach(() => {
    mockPost.mockReset()
  })

  // ─── getAll ──────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns mapped config headers with total', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: 'cfg-1',
              configKey: 'OVER_RECEIPT_PCT',
              configValue: '5',
              dataType: 'INT',
              description: 'Over receipt tolerance',
              category: 'INBOUND',
              status: 'ACTIVE',
              detailCount: 3,
              createdBy: 'admin',
              createdAt: '2026-01-01',
            },
          ],
          paging: { totalItems: 1 },
        },
      })

      const result = await configsApi.getAll()

      expect(result.total).toBe(1)
      expect(result.data[0]).toMatchObject({
        id: 'cfg-1',
        configKey: 'OVER_RECEIPT_PCT',
        configValue: '5',
        dataType: 'INT',
        status: 'ACTIVE',
        detailCount: 3,
      })
    })

    it('applies search filter on configKey', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await configsApi.getAll({ search: 'OVER' })

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'configKey',
        operator: 'ilike',
        value: '%OVER%',
      })
    })

    it('applies category filter', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await configsApi.getAll({ category: 'INBOUND' })

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'category',
        operator: '=',
        value: 'INBOUND',
      })
    })

    it('sends empty filters when no search/category', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await configsApi.getAll()

      const body = mockPost.mock.calls[0][1]
      expect(body.filters).toEqual({})
    })

    it('maps details when present', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: 'cfg-1',
              configKey: 'X',
              configValue: '10',
              dataType: 'INT',
              status: 'ACTIVE',
              detailCount: 1,
              details: [
                { id: 'd1', configId: 'cfg-1', ownerId: 'o1', ownerName: 'Owner A', configValue: '15' },
              ],
            },
          ],
          paging: { totalItems: 1 },
        },
      })

      const result = await configsApi.getAll()

      expect(result.data[0].details).toHaveLength(1)
      expect(result.data[0].details![0]).toMatchObject({
        id: 'd1',
        configId: 'cfg-1',
        ownerId: 'o1',
        ownerName: 'Owner A',
        configValue: '15',
      })
    })

    it('returns empty array when no data', async () => {
      mockPost.mockResolvedValue({ data: { data: null, paging: {} } })

      const result = await configsApi.getAll()

      expect(result.data).toEqual([])
      expect(result.total).toBe(0)
    })
  })

  // ─── getById ─────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns mapped config header with details', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: 'cfg-1',
              configKey: 'SHELF_LIFE_MIN',
              configValue: '180',
              dataType: 'INT',
              description: 'Min shelf life',
              scope: 'WAREHOUSE',
              category: 'INVENTORY',
              configGroup: 'shelf_life',
              status: 'ACTIVE',
              detailCount: 2,
              details: [
                { id: 'd1', configId: 'cfg-1', warehouseId: 'wh-1', warehouseName: 'WH JKT', configValue: '90' },
                { id: 'd2', configId: 'cfg-1', ownerId: 'o1', ownerName: 'Owner B', configValue: '120' },
              ],
            },
          ],
        },
      })

      const config = await configsApi.getById('cfg-1')

      expect(mockPost).toHaveBeenCalledWith('/master-data/master-configs/detailById', { id: 'cfg-1' })
      expect(config).toMatchObject({
        configKey: 'SHELF_LIFE_MIN',
        dataType: 'INT',
        scope: 'WAREHOUSE',
        category: 'INVENTORY',
      })
      expect(config!.details).toHaveLength(2)
    })

    it('returns undefined when not found', async () => {
      mockPost.mockResolvedValue({ data: { data: [] } })

      const config = await configsApi.getById('nonexistent')

      expect(config).toBeUndefined()
    })
  })

  // ─── resolve ─────────────────────────────────────────────────────────

  describe('resolve', () => {
    it('resolves config value for given context', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              configKey: 'OVER_RECEIPT_PCT',
              resolvedValue: '10',
              dataType: 'INT',
              resolvedFrom: 'WAREHOUSE',
              scopeId: 'wh-1',
              scopeName: 'WH Jakarta',
            },
          ],
        },
      })

      const resolved = await configsApi.resolve('OVER_RECEIPT_PCT', 'wh-1', 'owner-1')

      expect(mockPost).toHaveBeenCalledWith('/master-data/master-configs/resolve', {
        configKey: 'OVER_RECEIPT_PCT',
        warehouseId: 'wh-1',
        ownerId: 'owner-1',
      })
      expect(resolved).toMatchObject({
        configKey: 'OVER_RECEIPT_PCT',
        resolvedValue: '10',
        resolvedFrom: 'WAREHOUSE',
      })
    })

    it('returns undefined when config not resolvable', async () => {
      mockPost.mockResolvedValue({ data: { data: [] } })

      const resolved = await configsApi.resolve('NONEXISTENT')

      expect(resolved).toBeUndefined()
    })
  })

  // ─── save ────────────────────────────────────────────────────────────

  describe('save', () => {
    it('posts payload and returns message', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Config berhasil dibuat' })

      const msg = await configsApi.save({
        configKey: 'NEW_CONFIG',
        configValue: '100',
        dataType: 'INT',
        description: 'A new config',
        category: 'GENERAL',
      })

      expect(mockPost).toHaveBeenCalledWith('/master-data/master-configs/save', {
        configKey: 'NEW_CONFIG',
        configValue: '100',
        dataType: 'INT',
        description: 'A new config',
        category: 'GENERAL',
      })
      expect(msg).toBe('Config berhasil dibuat')
    })
  })

  // ─── edit ────────────────────────────────────────────────────────────

  describe('edit', () => {
    it('posts id with updated fields', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Updated' })

      const msg = await configsApi.edit('cfg-1', {
        configValue: '20',
        description: 'Updated desc',
      })

      expect(mockPost).toHaveBeenCalledWith('/master-data/master-configs/edit', {
        id: 'cfg-1',
        configValue: '20',
        description: 'Updated desc',
      })
      expect(msg).toBe('Updated')
    })
  })

  // ─── delete ──────────────────────────────────────────────────────────

  describe('delete', () => {
    it('posts id and returns message', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Deleted' })

      const msg = await configsApi.delete('cfg-1')

      expect(mockPost).toHaveBeenCalledWith('/master-data/master-configs/delete', { id: 'cfg-1' })
      expect(msg).toBe('Deleted')
    })
  })

  // ─── addDetail ───────────────────────────────────────────────────────

  describe('addDetail', () => {
    it('posts detail payload with scope fields', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Detail added' })

      const msg = await configsApi.addDetail({
        configId: 'cfg-1',
        ownerId: 'owner-1',
        warehouseId: 'wh-1',
        configValue: '50',
      })

      expect(mockPost).toHaveBeenCalledWith('/master-data/master-configs/detail/save', {
        configId: 'cfg-1',
        ownerId: 'owner-1',
        warehouseId: 'wh-1',
        configValue: '50',
      })
      expect(msg).toBe('Detail added')
    })
  })

  // ─── editDetail ──────────────────────────────────────────────────────

  describe('editDetail', () => {
    it('posts id with updated value', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Detail updated' })

      const msg = await configsApi.editDetail('d-1', {
        configValue: '99',
        warehouseId: 'wh-2',
      })

      expect(mockPost).toHaveBeenCalledWith('/master-data/master-configs/detail/edit', {
        id: 'd-1',
        configValue: '99',
        warehouseId: 'wh-2',
      })
      expect(msg).toBe('Detail updated')
    })
  })

  // ─── deleteDetail ────────────────────────────────────────────────────

  describe('deleteDetail', () => {
    it('posts id and returns message', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Detail deleted' })

      const msg = await configsApi.deleteDetail('d-1')

      expect(mockPost).toHaveBeenCalledWith('/master-data/master-configs/detail/delete', { id: 'd-1' })
      expect(msg).toBe('Detail deleted')
    })
  })
})
