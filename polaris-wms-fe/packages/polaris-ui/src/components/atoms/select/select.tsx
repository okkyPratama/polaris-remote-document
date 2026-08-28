import * as React from 'react'
import { cn } from '../../../lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options?: Array<{ value: string; label: string }>
}

const chevronBg = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23485885' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")"

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, children, disabled, style, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-[11px] font-medium text-[#485885]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full border border-[#ebebeb] rounded-lg px-[11px] py-[7px] text-[13px] text-[#1f2b59] bg-white font-[inherit]',
            'appearance-none pr-8',
            'focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)]',
            'transition-[border-color,box-shadow] duration-150 cursor-pointer',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#fafbfd]',
            error && 'border-[#ef3340]',
            className
          )}
          style={{ backgroundImage: chevronBg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', ...style }}
          disabled={disabled}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error && (
          <p className="text-[11px] text-[#ef3340]">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
