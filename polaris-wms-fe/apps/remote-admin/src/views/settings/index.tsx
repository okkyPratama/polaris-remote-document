import { useState, useEffect, useCallback } from 'react'
import { Plus, Search } from 'lucide-react'
import { DataTable, Pagination, toast, type ColumnDef } from '@polaris/ui'
import { formatTimestamp } from '@polaris/service'
import type { ConfigHeader, ConfigDetail } from '../../types/config.types'
import { useConfigs, useConfigDetail, useCreateConfig, useUpdateConfig, useDeleteConfig } from '../../hooks/useConfigs'
import { WithToaster } from '../../components/WithToaster'
import { ConfigDetailPanel } from './ConfigDetailPanel'
import { ConfigOverrideFormPanel } from './ConfigOverrideFormPanel'
import { ConfigFormPanel, type ConfigFormData } from './ConfigFormPanel'
import { codesApi } from '../../api/codes.api'

/** Parse scope string "PRODUCT,OWNER" into flags */
function parseScopeFlags(scope?: string): string[] {
  if (!scope) return []
  return scope.split(',').map((s) => s.trim()).filter(Boolean)
}

const SCOPE_KEYS = [
  { key: 'COMPANY', label: 'E' },
  { key: 'WAREHOUSE', label: 'W' },
  { key: 'OWNER', label: 'O' },
  { key: 'PRODUCT', label: 'S' },
]


const columns: ColumnDef<ConfigHeader>[] = [
  {
    header: 'Kategori',
    cell: (row) => (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(0,24,113,0.07)] text-[#001871] whitespace-nowrap">
        {row.category || '—'}
      </span>
    ),
  },
  {
    header: 'Grup',
    cell: (row) => (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(0,24,113,0.07)] text-[#001871] whitespace-nowrap">
        {row.configGroup || '—'}
      </span>
    ),
  },
  {
    header: 'Parameter',
    cell: (row) => (
      <div>
        <div className="text-[13px] font-medium text-[#1f2b59]">{row.description || row.configKey}</div>
        <div className="text-[10px] font-mono text-[#a9b1c6] mt-0.5 tracking-wide">{row.configKey}</div>
      </div>
    ),
  },
  {
    header: 'System Default',
    cell: (row) => (
      <span className="text-[12px] font-mono text-[#485885]">{row.configValue || '—'}</span>
    ),
  },
  {
    header: 'E W O S',
    cell: (row) => {
      const flags = parseScopeFlags(row.scope)
      return (
        <div className="flex gap-0.5">
          {SCOPE_KEYS.map(({ key, label }) => (
            <span
              key={key}
              className={`w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center ${
                flags.includes(key)
                  ? 'bg-[#001871] text-white'
                  : 'bg-[#f1f3f8] text-[#a9b1c6]'
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      )
    },
  },
  {
    header: 'Overrides',
    cell: (row) => (
      row.detailCount > 0
        ? <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[rgba(245,158,11,0.12)] text-[#92640a] whitespace-nowrap">
            {row.detailCount} override{row.detailCount > 1 ? 's' : ''}
          </span>
        : <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#f1f3f8] text-[#a9b1c6]">None</span>
    ),
  },
  { header: 'Status', cell: (row) => <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${row.status === 'ACTIVE' ? 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]' : 'bg-[rgba(169,177,198,0.18)] text-[#a9b1c6]'}`}>{row.status}</span> },
  { header: 'Dibuat', cell: (row) => <span className="text-[12px] text-[#a9b1c6]">{formatTimestamp(row.createdAt || '')}</span> },
  { header: 'Dibuat Oleh', cell: (row) => <span className="text-[12px] text-[#a9b1c6]">{row.createdBy || '—'}</span> },
]

type PanelState = 'closed' | 'detail' | 'add-override' | 'edit-override' | 'create-config' | 'edit-config'

export interface SettingsPageProps {
  canCreate?: boolean
  canUpdate?: boolean
  canDelete?: boolean
  canCreateDetail?: boolean
  canUpdateDetail?: boolean
  canDeleteDetail?: boolean
}

export default function SettingsPage({ canCreate: _canCreate = false, canUpdate: _canUpdate = false, canDelete: _canDelete = false, canCreateDetail = false, canUpdateDetail = false, canDeleteDetail = false }: SettingsPageProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [categoryTabs, setCategoryTabs] = useState<{ value: string; label: string }[]>([])
  const [panelState, setPanelState] = useState<PanelState>('closed')
  const [selectedRow, setSelectedRow] = useState<ConfigHeader | null>(null)
  const [editingDetail, setEditingDetail] = useState<ConfigDetail | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Load category tabs from codes lookup API (CONFIG_CATEGORY)
  useEffect(() => {
    codesApi.lookup('CONFIG_CATEGORY', '*', '*').then((details) => {
      setCategoryTabs(details.map((d) => ({ value: d.codeId || d.codeName, label: d.codeName })))
    }).catch(() => {
      setCategoryTabs([])
    })
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setCurrentPage(1) }, 400)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch configs
  const { data: queryData, isLoading } = useConfigs({
    search: debouncedSearch || undefined,
    category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
    page: currentPage,
    pageSize,
  })

  const configs = queryData?.data ?? []
  const totalItems = queryData?.total ?? 0

  // Fetch detail when row is selected
  const { data: detailData } = useConfigDetail(selectedRow?.id)

  // Mutations for config header CRUD
  const createConfigMutation = useCreateConfig()
  const updateConfigMutation = useUpdateConfig()
  const deleteConfigMutation = useDeleteConfig()
  const isMutating = createConfigMutation.isPending || updateConfigMutation.isPending || deleteConfigMutation.isPending

  // Merge detail data into selectedRow
  const selectedWithDetail: ConfigHeader | null = selectedRow
    ? { ...selectedRow, ...(detailData || {}) }
    : null

  const closePanel = () => { setPanelState('closed'); setSelectedRow(null); setEditingDetail(null) }

  const handleRowClick = useCallback((row: ConfigHeader) => {
    setSelectedRow(row)
    setPanelState('detail')
    setEditingDetail(null)
  }, [])

  const handleAddOverride = useCallback(() => {
    setEditingDetail(null)
    setPanelState('add-override')
  }, [])

  const handleEditOverride = useCallback((detail: ConfigDetail) => {
    setEditingDetail(detail)
    setPanelState('edit-override')
  }, [])

  const handleBackToDetail = useCallback(() => {
    setEditingDetail(null)
    setPanelState('detail')
  }, [])

  const handleCreateConfig = useCallback(() => {
    setSelectedRow(null)
    setEditingDetail(null)
    setPanelState('create-config')
  }, [])

  const handleEditConfig = useCallback(() => {
    setPanelState('edit-config')
  }, [])

  const getConfigFormInitial = (): ConfigFormData | undefined => {
    if (panelState !== 'edit-config' || !selectedRow) return undefined
    return {
      configKey: selectedRow.configKey,
      configValue: selectedRow.configValue,
      dataType: selectedRow.dataType,
      description: selectedRow.description,
      category: selectedRow.category,
      configGroup: selectedRow.configGroup,
      typeCode: selectedRow.typeCode,
      scope: selectedRow.scope,
    }
  }

  const handleConfigFormSubmit = async (data: ConfigFormData) => {
    if (isMutating) return
    try {
      if (panelState === 'create-config') {
        await createConfigMutation.mutateAsync(data)
        toast.success('Berhasil', 'Config berhasil ditambahkan')
      } else if (panelState === 'edit-config' && selectedRow) {
        await updateConfigMutation.mutateAsync({
          id: selectedRow.id,
          data: {
            configValue: data.configValue,
            description: data.description,
            category: data.category,
            configGroup: data.configGroup,
          },
        })
        toast.success('Berhasil', 'Config berhasil diperbarui')
      }
      closePanel()
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Error', error.errorMessage?.[0] || error.message || 'Gagal menyimpan config')
    }
  }

  const handleDeleteConfig = async (id: string) => {
    if (isMutating) return
    try {
      await deleteConfigMutation.mutateAsync(id)
      toast.success('Berhasil', 'Config berhasil dihapus')
      closePanel()
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Error', error.errorMessage?.[0] || error.message || 'Gagal menghapus config')
    }
  }

  return (
    <WithToaster>
      <div className="flex flex-col gap-3.5 animate-[fadeUp_0.22s_ease-out]">
        {/* Page Header */}
        <div>
          <div className="text-[11px] text-[#a9b1c6] mb-0.5">Konfigurasi</div>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[17px] font-bold text-[#001871] tracking-tight">Konfigurasi Sistem</h1>
              <p className="text-xs text-[#485885] mt-0.5">
                Atur parameter global dan konfigurasi perilaku sistem per warehouse dan owner
              </p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {/* Category Tabs */}
          <div className="flex border-b border-[#ebebeb] px-3.5 overflow-x-auto">
            <button
              onClick={() => { setCategoryFilter('ALL'); setCurrentPage(1) }}
              className={`px-3.5 py-2.5 text-[12px] border-b-2 cursor-pointer bg-transparent whitespace-nowrap transition-colors ${
                categoryFilter === 'ALL'
                  ? 'text-[#001871] font-semibold border-[#001871]'
                  : 'text-[#485885] font-normal border-transparent hover:text-[#1f2b59]'
              }`}
            >
              Semua
            </button>
            {categoryTabs.map((cat) => (
              <button
                key={cat.value}
                onClick={() => { setCategoryFilter(cat.value); setCurrentPage(1) }}
                className={`px-3.5 py-2.5 text-[12px] border-b-2 cursor-pointer bg-transparent whitespace-nowrap transition-colors ${
                  categoryFilter === cat.value
                    ? 'text-[#001871] font-semibold border-[#001871]'
                    : 'text-[#485885] font-normal border-transparent hover:text-[#1f2b59]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Row */}
          <div className="px-4 py-3 flex items-center gap-2.5">
            <div className="relative flex-1 max-w-[320px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#949eb8] w-[13px] h-[13px]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau ID parameter…"
                className="w-full border border-[#ebebeb] rounded-lg py-[7px] pl-8 pr-3 text-[13px] text-[#1f2b59] bg-white placeholder:text-[#949eb8] focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] transition-[border-color,box-shadow]"
              />
            </div>
            {_canCreate && (
              <div className="ml-auto">
                <button
                  onClick={handleCreateConfig}
                  className="bg-[#001871] text-white border-none rounded-full px-4 py-[7px] pl-2 text-[13px] font-medium cursor-pointer flex items-center gap-2 whitespace-nowrap shadow-[0_2px_12px_rgba(0,24,113,0.2)] hover:opacity-90 transition-opacity"
                >
                  <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                    <Plus className="w-2.5 h-2.5 text-[#001871]" strokeWidth={3} />
                  </div>
                  Tambah Config
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Area: Table + Detail Panel */}
        <div className="flex gap-3.5 items-start">
          {/* Table */}
          <div className={`${panelState !== 'closed' ? 'flex-1 min-w-0' : 'w-full'} bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-[width] duration-200`}>
            <DataTable
              columns={columns}
              data={configs}
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

          {/* Detail Panel */}
          <ConfigDetailPanel
            open={panelState === 'detail' && !!selectedRow}
            data={selectedWithDetail}
            onClose={closePanel}
            onEdit={_canUpdate ? handleEditConfig : undefined}
            onDelete={_canDelete ? handleDeleteConfig : undefined}
            onAddOverride={canCreateDetail ? handleAddOverride : undefined}
            onEditOverride={canUpdateDetail ? handleEditOverride : undefined}
            canDeleteDetail={canDeleteDetail}
          />

          {/* Override Form Panel */}
          <ConfigOverrideFormPanel
            open={panelState === 'add-override' || panelState === 'edit-override'}
            config={selectedWithDetail}
            editDetail={editingDetail}
            onClose={closePanel}
            onBack={handleBackToDetail}
          />

          {/* Config Form Panel (Create / Edit Header) */}
          <ConfigFormPanel
            open={panelState === 'create-config' || panelState === 'edit-config'}
            mode={panelState === 'edit-config' ? 'edit' : 'create'}
            initialData={getConfigFormInitial()}
            onClose={closePanel}
            onSubmit={handleConfigFormSubmit}
          />
        </div>

        {/* Footer notice */}
        <div className="flex items-center gap-2 text-[11px] text-[#949eb8] px-1">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Perubahan konfigurasi berlaku segera setelah disimpan.
        </div>
      </div>
    </WithToaster>
  )
}
