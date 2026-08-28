import { useState, useEffect, useRef, useCallback } from 'react';
import { templatesApi } from '@/api/templateApi';

interface PreviewModalProps {
  templateId: string;
  onClose: () => void;
}

/**
 * PreviewModal displays a two-panel layout:
 * - Left: JSON editor textarea for sample data
 * - Right: Rendered PDF preview
 *
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */
export default function PreviewModal({ templateId, onClose }: PreviewModalProps) {
  const [jsonInput, setJsonInput] = useState<string>(
    JSON.stringify(
      {
        nama_penerima: 'Budi Santoso',
        alamat: 'Jl. Sudirman No. 1',
        tracking_number: 'JNE1234567890',
        items: [
          { item_name: 'Sepatu Sneakers', qty: '1' },
          { item_name: 'Kaos Polos', qty: '3' },
        ],
      },
      null,
      2
    )
  );
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousPdfUrlRef = useRef<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const MAX_JSON_CHARS = 10_000;

  // Generate PDF preview from valid JSON
  const generatePreview = useCallback(
    async (parsedJson: Record<string, unknown>) => {
      setLoading(true);
      try {
        // Smart unwrap: if user entered {"data": ...}, extract the inner data
        // Otherwise use the object directly as the data payload
        let dataPayload: Record<string, unknown> | Record<string, unknown>[];
        if ('data' in parsedJson && (typeof parsedJson.data === 'object' || Array.isArray(parsedJson.data))) {
          dataPayload = parsedJson.data as Record<string, unknown> | Record<string, unknown>[];
        } else {
          dataPayload = parsedJson;
        }

        const blob = await templatesApi.generate(templateId, { data: dataPayload });

        // Revoke previous URL to avoid memory leaks
        if (previousPdfUrlRef.current) {
          URL.revokeObjectURL(previousPdfUrlRef.current);
        }

        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        previousPdfUrlRef.current = url;
        setJsonError(null);
      } catch {
        // Keep last successful preview on error
      } finally {
        setLoading(false);
      }
    },
    [templateId]
  );

  // Debounced JSON parse and preview generation
  const handleJsonChange = useCallback(
    (value: string) => {
      setJsonInput(value);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        // Attempt to parse JSON
        try {
          const parsed = JSON.parse(value);
          if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            setJsonError('Data harus berupa objek JSON (bukan array atau nilai primitif)');
            return;
          }
          setJsonError(null);
          generatePreview(parsed as Record<string, unknown>);
        } catch (e: unknown) {
          if (e instanceof SyntaxError) {
            setJsonError(`JSON tidak valid: ${e.message}`);
          } else {
            setJsonError('JSON tidak valid');
          }
          // Keep last successful preview (Requirement 9.5)
        }
      }, 500);
    },
    [generatePreview]
  );

  // Initial preview on mount
  useEffect(() => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        generatePreview(parsed as Record<string, unknown>);
      }
    } catch {
      // If default JSON is somehow invalid, no-op
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (previousPdfUrlRef.current) {
        URL.revokeObjectURL(previousPdfUrlRef.current);
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '2rem',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Preview Template"
    >
      <div
        ref={modalRef}
        style={{
          background: '#fff',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '1100px',
          height: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e5e7eb',
            background: '#f9fafb',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Preview Template</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => {
                if (pdfUrl) {
                  const link = document.createElement('a');
                  link.href = pdfUrl;
                  link.download = 'output.pdf';
                  link.click();
                }
              }}
              disabled={!pdfUrl}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                background: pdfUrl ? '#fff' : '#f5f5f5',
                cursor: pdfUrl ? 'pointer' : 'not-allowed',
                color: pdfUrl ? '#333' : '#999',
              }}
              aria-label="Download PDF"
            >
              ⬇ Download
            </button>
            <button
              onClick={() => {
                if (iframeRef.current?.contentWindow) {
                  iframeRef.current.contentWindow.print();
                }
              }}
              disabled={!pdfUrl}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                border: 'none',
                borderRadius: '4px',
                background: pdfUrl ? '#1976d2' : '#90caf9',
                color: '#fff',
                cursor: pdfUrl ? 'pointer' : 'not-allowed',
                fontWeight: 500,
              }}
              aria-label="Print PDF"
            >
              🖨 Print
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                lineHeight: 1,
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                color: '#666',
              }}
              aria-label="Tutup preview"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body - two panels */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left panel - JSON editor */}
          <div
            style={{
              width: '360px',
              minWidth: '280px',
              display: 'flex',
              flexDirection: 'column',
              borderRight: '1px solid #e5e7eb',
              background: '#fafafa',
            }}
          >
            <div
              style={{
                padding: '0.75rem 1rem 0.5rem',
                fontSize: '0.8rem',
                fontWeight: 500,
                color: '#555',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>Data JSON</span>
              <span style={{ fontSize: '0.7rem', color: '#999' }}>
                {jsonInput.length}/{MAX_JSON_CHARS}
              </span>
            </div>

            <div style={{ flex: 1, padding: '0 1rem 0.75rem', display: 'flex', flexDirection: 'column' }}>
              <textarea
                value={jsonInput}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= MAX_JSON_CHARS) {
                    handleJsonChange(value);
                  }
                }}
                maxLength={MAX_JSON_CHARS}
                spellCheck={false}
                placeholder='{"field_name": "value"}'
                aria-label="JSON data input"
                style={{
                  flex: 1,
                  width: '100%',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  lineHeight: 1.5,
                  padding: '0.75rem',
                  border: jsonError ? '1px solid #d32f2f' : '1px solid #ddd',
                  borderRadius: '4px',
                  resize: 'none',
                  outline: 'none',
                  background: '#fff',
                }}
              />

              {jsonError && (
                <div
                  role="alert"
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    color: '#b91c1c',
                    lineHeight: 1.4,
                  }}
                >
                  {jsonError}
                </div>
              )}
            </div>
          </div>

          {/* Right panel - PDF preview */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#e5e7eb',
              position: 'relative',
              overflow: 'auto',
            }}
          >
            {loading && !pdfUrl && (
              <div style={{ color: '#666', fontSize: '0.9rem' }}>Generating preview...</div>
            )}

            {loading && pdfUrl && (
              <div
                style={{
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  background: 'rgba(255,255,255,0.9)',
                  padding: '0.3rem 0.7rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  color: '#555',
                  zIndex: 1,
                }}
              >
                Updating...
              </div>
            )}

            {pdfUrl ? (
              <iframe
                ref={iframeRef}
                src={pdfUrl}
                title="PDF Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  maxWidth: '100%',
                  maxHeight: '100%',
                }}
              />
            ) : (
              !loading && (
                <div style={{ color: '#999', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>
                  Masukkan data JSON yang valid untuk melihat preview
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
