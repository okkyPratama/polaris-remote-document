import { useState } from 'react'
import { Panel, PanelSection, PanelLabel, PanelRow, PanelFooter, ConfirmDialog } from '@polaris/ui'
import type { CarrierServiceType } from '../../types/carrierServiceType.types'

interface Props {
  open: boolean
  data: CarrierServiceType | null
  isLoading?: boolean
  canUpdate?: boolean
  onClose: () => void
  onEdit?: () => void
  onDeactivate?: (id: string) => Promise<void>
}

export function CarrierServiceTypeDetailPanel({ open, data, isLoading, canUpdate, onClose, onEdit, onDeactivate }: Props) {
  const [showDeactConfirm, setShowDeactConfirm] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

  if (!data) return null

  const isActive = data.status === 'ACTIVE'

  const handleDeactivate = async () => {
    if (!onDeactivate) return
    setDeactivating(true)
    try {
      await onDeactivate(data.id)
      setShowDeactConfirm(false)
    } finally {
      setDeactivating(false)
    }
  }

  return (
    <>
      <Panel open={open} onClose={onClose}>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 bg-[#f1f3f8] rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
            ))}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="pr-7 mb-4">
              <h2 className="text-[15px] font-bold text-[#001871] leading-tight mb-1.5">{data.serviceName}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-[#485885]">{data.carrierName}</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[rgba(0,24,113,0.07)] text-[#001871]">
                  {data.carrierCode}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isActive ? 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]' : 'bg-[rgba(169,177,198,0.15)] text-[#a9b1c6]'}`}>
                  {isActive ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
            </div>

            {/* Section: Layanan */}
            <PanelSection>
              <PanelLabel>Layanan</PanelLabel>
              <div className="flex flex-col gap-2">
                <PanelRow label="Kode" value={<span className="font-mono font-medium">{data.serviceCode}</span>} />
                <PanelRow label="Nama" value={data.serviceName} />
                <PanelRow label="Mode Transportasi" value={data.transportMode || '—'} />
              </div>
            </PanelSection>

            {/* Section: Waktu */}
            <PanelSection>
              <PanelLabel>Waktu</PanelLabel>
              <div className="flex flex-col gap-2">
                <PanelRow label="Transit Min" value={data.transitTimeMinDays != null ? `${data.transitTimeMinDays} hari` : '—'} />
                <PanelRow label="Transit Max" value={data.transitTimeMaxDays != null ? `${data.transitTimeMaxDays} hari` : '—'} />
                <PanelRow label="SLA" value={data.slaDays != null ? `${data.slaDays} hari` : '—'} />
              </div>
            </PanelSection>

            {/* Section: Catatan */}
            {data.notes && (
              <PanelSection>
                <PanelLabel>Catatan</PanelLabel>
                <p className="text-[12px] text-[#485885] leading-relaxed">{data.notes}</p>
              </PanelSection>
            )}

            {/* Actions */}
            {canUpdate && onEdit && (
              <PanelFooter>
                <button onClick={onEdit} className="flex-1 bg-[#001871] text-white border-none rounded-lg py-2 text-[13px] font-medium cursor-pointer hover:opacity-90 transition-opacity">
                  Edit
                </button>
              </PanelFooter>
            )}
          </>
        )}
      </Panel>

      <ConfirmDialog
        open={showDeactConfirm}
        title="Nonaktifkan Tipe Layanan"
        description={`Nonaktifkan "${data.serviceName}"? Operator tidak dapat memilih layanan ini pada surat jalan baru.`}
        confirmLabel="Nonaktifkan"
        cancelLabel="Batal"
        variant="danger"
        isLoading={deactivating}
        onConfirm={handleDeactivate}
        onCancel={() => setShowDeactConfirm(false)}
      />
    </>
  )
}
