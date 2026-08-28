import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, Search } from 'lucide-react'
import { DataTable, Pagination, EmptyState, toast, type ColumnDef } from '@polaris/ui'
import type { ZoneGroup, ZoneGroupFormData, SpatialStatus } from '../../../types/spatial.types'
import { putawayModeLabel, spatialStatusLabel } from '../../../types/spatial.types'
import {
  useZoneGroups,
  useZoneGroupDetail,
  useCreateZoneGroup,
  useUpdateZoneGroup,
  useDeleteZoneGroup,
} from '../../../hooks/useZoneGroups'
import { WithToaster } from '../../../components/WithToaster'
import { SpatialPageHeader } from '../components/SpatialPageHeader'
import { SpatialWarehouseContextCard } from '../components/SpatialWarehouseContextCard'
import { useResetOnWarehouseChange } from '../../../hooks/useResetOnWarehouseChange'
import { ZoneGroupDetailPanel } from './ZoneGroupDetailPanel'
import { ZoneGroupFormPanel } from './ZoneGroupFormPanel'

type PanelState = 'closed' | 'detail' | 'create' | 'edit'

export interface ZoneGroupsPageProps {
  /** UX gates for mutations. Backend permissions remain authoritative. */
  canCreate?: boolean
  canUpdate?: boolean
  canDelete?: boolean
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function formatTemperature(min: number | null, max: number | null): string {
  const hasMin = min !== null && min !== undefined
  const hasMax = max !== null && max !== undefined
  if (!hasMin && !hasMax) return '—'
  if (hasMin && hasMax) return `${min}°C – ${max}°C`
  if (hasMin) return `${min}°C`
  return `${max}°C`
}

function resolveListError(error: unknown): { title: string; description: string } {
  const apiError = error as {
    httpCode?: number
    status?: number
    message?: string
    errorMessage?: string[]
  }
  const status = apiError?.httpCode ?? apiError?.status
  const backendMsg = apiError?.errorMessage?.[0] || apiError?.message

  if (status === 403) {
    return {
      title: 'Akses ditolak',
      description:
        backendMsg ||
        'Lingkup gudang atau izin tidak tersedia. Pastikan konteks gudang aktif sudah dipilih.',
    }
  }

  return {
    title: 'Gagal memuat Grup Zona',
    description: backendMsg || 'Terjadi kesalahan saat memuat data. Silakan coba lagi.',
  }
}

const columns: ColumnDef<ZoneGroup>[] = [
  {
    header: 'Kode',
    cell: (row) => (
      <span className="font-mono text-xs font-semibold text-[#001871]">{row.code}</span>
    ),
  },
  {
    header: 'Nama',
    cell: (row) => (
      <span className="text-[13px] font-medium text-[#1f2b59]">{row.name}</span>
    ),
  },
  {
    header: 'Suhu',
    cell: (row) => (
      <span className="text-xs text-[#485885]">
        {formatTemperature(row.temperatureMin, row.temperatureMax)}
      </span>
    ),
  },
  {
    header: 'Mode Putaway',
    cell: (row) => (
      <span className="text-xs text-[#485885]">{putawayModeLabel(row.defaultPutawayMode)}</span>
    ),
  },
  {
    header: 'Status',
    cell: (row) => (
      <span
        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          row.status === 'ACTIVE'
            ? 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]'
            : 'bg-[rgba(169,177,198,0.15)] text-[#a9b1c6]'
        }`}
      >
        {spatialStatusLabel(row.status)}
      </span>
    ),
  },
  {
    header: 'Diubah',
    cell: (row) => (
      <span className="text-[12px] text-[#a9b1c6]">{formatDate(row.updatedAt || row.createdAt)}</span>
    ),
  },
  {
    header: 'Diubah Oleh',
    cell: (row) => (
      <span className="text-[12px] text-[#a9b1c6]">{row.updatedBy || '—'}</span>
    ),
  },
]

export default function ZoneGroupsPage({ canCreate = false, canUpdate = false, canDelete = false }: ZoneGroupsPageProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | SpatialStatus>('ALL')
  const [panelState, setPanelState] = useState<PanelState>('closed')
  const [selectedId, setSelectedId] = useState<string>()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      setCurrentPage(1)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  // Drop mutation panels if corresponding capability is revoked
  useEffect(() => {
    if (panelState === 'create' && !canCreate) {
      setPanelState(selectedId ? 'detail' : 'closed')
      return
    }
    if (panelState === 'edit' && !canUpdate) {
      setPanelState(selectedId ? 'detail' : 'closed')
    }
  }, [canCreate, canUpdate, panelState, selectedId])

  const { data: queryData, isLoading, isError, error, refetch, isFetching } = useZoneGroups({
    search: debouncedSearch,
    status: statusFilter,
    page: currentPage,
    pageSize,
  })

  const detailQuery = useZoneGroupDetail(selectedId)
  const createMutation = useCreateZoneGroup()
  const updateMutation = useUpdateZoneGroup()
  const deleteMutation = useDeleteZoneGroup()
  const isMutating =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  const rows = queryData?.data ?? []
  const total = queryData?.total ?? 0
  const selectedRow = rows.find((row) => row.id === selectedId) ?? null
  const listError = isError ? resolveListError(error) : null
  const emptyMessage =
    debouncedSearch || statusFilter !== 'ALL'
      ? 'Tidak ada Grup Zona yang cocok dengan filter'
      : 'Belum ada Grup Zona untuk gudang ini'

  const closePanel = () => {
    setPanelState('closed')
    setSelectedId(undefined)
  }

  const resetForWarehouseChange = useCallback(() => {
    setPanelState('closed')
    setSelectedId(undefined)
    setSearch('')
    setDebouncedSearch('')
    setStatusFilter('ALL')
    setCurrentPage(1)
  }, [])

  useResetOnWarehouseChange(resetForWarehouseChange)

  const getFormInitial = (): ZoneGroupFormData | undefined => {
    if (panelState !== 'edit' || !detailQuery.data) return undefined
    const detail = detailQuery.data
    return {
      code: detail.code,
      name: detail.name,
      temperatureMin: detail.temperatureMin,
      temperatureMax: detail.temperatureMax,
      handlingRulesJson: detail.handlingRulesJson,
      defaultPutawayMode: detail.defaultPutawayMode,
      status: detail.status,
    }
  }

  const handleFormSubmit = async (data: ZoneGroupFormData) => {
    if (isMutating) return
    if (panelState === 'create' && !canCreate) return
    if (panelState === 'edit' && !canUpdate) return
    try {
      if (panelState === 'create') {
        const msg = await createMutation.mutateAsync(data)
        toast.success('Berhasil', msg || 'Grup Zona berhasil ditambahkan')
      } else if (selectedId) {
        const msg = await updateMutation.mutateAsync({ id: selectedId, data })
        toast.success('Berhasil', msg || 'Grup Zona berhasil diperbarui')
      }
      closePanel()
    } catch (err) {
      const apiError = err as { errorMessage?: string[]; message?: string }
      toast.error('Error', apiError.errorMessage?.[0] || apiError.message || 'Gagal menyimpan data')
    }
  }

  const handleDelete = async (id: string) => {
    if (!canDelete || isMutating) return
    try {
      const msg = await deleteMutation.mutateAsync(id)
      toast.success('Berhasil', msg || 'Grup Zona berhasil dihapus')
      closePanel()
    } catch (err) {
      const apiError = err as {
        httpCode?: number
        status?: number
        errorMessage?: string[]
        message?: string
      }
      const status = apiError.httpCode ?? apiError.status
      const message =
        status === 409
          ? 'Grup Zona tidak dapat dihapus karena masih memiliki Zona.'
          : apiError.errorMessage?.[0] || apiError.message || 'Gagal menghapus Grup Zona'
      toast.error('Error', message)
      throw err
    }
  }

  const openCreate = () => {
    if (!canCreate || isMutating) return
    setSelectedId(undefined)
    setPanelState('create')
  }

  const openEdit = () => {
    if (!canUpdate || isMutating) return
    setPanelState('edit')
  }

  const panelOpen = panelState !== 'closed'

  return (
    <WithToaster>
      <div className="flex flex-col gap-3.5 animate-[fadeUp_0.22s_ease-out]">
        <SpatialPageHeader
          title="Kelompok Zona"
          subtitle="Kelompok logis zona penyimpanan dalam gudang — mendefinisikan kondisi suhu dan tipe area"
        />

        <SpatialWarehouseContextCard
          trailing={
            !isLoading && !isError ? (
              <span className="text-xs text-[#a9b1c6] bg-[#f1f3f8] px-3 py-1 rounded-lg font-mono whitespace-nowrap">
                {total} kelompok
              </span>
            ) : null
          }
        />

        <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="relative flex-1 max-w-[280px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#949eb8] w-[13px] h-[13px]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama grup zona..."
              className="w-full border border-[#ebebeb] rounded-lg py-[7px] pl-8 pr-3 text-[13px] text-[#1f2b59] bg-white placeholder:text-[#949eb8] focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] transition-[border-color,box-shadow]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter)
              setCurrentPage(1)
            }}
            className="border border-[#ebebeb] rounded-lg px-3 py-[7px] pr-8 text-[13px] text-[#1f2b59] bg-white appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%2712%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23485885%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center] cursor-pointer focus:outline-none focus:border-[#001871]"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>
          {canCreate && (
            <div className="ml-auto">
              <button
                type="button"
                onClick={openCreate}
                className="bg-[#001871] text-white border-none rounded-full px-4 py-[7px] pl-2 text-[13px] font-medium cursor-pointer flex items-center gap-2 whitespace-nowrap shadow-[0_2px_12px_rgba(0,24,113,0.2)] hover:opacity-90 transition-opacity"
              >
                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                  <Plus className="w-2.5 h-2.5 text-[#001871]" strokeWidth={3} />
                </div>
                Tambah Grup Zona
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-3.5 items-start">
          <div
            className={`${
              panelOpen ? 'flex-1 min-w-0' : 'w-full'
            } bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-[width] duration-200`}
          >
            {isError ? (
              <EmptyState
                variant="error"
                title={listError?.title}
                description={listError?.description}
                action={
                  <button
                    type="button"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="bg-[#001871] text-white border-none rounded-full px-4 py-[7px] text-[13px] font-medium cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {isFetching ? 'Memuat...' : 'Coba lagi'}
                  </button>
                }
              />
            ) : (
              <>
                <DataTable
                  columns={columns}
                  data={rows}
                  isLoading={isLoading}
                  emptyMessage={emptyMessage}
                  selectedRow={selectedRow}
                  onRowClick={(row) => {
                    setSelectedId(row.id)
                    setPanelState('detail')
                  }}
                />
                <Pagination
                  currentPage={currentPage}
                  totalItems={total}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size)
                    setCurrentPage(1)
                  }}
                />
              </>
            )}
          </div>

          <ZoneGroupDetailPanel
            open={panelState === 'detail' && !!selectedId}
            data={detailQuery.data}
            isLoading={detailQuery.isLoading || detailQuery.isFetching}
            error={detailQuery.error}
            onRetry={() => detailQuery.refetch()}
            onClose={closePanel}
            onEdit={canUpdate ? openEdit : undefined}
            onDelete={canDelete ? handleDelete : undefined}
            isDeleting={deleteMutation.isPending}
          />

          {(canCreate || canUpdate) && (
            <ZoneGroupFormPanel
              open={panelState === 'create' || panelState === 'edit'}
              mode={panelState === 'edit' ? 'edit' : 'create'}
              initialData={getFormInitial()}
              onClose={closePanel}
              onSubmit={handleFormSubmit}
            />
          )}
        </div>
      </div>
    </WithToaster>
  )
}
