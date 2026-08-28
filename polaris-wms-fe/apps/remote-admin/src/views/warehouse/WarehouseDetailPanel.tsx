import { useState } from 'react'
import { Panel, PanelSection, PanelLabel, PanelRow, PanelFooter, ConfirmDialog } from '@polaris/ui'
import { formatTimestamp } from '@polaris/service'
import type { Warehouse } from '../../types/warehouse.types'

interface Props {
  open: boolean
  data: Warehouse | null
  onClose: () => void
  onEdit?: () => void
  onDelete?: (id: string) => Promise<void>
}

export function WarehouseDetailPanel({ open, data, onClose, onEdit, onDelete }: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const warehouse = data
  if (!warehouse) return null

  const isActive = warehouse.status === 'AKTIF'

  const handleDelete = async () => {
    setDeleting(true)
    try {
      if (onDelete) {
        await onDelete(warehouse.id)
      }
      setShowDeleteConfirm(false)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Panel open={open} onClose={onClose}>
      {/* Header */}
      <div className="flex items-start gap-3 pr-7 mb-4">
        <div className="w-11 h-11 rounded-lg bg-[rgba(0,24,113,0.08)] flex items-center justify-center flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#001871" strokeWidth="1.8">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono font-bold text-[#001871] tracking-wider mb-0.5">{warehouse.code}</div>
          <div className="text-[15px] font-bold text-[#1f2b59] leading-tight">{warehouse.name}</div>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {warehouse.city && <span className="text-xs text-[#485885]">{warehouse.city}</span>}
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              isActive
                ? 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]'
                : 'bg-[rgba(169,177,198,0.15)] text-[#a9b1c6]'
            }`}>
              {warehouse.status}
            </span>
          </div>
        </div>
      </div>

      {/* Perusahaan */}
          {(warehouse.companyName || warehouse.companyCode) && (
            <PanelSection>
              <PanelLabel>Perusahaan</PanelLabel>
              <div className="flex flex-col gap-2">
                {warehouse.companyCode && <PanelRow label="Kode" value={warehouse.companyCode} />}
                {warehouse.companyName && <PanelRow label="Nama" value={warehouse.companyName} />}
              </div>
            </PanelSection>
          )}

          {/* Lokasi */}
          <PanelSection>
            <PanelLabel>Lokasi</PanelLabel>
            <div className="flex flex-col gap-2">
              <PanelRow label="Alamat" value={warehouse.address || '-'} />
              <PanelRow label="Kota" value={warehouse.city || '-'} />
              <PanelRow label="Provinsi" value={warehouse.province || '-'} />
              <PanelRow label="Kode Pos" value={warehouse.postalCode || '-'} />
              <PanelRow label="PIC" value={warehouse.pic || '-'} />
              <PanelRow label="Telepon" value={warehouse.phone || '-'} />
            </div>
          </PanelSection>

          {/* Kapasitas — tampil hanya jika ada data */}
          {/* {(warehouse.capacity > 0 || warehouse.area > 0) && ( */}
            <PanelSection>
              <PanelLabel>Kapasitas</PanelLabel>
              <div className="flex flex-col gap-2">
                {/* {warehouse.capacity > 0 && ( */}
                  <PanelRow label="Kapasitas Palet" value={`${warehouse.capacity.toLocaleString()} palet`} />
                {/* )} */}
                {/* {warehouse.area > 0 && ( */}
                  <PanelRow label="Luas Area" value={`${warehouse.area.toLocaleString()} m²`} />
                {/* )} */}
              </div>
            </PanelSection>
          {/* )} */}

          {/* Zona Suhu — tampil hanya jika ada */}
          {/* {warehouse.tempZones.length > 0 && ( */}
            <PanelSection>
              <PanelLabel>Zona Suhu</PanelLabel>
              <div className="flex gap-1.5 flex-wrap">
                {warehouse.tempZones.map((zone) => (
                  <span key={zone} className={`text-[11px] font-medium px-3 py-1 rounded-full ${
                    zone === 'Chiller' ? 'bg-[rgba(74,144,217,0.1)] text-[#4a90d9]' :
                    zone === 'Freezer' ? 'bg-[rgba(59,130,246,0.15)] text-[#3b82f6]' :
                    'bg-[rgba(72,88,133,0.1)] text-[#485885]'
                  }`}>{zone}</span>
                ))}
              </div>
            </PanelSection>
          {/* )} */}

          {/* Info */}
          <PanelSection>
            <PanelLabel>Info</PanelLabel>
            <div className="flex flex-col gap-2">
              {warehouse.activeSince && <PanelRow label="Aktif sejak" value={formatTimestamp(warehouse.activeSince)} />}
            </div>
          </PanelSection>

      <PanelFooter>
        {onEdit && <button
          onClick={onEdit}
          className="flex-1 bg-[#001871] text-white border-none rounded-lg py-2 text-[13px] font-medium cursor-pointer hover:opacity-90 transition-opacity"
        >
          Edit
        </button>}
        {onDelete && <button
          onClick={() => setShowDeleteConfirm(true)}
          className="border border-[rgba(239,51,64,0.3)] bg-white text-[#ef3340] rounded-lg py-2 px-4 text-[13px] cursor-pointer hover:bg-[rgba(239,51,64,0.04)] transition-colors"
        >
          Hapus
        </button>}
      </PanelFooter>
    </Panel>

    <ConfirmDialog
      open={showDeleteConfirm}
      title="Hapus Gudang"
      description={`Yakin ingin menghapus gudang "${warehouse.name}"? Data gudang akan dihapus dan tidak dapat dikembalikan.`}
      confirmLabel="Hapus"
      cancelLabel="Batal"
      variant="danger"
      isLoading={deleting}
      onConfirm={handleDelete}
      onCancel={() => setShowDeleteConfirm(false)}
    />
  </>
  )
}
