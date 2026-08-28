import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPost = vi.hoisted(() => vi.fn())

vi.mock('@polaris/service', () => ({
  fetcher: { post: mockPost },
}))

import { businessPartiesApi } from './businessParty.api'

describe('businessPartiesApi', () => {
  beforeEach(() => {
    mockPost.mockReset()
  })

  // ─── getAll ──────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns mapped business parties with total', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: 'bp-1',
              code: 'UNI-001',
              name: 'Unilever',
              status: 'ACTIVE',
              roles: ['OWNER', 'SUPPLIER'],
              city: 'Jakarta',
              createdAt: '2026-01-01T00:00:00Z',
              createdBy: 'admin',
            },
          ],
          paging: { totalItems: 1, count: 1 },
        },
      })

      const result = await businessPartiesApi.getAll({ page: 1, pageSize: 25 })

      expect(result.total).toBe(1)
      expect(result.data[0]).toMatchObject({
        id: 'bp-1',
        code: 'UNI-001',
        name: 'Unilever',
        status: 'ACTIVE',
        roles: ['OWNER', 'SUPPLIER'],
        city: 'Jakarta',
      })
    })

    it('applies search filter on name', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await businessPartiesApi.getAll({ search: 'unilever' })

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'name',
        operator: 'ilike',
        value: '%unilever%',
      })
    })

    it('applies role filter', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await businessPartiesApi.getAll({ role: 'OWNER' })

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'role',
        operator: '=',
        value: 'OWNER',
      })
    })

    it('applies status filter when not ALL', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await businessPartiesApi.getAll({ status: 'INACTIVE' })

      const body = mockPost.mock.calls[0][1]
      expect(body.filters.and).toContainEqual({
        field: 'status',
        operator: '=',
        value: 'INACTIVE',
      })
    })

    it('skips status filter when ALL', async () => {
      mockPost.mockResolvedValue({ data: { data: [], paging: { totalItems: 0 } } })

      await businessPartiesApi.getAll({ status: 'ALL' })

      const body = mockPost.mock.calls[0][1]
      const statusFilter = body.filters?.and?.find((f: { field: string }) => f.field === 'status')
      expect(statusFilter).toBeUndefined()
    })

    it('normalizes CARRIER role to COURIER', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            { id: 'bp-2', code: 'JNE', name: 'JNE Express', status: 'ACTIVE', roles: ['CARRIER'], createdAt: '' },
          ],
          paging: { totalItems: 1 },
        },
      })

      const result = await businessPartiesApi.getAll()

      expect(result.data[0].roles).toEqual(['COURIER'])
    })

    it('falls back to boolean flags when roles array is empty', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            { id: 'bp-3', code: 'X', name: 'X', status: 'ACTIVE', roles: [], isOwner: true, isConsignee: true, createdAt: '' },
          ],
          paging: { totalItems: 1 },
        },
      })

      const result = await businessPartiesApi.getAll()

      expect(result.data[0].roles).toEqual(['OWNER', 'CONSIGNEE'])
    })

    it('deduplicates roles', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            { id: 'bp-4', code: 'X', name: 'X', status: 'ACTIVE', roles: ['OWNER', 'OWNER', 'SUPPLIER'], createdAt: '' },
          ],
          paging: { totalItems: 1 },
        },
      })

      const result = await businessPartiesApi.getAll()

      expect(result.data[0].roles).toEqual(['OWNER', 'SUPPLIER'])
    })

    it('returns empty array when no data', async () => {
      mockPost.mockResolvedValue({ data: { data: null, paging: { totalItems: 0 } } })

      const result = await businessPartiesApi.getAll()

      expect(result.data).toEqual([])
      expect(result.total).toBe(0)
    })
  })

  // ─── getById ─────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns mapped party with extension attributes', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: 'bp-1',
              code: 'UNI-001',
              name: 'Unilever',
              status: 'ACTIVE',
              roles: ['OWNER'],
              createdAt: '2026-01-01',
              ownerAttr: { internalAlias: 'UNI', ediCode: 'EDI-UNI', overReceiptPct: 5 },
              ownerWarehouses: [
                { id: 'owa-1', warehouseId: 'wh-1', warehouseCode: 'WH-JKT', warehouseName: 'WH Jakarta', createdBy: 'admin' },
              ],
            },
          ],
        },
      })

      const party = await businessPartiesApi.getById('bp-1')

      expect(mockPost).toHaveBeenCalledWith('/master-data/business-parties/detailById', { id: 'bp-1' })
      expect(party.ownerAttr).toMatchObject({
        internalAlias: 'UNI',
        ediCode: 'EDI-UNI',
        overReceiptPct: 5,
      })
      expect(party.ownerWarehouses).toHaveLength(1)
      expect(party.ownerWarehouses![0]).toMatchObject({
        warehouseCode: 'WH-JKT',
      })
    })

    it('maps consignee addresses correctly', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            {
              id: 'bp-2',
              code: 'X',
              name: 'X',
              status: 'ACTIVE',
              roles: ['CONSIGNEE'],
              createdAt: '',
              consigneeAddresses: [
                { id: 'addr-1', addressLabel: 'Outlet A', address: 'Jl. A', city: 'Jakarta', isDefault: true },
                { id: 'addr-2', addressLabel: 'Outlet B', isDefault: false, deliveryWindowStart: '08:00', deliveryWindowEnd: '17:00' },
              ],
            },
          ],
        },
      })

      const party = await businessPartiesApi.getById('bp-2')

      expect(party.consigneeAddresses).toHaveLength(2)
      expect(party.consigneeAddresses![0]).toMatchObject({
        addressLabel: 'Outlet A',
        isDefault: true,
      })
      expect(party.consigneeAddresses![1]).toMatchObject({
        deliveryWindowStart: '08:00',
        deliveryWindowEnd: '17:00',
        isDefault: false,
      })
    })

    it('throws when party not found', async () => {
      mockPost.mockResolvedValue({ data: { data: [] } })

      await expect(businessPartiesApi.getById('nonexistent')).rejects.toThrow('Data mitra tidak ditemukan')
    })
  })

  // ─── create ──────────────────────────────────────────────────────────

  describe('create', () => {
    it('posts correct payload with owner extension', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Mitra berhasil ditambahkan' })

      const msg = await businessPartiesApi.create({
        code: 'UNI-001',
        name: 'Unilever',
        npwp: '01.234.567.8-901.000',
        taxId: 'TAX-001',
        contactName: 'Budi',
        contactEmail: 'budi@uni.com',
        contactPhone: '08111',
        address: 'Jl. Raya',
        city: 'Jakarta',
        province: 'DKI',
        zipcode: '10110',
        countryCode: 'ID',
        status: 'ACTIVE',
        roles: ['OWNER'],
        ownerAttr: { internalAlias: 'UNI', overReceiptPct: 5, ediCode: 'EDI-UNI', serviceModel: '', expiryPolicyLevel: '', expiryWarnDays: null, barcodeParser: '', skuPrefix: '', notes: '' },
      })

      const body = mockPost.mock.calls[0][1]
      expect(body.code).toBe('UNI-001')
      expect(body.roles).toEqual(['OWNER'])
      expect(body.ownerAttr).toMatchObject({ internalAlias: 'UNI', ediCode: 'EDI-UNI' })
      expect(body.supplierAttr).toBeUndefined()
      expect(body.carrierAttr).toBeUndefined()
      expect(msg).toBe('Mitra berhasil ditambahkan')
    })

    it('includes carrier extension when role includes COURIER', async () => {
      mockPost.mockResolvedValue({ externalDesc: '' })

      await businessPartiesApi.create({
        code: 'JNE',
        name: 'JNE Express',
        npwp: '',
        taxId: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        address: '',
        city: '',
        province: '',
        zipcode: '',
        countryCode: 'ID',
        status: 'ACTIVE',
        roles: ['COURIER'],
        carrierAttr: { transportMode: 'ROAD', ediCode: 'JNE-EDI', trackingUrl: 'https://jne.co.id/track', awbFormat: 'JNE-{NUM}', notes: '' },
      })

      const body = mockPost.mock.calls[0][1]
      expect(body.carrierAttr).toMatchObject({
        transportMode: 'ROAD',
        trackingUrl: 'https://jne.co.id/track',
      })
      expect(body.ownerAttr).toBeUndefined()
    })

    it('includes multiple extensions for multi-role party', async () => {
      mockPost.mockResolvedValue({ externalDesc: '' })

      await businessPartiesApi.create({
        code: 'MULTI',
        name: 'Multi Role',
        npwp: '',
        taxId: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        address: '',
        city: '',
        province: '',
        zipcode: '',
        countryCode: 'ID',
        status: 'ACTIVE',
        roles: ['OWNER', 'SUPPLIER'],
        ownerAttr: { internalAlias: 'M', overReceiptPct: null, ediCode: '', serviceModel: '', expiryPolicyLevel: '', expiryWarnDays: null, barcodeParser: '', skuPrefix: '', notes: '' },
        supplierAttr: { supplierCode: 'S-001', ediCode: '', leadTimeDays: 7, originCity: 'Jakarta', originCountry: 'ID', notes: '' },
      })

      const body = mockPost.mock.calls[0][1]
      expect(body.ownerAttr).toBeDefined()
      expect(body.supplierAttr).toMatchObject({ supplierCode: 'S-001', leadTimeDays: 7 })
    })
  })

  // ─── update ──────────────────────────────────────────────────────────

  describe('update', () => {
    it('posts payload with id included', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Updated' })

      const msg = await businessPartiesApi.update('bp-1', {
        code: 'UNI-001',
        name: 'Unilever Updated',
        npwp: '',
        taxId: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        address: '',
        city: '',
        province: '',
        zipcode: '',
        countryCode: 'ID',
        status: 'ACTIVE',
        roles: ['OWNER'],
        ownerAttr: { internalAlias: 'UNI-NEW', overReceiptPct: 10, ediCode: '', serviceModel: '', expiryPolicyLevel: '', expiryWarnDays: null, barcodeParser: '', skuPrefix: '', notes: '' },
      })

      const body = mockPost.mock.calls[0][1]
      expect(body.id).toBe('bp-1')
      expect(body.name).toBe('Unilever Updated')
      expect(msg).toBe('Updated')
    })
  })

  // ─── remove ──────────────────────────────────────────────────────────

  describe('remove', () => {
    it('posts id and returns message', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Deleted' })

      const msg = await businessPartiesApi.remove('bp-1')

      expect(mockPost).toHaveBeenCalledWith('/master-data/business-parties/delete', { id: 'bp-1' })
      expect(msg).toBe('Deleted')
    })
  })

  // ─── deactivate / reactivate ─────────────────────────────────────────

  describe('deactivate', () => {
    it('posts id and returns message', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Nonaktif' })

      const msg = await businessPartiesApi.deactivate('bp-1')

      expect(mockPost).toHaveBeenCalledWith('/master-data/business-parties/deactivate', { id: 'bp-1' })
      expect(msg).toBe('Nonaktif')
    })
  })

  describe('reactivate', () => {
    it('posts id and returns message', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Aktif kembali' })

      const msg = await businessPartiesApi.reactivate('bp-1')

      expect(mockPost).toHaveBeenCalledWith('/master-data/business-parties/reactivate', { id: 'bp-1' })
      expect(msg).toBe('Aktif kembali')
    })
  })

  // ─── Owner Warehouse Access ──────────────────────────────────────────

  describe('assignOwnerWarehouse', () => {
    it('posts ownerId and warehouseId', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Assigned' })

      const msg = await businessPartiesApi.assignOwnerWarehouse('bp-1', 'wh-1')

      expect(mockPost).toHaveBeenCalledWith('/master-data/owner-warehouse-access/save', {
        ownerId: 'bp-1',
        warehouseId: 'wh-1',
      })
      expect(msg).toBe('Assigned')
    })
  })

  describe('removeOwnerWarehouse', () => {
    it('posts accessId', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Removed' })

      const msg = await businessPartiesApi.removeOwnerWarehouse('owa-1')

      expect(mockPost).toHaveBeenCalledWith('/master-data/owner-warehouse-access/delete', {
        ownerWarehouseAccessId: 'owa-1',
      })
      expect(msg).toBe('Removed')
    })
  })

  // ─── Supplier Warehouse Access ───────────────────────────────────────

  describe('assignSupplierWarehouse', () => {
    it('posts supplierId and warehouseId', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Assigned' })

      const msg = await businessPartiesApi.assignSupplierWarehouse('bp-2', 'wh-1')

      expect(mockPost).toHaveBeenCalledWith('/master-data/supplier-warehouse-access/save', {
        supplierId: 'bp-2',
        warehouseId: 'wh-1',
      })
      expect(msg).toBe('Assigned')
    })
  })

  describe('removeSupplierWarehouse', () => {
    it('posts accessId', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Removed' })

      const msg = await businessPartiesApi.removeSupplierWarehouse('swa-1')

      expect(mockPost).toHaveBeenCalledWith('/master-data/supplier-warehouse-access/delete', {
        supplierWarehouseAccessId: 'swa-1',
      })
      expect(msg).toBe('Removed')
    })
  })

  // ─── Consignee Warehouse Access ──────────────────────────────────────

  describe('assignConsigneeWarehouse', () => {
    it('posts consigneeId and warehouseId', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Assigned' })

      const msg = await businessPartiesApi.assignConsigneeWarehouse('bp-3', 'wh-2')

      expect(mockPost).toHaveBeenCalledWith('/master-data/consignee-warehouse-access/save', {
        consigneeId: 'bp-3',
        warehouseId: 'wh-2',
      })
      expect(msg).toBe('Assigned')
    })
  })

  describe('removeConsigneeWarehouse', () => {
    it('posts accessId', async () => {
      mockPost.mockResolvedValue({ externalDesc: 'Removed' })

      const msg = await businessPartiesApi.removeConsigneeWarehouse('cwa-1')

      expect(mockPost).toHaveBeenCalledWith('/master-data/consignee-warehouse-access/delete', {
        ConsigneeWarehouseAccessId: 'cwa-1',
      })
      expect(msg).toBe('Removed')
    })
  })

  // ─── getWarehouseOptions ─────────────────────────────────────────────

  describe('getWarehouseOptions', () => {
    it('returns warehouse options from API', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            { id: 'wh-1', code: 'WH-JKT', name: 'WH Jakarta' },
            { id: 'wh-2', code: 'WH-SBY', name: 'WH Surabaya' },
          ],
        },
      })

      const options = await businessPartiesApi.getWarehouseOptions()

      expect(options).toHaveLength(2)
      expect(options[0]).toMatchObject({ id: 'wh-1', code: 'WH-JKT' })
    })

    it('deduplicates options', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            { id: 'wh-1', code: 'WH-JKT', name: 'WH Jakarta' },
            { id: 'wh-1', code: 'WH-JKT', name: 'WH Jakarta' },
          ],
        },
      })

      const options = await businessPartiesApi.getWarehouseOptions()

      expect(options).toHaveLength(1)
    })

    it('filters out items without id', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: [
            { id: 'wh-1', code: 'WH-JKT', name: 'WH Jakarta' },
            { id: '', code: 'X', name: 'No ID' },
          ],
        },
      })

      const options = await businessPartiesApi.getWarehouseOptions()

      expect(options).toHaveLength(1)
    })
  })
})
