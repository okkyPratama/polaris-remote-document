import { Panel, PanelSection, PanelLabel, PanelRow, PanelFooter } from '@polaris/ui'
import type { Location } from '../../../types/spatial.types'
import { locationTypeLabel, spatialStatusLabel } from '../../../types/spatial.types'

export interface LocationDetailPanelProps {
  open: boolean
  data?: Location
  isLoading: boolean
  error?: unknown
  onRetry: () => void
  onClose: () => void
  onEdit?: () => void
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

function formatZone(data: Location): string {
  if (data.zoneCode && data.zoneName) {
    return `${data.zoneCode} — ${data.zoneName}`
  }
  return data.zoneCode || data.zoneName || '—'
}

function formatCapacity(value: number | null | undefined, suffix?: string): string {
  if (value === null || value === undefined) return '—'
  return suffix ? `${value} ${suffix}` : String(value)
}

function statusBadgeClass(status: string): string {
  if (status === 'ACTIVE') return 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]'
  if (status === 'BLOCKED') return 'bg-[rgba(239,51,64,0.1)] text-[#ef3340]'
  return 'bg-[rgba(169,177,198,0.15)] text-[#a9b1c6]'
}

function resolveDetailError(error: unknown): { title: string; description: string; showRetry: boolean } {
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
        backendMsg || 'Lingkup gudang atau izin tidak tersedia untuk melihat Lokasi ini.',
      showRetry: true,
    }
  }

  if (status === 404) {
    return {
      title: 'Tidak ditemukan',
      description: 'Lokasi tidak ditemukan.',
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

export function LocationDetailPanel({
  open,
  data,
  isLoading,
  error,
  onRetry,
  onClose,
  onEdit,
}: LocationDetailPanelProps) {
  if (!open) return null

  const detailError = error ? resolveDetailError(error) : null
  const isBlocked = data?.status === 'BLOCKED'

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
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-mono font-bold text-[#001871] tracking-wider mb-0.5">
                {data.code}
              </div>
              <div className="text-[15px] font-bold text-[#1f2b59] leading-tight">
                {formatOptionalText(data.name) === '—' ? data.code : data.name}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadgeClass(data.status)}`}
                >
                  {spatialStatusLabel(data.status)}
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

          {isBlocked && (
            <div className="flex items-start gap-2 bg-[rgba(239,51,64,0.06)] border border-[rgba(239,51,64,0.15)] rounded-lg px-3 py-2.5 mb-4">
              <span className="text-[11px] text-[#485885] leading-snug">
                Lokasi ini diblokir. Buka blokir terlebih dahulu sebelum mengubah data melalui form
                edit.
              </span>
            </div>
          )}

          <PanelSection>
            <PanelLabel>Identitas</PanelLabel>
            <div className="flex flex-col gap-2">
              <PanelRow label="Kode" value={<span className="font-mono">{data.code}</span>} />
              <PanelRow label="Nama" value={formatOptionalText(data.name)} />
              <PanelRow label="Status" value={spatialStatusLabel(data.status)} />
            </div>
          </PanelSection>

          <PanelSection>
            <PanelLabel>Zona Induk</PanelLabel>
            <div className="flex flex-col gap-2">
              <PanelRow label="Zona" value={formatZone(data)} />
            </div>
          </PanelSection>

          <PanelSection>
            <PanelLabel>Konfigurasi</PanelLabel>
            <div className="flex flex-col gap-2">
              <PanelRow label="Tipe" value={locationTypeLabel(data.locationType)} />
              <PanelRow
                label="Urutan"
                value={<span className="font-mono">{data.sequence}</span>}
              />
              <PanelRow label="Max LPN" value={formatCapacity(data.maxLpnCount)} />
              <PanelRow label="Max berat" value={formatCapacity(data.maxWeightKg, 'kg')} />
            </div>
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

          {onEdit && !isBlocked && (
            <PanelFooter>
              <button
                type="button"
                onClick={onEdit}
                className="flex-1 bg-[#001871] text-white border-none rounded-lg py-2 text-[13px] font-medium cursor-pointer hover:opacity-90 transition-opacity"
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
