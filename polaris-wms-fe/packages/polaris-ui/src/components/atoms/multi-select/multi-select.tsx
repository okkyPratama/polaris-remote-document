import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../../lib/utils'

export interface MultiSelectOption {
  value: string
  label: string
}

export interface MultiSelectProps {
  label?: string
  placeholder?: string
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  onSearch?: (query: string) => void
  loading?: boolean
  error?: string
  debounceMs?: number
}

export function MultiSelect({
  label,
  placeholder = '— Pilih —',
  options,
  value,
  onChange,
  onSearch,
  loading = false,
  error,
  debounceMs = 300,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const calcPosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const gap = 4
    // Search row + max-h-48 options ≈ 260px preferred height.
    const preferredHeight = 260
    const spaceBelow = viewportHeight - rect.bottom - gap
    const spaceAbove = rect.top - gap
    const openUpward = spaceBelow < preferredHeight && spaceAbove > spaceBelow
    const available = Math.max(openUpward ? spaceAbove : spaceBelow, 140)
    const maxHeight = Math.min(preferredHeight, available)

    setDropdownStyle({
      position: 'fixed',
      left: Math.round(rect.left),
      width: Math.round(rect.width),
      zIndex: 9999,
      maxHeight: Math.round(maxHeight),
      ...(openUpward
        ? { bottom: Math.round(viewportHeight - rect.top + gap) }
        : { top: Math.round(rect.bottom + gap) }),
    })
  }, [])

  // Buka dropdown: hitung posisi DULU, baru set open
  const handleOpen = () => {
    if (open) {
      setOpen(false)
      return
    }
    calcPosition()
    setOpen(true)
  }

  // Close on outside click — pakai setTimeout(0) agar listener aktif
  // setelah event klik trigger selesai diproses
  useEffect(() => {
    if (!open) return

    function handleOutsideClick(e: MouseEvent) {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return
      setOpen(false)
    }

    function handleScroll(e: Event) {
      if (dropdownRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }

    const timer = setTimeout(() => {
      document.addEventListener('click', handleOutsideClick)
      window.addEventListener('scroll', handleScroll, true)
    }, 0)

    window.addEventListener('resize', calcPosition)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleOutsideClick)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', calcPosition)
    }
  }, [open, calcPosition])

  // Focus search input setelah dropdown terbuka
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 0)
    } else {
      setSearch('')
    }
  }, [open])

  const handleSearch = useCallback(
    (q: string) => {
      setSearch(q)
      if (!onSearch) return
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => onSearch(q), debounceMs)
    },
    [onSearch, debounceMs]
  )

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  }

  const remove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(value.filter((v) => v !== id))
  }

  const filtered = onSearch
    ? options
    : options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))

  const dropdown = (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="bg-white border border-[#ebebeb] rounded-lg shadow-[0_4px_16px_rgba(0,24,113,0.12)] overflow-hidden flex flex-col"
    >
      {/* Search */}
      <div className="px-2.5 py-2 border-b border-[#f0f0f0] flex-shrink-0">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#949eb8] pointer-events-none"
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Cari..."
            className="w-full pl-7 pr-3 py-1.5 text-[12px] text-[#1f2b59] border border-[#ebebeb] rounded-md focus:outline-none focus:border-[#001871] placeholder:text-[#949eb8]"
          />
        </div>
      </div>

      {/* Options — scroll within remaining viewport space when flipped near bottom */}
      <ul role="listbox" className="min-h-0 flex-1 overflow-y-auto py-1">
        {loading && (
          <li className="px-3 py-2 text-[12px] text-[#949eb8]">Memuat...</li>
        )}
        {!loading && filtered.length === 0 && (
          <li className="px-3 py-2 text-[12px] text-[#949eb8]">Tidak ada hasil</li>
        )}
        {!loading &&
          filtered.map((opt) => {
            const selected = value.includes(opt.value)
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={selected}
                onClick={() => toggle(opt.value)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 cursor-pointer text-[12px] text-[#1f2b59]',
                  'hover:bg-[rgba(0,24,113,0.05)] transition-colors',
                  selected && 'bg-[rgba(0,24,113,0.04)]'
                )}
              >
                <span className="w-4 flex-shrink-0 text-[#001871] text-[13px] font-medium">
                  {selected ? '✓' : ''}
                </span>
                <span className={cn('truncate', selected && 'font-semibold text-[#001871]')}>
                  {opt.label}
                </span>
              </li>
            )
          })}
      </ul>
    </div>
  )

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-[11px] font-medium text-[#485885]">{label}</label>
      )}

      {/* Trigger */}
      <div
        ref={triggerRef}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={handleOpen}
        className={cn(
          'relative min-h-[34px] w-full border rounded-lg px-2.5 py-1.5 bg-white cursor-pointer',
          'flex flex-wrap items-center gap-1.5 pr-8',
          'transition-[border-color,box-shadow] duration-150',
          open
            ? 'border-[#001871] shadow-[0_0_0_3px_rgba(0,24,113,0.08)]'
            : 'border-[#ebebeb]',
          error && 'border-[#ef3340] shadow-[0_0_0_3px_rgba(239,51,64,0.09)]'
        )}
      >
        {value.length === 0 && (
          <span className="text-[13px] text-[#949eb8] select-none">{placeholder}</span>
        )}
        {value.map((id) => {
          const opt = options.find((o) => o.value === id)
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[rgba(0,24,113,0.08)] text-[#001871]"
            >
              {opt?.label ?? id}
              <button
                type="button"
                aria-label={`Hapus ${opt?.label ?? id}`}
                onClick={(e) => remove(id, e)}
                className="opacity-50 hover:opacity-100 leading-none ml-0.5"
              >
                ×
              </button>
            </span>
          )
        })}

        {/* Chevron */}
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#485885]">
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            className={cn('transition-transform duration-150', open && 'rotate-180')}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </div>

      {error && <p className="text-[11px] text-[#ef3340]">{error}</p>}

      {open && createPortal(dropdown, document.body)}
    </div>
  )
}
