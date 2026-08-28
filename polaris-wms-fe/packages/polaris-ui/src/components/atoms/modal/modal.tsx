import * as React from 'react'
import { cn } from '../../../lib/utils'

export interface ModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  overlayClassName?: string
}

export function Modal({ open, onClose, children, className, overlayClassName }: ModalProps) {
  React.useEffect(() => {
    if (!open) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={cn('fixed inset-0 bg-black/30 animate-fade-in', overlayClassName)}
        onClick={onClose}
      />
      <div
        className={cn(
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          'max-h-[90vh] overflow-y-auto',
          'bg-card rounded-2xl p-6 shadow-[0_4px_28px_rgba(0,24,113,0.08)]',
          'animate-content-show z-50',
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function ModalHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  )
}

export function ModalTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn('text-[15px] font-semibold text-primary', className)} {...props}>
      {children}
    </h2>
  )
}

export function ModalDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-xs text-icon mt-1', className)} {...props}>
      {children}
    </p>
  )
}

export function ModalFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex gap-2 mt-5 pt-4 border-t border-secondary', className)} {...props}>
      {children}
    </div>
  )
}

export function ModalClose({ onClose, className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className={cn(
        'absolute top-4 right-4 w-7 h-7 rounded-md flex items-center justify-center',
        'text-muted-foreground hover:bg-secondary hover:text-icon transition-colors cursor-pointer',
        className
      )}
      {...props}
    >
      {children || '×'}
    </button>
  )
}
