import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, FileText, X, Download, Printer } from 'lucide-react'
import { useTemplates } from '@/hooks/useTemplates'
import { templatesApi } from '@/api/templateApi'
import { cn } from '@/lib/utils'
import UploadTemplateModal from '@/components/UploadTemplateModal'
import type { TemplateSummary, TemplateType, OutputFormat } from '@/types/template'
import { TEMPLATE_TYPE_META } from '@/types/template'

const ALL_TYPES: (TemplateType | 'ALL')[] = ['ALL', 'GRN', 'GIN', 'LPN_LABEL', 'PUTAWAY_LABEL', 'SHIPMENT_LABEL', 'INVENTORY_REPORT']
const FORMAT_LABEL: Record<OutputFormat, string> = { PDF: 'PDF', ZPL: 'ZPL', EXCEL: 'Excel' }

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function TypeBadge({ type }: { type?: TemplateType }) {
  if (!type || !TEMPLATE_TYPE_META[type]) return null
  const meta = TEMPLATE_TYPE_META[type]
  return <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '9999px', letterSpacing: '0.03em', whiteSpace: 'nowrap', ...meta.badgeStyle }}>{meta.label}</span>
}

function StatusDot({ active = true }: { active?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '12px' }}>
      <span className={cn('status-dot', active && 'active')} />
      {active ? 'Aktif' : 'Nonaktif'}
    </span>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TemplateListPage() {
  const navigate = useNavigate()
  const { data: templates = [], isLoading, isError, refetch } = useTemplates()

  const [typeFilter, setTypeFilter] = useState<TemplateType | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)

  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(search), 300); return () => clearTimeout(t) }, [search])

  const filtered = useMemo(() => templates.filter(t => {
    const mt = typeFilter === 'ALL' || t.template_type === typeFilter
    const q = debouncedSearch.toLowerCase()
    return mt && (!q || t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q))
  }), [templates, typeFilter, debouncedSearch])

  const selectedTemplate = useMemo(() => filtered.find(t => t.id === selectedId) ?? null, [filtered, selectedId])
  const previewTemplate = useMemo(() => previewId ? templates.find(t => t.id === previewId) : null, [previewId, templates])
  const typeCounts = useMemo(() => { const c: Record<string, number> = { ALL: templates.length }; for (const t of templates) if (t.template_type) c[t.template_type] = (c[t.template_type] ?? 0) + 1; return c }, [templates])

  if (isError) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '12px' }}>
      <p style={{ fontSize: '13px', color: '#ef3340' }}>Gagal memuat daftar template.</p>
      <button className="btn btn-secondary" onClick={() => refetch()}>Coba Lagi</button>
    </div>
  )

  return (
    <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Page Header */}
          <div>
            <div style={{ fontSize: '11px', color: '#a9b1c6', marginBottom: '3px' }}>Konfigurasi › Template Dokumen</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#001871', letterSpacing: '-0.3px' }}>Template Dokumen &amp; Label</h1>
                <p style={{ fontSize: '12px', color: '#485885', marginTop: '2px' }}>Kelola template untuk GRN, GIN, label, dan laporan — tetapkan per owner</p>
              </div>
              <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
                <Plus style={{ width: '13px', height: '13px' }} strokeWidth={2} />
                Unggah Template
              </button>
            </div>
          </div>

          {/* Filter Card */}
          <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.03)' }}>
            {/* Tabs */}
            <div className="filter-tabs-container">
              {ALL_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => { setTypeFilter(type); setSelectedId(null) }}
                  className={cn('filter-tab', typeFilter === type && 'active')}
                >
                  {type === 'ALL' ? 'Semua' : TEMPLATE_TYPE_META[type as TemplateType]?.label ?? type}
                  {typeCounts[type] != null && <span style={{ fontSize: '10px', background: '#f1f3f8', padding: '1px 6px', borderRadius: '9999px', marginLeft: '4px' }}>{typeCounts[type]}</span>}
                </button>
              ))}
            </div>
            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '320px' }}>
                <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: '#949eb8', pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cari nama atau kode template..."
                  className="search-input"
                />
              </div>
            </div>
          </div>

          {/* Content: table + panel */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            {/* Table card */}
            <div style={{ flex: selectedTemplate ? 1 : undefined, width: selectedTemplate ? undefined : '100%', minWidth: 0, background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.03)' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    {['Template', 'Tipe', 'Format', 'Ukuran', 'Status', 'Diperbarui'].map(h => (
                      <th key={h} style={h === 'Tipe' ? { minWidth: '110px' } : undefined}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j}><div style={{ height: '14px', background: '#f1f3f8', borderRadius: '4px', width: `${50 + (j * 17) % 40}%`, animation: 'pulse 1.5s ease-in-out infinite' }} /></td>
                      ))}
                    </tr>
                  )) : filtered.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: '48px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <FileText style={{ width: '32px', height: '32px', color: '#a9b1c6', opacity: 0.3 }} />
                        <p style={{ fontSize: '12px', color: '#a9b1c6' }}>{debouncedSearch || typeFilter !== 'ALL' ? 'Tidak ada template yang cocok.' : 'Belum ada template.'}</p>
                      </div>
                    </td></tr>
                  ) : filtered.map(t => {
                    const sel = t.id === selectedId
                    return (
                      <tr key={t.id} onClick={() => setSelectedId(p => p === t.id ? null : t.id)} className={cn(sel && 'row-selected')}>
                        <td>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: '#1f2b59' }}>{t.name}</div>
                          {t.description && <div style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: '#949eb8', marginTop: '1px' }}>{t.description}</div>}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}><TypeBadge type={t.template_type} /></td>
                        <td>{t.output_format ?? '—'}</td>
                        <td style={{ fontFamily: 'var(--mono)' }}>{t.size ? `${t.size.widthMm}×${t.size.heightMm}` : '—'}</td>
                        <td><StatusDot active={t.is_active !== false} /></td>
                        <td style={{ color: '#a9b1c6' }}>{formatDate(t.updated_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="table-footer">{filtered.length} dari {templates.length} template</div>
            </div>

            {/* Detail panel */}
            {selectedTemplate && (
              <div className="detail-panel">
                <button onClick={() => setSelectedId(null)} style={{ position: 'absolute', top: '14px', right: '14px', background: 'none', border: 'none', cursor: 'pointer', color: '#a9b1c6', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>×</button>
                <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: '#a9b1c6', marginBottom: '4px' }}>{selectedTemplate.id}</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#001871', paddingRight: '28px', marginBottom: '8px' }}>{selectedTemplate.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <TypeBadge type={selectedTemplate.template_type} />
                  <span className="format-badge">{selectedTemplate.output_format ?? '—'}</span>
                </div>
                <div className="panel-section">
                  <div className="panel-section-label">Info Template</div>
                  <div className="field-grid">
                    {([
                      ['Tipe', selectedTemplate.template_type ? TEMPLATE_TYPE_META[selectedTemplate.template_type]?.label : '—'],
                      ['Format Keluaran', selectedTemplate.output_format ? FORMAT_LABEL[selectedTemplate.output_format] : '—'],
                      ['Ukuran', selectedTemplate.size ? `${selectedTemplate.size.widthMm} × ${selectedTemplate.size.heightMm} mm` : '—'],
                      ['Margin', selectedTemplate.marginMm != null ? `${selectedTemplate.marginMm} mm` : '—'],
                      ['Dibuat', formatDate(selectedTemplate.created_at)],
                      ['Terakhir Diubah', formatDate(selectedTemplate.updated_at)],
                    ] as [string, string][]).map(([l, v]) => (
                      <div key={l} className="field-row">
                        <span className="field-lbl">{l}</span>
                        <span className="field-val">{v}</span>
                      </div>
                    ))}
                    <div className="field-row">
                      <span className="field-lbl">Status</span>
                      <StatusDot active={selectedTemplate.is_active !== false} />
                    </div>
                  </div>
                </div>
                <div className="panel-section" style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary" onClick={() => setPreviewId(selectedTemplate.id)}>Preview</button>
                  <button className="btn btn-primary" onClick={() => navigate(`/editor/${selectedTemplate.id}`)}>Edit Template</button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Preview modal */}
      {previewId && previewTemplate && <PreviewModal templateId={previewId} templateName={previewTemplate.name} onClose={() => setPreviewId(null)} />}

      {/* Upload template modal */}
      {showUpload && <UploadTemplateModal onClose={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); refetch() }} />}
    </div>
  )
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

function PreviewModal({ templateId, templateName, onClose }: { templateId: string; templateName: string; onClose: () => void }) {
  const MAX_JSON = 10_000
  const [json, setJson] = useState(JSON.stringify({ owner_name: 'Toko Jaya Makmur', receipt_number: 'RCV-20260801-001', lines: [{ sku_code: 'SKU-001', sku_name: 'Sepatu Sneakers', qty: '1' }] }, null, 2))
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const iframe = useRef<HTMLIFrameElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevUrl = useRef<string | null>(null)

  const gen = useCallback(async (d: Record<string, unknown>) => {
    setLoading(true)
    try { const b = await templatesApi.generate(templateId, { data: d }); if (prevUrl.current) URL.revokeObjectURL(prevUrl.current); const u = URL.createObjectURL(b); setPdfUrl(u); prevUrl.current = u; setErr(null) } catch {} finally { setLoading(false) }
  }, [templateId])

  const onChange = useCallback((v: string) => {
    setJson(v); if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { try { const p = JSON.parse(v); if (typeof p === 'object' && p && !Array.isArray(p)) { setErr(null); gen(p) } else setErr('Data harus objek JSON') } catch (e) { setErr(e instanceof SyntaxError ? e.message : 'JSON tidak valid') } }, 500)
  }, [gen])

  useEffect(() => { try { const p = JSON.parse(json); if (typeof p === 'object' && p && !Array.isArray(p)) gen(p) } catch {} }, []) // eslint-disable-line
  useEffect(() => () => { if (prevUrl.current) URL.revokeObjectURL(prevUrl.current) }, [])
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h) }, [onClose])

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '16px', width: '90vw', maxWidth: '1100px', height: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.2)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #ebebeb' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#001871' }}>Preview — {templateName}</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '5px 12px' }} onClick={() => { if (pdfUrl) { const a = document.createElement('a'); a.href = pdfUrl; a.download = 'preview.pdf'; a.click() } }}>⬇ Unduh</button>
            <button className="btn btn-primary" style={{ fontSize: '12px', padding: '5px 12px' }} onClick={() => { iframe.current?.contentWindow?.print() }}>🖨 Cetak</button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#a9b1c6', marginLeft: '8px' }}>✕</button>
          </div>
        </div>
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ width: '280px', borderRight: '1px solid #ebebeb', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fafbfd', borderBottom: '1px solid #ebebeb', fontSize: '12px', fontWeight: 500, color: '#485885' }}>
              <span>Data JSON</span><span style={{ color: '#949eb8', fontSize: '11px' }}>{json.length}/{MAX_JSON}</span>
            </div>
            <textarea value={json} onChange={e => { if (e.target.value.length <= MAX_JSON) onChange(e.target.value) }} spellCheck={false} style={{ flex: 1, width: '100%', border: 'none', padding: '12px', fontFamily: 'var(--mono)', fontSize: '11px', lineHeight: 1.6, color: '#1f2b59', background: '#fff', resize: 'none', outline: 'none' }} />
            {err && <div style={{ padding: '8px 12px', fontSize: '11px', color: '#b91c1c', background: '#fef2f2', borderTop: '1px solid #fecaca' }}>{err}</div>}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#e8e8e8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#fafbfd', borderBottom: '1px solid #ebebeb', fontSize: '11px', color: '#949eb8' }}>
              <span>Halaman:</span><input style={{ width: '30px', textAlign: 'center', border: '1px solid #ebebeb', borderRadius: '4px', fontSize: '11px', padding: '2px' }} defaultValue="1" /><span>dari 1</span>
            </div>
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px' }}>
              {loading && !pdfUrl && <p style={{ fontSize: '13px', color: '#666' }}>Membuat preview...</p>}
              {pdfUrl ? <iframe ref={iframe} src={pdfUrl} title="PDF Preview" style={{ width: '100%', height: '100%', border: 'none' }} /> : !loading && <p style={{ fontSize: '12px', color: '#999' }}>Masukkan data JSON yang valid</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
