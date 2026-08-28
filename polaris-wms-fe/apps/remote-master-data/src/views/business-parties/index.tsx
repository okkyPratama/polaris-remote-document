import { useEffect, useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { DataTable, Pagination, toast, type ColumnDef } from '@polaris/ui'
import { WithToaster } from '../../components/WithToaster'
import {
  useBusinessParties,
  useBusinessPartyDetail,
  useBusinessPartyWarehouseOptions,
  useCreateBusinessParty,
  useDeleteBusinessParty,
  useDeactivateBusinessParty,
  useReactivateBusinessParty,
  useAssignOwnerWarehouse,
  useRemoveOwnerWarehouse,
  useAssignSupplierWarehouse,
  useRemoveSupplierWarehouse,
  useAssignConsigneeWarehouse,
  useRemoveConsigneeWarehouse,
  useUpdateBusinessParty,
} from '../../hooks/useBusinessParties'
import type {
  BusinessParty,
  BusinessPartyFormData,
  BusinessPartyRole,
  BusinessPartyStatus,
} from '../../types/businessParty.types'
import { BusinessPartyDetailPanel } from './BusinessPartyDetailPanel'
import { BusinessPartyFormPanel } from './BusinessPartyFormPanel'
import { ROLE_BADGE_CLASS, ROLE_LABEL, statusBadgeClass, statusLabel, formatTimestamp } from './utils'

export type RoleFilter = 'ALL' | 'OWNER' | 'SUPPLIER' | 'CONSIGNEE' | 'CARRIER'

type PanelState = 'closed' | 'detail' | 'create' | 'edit'

const ROLE_TABS: { value: RoleFilter; label: string }[] = [
  { value: 'ALL', label: 'Semua' },
  { value: 'OWNER', label: 'Owner' },
  { value: 'SUPPLIER', label: 'Pemasok' },
  { value: 'CONSIGNEE', label: 'Penerima' },
  { value: 'CARRIER', label: 'Ekspedisi' },
]

function mapRoleFilterToApi(value: RoleFilter): BusinessPartyRole | undefined {
  if (value === 'ALL') return undefined
  if (value === 'CARRIER') return 'COURIER'
  return value
}

const columns: ColumnDef<BusinessParty>[] = [
  {
    header: 'Kode',
    cell: (row) => <span className="font-mono text-[12px] font-semibold text-[#001871]">{row.code}</span>,
  },
  {
    header: 'Nama & Tipe',
    cell: (row) => (
      <div>
        <div className="text-[13px] font-medium text-[#1f2b59]">{row.name}</div>
        <div className="flex flex-wrap gap-1 mt-1">
          {row.roles.map((role) => (
            <span key={role} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE_CLASS[role]}`}>
              {ROLE_LABEL[role]}
            </span>
          ))}
        </div>
      </div>
    ),
  },
  {
    header: 'Kota',
    cell: (row) => <span className="text-[12px] text-[#1f2b59]">{row.city || '-'}</span>,
  },
  {
    header: 'Status',
    cell: (row) => (
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadgeClass(row.status)}`}>
        {statusLabel(row.status)}
      </span>
    ),
  },
  {
    header: 'Dibuat',
    cell: (row) => <span className="text-[12px] text-[#a9b1c6]">{formatTimestamp(row.createdAt)}</span>,
  },
  {
    header: 'Dibuat Oleh',
    cell: (row) => <span className="text-[12px] text-[#a9b1c6]">{row.createdBy || '—'}</span>,
  },
]

export interface BusinessPartiesPageProps {
  initialRole?: RoleFilter
  canCreate?: boolean
  canUpdate?: boolean
}

function roleTabLabel(role: RoleFilter): string {
  return ROLE_TABS.find((x) => x.value === role)?.label ?? 'Mitra Bisnis'
}

export default function BusinessPartiesPage({
  initialRole = 'ALL',
  canCreate = false,
  canUpdate = false,
}: BusinessPartiesPageProps) {
  const [activeRole, setActiveRole] = useState<RoleFilter>(initialRole)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | BusinessPartyStatus>('ALL')
  const [panelState, setPanelState] = useState<PanelState>('closed')
  const [selectedRow, setSelectedRow] = useState<BusinessParty | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  useEffect(() => {
    setActiveRole(initialRole)
  }, [initialRole])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const params = useMemo(
    () => ({
      search: debouncedSearch,
      role: mapRoleFilterToApi(activeRole),
      status: statusFilter,
      page: currentPage,
      pageSize,
    }),
    [debouncedSearch, activeRole, statusFilter, currentPage, pageSize]
  )

  const { data: queryData, refetch } = useBusinessParties(params)
  const detailQuery = useBusinessPartyDetail(selectedRow?.id)
  const warehouseOptionsQuery = useBusinessPartyWarehouseOptions(panelState !== 'closed')
  const createMutation = useCreateBusinessParty()
  const updateMutation = useUpdateBusinessParty()
  const deleteMutation = useDeleteBusinessParty()
  const deactivateMutation = useDeactivateBusinessParty()
  const reactivateMutation = useReactivateBusinessParty()
  const assignOwnerWarehouseMutation = useAssignOwnerWarehouse()
  const removeOwnerWarehouseMutation = useRemoveOwnerWarehouse()
  const assignSupplierWarehouseMutation = useAssignSupplierWarehouse()
  const removeSupplierWarehouseMutation = useRemoveSupplierWarehouse()
  const assignConsigneeWarehouseMutation = useAssignConsigneeWarehouse()
  const removeConsigneeWarehouseMutation = useRemoveConsigneeWarehouse()

  const tableRows = queryData?.data ?? []
  const totalItems = queryData?.total ?? 0

  useEffect(() => {
    setCurrentPage(1)
    setSelectedRow(null)
    setPanelState('closed')
  }, [activeRole, statusFilter])

  const closePanel = () => {
    setPanelState('closed')
    setSelectedRow(null)
  }

  const handleRowClick = (row: BusinessParty) => {
    setSelectedRow(row)
    setPanelState('detail')
  }

  const handleCreate = async (payload: BusinessPartyFormData) => {
    try {
      const msg = await createMutation.mutateAsync(payload)
      toast.success('Berhasil', msg || 'Mitra berhasil ditambahkan')
      closePanel()
      refetch()
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Gagal', error.errorMessage?.[0] || error.message || 'Gagal menambahkan mitra')
    }
  }

  const handleEdit = async (payload: BusinessPartyFormData) => {
    if (!selectedRow) return
    try {
      const msg = await updateMutation.mutateAsync({ id: selectedRow.id, data: payload })
      toast.success('Berhasil', msg || 'Mitra berhasil diperbarui')
      setPanelState('detail')
      await detailQuery.refetch()
      refetch()
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Gagal', error.errorMessage?.[0] || error.message || 'Gagal memperbarui mitra')
    }
  }

  const handleAddOwnerWarehouse = async (warehouseId: string) => {
    if (!selectedRow?.id) return
    try {
      const msg = await assignOwnerWarehouseMutation.mutateAsync({
        ownerId: selectedRow.id,
        warehouseId,
      })
      toast.success('Berhasil', msg || 'Akses gudang berhasil ditambahkan')
      await detailQuery.refetch()
      refetch()
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Gagal', error.errorMessage?.[0] || error.message || 'Gagal menambahkan akses gudang')
      throw err
    }
  }

  const handleRemoveOwnerWarehouse = async (accessId: string) => {
    if (!selectedRow?.id) return
    try {
      const msg = await removeOwnerWarehouseMutation.mutateAsync({ accessId })
      toast.success('Berhasil', msg || 'Akses gudang berhasil dihapus')
      await detailQuery.refetch()
      refetch()
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Gagal', error.errorMessage?.[0] || error.message || 'Gagal menghapus akses gudang')
      throw err
    }
  }

  const handleAddSupplierWarehouse = async (warehouseId: string) => {
    if (!selectedRow?.id) return
    try {
      const msg = await assignSupplierWarehouseMutation.mutateAsync({
        supplierId: selectedRow.id,
        warehouseId,
      })
      toast.success('Berhasil', msg || 'Akses gudang pemasok berhasil ditambahkan')
      await detailQuery.refetch()
      refetch()
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Gagal', error.errorMessage?.[0] || error.message || 'Gagal menambahkan akses gudang pemasok')
      throw err
    }
  }

  const handleRemoveSupplierWarehouse = async (warehouseId: string) => {
    if (!selectedRow?.id) return
    try {
      const msg = await removeSupplierWarehouseMutation.mutateAsync({ businessPartyId: warehouseId })
      toast.success('Berhasil', msg || 'Akses gudang pemasok berhasil dihapus')
      await detailQuery.refetch()
      refetch()
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Gagal', error.errorMessage?.[0] || error.message || 'Gagal menghapus akses gudang pemasok')
      throw err
    }
  }

  const handleAddConsigneeWarehouse = async (warehouseId: string) => {
    if (!selectedRow?.id) return
    try {
      const msg = await assignConsigneeWarehouseMutation.mutateAsync({
        consigneeId: selectedRow.id,
        warehouseId,
      })
      toast.success('Berhasil', msg || 'Akses gudang penerima berhasil ditambahkan')
      await detailQuery.refetch()
      refetch()
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Gagal', error.errorMessage?.[0] || error.message || 'Gagal menambahkan akses gudang penerima')
      throw err
    }
  }

  const handleRemoveConsigneeWarehouse = async (warehouseId: string) => {
    if (!selectedRow?.id) return
    try {
      const msg = await removeConsigneeWarehouseMutation.mutateAsync({ businessPartyId: warehouseId })
      toast.success('Berhasil', msg || 'Akses gudang penerima berhasil dihapus')
      await detailQuery.refetch()
      refetch()
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Gagal', error.errorMessage?.[0] || error.message || 'Gagal menghapus akses gudang penerima')
      throw err
    }
  }

  const handleDeactivate = async (id: string) => {
    try {
      const msg = await deactivateMutation.mutateAsync(id)
      toast.success('Berhasil', msg || 'Mitra berhasil dinonaktifkan')
      await detailQuery.refetch()
      refetch()
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Gagal', error.errorMessage?.[0] || error.message || 'Gagal menonaktifkan mitra')
      throw err
    }
  }

  const handleReactivate = async (id: string) => {
    try {
      const msg = await reactivateMutation.mutateAsync(id)
      toast.success('Berhasil', msg || 'Mitra berhasil diaktifkan kembali')
      await detailQuery.refetch()
      refetch()
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Gagal', error.errorMessage?.[0] || error.message || 'Gagal mengaktifkan mitra')
      throw err
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const msg = await deleteMutation.mutateAsync(id)
      toast.success('Berhasil', msg || 'Mitra berhasil dihapus')
      closePanel()
      refetch()
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Gagal', error.errorMessage?.[0] || error.message || 'Gagal menghapus mitra')
      throw err
    }
  }

  const detailData = detailQuery.data ?? selectedRow
  const showDetailPanel = panelState === 'detail' && !!selectedRow
  const showFormPanel = panelState === 'create' || panelState === 'edit'
  const showSidePanel = showDetailPanel || showFormPanel

  return (
    <WithToaster>
      <div className="flex flex-col gap-3.5 animate-[fadeUp_0.22s_ease-out]">
        <div>
          <div className="text-[11px] text-[#a9b1c6] mb-0.5">Master Data</div>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[17px] font-bold text-[#001871] tracking-tight">Mitra Bisnis</h1>
              <p className="text-xs text-[#485885] mt-0.5">Kelola owner, pemasok, penerima, dan ekspedisi dalam satu tempat</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex border-b border-[#ebebeb] px-3">
            {ROLE_TABS.map((tab) => {
              const active = activeRole === tab.value
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveRole(tab.value)}
                  className={`px-3.5 py-2.5 text-xs border-b-2 -mb-px whitespace-nowrap transition-colors ${
                    active
                      ? 'text-[#001871] font-semibold border-[#001871]'
                      : 'text-[#485885] border-transparent hover:text-[#1f2b59]'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2.5 px-4 py-3.5 flex-wrap">
            <div className="relative flex-1 max-w-[280px] min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#949eb8] w-[13px] h-[13px]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama…"
                className="w-full border border-[#ebebeb] rounded-lg py-[7px] pl-8 pr-3 text-[13px] text-[#1f2b59] bg-white placeholder:text-[#949eb8] focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] transition-[border-color,box-shadow]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | BusinessPartyStatus)}
              className="border border-[#ebebeb] rounded-lg px-3 py-[7px] pr-8 text-[13px] text-[#1f2b59] bg-white appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%2712%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23485885%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center] focus:outline-none focus:border-[#001871]"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>

            {canCreate && (
              <div className="ml-auto">
                <button
                  type="button"
                  onClick={() => setPanelState('create')}
                  className="bg-[#001871] text-white border-none rounded-full px-4 py-[7px] pl-2 text-[13px] font-medium cursor-pointer flex items-center gap-2 whitespace-nowrap shadow-[0_2px_12px_rgba(0,24,113,0.2)] hover:opacity-90 transition-opacity"
                >
                  <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                    <Plus className="w-2.5 h-2.5 text-[#001871]" strokeWidth={3} />
                  </div>
                  Tambah Mitra
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3.5 items-start">
          <div className={`${showSidePanel ? 'flex-1 min-w-0' : 'w-full'} bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-[width] duration-200`}>
            <DataTable columns={columns} data={tableRows} selectedRow={selectedRow} onRowClick={handleRowClick} />
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
              }}
            />
          </div>

          <BusinessPartyDetailPanel
            open={showDetailPanel}
            data={detailData}
            isLoading={detailQuery.isLoading}
            isAssigningOwnerWarehouse={assignOwnerWarehouseMutation.isPending}
            isRemovingOwnerWarehouse={removeOwnerWarehouseMutation.isPending}
            isAssigningSupplierWarehouse={assignSupplierWarehouseMutation.isPending}
            isRemovingSupplierWarehouse={removeSupplierWarehouseMutation.isPending}
            isAssigningConsigneeWarehouse={assignConsigneeWarehouseMutation.isPending}
            isRemovingConsigneeWarehouse={removeConsigneeWarehouseMutation.isPending}
            isWarehouseOptionsLoading={warehouseOptionsQuery.isLoading}
            warehouseOptions={warehouseOptionsQuery.data ?? []}
            canUpdate={canUpdate}
            onClose={closePanel}
            onEdit={() => setPanelState('edit')}
            onDelete={handleDelete}
            onDeactivate={handleDeactivate}
            onReactivate={handleReactivate}
            onAddOwnerWarehouse={handleAddOwnerWarehouse}
            onRemoveOwnerWarehouse={handleRemoveOwnerWarehouse}
            onAddSupplierWarehouse={handleAddSupplierWarehouse}
            onRemoveSupplierWarehouse={handleRemoveSupplierWarehouse}
            onAddConsigneeWarehouse={handleAddConsigneeWarehouse}
            onRemoveConsigneeWarehouse={handleRemoveConsigneeWarehouse}
          />

          <BusinessPartyFormPanel
            open={showFormPanel}
            mode={panelState === 'edit' ? 'edit' : 'create'}
            initialData={panelState === 'edit' ? detailData : null}
            onClose={closePanel}
            onBack={() => setPanelState('detail')}
            onSubmit={panelState === 'edit' ? handleEdit : handleCreate}
          />
        </div>

        {totalItems === 0 && (
          <div className="bg-white border border-dashed border-[#dee1ed] rounded-xl px-4 py-6 text-center text-[12px] text-[#949eb8]">
            Tidak ada data mitra pada filter {roleTabLabel(activeRole)}.
          </div>
        )}
      </div>

    </WithToaster>
  )
}
