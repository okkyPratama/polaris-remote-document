import { useState } from 'react'

interface TemplateNameInputProps {
  value: string
  onChange: (name: string) => void
}

export default function TemplateNameInput({ value, onChange }: TemplateNameInputProps) {
  const [touched, setTouched] = useState(false)
  const error = touched && value.length === 0 ? 'Nama template wajib diisi' : touched && value.length > 100 ? 'Maksimal 100 karakter' : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <label htmlFor="template-name" style={{ fontSize: '9px', fontWeight: 600, color: '#a9b1c6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Nama Template
      </label>
      <input
        id="template-name"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder="Masukkan nama template"
        maxLength={100}
        aria-invalid={!!error}
        style={{
          border: `1px solid ${error ? '#ef3340' : '#ebebeb'}`,
          borderRadius: '8px',
          padding: '5px 10px',
          fontSize: '13px',
          color: '#1f2b59',
          width: '200px',
          outline: 'none',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = error ? '#ef3340' : '#001871'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,24,113,.08)' }}
        onBlurCapture={e => { e.currentTarget.style.borderColor = error ? '#ef3340' : '#ebebeb'; e.currentTarget.style.boxShadow = 'none' }}
      />
      <span style={{ fontSize: '9px', color: error ? '#ef3340' : '#949eb8' }}>
        {error ?? `${value.length}/100 karakter`}
      </span>
    </div>
  )
}
