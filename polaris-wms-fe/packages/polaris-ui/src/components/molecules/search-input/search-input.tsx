import * as React from 'react'
import { cn } from '../../../lib/utils'

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string
  onChange?: (value: string) => void
  className?: string
}

export function SearchInput({ value = '', onChange, className, placeholder = 'Cari...', ...props }: SearchInputProps) {
  return (
    <div className={cn('relative flex-1 max-w-[260px]', className)}>
      <svg
        className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full border border-input rounded-lg py-[7px] pl-8 pr-3 text-[13px] text-foreground bg-card font-[inherit]',
          'placeholder:text-muted-foreground',
          'focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,24,113,0.09)]',
          'transition-[border,box-shadow] duration-150'
        )}
        {...props}
      />
    </div>
  )
}
