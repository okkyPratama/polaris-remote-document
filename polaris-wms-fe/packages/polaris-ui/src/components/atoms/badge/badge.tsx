import * as React from 'react'
import { cn } from '../../../lib/utils'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline' | 'secondary'
export type BadgeSize = 'sm' | 'md' | 'lg'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-blue-100 text-blue-700',
  outline: 'border border-input bg-card text-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
}

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-amber-600',
  danger: 'bg-destructive',
  info: 'bg-blue-600',
  outline: 'bg-foreground',
  secondary: 'bg-secondary-foreground',
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[10px] rounded',
  md: 'px-2 py-0.5 text-[11px] rounded-[20px]',
  lg: 'px-2.5 py-0.5 text-xs rounded-[20px]',
}

export function Badge({ className, variant = 'default', size = 'md', dot = false, children, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 font-medium whitespace-nowrap',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', dotColors[variant])} />
      )}
      {children}
    </div>
  )
}
