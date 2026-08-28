import * as React from 'react'
import { cn } from '../../../lib/utils'

export interface AddButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string
}

export function AddButton({ label = 'Tambah', className, ...props }: AddButtonProps) {
  return (
    <button
      className={cn(
        'bg-primary text-primary-foreground border-none rounded-full px-4 py-[7px] pl-2',
        'text-[13px] font-medium cursor-pointer flex items-center gap-2 whitespace-nowrap',
        'shadow-[0_2px_12px_rgba(0,24,113,0.2)] hover:opacity-90 transition-opacity',
        className
      )}
      {...props}
    >
      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-primary">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
      {label}
    </button>
  )
}
