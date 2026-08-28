import { useState, useRef, useEffect, useMemo } from 'react'
import { Plus, Search } from 'lucide-react'
import { DataTable, Pagination, EmptyState, toast, type ColumnDef } from '@polaris/ui'
import type {
  UomHierarchy,
  UomHierarchyFormData,
  UomLevel,
  UomStatus,
} from '../../types/uom.types'
import { uomStatusLabel } from '../../types/uom.types'
import {
  useUoms,
  useUomDetail,
  useCreateUom,
  useUpdateUom,
} from '../../hooks/useUoms'
import { WithToaster } from '../../components/WithToaster'
import { UomDetailPanel } from './UomDetailPanel'
import { UomFormPanel } from './UomFormPanel'
import { resolveOwnerContextMode } from './ownerContext'

export {
  normalizeOwnerContextIds,
  resolveOwnerContextMode,
  resolveOwnerFilterMode,
} from './ownerContext'

type PanelState = 'closed' | 'detail' | 'create' | 'edit'

export interface UomPageProps {
  /**
   * Owner scope from `/sessions/current`.
   * - `null` = unrestricted owner scope
   * - `[]` = no owner access
   * - `string[]` = scoped owners
   * - `undefined` = standalone remote / tests without session
   */
  ownerContextIds?: string[] | null
  /** UX gates for mutations. Backend permissions remain authoritative. */
  canCreate?: boolean
  canUpdate?: boolean
  /**
   * Reserved for future delete UX.
   * Delete UOM is deferred until Inventory usage guard is available (FR-017).
   * Until then, deactivate hierarchies via status INACTIVE on Edit.
   */
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

/** e.g. EA → IP (12 EA) → CT (72 EA) — levels assumed ASC from API layer. */
function formatHierarchy(levels: UomLevel[]): string {
  if (!levels.length) return '—'
  return levels
    .map((level, index) => {
      if (index === 0 || level.uomCode === 'EA') {
        return level.uomCode
      }
      return `${level.uomCode} (${level.conversionFactorToEa} EA)`
    })
    .join(' → ')
}

function mapDetailToForm(detail: UomHierarchy): UomHierarchyFormData {
  return {
    ownerId: detail.ownerId,
    skuCode: detail.skuCode,
    status: detail.status,
    levels: detail.levels.map((level) => ({
      id: level.id,
      uomCode: level.uomCode,
      displayName: level.displayName,
      level: level.level,
      conversionFactorToEa: level.conversionFactorToEa,
      parentUomCode: level.parentUomCode,
      status: level.status,
    })),
  }
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
        'Konteks Owner atau izin tidak tersedia. Pastikan konteks Owner aktif sudah dipilih.',
    }
  }

  return {
    title: 'Gagal memuat hierarki UOM',
    description: backendMsg || 'Terjadi kesalahan saat memuat data. Silakan coba lagi.',
  }
}

const columns: ColumnDef<UomHierarchy>[] = [
  {
    header: 'SKU',
    cell: (row) => (
      <span className="font-mono text-xs font-semibold text-[#001871]">{row.skuCode}</span>
    ),
  },
  {
    header: 'Owner',
    cell: (row) => (
      <span className="font-mono text-xs text-[#485885]" title={row.ownerId}>
        {row.ownerId || '—'}
      </span>
    ),
  },
  {
    header: 'Hierarki',
    cell: (row) => {
      const text = formatHierarchy(row.levels)
      return (
        <span className="text-xs text-[#485885] max-w-[320px] truncate block" title={text}>
          {text}
        </span>
      )
    },
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
        {uomStatusLabel(row.status)}
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

export default function UomPage({
  ownerContextIds,
  canCreate = false,
  canUpdate = false,
  canDelete = false,
}: UomPageProps) {
  /**
   * Delete UOM deferred until Inventory usage guard is available.
   * Keep prop/API/hook reserved; do not expose Hapus. Use INACTIVE via Edit instead.
   */
  void canDelete

  const { mode: ownerFilterMode, options: ownerOptions } = useMemo(
    () => resolveOwnerContextMode(ownerContextIds),
    [ownerContextIds]
  )
  const listQueryEnabled = ownerFilterMode !== 'none'
  const canOpenCreate = canCreate && ownerFilterMode !== 'none'

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [ownerFilter, setOwnerFilter] = useState(() =>
    ownerFilterMode === 'single' ? ownerOptions[0] ?? '' : ''
  )
  const [debouncedOwnerFilter, setDebouncedOwnerFilter] = useState(() =>
    ownerFilterMode === 'single' ? ownerOptions[0] ?? '' : ''
  )
  const [statusFilter, setStatusFilter] = useState<'ALL' | UomStatus>('ALL')
  const [panelState, setPanelState] = useState<PanelState>('closed')
  const [selectedId, setSelectedId] = useState<string>()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ownerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ownerOptionsKey = ownerOptions.join('\0')

  useEffect(() => {
    if (ownerFilterMode === 'single') {
      const only = ownerOptions[0] ?? ''
      setOwnerFilter(only)
      setDebouncedOwnerFilter(only)
      setCurrentPage(1)
      return
    }
    if (ownerFilterMode === 'multi' || ownerFilterMode === 'none') {
      setOwnerFilter('')
      setDebouncedOwnerFilter('')
      setCurrentPage(1)
    }
  }, [ownerFilterMode, ownerOptionsKey])

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      setCurrentPage(1)
    }, 300)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [search])

  useEffect(() => {
    if (ownerFilterMode !== 'free-text') return
    if (ownerDebounceRef.current) clearTimeout(ownerDebounceRef.current)
    ownerDebounceRef.current = setTimeout(() => {
      setDebouncedOwnerFilter(ownerFilter.trim())
      setCurrentPage(1)
    }, 300)
    return () => {
      if (ownerDebounceRef.current) clearTimeout(ownerDebounceRef.current)
    }
  }, [ownerFilter, ownerFilterMode])

  useEffect(() => {
    if (panelState === 'create' && !canCreate) {
      setPanelState(selectedId ? 'detail' : 'closed')
      return
    }
    if (panelState === 'edit' && !canUpdate) {
      setPanelState(selectedId ? 'detail' : 'closed')
    }
  }, [canCreate, canUpdate, panelState, selectedId])

  const queryOwnerId =
    ownerFilterMode === 'single'
      ? ownerOptions[0] ?? ''
      : ownerFilterMode === 'multi'
        ? ownerFilter
        : debouncedOwnerFilter

  const { data: queryData, isLoading, isError, error, refetch, isFetching } = useUoms(
    {
      keyword: debouncedSearch,
      ownerId: queryOwnerId,
      status: statusFilter,
      page: currentPage,
      pageSize,
    },
    { enabled: listQueryEnabled }
  )

  const detailQuery = useUomDetail(selectedId)
  const createMutation = useCreateUom()
  const updateMutation = useUpdateUom()
  const isMutating = createMutation.isPending || updateMutation.isPending

  const rows = queryData?.data ?? []
  const total = queryData?.total ?? 0
  const selectedRow = rows.find((row) => row.id === selectedId) ?? null
  const panelOpen = panelState !== 'closed'
  const listError = isError ? resolveListError(error) : null
  const hasActiveFilter =
    Boolean(debouncedSearch.trim()) ||
    Boolean(queryOwnerId) ||
    statusFilter !== 'ALL'
  const emptyMessage = hasActiveFilter
    ? 'Tidak ada hierarki UOM yang cocok dengan filter'
    : 'Belum ada hierarki UOM'

  const handleScopedOwnerChange = (value: string) => {
    setOwnerFilter(value)
    setDebouncedOwnerFilter(value)
    setCurrentPage(1)
  }

  const closePanel = () => {
    setPanelState('closed')
    setSelectedId(undefined)
  }

  const getFormInitial = (): UomHierarchyFormData | undefined => {
    if (panelState !== 'edit' || !detailQuery.data) return undefined
    return mapDetailToForm(detailQuery.data)
  }

  const handleFormSubmit = async (data: UomHierarchyFormData) => {
    if (isMutating) return
    if (panelState === 'create' && !canCreate) return
    if (panelState === 'edit' && !canUpdate) return

    try {
      if (panelState === 'create') {
        const msg = await createMutation.mutateAsync(data)
        toast.success('Berhasil', msg || 'Hierarki UOM berhasil ditambahkan')
        closePanel()
        return
      }

      if (!selectedId) return
      const msg = await updateMutation.mutateAsync({ id: selectedId, data })
      toast.success('Berhasil', msg || 'Hierarki UOM berhasil diperbarui')
      setPanelState('detail')
    } catch (err) {
      const apiError = err as { errorMessage?: string[]; message?: string }
      toast.error(
        'Error',
        apiError.errorMessage?.[0] || apiError.message || 'Gagal menyimpan data'
      )
      // Keep form open on failure.
    }
  }

  const openCreate = () => {
    if (!canOpenCreate || isMutating) return
    setSelectedId(undefined)
    setPanelState('create')
  }

  const openEdit = () => {
    if (!canUpdate || isMutating || !detailQuery.data) return
    setPanelState('edit')
  }

  const handleFormClose = () => {
    if (panelState === 'edit' && selectedId) {
      setPanelState('detail')
      return
    }
    closePanel()
  }

  return (
    <WithToaster>
      <div className="flex flex-col gap-3.5 animate-[fadeUp_0.22s_ease-out]">
        <div>
          <div className="text-[11px] text-[#a9b1c6] mb-0.5">Master Data</div>
          <div>
            <h1 className="text-[17px] font-bold text-[#001871] tracking-tight">UOM</h1>
            <p className="text-xs text-[#485885] mt-0.5">
              Hierarki kemasan per Owner dan SKU
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-[280px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#949eb8] w-[13px] h-[13px]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari SKU..."
              className="w-full border border-[#ebebeb] rounded-lg py-[7px] pl-8 pr-3 text-[13px] text-[#1f2b59] bg-white placeholder:text-[#949eb8] focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] transition-[border-color,box-shadow]"
            />
          </div>
          {ownerFilterMode === 'free-text' ? (
            <input
              type="text"
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              placeholder="Owner ID..."
              aria-label="Filter Owner ID"
              className="w-full max-w-[220px] border border-[#ebebeb] rounded-lg py-[7px] px-3 text-[13px] text-[#1f2b59] bg-white placeholder:text-[#949eb8] focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] transition-[border-color,box-shadow]"
            />
          ) : ownerFilterMode === 'none' ? null : (
            <select
              value={ownerFilterMode === 'single' ? ownerOptions[0] ?? '' : ownerFilter}
              disabled={ownerFilterMode === 'single'}
              onChange={(e) => handleScopedOwnerChange(e.target.value)}
              aria-label="Filter Owner"
              className="w-full max-w-[220px] border border-[#ebebeb] rounded-lg px-3 py-[7px] pr-8 text-[13px] text-[#1f2b59] bg-white appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%2712%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23485885%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center] cursor-pointer focus:outline-none focus:border-[#001871] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {ownerFilterMode === 'multi' && <option value="">Semua Owner</option>}
              {ownerOptions.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          )}
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
            <div className="ml-auto flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={openCreate}
                disabled={!canOpenCreate || isMutating}
                title={
                  ownerFilterMode === 'none'
                    ? 'User belum memiliki akses Owner.'
                    : undefined
                }
                className="bg-[#001871] text-white border-none rounded-full px-4 py-[7px] pl-2 text-[13px] font-medium cursor-pointer flex items-center gap-2 whitespace-nowrap shadow-[0_2px_12px_rgba(0,24,113,0.2)] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                  <Plus className="w-2.5 h-2.5 text-[#001871]" strokeWidth={3} />
                </div>
                Tambah Hierarki
              </button>
              {ownerFilterMode === 'none' && (
                <p className="text-[11px] text-[#ef3340]">
                  User belum memiliki akses Owner.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3.5 items-start">
          <div
            className={`${
              panelOpen ? 'flex-1 min-w-0' : 'w-full'
            } bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-[width] duration-200`}
          >
            {ownerFilterMode === 'none' ? (
              <EmptyState
                variant="no-data"
                title="User belum memiliki akses Owner."
                description="Akun Anda tidak memiliki konteks Owner. Hubungi admin untuk mendapatkan akses."
              />
            ) : isError ? (
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

          <UomDetailPanel
            open={panelState === 'detail' && !!selectedId}
            data={detailQuery.data}
            isLoading={detailQuery.isLoading || detailQuery.isFetching}
            error={detailQuery.error}
            onRetry={() => detailQuery.refetch()}
            onClose={closePanel}
            onEdit={canUpdate ? openEdit : undefined}
            isMutating={isMutating}
          />

          {(canCreate || canUpdate) && (
            <UomFormPanel
              open={panelState === 'create' || panelState === 'edit'}
              mode={panelState === 'edit' ? 'edit' : 'create'}
              ownerContextIds={ownerContextIds}
              initialData={getFormInitial()}
              onClose={handleFormClose}
              onSubmit={handleFormSubmit}
            />
          )}
        </div>
      </div>
    </WithToaster>
  )
}
