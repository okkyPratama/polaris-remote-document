import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast, SingleSelect } from '@polaris/ui'
import { templateApi, templateAssignmentApi } from '../../api/template.api'
import type { TemplateType, OutputFormat, SizeType, ValidMargin } from '../../types/template.types'
import { STANDARD_SIZES, VALID_MARGINS } from '../../types/template.types'
import { useOwnerOptionsLoader, useWarehouseOptionsLoader, useCompanyOptionsLoader } from '../../hooks/useMasterData'

interface UploadTemplateModalProps {
  onClose: () => void
  onSuccess: () => void
}

const TYPE_OPTIONS: { value: TemplateType; label: string }[] = [
  { value: 'GRN', label: 'GRN (Goods Receipt Note)' },
  { value: 'GIN', label: 'GIN (Goods Issue Note)' },
  { value: 'LPN_LABEL', label: 'Label LPN' },
  { value: 'PUTAWAY_LABEL', label: 'Label Putaway' },
  { value: 'SHIPMENT_LABEL', label: 'Label Pengiriman' },
  { value: 'INVENTORY_REPORT', label: 'Laporan Inventori' },
]

const FORMAT_OPTIONS: { value: OutputFormat; label: string }[] = [
  { value: 'PDF', label: 'PDF' },
]

// Default size type per template type
const TYPE_TO_SIZE: Record<TemplateType, SizeType> = {
  GRN: 'a5_document',
  GIN: 'a5_document',
  LPN_LABEL: 'sticker_4x8',
  PUTAWAY_LABEL: 'sticker_3x10',
  SHIPMENT_LABEL: 'thermal_a6',
  INVENTORY_REPORT: 'a5_document',
}

const EXAMPLE_JSON = `{
  "elements": [
    {
      "id": "el-1",
      "type": "static_text",
      "x_mm": 0, "y_mm": 0,
      "width_mm": 80, "height_mm": 8,
      "z_order": 1,
      "properties": {
        "content": "Teks contoh",
        "font_family": "Arial",
        "font_size_pt": 12,
        "font_bold": false,
        "font_italic": false,
        "alignment": "left"
      }
    }
  ]
}`

const selectStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #ebebeb',
  borderRadius: '8px',
  padding: '7px 32px 7px 11px',
  fontSize: '13px',
  color: '#1f2b59',
  background: '#fff',
  outline: 'none',
  appearance: 'none',
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23485885' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  cursor: 'pointer',
}

function generateCode(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 64)
}

export function UploadTemplateModal({ onClose, onSuccess }: UploadTemplateModalProps) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [templateCode, setTemplateCode] = useState('')
  const [typeCode, setTypeCode] = useState('')
  const [outputFormat, setOutputFormat] = useState('PDF')
  const [description, setDescription] = useState('')
  const [jsonSource, setJsonSource] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [selectedSizeType, setSelectedSizeType] = useState<SizeType | null>(null)
  const [selectedMargin, setSelectedMargin] = useState<ValidMargin>(3.0)
  const [assignOwnerId, setAssignOwnerId] = useState('')
  const [assignWarehouseId, setAssignWarehouseId] = useState('')
  const [assignCompanyId, setAssignCompanyId] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Master data options — loaded from API with search support
  const { loadOptions: loadOwnerOptions } = useOwnerOptionsLoader()
  const { loadOptions: loadWarehouseOptions } = useWarehouseOptionsLoader()
  const { loadOptions: loadCompanyOptions } = useCompanyOptionsLoader()

  // Memoized loaders to avoid re-creating on every render
  const ownerLoader = useCallback((q: string) => loadOwnerOptions(q), [loadOwnerOptions])
  const warehouseLoader = useCallback((q: string) => loadWarehouseOptions(q), [loadWarehouseOptions])
  const companyLoader = useCallback((q: string) => loadCompanyOptions(q), [loadCompanyOptions])
  const handleNameChange = (val: string) => {
    setName(val)
    if (!templateCode || templateCode === generateCode(name)) {
      setTemplateCode(generateCode(val))
    }
    if (errors.name) setErrors((p) => ({ ...p, name: '' }))
  }

  const validateFields = (action: 'json' | 'editor'): boolean => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Nama template wajib diisi'
    else if (name.trim().length > 128) e.name = 'Maksimal 128 karakter'
    if (!templateCode.trim()) e.code = 'Kode template wajib diisi'
    if (!typeCode) e.type = 'Tipe template wajib dipilih'
    if (action === 'json' && !jsonSource.trim()) e.json = 'Sumber template JSON wajib diisi'
    if (action === 'editor' && !selectedSizeType) e.size = 'Pilih ukuran kanvas terlebih dahulu'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validateJson = (val: string): boolean => {
    if (!val.trim()) { setJsonError(null); return false }
    try {
      const parsed = JSON.parse(val)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setJsonError('Harus berupa objek JSON'); return false
      }
      if (!parsed.elements || !Array.isArray(parsed.elements)) {
        setJsonError('JSON harus memiliki field "elements" berupa array'); return false
      }
      setJsonError(null); return true
    } catch (err) {
      setJsonError(err instanceof SyntaxError ? `JSON tidak valid: ${err.message}` : 'JSON tidak valid')
      return false
    }
  }

  const handleSubmit = async () => {
    if (!validateFields('json')) return
    if (!validateJson(jsonSource)) return
    setSaving(true)
    try {
      const parsed = JSON.parse(jsonSource)
      // Resolve size from JSON → selectedSizeType → default per type
      const resolvedSizeType: SizeType = (parsed.size?.type as SizeType) ?? selectedSizeType ?? TYPE_TO_SIZE[typeCode as TemplateType] ?? 'a5_document'
      const sizeEntry = STANDARD_SIZES[resolvedSizeType]
      // Resolve margin
      const rawMargin: number = parsed.margin_mm ?? parsed.marginMm ?? selectedMargin
      const marginMm: number = (VALID_MARGINS as readonly number[]).includes(rawMargin) ? rawMargin : sizeEntry.defaultMarginMm

      const pageSettingsJson = {
        sizeType: resolvedSizeType,
        widthMm: sizeEntry.widthMm,
        heightMm: sizeEntry.heightMm,
        marginMm,
        orientation: sizeEntry.orientation,
      }

      const savedTemplate = await templateApi.save({
        templateCode: templateCode.trim(),
        name: name.trim(),
        templateType: typeCode,
        outputFormat: outputFormat,
        description: description.trim() || undefined,
        templateContent: JSON.stringify(parsed.elements ?? []),
        pageSettingsJson,
        isSystemDefault: false,
        isActive: true,
      })

      // If any assignment scope is selected, call assign API
      if (assignOwnerId || assignWarehouseId || assignCompanyId) {
        try {
          const templateId = savedTemplate?.id || ''
          if (!templateId) {
            toast.warning('Peringatan', 'Template tersimpan, namun ID tidak tersedia untuk penugasan.')
            onSuccess()
            return
          }
          await templateAssignmentApi.assign({
            templateId,
            templateType: typeCode,
            ownerId: assignOwnerId || null,
            warehouseId: assignWarehouseId || null,
            companyId: assignCompanyId || null,
            effectiveFrom: new Date().toISOString().split('T')[0], // today
          })
        } catch (assignErr: unknown) {
          // Template saved successfully but assignment failed — notify but don't block
          let assignMsg = 'Template tersimpan, namun penugasan gagal.'
          if (assignErr && typeof assignErr === 'object' && 'errorMessage' in assignErr) {
            const a = assignErr as { errorMessage?: string[] }
            if (a.errorMessage?.[0]) assignMsg += ' ' + a.errorMessage[0]
          }
          toast.warning('Peringatan', assignMsg)
          onSuccess()
          return
        }
      }

      toast.success('Berhasil', 'Template berhasil disimpan.')
      onSuccess()
    } catch (err: unknown) {
      let msg = 'Gagal menyimpan template'
      if (err && typeof err === 'object' && 'errorMessage' in err) {
        const a = err as { errorMessage?: string[] }
        if (a.errorMessage?.[0]) msg = a.errorMessage[0]
      }
      toast.error('Error', msg)
    } finally { setSaving(false) }
  }

  const handleOpenEditor = () => {
    if (!validateFields('editor')) return
    const sizeType = selectedSizeType!
    onClose()
    navigate(`/documents/template-editor?size=${sizeType}&type=${typeCode}&format=${outputFormat}&margin=${selectedMargin}&name=${encodeURIComponent(name.trim())}&code=${encodeURIComponent(templateCode.trim())}`)
  }

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '680px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,.15)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '14px', right: '14px', background: 'none', border: 'none', cursor: 'pointer', color: '#a9b1c6', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>&times;</button>

        <div style={{ fontSize: '15px', fontWeight: 700, color: '#001871', marginBottom: '4px' }}>Unggah Template Baru</div>
        <div style={{ fontSize: '11px', color: '#485885', marginBottom: '16px' }}>Buat template dari JSON definition, atau pilih ukuran kanvas untuk membuat lewat editor visual.</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>

          {/* Nama Template */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 500, color: '#485885' }}>Nama Template <span style={{ color: '#ef3340' }}>*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="mis. Label Resi JNE v1"
              maxLength={128}
              style={{ width: '100%', border: `1px solid ${errors.name ? '#ef3340' : '#ebebeb'}`, borderRadius: '8px', padding: '7px 11px', fontSize: '13px', color: '#1f2b59', background: '#fff', outline: 'none' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#001871'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,24,113,.08)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = errors.name ? '#ef3340' : '#ebebeb'; e.currentTarget.style.boxShadow = 'none' }}
            />
            {errors.name && <span style={{ fontSize: '10px', color: '#ef3340' }}>{errors.name}</span>}
            {templateCode && <span style={{ fontSize: '10px', color: '#949eb8', fontFamily: 'var(--mono, monospace)' }}>Kode: {templateCode}</span>}
          </div>

          {/* Tipe + Format */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 500, color: '#485885' }}>Tipe Template <span style={{ color: '#ef3340' }}>*</span></label>
              <select
                value={typeCode}
                onChange={(e) => { setTypeCode(e.target.value); if (errors.type) setErrors((p) => ({ ...p, type: '' })) }}
                style={{ ...selectStyle, color: typeCode ? '#1f2b59' : '#949eb8', borderColor: errors.type ? '#ef3340' : '#ebebeb' }}
              >
                <option value="">&mdash; Pilih tipe &mdash;</option>
                {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {errors.type && <span style={{ fontSize: '10px', color: '#ef3340' }}>{errors.type}</span>}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 500, color: '#485885' }}>Format Keluaran</label>
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                style={selectStyle}
              >
                {FORMAT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Deskripsi */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 500, color: '#485885' }}>Deskripsi</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi singkat varian template ini"
              style={{ width: '100%', border: '1px solid #ebebeb', borderRadius: '8px', padding: '7px 11px', fontSize: '13px', color: '#1f2b59', background: '#fff', outline: 'none' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#001871'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,24,113,.08)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#ebebeb'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>

          {/* Pilih Ukuran Kanvas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 500, color: '#485885' }}>Pilih Ukuran Kanvas</label>
            <p style={{ fontSize: '10px', color: '#949eb8', margin: 0 }}>
              Pilih ukuran lalu klik &ldquo;Buka Editor Visual&rdquo; untuk membuat template secara visual. Atau tempel JSON langsung di bawah.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '4px' }}>
              {(Object.entries(STANDARD_SIZES) as [SizeType, (typeof STANDARD_SIZES)[SizeType]][]).map(([sizeType, entry]) => (
                <button
                  key={sizeType}
                  type="button"
                  onClick={() => { setSelectedSizeType((prev) => prev === sizeType ? null : sizeType); setSelectedMargin(entry.defaultMarginMm); if (errors.size) setErrors((p) => ({ ...p, size: '' })) }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px',
                    padding: '8px 10px', border: `1.5px solid ${selectedSizeType === sizeType ? '#001871' : '#ebebeb'}`,
                    borderRadius: '8px', background: selectedSizeType === sizeType ? 'rgba(0,24,113,0.04)' : '#fff',
                    cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.12s',
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#1f2b59' }}>{entry.name}</span>
                  <span style={{ fontSize: '9px', color: '#949eb8', fontFamily: 'var(--mono, monospace)' }}>
                    {entry.widthMm}&times;{entry.heightMm}mm &middot; margin {entry.defaultMarginMm}mm
                  </span>
                </button>
              ))}
            </div>

            {/* Margin selector */}
            {selectedSizeType && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <label style={{ fontSize: '11px', color: '#485885', fontWeight: 500 }}>Margin:</label>
                {VALID_MARGINS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMargin(m as ValidMargin)}
                    style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: selectedMargin === m ? 600 : 400, background: selectedMargin === m ? '#001871' : '#f1f3f8', color: selectedMargin === m ? '#fff' : '#485885', border: 'none' }}
                  >
                    {m} mm
                  </button>
                ))}
              </div>
            )}

            {/* Buka Editor Visual button */}
            {selectedSizeType && (
              <button
                type="button"
                onClick={handleOpenEditor}
                style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, padding: '7px 14px', marginTop: '4px', borderRadius: '8px', background: '#001871', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                Buka Editor Visual &rarr;
              </button>
            )}
            {errors.size && <span style={{ fontSize: '10px', color: '#ef3340' }}>{errors.size}</span>}
          </div>

          {/* Sumber Template (JSON) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 500, color: '#485885' }}>Sumber Template (JSON) <span style={{ color: '#ef3340' }}>*</span></label>
            <div style={{ border: `1px solid ${jsonError || errors.json ? '#ef3340' : '#ebebeb'}`, borderRadius: '8px', overflow: 'hidden' }}>
              <textarea
                value={jsonSource}
                onChange={(e) => { setJsonSource(e.target.value); validateJson(e.target.value); if (errors.json) setErrors((p) => ({ ...p, json: '' })) }}
                rows={10}
                placeholder={EXAMPLE_JSON}
                style={{ width: '100%', border: 'none', padding: '12px 14px', fontFamily: 'var(--mono, monospace)', fontSize: '12px', lineHeight: 1.6, color: '#1f2b59', background: '#fafbfd', resize: 'vertical', outline: 'none', minHeight: '140px' }}
              />
              {jsonError && <div style={{ padding: '6px 14px', fontSize: '11px', color: '#b91c1c', background: '#fef2f2', borderTop: '1px solid #fecaca' }}>{jsonError}</div>}
              <div style={{ padding: '6px 14px', background: '#f1f3f8', borderTop: '1px solid #ebebeb', fontSize: '10px', color: '#949eb8', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                <span>Required:</span>
                {['"elements"'].map((p) => <code key={p} style={{ background: 'rgba(0,24,113,.08)', color: '#001871', padding: '1px 4px', borderRadius: '3px', fontSize: '9px', fontFamily: 'var(--mono, monospace)' }}>{p}</code>)}
                <span style={{ marginLeft: '4px' }}>Optional:</span>
                {['"size"', '"margin_mm"'].map((p) => <code key={p} style={{ background: 'rgba(0,24,113,.08)', color: '#001871', padding: '1px 4px', borderRadius: '3px', fontSize: '9px', fontFamily: 'var(--mono, monospace)' }}>{p}</code>)}
                <span style={{ marginLeft: '4px', color: '#a9b1c6' }}>margin harus 2.0 / 2.5 / 3.0 mm</span>
              </div>
            </div>
            {errors.json && <span style={{ fontSize: '10px', color: '#ef3340' }}>{errors.json}</span>}
          </div>

          {/* Penugasan Template */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#001871' }}>Penugasan Template</label>
            <div style={{ fontSize: '10px', color: '#949eb8', marginBottom: '4px' }}>
              Tentukan scope penugasan template ini. Biarkan kosong untuk menggunakan sebagai default sistem.
            </div>
          </div>

          {/* Tugaskan ke Owner */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 500, color: '#485885' }}>Tugaskan ke Owner</label>
            <SingleSelect
              placeholder="— Tidak ditugaskan (Default Sistem) —"
              value={assignOwnerId}
              onChange={(val) => setAssignOwnerId(val)}
              loadOptions={ownerLoader}
              emptyMessage="Tidak ada owner ditemukan"
              debounce={300}
            />
          </div>

          {/* Tugaskan ke Gudang */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 500, color: '#485885' }}>Tugaskan ke Gudang</label>
            <SingleSelect
              placeholder="— Semua Gudang —"
              value={assignWarehouseId}
              onChange={(val) => setAssignWarehouseId(val)}
              loadOptions={warehouseLoader}
              emptyMessage="Tidak ada gudang ditemukan"
              debounce={300}
            />
          </div>

          {/* Tugaskan ke Company */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 500, color: '#485885' }}>Tugaskan ke Company</label>
            <SingleSelect
              placeholder="— Semua Company —"
              value={assignCompanyId}
              onChange={(val) => setAssignCompanyId(val)}
              loadOptions={companyLoader}
              emptyMessage="Tidak ada company ditemukan"
              debounce={300}
            />
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #f1f3f8' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: '#f1f3f8', color: '#1f2b59', border: '1px solid #ebebeb', cursor: 'pointer' }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: '#001871', color: '#fff', border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Menyimpan...' : 'Simpan Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
