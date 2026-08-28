import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  DataTable,
  Pagination,
  EmptyState,
  toast,
  Select,
  SearchInput,
  AddButton,
  type ColumnDef,
} from '@polaris/ui'
import type { Zone, ZoneFormData, SpatialStatus } from '../../../types/spatial.types'
import { spatialStatusLabel, zoneActivityLabel } from '../../../types/spatial.types'
import {
  useZones,
  useZoneDetail,
  useCreateZone,
  useUpdateZone,
  useDeleteZone,
} from '../../../hooks/useZones'
import { useZoneGroupOptions } from '../../../hooks/useZoneGroupOptions'
import { WithToaster } from '../../../components/WithToaster'
import { SpatialPageHeader } from '../components/SpatialPageHeader'
import { SpatialWarehouseContextCard } from '../components/SpatialWarehouseContextCard'
import { useResetOnWarehouseChange } from '../../../hooks/useResetOnWarehouseChange'
import { ZoneDetailPanel } from './ZoneDetailPanel'
import { ZoneFormPanel } from './ZoneFormPanel'

type PanelState = 'closed' | 'detail' | 'create' | 'edit'

export interface ZonesPageProps {
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

function formatZoneGroup(row: Zone): string {
  if (row.zoneGroupCode && row.zoneGroupName) {
    return `${row.zoneGroupCode} · ${row.zoneGroupName}`
  }
  return row.zoneGroupCode || row.zoneGroupName || '—'
}

function formatActivities(activities: Zone['allowedActivities']): string {
  if (!activities.length) return '—'
  return activities.map(zoneActivityLabel).join(', ')
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
    title: 'Gagal memuat Zona',
    description: backendMsg || 'Terjadi kesalahan saat memuat data. Silakan coba lagi.',
  }
}

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Semua Status' },
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'INACTIVE', label: 'Nonaktif' },
]

const columns: ColumnDef<Zone>[] = [
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
    header: 'Grup Zona',
    cell: (row) => (
      <span className="text-xs text-[#485885]">{formatZoneGroup(row)}</span>
    ),
  },
  {
    header: 'Aktivitas',
    cell: (row) => (
      <span
        className="text-xs text-[#485885] max-w-[220px] truncate block"
        title={formatActivities(row.allowedActivities)}
      >
        {formatActivities(row.allowedActivities)}
      </span>
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

export default function ZonesPage({ canCreate = false, canUpdate = false, canDelete = false }: ZonesPageProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | SpatialStatus>('ALL')
  const [zoneGroupFilter, setZoneGroupFilter] = useState('')
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

  useEffect(() => {
    if (panelState === 'create' && !canCreate) {
      setPanelState(selectedId ? 'detail' : 'closed')
      return
    }
    if (panelState === 'edit' && !canUpdate) {
      setPanelState(selectedId ? 'detail' : 'closed')
    }
  }, [canCreate, canUpdate, panelState, selectedId])

  const {
    data: zoneGroupOptions,
    isLoading: zoneGroupOptionsLoading,
    isError: zoneGroupOptionsError,
  } = useZoneGroupOptions()

  const zoneGroupFilterOptions = useMemo(() => {
    if (zoneGroupOptionsError) {
      return [{ value: '', label: 'Gagal memuat Grup Zona' }]
    }
    if (zoneGroupOptionsLoading) {
      return [{ value: '', label: 'Memuat...' }]
    }
    return [
      { value: '', label: 'Semua Grup Zona' },
      ...(zoneGroupOptions ?? []).map((zg) => ({
        value: zg.id,
        label: `${zg.code} — ${zg.name}`,
      })),
    ]
  }, [zoneGroupOptions, zoneGroupOptionsError, zoneGroupOptionsLoading])

  const { data: queryData, isLoading, isError, error, refetch, isFetching } = useZones({
    search: debouncedSearch,
    status: statusFilter,
    zoneGroupId: zoneGroupFilter || undefined,
    page: currentPage,
    pageSize,
  })

  const detailQuery = useZoneDetail(selectedId)
  const createMutation = useCreateZone()
  const updateMutation = useUpdateZone()
  const deleteMutation = useDeleteZone()
  const isMutating =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  const rows = queryData?.data ?? []
  const total = queryData?.total ?? 0
  const selectedRow = rows.find((row) => row.id === selectedId) ?? null
  const listError = isError ? resolveListError(error) : null
  const emptyMessage =
    debouncedSearch || statusFilter !== 'ALL' || zoneGroupFilter
      ? 'Tidak ada Zona yang cocok dengan filter'
      : 'Belum ada Zona untuk gudang ini'

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
    setZoneGroupFilter('')
    setCurrentPage(1)
  }, [])

  useResetOnWarehouseChange(resetForWarehouseChange)

  const getFormInitial = (): ZoneFormData | undefined => {
    if (panelState !== 'edit' || !detailQuery.data) return undefined
    const detail = detailQuery.data
    return {
      zoneGroupId: detail.zoneGroupId,
      code: detail.code,
      name: detail.name,
      allowedActivities: detail.allowedActivities,
      status: detail.status,
    }
  }

  const currentZoneGroup =
    panelState === 'edit' && detailQuery.data
      ? {
          id: detailQuery.data.zoneGroupId,
          code: detailQuery.data.zoneGroupCode || detailQuery.data.zoneGroupId,
          name: detailQuery.data.zoneGroupName || '',
        }
      : null

  const handleFormSubmit = async (data: ZoneFormData) => {
    if (isMutating) return
    if (panelState === 'create' && !canCreate) return
    if (panelState === 'edit' && !canUpdate) return
    try {
      if (panelState === 'create') {
        const msg = await createMutation.mutateAsync(data)
        toast.success('Berhasil', msg || 'Zona berhasil ditambahkan')
      } else if (selectedId) {
        const msg = await updateMutation.mutateAsync({ id: selectedId, data })
        toast.success('Berhasil', msg || 'Zona berhasil diperbarui')
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
      toast.success('Berhasil', msg || 'Zona berhasil dihapus')
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
          ? 'Zona tidak dapat dihapus karena masih memiliki Lokasi.'
          : apiError.errorMessage?.[0] || apiError.message || 'Gagal menghapus Zona'
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
          title="Zona"
          subtitle="Definisikan zona fisik penyimpanan dan kelompok zona induknya dalam gudang"
        />

        <SpatialWarehouseContextCard
          trailing={
            !isLoading && !isError ? (
              <span className="text-xs text-[#a9b1c6] bg-[#f1f3f8] px-3 py-1 rounded-lg font-mono whitespace-nowrap">
                {total} zona
              </span>
            ) : null
          }
        />

        <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-2.5 flex-wrap shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Cari nama zona..."
          />
          <Select
            aria-label="Filter Status"
            className="w-auto"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter)
              setCurrentPage(1)
            }}
            options={STATUS_FILTER_OPTIONS}
          />
          <Select
            aria-label="Filter Grup Zona"
            className="w-auto max-w-[240px]"
            value={zoneGroupOptionsLoading || zoneGroupOptionsError ? '' : zoneGroupFilter}
            onChange={(e) => {
              setZoneGroupFilter(e.target.value)
              setCurrentPage(1)
            }}
            disabled={zoneGroupOptionsLoading || zoneGroupOptionsError}
            error={zoneGroupOptionsError ? 'Gagal memuat Grup Zona' : undefined}
            aria-busy={zoneGroupOptionsLoading || undefined}
            aria-invalid={zoneGroupOptionsError || undefined}
            options={zoneGroupFilterOptions}
          />
          {canCreate && (
            <div className="ml-auto">
              <AddButton
                type="button"
                label="Tambah Zona"
                onClick={openCreate}
                disabled={isMutating}
                className="disabled:opacity-60 disabled:cursor-not-allowed"
              />
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

          <ZoneDetailPanel
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
            <ZoneFormPanel
              open={panelState === 'create' || panelState === 'edit'}
              mode={panelState === 'edit' ? 'edit' : 'create'}
              initialData={getFormInitial()}
              currentZoneGroup={currentZoneGroup}
              onClose={closePanel}
              onSubmit={handleFormSubmit}
            />
          )}
        </div>
      </div>
    </WithToaster>
  )
}
