import * as React from 'react'
import { cn } from '../../../lib/utils'

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  label?: string
  onCheckedChange?: (checked: boolean) => void
  size?: 'sm' | 'md' | 'lg'
}

const sizeStyles = {
  sm: { track: 'w-7 h-4', thumb: 'h-3 w-3', translate: 'translate-x-3' },
  md: { track: 'w-9 h-5', thumb: 'h-4 w-4', translate: 'translate-x-4' },
  lg: { track: 'w-11 h-6', thumb: 'h-5 w-5', translate: 'translate-x-5' },
}

export function Switch({ className, label, checked, onCheckedChange, size = 'md', disabled, ...props }: SwitchProps) {
  const [isChecked, setIsChecked] = React.useState(checked ?? false)
  const sizes = sizeStyles[size]

  React.useEffect(() => {
    if (checked !== undefined) setIsChecked(checked)
  }, [checked])

  const toggle = () => {
    if (disabled) return
    const next = !isChecked
    setIsChecked(next)
    onCheckedChange?.(next)
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={isChecked}
        disabled={disabled}
        onClick={toggle}
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isChecked ? 'bg-success' : 'bg-inactive',
          sizes.track
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block rounded-full bg-white shadow-sm transition-transform duration-200 translate-x-0.5 mt-0.5',
            isChecked && sizes.translate,
            sizes.thumb
          )}
        />
      </button>
      {label && (
        <span className="text-xs text-foreground">{label}</span>
      )}
      <input type="hidden" checked={isChecked} readOnly {...props} />
    </div>
  )
}
