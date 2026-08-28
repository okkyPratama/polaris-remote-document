import { useEffect, useState } from 'react'
import { Panel, PanelSection, PanelLabel, PanelRow, PanelFooter, ConfirmDialog } from '@polaris/ui'
import type { Zone, ZoneActivity } from '../../../types/spatial.types'
import { spatialStatusLabel, zoneActivityLabel } from '../../../types/spatial.types'

export interface ZoneDetailPanelProps {
  open: boolean
  data?: Zone
  isLoading: boolean
  error?: unknown
  onRetry: () => void
  onClose: () => void
  onEdit?: () => void
  onDelete?: (id: string) => Promise<void>
  isDeleting?: boolean
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

function formatZoneGroup(data: Zone): string {
  if (data.zoneGroupCode && data.zoneGroupName) {
    return `${data.zoneGroupCode} — ${data.zoneGroupName}`
  }
  return data.zoneGroupCode || data.zoneGroupName || '—'
}

function activityLabel(activity: ZoneActivity): string {
  return zoneActivityLabel(activity)
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
        backendMsg || 'Lingkup gudang atau izin tidak tersedia untuk melihat Zona ini.',
      showRetry: true,
    }
  }

  if (status === 404) {
    return {
      title: 'Tidak ditemukan',
      description: 'Zona tidak ditemukan.',
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

export function ZoneDetailPanel({
  open,
  data,
  isLoading,
  error,
  onRetry,
  onClose,
  onEdit,
  onDelete,
  isDeleting = false,
}: ZoneDetailPanelProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!open) setShowDeleteConfirm(false)
  }, [open, data?.id])

  if (!open) return null

  const detailError = error ? resolveDetailError(error) : null
  const isActive = data?.status === 'ACTIVE'
  const activities = data?.allowedActivities ?? []

  const handleDelete = async () => {
    if (!data || !onDelete || isDeleting) return
    try {
      await onDelete(data.id)
      setShowDeleteConfirm(false)
    } catch {
      // Keep dialog open; parent shows the toast.
    }
  }

  return (
    <>
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
                  <path d="M3 7h18M3 12h18M3 17h18" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono font-bold text-[#001871] tracking-wider mb-0.5">
                  {data.code}
                </div>
                <div className="text-[15px] font-bold text-[#1f2b59] leading-tight">{data.name}</div>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]'
                        : 'bg-[rgba(169,177,198,0.15)] text-[#a9b1c6]'
                    }`}
                  >
                    {data.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
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
                <PanelRow label="Kode" value={<span className="font-mono">{data.code}</span>} />
                <PanelRow label="Nama" value={data.name} />
                <PanelRow
                  label="Status"
                  value={spatialStatusLabel(data.status)}
                />
              </div>
            </PanelSection>

            <PanelSection>
              <PanelLabel>Grup Zona Induk</PanelLabel>
              <div className="flex flex-col gap-2">
                <PanelRow label="Grup Zona" value={formatZoneGroup(data)} />
              </div>
            </PanelSection>

            <PanelSection>
              <PanelLabel>Aktivitas yang diizinkan</PanelLabel>
              {activities.length === 0 ? (
                <PanelRow label="Aktivitas" value="—" />
              ) : (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {activities.map((activity) => (
                    <span
                      key={activity}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(0,24,113,0.08)] text-[#001871]"
                    >
                      {activityLabel(activity)}
                    </span>
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

            {(onEdit || onDelete) && (
              <PanelFooter>
                {onEdit && (
                  <button
                    type="button"
                    onClick={onEdit}
                    disabled={isDeleting}
                    className="flex-1 bg-[#001871] text-white border-none rounded-lg py-2 text-[13px] font-medium cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isDeleting}
                    className="border border-[rgba(239,51,64,0.3)] bg-white text-[#ef3340] rounded-lg py-2 px-4 text-[13px] cursor-pointer hover:bg-[rgba(239,51,64,0.04)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Hapus
                  </button>
                )}
              </PanelFooter>
            )}
          </>
        ) : null}
      </Panel>

      {data && onDelete && (
        <ConfirmDialog
          open={showDeleteConfirm}
          title="Hapus Zona"
          description={`Hapus Zona “${data.code} — ${data.name}”? Zona hanya dapat dihapus apabila belum memiliki Lokasi.`}
          confirmLabel="Hapus"
          cancelLabel="Batal"
          variant="danger"
          isLoading={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => {
            if (isDeleting) return
            setShowDeleteConfirm(false)
          }}
        />
      )}
    </>
  )
}
