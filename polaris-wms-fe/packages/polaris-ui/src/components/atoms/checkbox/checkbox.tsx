import * as React from 'react'
import { cn } from '../../../lib/utils'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  label?: string
  error?: string
  onCheckedChange?: (checked: boolean) => void
  size?: 'sm' | 'md' | 'lg'
}

const sizeStyles = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, onCheckedChange, size = 'md', disabled, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked)
    }

    if (!label) {
      return (
        <input
          ref={ref}
          type="checkbox"
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            'accent-primary cursor-pointer rounded',
            sizeStyles[size],
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />
      )
    }

    return (
      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2.5 cursor-pointer text-xs text-foreground">
          <input
            ref={ref}
            type="checkbox"
            onChange={handleChange}
            disabled={disabled}
            className={cn(
              'accent-primary cursor-pointer rounded',
              sizeStyles[size],
              'disabled:cursor-not-allowed disabled:opacity-50',
              className
            )}
            {...props}
          />
          {label}
        </label>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'
