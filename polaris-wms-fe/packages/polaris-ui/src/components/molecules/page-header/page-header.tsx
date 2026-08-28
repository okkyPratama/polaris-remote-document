import * as React from 'react'
import { cn } from '../../../lib/utils'

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  breadcrumb?: string
  title: string
  description?: string
  action?: React.ReactNode
  counter?: string
}

export function PageHeader({ breadcrumb, title, description, action, counter, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn('animate-fade-up', className)} {...props}>
      {breadcrumb && (
        <div className="text-[11px] text-muted-foreground mb-1">{breadcrumb}</div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-bold text-primary tracking-tight">{title}</h1>
          {description && (
            <p className="text-xs text-icon mt-0.5">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {counter && (
            <div className="text-xs text-muted-foreground font-mono bg-secondary px-2.5 py-1 rounded-md">
              {counter}
            </div>
          )}
          {action}
        </div>
      </div>
    </div>
  )
}
