import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../../lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'icon'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground hover:opacity-90 shadow-[0_2px_12px_rgba(0,24,113,0.2)]',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline:
    'border border-border bg-card text-foreground hover:bg-secondary',
  ghost:
    'text-foreground hover:bg-secondary',
  destructive:
    'border border-destructive/30 bg-card text-destructive hover:bg-destructive/5',
  icon:
    'text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md p-1',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-[9px]',
  lg: 'px-5 py-3 text-sm rounded-[9px]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-ring/20 focus:ring-offset-1',
          'disabled:opacity-50 disabled:pointer-events-none',
          variant !== 'icon' && sizeStyles[size],
          variantStyles[variant],
          className
        )}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
