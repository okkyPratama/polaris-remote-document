import * as React from 'react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../../lib/utils'

export interface SingleSelectOption {
  value: string
  label: string
  /** Optional secondary text shown below label */
  description?: string
}

export interface SingleSelectProps {
  /** Label above the input */
  label?: string
  /** Placeholder when nothing is selected */
  placeholder?: string
  /** Currently selected value (controlled) */
  value?: string
  /**
   * Pre-populated option to display when value is set but options haven't been loaded yet.
   * Useful for edit forms where the selected option data is already known.
   */
  initialOption?: SingleSelectOption | null
  /** Callback when user picks an option — receives value + full option */
  onChange: (value: string, option: SingleSelectOption | null) => void
  /**
   * Async loader called with the current search query.
   * Called on open (empty query = load all) and on every debounced keystroke.
   */
  loadOptions: (query: string) => Promise<SingleSelectOption[]>
  /** Debounce delay in ms (default: 300) */
  debounce?: number
  /** Message shown when loader returns empty array */
  emptyMessage?: string
  /** Error message shown below the input */
  error?: string
  /** Disables interaction entirely */
  disabled?: boolean
  /** Additional className on the wrapper */
  className?: string
}

export function SingleSelect({
  label,
  placeholder = 'Pilih...',
  value,
  initialOption,
  onChange,
  loadOptions,
  debounce = 300,
  emptyMessage = 'Tidak ada hasil',
  error,
  disabled = false,
  className,
}: SingleSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [options, setOptions] = useState<SingleSelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedOption, setSelectedOption] = useState<SingleSelectOption | null>(null)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load options
  const load = useCallback(async (query: string) => {
    setLoading(true)
    try {
      const results = await loadOptions(query)
      setOptions(results)
    } catch {
      setOptions([])
    } finally {
      setLoading(false)
    }
  }, [loadOptions])

  const scheduleLoad = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => load(query), debounce)
  }, [load, debounce])

  // Cleanup
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  // Position the floating dropdown relative to the trigger
  const updateDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const dropdownHeight = 260
    const spaceBelow = viewportHeight - rect.bottom
    const openUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      ...(openUpward
        ? { bottom: viewportHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    })
  }, [])

  // Click outside closes dropdown — check both trigger and floating dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        wrapperRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!isOpen) return
    const handler = () => updateDropdownPosition()
    window.addEventListener('scroll', handler, true)
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('scroll', handler, true)
      window.removeEventListener('resize', handler)
    }
  }, [isOpen, updateDropdownPosition])

  // Sync selected label when value changes externally
  useEffect(() => {
    if (!value) { setSelectedOption(null); return }
    const found = options.find((o) => o.value === value)
    if (found) { setSelectedOption(found); return }
    // Fallback to initialOption if options haven't loaded yet
    if (initialOption && initialOption.value === value) {
      setSelectedOption(initialOption)
    }
  }, [value, options, initialOption])

  const open = () => {
    if (disabled) return
    updateDropdownPosition()
    setIsOpen(true)
    setInputValue('')
    load('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setInputValue(q)
    scheduleLoad(q)
  }

  const handleSelect = (opt: SingleSelectOption) => {
    setSelectedOption(opt)
    setIsOpen(false)
    setInputValue('')
    onChange(opt.value, opt)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedOption(null)
    setInputValue('')
    onChange('', null)
  }

  const displayText = isOpen ? inputValue : (selectedOption?.label ?? '')

  const dropdown = isOpen ? createPortal(
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="bg-white rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.06)] overflow-hidden animate-[fadeUp_0.12s_ease-out]"
    >
      <div className="max-h-[220px] overflow-y-auto">
        {loading ? (
          <div className="px-4 py-4 flex items-center justify-center gap-2 text-xs text-[#949eb8]">
            <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Memuat...
          </div>
        ) : options.length === 0 ? (
          <div className="px-4 py-5 text-center text-xs text-[#949eb8]">{emptyMessage}</div>
        ) : (
          options.map((opt) => {
            const isSelected = opt.value === value
            return (
              <div
                key={opt.value}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(opt) }}
                className={cn(
                  'px-3 py-2.5 cursor-pointer transition-colors border-b border-[#f1f3f8] last:border-b-0',
                  isSelected ? 'bg-[rgba(0,24,113,0.04)]' : 'hover:bg-[#fafbfd]',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-[#1f2b59] truncate">{opt.label}</div>
                    {opt.description && (
                      <div className="text-[11px] text-[#949eb8] mt-0.5 truncate">{opt.description}</div>
                    )}
                  </div>
                  {isSelected && (
                    <svg className="flex-shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#001871" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div ref={wrapperRef} className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-[11px] font-medium text-[#485885]">{label}</label>
      )}

      {/* Trigger */}
      <div
        ref={triggerRef}
        className={cn(
          'relative border rounded-lg bg-white transition-all duration-150 cursor-pointer',
          isOpen
            ? 'border-[#001871] shadow-[0_0_0_3px_rgba(0,24,113,0.08)]'
            : 'border-[#ebebeb]',
          disabled && 'opacity-50 cursor-not-allowed bg-[#fafbfd] pointer-events-none',
          error && !isOpen && 'border-[#ef3340]',
        )}
        onClick={!isOpen ? open : undefined}
      >
        <div className="flex items-center">
          {isOpen && (
            <svg
              className="absolute left-3 pointer-events-none text-[#949eb8]"
              width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
          )}

          <input
            ref={inputRef}
            type="text"
            value={displayText}
            onChange={handleInputChange}
            onFocus={open}
            placeholder={isOpen ? 'Ketik untuk mencari...' : placeholder}
            readOnly={!isOpen}
            disabled={disabled}
            className={cn(
              'w-full py-[7px] text-[13px] text-[#1f2b59] bg-transparent outline-none',
              'placeholder:text-[#949eb8] font-[inherit]',
              'disabled:cursor-not-allowed',
              isOpen ? 'pl-8 pr-8' : 'pl-[11px] pr-8',
              !isOpen && !selectedOption && 'text-[#949eb8]',
            )}
          />

          <div className="absolute right-3 flex items-center">
            {!isOpen && selectedOption ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-[#a9b1c6] hover:text-[#485885] transition-colors cursor-pointer"
                tabIndex={-1}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            ) : (
              <svg
                className={cn('text-[#949eb8] transition-transform duration-150 pointer-events-none', isOpen && 'rotate-180')}
                width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {error && <p className="text-[11px] text-[#ef3340]">{error}</p>}

      {dropdown}
    </div>
  )
}
