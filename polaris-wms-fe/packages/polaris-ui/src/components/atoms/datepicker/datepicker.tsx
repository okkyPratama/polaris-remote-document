import React from 'react'
import ReactDatePicker from 'react-datepicker'
import { cn } from '../../../lib/utils'
import 'react-datepicker/dist/react-datepicker.css'

export interface DatePickerProps {
  label?: string
  value?: Date | null
  onChange?: (date: Date | null) => void
  placeholder?: string
  error?: string
  disabled?: boolean
  showTimeSelect?: boolean
  dateFormat?: string
  minDate?: Date
  maxDate?: Date
  className?: string
  isClearable?: boolean
}

export function DatePicker({
  label,
  value,
  onChange,
  placeholder = 'Pilih tanggal',
  error,
  disabled,
  showTimeSelect = false,
  dateFormat,
  minDate,
  maxDate,
  className,
  isClearable = true,
}: DatePickerProps) {
  const format = dateFormat || (showTimeSelect ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy')

  return (
    <div className={cn('flex flex-col gap-[5px]', className)}>
      {label && (
        <label className="text-xs font-medium text-[#485885]">{label}</label>
      )}
      <ReactDatePicker
        selected={value}
        onChange={(date: Date | null) => onChange?.(date)}
        placeholderText={placeholder}
        disabled={disabled}
        showTimeSelect={showTimeSelect}
        dateFormat={format}
        minDate={minDate}
        maxDate={maxDate}
        isClearable={isClearable}
        autoComplete="off"
        className={cn(
          'w-full border border-[#ebebeb] rounded-lg px-3 py-2.5 text-sm text-[#1f2b59] bg-white',
          'placeholder:text-[#949eb8]',
          'focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.09)]',
          'transition-[border,box-shadow] duration-150',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          error && 'border-[#ef3340] focus:border-[#ef3340] focus:shadow-[0_0_0_3px_rgba(239,51,64,0.09)]'
        )}
        wrapperClassName="w-full"
        popperClassName="polaris-datepicker-popper"
      />
      {error && <p className="text-xs text-[#ef3340]">{error}</p>}
    </div>
  )
}

export interface DateRangePickerProps {
  label?: string
  startDate?: Date | null
  endDate?: Date | null
  onChange?: (range: { start: Date | null; end: Date | null }) => void
  startPlaceholder?: string
  endPlaceholder?: string
  error?: string
  disabled?: boolean
  dateFormat?: string
  minDate?: Date
  maxDate?: Date
  className?: string
  isClearable?: boolean
}

export function DateRangePicker({
  label,
  startDate = null,
  endDate = null,
  onChange,
  startPlaceholder = 'Dari',
  endPlaceholder = 'Sampai',
  error,
  disabled,
  dateFormat = 'dd/MM/yyyy',
  minDate,
  maxDate,
  className,
  isClearable = true,
}: DateRangePickerProps) {
  const inputClass = cn(
    'w-full border border-[#ebebeb] rounded-lg px-3 py-2.5 text-sm text-[#1f2b59] bg-white',
    'placeholder:text-[#949eb8]',
    'focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.09)]',
    'transition-[border,box-shadow] duration-150',
    'disabled:opacity-60 disabled:cursor-not-allowed',
    error && 'border-[#ef3340] focus:border-[#ef3340] focus:shadow-[0_0_0_3px_rgba(239,51,64,0.09)]'
  )

  return (
    <div className={cn('flex flex-col gap-[5px]', className)}>
      {label && (
        <label className="text-xs font-medium text-[#485885]">{label}</label>
      )}
      <div className="flex items-center gap-2">
        <ReactDatePicker
          selected={startDate}
          onChange={(date: Date | null) => onChange?.({ start: date, end: endDate })}
          selectsStart
          startDate={startDate}
          endDate={endDate}
          placeholderText={startPlaceholder}
          disabled={disabled}
          dateFormat={dateFormat}
          minDate={minDate}
          maxDate={endDate || maxDate}
          isClearable={isClearable}
          autoComplete="off"
          className={inputClass}
          wrapperClassName="w-full"
          popperClassName="polaris-datepicker-popper"
        />
        <span className="text-xs text-[#a9b1c6] flex-shrink-0">—</span>
        <ReactDatePicker
          selected={endDate}
          onChange={(date: Date | null) => onChange?.({ start: startDate, end: date })}
          selectsEnd
          startDate={startDate}
          endDate={endDate}
          placeholderText={endPlaceholder}
          disabled={disabled}
          dateFormat={dateFormat}
          minDate={startDate || minDate}
          maxDate={maxDate}
          isClearable={isClearable}
          autoComplete="off"
          className={inputClass}
          wrapperClassName="w-full"
          popperClassName="polaris-datepicker-popper"
        />
      </div>
      {error && <p className="text-xs text-[#ef3340]">{error}</p>}
    </div>
  )
}
