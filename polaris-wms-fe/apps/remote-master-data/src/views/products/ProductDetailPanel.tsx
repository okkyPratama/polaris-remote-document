import { useState } from 'react'
import { Package } from 'lucide-react'
import { ConfirmDialog, Panel, PanelFooter, PanelLabel, PanelRow, PanelSection } from '@polaris/ui'
import type { Product } from '../../types/product.types'
import { LPN_TRACKING_LEVEL_OPTIONS, ALTERNATE_CODE_TYPE_OPTIONS } from '../../types/product.types'

interface Props {
  open: boolean
  data: Product | null
  isLoading?: boolean
  canUpdate?: boolean
  canDelete?: boolean
  onClose: () => void
  onEdit?: () => void
  onDeactivate?: (id: string) => Promise<void>
  onReactivate?: (id: string) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

function statusBadgeClass(status: string) {
  if (status === 'ACTIVE') return 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]'
  if (status === 'INACTIVE') return 'bg-[rgba(169,177,198,0.18)] text-[#a9b1c6]'
  return 'bg-[rgba(169,177,198,0.18)] text-[#a9b1c6]'
}

function statusLabel(status: string) {
  if (status === 'ACTIVE') return 'Aktif'
  if (status === 'INACTIVE') return 'Nonaktif'
  return 'Diarsipkan'
}

function boolBadge(value: boolean, onLabel = 'ON', offLabel = 'OFF') {
  return value
    ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(85,191,89,0.1)] text-[#55bf59]">{onLabel}</span>
    : <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(169,177,198,0.12)] text-[#a9b1c6]">{offLabel}</span>
}

function lpnLabel(level: string) {
  return LPN_TRACKING_LEVEL_OPTIONS.find((o) => o.value === level)?.label || level
}

function codeTypeLabel(type: string) {
  return ALTERNATE_CODE_TYPE_OPTIONS.find((o) => o.value === type)?.label || type
}

export function ProductDetailPanel({
  open,
  data,
  isLoading,
  canUpdate,
  canDelete,
  onClose,
  onEdit,
  onDeactivate,
  onReactivate,
  onDelete,
}: Props) {
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showReactivateConfirm, setShowReactivateConfirm] = useState(false)
  const [isActioning, setIsActioning] = useState(false)

  if (!data) return null

  const isActive = data.status === 'ACTIVE'

  const handleDeactivate = async () => {
    if (!onDeactivate) return
    setIsActioning(true)
    try {
      await onDeactivate(data.id)
      setShowDeactivateConfirm(false)
    } finally {
      setIsActioning(false)
    }
  }

  const handleReactivate = async () => {
    if (!onReactivate) return
    setIsActioning(true)
    try {
      await onReactivate(data.id)
      setShowReactivateConfirm(false)
    } finally {
      setIsActioning(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setIsActioning(true)
    try {
      await onDelete(data.id)
      setShowDeleteConfirm(false)
      onClose()
    } finally {
      setIsActioning(false)
    }
  }

  return (
    <>
      <Panel open={open} onClose={onClose}>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-4 bg-[#f1f3f8] rounded animate-pulse" style={{ width: `${55 + Math.random() * 35}%` }} />
            ))}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start gap-3 pr-7 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[rgba(0,24,113,0.08)] flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-[#001871]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-mono font-bold text-[#485885] tracking-wider mb-0.5">{data.skuCode}</div>
                <div className="text-[15px] font-bold text-[#001871] leading-tight">{data.name}</div>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(0,24,113,0.07)] text-[#001871]">
                    {data.ownerName}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadgeClass(data.status)}`}>
                    {statusLabel(data.status)}
                  </span>
                  {data.isHazardous && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(239,51,64,0.08)] text-[#ef3340]">
                      Hazmat
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tracking lock banner */}
            {data.hasReceipts && (
              <div className="flex items-start gap-2 bg-[rgba(245,158,11,0.07)] border border-[rgba(245,158,11,0.2)] rounded-lg px-3 py-2.5 mb-3.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" className="flex-shrink-0 mt-px">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="text-[11px] text-[#92400e] leading-snug">
                  <strong className="block font-semibold mb-0.5">Aturan pelacakan terkunci</strong>
                  SKU ini sudah pernah diterima. Tracking rules tidak dapat diubah.
                </span>
              </div>
            )}

            {/* Identitas */}
            <PanelSection>
              <PanelLabel>Identitas</PanelLabel>
              <div className="flex flex-col gap-2">
                <PanelRow label="Deskripsi" value={data.description || '—'} />
                <PanelRow label="Owner" value={data.ownerName || '—'} />
                <PanelRow label="Kategori" value={data.categoryName || '—'} />
                <PanelRow label="GTIN" value={<span className="font-mono">{data.gtin || '—'}</span>} />
                <PanelRow label="Easy Code" value={<span className="font-mono">{data.easyCode || '—'}</span>} />
                <PanelRow label="Kode Supplier" value={<span className="font-mono">{data.supplierSkuCode || '—'}</span>} />
                <PanelRow label="Base UOM" value={<span className="font-mono font-medium">{data.baseUom}</span>} />
                <PanelRow label="Versi" value={String(data.version)} />
              </div>
            </PanelSection>

            {/* Aturan Pelacakan */}
            <PanelSection>
              <PanelLabel>Aturan Pelacakan</PanelLabel>
              <div className="flex flex-col gap-2">
                <PanelRow label="Lot Tracking" value={boolBadge(data.lotTracking)} />
                <PanelRow label="Expiry Tracking" value={boolBadge(data.expiryTracking)} />
                <PanelRow label="LPN Level" value={<span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[rgba(72,88,133,0.1)] text-[#485885]">{lpnLabel(data.lpnTrackingLevel)}</span>} />
                <PanelRow label="Weight Tracking" value={boolBadge(data.weightTracking)} />
              </div>
            </PanelSection>

            {/* Operational Flags */}
            <PanelSection>
              <PanelLabel>Flag Operasional</PanelLabel>
              <div className="flex flex-col gap-2">
                <PanelRow label="Penerimaan" value={boolBadge(data.allowReceiving, 'Diizinkan', 'Diblokir')} />
                <PanelRow label="Pengeluaran" value={boolBadge(data.allowOutbound, 'Diizinkan', 'Diblokir')} />
                <PanelRow label="Hazardous" value={boolBadge(data.isHazardous, 'Ya', 'Tidak')} />
              </div>
            </PanelSection>

            {/* Shelf Life */}
            {(data.shelfLifeInboundMinDays != null || data.shelfLifeOutboundMinDays != null || data.expiryWarningDays != null) && (
              <PanelSection>
                <PanelLabel>Masa Simpan</PanelLabel>
                <div className="flex flex-col gap-2">
                  <PanelRow label="Min. Inbound" value={data.shelfLifeInboundMinDays != null ? `${data.shelfLifeInboundMinDays} hari` : '—'} />
                  <PanelRow label="Min. Outbound" value={data.shelfLifeOutboundMinDays != null ? `${data.shelfLifeOutboundMinDays} hari` : '—'} />
                  <PanelRow label="Peringatan" value={data.expiryWarningDays != null ? `${data.expiryWarningDays} hari` : '—'} />
                  <PanelRow label="Aturan Expiry" value={data.expiryDateRule || '—'} />
                </div>
              </PanelSection>
            )}

            {/* Over-receipt & Weights */}
            <PanelSection>
              <PanelLabel>Konfigurasi Lainnya</PanelLabel>
              <div className="flex flex-col gap-2">
                <PanelRow label="Over-receipt" value={data.overReceiptPct != null ? `${data.overReceiptPct}%` : '— (inherit)'} />
                <PanelRow label="Berat Gross" value={data.declaredGrossWeightKg != null ? `${data.declaredGrossWeightKg} kg` : '—'} />
                <PanelRow label="Berat Nett" value={data.declaredNetWeightKg != null ? `${data.declaredNetWeightKg} kg` : '—'} />
                <PanelRow label="Berat Tare" value={data.declaredTareWeightKg != null ? `${data.declaredTareWeightKg} kg` : '—'} />
                <PanelRow label="UOM Penerimaan" value={<span className="font-mono">{data.defaultReceivingUom || '—'}</span>} />
                <PanelRow label="UOM Pengeluaran" value={<span className="font-mono">{data.defaultIssuingUom || '—'}</span>} />
              </div>
            </PanelSection>

            {/* Alternate Codes */}
            {data.alternateCodes.length > 0 && (
              <PanelSection>
                <PanelLabel>Kode Alternatif</PanelLabel>
                <div className="flex flex-col gap-2">
                  {data.alternateCodes.map((code) => (
                    <div key={code.id} className="flex items-center gap-2">
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#f1f3f8] text-[#485885] flex-shrink-0">
                        {codeTypeLabel(code.codeType)}
                      </span>
                      <span className="text-[12px] font-mono text-[#1f2b59]">{code.codeValue}</span>
                    </div>
                  ))}
                </div>
              </PanelSection>
            )}

            {/* Audit */}
            <PanelSection>
              <PanelLabel>Audit</PanelLabel>
              <div className="flex flex-col gap-2">
                <PanelRow label="Dibuat" value={data.createdAt || '—'} />
                <PanelRow label="Dibuat Oleh" value={data.createdBy || '—'} />
                <PanelRow label="Diperbarui" value={data.updatedAt || '—'} />
                <PanelRow label="Diperbarui Oleh" value={data.updatedBy || '—'} />
              </div>
            </PanelSection>

            {/* Actions */}
            <PanelFooter>
              {canUpdate && onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="flex-1 bg-[#001871] text-white border-none rounded-lg py-2 text-[13px] font-medium cursor-pointer hover:opacity-90 transition-opacity"
                >
                  Edit
                </button>
              )}
              {canUpdate && isActive && onDeactivate && (
                <button
                  type="button"
                  onClick={() => setShowDeactivateConfirm(true)}
                  className="border border-[rgba(239,51,64,0.3)] bg-white text-[#ef3340] rounded-lg py-2 px-4 text-[13px] cursor-pointer hover:bg-[rgba(239,51,64,0.04)] transition-colors"
                >
                  Nonaktifkan
                </button>
              )}
              {canUpdate && !isActive && data.status !== 'ARCHIVED' && onReactivate && (
                <button
                  type="button"
                  onClick={() => setShowReactivateConfirm(true)}
                  className="border border-[rgba(85,191,89,0.4)] bg-white text-[#55bf59] rounded-lg py-2 px-4 text-[13px] font-medium cursor-pointer hover:bg-[rgba(85,191,89,0.04)] transition-colors disabled:opacity-60"
                >
                  Aktifkan
                </button>
              )}
              {canDelete && onDelete && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="border border-[rgba(239,51,64,0.3)] bg-white text-[#ef3340] rounded-lg py-2 px-4 text-[13px] cursor-pointer hover:bg-[rgba(239,51,64,0.04)] transition-colors"
                >
                  Hapus
                </button>
              )}
            </PanelFooter>
          </>
        )}
      </Panel>

      {/* Deactivate Confirm Dialog */}
      <ConfirmDialog
        open={showDeactivateConfirm}
        title="Nonaktifkan Produk"
        description={`Nonaktifkan "${data.name}"? Produk nonaktif tidak bisa menerima receipt baru. Diblokir jika ada inventory aktif.`}
        confirmLabel="Nonaktifkan"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isActioning}
        onConfirm={handleDeactivate}
        onCancel={() => setShowDeactivateConfirm(false)}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Hapus Produk"
        description={`Yakin ingin menghapus produk "${data.name}" (${data.skuCode})? Data produk akan dihapus dan tidak dapat dikembalikan.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isActioning}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Reactivate Confirm Dialog */}
      <ConfirmDialog
        open={showReactivateConfirm}
        title="Aktifkan Produk"
        description={`Aktifkan kembali "${data.name}"? Produk akan kembali dapat menerima receipt dan issue.`}
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
