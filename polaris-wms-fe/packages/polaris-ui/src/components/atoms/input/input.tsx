import React from 'react'
import { cn } from '../../../lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, startIcon, endIcon, disabled, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-[11px] font-medium text-[#485885]">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {startIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-[#949eb8]">
              {startIcon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full border border-[#ebebeb] rounded-lg px-[11px] py-[7px] text-[13px] text-[#1f2b59] bg-white font-[inherit]',
              'placeholder:text-[#949eb8]',
              'focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)]',
              'transition-[border-color,box-shadow] duration-150',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#fafbfd]',
              startIcon && 'pl-9',
              endIcon && 'pr-9',
              error && 'border-[#ef3340] focus:border-[#ef3340] focus:shadow-[0_0_0_3px_rgba(239,51,64,0.09)]',
              className
            )}
            disabled={disabled}
            {...props}
          />
          {endIcon && (
            <div className="absolute right-3 flex items-center text-[#949eb8]">
              {endIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="text-[11px] text-[#ef3340]">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, label, error, disabled, rows = 4, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-[11px] font-medium text-[#485885]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          rows={rows}
          className={cn(
            'w-full border border-[#ebebeb] rounded-lg px-[11px] py-[7px] text-[13px] text-[#1f2b59] bg-white font-[inherit]',
            'placeholder:text-[#949eb8]',
            'focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)]',
            'transition-[border-color,box-shadow] duration-150 resize-none',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#fafbfd]',
            error && 'border-[#ef3340] focus:border-[#ef3340] focus:shadow-[0_0_0_3px_rgba(239,51,64,0.09)]',
            className
          )}
          disabled={disabled}
          {...props}
        />
        {error && (
          <p className="text-[11px] text-[#ef3340]">{error}</p>
        )}
      </div>
    )
  }
)

TextArea.displayName = 'TextArea'
