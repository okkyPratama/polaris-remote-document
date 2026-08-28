import * as React from 'react'
import { cn } from '../../../lib/utils'

export interface ConfirmDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  isLoading?: boolean
}

/**
 * Confirmation Dialog — untuk destructive actions (Delete, Deactivate, Cancel).
 * Per §8.5: default focus pada Cancel, dismiss via Escape/click outside = Cancel.
 */
export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title = 'Konfirmasi',
  description = 'Apakah Anda yakin ingin melanjutkan?',
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  variant = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null)

  // Focus cancel button when opened (per standard: default focus on Cancel)
  React.useEffect(() => {
    if (open) {
      setTimeout(() => cancelRef.current?.focus(), 50)
    }
  }, [open])

  // Escape key = cancel
  React.useEffect(() => {
    if (!open) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open, onCancel])

  if (!open) return null

  const confirmColors = {
    danger: 'bg-[#ef3340] hover:bg-[#d42d38]',
    warning: 'bg-[#e97b2e] hover:bg-[#d06d28]',
    default: 'bg-[#001871] hover:opacity-90',
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay — click = cancel */}
      <div className="fixed inset-0 bg-black/30 animate-[fadeIn_0.15s]" onClick={onCancel} />

      {/* Dialog */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[400px] bg-white rounded-2xl p-6 shadow-[0_4px_28px_rgba(0,24,113,0.08)] animate-[contentShow_0.15s] z-50">
        <h3 className="text-[15px] font-semibold text-[#001871] mb-1">{title}</h3>
        <p className="text-[13px] text-[#485885] mb-6">{description}</p>

        <div className="flex gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 bg-[#f1f3f8] text-[#1f2b59] border-none rounded-lg py-2.5 text-[13px] font-medium cursor-pointer hover:bg-[#e8ebf2] transition-colors disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'flex-1 text-white border-none rounded-lg py-2.5 text-[13px] font-medium cursor-pointer transition-all disabled:opacity-60',
              confirmColors[variant]
            )}
          >
            {isLoading ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

ConfirmDialog.displayName = 'ConfirmDialog'
