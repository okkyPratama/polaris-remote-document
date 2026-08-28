import * as React from 'react'
import { cn } from '../../../lib/utils'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export interface PaginationProps {
  /** Current active page (1-indexed) */
  currentPage: number
  /** Total number of items */
  totalItems: number
  /** Items per page */
  pageSize: number
  /** Called when page changes */
  onPageChange: (page: number) => void
  /** Called when page size changes */
  onPageSizeChange?: (size: number) => void
  /** Custom page size options */
  pageSizeOptions?: number[]
  className?: string
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const startEntry = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endEntry = Math.min(currentPage * pageSize, totalItems)

  const [jumpValue, setJumpValue] = React.useState('')

  const pages = React.useMemo(() => {
    const items: (number | '...')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) items.push(i)
    } else {
      items.push(1)
      if (currentPage > 3) items.push('...')
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      for (let i = start; i <= end; i++) items.push(i)
      if (currentPage < totalPages - 2) items.push('...')
      items.push(totalPages)
    }
    return items
  }, [currentPage, totalPages])

  const handleJump = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const page = parseInt(jumpValue, 10)
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        onPageChange(page)
      }
      setJumpValue('')
    }
  }

  const btnClass = 'border border-[#ebebeb] bg-white rounded-md px-2 py-1 text-[11px] text-[#485885] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f1f3f8] transition-colors'

  return (
    <div className={cn('flex items-center justify-end gap-0 px-4 py-2.5 border-t border-[#f1f3f8]', className)}>
      {/* 1. Info entries */}
      <span className="text-[11px] text-[#949eb8]">
        {totalItems === 0 ? '0 data' : `${startEntry}–${endEntry} dari ${totalItems} data`}
      </span>

      <span className="text-[11px] text-[#ebebeb] mx-3">|</span>

      {/* 2. Per halaman dropdown */}
      {onPageSizeChange && (
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[#a9b1c6]">Per halaman:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="border border-[#ebebeb] rounded-md px-2 py-0.5 text-[11px] text-[#1f2b59] bg-white appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2710%27%20height=%2710%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23485885%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_4px_center] pr-5 cursor-pointer focus:outline-none focus:border-[#001871]"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )}

      <span className="text-[11px] text-[#ebebeb] mx-2"></span>

      {/* 3. Halaman jump */}
      {totalPages > 1 && (
        <>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#a9b1c6]">Halaman:</span>
            <input
              type="text"
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value.replace(/\D/g, ''))}
              onKeyDown={handleJump}
              placeholder={`${currentPage}`}
              className="w-10 border border-[#ebebeb] rounded-md px-2 py-0.5 text-[11px] text-center text-[#1f2b59] bg-white placeholder:text-[#a9b1c6] focus:outline-none focus:border-[#001871] transition-colors"
            />
          </div>

          <span className="text-[11px] text-[#ebebeb] mx-2"></span>
        </>
      )}

      {/* 4. Navigation « ‹ [pages] › » */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className={btnClass}
        >
          «
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={btnClass}
        >
          ‹
        </button>

        {pages.map((page, i) =>
          page === '...' ? (
            <span key={`dots-${i}`} className="px-1 text-[11px] text-[#a9b1c6]">…</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={cn(
                'min-w-[26px] rounded-md px-2 py-1 text-[11px] font-semibold text-center cursor-pointer transition-colors',
                currentPage === page
                  ? 'bg-[#001871] text-white'
                  : 'border border-[#ebebeb] bg-white text-[#485885] hover:bg-[#f1f3f8]'
              )}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={btnClass}
        >
          ›
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className={btnClass}
        >
          »
        </button>
      </div>
    </div>
  )
}
