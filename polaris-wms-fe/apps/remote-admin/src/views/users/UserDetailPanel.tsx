import { useState } from 'react'
import { Panel, PanelSection, PanelLabel, PanelFooter, PanelRow, ConfirmDialog } from '@polaris/ui'
import { formatTimestamp } from '@polaris/service'
import type { User } from '../../types/user.types'

interface Props {
  open: boolean
  data: User | null
  isLoading?: boolean
  onClose: () => void
  onEdit?: () => void
  onDeactivate?: (id: string, reason: string) => Promise<void>
  onReactivate?: (id: string) => Promise<void>
}

function initials(username: string): string {
  return username
    .split(/[\s._-]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function UserDetailPanel({ open, data, isLoading, onClose, onEdit, onDeactivate, onReactivate }: Props) {
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [showReactivateConfirm, setShowReactivateConfirm] = useState(false)
  const [isActioning, setIsActioning] = useState(false)

  if (!data) return null

  const isActive = data.status === 'ACTIVE'
  const warehouses = data.warehouses ?? []

  const handleDeactivate = async () => {
    setIsActioning(true)
    try {
      await onDeactivate?.(data.id, '')
      setShowDeactivateConfirm(false)
      onClose()
    } finally {
      setIsActioning(false)
    }
  }

  const handleReactivate = async () => {
    setIsActioning(true)
    try {
      await onReactivate?.(data.id)
      setShowReactivateConfirm(false)
      onClose()
    } finally {
      setIsActioning(false)
    }
  }

  return (
    <>
      <Panel open={open} onClose={onClose}>
        {/* Header */}
        <div className="flex items-center gap-3 pr-7 mb-4">
          <div className="w-11 h-11 rounded-full bg-[#001871] text-white flex items-center justify-center text-[15px] font-bold flex-shrink-0 tracking-wide">
            {initials(data.username)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-bold text-[#001871] leading-tight truncate">{data.fullName}</div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {data.roles && data.roles.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {data.roles.map((r) => (
                    <span key={r.id || r.code} className="text-xs text-[#485885]">{r.code}</span>
                  ))}
                </div>
              )}
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]'
                    : 'bg-[rgba(239,51,64,0.08)] text-[#ef3340]'
                }`}
              >
                {isActive ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
          </div>
        </div>

        {/* Inactive notice */}
        {!isActive && (
          <div className="flex items-start gap-2 bg-[rgba(239,51,64,0.06)] rounded-lg px-3 py-2.5 mb-4">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef3340" strokeWidth="2" className="flex-shrink-0 mt-px">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-[11px] text-[#ef3340] leading-snug">
              Akun ini tidak aktif. Pengguna tidak dapat login.
            </span>
          </div>
        )}

        {/* Akun */}
        <PanelSection>
          <PanelLabel>Akun</PanelLabel>
          <PanelRow label="Nama Pengguna" value={<span className="font-mono">{data.username}</span>} />
          <PanelRow label="Email" value={<span className="font-mono">{data.email}</span>} />
          <PanelRow label="Bergabung" value={formatTimestamp(data.createdAt)} />
          <PanelRow
            label="Login Terakhir"
            value={
              data.lastLoginAt
                ? formatTimestamp(data.lastLoginAt)
                : <span className="text-[#a9b1c6]">Belum pernah login</span>
            }
          />
          {(data.activeSessions ?? 0) > 0 && (
            <PanelRow
              label="Sesi Aktif"
              value={
                <span className="text-[12px] font-medium text-[#1f2b59]">
                  {data.activeSessions} sesi
                </span>
              }
            />
          )}
        </PanelSection>

        {/* Akses Gudang */}
        <PanelSection>
          <PanelLabel>Akses Gudang</PanelLabel>
          {isLoading ? (
            <div className="flex gap-1.5 flex-wrap">
              {[1, 2].map((i) => (
                <div key={i} className="h-6 w-24 bg-[#f1f3f8] rounded-md animate-pulse" />
              ))}
            </div>
          ) : warehouses.length > 0 ? (
            <div className="flex gap-1.5 flex-wrap">
              {warehouses.map((w) => (
                <span
                  key={w.id}
                  className="text-[11px] font-mono bg-[rgba(0,24,113,0.07)] text-[#001871] px-2.5 py-1 rounded-md"
                >
                  {w.warehouseName || w.warehouseId}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[12px] text-[#a9b1c6]">Belum ada akses gudang</span>
          )}
        </PanelSection>

        <PanelFooter>
          {onEdit && <button
            onClick={onEdit}
            className="flex-1 bg-[#001871] text-white border-none rounded-lg py-2 text-[13px] font-medium cursor-pointer hover:opacity-90 transition-opacity"
          >
            Edit
          </button>}
          {/* {isActive ? (
            <>
              <button
                onClick={onEdit}
                className="flex-1 bg-[#001871] text-white border-none rounded-lg py-2 text-[13px] font-medium cursor-pointer hover:opacity-90 transition-opacity"
              >
                Edit
              </button>
              <button
                onClick={() => setShowDeactivateConfirm(true)}
                className="border border-[rgba(239,51,64,0.3)] bg-white text-[#ef3340] rounded-lg py-2 px-4 text-[13px] cursor-pointer hover:bg-[rgba(239,51,64,0.04)] transition-colors"
              >
                Nonaktifkan
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowReactivateConfirm(true)}
              className="flex-1 bg-[#55bf59] text-white border-none rounded-lg py-2 text-[13px] font-medium cursor-pointer hover:opacity-90 transition-opacity"
            >
              Aktifkan Kembali
            </button>
          )} */}
        </PanelFooter>
      </Panel>

      {/* Deactivate Confirmation */}
      <ConfirmDialog
        open={showDeactivateConfirm}
        title="Nonaktifkan Pengguna"
        description={`Nonaktifkan "${data.username}"? Semua sesi aktif akan langsung dibatalkan dan pengguna tidak dapat login.`}
        confirmLabel="Nonaktifkan"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isActioning}
        onConfirm={handleDeactivate}
        onCancel={() => setShowDeactivateConfirm(false)}
      />

      {/* Reactivate Confirmation */}
      <ConfirmDialog
        open={showReactivateConfirm}
        title="Aktifkan Kembali Pengguna"
        description={`Aktifkan kembali "${data.username}"? Pengguna akan dapat login setelah ini.`}
        confirmLabel="Aktifkan"
        cancelLabel="Batal"
        variant="default"
        isLoading={isActioning}
        onConfirm={handleReactivate}
        onCancel={() => setShowReactivateConfirm(false)}
      />
    </>
  )
}
