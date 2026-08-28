import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPost = vi.hoisted(() => vi.fn())

vi.mock('@polaris/service', () => ({
  fetcher: { post: mockPost },
}))

import { permissionsApi } from './permissions.api'

describe('permissionsApi', () => {
  beforeEach(() => {
    mockPost.mockReset()
  })

  describe('getAll', () => {
    it('returns permissions grouped by module', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            { id: 'p1', key: 'user:view', resource: 'user', action: 'view', module: 'admin' },
            { id: 'p2', key: 'user:create', resource: 'user', action: 'create', module: 'admin' },
            { id: 'p3', key: 'warehouse:view', resource: 'warehouse', action: 'view', module: 'master-data' },
          ],
        },
      })

      const domains = await permissionsApi.getAll()

      expect(domains).toHaveLength(2)

      const adminDomain = domains.find((d) => d.domain === 'admin')
      expect(adminDomain).toBeDefined()
      expect(adminDomain!.permissions).toHaveLength(2)
      expect(adminDomain!.label).toBe('Admin')

      const masterDataDomain = domains.find((d) => d.domain === 'master-data')
      expect(masterDataDomain).toBeDefined()
      expect(masterDataDomain!.permissions).toHaveLength(1)
    })

    it('uses resource as fallback module when module is empty', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            { id: 'p1', key: 'role:view', resource: 'role', action: 'view', module: '' },
            { id: 'p2', key: 'role:create', resource: 'role', action: 'create' },
          ],
        },
      })

      const domains = await permissionsApi.getAll()

      expect(domains).toHaveLength(1)
      expect(domains[0].domain).toBe('role')
      expect(domains[0].permissions).toHaveLength(2)
    })

    it('generates description from resource:action when missing', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            { id: 'p1', key: 'sku:delete', resource: 'sku', action: 'delete', module: 'inventory' },
          ],
        },
      })

      const domains = await permissionsApi.getAll()

      expect(domains[0].permissions[0].description).toBe('sku:delete')
    })

    it('preserves description when provided', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            { id: 'p1', key: 'user:view', resource: 'user', action: 'view', module: 'admin', description: 'Lihat daftar pengguna' },
          ],
        },
      })

      const domains = await permissionsApi.getAll()

      expect(domains[0].permissions[0].description).toBe('Lihat daftar pengguna')
    })

    it('applies module filter', async () => {
      mockPost.mockResolvedValue({ data: { data: [] } })

      await permissionsApi.getAll({ module: 'admin' })

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'module',
        operator: '=',
        value: 'admin',
      })
    })

    it('sends empty filters when no module specified', async () => {
      mockPost.mockResolvedValue({ data: { data: [] } })

      await permissionsApi.getAll()

      const body = mockPost.mock.calls[0][1]
      expect(body.filters).toEqual({})
    })

    it('defaults pageSize to 200 (large set)', async () => {
      mockPost.mockResolvedValue({ data: { data: [] } })

      await permissionsApi.getAll()

      const body = mockPost.mock.calls[0][1]
      expect(body.paging.pageSize).toBe(200)
    })

    it('returns empty domains when no data', async () => {
      mockPost.mockResolvedValue({ data: { data: null } })

      const domains = await permissionsApi.getAll()

      expect(domains).toEqual([])
    })

    it('capitalizes domain label', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            { id: 'p1', key: 'x:y', resource: 'x', action: 'y', module: 'inventory' },
          ],
        },
      })

      const domains = await permissionsApi.getAll()

      expect(domains[0].label).toBe('Inventory')
    })
  })
})
