import React from 'react'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import { cn } from '../../../lib/utils'

export interface RichTextEditorProps {
  label?: string
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  error?: string
  disabled?: boolean
  className?: string
  height?: string
}

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    ['link'],
    ['clean'],
  ],
}

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list',
  'indent',
  'link',
]

export function RichTextEditor({
  label,
  value = '',
  onChange,
  placeholder = 'Tulis konten...',
  error,
  disabled,
  className,
  height = '200px',
}: RichTextEditorProps) {
  return (
    <div className={cn('flex flex-col gap-[5px] polaris-rte', className)}>
      {label && (
        <label className="text-xs font-medium text-[#485885]">{label}</label>
      )}
      <div
        className={cn(
          'border border-[#ebebeb] rounded-lg overflow-hidden bg-white',
          'focus-within:border-[#001871] focus-within:shadow-[0_0_0_3px_rgba(0,24,113,0.09)]',
          'transition-[border,box-shadow] duration-150',
          disabled && 'opacity-60 pointer-events-none',
          error && 'border-[#ef3340] focus-within:border-[#ef3340] focus-within:shadow-[0_0_0_3px_rgba(239,51,64,0.09)]'
        )}
      >
        <ReactQuill
          theme="snow"
          value={value}
          onChange={(content) => onChange?.(content)}
          placeholder={placeholder}
          readOnly={disabled}
          modules={modules}
          formats={formats}
          style={{ height }}
        />
      </div>
      {error && <p className="text-xs text-[#ef3340] mt-1">{error}</p>}
    </div>
  )
}
