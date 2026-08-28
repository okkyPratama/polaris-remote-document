import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { templatesApi } from '@/api/templateApi';

type TargetSize = 'original' | 'a6' | 'a5' | 'auto' | 'custom';

interface CropDimensions {
  width_mm: number;
  height_mm: number;
}

const SIZE_PRESETS: Record<string, CropDimensions> = {
  a6: { width_mm: 100, height_mm: 150 },
  a5: { width_mm: 148, height_mm: 210 },
};

export default function PrintFromUrlPage() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Crop states
  const [targetSize, setTargetSize] = useState<TargetSize>('original');
  const [customWidth, setCustomWidth] = useState<number>(100);
  const [customHeight, setCustomHeight] = useState<number>(150);
  const [cropLoading, setCropLoading] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);

  // Before/after crop indicator
  const [isCropped, setIsCropped] = useState(false);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

  function isValidUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  async function handleLoadPdf() {
    setError(null);
    setCropError(null);

    if (!url.trim()) {
      setError('Masukkan URL PDF terlebih dahulu.');
      return;
    }

    if (!isValidUrl(url.trim())) {
      setError('URL tidak valid. Pastikan format URL benar (contoh: https://...).');
      return;
    }

    setLoading(true);

    try {
      const targetUrl = url.trim();
      // Uses templatesApi.proxyPdf → proxied to /document/api/v1/pdf/proxyPdf?url=...
      const blob = await templatesApi.proxyPdf(targetUrl);

      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }

      const newBlobUrl = URL.createObjectURL(blob);
      setPdfBlobUrl(newBlobUrl);
      setIsCropped(false);
    } catch {
      setError('Gagal mengambil PDF. Periksa URL dan koneksi internet Anda.');
    } finally {      setLoading(false);
    }
  }

  async function handleCrop(): Promise<string | null> {
    if (targetSize === 'original') return null;

    setCropError(null);
    setCropLoading(true);

    try {
      const isAuto = targetSize === 'auto';
      const dimensions = targetSize === 'custom'
        ? { width_mm: customWidth, height_mm: customHeight }
        : SIZE_PRESETS[targetSize] || { width_mm: 100, height_mm: 150 };

      // Uses templatesApi.cropPdf → proxied to /document/api/v1/pdf/cropPdf
      // Backend CropReq uses camelCase JSON tags
      const blob = await templatesApi.cropPdf({
        url: url.trim(),
        targetWidthMm: isAuto ? 0 : dimensions.width_mm,
        targetHeightMm: isAuto ? 0 : dimensions.height_mm,
        autoCrop: isAuto,
        paddingMm: 2,
      });

      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }

      const newBlobUrl = URL.createObjectURL(blob);
      setPdfBlobUrl(newBlobUrl);
      setIsCropped(true);
      return newBlobUrl;
    } catch {
      setCropError('Gagal melakukan crop PDF. Periksa koneksi dan coba lagi.');
      return null;
    } finally {
      setCropLoading(false);
    }
  }

  async function handleCropOnly() {
    await handleCrop();
  }

  async function handleCropAndPrint() {
    const croppedUrl = await handleCrop();
    if (croppedUrl || targetSize === 'original') {
      // Wait briefly for iframe to load
      setTimeout(() => {
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.print();
        }
      }, 500);
    }
  }

  async function handleCropAndDownload() {
    const croppedUrl = await handleCrop();
    const downloadUrl = croppedUrl || pdfBlobUrl;
    if (!downloadUrl) return;

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = 'cropped-document.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handlePrint() {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.print();
    }
  }

  function handleDownload() {
    if (!pdfBlobUrl) return;

    const a = document.createElement('a');
    a.href = pdfBlobUrl;
    a.download = 'document.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Print from URL</h1>
        <button onClick={() => navigate('/')} style={secondaryButtonStyle}>
          ← Kembali ke Template
        </button>
      </div>

      {/* URL Input Section */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste PDF URL here..."
          style={inputStyle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleLoadPdf();
          }}
        />
        <button
          onClick={handleLoadPdf}
          disabled={loading}
          style={primaryButtonStyle}
        >
          {loading ? 'Loading...' : 'Load PDF'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      {/* Crop & Resize Section - shown when PDF is loaded */}
      {pdfBlobUrl && (
        <div style={cropSectionStyle}>
          <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: 600 }}>
            ✂️ Crop &amp; Resize
          </h3>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {/* Target Size Dropdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label htmlFor="target-size" style={labelStyle}>Target Size</label>
              <select
                id="target-size"
                value={targetSize}
                onChange={(e) => setTargetSize(e.target.value as TargetSize)}
                style={selectStyle}
              >
                <option value="original">Original (no crop)</option>
                <option value="a6">A6 (10×15cm)</option>
                <option value="a5">A5 (14.8×21cm)</option>
                <option value="auto">Auto Crop</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {/* Custom dimensions inputs */}
            {targetSize === 'custom' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label htmlFor="custom-width" style={labelStyle}>Width (mm)</label>
                  <input
                    id="custom-width"
                    type="number"
                    min={10}
                    max={500}
                    value={customWidth}
                    onChange={(e) => setCustomWidth(Number(e.target.value))}
                    style={{ ...inputStyle, width: '80px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label htmlFor="custom-height" style={labelStyle}>Height (mm)</label>
                  <input
                    id="custom-height"
                    type="number"
                    min={10}
                    max={500}
                    value={customHeight}
                    onChange={(e) => setCustomHeight(Number(e.target.value))}
                    style={{ ...inputStyle, width: '80px' }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Crop action buttons */}
          {targetSize !== 'original' && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button
                onClick={handleCropOnly}
                disabled={cropLoading}
                style={cropButtonStyle}
              >
                {cropLoading ? 'Cropping...' : '✂️ Crop'}
              </button>
              <button
                onClick={handleCropAndPrint}
                disabled={cropLoading}
                style={primaryButtonStyle}
              >
                {cropLoading ? 'Processing...' : '✂️🖨️ Crop & Print'}
              </button>
              <button
                onClick={handleCropAndDownload}
                disabled={cropLoading}
                style={secondaryButtonStyle}
              >
                {cropLoading ? 'Processing...' : '✂️⬇️ Crop & Download'}
              </button>
            </div>
          )}

          {/* Crop Error */}
          {cropError && (
            <div style={{ ...errorStyle, marginTop: '0.75rem', marginBottom: 0 }}>
              {cropError}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {pdfBlobUrl && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button onClick={handlePrint} style={primaryButtonStyle}>
            🖨️ Print
          </button>
          <button onClick={handleDownload} style={secondaryButtonStyle}>
            ⬇️ Download
          </button>
        </div>
      )}

      {/* PDF Status Badge & Reset */}
      {pdfBlobUrl && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span style={isCropped ? croppedBadgeStyle : originalBadgeStyle}>
            {isCropped ? '✂️ Cropped' : '📄 Original'}
          </span>
          {isCropped && (
            <button
              onClick={handleLoadPdf}
              disabled={loading}
              style={resetButtonStyle}
            >
              {loading ? 'Loading...' : '↩️ Reset to Original'}
            </button>
          )}
        </div>
      )}

      {/* PDF Viewer */}
      {pdfBlobUrl && (
        <iframe
          ref={iframeRef}
          src={pdfBlobUrl}
          title="PDF Viewer"
          style={iframeStyle}
        />
      )}
    </div>
  );
}

const primaryButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  backgroundColor: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: 500,
  whiteSpace: 'nowrap',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  backgroundColor: '#f9fafb',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: 500,
  whiteSpace: 'nowrap',
};

const cropButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  backgroundColor: '#059669',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: 500,
  whiteSpace: 'nowrap',
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '0.875rem',
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '0.875rem',
  outline: 'none',
  backgroundColor: '#fff',
  cursor: 'pointer',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 500,
  color: '#6b7280',
};

const errorStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '6px',
  color: '#dc2626',
  fontSize: '0.875rem',
  marginBottom: '1rem',
};

const cropSectionStyle: React.CSSProperties = {
  padding: '1rem',
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '8px',
  marginBottom: '1rem',
};

const iframeStyle: React.CSSProperties = {
  width: '100%',
  height: '70vh',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
};

const originalBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  padding: '0.25rem 0.6rem',
  backgroundColor: '#f3f4f6',
  color: '#6b7280',
  border: '1px solid #d1d5db',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: 500,
};

const croppedBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  padding: '0.25rem 0.6rem',
  backgroundColor: '#ecfdf5',
  color: '#059669',
  border: '1px solid #a7f3d0',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: 500,
};

const resetButtonStyle: React.CSSProperties = {
  padding: '0.25rem 0.6rem',
  backgroundColor: '#fff',
  color: '#6b7280',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.75rem',
  fontWeight: 500,
  whiteSpace: 'nowrap',
};