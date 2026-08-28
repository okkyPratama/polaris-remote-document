import * as React from 'react'
import { cn } from '../../../lib/utils'

/* ═══════════════════════════════════════════════════════
   PANEL — Container
   ═══════════════════════════════════════════════════════ */

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean
  onClose: () => void
  width?: string
}

export function Panel({ open, onClose, width, className, children, ...props }: PanelProps) {
  if (!open) return null

  return (
    <div
      className={cn(
        'bg-white rounded-2xl p-6 flex-shrink-0 animate-[slideIn_0.2s_ease-out] relative sticky top-0',
        'shadow-[0_1px_3px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.03)]',
        'overflow-y-auto max-h-[calc(100vh-88px)]',
        'flex flex-col',
        className
      )}
      style={{ width: width || '40%' }}
      {...props}
    >
      <button
        onClick={onClose}
        className="absolute top-3.5 right-3.5 w-7 h-7 rounded-lg flex items-center justify-center text-[#a9b1c6] hover:bg-[#f1f3f8] hover:text-[#485885] transition-[background,color] duration-150 cursor-pointer text-xl leading-none z-10"
      >
        ×
      </button>
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   PANEL HEADER — Title + Description
   ═══════════════════════════════════════════════════════ */

export interface PanelHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
}

export function PanelHeader({ title, description, className, children, ...props }: PanelHeaderProps) {
  return (
    <div className={cn('pr-7 mb-3.5', className)} {...props}>
      <h2 className="text-sm font-semibold text-[#001871] mb-1">{title}</h2>
      {description && <p className="text-[11px] text-[#485885]">{description}</p>}
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   PANEL BODY — Form fields / Detail content
   ═══════════════════════════════════════════════════════ */

export function PanelBody({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col gap-[13px] flex-1', className)} {...props}>
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   PANEL FOOTER — Action buttons (Batal + Simpan)
   ═══════════════════════════════════════════════════════ */

export interface PanelFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  onCancel?: () => void
  onSubmit?: () => void
  cancelLabel?: string
  submitLabel?: string
  loading?: boolean
}

export function PanelFooter({
  onCancel,
  onSubmit,
  cancelLabel = 'Batal',
  submitLabel = 'Simpan',
  loading = false,
  className,
  children,
  ...props
}: PanelFooterProps) {
  if (children) {
    return (
      <div className={cn('flex gap-2 mt-[18px] pt-3.5 border-t border-[#f1f3f8] sticky bottom-0 bg-white z-[1] -mb-1 pb-1', className)} {...props}>
        {children}
      </div>
    )
  }

  return (
    <div className={cn('flex gap-2 mt-[18px] pt-3.5 border-t border-[#f1f3f8] sticky bottom-0 bg-white z-[1] -mb-1 pb-1', className)} {...props}>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-[#f1f3f8] text-[#1f2b59] border-none rounded-lg py-[7px] text-[13px] font-medium cursor-pointer hover:bg-[#d9dde6] transition-colors"
        >
          {cancelLabel}
        </button>
      )}
      {onSubmit && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="flex-[2] bg-[#001871] text-white border-none rounded-lg py-[7px] text-[13px] font-medium cursor-pointer hover:bg-[#00206d] transition-colors disabled:opacity-60"
        >
          {loading ? 'Menyimpan...' : submitLabel}
        </button>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   PANEL SECTION — Separator with content (for detail view)
   ═══════════════════════════════════════════════════════ */

export function PanelSection({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('border-t border-[#f1f3f8] pt-3.5 mb-3.5', className)} {...props}>
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   PANEL LABEL — Section title (for detail view)
   ═══════════════════════════════════════════════════════ */

export function PanelLabel({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('text-[10px] font-bold text-[#a9b1c6] uppercase tracking-[0.08em] mb-2.5', className)}
      {...props}
    >
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   PANEL ROW — Label + Value (for detail view)
   ═══════════════════════════════════════════════════════ */

export interface PanelRowProps {
  label: string
  value: React.ReactNode
  className?: string
}

export function PanelRow({ label, value, className }: PanelRowProps) {
  return (
    <div className={cn('grid grid-cols-[120px_1fr] gap-1.5 items-baseline', className)}>
      <span className="text-xs text-[#949eb8]">{label}</span>
      <span className="text-xs text-[#1f2b59] leading-relaxed">{value}</span>
    </div>
  )
}
