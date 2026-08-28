import { beforeEach, describe, expect, it, vi } from 'vitest'

// Hoist mock sebelum import module
const mockPost = vi.hoisted(() => vi.fn())

vi.mock('@polaris/service', () => ({
  fetcher: { post: mockPost },
}))

import { usersApi } from './users.api'

describe('usersApi', () => {
  beforeEach(() => {
    mockPost.mockReset()
  })

  // ─── getAll ──────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns mapped users with total count', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: 'u-1',
              username: 'admin',
              email: 'admin@co.id',
              fullName: 'Admin User',
              status: 'ACTIVE',
              createdAt: '2026-01-01T00:00:00Z',
              roles: [{ id: 'r1', code: 'ADMIN', name: 'Administrator', isSystem: true }],
              warehouses: [{ id: 'w1', warehouseId: 'wh-1', warehouseName: 'WH Jakarta' }],
              owners: [],
            },
          ],
          paging: { totalItems: 1, count: 1 },
        },
      })

      const result = await usersApi.getAll({ page: 1, pageSize: 25 })

      expect(mockPost).toHaveBeenCalledWith('/admin/users/getAll', expect.objectContaining({
        paging: expect.objectContaining({ page: 1, pageSize: 25 }),
      }))
      expect(result.total).toBe(1)
      expect(result.data[0]).toMatchObject({
        id: 'u-1',
        username: 'admin',
        email: 'admin@co.id',
        fullName: 'Admin User',
        status: 'ACTIVE',
      })
      expect(result.data[0].roles).toHaveLength(1)
      expect(result.data[0].warehouses).toHaveLength(1)
    })

    it('applies search filter as ilike on fullname', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await usersApi.getAll({ search: 'john' })

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'fullname',
        operator: 'ilike',
        value: '%john%',
      })
    })

    it('applies status filter when not ALL', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await usersApi.getAll({ status: 'INACTIVE' })

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'status',
        operator: '=',
        value: 'INACTIVE',
      })
    })

    it('skips status filter when ALL', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await usersApi.getAll({ status: 'ALL' })

      const body = mockPost.mock.calls[0][1]
      const statusFilter = body.filters?.and?.find((f: { field: string }) => f.field === 'status')
      expect(statusFilter).toBeUndefined()
    })

    it('applies roleCode filter', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await usersApi.getAll({ roleCode: 'ADMIN' })

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'role_code',
        operator: '=',
        value: 'ADMIN',
      })
    })

    it('maps string roles to UserRole objects', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: 'u-2',
              username: 'op',
              email: 'op@co.id',
              status: 'ACTIVE',
              createdAt: '2026-01-01T00:00:00Z',
              roles: ['OPERATOR', 'VIEWER'],
              warehouses: [],
              owners: [],
            },
          ],
          paging: { totalItems: 1 },
        },
      })

      const result = await usersApi.getAll()

      expect(result.data[0].roles).toEqual([
        { id: '', code: 'OPERATOR', name: 'OPERATOR', isSystem: false },
        { id: '', code: 'VIEWER', name: 'VIEWER', isSystem: false },
      ])
    })

    it('maps string warehouses to UserWarehouse objects', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: 'u-3',
              username: 'wh-user',
              email: 'wh@co.id',
              status: 'ACTIVE',
              createdAt: '2026-01-01T00:00:00Z',
              roles: [],
              warehouses: ['wh-001', 'wh-002'],
              owners: [],
            },
          ],
          paging: { totalItems: 1 },
        },
      })

      const result = await usersApi.getAll()

      expect(result.data[0].warehouses).toEqual([
        { id: 'wh-001', warehouseId: 'wh-001', warehouseName: 'wh-001' },
        { id: 'wh-002', warehouseId: 'wh-002', warehouseName: 'wh-002' },
      ])
    })

    it('returns empty array when no data', async () => {
      mockPost.mockResolvedValue({ data: { data: null, paging: {} } })

      const result = await usersApi.getAll()

      expect(result.data).toEqual([])
      expect(result.total).toBe(0)
    })
  })

  // ─── getById ─────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns mapped user detail', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: 'u-1',
              username: 'admin',
              email: 'admin@co.id',
              fullName: 'Admin',
              status: 'ACTIVE',
              createdAt: '2026-01-01',
              roles: [],
              warehouses: [],
              owners: [],
              lastLoginAt: '2026-07-01T10:00:00Z',
              activeSessions: 2,
            },
          ],
        },
      })

      const user = await usersApi.getById('u-1')

      expect(mockPost).toHaveBeenCalledWith('/admin/users/detailById', { id: 'u-1' })
      expect(user).toMatchObject({
        id: 'u-1',
        username: 'admin',
        lastLoginAt: '2026-07-01T10:00:00Z',
        activeSessions: 2,
      })
    })

    it('returns null when user not found', async () => {
      mockPost.mockResolvedValue({ data: { data: [] } })

      const user = await usersApi.getById('nonexistent')

      expect(user).toBeNull()
    })
  })

  // ─── create ──────────────────────────────────────────────────────────

  describe('create', () => {
    it('posts correct payload and returns message', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'User berhasil dibuat' })

      const msg = await usersApi.create({
        username: 'newuser',
        email: 'new@co.id',
        fullName: 'New User',
        status: 'ACTIVE',
        roleIds: ['r1'],
        warehouseIds: ['w1'],
        ownerIds: ['o1'],
      })

      expect(mockPost).toHaveBeenCalledWith('/admin/users/save', {
        username: 'newuser',
        email: 'new@co.id',
        fullName: 'New User',
        sendResetEmail: true,
        roleIds: ['r1'],
        warehouseIds: ['w1'],
        ownerIds: ['o1'],
        status: 'ACTIVE',
      })
      expect(msg).toBe('User berhasil dibuat')
    })

    it('defaults roleIds, warehouseIds, ownerIds to empty arrays', async () => {
      mockPost.mockResolvedValue({ externalDesc: '' })

      await usersApi.create({
        username: 'bare',
        email: 'bare@co.id',
        fullName: 'Bare User',
        status: 'ACTIVE',
      })

      const body = mockPost.mock.calls[0][1]
      expect(body.roleIds).toEqual([])
      expect(body.warehouseIds).toEqual([])
      expect(body.ownerIds).toEqual([])
    })
  })

  // ─── update ──────────────────────────────────────────────────────────

  describe('update', () => {
    it('posts correct payload with id', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Updated' })

      const msg = await usersApi.update('u-1', {
        username: 'admin',
        email: 'admin@co.id',
        fullName: 'Admin Updated',
        status: 'ACTIVE',
        roleIds: ['r1', 'r2'],
        warehouseIds: [],
        ownerIds: [],
      })

      expect(mockPost).toHaveBeenCalledWith('/admin/users/edit', expect.objectContaining({
        id: 'u-1',
        fullName: 'Admin Updated',
        roleIds: ['r1', 'r2'],
      }))
      expect(msg).toBe('Updated')
    })
  })

  // ─── deactivate ──────────────────────────────────────────────────────

  describe('deactivate', () => {
    it('posts id and reason, returns sessions invalidated', async () => {
      mockPost.mockResolvedValue({
        externalDesc: 'Deactivated',
        data: { data: [{ sessionsInvalidated: 3 }] },
      })

      const result = await usersApi.deactivate('u-1', 'No longer employed')

      expect(mockPost).toHaveBeenCalledWith('/admin/users/deactivate', {
        id: 'u-1',
        reason: 'No longer employed',
      })
      expect(result).toEqual({ sessionsInvalidated: 3, message: 'Deactivated' })
    })

    it('defaults reason to empty string', async () => {
      mockPost.mockResolvedValue({ externalDesc: '', data: { data: [{}] } })

      await usersApi.deactivate('u-1')

      const body = mockPost.mock.calls[0][1]
      expect(body.reason).toBe('')
    })
  })

  // ─── reactivate ─────────────────────────────────────────────────────

  describe('reactivate', () => {
    it('posts id and returns message', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Reactivated' })

      const msg = await usersApi.reactivate('u-1')

      expect(mockPost).toHaveBeenCalledWith('/admin/users/reactivate', { id: 'u-1' })
      expect(msg).toBe('Reactivated')
    })
  })
})
