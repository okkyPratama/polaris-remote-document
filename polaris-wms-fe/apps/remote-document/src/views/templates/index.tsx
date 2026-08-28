import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { DataTable, Pagination, ConfirmDialog, toast, type ColumnDef } from '@polaris/ui'
import { formatTimestamp } from '@polaris/service'
import { WithToaster } from '../../components/WithToaster'
import { useTemplates, useDeleteTemplate, useAllTemplateAssignments } from '../../hooks/useTemplates'
import type { TemplateSummary, TemplateType, TemplateAssignment } from '../../types/template.types'
import { TEMPLATE_TYPE_META } from '../../types/template.types'
import { TemplateDetailPanel } from './TemplateDetailPanel'
import { UploadTemplateModal } from '../../components/editor/UploadTemplateModal'
import { PreviewModal } from '../../components/editor/PreviewModal'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ALL_TYPES: (TemplateType | 'ALL')[] = ['ALL', 'GRN', 'GIN', 'LPN_LABEL', 'PUTAWAY_LABEL', 'SHIPMENT_LABEL', 'INVENTORY_REPORT']

function TypeBadge({ type }: { type?: TemplateType | string }) {
  if (!type || !TEMPLATE_TYPE_META[type as TemplateType]) return null
  const meta = TEMPLATE_TYPE_META[type as TemplateType]
  return <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '9999px', letterSpacing: '0.03em', whiteSpace: 'nowrap', ...meta.badgeStyle }}>{meta.label}</span>
}

/** Derive the assignment label from assignments array */
function getAssignmentLabel(assignments: TemplateAssignment[] | undefined, isSystemDefault: boolean): { label: string; type: 'default' | 'owner' | 'warehouse' | 'company' | 'multi' } {
  if (isSystemDefault) return { label: 'Default Sistem', type: 'default' }
  if (!assignments || assignments.length === 0) return { label: 'Belum Ditugaskan', type: 'default' }

  const hasOwner = assignments.some((a) => a.ownerId)
  const hasWarehouse = assignments.some((a) => a.warehouseId)
  const hasCompany = assignments.some((a) => a.companyId)

  const parts: string[] = []
  if (hasOwner) parts.push('Owner')
  if (hasWarehouse) parts.push('Warehouse')
  if (hasCompany) parts.push('Company')

  if (parts.length > 1) return { label: parts.join(' + '), type: 'multi' }
  if (hasOwner) return { label: 'Owner', type: 'owner' }
  if (hasWarehouse) return { label: 'Warehouse', type: 'warehouse' }
  if (hasCompany) return { label: 'Company', type: 'company' }

  return { label: 'Ditugaskan', type: 'owner' }
}

const ASSIGNMENT_BADGE_STYLES: Record<string, { background: string; color: string }> = {
  default: { background: '#f1f3f8', color: '#485885' },
  owner: { background: 'rgba(245,158,11,0.12)', color: '#92640a' },
  warehouse: { background: 'rgba(59,130,246,0.12)', color: '#1d4ed8' },
  company: { background: 'rgba(16,185,129,0.12)', color: '#065f46' },
  multi: { background: 'rgba(139,92,246,0.12)', color: '#6d28d9' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export interface TemplatesPageProps {
  canCreate?: boolean
  canUpdate?: boolean
  canDelete?: boolean
}

export default function TemplatesPage({
  canCreate = false,
  canUpdate = false,
  canDelete = false,
}: TemplatesPageProps) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [selectedRow, setSelectedRow] = useState<TemplateSummary | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TemplateSummary | null>(null)
  const [typeFilter, setTypeFilter] = useState<TemplateType | 'ALL'>('ALL')
  const [showUpload, setShowUpload] = useState(false)
  const [previewId, setPreviewId] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setCurrentPage(1) }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const params = useMemo(() => ({ page: currentPage, pageSize }), [currentPage, pageSize])
  const { data: queryData, isLoading, refetch } = useTemplates(params)
  const deleteMutation = useDeleteTemplate()

  const rows = queryData?.data ?? []
  const totalItems = queryData?.total ?? 0

  // Fetch assignments for all templates in the current page
  const templateIds = useMemo(() => rows.map((r) => r.id), [rows])
  const { data: assignmentsMap } = useAllTemplateAssignments(templateIds)

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchesType = typeFilter === 'ALL' || r.templateType === typeFilter
      const q = debouncedSearch.toLowerCase()
      const matchesSearch = !q || r.name.toLowerCase().includes(q) || r.templateCode.toLowerCase().includes(q)
      return matchesType && matchesSearch
    })
  }, [rows, typeFilter, debouncedSearch])

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = { ALL: rows.length }
    for (const t of rows) if (t.templateType) c[t.templateType] = (c[t.templateType] ?? 0) + 1
    return c
  }, [rows])

  const panelOpen = !!selectedRow
  const closePanel = () => setSelectedRow(null)
  const handleRowClick = (row: TemplateSummary) => setSelectedRow(row)

  const handleEdit = () => {
    if (!selectedRow) return
    navigate(`/documents/template-editor/${selectedRow.id}`)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const msg = await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success('Berhasil', msg || 'Template berhasil dihapus')
      setDeleteTarget(null)
      setSelectedRow(null)
      refetch()
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Gagal', error.errorMessage?.[0] || error.message || 'Gagal menghapus template')
    }
  }

  const columns: ColumnDef<TemplateSummary>[] = [
    {
      header: 'Template',
      cell: (row) => (
        <div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#1f2b59' }}>{row.name}</div>
          <div style={{ fontSize: '10px', fontFamily: 'var(--mono, monospace)', color: '#949eb8', marginTop: '1px' }}>{row.templateCode}</div>
        </div>
      ),
    },
    {
      header: 'Tipe',
      cell: (row) => <TypeBadge type={row.templateType} />,
    },
    {
      header: 'Format',
      cell: (row) => (
        <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 7px', background: '#f1f3f8', color: '#485885', borderRadius: '6px' }}>{row.outputFormat}</span>
      ),
    },
    {
      header: 'Versi',
      cell: (row) => (
        <span style={{ fontSize: '10px', fontFamily: 'var(--mono, monospace)', padding: '2px 7px', background: '#f1f3f8', color: '#485885', borderRadius: '6px' }}>v{row.version}</span>
      ),
    },
    {
      header: 'Ditugaskan Ke',
      cell: (row) => {
        const assignments = assignmentsMap?.[row.id]
        const { label, type } = getAssignmentLabel(assignments, row.isSystemDefault)
        const style = ASSIGNMENT_BADGE_STYLES[type] || ASSIGNMENT_BADGE_STYLES.default
        return (
          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '9999px', background: style.background, color: style.color, whiteSpace: 'nowrap' }}>
            {label}
          </span>
        )
      },
    },
    {
      header: 'Status',
      cell: (row) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '12px' }}>
          <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', marginRight: '4px', background: row.isActive ? '#55bf59' : '#a9b1c6' }} />
          {row.isActive ? 'Aktif' : 'Nonaktif'}
        </span>
      ),
    },
    {
      header: 'Diperbarui',
      cell: (row) => <span style={{ fontSize: '12px', color: '#a9b1c6' }}>{formatTimestamp(row.updatedAt)}</span>,
    },
  ]

  return (
    <WithToaster>
      <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Header */}
        <div>
          <div style={{ fontSize: '11px', color: '#a9b1c6', marginBottom: '3px' }}>Konfigurasi &rsaquo; Template Dokumen</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#001871', letterSpacing: '-0.3px' }}>Template Dokumen &amp; Label</h1>
              <p style={{ fontSize: '12px', color: '#485885', marginTop: '2px' }}>Kelola template untuk GRN, GIN, label, dan laporan &mdash; tetapkan per owner</p>
            </div>
            {canCreate && (
              <button
                type="button"
                onClick={() => setShowUpload(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: '#001871', color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                <Plus style={{ width: '13px', height: '13px' }} strokeWidth={2} />
                Unggah Template
              </button>
            )}
          </div>
        </div>

        {/* Filter Card */}
        <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.03)' }}>
          {/* Type filter tabs */}
          <div style={{ borderBottom: '1px solid #ebebeb', display: 'flex', padding: '0 14px', overflowX: 'auto' }}>
            {ALL_TYPES.map((type) => {
              const isActive = typeFilter === type
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setTypeFilter(type); setSelectedRow(null); setCurrentPage(1) }}
                  style={{
                    padding: '10px 14px', fontSize: '12px',
                    color: isActive ? '#001871' : '#485885',
                    background: 'transparent', border: 'none',
                    borderBottom: `2px solid ${isActive ? '#001871' : 'transparent'}`,
                    cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: '-1px',
                    fontWeight: isActive ? 600 : 400, fontFamily: 'inherit', transition: 'color 0.1s',
                  }}
                >
                  {type === 'ALL' ? 'Semua' : TEMPLATE_TYPE_META[type as TemplateType]?.label ?? type}
                  {typeCounts[type] != null && (
                    <span style={{ fontSize: '10px', background: '#f1f3f8', padding: '1px 6px', borderRadius: '9999px', marginLeft: '4px' }}>{typeCounts[type]}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '320px' }}>
              <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: '#949eb8', pointerEvents: 'none' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau kode template..."
                style={{ width: '100%', border: '1px solid #ebebeb', borderRadius: '8px', padding: '7px 10px 7px 32px', fontSize: '13px', color: '#1f2b59', background: 'white', outline: 'none' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#001871'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,24,113,0.08)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#ebebeb'; e.currentTarget.style.boxShadow = 'none' }}
              />
            </div>
          </div>
        </div>

        {/* Table + Side Panel */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <div style={{ flex: panelOpen ? 1 : undefined, width: panelOpen ? undefined : '100%', minWidth: 0, background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.03)' }}>
            <DataTable
              columns={columns}
              data={filteredRows}
              selectedRow={selectedRow}
              onRowClick={handleRowClick}
              isLoading={isLoading}
            />
            <div style={{ padding: '10px 16px', borderTop: '1px solid #f1f3f8', background: '#fafbfd', fontSize: '11px', color: '#a9b1c6' }}>
              {filteredRows.length} dari {rows.length} template
            </div>
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
            />
          </div>

          <TemplateDetailPanel
            open={panelOpen}
            data={selectedRow}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onClose={closePanel}
            onEdit={handleEdit}
            onPreview={() => { if (selectedRow) setPreviewId(selectedRow.id) }}
            onDelete={() => { if (selectedRow) setDeleteTarget(selectedRow) }}
          />
        </div>

          </div>{/* close gap-14 flex col */}
        </div>{/* close padding scroll area */}
      </div>{/* close 100vh outer */}

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Template"
        description={`Hapus template "${deleteTarget?.name || ''}"? Data tidak dapat dikembalikan.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Upload modal */}
      {showUpload && <UploadTemplateModal onClose={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); refetch() }} />}

      {/* Preview modal */}
      {previewId && selectedRow && <PreviewModal templateId={previewId} templateName={selectedRow.name} onClose={() => setPreviewId(null)} />}
    </WithToaster>
  )
}
