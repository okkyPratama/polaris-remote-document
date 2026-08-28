import { useState, useRef, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { DataTable, Pagination, toast, type ColumnDef } from '@polaris/ui'
import { formatTimestamp } from '@polaris/service'
import type { CompanyGroup, CompanyGroupFormData } from '../../types/companyGroup.types'
import type { CompanyFormData } from '../../types/company.types'
import { useCompanyGroups, useCreateCompanyGroup, useUpdateCompanyGroup, useDeleteCompanyGroup } from '../../hooks/useCompanyGroups'
import { useCreateCompany, useUpdateCompany } from '../../hooks/useCompanies'
import { companyGroupApi } from '../../api/companyGroup.api'
import { WithToaster } from '../../components/WithToaster'
import { GroupDetailPanel } from './GroupDetailPanel'
import { GroupFormPanel } from './GroupFormPanel'
import { AssignEntityPanel } from './AssignEntityPanel'

const columns: ColumnDef<CompanyGroup>[] = [
  {
    header: 'Kode',
    cell: (row) => <span className="font-mono text-[12px] font-semibold text-[#001871]">{row.code}</span>,
  },
  {
    header: 'Nama Grup',
    cell: (row) => (
      <div>
        <div className="text-[13px] font-medium text-[#1f2b59]">{row.name}</div>
      </div>
    ),
  },
  {
    header: 'Perusahaan',
    cell: (row) => (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#485885] bg-[#f1f3f8] px-2.5 py-1 rounded-full">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="7" width="20" height="15" rx="1" />
          <path d="M16 7V5a2 2 0 0 0-4 0v2M8 7V5a2 2 0 0 0-4 0v2" />
          <line x1="12" y1="12" x2="12" y2="12.01" />
        </svg>
        {row.companyCount} perusahaan
      </span>
    ),
  },
  {
    header: 'Status',
    cell: (row) => (
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${row.status === 'AKTIF' ? 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]' : 'bg-[rgba(169,177,198,0.18)] text-[#a9b1c6]'}`}>
        {row.status}
      </span>
    ),
  },
  {
    header: 'Dibuat',
    cell: (row) => (
      <span className="text-[12px] text-[#a9b1c6]">{formatTimestamp(row.createdAt)}</span>
    ),
  },
  {
    header: 'Dibuat Oleh',
    cell: (row) => (
      <span className="text-[12px] text-[#a9b1c6]">{row.createdBy}</span>
    ),
  },
]

type PanelState = 'closed' | 'detail' | 'create' | 'edit' | 'assign-entity'

export interface CompanyGroupsPageProps {
  canCreate?: boolean
  canUpdate?: boolean
  canDelete?: boolean
}

export default function CompanyGroupsPage({ canCreate = false, canUpdate = false, canDelete = false }: CompanyGroupsPageProps) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AKTIF' | 'NONAKTIF'>('ALL')
  const [panelState, setPanelState] = useState<PanelState>('closed')
  const [selectedRow, setSelectedRow] = useState<CompanyGroup | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  // React Query — fetch data
  const { data: queryData, isLoading } = useCompanyGroups({
    search: debouncedSearch,
    status: statusFilter,
    page: currentPage,
    pageSize,
  })

  const groups = queryData?.data ?? []
  const total = queryData?.total ?? 0

  // Mutations
  const createMutation = useCreateCompanyGroup()
  const updateMutation = useUpdateCompanyGroup()
  const deleteMutation = useDeleteCompanyGroup()
  const createCompanyMutation = useCreateCompany()
  const updateCompanyMutation = useUpdateCompany()

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || createCompanyMutation.isPending || updateCompanyMutation.isPending

  const closePanel = () => { setPanelState('closed'); setSelectedRow(null) }

  const getFormInitial = (): CompanyGroupFormData | undefined => {
    if (panelState !== 'edit' || !selectedRow) return undefined
    return {
      code: selectedRow.code,
      name: selectedRow.name,
      description: selectedRow.description || '',
      address: selectedRow.address || '',
      contactPhone: selectedRow.contactPhone || '',
      contactEmail: selectedRow.contactEmail || '',
      contactName: selectedRow.contactName || '',
      status: selectedRow.status,
    }
  }

  const handleFormSubmit = async (data: CompanyGroupFormData) => {
    if (isMutating) return
    if (panelState === 'create' && !canCreate) return
    if (panelState === 'edit' && !canUpdate) return
    try {
      if (panelState === 'create') {
        const msg = await createMutation.mutateAsync(data)
        toast.success('Berhasil', msg || 'Group perusahaan berhasil ditambahkan')
      } else {
        const msg = await updateMutation.mutateAsync({ id: selectedRow!.id, data })
        toast.success('Berhasil', msg || 'Group perusahaan berhasil diperbarui')
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
      toast.success('Berhasil', msg || 'Group perusahaan berhasil dihapus')
      closePanel()
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Error', error.errorMessage?.[0] || error.message || 'Gagal menghapus group perusahaan')
    }
  }

  const handleAssignEntity = async (companyId: string) => {
    if (!canUpdate || isMutating || !selectedRow) return
    try {
      const msg = await companyGroupApi.assignCompany(selectedRow.id, companyId)
      toast.success('Berhasil', msg || 'Perusahaan berhasil ditambahkan ke grup')
      queryClient.invalidateQueries({ queryKey: ['company-groups'] })
      setPanelState('detail')
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Error', error.errorMessage?.[0] || error.message || 'Gagal menambahkan perusahaan ke grup')
    }
  }

  const handleCreateCompanyForGroup = async (data: CompanyFormData) => {
    if (!canUpdate || isMutating) return
    try {
      const msg = await createCompanyMutation.mutateAsync(data)
      toast.success('Berhasil', msg || 'Perusahaan berhasil dibuat dan ditambahkan ke grup')
      queryClient.invalidateQueries({ queryKey: ['company-groups'] })
      setPanelState('detail')
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Error', error.errorMessage?.[0] || error.message || 'Gagal membuat perusahaan')
    }
  }

  return (
    <WithToaster>
    <div className="flex flex-col gap-3.5 animate-[fadeUp_0.22s_ease-out]">
      <div>
        <div className="text-[11px] text-[#a9b1c6] mb-0.5">Konfigurasi</div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[17px] font-bold text-[#001871] tracking-tight">Grup Perusahaan</h1>
            <p className="text-xs text-[#485885] mt-0.5">Kelola grup perusahaan dan entitas (perusahaan anggota) yang menggunakan sistem</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="relative flex-1 max-w-[260px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#949eb8] w-[13px] h-[13px]" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }} placeholder="Cari nama atau kode grup..." className="w-full border border-[#ebebeb] rounded-lg py-[7px] pl-8 pr-3 text-[13px] text-[#1f2b59] bg-white placeholder:text-[#949eb8] focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] transition-[border-color,box-shadow]" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setCurrentPage(1) }} className="border border-[#ebebeb] rounded-lg px-3 py-[7px] pr-8 text-[13px] text-[#1f2b59] bg-white appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%2712%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23485885%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center] cursor-pointer focus:outline-none focus:border-[#001871]">
          <option value="ALL">Semua Status</option>
          <option value="AKTIF">Aktif</option>
          <option value="NONAKTIF">Nonaktif</option>
        </select>
        {canCreate && (
        <div className="ml-auto">
          <button onClick={() => { setSelectedRow(null); setPanelState('create') }} className="bg-[#001871] text-white border-none rounded-full px-4 py-[7px] pl-2 text-[13px] font-medium cursor-pointer flex items-center gap-2 whitespace-nowrap shadow-[0_2px_12px_rgba(0,24,113,0.2)] hover:opacity-90 transition-opacity">
            <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0"><Plus className="w-2.5 h-2.5 text-[#001871]" strokeWidth={3} /></div>
            Tambah Grup
          </button>
        </div>
        )}
      </div>

      {/* Table + Panel */}
      <div className="flex gap-3.5 items-start">
        <div className={`${panelState !== 'closed' ? 'flex-1 min-w-0' : 'w-full'} bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-[width] duration-200`}>
          <DataTable
            columns={columns}
            data={groups}
            isLoading={isLoading}
            selectedRow={selectedRow}
            onRowClick={(row) => { setSelectedRow(row); setPanelState('detail') }}
          />
          <Pagination
            currentPage={currentPage}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
          />
        </div>

        <GroupDetailPanel
          open={panelState === 'detail' && !!selectedRow}
          data={selectedRow}
          onClose={closePanel}
          onEdit={canUpdate ? () => setPanelState('edit') : undefined}
          onDelete={canDelete ? handleDelete : undefined}
          onAddEntity={canUpdate ? () => setPanelState('assign-entity') : undefined}
        />

        <GroupFormPanel
          open={panelState === 'create' || panelState === 'edit'}
          mode={panelState === 'edit' ? 'edit' : 'create'}
          initialData={getFormInitial()}
          onClose={closePanel}
          onSubmit={handleFormSubmit}
        />

        <AssignEntityPanel
          open={panelState === 'assign-entity'}
          group={selectedRow}
          onClose={() => setPanelState('detail')}
          onAssign={handleAssignEntity}
          onCreateCompany={handleCreateCompanyForGroup}
        />
      </div>
    </div>
    </WithToaster>
  )
}
