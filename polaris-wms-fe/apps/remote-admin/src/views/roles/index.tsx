import { useState, useEffect, useCallback } from 'react'
import { Plus, Search } from 'lucide-react'
import { DataTable, Pagination, toast, type ColumnDef } from '@polaris/ui'
import { formatTimestamp } from '@polaris/service'
import type { Role, RoleFormData } from '../../types/role.types'
import { rolesApi } from '../../api/roles.api'
import { useRoles, useCreateRole, useUpdateRole, useDeleteRole } from '../../hooks/useRoles'
import { WithToaster } from '../../components/WithToaster'
import { RoleDetailPanel } from './RoleDetailPanel'
import { RoleFormPanel } from './RoleFormPanel'

const columns: ColumnDef<Role>[] = [  
  { header: 'Kode', cell: (row) => <span className="font-mono text-xs font-semibold text-[#001871]">{row.code}</span> },
  {
    header: 'Peran',
    cell: (row) => (
      <div>
        <div className="text-[13px] font-medium text-[#1f2b59]">{row.name}</div>
        <div className="text-[11px] text-[#a9b1c6] mt-0.5 max-w-[220px] truncate">{row.description}</div>
      </div>
    ),
  },
  {
    header: 'Tipe',
    cell: (row) => (
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${row.isSystem ? 'bg-[rgba(0,24,113,0.07)] text-[#001871]' : 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]'}`}>
        {row.isSystem ? 'Sistem' : 'Kustom'}
      </span>
    ),
  },
  { header: 'Pengguna', cell: (row) => <span className="text-xs text-[#485885]">{row.userCount ?? 0}</span> },
  { header: 'Dibuat', cell: (row) => <span className="text-[12px] text-[#a9b1c6]">{formatTimestamp(row.createdAt)}</span> },
  { header: 'Dibuat Oleh', cell: (row) => <span className="text-[12px] text-[#a9b1c6]">{row.createdBy}</span> },
]

type PanelState = 'closed' | 'detail' | 'create' | 'edit'

export interface RolesPageProps {
  canCreate?: boolean
  canUpdate?: boolean
  canDelete?: boolean
}

export default function RolesPage({ canCreate = false, canUpdate = false, canDelete = false }: RolesPageProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SYSTEM' | 'CUSTOM'>('ALL')
  const [panelState, setPanelState] = useState<PanelState>('closed')
  const [selectedRow, setSelectedRow] = useState<Role | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setCurrentPage(1) }, 400)
    return () => clearTimeout(timer)
  }, [search])

  // React Query
  const { data: queryData, isLoading } = useRoles({ search: debouncedSearch, type: typeFilter, page: currentPage, pageSize })

  const roles = queryData?.data ?? []
  const totalItems = queryData?.total ?? 0

  const createMutation = useCreateRole()
  const updateMutation = useUpdateRole()
  const deleteMutation = useDeleteRole()

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  const closePanel = () => { setPanelState('closed'); setSelectedRow(null) }

  const handleRowClick = useCallback(async (row: Role) => {
    setSelectedRow(row)
    setPanelState('detail')
    try {
      const detail = await rolesApi.getById(row.id)
      if (detail) setSelectedRow(detail)
    } catch { /* keep list data */ }
  }, [])

  const handleEditClick = useCallback(() => {
    if (!selectedRow) return
    setPanelState('edit')
  }, [selectedRow])

  const getFormInitial = (): RoleFormData | undefined => {
    if (panelState !== 'edit' || !selectedRow) return undefined
    const warehouseIds = selectedRow.scopes?.filter((s) => s.warehouseId).map((s) => s.warehouseId!) ?? []
    const permissionIds = selectedRow.permissions?.map((p) => p.id) ?? []
    return { code: selectedRow.code, name: selectedRow.name, description: selectedRow.description, warehouseIds, permissionIds }
  }

  const handleFormSubmit = async (data: RoleFormData) => {
    if (isMutating) return
    if (panelState === 'create' && !canCreate) return
    if (panelState === 'edit' && !canUpdate) return
    try {
      if (panelState === 'create') {
        const msg = await createMutation.mutateAsync(data)
        toast.success('Berhasil', msg || 'Peran berhasil ditambahkan')
      } else {
        const msg = await updateMutation.mutateAsync({ id: selectedRow!.id, data })
        toast.success('Berhasil', msg || 'Peran berhasil diperbarui')
      }
      closePanel()
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Error', error.errorMessage?.[0] || error.message || 'Gagal menyimpan data')
    }
  }

  const handleDelete = async (id: string) => {
    if (!canDelete || isMutating) return
    try {
      const msg = await deleteMutation.mutateAsync(id)
      toast.success('Berhasil', msg || 'Peran berhasil dihapus')
      closePanel()
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Error', error.errorMessage?.[0] || error.message || 'Gagal menghapus peran')
    }
  }

  return (
    <WithToaster>
      <div className="flex flex-col gap-3.5 animate-[fadeUp_0.22s_ease-out]">
      <div>
        <div className="text-[11px] text-[#a9b1c6] mb-0.5">Auth & Keamanan</div>
        <div>
          <h1 className="text-[17px] font-bold text-[#001871] tracking-tight">Peran & Izin</h1>
          <p className="text-xs text-[#485885] mt-0.5">Kelola peran sistem dan penetapan izin akses per modul</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="relative flex-1 max-w-[260px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#949eb8] w-[13px] h-[13px]" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama peran..." className="w-full border border-[#ebebeb] rounded-lg py-[7px] pl-8 pr-3 text-[13px] text-[#1f2b59] bg-white placeholder:text-[#949eb8] focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] transition-[border-color,box-shadow]" />
        </div>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value as typeof typeFilter); setCurrentPage(1) }} className="border border-[#ebebeb] rounded-lg px-3 py-[7px] pr-8 text-[13px] text-[#1f2b59] bg-white appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%2712%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23485885%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center] cursor-pointer focus:outline-none focus:border-[#001871]">
          <option value="ALL">Semua Tipe</option>
          <option value="SYSTEM">Sistem</option>
          <option value="CUSTOM">Kustom</option>
        </select>
        {canCreate && (
        <div className="ml-auto">
          <button onClick={() => { setSelectedRow(null); setPanelState('create') }} className="bg-[#001871] text-white border-none rounded-full px-4 py-[7px] pl-2 text-[13px] font-medium cursor-pointer flex items-center gap-2 whitespace-nowrap shadow-[0_2px_12px_rgba(0,24,113,0.2)] hover:opacity-90 transition-opacity">
            <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0"><Plus className="w-2.5 h-2.5 text-[#001871]" strokeWidth={3} /></div>
            Tambah Peran
          </button>
        </div>
        )}
      </div>

      <div className="flex gap-3.5 items-start">
        <div className={`${panelState !== 'closed' ? 'flex-1 min-w-0' : 'w-full'} bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-[width] duration-200`}>
          <DataTable columns={columns} data={roles} selectedRow={selectedRow} onRowClick={handleRowClick} isLoading={isLoading} />
          <Pagination currentPage={currentPage} totalItems={totalItems} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }} />
        </div>

        <RoleDetailPanel open={panelState === 'detail' && !!selectedRow} data={selectedRow} onClose={closePanel} onEdit={canUpdate ? handleEditClick : undefined} onDelete={canDelete ? handleDelete : undefined} />

        <RoleFormPanel open={panelState === 'create' || panelState === 'edit'} mode={panelState === 'edit' ? 'edit' : 'create'} initialData={getFormInitial()} onClose={closePanel} onBack={() => setPanelState('detail')} onSubmit={handleFormSubmit} />
      </div>
      </div>
    </WithToaster>
  )
}
