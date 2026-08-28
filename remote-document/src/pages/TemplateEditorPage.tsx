import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { templatesApi } from '@/api/templateApi'
import Canvas, { pixelToMm } from '@/components/Canvas'
import ElementPanel from '@/components/ElementPanel'
import PreviewModal from '@/components/PreviewModal'
import PropertiesPanel from '@/components/PropertiesPanel'
import SizeSelector from '@/components/SizeSelector'
import TemplateNameInput from '@/components/TemplateNameInput'
import { TemplateProvider, useTemplate } from '@/context/TemplateContext'
import type { ElementType, PageSize, Template, TemplateElement } from '@/types/template'
import { TEMPLATE_TYPE_META } from '@/types/template'
import { snapToGrid } from '@/utils/canvasUtils'

const DEFAULT_DIMENSIONS: Record<ElementType, { width: number; height: number }> = {
  static_text: { width: 30, height: 6 }, dynamic_text: { width: 30, height: 6 },
  barcode: { width: 40, height: 15 }, qrcode: { width: 15, height: 15 },
  image: { width: 20, height: 20 }, line: { width: 30, height: 2 },
  box: { width: 20, height: 20 }, repeater: { width: 100, height: 66 },
}

function getDefaultProperties(type: ElementType): TemplateElement['properties'] {
  switch (type) {
    case 'static_text': return { content: 'Teks Statis', font_family: 'Arial', font_size_pt: 12, font_bold: false, font_italic: false, alignment: 'left' as const }
    case 'dynamic_text': return { placeholder: 'field_name', font_family: 'Arial', font_size_pt: 12, font_bold: false, font_italic: false, alignment: 'left' as const }
    case 'barcode': return { format: 'code128' as const, data_source: 'static' as const, static_value: '1234567890', placeholder: '' }
    case 'qrcode': return { error_correction: 'M', data_source: 'static' as const, static_value: 'https://example.com', placeholder: '' }
    case 'image': return { source_url: '', source_type: 'url' as const }
    case 'line': return { thickness_mm: 0.5, orientation: 'horizontal' as const }
    case 'box': return { thickness_mm: 0.5, fill: false }
    case 'repeater': return { data_key: 'items', row_height_mm: 6, max_rows: 10, show_header: true, show_row_lines: true, columns: [{ label: 'No', placeholder: '_index', x_offset_mm: 0, width_mm: 10, font_family: 'Arial', font_size_pt: 7, alignment: 'center' as const }, { label: 'Item', placeholder: 'item_name', x_offset_mm: 10, width_mm: 60, font_family: 'Arial', font_size_pt: 7, alignment: 'left' as const }, { label: 'Qty', placeholder: 'qty', x_offset_mm: 70, width_mm: 20, font_family: 'Arial', font_size_pt: 7, alignment: 'center' as const }] }
  }
}

// ─── Editor Content ───────────────────────────────────────────────────────────

function EditorContent() {
  const { state, dispatch } = useTemplate()
  const { template } = state
  const [saving, setSaving] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{ name?: string; size?: string }>({})
  const [showPreview, setShowPreview] = useState(false)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [activeDragType, setActiveDragType] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 3 } }))

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current
    if (data?.type === 'canvas-element') { setActiveDragId(data.elementId as string); setActiveDragType('canvas-element') }
    else if (data?.type) { setActiveDragId(null); setActiveDragType(data.type as string) }
  }

  // Ref to avoid temporal dead zone — useEffect uses the ref, handleSave defined below
  const handleSaveRef = useRef<() => void>(() => {})

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        // Allow Ctrl+S even when inside input/textarea
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault()
          handleSaveRef.current()
        }
        return
      }

      const ids = state.selectedElementIds.length > 0 ? state.selectedElementIds : (state.selectedElementId ? [state.selectedElementId] : [])

      // Delete / Backspace — remove selected elements
      if ((e.key === 'Delete' || e.key === 'Backspace') && ids.length > 0) {
        e.preventDefault()
        if (ids.length === 1) dispatch({ type: 'REMOVE_ELEMENT', payload: ids[0] })
        else dispatch({ type: 'REMOVE_ELEMENTS', payload: ids })
        return
      }

      // Arrow keys — nudge selected elements by 0.5mm (or 2mm with Shift)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && ids.length > 0) {
        e.preventDefault()
        const step = e.shiftKey ? 2 : 0.5
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        dispatch({ type: 'NUDGE_ELEMENTS', payload: { ids, dx, dy } })
        return
      }

      // Ctrl+C — copy selected elements
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && ids.length > 0) {
        e.preventDefault()
        dispatch({ type: 'COPY_ELEMENTS', payload: ids })
        return
      }

      // Ctrl+V — paste from clipboard
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault()
        dispatch({ type: 'PASTE_ELEMENTS' })
        return
      }

      // Ctrl+A — select all elements
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && template) {
        e.preventDefault()
        dispatch({ type: 'SELECT_MULTIPLE', payload: template.elements.map(el => el.id) })
        return
      }

      // Ctrl+Z — undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        dispatch({ type: 'UNDO' })
        return
      }

      // Ctrl+Y or Ctrl+Shift+Z — redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        dispatch({ type: 'REDO' })
        return
      }

      // Ctrl+S — save template
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSaveRef.current()
        return
      }

      // Escape — deselect all
      if (e.key === 'Escape') {
        dispatch({ type: 'SELECT_ELEMENT', payload: null })
        return
      }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [state.selectedElementId, state.selectedElementIds, template, dispatch])

  const handleSave = useCallback(async () => {
    if (!template) return
    const errors: { name?: string; size?: string } = {}
    if (!template.name?.trim()) errors.name = 'Nama template wajib diisi'
    else if (template.name.length > 100) errors.name = 'Maksimal 100 karakter'
    if (!template.size?.type) errors.size = 'Ukuran wajib dipilih'
    setValidationErrors(errors)
    if (Object.keys(errors).length > 0) return

    const payload = { name: template.name, template_type: template.template_type, output_format: template.output_format, description: template.description, is_active: template.is_active ?? true, size: template.size, marginMm: template.marginMm, elements: template.elements }
    setSaving(true)
    try {
      if (template.id) {
        await templatesApi.update(template.id, payload)
        dispatch({ type: 'MARK_SAVED', payload: { id: template.id } })
        toast.success('Berhasil', { description: 'Template berhasil disimpan.' })
      } else {
        // Backend /add returns no ID — fetch list to find the newly created template by name
        await templatesApi.create(payload)
        const allTemplates = await templatesApi.list()
        const newTemplate = allTemplates.find(t => t.name === template.name)
        const newId = newTemplate?.id ?? ''
        dispatch({ type: 'MARK_SAVED', payload: { id: newId } })
        if (newId) window.history.replaceState(null, '', `/editor/${newId}`)
        toast.success('Berhasil', { description: 'Template berhasil dibuat.' })
      }
    } catch (err: unknown) {
      let m = 'Gagal menyimpan template'
      if (err && typeof err === 'object' && 'response' in err) {
        const a = err as { response?: { data?: { errorMessage?: string[]; error?: { message?: string } } } }
        if (a.response?.data?.errorMessage?.[0]) m = a.response.data.errorMessage[0]
        else if (a.response?.data?.error?.message) m = a.response.data.error.message
      }
      toast.error('Error', { description: m })
    }
    finally { setSaving(false) }
  }, [template, dispatch])

  // Keep ref in sync with latest handleSave
  handleSaveRef.current = handleSave

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null); setActiveDragType(null)
    const { active, over, delta } = event
    if (!template) return
    const ad = active.data.current; if (!ad) return
    if (ad.type === 'canvas-element') {
      const svgEl = document.querySelector('[data-testid="canvas-svg"]') as SVGSVGElement | null; if (!svgEl) return
      const r = svgEl.getBoundingClientRect(); const vb = svgEl.viewBox.baseVal
      dispatch({ type: 'UPDATE_ELEMENT', payload: { id: ad.elementId as string, changes: { x_mm: snapToGrid((ad.x_mm as number) + delta.x * (vb.width / r.width)), y_mm: snapToGrid((ad.y_mm as number) + delta.y * (vb.height / r.height)) } } })
      return
    }
    if (over?.id === 'canvas-drop-target' && ad.type) {
      const svgEl = document.querySelector('[data-testid="canvas-svg"]') as SVGSVGElement | null; if (!svgEl) return
      const sr = svgEl.getBoundingClientRect(); const de = event.activatorEvent as PointerEvent | MouseEvent
      const { xMm, yMm } = pixelToMm(de.clientX + delta.x - sr.left, de.clientY + delta.y - sr.top, svgEl, template.marginMm)
      const dims = DEFAULT_DIMENSIONS[ad.type as ElementType]
      dispatch({ type: 'ADD_ELEMENT', payload: { id: crypto.randomUUID(), type: ad.type as ElementType, x_mm: snapToGrid(xMm), y_mm: snapToGrid(yMm), width_mm: dims.width, height_mm: dims.height, z_order: 0, properties: getDefaultProperties(ad.type as ElementType) } })
    }
  }

  const typeMeta = template?.template_type ? TEMPLATE_TYPE_META[template.template_type] : null

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* Full-height layout: body height:100vh, overflow:hidden, flex column */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

        {/* ═══ TOOLBAR ═══ matching: .editor-toolbar { padding:10px 20px; background:white; border-bottom:1px solid #ebebeb } */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: '#fff', borderBottom: '1px solid #ebebeb', flexShrink: 0 }}>
          {/* Left: back link + template meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link to="/" style={{ fontSize: '12px', color: '#001871', textDecoration: 'none', fontWeight: 500 }}>← Kembali ke Template</Link>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <TemplateNameInput
                value={template?.name ?? ''}
                onChange={(name) => { dispatch({ type: 'SET_NAME', payload: name }); if (validationErrors.name) setValidationErrors(p => ({ ...p, name: undefined })) }}
              />
              {validationErrors.name && <span style={{ fontSize: '9px', color: '#ef3340' }}>{validationErrors.name}</span>}
            </div>
          </div>

          {/* Center: type badge + canvas size + margin */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#485885' }}>
            {typeMeta && <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '9999px', letterSpacing: '0.03em', ...typeMeta.badgeStyle }}>{typeMeta.label}</span>}
            {template?.size && (
              <>
                <span>{template.size.widthMm} × {template.size.heightMm} mm</span>
                <span style={{ color: '#ebebeb' }}>|</span>
                <span>Margin: {template.marginMm} mm</span>
              </>
            )}
          </div>

          {/* Right: Preview + Save buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowPreview(true)}
              disabled={!template?.id}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: '#f1f3f8', color: '#1f2b59', border: '1px solid #ebebeb', cursor: template?.id ? 'pointer' : 'not-allowed', opacity: template?.id ? 1 : 0.5 }}
            >
              Preview
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: '#001871', color: '#fff', border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </header>

        {/* ═══ EDITOR BODY (3-panel) ═══ matching: .editor-body { flex:1; display:flex; overflow:hidden } */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Left: Element Palette — .palette { width:160px; padding:14px; border-right:1px solid #ebebeb } */}
          <aside style={{ width: '160px', background: '#fff', borderRight: '1px solid #ebebeb', padding: '14px', flexShrink: 0, overflowY: 'auto' }}>
            <ElementPanel />
          </aside>

          {/* Center: Canvas — .canvas-area { flex:1; background:#e0e0e0; padding:24px; display:flex; align-items:center; justify-content:center } */}
          <main style={{ flex: 1, display: 'flex', overflow: 'auto', background: '#e0e0e0', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <Canvas />
          </main>

          {/* Right: Properties — .properties { width:220px; padding:14px; border-left:1px solid #ebebeb } */}
          <aside style={{ width: '220px', background: '#fff', borderLeft: '1px solid #ebebeb', padding: '14px', flexShrink: 0, overflowY: 'auto' }}>
            <PropertiesPanel />
          </aside>
        </div>
      </div>

      {showPreview && template?.id && <PreviewModal templateId={template.id} onClose={() => setShowPreview(false)} />}

      <DragOverlay dropAnimation={null}>
        {activeDragType === 'canvas-element' && activeDragId ? (
          <div style={{ padding: '3px 6px', background: 'rgba(0,24,113,0.12)', border: '2px solid #001871', borderRadius: '4px', fontSize: '11px', color: '#001871', fontWeight: 500, pointerEvents: 'none' }}>
            {(() => { const el = template?.elements.find(e => e.id === activeDragId); return el ? `${el.type} (${el.width_mm}×${el.height_mm}mm)` : 'Moving...' })()}
          </div>
        ) : activeDragType ? (
          <div style={{ padding: '4px 8px', background: '#fff', border: '2px dashed #001871', borderRadius: '4px', fontSize: '12px', color: '#001871', fontWeight: 500, boxShadow: '0 4px 12px rgba(0,0,0,.15)', pointerEvents: 'none' }}>
            + {activeDragType.replace('_', ' ')}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

// ─── Page Container ───────────────────────────────────────────────────────────

export default function TemplateEditorPage() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(!!id)
  const [error, setError] = useState<string | null>(null)
  const [initialTemplate, setInitialTemplate] = useState<Template | null>(null)
  const [showSizeSelector, setShowSizeSelector] = useState(!id)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true); setError(null)
    templatesApi.getById(id)
      .then(t => { if (!cancelled) { setInitialTemplate(t); setShowSizeSelector(false) } })
      .catch(err => {
        if (!cancelled) {
          // Backend error shape: { errorMessage: string[] }
          const errMsg = err?.response?.data?.errorMessage?.[0]
            ?? err?.response?.data?.error?.message
            ?? err?.message
            ?? 'Gagal memuat template'
          setError(errMsg)
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  // Check if query params provide a pre-selected size (from catalog)
  useEffect(() => {
    if (id) return // editing existing template, skip
    const params = new URLSearchParams(window.location.search)
    const sizeType = params.get('size')
    if (!sizeType) return // no pre-selection, show size selector

    // We have a pre-selected size from catalog — skip size selector
    setShowSizeSelector(false)
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex items-center gap-2 text-[#485885] text-sm">
        <div className="w-4 h-4 border-2 border-[#001871] border-t-transparent rounded-full animate-spin" />
        Memuat template...
      </div>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-screen gap-3 text-[#ef3340]">
      <AlertCircle className="w-8 h-8" />
      <p className="text-sm">{error}</p>
      <Link to="/" className="text-[13px] text-[#001871] hover:underline">← Kembali ke Template</Link>
    </div>
  )

  if (showSizeSelector) return (
    <TemplateProvider>
      <SizeSelectorWrapper onSelected={() => setShowSizeSelector(false)} />
    </TemplateProvider>
  )

  // When editing existing template, wait until data is loaded
  if (id && !initialTemplate) return null

  return (
    <TemplateProvider initialTemplate={initialTemplate ?? undefined}>
      <EditorContent />
    </TemplateProvider>
  )
}

// ─── Size Selector ────────────────────────────────────────────────────────────

function SizeSelectorWrapper({ onSelected }: { onSelected: () => void }) {
  const { dispatch } = useTemplate()
  const [templateName, setTemplateName] = useState('')

  // Check for pre-selected size from query params (catalog navigation)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sizeType = params.get('size')
    const typeCode = params.get('type')
    const format = params.get('format')
    const margin = params.get('margin')

    if (sizeType) {
      // Auto-apply the size from catalog
      const sizeMap: Record<string, { type: string; widthMm: number; heightMm: number; orientation: string }> = {
        thermal_a6: { type: 'thermal_a6', widthMm: 100, heightMm: 150, orientation: 'portrait' },
        a4_portrait: { type: 'a4_portrait', widthMm: 210, heightMm: 297, orientation: 'portrait' },
        a4_landscape: { type: 'a4_landscape', widthMm: 297, heightMm: 210, orientation: 'landscape' },
        a5_document: { type: 'a5_document', widthMm: 148, heightMm: 210, orientation: 'portrait' },
        sticker_4x8: { type: 'sticker_4x8', widthMm: 100, heightMm: 60, orientation: 'landscape' },
        sticker_3x10: { type: 'sticker_3x10', widthMm: 100, heightMm: 30, orientation: 'landscape' },
      }
      const size = sizeMap[sizeType]
      if (size) {
        dispatch({ type: 'SET_SIZE', payload: { size: size as PageSize, marginMm: margin ? parseFloat(margin) : 3.0 } })
        if (typeCode) dispatch({ type: 'SET_TEMPLATE_TYPE', payload: typeCode })
        if (format) dispatch({ type: 'SET_OUTPUT_FORMAT', payload: format })
        // Clear query params from URL
        window.history.replaceState(null, '', '/editor')
        onSelected()
      }
    }
  }, [dispatch, onSelected])

  return (
    <div style={{ minHeight: '100vh', background: '#f1f3f8', padding: '24px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#001871', fontWeight: 500, textDecoration: 'none', marginBottom: '24px' }}>
          ← Kembali ke Template
        </Link>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#001871', marginBottom: '4px' }}>Template Baru</h2>
          <p style={{ fontSize: '12px', color: '#485885', marginBottom: '24px' }}>Masukkan nama template dan pilih ukuran kanvas untuk memulai.</p>
          <TemplateNameInput value={templateName} onChange={setTemplateName} />
          <div style={{ marginTop: '24px' }}>
            <SizeSelector onSelect={(size: PageSize, marginMm: number) => { if (templateName.trim()) dispatch({ type: 'SET_NAME', payload: templateName }); dispatch({ type: 'SET_SIZE', payload: { size, marginMm } }); onSelected() }} />
          </div>
        </div>
      </div>
    </div>
  )
}
