import * as React from 'react'
import { cn } from '../../../lib/utils'

export interface ChipFilterProps {
  options: Array<{ value: string; label: string }>
  value: string
  onChange: (value: string) => void
  className?: string
}

export function ChipFilter({ options, value, onChange, className }: ChipFilterProps) {
  return (
    <div className={cn('flex gap-1.5', className)}>
      {options.map((opt) => {
        const isActive = value === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'text-[11px] px-3 py-1 rounded-[20px] font-medium cursor-pointer transition-all select-none',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'border border-input text-icon hover:bg-secondary'
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
