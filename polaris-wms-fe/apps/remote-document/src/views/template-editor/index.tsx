import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { toast } from '@polaris/ui'
import { WithToaster } from '../../components/WithToaster'
import { useTemplateDetail, useSaveTemplate, useEditTemplate } from '../../hooks/useTemplates'
import { TemplateProvider, useTemplate, serializeElements } from '../../context/TemplateContext'
import { templateApi } from '../../api/template.api'
import type { Template, ElementType } from '../../types/template.types'
import { TEMPLATE_TYPE_META, STANDARD_SIZES } from '../../types/template.types'
import { Canvas, pixelToMm } from '../../components/editor/Canvas'
import { ElementPanel } from '../../components/editor/ElementPanel'
import { PropertiesPanel } from '../../components/editor/PropertiesPanel'
import { PreviewModal } from '../../components/editor/PreviewModal'
import { SizeSelector } from '../../components/editor/SizeSelector'
import { createDefaultElement, snapToGrid } from '../../utils/canvasUtils'

// ─── Editor Content ───────────────────────────────────────────────────────────

function EditorContent() {
  const navigate = useNavigate()
  const { state, dispatch } = useTemplate()
  const { template } = state
  const saveMutation = useSaveTemplate()
  const editMutation = useEditTemplate()
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [activeDragType, setActiveDragType] = useState<string | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 3 } }))

  // Ref to avoid temporal dead zone in keyboard handler
  const handleSaveRef = useRef<() => void>(() => {})

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current
    if (data?.type === 'canvas-element') {
      setActiveDragId(data.elementId as string)
      setActiveDragType('canvas-element')
    } else if (data?.source === 'palette') {
      setActiveDragId(null)
      setActiveDragType(data.type as string)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null)
    setActiveDragType(null)
    const { active, over, delta } = event
    if (!template) return

    const activeData = active.data.current
    if (!activeData) return

    // Repositioning existing element
    if (activeData.type === 'canvas-element') {
      const elementId = activeData.elementId as string
      const originalXMm = activeData.x_mm as number
      const originalYMm = activeData.y_mm as number

      const svgEl = document.querySelector('[data-testid="canvas-svg"]') as SVGSVGElement | null
      if (!svgEl) return
      const rect = svgEl.getBoundingClientRect()
      const viewBox = svgEl.viewBox.baseVal
      const scaleX = viewBox.width / rect.width
      const scaleY = viewBox.height / rect.height

      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: {
          id: elementId,
          changes: {
            x_mm: snapToGrid(originalXMm + delta.x * scaleX),
            y_mm: snapToGrid(originalYMm + delta.y * scaleY),
          },
        },
      })
      return
    }

    // Dropping new element from palette
    if (over?.id === 'canvas-drop-target' && activeData.source === 'palette') {
      const elementType = activeData.type as ElementType
      const svgEl = document.querySelector('[data-testid="canvas-svg"]') as SVGSVGElement | null
      if (!svgEl) return
      const svgRect = svgEl.getBoundingClientRect()
      const dropEvent = event.activatorEvent as PointerEvent | MouseEvent
      const pixelX = dropEvent.clientX + delta.x - svgRect.left
      const pixelY = dropEvent.clientY + delta.y - svgRect.top
      const { xMm, yMm } = pixelToMm(pixelX, pixelY, svgEl, template.pageSettingsJson?.marginMm ?? 5)
      const newElement = createDefaultElement(elementType, snapToGrid(xMm), snapToGrid(yMm))
      dispatch({ type: 'ADD_ELEMENT', payload: newElement })
    }
  }

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault()
          handleSaveRef.current()
        }
        return
      }

      const ids = state.selectedElementIds.length > 0 ? state.selectedElementIds : (state.selectedElementId ? [state.selectedElementId] : [])

      // Delete / Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && ids.length > 0) {
        e.preventDefault()
        if (ids.length === 1) dispatch({ type: 'REMOVE_ELEMENT', payload: ids[0] })
        else dispatch({ type: 'REMOVE_ELEMENTS', payload: ids })
        return
      }

      // Arrow keys — nudge
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && ids.length > 0) {
        e.preventDefault()
        const step = e.shiftKey ? 2 : 0.5
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        dispatch({ type: 'NUDGE_ELEMENTS', payload: { ids, dx, dy } })
        return
      }

      // Ctrl+C
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && ids.length > 0) {
        e.preventDefault()
        dispatch({ type: 'COPY_ELEMENTS', payload: ids })
        return
      }

      // Ctrl+V
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault()
        dispatch({ type: 'PASTE_ELEMENTS' })
        return
      }

      // Ctrl+A
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && template) {
        e.preventDefault()
        dispatch({ type: 'SELECT_MULTIPLE', payload: state.elements.map((el) => el.id) })
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

      // Ctrl+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSaveRef.current()
        return
      }

      // Escape
      if (e.key === 'Escape') {
        dispatch({ type: 'SELECT_ELEMENT', payload: null })
        return
      }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [state.selectedElementId, state.selectedElementIds, state.elements, template, dispatch])

  const handleSave = useCallback(async () => {
    if (!template) return
    if (!template.name?.trim()) {
      toast.error('Error', 'Nama template wajib diisi')
      return
    }

    setSaving(true)
    try {
      const templateContent = serializeElements(state.elements)
      const payload = {
        templateCode: template.templateCode || template.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 64),
        name: template.name,
        templateType: template.templateType,
        outputFormat: template.outputFormat,
        description: template.description,
        templateContent,
        pageSettingsJson: template.pageSettingsJson,
        isSystemDefault: template.isSystemDefault,
        isActive: template.isActive ?? true,
      }

      if (template.id) {
        await editMutation.mutateAsync({ id: template.id, ...payload })
        dispatch({ type: 'MARK_SAVED', payload: { id: template.id } })
        toast.success('Berhasil', 'Template berhasil diperbarui')
      } else {
        await saveMutation.mutateAsync(payload)
        // Fetch list to find new ID
        const result = await templateApi.getAll()
        const newTemplate = result.data.find((t) => t.name === template.name)
        const newId = newTemplate?.id ?? ''
        dispatch({ type: 'MARK_SAVED', payload: { id: newId } })
        if (newId) window.history.replaceState(null, '', `/documents/template-editor/${newId}`)
        toast.success('Berhasil', 'Template berhasil disimpan')
      }
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      const msg = error.errorMessage?.[0] || error.message || 'Gagal menyimpan template'
      toast.error('Gagal', msg)
    } finally {
      setSaving(false)
    }
  }, [template, state.elements, dispatch, saveMutation, editMutation])

  // Keep ref in sync
  handleSaveRef.current = handleSave

  const typeMeta = template?.templateType ? TEMPLATE_TYPE_META[template.templateType] : null

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col" style={{ height: '100vh', overflow: 'hidden' }}>
        {/* Toolbar */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: '#fff', borderBottom: '1px solid #ebebeb', flexShrink: 0 }}>
          {/* Left: back link + template name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              type="button"
              onClick={() => navigate('/documents/templates')}
              style={{ fontSize: '12px', color: '#001871', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
            >
              &larr; Kembali ke Template
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '9px', fontWeight: 600, color: '#a9b1c6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Nama Template
              </label>
              <input
                type="text"
                value={template?.name ?? ''}
                onChange={(e) => dispatch({ type: 'SET_NAME', payload: e.target.value })}
                placeholder="Masukkan nama template"
                maxLength={100}
                style={{ border: '1px solid #ebebeb', borderRadius: '8px', padding: '5px 10px', fontSize: '13px', color: '#1f2b59', width: '200px', outline: 'none' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#001871'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,24,113,.08)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#ebebeb'; e.currentTarget.style.boxShadow = 'none' }}
              />
              <span style={{ fontSize: '9px', color: '#949eb8' }}>{(template?.name ?? '').length}/100 karakter</span>
            </div>
          </div>

          {/* Center: type badge + canvas size + margin */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#485885' }}>
            {typeMeta && <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '9999px', letterSpacing: '0.03em', ...typeMeta.badgeStyle }}>{typeMeta.label}</span>}
            {template?.pageSettingsJson && (
              <>
                <span>{template.pageSettingsJson.widthMm} &times; {template.pageSettingsJson.heightMm} mm</span>
                <span style={{ color: '#ebebeb' }}>|</span>
                <span>Margin: {template.pageSettingsJson.marginMm} mm</span>
              </>
            )}
          </div>

          {/* Right: Preview + Save buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              disabled={!template?.id}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: '#f1f3f8', color: '#1f2b59', border: '1px solid #ebebeb', cursor: template?.id ? 'pointer' : 'not-allowed', opacity: template?.id ? 1 : 0.5 }}
            >
              Preview
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: '#001871', color: '#fff', border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </header>

        {/* Three-panel layout */}
        <div className="flex flex-1 overflow-hidden">
          <aside style={{ width: '160px', background: '#fff', borderRight: '1px solid #ebebeb', padding: '14px', flexShrink: 0, overflowY: 'auto' }}>
            <ElementPanel />
          </aside>

          <main style={{ flex: 1, display: 'flex', overflow: 'auto', background: '#e0e0e0', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <Canvas />
          </main>

          <aside style={{ width: '220px', background: '#fff', borderLeft: '1px solid #ebebeb', padding: '14px', flexShrink: 0, overflowY: 'auto' }}>
            <PropertiesPanel />
          </aside>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay dropAnimation={null}>
        {activeDragType === 'canvas-element' && activeDragId ? (
          <div className="px-2 py-1 bg-[rgba(0,24,113,0.12)] border-2 border-[#001871] rounded text-[11px] text-[#001871] font-medium pointer-events-none">
            {(() => { const el = state.elements.find((e) => e.id === activeDragId); return el ? `${el.type} (${el.width_mm}x${el.height_mm}mm)` : 'Moving...' })()}
          </div>
        ) : activeDragType ? (
          <div className="px-3 py-1.5 bg-white border-2 border-dashed border-[#001871] rounded-lg text-[12px] text-[#001871] font-medium shadow-[0_4px_12px_rgba(0,0,0,0.15)] pointer-events-none">
            + {activeDragType.replace('_', ' ')}
          </div>
        ) : null}
      </DragOverlay>

      {/* Preview Modal */}
      {showPreview && template?.id && (
        <PreviewModal templateId={template.id} templateName={template.name} onClose={() => setShowPreview(false)} />
      )}
    </DndContext>
  )
}

// ─── Page Container ───────────────────────────────────────────────────────────

export default function TemplateEditorPage() {
  const { id } = useParams<{ id: string }>()
  const { data: existingTemplate, isLoading, error } = useTemplateDetail(id)

  // Check if we have query params from UploadTemplateModal's "Buka Editor Visual"
  const searchParams = new URLSearchParams(window.location.search)
  const qSize = searchParams.get('size')
  const qType = searchParams.get('type')
  const qFormat = searchParams.get('format')
  const qMargin = searchParams.get('margin')
  const qName = searchParams.get('name')
  const qCode = searchParams.get('code')
  const hasQueryParams = !!(qSize && qType)

  const [showSizeSelector, setShowSizeSelector] = useState(!id && !hasQueryParams)

  // Build initial template from query params when coming from the modal
  const initialTemplateFromQuery: Partial<Template> | undefined = hasQueryParams
    ? (() => {
        const sizeEntry = (STANDARD_SIZES as Record<string, { widthMm: number; heightMm: number; orientation: string; defaultMarginMm: number }>)[qSize!]
        const marginMm = qMargin ? parseFloat(qMargin) : (sizeEntry?.defaultMarginMm ?? 3)
        const pageSettingsJson: import('../../types/template.types').PageSettingsJson = {
          sizeType: qSize!,
          widthMm: sizeEntry?.widthMm ?? 148,
          heightMm: sizeEntry?.heightMm ?? 210,
          marginMm,
          orientation: sizeEntry?.orientation ?? 'PORTRAIT',
        }
        return {
          id: '',
          templateCode: qCode || '',
          name: qName || '',
          templateType: qType as import('../../types/template.types').TemplateType,
          outputFormat: (qFormat || 'PDF') as import('../../types/template.types').OutputFormat,
          description: '',
          templateContent: '[]',
          version: 1,
          pageSettingsJson,
          isSystemDefault: false,
          isActive: true,
          createdBy: '',
          createdAt: '',
          updatedBy: '',
          updatedAt: '',
        } as Template
      })()
    : undefined

  if (isLoading && id) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-[13px] text-[#485885]">Memuat template...</p>
      </div>
    )
  }

  if (error && id) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-[13px] text-[#ef3340]">Gagal memuat template</p>
      </div>
    )
  }

  if (showSizeSelector && !id) {
    return (
      <WithToaster>
        <SizeSelector onSelect={() => setShowSizeSelector(false)} />
      </WithToaster>
    )
  }

  return (
    <WithToaster>
      <TemplateProvider initialTemplate={existingTemplate ?? initialTemplateFromQuery as Template ?? undefined}>
        <EditorContent />
      </TemplateProvider>
    </WithToaster>
  )
}
