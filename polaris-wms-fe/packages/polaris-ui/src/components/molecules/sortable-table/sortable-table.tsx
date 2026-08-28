import * as React from 'react'
import { cn } from '../../../lib/utils'

export type SortDirection = 'asc' | 'desc' | null

export interface SortState {
  column: string | null
  direction: SortDirection
}

export interface SortableColumnProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  columnKey: string
  sortState: SortState
  onSort: (column: string, direction: SortDirection) => void
  isSortable?: boolean
}

/**
 * SortableColumn — table header cell with sort indicator.
 * Click cycle: asc → desc → null (reset to default)
 */
export function SortableColumn({
  columnKey,
  sortState,
  onSort,
  isSortable = true,
  className,
  children,
  ...props
}: SortableColumnProps) {
  const isActive = sortState.column === columnKey
  const direction = isActive ? sortState.direction : null

  const handleClick = () => {
    if (!isSortable) return

    let nextDirection: SortDirection
    if (!isActive || direction === null) {
      nextDirection = 'asc'
    } else if (direction === 'asc') {
      nextDirection = 'desc'
    } else {
      nextDirection = null
    }

    onSort(columnKey, nextDirection)
  }

  return (
    <th
      className={cn(
        'px-4 py-2.5 text-left text-[10px] font-medium text-[#a9b1c6] uppercase tracking-wider whitespace-nowrap',
        isSortable && 'cursor-pointer select-none hover:text-[#485885] transition-colors',
        isActive && 'text-[#001871]',
        className
      )}
      onClick={handleClick}
      {...props}
    >
      <div className="flex items-center gap-1">
        {children}
        {isSortable && (
          <span className="inline-flex flex-col leading-none">
            <span className={cn('text-[8px]', direction === 'asc' ? 'text-[#001871]' : 'text-[#d9dde6]')}>▲</span>
            <span className={cn('text-[8px] -mt-0.5', direction === 'desc' ? 'text-[#001871]' : 'text-[#d9dde6]')}>▼</span>
          </span>
        )}
      </div>
    </th>
  )
}

SortableColumn.displayName = 'SortableColumn'

/**
 * Hook for managing sort state.
 * Returns sort state and handler, plus a utility to sort data client-side.
 */
export function useSort(defaultColumn?: string, defaultDirection: SortDirection = 'desc') {
  const [sortState, setSortState] = React.useState<SortState>({
    column: defaultColumn || null,
    direction: defaultColumn ? defaultDirection : null,
  })

  const onSort = React.useCallback((column: string, direction: SortDirection) => {
    setSortState({ column: direction ? column : null, direction })
  }, [])

  // Client-side sort utility
  const sortData = React.useCallback(<T extends Record<string, unknown>>(data: T[]): T[] => {
    if (!sortState.column || !sortState.direction) return data

    const col = sortState.column
    const dir = sortState.direction === 'asc' ? 1 : -1

    return [...data].sort((a, b) => {
      const aVal = a[col]
      const bVal = b[col]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (aVal < bVal) return -1 * dir
      if (aVal > bVal) return 1 * dir
      return 0
    })
  }, [sortState])

  return { sortState, onSort, sortData }
}
