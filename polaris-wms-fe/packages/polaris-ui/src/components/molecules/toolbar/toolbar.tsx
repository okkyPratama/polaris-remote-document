import * as React from 'react'
import { cn } from '../../../lib/utils'

export interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Toolbar({ className, children, ...props }: ToolbarProps) {
  return (
    <div
      className={cn(
        'bg-card rounded-2xl px-4 py-3 flex items-center gap-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function ToolbarActions({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('ml-auto flex items-center gap-2', className)} {...props}>
      {children}
    </div>
  )
}
