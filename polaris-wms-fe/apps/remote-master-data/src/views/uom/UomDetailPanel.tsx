import { Panel, PanelSection, PanelLabel, PanelRow, PanelFooter } from '@polaris/ui'
import type { UomHierarchy, UomLevel } from '../../types/uom.types'
import { uomStatusLabel } from '../../types/uom.types'

export interface UomDetailPanelProps {
  open: boolean
  data?: UomHierarchy
  isLoading: boolean
  error?: unknown
  onRetry: () => void
  onClose: () => void
  onEdit?: () => void
  isMutating?: boolean
}

function formatDateTime(iso?: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatOptionalText(value?: string | null): string {
  if (value === null || value === undefined || value.trim() === '') return '—'
  return value
}

function formatFactorToParent(value: number | null): string {
  if (value === null || value === undefined) return '—'
  return String(value)
}

function resolveDetailError(error: unknown): {
  title: string
  description: string
  showRetry: boolean
} {
  const apiError = error as {
    httpCode?: number
    status?: number
    message?: string
    errorMessage?: string[]
  }
  const status = apiError?.httpCode ?? apiError?.status
  const backendMsg = apiError?.errorMessage?.[0] || apiError?.message

  if (status === 403) {
    return {
      title: 'Akses ditolak',
      description:
        backendMsg ||
        'Konteks Owner atau izin tidak tersedia untuk melihat hierarki UOM ini.',
      showRetry: true,
    }
  }

  if (status === 404) {
    return {
      title: 'Tidak ditemukan',
      description: 'Hierarki UOM tidak ditemukan.',
      showRetry: false,
    }
  }

  return {
    title: 'Gagal memuat detail',
    description: backendMsg || 'Terjadi kesalahan saat memuat detail. Silakan coba lagi.',
    showRetry: true,
  }
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse" aria-busy="true" aria-label="Memuat detail">
      <div className="flex items-start gap-3 pr-7 mb-2">
        <div className="w-11 h-11 rounded-lg bg-[#f1f3f8]" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 rounded bg-[#f1f3f8]" />
          <div className="h-4 w-40 rounded bg-[#f1f3f8]" />
          <div className="h-4 w-16 rounded-full bg-[#f1f3f8]" />
        </div>
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border-t border-[#f1f3f8] pt-3.5 space-y-2">
          <div className="h-3 w-20 rounded bg-[#f1f3f8]" />
          <div className="h-3 w-full rounded bg-[#f1f3f8]" />
          <div className="h-3 w-[75%] rounded bg-[#f1f3f8]" />
        </div>
      ))}
    </div>
  )
}

function LevelBlock({ level }: { level: UomLevel }) {
  const isActive = level.status === 'ACTIVE'

  return (
    <div className="rounded-lg border border-[#f1f3f8] bg-[#f8f9fc] px-3 py-2.5">
      <div className="flex items-center gap-2 mb-2 min-w-0">
        <span className="font-mono text-xs font-semibold text-[#001871]">{level.uomCode}</span>
        <span className="text-[12px] text-[#1f2b59] truncate">{level.displayName}</span>
        <span
          className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
            isActive
              ? 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]'
              : 'bg-[rgba(169,177,198,0.15)] text-[#a9b1c6]'
          }`}
        >
          {uomStatusLabel(level.status)}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <PanelRow label="Level" value={String(level.level)} />
        <PanelRow label="Faktor ke EA" value={String(level.conversionFactorToEa)} />
        <PanelRow label="Faktor ke parent" value={formatFactorToParent(level.conversionFactorToParent)} />
        <PanelRow
          label="Parent UOM"
          value={
            <span className="font-mono">{formatOptionalText(level.parentUomCode)}</span>
          }
        />
      </div>
    </div>
  )
}

export function UomDetailPanel({
  open,
  data,
  isLoading,
  error,
  onRetry,
  onClose,
  onEdit,
  isMutating = false,
}: UomDetailPanelProps) {
  if (!open) return null

  const detailError = error ? resolveDetailError(error) : null
  const isActive = data?.status === 'ACTIVE'
  const levels = data?.levels ?? []

  return (
    <Panel open={open} onClose={onClose}>
      {isLoading && !data ? (
        <DetailSkeleton />
      ) : detailError && !data ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
          <h3 className="text-sm font-medium text-[#485885] mb-1">{detailError.title}</h3>
          <p className="text-xs text-[#949eb8] max-w-[260px] mb-4">{detailError.description}</p>
          {detailError.showRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="bg-[#001871] text-white border-none rounded-full px-4 py-[7px] text-[13px] font-medium cursor-pointer hover:opacity-90 transition-opacity"
            >
              Coba lagi
            </button>
          )}
        </div>
      ) : data ? (
        <>
          <div className="flex items-start gap-3 pr-7 mb-4">
            <div className="w-11 h-11 rounded-lg bg-[rgba(0,24,113,0.08)] flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#001871" strokeWidth="1.8">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-mono font-bold text-[#001871] tracking-wider mb-0.5">
                {data.skuCode}
              </div>
              <div className="text-[15px] font-bold text-[#1f2b59] leading-tight font-mono truncate" title={data.ownerId}>
                {data.ownerId}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]'
                      : 'bg-[rgba(169,177,198,0.15)] text-[#a9b1c6]'
                  }`}
                >
                  {uomStatusLabel(data.status)}
                </span>
                {isLoading && (
                  <span className="text-[10px] text-[#a9b1c6]">Memperbarui...</span>
                )}
              </div>
            </div>
          </div>

          {detailError && (
            <div className="flex items-start gap-2 bg-[rgba(239,51,64,0.06)] rounded-lg px-3 py-2.5 mb-4">
              <span className="text-[11px] text-[#ef3340] leading-snug flex-1">
                {detailError.description}
              </span>
              {detailError.showRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="text-[11px] font-medium text-[#001871] underline cursor-pointer"
                >
                  Coba lagi
                </button>
              )}
            </div>
          )}

          <PanelSection>
            <PanelLabel>Identitas</PanelLabel>
            <div className="flex flex-col gap-2">
              <PanelRow label="SKU" value={<span className="font-mono">{data.skuCode}</span>} />
              <PanelRow label="Owner" value={<span className="font-mono">{data.ownerId}</span>} />
              <PanelRow label="Status" value={uomStatusLabel(data.status)} />
            </div>
          </PanelSection>

          <PanelSection>
            <PanelLabel>Hierarki Kemasan</PanelLabel>
            {levels.length === 0 ? (
              <PanelRow label="Level" value="—" />
            ) : (
              <div className="flex flex-col gap-2.5">
                {levels.map((level) => (
                  <LevelBlock key={level.id || `${level.level}-${level.uomCode}`} level={level} />
                ))}
              </div>
            )}
          </PanelSection>

          <PanelSection>
            <PanelLabel>Audit</PanelLabel>
            <div className="flex flex-col gap-2">
              <PanelRow label="Dibuat oleh" value={formatOptionalText(data.createdBy)} />
              <PanelRow label="Dibuat" value={formatDateTime(data.createdAt)} />
              <PanelRow label="Diubah oleh" value={formatOptionalText(data.updatedBy)} />
              <PanelRow label="Diubah" value={formatDateTime(data.updatedAt)} />
            </div>
          </PanelSection>

          {onEdit && (
            <PanelFooter>
              <button
                type="button"
                onClick={onEdit}
                disabled={isMutating}
                className="flex-1 bg-[#001871] text-white border-none rounded-lg py-2 text-[13px] font-medium cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Edit
              </button>
            </PanelFooter>
          )}
        </>
      ) : null}
    </Panel>
  )
}
