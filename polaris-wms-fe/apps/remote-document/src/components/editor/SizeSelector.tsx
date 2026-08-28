import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PageSettingsJson } from '../../types/template.types'
import { TemplateProvider, useTemplate } from '../../context/TemplateContext'

interface SizeSelectorProps {
  onSelect: () => void
}

const PAGE_PRESETS: Record<string, PageSettingsJson> = {
  THERMAL_100x150: { sizeType: 'THERMAL_100x150', widthMm: 100, heightMm: 150, marginMm: 5, orientation: 'PORTRAIT' },
  A5: { sizeType: 'A5', widthMm: 148, heightMm: 210, marginMm: 10, orientation: 'PORTRAIT' },
  LABEL_100x60: { sizeType: 'LABEL_100x60', widthMm: 100, heightMm: 60, marginMm: 3, orientation: 'LANDSCAPE' },
  LABEL_100x40: { sizeType: 'LABEL_100x40', widthMm: 100, heightMm: 40, marginMm: 3, orientation: 'LANDSCAPE' },
  A4: { sizeType: 'A4', widthMm: 210, heightMm: 297, marginMm: 10, orientation: 'PORTRAIT' },
}

const PRESET_LABELS: Record<string, string> = {
  THERMAL_100x150: 'Label Resi Pengiriman (100\u00d7150mm)',
  A5: 'Dokumen/Faktur A5 (148\u00d7210mm)',
  LABEL_100x60: 'Label Barcode (100\u00d760mm)',
  LABEL_100x40: 'Label Harga Rak (100\u00d740mm)',
  A4: 'Dokumen A4 (210\u00d7297mm)',
}

function SizeSelectorInner({ onSelect }: SizeSelectorProps) {
  const navigate = useNavigate()
  const { dispatch } = useTemplate()
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [templateName, setTemplateName] = useState('')

  const handleConfirm = () => {
    if (!selectedPreset) return
    if (templateName.trim()) dispatch({ type: 'SET_NAME', payload: templateName })
    dispatch({ type: 'SET_PAGE_SETTINGS', payload: PAGE_PRESETS[selectedPreset] })
    onSelect()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f3f8', padding: '24px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <button
          type="button"
          onClick={() => navigate('/documents/templates')}
          style={{ fontSize: '12px', color: '#001871', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, marginBottom: '24px' }}
        >
          &larr; Kembali ke Template
        </button>

        <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#001871', marginBottom: '4px' }}>Template Baru</h2>
          <p style={{ fontSize: '12px', color: '#485885', marginBottom: '24px' }}>Masukkan nama template dan pilih ukuran kanvas untuk memulai.</p>

          {/* Template Name */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '9px', fontWeight: 600, color: '#a9b1c6', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '4px' }}>Nama Template</label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Masukkan nama template"
              maxLength={128}
              style={{ border: '1px solid #ebebeb', borderRadius: '8px', padding: '6px 10px', fontSize: '13px', color: '#1f2b59', width: '260px', outline: 'none' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#001871'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,24,113,.08)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#ebebeb'; e.currentTarget.style.boxShadow = 'none' }}
            />
            <span style={{ fontSize: '9px', color: '#949eb8', display: 'block', marginTop: '2px' }}>{templateName.length}/128 karakter</span>
          </div>

          {/* Size Selection */}
          <label style={{ fontSize: '10px', fontWeight: 600, color: '#a9b1c6', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '12px' }}>Pilih Ukuran Kanvas</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {Object.entries(PAGE_PRESETS).map(([key, preset]) => {
              const isActive = selectedPreset === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedPreset(key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', textAlign: 'left',
                    border: `2px solid ${isActive ? '#001871' : '#ebebeb'}`, borderRadius: '12px',
                    background: isActive ? 'rgba(0,24,113,0.04)' : '#fff', cursor: 'pointer', transition: 'border-color 0.12s',
                  }}
                >
                  <div style={{ width: Math.min(preset.widthMm * 0.4, 50), height: Math.min(preset.heightMm * 0.4, 60), border: '1px solid #d1d5db', borderRadius: '4px', background: '#f9fafb', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#1f2b59' }}>{PRESET_LABELS[key]}</div>
                    <div style={{ fontSize: '10px', color: '#949eb8', marginTop: '2px', fontFamily: 'var(--mono, monospace)' }}>
                      {preset.widthMm}&times;{preset.heightMm}mm &middot; margin {preset.marginMm}mm &middot; {preset.orientation}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Confirm button */}
          {selectedPreset && (
            <button
              type="button"
              onClick={handleConfirm}
              style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: '#001871', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              Mulai Desain
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function SizeSelector({ onSelect }: SizeSelectorProps) {
  return (
    <TemplateProvider>
      <SizeSelectorInner onSelect={onSelect} />
    </TemplateProvider>
  )
}
