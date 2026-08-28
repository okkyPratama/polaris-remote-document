import { useEffect, useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { DataTable, Pagination, toast, type ColumnDef } from '@polaris/ui'
import { WithToaster } from '../../components/WithToaster'
import {
  useProducts,
  useProductDetail,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useDeactivateProduct,
  useReactivateProduct,
  useOwnerOptions,
  useCategoryOptions,
} from '../../hooks/useProducts'
import type { Product, ProductFormData, ProductStatus } from '../../types/product.types'
import { toProductFormData, LPN_TRACKING_LEVEL_OPTIONS } from '../../types/product.types'
import { ProductDetailPanel } from './ProductDetailPanel'
import { ProductFormPanel } from './ProductFormPanel'

const SELECT_CLS = "border border-[#ebebeb] rounded-lg px-3 py-[7px] pr-8 text-[13px] text-[#1f2b59] bg-white appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%2712%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23485885%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center] cursor-pointer focus:outline-none focus:border-[#001871]"

function statusBadgeClass(status: string) {
  if (status === 'ACTIVE') return 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]'
  if (status === 'INACTIVE') return 'bg-[rgba(169,177,198,0.18)] text-[#a9b1c6]'
  return 'bg-[rgba(169,177,198,0.18)] text-[#a9b1c6]'
}

function statusLabel(status: string) {
  if (status === 'ACTIVE') return 'Aktif'
  if (status === 'INACTIVE') return 'Nonaktif'
  return 'Diarsipkan'
}

function lpnLabel(level: string) {
  return LPN_TRACKING_LEVEL_OPTIONS.find((o) => o.value === level)?.label || level
}

const columns: ColumnDef<Product>[] = [
  {
    header: 'Kode SKU',
    cell: (row) => <span className="font-mono text-[12px] font-semibold text-[#001871]">{row.skuCode}</span>,
  },
  {
    header: 'Nama & Owner',
    cell: (row) => (
      <div>
        <div className="text-[13px] font-medium text-[#1f2b59]">{row.name}</div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(0,24,113,0.07)] text-[#001871]">
            {row.ownerName}
          </span>
        </div>
      </div>
    ),
  },
  {
    header: 'Kategori',
    cell: (row) => <span className="text-[12px] text-[#485885]">{row.categoryName || '—'}</span>,
  },
  {
    header: 'UOM',
    cell: (row) => <span className="font-mono text-[12px] font-medium text-[#485885]">{row.baseUom}</span>,
  },
  {
    header: 'Status & Atribut',
    cell: (row) => (
      <div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadgeClass(row.status)}`}>
          {statusLabel(row.status)}
        </span>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {row.lotTracking && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[rgba(0,24,113,0.06)] text-[#485885]">LOT</span>
          )}
          {row.expiryTracking && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[rgba(245,158,11,0.1)] text-[#f59e0b]">EXP</span>
          )}
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[rgba(72,88,133,0.08)] text-[#485885]">
            {lpnLabel(row.lpnTrackingLevel)}
          </span>
          {row.isHazardous && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[rgba(239,51,64,0.08)] text-[#ef3340]">HAZMAT</span>
          )}
        </div>
      </div>
    ),
  },
  {
    header: 'Dibuat',
    cell: (row) => <span className="text-[12px] text-[#a9b1c6]">{row.createdAt}</span>,
  },
  {
    header: 'Dibuat Oleh',
    cell: (row) => <span className="text-[12px] text-[#a9b1c6]">{row.createdBy || '—'}</span>,
  },
]

type PanelState = 'closed' | 'detail' | 'create' | 'edit'

export interface ProductsPageProps {
  canCreate?: boolean
  canUpdate?: boolean
  canDelete?: boolean
}

export default function ProductsPage({ canCreate = false, canUpdate = false, canDelete = false }: ProductsPageProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | ProductStatus>('ALL')
  const [panelState, setPanelState] = useState<PanelState>('closed')
  const [selectedRow, setSelectedRow] = useState<Product | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  // Query params
  const params = useMemo(
    () => ({
      search: debouncedSearch,
      ownerId: ownerFilter || undefined,
      categoryId: categoryFilter || undefined,
      status: statusFilter,
      page: currentPage,
      pageSize,
    }),
    [debouncedSearch, ownerFilter, categoryFilter, statusFilter, currentPage, pageSize]
  )

  // Queries
  const { data: queryData, refetch } = useProducts(params)
  const detailQuery = useProductDetail(selectedRow?.id)
  const ownerOptionsQuery = useOwnerOptions()
  const categoryOptionsQuery = useCategoryOptions()

  // Mutations
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const deleteMutation = useDeleteProduct()
  const deactivateMutation = useDeactivateProduct()
  const reactivateMutation = useReactivateProduct()

  const tableRows = queryData?.data ?? []
  const totalItems = queryData?.total ?? 0
  const ownerOptions = ownerOptionsQuery.data ?? []
  const categoryOptions = categoryOptionsQuery.data ?? []

  // Reset on filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [ownerFilter, categoryFilter, statusFilter])

  const closePanel = () => {
    setPanelState('closed')
    setSelectedRow(null)
  }

  const handleRowClick = (row: Product) => {
    setSelectedRow(row)
    setPanelState('detail')
  }

  const handleCreate = async (payload: ProductFormData) => {
    try {
      const msg = await createMutation.mutateAsync(payload)
      toast.success('Berhasil', msg || 'Produk berhasil ditambahkan')
      closePanel()
      refetch()
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Gagal', error.errorMessage?.[0] || error.message || 'Gagal menambahkan produk')
    }
  }

  const handleEdit = async (payload: ProductFormData) => {
    if (!selectedRow) return
    try {
      const msg = await updateMutation.mutateAsync({ id: selectedRow.id, data: payload })
      toast.success('Berhasil', msg || 'Produk berhasil diperbarui')
      setPanelState('detail')
      await detailQuery.refetch()
      refetch()
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Gagal', error.errorMessage?.[0] || error.message || 'Gagal memperbarui produk')
    }
  }

  const handleDeactivate = async (id: string) => {
    try {
      const msg = await deactivateMutation.mutateAsync(id)
      toast.success('Berhasil', msg || 'Produk berhasil dinonaktifkan')
      await detailQuery.refetch()
      refetch()
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Gagal', error.errorMessage?.[0] || error.message || 'Gagal menonaktifkan produk')
      throw err
    }
  }

  const handleReactivate = async (id: string) => {
    try {
      const msg = await reactivateMutation.mutateAsync(id)
      toast.success('Berhasil', msg || 'Produk berhasil diaktifkan kembali')
      await detailQuery.refetch()
      refetch()
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Gagal', error.errorMessage?.[0] || error.message || 'Gagal mengaktifkan produk')
      throw err
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const msg = await deleteMutation.mutateAsync(id)
      toast.success('Berhasil', msg || 'Produk berhasil dihapus')
      closePanel()
      refetch()
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Gagal', error.errorMessage?.[0] || error.message || 'Gagal menghapus produk')
      throw err
    }
  }

  const detailData = detailQuery.data ?? selectedRow
  const showDetailPanel = panelState === 'detail' && !!selectedRow
  const showFormPanel = panelState === 'create' || panelState === 'edit'
  const showSidePanel = showDetailPanel || showFormPanel

  const getFormInitial = (): ProductFormData | null => {
    if (panelState !== 'edit' || !detailData) return null
    return toProductFormData(detailData)
  }

  return (
    <WithToaster>
      <div className="flex flex-col gap-3.5 animate-[fadeUp_0.22s_ease-out]">
        {/* Page Header */}
        <div>
          <div className="text-[11px] text-[#a9b1c6] mb-0.5">Master Data</div>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[17px] font-bold text-[#001871] tracking-tight">Produk & SKU</h1>
              <p className="text-xs text-[#485885] mt-0.5">Kelola katalog produk, aturan pelacakan lot & kedaluwarsa, dan konfigurasi operasional per SKU</p>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-2.5 flex-wrap shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="relative flex-1 max-w-[260px] min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#949eb8] w-[13px] h-[13px]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, kode, GTIN, atau easy code…"
              className="w-full border border-[#ebebeb] rounded-lg py-[7px] pl-8 pr-3 text-[13px] text-[#1f2b59] bg-white placeholder:text-[#949eb8] focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] transition-[border-color,box-shadow]"
            />
          </div>

          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className={SELECT_CLS}
            style={{ minWidth: 170 }}
          >
            <option value="">Semua Owner</option>
            {ownerOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={SELECT_CLS}
            style={{ minWidth: 140 }}
          >
            <option value="">Semua Kategori</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | ProductStatus)}
            className={SELECT_CLS}
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
            <option value="ARCHIVED">Diarsipkan</option>
          </select>

          {canCreate && (
            <div className="ml-auto">
              <button
                type="button"
                onClick={() => { setSelectedRow(null); setPanelState('create') }}
                className="bg-[#001871] text-white border-none rounded-full px-4 py-[7px] pl-2 text-[13px] font-medium cursor-pointer flex items-center gap-2 whitespace-nowrap shadow-[0_2px_12px_rgba(0,24,113,0.2)] hover:opacity-90 transition-opacity"
              >
                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                  <Plus className="w-2.5 h-2.5 text-[#001871]" strokeWidth={3} />
                </div>
                Tambah SKU
              </button>
            </div>
          )}
        </div>

        {/* Content area: master-detail */}
        <div className="flex gap-3.5 items-start">
          <div className={`${showSidePanel ? 'flex-1 min-w-0' : 'w-full'} bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-[width] duration-200`}>
            <DataTable columns={columns} data={tableRows} selectedRow={selectedRow} onRowClick={handleRowClick} />
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
            />
          </div>

          <ProductDetailPanel
            open={showDetailPanel}
            data={detailData ?? null}
            isLoading={detailQuery.isLoading}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onClose={closePanel}
            onEdit={() => setPanelState('edit')}
            onDeactivate={handleDeactivate}
            onReactivate={handleReactivate}
            onDelete={handleDelete}
          />

          <ProductFormPanel
            open={showFormPanel}
            mode={panelState === 'edit' ? 'edit' : 'create'}
            initialData={getFormInitial()}
            ownerOptions={ownerOptions}
            categoryOptions={categoryOptions}
            hasReceipts={detailData?.hasReceipts ?? false}
            onClose={closePanel}
            onSubmit={panelState === 'edit' ? handleEdit : handleCreate}
          />
        </div>
      </div>
    </WithToaster>
  )
}
