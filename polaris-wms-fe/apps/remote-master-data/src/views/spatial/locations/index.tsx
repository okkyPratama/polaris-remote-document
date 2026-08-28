import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Layers, Plus, Search } from 'lucide-react'
import { DataTable, Pagination, EmptyState, toast, type ColumnDef } from '@polaris/ui'
import type {
  Location,
  LocationBulkItem,
  LocationFormData,
  LocationStatus,
  LocationType,
} from '../../../types/spatial.types'
import { LOCATION_TYPE_OPTIONS, locationTypeLabel, spatialStatusLabel } from '../../../types/spatial.types'
import {
  useLocations,
  useLocationDetail,
  useCreateLocation,
  useUpdateLocation,
  useBulkCreateLocations,
} from '../../../hooks/useLocations'
import { useZoneOptions } from '../../../hooks/useZoneOptions'
import { WithToaster } from '../../../components/WithToaster'
import { SpatialPageHeader } from '../components/SpatialPageHeader'
import { SpatialWarehouseContextCard } from '../components/SpatialWarehouseContextCard'
import { useResetOnWarehouseChange } from '../../../hooks/useResetOnWarehouseChange'
import { LocationDetailPanel } from './LocationDetailPanel'
import { LocationFormPanel } from './LocationFormPanel'
import { LocationBulkCreatePanel } from './LocationBulkCreatePanel'

type PanelState = 'closed' | 'detail' | 'create' | 'edit' | 'bulk'

export interface LocationsPageProps {
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

function formatZone(row: Location): string {
  if (row.zoneCode && row.zoneName) {
    return `${row.zoneCode} · ${row.zoneName}`
  }
  return row.zoneCode || row.zoneName || '—'
}

function formatCapacity(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return String(value)
}

function statusBadgeClass(status: LocationStatus): string {
  if (status === 'ACTIVE') return 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]'
  if (status === 'BLOCKED') return 'bg-[rgba(239,51,64,0.1)] text-[#ef3340]'
  return 'bg-[rgba(169,177,198,0.15)] text-[#a9b1c6]'
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
    title: 'Gagal memuat Lokasi',
    description: backendMsg || 'Terjadi kesalahan saat memuat data. Silakan coba lagi.',
  }
}

const columns: ColumnDef<Location>[] = [
  {
    header: 'Kode / Nama',
    cell: (row) => (
      <div>
        <div className="font-mono text-xs font-semibold text-[#001871]">{row.code}</div>
        <div className="text-[12px] text-[#485885] mt-0.5">{row.name || '—'}</div>
      </div>
    ),
  },
  {
    header: 'Zona',
    cell: (row) => <span className="text-xs text-[#485885]">{formatZone(row)}</span>,
  },
  {
    header: 'Tipe',
    cell: (row) => (
      <span className="text-xs text-[#485885]">{locationTypeLabel(row.locationType)}</span>
    ),
  },
  {
    header: 'Seq',
    cell: (row) => (
      <span className="font-mono text-xs text-[#485885]">{row.sequence}</span>
    ),
  },
  {
    header: 'Max LPN',
    cell: (row) => (
      <span className="text-xs text-[#485885]">{formatCapacity(row.maxLpnCount)}</span>
    ),
  },
  {
    header: 'Max berat',
    cell: (row) => (
      <span className="text-xs text-[#485885]">
        {row.maxWeightKg === null || row.maxWeightKg === undefined
          ? '—'
          : `${row.maxWeightKg} kg`}
      </span>
    ),
  },
  {
    header: 'Status',
    cell: (row) => (
      <span
        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadgeClass(row.status)}`}
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

export default function LocationsPage({ canCreate = false, canUpdate = false, canDelete = false }: LocationsPageProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | LocationStatus>('ALL')
  const [zoneFilter, setZoneFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | LocationType>('ALL')
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
    if ((panelState === 'create' || panelState === 'bulk') && !canCreate) {
      setPanelState(selectedId ? 'detail' : 'closed')
      return
    }
    if (panelState === 'edit' && !canUpdate) {
      setPanelState(selectedId ? 'detail' : 'closed')
    }
  }, [canCreate, canUpdate, panelState, selectedId])

  const {
    data: zoneOptions,
    isLoading: zoneOptionsLoading,
    isError: zoneOptionsError,
  } = useZoneOptions()

  const zoneFilterOptions = useMemo(() => {
    if (zoneOptionsError) {
      return [{ value: '', label: 'Gagal memuat Zona' }]
    }
    if (zoneOptionsLoading) {
      return [{ value: '', label: 'Memuat...' }]
    }
    return [
      { value: '', label: 'Semua Zona' },
      ...(zoneOptions ?? []).map((zone) => ({
        value: zone.id,
        label: `${zone.code} — ${zone.name}`,
      })),
    ]
  }, [zoneOptions, zoneOptionsError, zoneOptionsLoading])

  const { data: queryData, isLoading, isError, error, refetch, isFetching } = useLocations({
    search: debouncedSearch,
    status: statusFilter,
    zoneId: zoneFilter || undefined,
    locationType: typeFilter,
    page: currentPage,
    pageSize,
  })

  const detailQuery = useLocationDetail(selectedId)
  const createMutation = useCreateLocation()
  const updateMutation = useUpdateLocation()
  const bulkMutation = useBulkCreateLocations()
  const isMutating =
    createMutation.isPending || updateMutation.isPending || bulkMutation.isPending

  // If detail loads as BLOCKED while edit is open, drop back to detail.
  useEffect(() => {
    if (panelState === 'edit' && detailQuery.data?.status === 'BLOCKED') {
      setPanelState('detail')
    }
  }, [panelState, detailQuery.data?.status])

  const rows = queryData?.data ?? []
  const total = queryData?.total ?? 0
  const selectedRow = rows.find((row) => row.id === selectedId) ?? null
  const listError = isError ? resolveListError(error) : null
  const emptyMessage =
    debouncedSearch || statusFilter !== 'ALL' || zoneFilter || typeFilter !== 'ALL'
      ? 'Tidak ada Lokasi yang cocok dengan filter'
      : 'Belum ada Lokasi untuk gudang ini'

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
    setZoneFilter('')
    setTypeFilter('ALL')
    setCurrentPage(1)
  }, [])

  useResetOnWarehouseChange(resetForWarehouseChange)

  const getFormInitial = (): LocationFormData | undefined => {
    if (panelState !== 'edit' || !detailQuery.data) return undefined
    const detail = detailQuery.data
    if (detail.status === 'BLOCKED') return undefined
    return {
      zoneId: detail.zoneId,
      code: detail.code,
      name: detail.name,
      locationType: detail.locationType,
      sequence: detail.sequence,
      maxLpnCount: detail.maxLpnCount,
      maxWeightKg: detail.maxWeightKg,
      status: detail.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    }
  }

  const currentZone =
    panelState === 'edit' && detailQuery.data
      ? {
          id: detailQuery.data.zoneId,
          code: detailQuery.data.zoneCode || detailQuery.data.zoneId,
          name: detailQuery.data.zoneName || '',
        }
      : null

  const handleFormSubmit = async (data: LocationFormData) => {
    if (isMutating) return
    if (panelState === 'create' && !canCreate) return
    if (panelState === 'edit' && !canUpdate) return
    try {
      if (panelState === 'create') {
        const msg = await createMutation.mutateAsync(data)
        toast.success('Berhasil', msg || 'Lokasi berhasil ditambahkan')
      } else if (selectedId) {
        const msg = await updateMutation.mutateAsync({ id: selectedId, data })
        toast.success('Berhasil', msg || 'Lokasi berhasil diperbarui')
      }
      closePanel()
    } catch (err) {
      const apiError = err as { errorMessage?: string[]; message?: string }
      toast.error('Error', apiError.errorMessage?.[0] || apiError.message || 'Gagal menyimpan data')
    }
  }

  const handleBulkSubmit = async (items: LocationBulkItem[]) => {
    if (!canCreate || isMutating) return
    const result = await bulkMutation.mutateAsync(items)
    toast.success(
      'Berhasil',
      `${result.createdCount} Lokasi berhasil ditambahkan`
    )
    closePanel()
  }

  const openCreate = () => {
    if (!canCreate || isMutating) return
    setSelectedId(undefined)
    setPanelState('create')
  }

  const openBulk = () => {
    if (!canCreate || isMutating) return
    setSelectedId(undefined)
    setPanelState('bulk')
  }

  const openEdit = () => {
    if (!canUpdate || isMutating) return
    if (detailQuery.data?.status === 'BLOCKED') return
    setPanelState('edit')
  }

  const panelOpen = panelState !== 'closed'

  return (
    <WithToaster>
      <div className="flex flex-col gap-3.5 animate-[fadeUp_0.22s_ease-out]">
        <SpatialPageHeader
          title="Lokasi"
          subtitle="Kelola slot penyimpanan individual — rak, bin, lantai, dan staging area"
        />

        <SpatialWarehouseContextCard
          trailing={
            !isLoading && !isError ? (
              <span className="text-xs text-[#a9b1c6] bg-[#f1f3f8] px-3 py-1 rounded-lg font-mono whitespace-nowrap">
                {total} lokasi
              </span>
            ) : null
          }
        />

        <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-2.5 flex-wrap shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="relative flex-1 min-w-[200px] max-w-[280px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#949eb8] w-[13px] h-[13px]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama lokasi..."
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
            <option value="BLOCKED">Diblokir</option>
          </select>
          <select
            value={zoneFilter}
            disabled={zoneOptionsLoading || zoneOptionsError}
            onChange={(e) => {
              setZoneFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="border border-[#ebebeb] rounded-lg px-3 py-[7px] pr-8 text-[13px] text-[#1f2b59] bg-white appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%2712%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23485885%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center] cursor-pointer focus:outline-none focus:border-[#001871] max-w-[220px] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {zoneFilterOptions.map((opt) => (
              <option key={opt.value || opt.label} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as typeof typeFilter)
              setCurrentPage(1)
            }}
            className="border border-[#ebebeb] rounded-lg px-3 py-[7px] pr-8 text-[13px] text-[#1f2b59] bg-white appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%2712%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23485885%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center] cursor-pointer focus:outline-none focus:border-[#001871]"
          >
            <option value="ALL">Semua Tipe</option>
            {LOCATION_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {canCreate && (
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={openBulk}
                disabled={isMutating}
                className="border border-[#001871] text-[#001871] bg-white rounded-full px-4 py-[7px] pl-2 text-[13px] font-medium cursor-pointer flex items-center gap-2 whitespace-nowrap hover:bg-[rgba(0,24,113,0.04)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="w-5 h-5 rounded-full bg-[rgba(0,24,113,0.08)] flex items-center justify-center flex-shrink-0">
                  <Layers className="w-2.5 h-2.5 text-[#001871]" strokeWidth={2.5} />
                </div>
                Buat Massal
              </button>
              <button
                type="button"
                onClick={openCreate}
                disabled={isMutating}
                className="bg-[#001871] text-white border-none rounded-full px-4 py-[7px] pl-2 text-[13px] font-medium cursor-pointer flex items-center gap-2 whitespace-nowrap shadow-[0_2px_12px_rgba(0,24,113,0.2)] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                  <Plus className="w-2.5 h-2.5 text-[#001871]" strokeWidth={3} />
                </div>
                Tambah Lokasi
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

          <LocationDetailPanel
            open={panelState === 'detail' && !!selectedId}
            data={detailQuery.data}
            isLoading={detailQuery.isLoading || detailQuery.isFetching}
            error={detailQuery.error}
            onRetry={() => detailQuery.refetch()}
            onClose={closePanel}
            onEdit={canUpdate ? openEdit : undefined}
          />

          {(canCreate || canUpdate) && (
            <LocationFormPanel
              open={panelState === 'create' || panelState === 'edit'}
              mode={panelState === 'edit' ? 'edit' : 'create'}
              initialData={getFormInitial()}
              currentZone={currentZone}
              onClose={closePanel}
              onSubmit={handleFormSubmit}
            />
          )}

          {canCreate && (
            <LocationBulkCreatePanel
              open={panelState === 'bulk'}
              onClose={closePanel}
              onSubmit={handleBulkSubmit}
              isSubmitting={bulkMutation.isPending}
            />
          )}
        </div>
      </div>
    </WithToaster>
  )
}
