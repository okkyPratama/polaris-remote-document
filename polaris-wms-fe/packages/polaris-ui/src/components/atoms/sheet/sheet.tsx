import * as React from 'react'
import { cn } from '../../../lib/utils'

export interface SheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  side?: 'left' | 'right'
  className?: string
}

export function Sheet({ open, onClose, children, side = 'right', className }: SheetProps) {
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
        className="fixed inset-0 bg-black/30 animate-fade-in"
        onClick={onClose}
      />
      <div
        className={cn(
          'fixed top-0 bottom-0 bg-card shadow-lg flex flex-col',
          'w-3/4 max-w-sm overflow-y-auto',
          side === 'right' ? 'right-0 animate-slide-in' : 'left-0',
          className
        )}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-icon transition-colors cursor-pointer"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  )
}
