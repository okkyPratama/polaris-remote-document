import * as React from 'react'
import { cn } from '../../../lib/utils'

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant
  icon?: React.ReactNode
}

const variantStyles: Record<AlertVariant, string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  success: 'bg-success/10 border-success/30 text-success',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  danger: 'bg-destructive/7 border-destructive/22 text-destructive',
}

export function Alert({ className, variant = 'info', icon, children, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-[13px]',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <div className="flex-1">{children}</div>
    </div>
  )
}
