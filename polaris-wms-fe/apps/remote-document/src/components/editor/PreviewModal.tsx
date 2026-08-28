import { useState, useEffect, useRef, useCallback } from 'react'
import { templateApi } from '../../api/template.api'

interface PreviewModalProps {
  templateId: string
  templateName?: string
  onClose: () => void
}

/**
 * PreviewModal — two-panel layout matching standalone remote-document:
 * - Left: JSON editor textarea for sample data
 * - Right: Rendered PDF preview with halaman indicator
 */
export function PreviewModal({ templateId, templateName, onClose }: PreviewModalProps) {
  const MAX_JSON_CHARS = 10_000
  const [jsonInput, setJsonInput] = useState<string>(
    JSON.stringify(
      { owner_name: 'Toko Jaya Makmur', receipt_number: 'RCV-20260801-001', lines: [{ sku_code: 'SKU-001', sku_name: 'Sepatu Sneakers', qty: '1' }] },
      null, 2
    )
  )
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousPdfUrlRef = useRef<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  const generatePreview = useCallback(async (parsedJson: Record<string, unknown>) => {
    setLoading(true)
    try {
      let dataPayload: Record<string, unknown> | Record<string, unknown>[]
      if ('data' in parsedJson && (typeof parsedJson.data === 'object' || Array.isArray(parsedJson.data))) {
        dataPayload = parsedJson.data as Record<string, unknown> | Record<string, unknown>[]
      } else {
        dataPayload = parsedJson
      }
      const blob = await templateApi.generate(templateId, { data: dataPayload })
      if (previousPdfUrlRef.current) URL.revokeObjectURL(previousPdfUrlRef.current)
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
      previousPdfUrlRef.current = url
      setJsonError(null)
    } catch (err) {
      // Show error if generate fails
      const msg = err instanceof Error ? err.message : 'Gagal membuat preview'
      setJsonError(msg)
    } finally {
      setLoading(false)
    }
  }, [templateId])

  const handleJsonChange = useCallback((value: string) => {
    setJsonInput(value)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      try {
        const parsed = JSON.parse(value)
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          setJsonError('Data harus berupa objek JSON (bukan array atau nilai primitif)')
          return
        }
        setJsonError(null)
        generatePreview(parsed as Record<string, unknown>)
      } catch (e: unknown) {
        if (e instanceof SyntaxError) setJsonError(`JSON tidak valid: ${e.message}`)
        else setJsonError('JSON tidak valid')
      }
    }, 500)
  }, [generatePreview])

  // Initial preview
  useEffect(() => {
    try {
      const parsed = JSON.parse(jsonInput)
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) generatePreview(parsed)
    } catch { /* no-op */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      if (previousPdfUrlRef.current) URL.revokeObjectURL(previousPdfUrlRef.current)
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose()
  }

  return (
    <div onClick={handleBackdropClick} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} role="dialog" aria-modal="true" aria-label="Preview Template">
      <div ref={modalRef} style={{ background: '#fff', borderRadius: '16px', width: '90vw', maxWidth: '1100px', height: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.2)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #ebebeb' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#001871' }}>
            Preview{templateName ? ` \u2014 ${templateName}` : ''}
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => { if (pdfUrl) { const a = document.createElement('a'); a.href = pdfUrl; a.download = 'preview.pdf'; a.click() } }}
              disabled={!pdfUrl}
              style={{ padding: '6px 14px', fontSize: '12px', border: '1px solid #ebebeb', borderRadius: '8px', background: pdfUrl ? '#fff' : '#f5f5f5', cursor: pdfUrl ? 'pointer' : 'not-allowed', color: pdfUrl ? '#1f2b59' : '#999', fontWeight: 500 }}
            >
              Unduh
            </button>
            <button
              type="button"
              onClick={() => { iframeRef.current?.contentWindow?.print() }}
              disabled={!pdfUrl}
              style={{ padding: '6px 14px', fontSize: '12px', border: 'none', borderRadius: '8px', background: pdfUrl ? '#001871' : '#90caf9', color: '#fff', cursor: pdfUrl ? 'pointer' : 'not-allowed', fontWeight: 500 }}
            >
              Cetak
            </button>
            <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#a9b1c6', marginLeft: '8px', lineHeight: 1, padding: '4px' }}>&times;</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left: JSON editor */}
          <div style={{ width: '280px', borderRight: '1px solid #ebebeb', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fafbfd', borderBottom: '1px solid #ebebeb', fontSize: '12px', fontWeight: 500, color: '#485885' }}>
              <span>Data JSON</span>
              <span style={{ color: '#949eb8', fontSize: '11px' }}>{jsonInput.length}/{MAX_JSON_CHARS}</span>
            </div>
            <textarea
              value={jsonInput}
              onChange={(e) => { if (e.target.value.length <= MAX_JSON_CHARS) handleJsonChange(e.target.value) }}
              spellCheck={false}
              style={{ flex: 1, width: '100%', border: 'none', padding: '12px', fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace", fontSize: '11px', lineHeight: 1.6, color: '#1f2b59', background: '#fff', resize: 'none', outline: 'none' }}
              aria-label="JSON data input"
            />
            {jsonError && <div style={{ padding: '8px 12px', fontSize: '11px', color: '#b91c1c', background: '#fef2f2', borderTop: '1px solid #fecaca' }}>{jsonError}</div>}
          </div>

          {/* Right: PDF preview */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#e8e8e8' }}>
            {/* Halaman bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#fafbfd', borderBottom: '1px solid #ebebeb', fontSize: '11px', color: '#949eb8' }}>
              <span>Halaman:</span>
              <input style={{ width: '30px', textAlign: 'center', border: '1px solid #ebebeb', borderRadius: '4px', fontSize: '11px', padding: '2px' }} defaultValue="1" readOnly />
              <span>dari 1</span>
            </div>
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px' }}>
              {loading && !pdfUrl && <p style={{ fontSize: '13px', color: '#666' }}>Membuat preview...</p>}
              {pdfUrl ? (
                <iframe ref={iframeRef} src={pdfUrl} title="PDF Preview" style={{ width: '100%', height: '100%', border: 'none' }} />
              ) : (
                !loading && <p style={{ fontSize: '12px', color: '#999' }}>Masukkan data JSON yang valid</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
