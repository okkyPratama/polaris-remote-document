import type { ReactNode } from 'react'
import { cn } from '../../../lib/utils'

export interface EmptyStateProps {
  /** 'no-data' = no records at all, 'no-results' = filter returned 0 */
  variant?: 'no-data' | 'no-results' | 'error'
  title?: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

const defaultContent = {
  'no-data': {
    title: 'Belum ada data',
    description: 'Data belum tersedia saat ini.',
  },
  'no-results': {
    title: 'Tidak ada hasil',
    description: 'Tidak ada data yang cocok dengan filter Anda.',
  },
  error: {
    title: 'Terjadi kesalahan',
    description: 'Gagal memuat data. Silakan coba lagi.',
  },
}

export function EmptyState({
  variant = 'no-data',
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  const content = defaultContent[variant]

  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-6 text-center', className)}>
      {icon && <div className="mb-3 text-[#a9b1c6]">{icon}</div>}
      <h3 className="text-sm font-medium text-[#485885] mb-1">
        {title || content.title}
      </h3>
      <p className="text-xs text-[#949eb8] max-w-[280px]">
        {description || content.description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

EmptyState.displayName = 'EmptyState'
