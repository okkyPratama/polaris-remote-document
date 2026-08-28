import * as React from 'react'
import { cn } from '../../../lib/utils'
import { Pagination } from '../pagination'

export interface ColumnDef<T = any> {
  /** Column header label */
  header: string
  /** Key to access data */
  accessorKey?: keyof T & string
  /** Custom cell renderer — receives the full row */
  cell?: (row: T) => React.ReactNode
  /** Additional className for th/td */
  className?: string
}

export interface DataTablePagination {
  currentPage: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
}

export interface DataTableProps<T = any> {
  columns: ColumnDef<T>[]
  data: T[]
  /** Key field for row identity (default: 'id') */
  rowKey?: keyof T & string
  /** Currently selected row (highlights it) */
  selectedRow?: T | null
  /** Callback when a row is clicked */
  onRowClick?: (row: T) => void
  /** Show loading skeleton */
  isLoading?: boolean
  /** Custom empty state message */
  emptyMessage?: string
  /** Pagination config — if provided, renders pagination footer */
  pagination?: DataTablePagination
  className?: string
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  rowKey = 'id' as keyof T & string,
  selectedRow,
  onRowClick,
  isLoading = false,
  emptyMessage = 'Belum ada data',
  pagination,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn('flex flex-col', className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-[#f1f3f8]">
            {columns.map((col) => (
              <th
                key={col.header}
                className={cn(
                  'px-4 py-2.5 text-left text-[10px] font-medium text-[#a9b1c6] uppercase tracking-wider whitespace-nowrap',
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`skeleton-${i}`} className="border-b border-[#f1f3f8]">
                {columns.map((col) => (
                  <td key={col.header} className="px-4 py-3">
                    <div className="h-4 bg-[#f1f3f8] rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-xs text-[#949eb8]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => {
              const key = row[rowKey]
              const isSelected = selectedRow && selectedRow[rowKey] === key

              return (
                <tr
                  key={String(key)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'border-b border-[#f1f3f8] transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-[rgba(241,243,248,0.7)]',
                    isSelected && 'bg-[rgba(0,24,113,0.04)] border-l-2 border-l-[#001871]'
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.header} className={cn('px-4 py-3 text-sm', col.className)}>
                      {col.cell ? col.cell(row) : String(row[col.accessorKey as string] ?? '')}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>

      {pagination && (
        <Pagination
          currentPage={pagination.currentPage}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
        />
      )}
    </div>
  )
}

DataTable.displayName = 'DataTable'
