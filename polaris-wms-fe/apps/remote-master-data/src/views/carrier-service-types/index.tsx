import { useState, useEffect, useMemo } from 'react'
import { Plus, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { DataTable, Pagination, toast, type ColumnDef } from '@polaris/ui'
import { formatTimestamp } from '@polaris/service'
import { WithToaster } from '../../components/WithToaster'
import {
  useCarrierServiceTypes,
  useCreateCarrierServiceType,
  useUpdateCarrierServiceType,
  useDeactivateCarrierServiceType,
} from '../../hooks/useCarrierServiceTypes'
import { businessPartiesApi } from '../../api/businessParty.api'
import type {
  CarrierServiceType,
  CarrierServiceTypeFormData,
  CarrierServiceTypeStatus,
} from '../../types/carrierServiceType.types'
import { CarrierServiceTypeDetailPanel } from './CarrierServiceTypeDetailPanel'
import { CarrierServiceTypeFormPanel } from './CarrierServiceTypeFormPanel'

function transitDisplay(min: number | null, max: number | null): string {
  if (min == null) return '—'
  if (max == null || max === min) return `${min} hari`
  return `${min}–${max} hari`
}

const columns: ColumnDef<CarrierServiceType>[] = [
  {
    header: 'Kode',
    cell: (row) => <span className="font-mono text-[12px] font-semibold text-[#001871]">{row.serviceCode}</span>,
  },
  {
    header: 'Nama Layanan',
    cell: (row) => <span className="text-[13px] font-medium text-[#1f2b59]">{row.serviceName}</span>,
  },
  {
    header: 'Ekspedisi',
    cell: (row) => (
      <div>
        <div className="text-[12px] font-medium text-[#1f2b59]">{row.carrierName}</div>
        <div className="text-[10px] font-mono text-[#a9b1c6] mt-0.5">{row.carrierCode}</div>
      </div>
    ),
  },
  {
    header: 'Mode',
    cell: (row) => <span className="text-[12px] text-[#485885]">{row.transportMode || '—'}</span>,
  },
  {
    header: 'Transit',
    cell: (row) => <span className="text-[12px] text-[#485885]">{transitDisplay(row.transitTimeMinDays, row.transitTimeMaxDays)}</span>,
  },
  {
    header: 'SLA',
    cell: (row) => <span className="text-[12px] text-[#485885]">{row.slaDays != null ? `${row.slaDays} hari` : '—'}</span>,
  },
  {
    header: 'Status',
    cell: (row) => (
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${row.status === 'ACTIVE' ? 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]' : 'bg-[rgba(169,177,198,0.15)] text-[#a9b1c6]'}`}>
        {row.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
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

type PanelState = 'closed' | 'detail' | 'create' | 'edit'

export interface CarrierServiceTypesPageProps {
  canCreate?: boolean
  canUpdate?: boolean
  canDelete?: boolean
}

export default function CarrierServiceTypesPage({
  canCreate = false,
  canUpdate = false,
}: CarrierServiceTypesPageProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter] = useState<'ALL' | CarrierServiceTypeStatus>('ALL')
  const [carrierFilter, setCarrierFilter] = useState('')
  const [onlyActive, setOnlyActive] = useState(false)
  const [panelState, setPanelState] = useState<PanelState>('closed')
  const [selectedRow, setSelectedRow] = useState<CarrierServiceType | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setCurrentPage(1) }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const effectiveStatus = useMemo(() => {
    if (onlyActive) return 'ACTIVE' as const
    return statusFilter
  }, [onlyActive, statusFilter])

  const { data: queryData, isLoading, refetch } = useCarrierServiceTypes({
    search: debouncedSearch,
    carrierId: carrierFilter || undefined,
    status: effectiveStatus,
    page: currentPage,
    pageSize,
  })

  // Fetch carrier (courier) options from business parties API
  const { data: carrierOptions = [] } = useQuery({
    queryKey: ['carrier-options-courier'],
    queryFn: async () => {
      const res = await businessPartiesApi.getAll({ role: 'COURIER', status: 'ACTIVE', pageSize: 100 })
      return res.data.map((bp) => ({ value: bp.id, label: `${bp.code} — ${bp.name}` }))
    },
    staleTime: 60_000,
  })

  const createMutation = useCreateCarrierServiceType()
  const updateMutation = useUpdateCarrierServiceType()
  const deactivateMutation = useDeactivateCarrierServiceType()

  const tableRows = queryData?.data ?? []
  const totalItems = queryData?.total ?? 0

  const closePanel = () => { setPanelState('closed'); setSelectedRow(null) }

  const handleRowClick = (row: CarrierServiceType) => {
    setSelectedRow(row)
    setPanelState('detail')
  }

  const handleCreate = async (payload: CarrierServiceTypeFormData) => {
    try {
      const msg = await createMutation.mutateAsync(payload)
      toast.success('Berhasil', msg || 'Tipe layanan berhasil ditambahkan')
      closePanel()
      refetch()
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Gagal', error.errorMessage?.[0] || error.message || 'Gagal menambahkan tipe layanan')
    }
  }

  const handleEdit = async (payload: CarrierServiceTypeFormData) => {
    if (!selectedRow) return
    try {
      const msg = await updateMutation.mutateAsync({ id: selectedRow.id, data: payload })
      toast.success('Berhasil', msg || 'Tipe layanan berhasil diperbarui')
      // Refresh table data
      const result = await refetch()
      // Update selectedRow with fresh data from refetched list
      const updated = result.data?.data?.find((item) => item.id === selectedRow.id)
      if (updated) setSelectedRow(updated)
      setPanelState('detail')
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Gagal', error.errorMessage?.[0] || error.message || 'Gagal memperbarui tipe layanan')
    }
  }

  const handleDeactivate = async (id: string) => {
    try {
      const msg = await deactivateMutation.mutateAsync(id)
      toast.success('Berhasil', msg || 'Tipe layanan berhasil dinonaktifkan')
      closePanel()
      refetch()
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Gagal', error.errorMessage?.[0] || error.message || 'Gagal menonaktifkan tipe layanan')
      throw err
    }
  }

  const detailData = selectedRow
  const showDetailPanel = panelState === 'detail' && !!selectedRow
  const showFormPanel = panelState === 'create' || panelState === 'edit'
  const showSidePanel = showDetailPanel || showFormPanel

  return (
    <WithToaster>
      <div className="flex flex-col gap-3.5 animate-[fadeUp_0.22s_ease-out]">
        {/* Page header */}
        <div>
          <div className="text-[11px] text-[#a9b1c6] mb-0.5">Master Data › Mitra Bisnis › Ekspedisi</div>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[17px] font-bold text-[#001871] tracking-tight">Tipe Layanan Ekspedisi</h1>
              <p className="text-xs text-[#485885] mt-0.5">Kelola tipe layanan per ekspedisi — transit time, SLA, dan mode transportasi</p>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-2.5 flex-wrap shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="relative flex-1 max-w-[280px] min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#949eb8] w-[13px] h-[13px]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama layanan…"
              className="w-full border border-[#ebebeb] rounded-lg py-[7px] pl-8 pr-3 text-[13px] text-[#1f2b59] bg-white placeholder:text-[#949eb8] focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] transition-[border-color,box-shadow]"
            />
          </div>

          {/* Carrier filter dropdown */}
          <select
            value={carrierFilter}
            onChange={(e) => { setCarrierFilter(e.target.value); setCurrentPage(1) }}
            className="border border-[#ebebeb] rounded-lg px-3 py-[7px] pr-8 text-[13px] text-[#1f2b59] bg-white appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%2712%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23485885%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center] cursor-pointer focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)]"
          >
            {[{ value: '', label: 'Semua Ekspedisi' }, ...carrierOptions].map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Active only chip */}
          <button
            type="button"
            onClick={() => setOnlyActive(!onlyActive)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-[6px] rounded-full border text-[12px] cursor-pointer transition-all select-none ${
              onlyActive
                ? 'bg-[rgba(0,24,113,0.08)] border-transparent text-[#001871] font-medium'
                : 'bg-transparent border-[#ebebeb] text-[#485885] hover:bg-[#f1f3f8]'
            }`}
          >
            Aktif saja
          </button>

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
                Tambah Tipe Layanan
              </button>
            </div>
          )}
        </div>

        {/* Content area: table + panel */}
        <div className="flex gap-3.5 items-start">
          <div className={`${showSidePanel ? 'flex-1 min-w-0' : 'w-full'} bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-[width] duration-200`}>
            <DataTable
              columns={columns}
              data={tableRows}
              isLoading={isLoading}
              selectedRow={selectedRow}
              onRowClick={handleRowClick}
            />
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
            />
          </div>

          <CarrierServiceTypeDetailPanel
            open={showDetailPanel}
            data={detailData}
            canUpdate={canUpdate}
            onClose={closePanel}
            onEdit={() => setPanelState('edit')}
            onDeactivate={canUpdate ? handleDeactivate : undefined}
          />

          <CarrierServiceTypeFormPanel
            open={showFormPanel}
            mode={panelState === 'edit' ? 'edit' : 'create'}
            initialData={panelState === 'edit' ? detailData : null}
            onClose={closePanel}
            onBack={() => panelState === 'edit' ? setPanelState('detail') : closePanel()}
            onSubmit={panelState === 'edit' ? handleEdit : handleCreate}
          />
        </div>
      </div>
    </WithToaster>
  )
}
