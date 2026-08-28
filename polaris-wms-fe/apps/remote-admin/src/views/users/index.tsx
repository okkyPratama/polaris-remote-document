import { useState, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import { DataTable, Pagination, toast, type ColumnDef } from '@polaris/ui'
import { formatTimestamp } from '@polaris/service'
import type { User, UserFormData } from '../../types/user.types'
import { usersApi } from '../../api/users.api'
import { rolesApi } from '../../api/roles.api'
import { useUsers, useCreateUser, useUpdateUser } from '../../hooks/useUsers'
import { WithToaster } from '../../components/WithToaster'
import { UserDetailPanel } from './UserDetailPanel'
import { UserFormPanel } from './UserFormPanel'

function initials(username: string): string {
  return username.split(/[\s._-]+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

const columns: ColumnDef<User>[] = [
  {
    header: 'Pengguna',
    cell: (row) => (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-[#001871] text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0 tracking-wide">{initials(row.username)}</div>
        <div>
          <div className="text-[13px] font-medium text-[#1f2b59]">{row.fullName}</div>
          <div className="text-[11px] text-[#a9b1c6] font-mono mt-0.5">{row.email}</div>
        </div>
      </div>
    ),
  },
  {
    header: 'Peran',
    cell: (row) => {
      const roles = row.roles ?? []
      if (roles.length === 0) return <span className="text-[11px] text-[#a9b1c6]">—</span>
      return (
        <div className="flex flex-wrap gap-1">
          {roles.map((r) => (
            <span key={r.id || r.code} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[rgba(0,24,113,0.07)] text-[#001871]">{r.code}</span>
          ))}
        </div>
      )
    },
  },
  { header: 'Gudang', cell: (row) => <span className="text-xs text-[#485885]">{row.warehouseCount ?? 0}</span> },
  {
    header: 'Status',
    cell: (row) => (
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${row.status === 'ACTIVE' ? 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]' : 'bg-[rgba(239,51,64,0.08)] text-[#ef3340]'}`}>
        {row.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
      </span>
    ),
  },
  { header: 'Dibuat', cell: (row) => <span className="text-[12px] text-[#a9b1c6]">{formatTimestamp(row.createdAt)}</span> },
  { header: 'Dibuat Oleh', cell: (row) => <span className="text-[12px] text-[#a9b1c6]">{row.createdBy}</span> },
]

type PanelState = 'closed' | 'detail' | 'create' | 'edit'

export interface UsersPageProps {
  canCreate?: boolean
  canUpdate?: boolean
  canDelete?: boolean
}

export default function UsersPage({ canCreate = false, canUpdate = false, canDelete = false }: UsersPageProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [roleOptions, setRoleOptions] = useState<{ value: string; label: string }[]>([])
  const [panelState, setPanelState] = useState<PanelState>('closed')
  const [selectedRow, setSelectedRow] = useState<User | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<User | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setCurrentPage(1) }, 400)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    rolesApi.getAll({ pageSize: 100 }).then((res) => {
      setRoleOptions(res.data.map((r) => ({ value: r.code, label: r.name })))
    }).catch(() => {})
  }, [])

  // React Query
  const { data: queryData, isLoading, refetch } = useUsers({
    search: debouncedSearch,
    status: statusFilter,
    roleCode: roleFilter === 'ALL' ? undefined : roleFilter,
    page: currentPage,
    pageSize,
  })

  const users = queryData?.data ?? []
  const totalItems = queryData?.total ?? 0

  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser()

  const isMutating = createMutation.isPending || updateMutation.isPending

  const closePanel = () => { setPanelState('closed'); setSelectedRow(null); setSelectedDetail(null) }

  const handleRowClick = async (row: User) => {
    setSelectedRow(row)
    setSelectedDetail(null)
    setPanelState('detail')
    setIsDetailLoading(true)
    try {
      const detail = await usersApi.getById(row.id)
      setSelectedDetail(detail ?? row)
    } catch {
      setSelectedDetail(row)
    } finally {
      setIsDetailLoading(false)
    }
  }

  const getFormInitial = (): UserFormData | undefined => {
    if (panelState !== 'edit' || !selectedRow) return undefined
    const source = selectedDetail ?? selectedRow
    const roleIds = Array.isArray(source.roles) ? source.roles.map((r) => r.id).filter(Boolean) : []
    const warehouseIds = (source.warehouses ?? []).map((w) => w.warehouseId)
    return {
      username: source.username,
      fullName: source.fullName ?? '',
      email: source.email,
      status: source.status,
      roleIds,
      warehouseIds,
      ownerIds: (source.owners ?? []).map((o) => o.ownerId),
    }
  }

  const handleFormSubmit = async (data: UserFormData) => {
    if (isMutating) return
    if (panelState === 'create' && !canCreate) return
    if (panelState === 'edit' && !canUpdate) return
    try {
      if (panelState === 'create') {
        const msg = await createMutation.mutateAsync(data)
        toast.success('Berhasil', msg || 'Pengguna berhasil ditambahkan')
      } else {
        const msg = await updateMutation.mutateAsync({ id: selectedRow!.id, data })
        toast.success('Berhasil', msg || 'Pengguna berhasil diperbarui')
      }
      closePanel()
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Error', error.errorMessage?.[0] || error.message || 'Gagal menyimpan data')
    }
  }

  return (
    <WithToaster>
    <div className="flex flex-col gap-3.5 animate-[fadeUp_0.22s_ease-out]">
      <div>
        <div className="text-[11px] text-[#a9b1c6] mb-0.5">Auth &amp; Keamanan</div>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[17px] font-bold text-[#001871] tracking-tight">Pengguna</h1>
            <p className="text-xs text-[#485885] mt-0.5">Kelola akun pengguna, penetapan peran, dan akses gudang</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="relative flex-1 max-w-[260px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#949eb8] w-[13px] h-[13px]" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }} placeholder="Cari nama..." className="w-full border border-[#ebebeb] rounded-lg py-[7px] pl-8 pr-3 text-[13px] text-[#1f2b59] bg-white placeholder:text-[#949eb8] focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] transition-[border-color,box-shadow]" />
        </div>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1) }} className="border border-[#ebebeb] rounded-lg px-3 py-[7px] pr-8 text-[13px] text-[#1f2b59] bg-white appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%2712%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23485885%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center] cursor-pointer focus:outline-none focus:border-[#001871]">
          <option value="ALL">Semua Peran</option>
          {roleOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setCurrentPage(1) }} className="border border-[#ebebeb] rounded-lg px-3 py-[7px] pr-8 text-[13px] text-[#1f2b59] bg-white appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%2712%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23485885%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center] cursor-pointer focus:outline-none focus:border-[#001871]">
          <option value="ALL">Semua Status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Nonaktif</option>
        </select>
        {canCreate && (
        <div className="ml-auto">
          <button onClick={() => { setSelectedRow(null); setPanelState('create') }} className="bg-[#001871] text-white border-none rounded-full px-4 py-[7px] pl-2 text-[13px] font-medium cursor-pointer flex items-center gap-2 whitespace-nowrap shadow-[0_2px_12px_rgba(0,24,113,0.2)] hover:opacity-90 transition-opacity">
            <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0"><Plus className="w-2.5 h-2.5 text-[#001871]" strokeWidth={3} /></div>
            Tambah Pengguna
          </button>
        </div>
        )}
      </div>

      <div className="flex gap-3.5 items-start">
        <div className={`${panelState !== 'closed' ? 'flex-1 min-w-0' : 'w-full'} bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-[width] duration-200`}>
          <DataTable columns={columns} data={users} selectedRow={selectedRow} onRowClick={handleRowClick} isLoading={isLoading} />
          <Pagination currentPage={currentPage} totalItems={totalItems} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }} />
        </div>

        <UserDetailPanel
          open={panelState === 'detail' && !!selectedRow}
          data={selectedDetail ?? selectedRow}
          isLoading={isDetailLoading}
          onClose={closePanel}
          onEdit={canUpdate ? () => setPanelState('edit') : undefined}
          onDeactivate={canUpdate ? async (id, reason) => {
            const result = await usersApi.deactivate(id, reason)
            toast.success('Berhasil', result.message || `Pengguna dinonaktifkan. ${result.sessionsInvalidated} sesi dibatalkan.`)
            refetch()
          } : undefined}
          onReactivate={canUpdate ? async (id) => {
            const msg = await usersApi.reactivate(id)
            toast.success('Berhasil', msg || 'Pengguna berhasil diaktifkan kembali.')
            refetch()
          } : undefined}
        />

        <UserFormPanel open={panelState === 'create' || panelState === 'edit'} mode={panelState === 'edit' ? 'edit' : 'create'} initialData={getFormInitial()} onClose={closePanel} onBack={() => setPanelState('detail')} onSubmit={handleFormSubmit} />
      </div>
    </div>
    </WithToaster>
  )
}
