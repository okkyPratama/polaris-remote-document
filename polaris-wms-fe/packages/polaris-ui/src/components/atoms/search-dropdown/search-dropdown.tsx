import * as React from 'react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '../../../lib/utils'

export interface SearchDropdownOption {
  value: string
  label: string
  description?: string
  meta?: React.ReactNode
}

export interface SearchDropdownProps {
  /** Label above the input */
  label?: string
  /** Placeholder when no selection and not typing */
  placeholder?: string
  /** List of options to display */
  options: SearchDropdownOption[]
  /** Currently selected value */
  value?: string
  /** Callback when option is selected */
  onChange: (value: string, option: SearchDropdownOption) => void
  /** Debounce delay in ms (default: 400) */
  debounce?: number
  /** Custom filter function. If not provided, filters on label + description */
  filterFn?: (option: SearchDropdownOption, query: string) => boolean
  /** Custom render for each option row */
  renderOption?: (option: SearchDropdownOption, isSelected: boolean) => React.ReactNode
  /** Display text when option is selected (default: option.label) */
  displayValue?: (option: SearchDropdownOption) => string
  /** No results message */
  emptyMessage?: string
  /** Error message */
  error?: string
  /** Disabled state */
  disabled?: boolean
  /** Additional className for wrapper */
  className?: string
}

export function SearchDropdown({
  label,
  placeholder = 'Cari...',
  options,
  value,
  onChange,
  debounce = 400,
  filterFn,
  renderOption,
  displayValue,
  emptyMessage = 'Tidak ada hasil',
  error,
  disabled = false,
  className,
}: SearchDropdownProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((o) => o.value === value)

  // Debounce
  const handleSearch = useCallback((val: string) => {
    setSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(val)
    }, debounce)
  }, [debounce])

  // Cleanup timeout
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  // Click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter
  const filtered = debouncedSearch
    ? options.filter((opt) => {
        if (filterFn) return filterFn(opt, debouncedSearch)
        const q = debouncedSearch.toLowerCase()
        return opt.label.toLowerCase().includes(q) || (opt.description || '').toLowerCase().includes(q)
      })
    : options

  const handleSelect = (opt: SearchDropdownOption) => {
    onChange(opt.value, opt)
    setSearch('')
    setDebouncedSearch('')
    setIsOpen(false)
  }

  const getDisplayText = () => {
    if (!selectedOption) return ''
    if (displayValue) return displayValue(selectedOption)
    return selectedOption.label
  }

  return (
    <div ref={wrapperRef} className={cn('flex flex-col gap-1', className)}>
      {label && <label className="text-[11px] font-medium text-[#485885]">{label}</label>}

      <div className={cn(
        'relative border rounded-xl bg-white transition-all',
        isOpen ? 'border-[#001871] shadow-[0_0_0_3px_rgba(0,24,113,0.08)]' : 'border-[#ebebeb]',
        disabled && 'opacity-50 cursor-not-allowed',
        error && 'border-[#ef3340]',
      )}>
        {/* Input */}
        <div className="relative flex items-center">
          <svg className="absolute left-3 pointer-events-none text-[#949eb8]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={isOpen ? search : getDisplayText()}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => { if (!disabled) { setIsOpen(true); setSearch('') } }}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full pl-9 pr-9 py-[9px] text-[13px] text-[#1f2b59] bg-transparent outline-none placeholder:text-[#949eb8] rounded-xl disabled:cursor-not-allowed"
          />
          <svg className={cn('absolute right-3 text-[#949eb8] transition-transform', isOpen && 'rotate-180')} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="border-t border-[#f1f3f8] max-h-[240px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-5 text-center text-xs text-[#949eb8]">{emptyMessage}</div>
            ) : (
              filtered.map((opt) => {
                const isSelected = opt.value === value
                if (renderOption) {
                  return (
                    <div key={opt.value} onClick={() => handleSelect(opt)} className="cursor-pointer">
                      {renderOption(opt, isSelected)}
                    </div>
                  )
                }
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt)}
                    className={cn(
                      'px-4 py-2.5 cursor-pointer transition-colors border-b border-[#f1f3f8] last:border-b-0',
                      isSelected ? 'bg-[rgba(0,24,113,0.04)]' : 'hover:bg-[#fafbfd]'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[13px] font-medium text-[#1f2b59]">{opt.label}</div>
                        {opt.description && <div className="text-[11px] text-[#949eb8] mt-0.5">{opt.description}</div>}
                        {opt.meta}
                      </div>
                      {isSelected && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#001871" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {error && <p className="text-[11px] text-[#ef3340]">{error}</p>}
    </div>
  )
}
