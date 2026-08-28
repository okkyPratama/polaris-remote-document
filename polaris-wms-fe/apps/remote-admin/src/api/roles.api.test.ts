import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPost = vi.hoisted(() => vi.fn())

vi.mock('@polaris/service', () => ({
  fetcher: { post: mockPost },
}))

import { rolesApi } from './roles.api'

describe('rolesApi', () => {
  beforeEach(() => {
    mockPost.mockReset()
  })

  // ─── getAll ──────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns mapped roles with total count', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: 'role-1',
              code: 'ADMIN',
              name: 'Administrator',
              description: 'Full access',
              isSystem: true,
              status: 'ACTIVE',
              scopes: [{ warehouseId: 'wh-1', warehouseName: 'WH Jakarta' }],
              permissionCount: 25,
              createdBy: 'system',
              createdAt: '2026-01-01',
              updatedBy: 'system',
              updatedAt: '2026-01-01',
              userCount: 5,
              permissions: [
                { id: 'p1', key: 'user:create', resource: 'user', action: 'create', module: 'admin' },
              ],
            },
          ],
          paging: { totalItems: 1, count: 1 },
        },
      })

      const result = await rolesApi.getAll({ page: 1, pageSize: 25 })

      expect(result.total).toBe(1)
      expect(result.data[0]).toMatchObject({
        id: 'role-1',
        code: 'ADMIN',
        name: 'Administrator',
        isSystem: true,
        type: 'SYSTEM',
        userCount: 5,
      })
      expect(result.data[0].permissions).toHaveLength(1)
    })

    it('always filters active roles', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await rolesApi.getAll()

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'status',
        operator: '=',
        value: 'ACTIVE',
      })
    })

    it('applies search filter', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await rolesApi.getAll({ search: 'admin' })

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'name',
        operator: 'ilike',
        value: '%admin%',
      })
    })

    it('applies type=SYSTEM filter as is_system=true', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await rolesApi.getAll({ type: 'SYSTEM' })

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'is_system',
        operator: '=',
        value: true,
      })
    })

    it('applies type=CUSTOM filter as is_system=false', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await rolesApi.getAll({ type: 'CUSTOM' })

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'is_system',
        operator: '=',
        value: false,
      })
    })

    it('skips type filter when ALL', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await rolesApi.getAll({ type: 'ALL' })

      const body = mockPost.mock.calls[0][1]
      const typeFilter = body.filters.and.find((f: { field: string }) => f.field === 'is_system')
      expect(typeFilter).toBeUndefined()
    })

    it('maps isSystem=false to type=CUSTOM', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: 'role-2',
              code: 'CUSTOM_ROLE',
              name: 'Custom',
              isSystem: false,
              status: 'ACTIVE',
              createdAt: '2026-01-01',
              updatedBy: '',
              updatedAt: '',
              permissions: [],
            },
          ],
          paging: { totalItems: 1 },
        },
      })

      const result = await rolesApi.getAll()

      expect(result.data[0].type).toBe('CUSTOM')
    })
  })

  // ─── getById ─────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns mapped role detail', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: 'role-1',
              code: 'ADMIN',
              name: 'Administrator',
              description: 'Full',
              isSystem: true,
              status: 'ACTIVE',
              createdAt: '2026-01-01',
              updatedBy: 'admin',
              updatedAt: '2026-07-01',
              permissions: [
                { id: 'p1', key: 'user:view', resource: 'user', action: 'view' },
              ],
            },
          ],
        },
      })

      const role = await rolesApi.getById('role-1')

      expect(mockPost).toHaveBeenCalledWith('/admin/roles/detailById', { id: 'role-1' })
      expect(role).toMatchObject({
        id: 'role-1',
        code: 'ADMIN',
        type: 'SYSTEM',
      })
      expect(role?.permissions?.[0]).toMatchObject({
        key: 'user:view',
        description: 'user:view',
      })
    })

    it('returns undefined when role not found', async () => {
      mockPost.mockResolvedValue({ data: { data: [] } })

      const role = await rolesApi.getById('nonexistent')

      expect(role).toBeUndefined()
    })
  })

  // ─── create ──────────────────────────────────────────────────────────

  describe('create', () => {
    it('posts correct payload with scopes mapped from warehouseIds', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Role berhasil dibuat' })

      const msg = await rolesApi.create({
        code: 'OPERATOR',
        name: 'Operator',
        description: 'Warehouse operator',
        warehouseIds: ['wh-1', 'wh-2'],
        permissionIds: ['p1', 'p2'],
      })

      expect(mockPost).toHaveBeenCalledWith('/admin/roles/save', {
        code: 'OPERATOR',
        name: 'Operator',
        description: 'Warehouse operator',
        scopes: [
          { companyId: null, warehouseId: 'wh-1' },
          { companyId: null, warehouseId: 'wh-2' },
        ],
        permissionIds: ['p1', 'p2'],
      })
      expect(msg).toBe('Role berhasil dibuat')
    })

    it('defaults description to empty string', async () => {
      mockPost.mockResolvedValue({ externalDesc: '' })

      await rolesApi.create({
        code: 'BARE',
        name: 'Bare',
        permissionIds: ['p1'],
      })

      const body = mockPost.mock.calls[0][1]
      expect(body.description).toBe('')
    })
  })

  // ─── update ──────────────────────────────────────────────────────────

  describe('update', () => {
    it('posts correct payload with id (code excluded from update)', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Updated' })

      const msg = await rolesApi.update('role-1', {
        code: 'ADMIN',
        name: 'Admin Updated',
        description: 'Updated desc',
        warehouseIds: ['wh-3'],
        permissionIds: ['p3'],
      })

      const body = mockPost.mock.calls[0][1]
      expect(body.id).toBe('role-1')
      expect(body.name).toBe('Admin Updated')
      expect(body.code).toBeUndefined() // code not sent on update
      expect(body.scopes).toEqual([{ companyId: null, warehouseId: 'wh-3' }])
      expect(msg).toBe('Updated')
    })
  })

  // ─── delete ──────────────────────────────────────────────────────────

  describe('delete', () => {
    it('posts id and returns message', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Deleted' })

      const msg = await rolesApi.delete('role-1')

      expect(mockPost).toHaveBeenCalledWith('/admin/roles/delete', { id: 'role-1' })
      expect(msg).toBe('Deleted')
    })
  })
})
