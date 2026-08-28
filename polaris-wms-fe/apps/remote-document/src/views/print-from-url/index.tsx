import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { templateApi } from '../../api/template.api'

type TargetSize = 'original' | 'a6' | 'a5' | 'auto' | 'custom'

interface CropDimensions {
  width_mm: number
  height_mm: number
}

const SIZE_PRESETS: Record<string, CropDimensions> = {
  a6: { width_mm: 100, height_mm: 150 },
  a5: { width_mm: 148, height_mm: 210 },
}

export default function PrintFromUrlPage() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [targetSize, setTargetSize] = useState<TargetSize>('original')
  const [customWidth, setCustomWidth] = useState<number>(100)
  const [customHeight, setCustomHeight] = useState<number>(150)
  const [cropLoading, setCropLoading] = useState(false)
  const [cropError, setCropError] = useState<string | null>(null)
  const [isCropped, setIsCropped] = useState(false)

  useEffect(() => {
    return () => { if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl) }
  }, [pdfBlobUrl])

  function isValidUrl(value: string): boolean {
    try { new URL(value); return true } catch { return false }
  }

  async function handleLoadPdf() {
    setError(null)
    setCropError(null)
    if (!url.trim()) { setError('Masukkan URL PDF terlebih dahulu.'); return }
    if (!isValidUrl(url.trim())) { setError('URL tidak valid.'); return }
    setLoading(true)
    try {
      const blob = await templateApi.proxyPdf(url.trim())
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl)
      setPdfBlobUrl(URL.createObjectURL(blob))
      setIsCropped(false)
    } catch { setError('Gagal mengambil PDF. Periksa URL dan koneksi internet Anda.') }
    finally { setLoading(false) }
  }

  async function handleCrop(): Promise<string | null> {
    if (targetSize === 'original') return null
    setCropError(null)
    setCropLoading(true)
    try {
      const isAuto = targetSize === 'auto'
      const dimensions = targetSize === 'custom' ? { width_mm: customWidth, height_mm: customHeight } : SIZE_PRESETS[targetSize] || { width_mm: 100, height_mm: 150 }
      const blob = await templateApi.cropPdf({
        url: url.trim(),
        targetWidthMm: isAuto ? 0 : dimensions.width_mm,
        targetHeightMm: isAuto ? 0 : dimensions.height_mm,
        autoCrop: isAuto,
        paddingMm: 2,
      })
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl)
      const newUrl = URL.createObjectURL(blob)
      setPdfBlobUrl(newUrl)
      setIsCropped(true)
      return newUrl
    } catch { setCropError('Gagal melakukan crop PDF.'); return null }
    finally { setCropLoading(false) }
  }

  async function handleCropAndPrint() {
    const croppedUrl = await handleCrop()
    if (croppedUrl || targetSize === 'original') {
      setTimeout(() => { iframeRef.current?.contentWindow?.print() }, 500)
    }
  }

  async function handleCropAndDownload() {
    const croppedUrl = await handleCrop()
    const downloadUrl = croppedUrl || pdfBlobUrl
    if (!downloadUrl) return
    const a = document.createElement('a'); a.href = downloadUrl; a.download = 'cropped-document.pdf'; document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  return (
    <div className="p-8 max-w-[960px] mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-[#001871]">Print from URL</h1>
        <button type="button" onClick={() => navigate('/documents/templates')} className="border border-[#d1d5db] rounded-lg px-4 py-2 text-sm text-[#374151] bg-white cursor-pointer hover:bg-[#f9fafb]">
          &larr; Kembali ke Template
        </button>
      </div>

      {/* URL Input */}
      <div className="flex gap-2 mb-4">
        <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste PDF URL here..." onKeyDown={(e) => { if (e.key === 'Enter') handleLoadPdf() }} className="flex-1 border border-[#d1d5db] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2563eb]" />
        <button type="button" onClick={handleLoadPdf} disabled={loading} className="bg-[#2563eb] text-white rounded-lg px-4 py-2 text-sm font-medium cursor-pointer border-none disabled:opacity-60">{loading ? 'Loading...' : 'Load PDF'}</button>
      </div>

      {error && <div className="p-3 bg-[#fef2f2] border border-[#fecaca] rounded-lg text-[#dc2626] text-sm mb-4">{error}</div>}

      {/* Crop section */}
      {pdfBlobUrl && (
        <div className="p-4 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl mb-4">
          <h3 className="text-base font-semibold mb-3">Crop &amp; Resize</h3>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#6b7280]">Target Size</label>
              <select value={targetSize} onChange={(e) => setTargetSize(e.target.value as TargetSize)} className="border border-[#d1d5db] rounded-lg px-3 py-2 text-sm bg-white cursor-pointer">
                <option value="original">Original (no crop)</option>
                <option value="a6">A6 (10x15cm)</option>
                <option value="a5">A5 (14.8x21cm)</option>
                <option value="auto">Auto Crop</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            {targetSize === 'custom' && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[#6b7280]">Width (mm)</label>
                  <input type="number" min={10} max={500} value={customWidth} onChange={(e) => setCustomWidth(Number(e.target.value))} className="border border-[#d1d5db] rounded-lg px-3 py-2 text-sm w-20" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[#6b7280]">Height (mm)</label>
                  <input type="number" min={10} max={500} value={customHeight} onChange={(e) => setCustomHeight(Number(e.target.value))} className="border border-[#d1d5db] rounded-lg px-3 py-2 text-sm w-20" />
                </div>
              </>
            )}
          </div>
          {targetSize !== 'original' && (
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={() => handleCrop()} disabled={cropLoading} className="bg-[#059669] text-white rounded-lg px-4 py-2 text-sm font-medium cursor-pointer border-none disabled:opacity-60">{cropLoading ? 'Cropping...' : 'Crop'}</button>
              <button type="button" onClick={handleCropAndPrint} disabled={cropLoading} className="bg-[#2563eb] text-white rounded-lg px-4 py-2 text-sm font-medium cursor-pointer border-none disabled:opacity-60">{cropLoading ? 'Processing...' : 'Crop & Print'}</button>
              <button type="button" onClick={handleCropAndDownload} disabled={cropLoading} className="border border-[#d1d5db] rounded-lg px-4 py-2 text-sm text-[#374151] bg-white cursor-pointer disabled:opacity-60">{cropLoading ? 'Processing...' : 'Crop & Download'}</button>
            </div>
          )}
          {cropError && <div className="mt-3 p-3 bg-[#fef2f2] border border-[#fecaca] rounded-lg text-[#dc2626] text-sm">{cropError}</div>}
        </div>
      )}

      {/* Action buttons */}
      {pdfBlobUrl && (
        <div className="flex gap-2 mb-4">
          <button type="button" onClick={() => iframeRef.current?.contentWindow?.print()} className="bg-[#2563eb] text-white rounded-lg px-4 py-2 text-sm font-medium cursor-pointer border-none">Print</button>
          <button type="button" onClick={() => { if (!pdfBlobUrl) return; const a = document.createElement('a'); a.href = pdfBlobUrl; a.download = 'document.pdf'; document.body.appendChild(a); a.click(); document.body.removeChild(a) }} className="border border-[#d1d5db] rounded-lg px-4 py-2 text-sm text-[#374151] bg-white cursor-pointer">Download</button>
        </div>
      )}

      {/* Status badge */}
      {pdfBlobUrl && (
        <div className="flex items-center gap-3 mb-2">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${isCropped ? 'bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]' : 'bg-[#f3f4f6] text-[#6b7280] border border-[#d1d5db]'}`}>
            {isCropped ? 'Cropped' : 'Original'}
          </span>
          {isCropped && (
            <button type="button" onClick={handleLoadPdf} disabled={loading} className="text-xs text-[#6b7280] border border-[#d1d5db] rounded-lg px-2.5 py-1 bg-white cursor-pointer">{loading ? 'Loading...' : 'Reset to Original'}</button>
          )}
        </div>
      )}

      {/* PDF Viewer */}
      {pdfBlobUrl && (
        <iframe ref={iframeRef} src={pdfBlobUrl} title="PDF Viewer" className="w-full h-[70vh] border border-[#e5e7eb] rounded-lg" />
      )}
    </div>
  )
}
