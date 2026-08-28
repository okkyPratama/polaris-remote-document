import { useState } from 'react'
import { Building2, Trash2 } from 'lucide-react'
import { ConfirmDialog, Panel, PanelFooter, PanelLabel, PanelRow, PanelSection } from '@polaris/ui'
import type { BusinessParty, ConsigneeAddress, WarehouseOption } from '../../types/businessParty.types'
import { ROLE_BADGE_CLASS, ROLE_LABEL, formatTimestamp, statusBadgeClass, statusLabel } from './utils'

interface Props {
  open: boolean
  data: BusinessParty | null
  isLoading?: boolean
  isAssigningOwnerWarehouse?: boolean
  isRemovingOwnerWarehouse?: boolean
  isAssigningSupplierWarehouse?: boolean
  isRemovingSupplierWarehouse?: boolean
  isAssigningConsigneeWarehouse?: boolean
  isRemovingConsigneeWarehouse?: boolean
  isWarehouseOptionsLoading?: boolean
  warehouseOptions?: WarehouseOption[]
  canUpdate?: boolean
  onClose: () => void
  onEdit?: () => void
  onDelete?: (id: string) => Promise<void>
  onDeactivate?: (id: string) => Promise<void>
  onReactivate?: (id: string) => Promise<void>
  onAddOwnerWarehouse?: (warehouseId: string) => Promise<void>
  onRemoveOwnerWarehouse?: (accessId: string) => Promise<void>
  onAddSupplierWarehouse?: (warehouseId: string) => Promise<void>
  onRemoveSupplierWarehouse?: (accessId: string) => Promise<void>
  onAddConsigneeWarehouse?: (warehouseId: string) => Promise<void>
  onRemoveConsigneeWarehouse?: (accessId: string) => Promise<void>
}

export function BusinessPartyDetailPanel({
  open,
  data,
  isLoading,
  isAssigningOwnerWarehouse,
  isRemovingOwnerWarehouse,
  isAssigningSupplierWarehouse,
  isRemovingSupplierWarehouse,
  isAssigningConsigneeWarehouse,
  isRemovingConsigneeWarehouse,
  isWarehouseOptionsLoading,
  warehouseOptions = [],
  canUpdate,
  onClose,
  onEdit,
  onDelete,
  onDeactivate,
  onReactivate,
  onAddOwnerWarehouse,
  onRemoveOwnerWarehouse,
  onAddSupplierWarehouse,
  onRemoveSupplierWarehouse,
  onAddConsigneeWarehouse,
  onRemoveConsigneeWarehouse,
}: Props) {
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAddWarehouseModal, setShowAddWarehouseModal] = useState(false)
  const [warehouseModalRole, setWarehouseModalRole] = useState<'OWNER' | 'SUPPLIER' | 'CONSIGNEE'>('OWNER')
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')
  const [showRemoveWarehouseConfirm, setShowRemoveWarehouseConfirm] = useState(false)
  const [pendingWarehouseAccess, setPendingWarehouseAccess] = useState<{ id: string; label: string; role: string } | null>(null)
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
    } finally {
      setIsActioning(false)
    }
  }

  // Warehouse access helpers
  const ownerWarehouses = data.ownerWarehouses ?? []
  const supplierWarehouses = data.supplierWarehouses ?? []
  const consigneeWarehouses = data.consigneeWarehouses ?? []

  const getAssignedWarehouseIds = (role: 'OWNER' | 'SUPPLIER' | 'CONSIGNEE') => {
    if (role === 'OWNER') return new Set(ownerWarehouses.map((x) => x.warehouseId))
    if (role === 'SUPPLIER') return new Set(supplierWarehouses.map((x) => x.warehouseId))
    return new Set(consigneeWarehouses.map((x) => x.warehouseId))
  }

  const openAddWarehouseModal = (role: 'OWNER' | 'SUPPLIER' | 'CONSIGNEE') => {
    setWarehouseModalRole(role)
    setSelectedWarehouseId('')
    setShowAddWarehouseModal(true)
  }

  const handleAddWarehouse = async () => {
    if (!selectedWarehouseId) return
    if (warehouseModalRole === 'OWNER' && onAddOwnerWarehouse) {
      await onAddOwnerWarehouse(selectedWarehouseId)
    } else if (warehouseModalRole === 'SUPPLIER' && onAddSupplierWarehouse) {
      await onAddSupplierWarehouse(selectedWarehouseId)
    } else if (warehouseModalRole === 'CONSIGNEE' && onAddConsigneeWarehouse) {
      await onAddConsigneeWarehouse(selectedWarehouseId)
    }
    setShowAddWarehouseModal(false)
    setSelectedWarehouseId('')
  }

  const requestRemoveWarehouse = (accessId: string, label: string, role: string) => {
    setPendingWarehouseAccess({ id: accessId, label, role })
    setShowRemoveWarehouseConfirm(true)
  }

  const confirmRemoveWarehouse = async () => {
    if (!pendingWarehouseAccess) return
    const { id, role } = pendingWarehouseAccess
    if (role === 'OWNER' && onRemoveOwnerWarehouse) await onRemoveOwnerWarehouse(id)
    else if (role === 'SUPPLIER' && onRemoveSupplierWarehouse) await onRemoveSupplierWarehouse(id)
    else if (role === 'CONSIGNEE' && onRemoveConsigneeWarehouse) await onRemoveConsigneeWarehouse(id)
    setShowRemoveWarehouseConfirm(false)
    setPendingWarehouseAccess(null)
  }

  const availableWarehouseOptions = warehouseOptions.filter(
    (item) => !getAssignedWarehouseIds(warehouseModalRole).has(item.id)
  )

  const isAnyWarehouseMutating =
    isAssigningOwnerWarehouse || isRemovingOwnerWarehouse ||
    isAssigningSupplierWarehouse || isRemovingSupplierWarehouse ||
    isAssigningConsigneeWarehouse || isRemovingConsigneeWarehouse

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
            <div className="flex items-start gap-3 pr-7 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[rgba(0,24,113,0.08)] flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-[#001871]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-mono font-bold text-[#485885] tracking-wider mb-0.5">{data.code}</div>
                <div className="text-[15px] font-bold text-[#001871] leading-tight">{data.name}</div>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {data.roles.map((role) => (
                    <span key={role} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE_CLASS[role]}`}>
                      {ROLE_LABEL[role]}
                    </span>
                  ))}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadgeClass(data.status)}`}>
                    {statusLabel(data.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* Identitas */}
            <PanelSection>
              <PanelLabel>Informasi Mitra</PanelLabel>
              <PanelRow label="NPWP" value={<span className="font-mono">{data.npwp || '—'}</span>} />
              <PanelRow label="Tax ID" value={<span className="font-mono">{data.taxId || '—'}</span>} />
              <PanelRow label="Alamat" value={data.address || '—'} />
              <PanelRow label="Kota" value={data.city || '—'} />
              <PanelRow label="PIC" value={data.contactName || '—'} />
              <PanelRow label="Telepon" value={data.contactPhone || '—'} />
              <PanelRow label="Email" value={<span className="font-mono">{data.contactEmail || '—'}</span>} />
            </PanelSection>

            {/* Owner Extension */}
            {data.roles.includes('OWNER') && (
              <PanelSection>
                <PanelLabel>Ekstensi Owner</PanelLabel>
                <PanelRow label="Alias Internal" value={data.ownerAttr?.internalAlias || '—'} />
                <PanelRow label="EDI Code" value={<span className="font-mono">{data.ownerAttr?.ediCode || '—'}</span>} />
                <PanelRow label="Exp. Policy" value={data.ownerAttr?.expiryPolicyLevel || '—'} />
                <PanelRow label="Notif. Exp." value={data.ownerAttr?.expiryWarnDays != null ? `${data.ownerAttr.expiryWarnDays} hari` : '—'} />
                <PanelRow label="Barcode Parser" value={data.ownerAttr?.barcodeParser || '— tidak ada —'} />
                <PanelRow label="Prefix SKU" value={<span className="font-mono">{data.ownerAttr?.skuPrefix || '—'}</span>} />
                {data.ownerAttr?.notes && <PanelRow label="Catatan" value={data.ownerAttr.notes} />}

                {/* Owner Warehouse Access */}
                <div className="mt-3 pt-3 border-t border-[#eef1f6]">
                  <div className="text-[10px] font-semibold text-[#a9b1c6] uppercase tracking-wide mb-2">Akses Gudang</div>
                  <WarehouseAccessTable
                    rows={ownerWarehouses.map((r) => ({ id: r.id, code: r.warehouseCode, name: r.warehouseName, by: r.createdBy }))}
                    secondColumnHeader="Oleh"
                    canUpdate={canUpdate}
                    isRemoving={isRemovingOwnerWarehouse}
                    onRemove={(id, label) => requestRemoveWarehouse(id, label, 'OWNER')}
                    onAdd={() => openAddWarehouseModal('OWNER')}
                    hasAddHandler={!!onAddOwnerWarehouse}
                  />
                </div>
              </PanelSection>
            )}

            {/* Supplier Extension */}
            {data.roles.includes('SUPPLIER') && (
              <PanelSection>
                <PanelLabel>Ekstensi Pemasok</PanelLabel>
                <PanelRow label="Kode Supplier" value={<span className="font-mono">{data.supplierAttr?.supplierCode || '—'}</span>} />
                <PanelRow label="EDI Code" value={<span className="font-mono">{data.supplierAttr?.ediCode || '—'}</span>} />
                <PanelRow label="Lead Time" value={data.supplierAttr?.leadTimeDays != null ? `${data.supplierAttr.leadTimeDays} hari` : '—'} />
                <PanelRow label="Kota Asal" value={[data.supplierAttr?.originCity, data.supplierAttr?.originCountry].filter(Boolean).join(', ') || '—'} />
                {data.supplierAttr?.notes && <PanelRow label="Catatan" value={data.supplierAttr.notes} />}

                {/* Supplier Warehouse Access */}
                <div className="mt-3 pt-3 border-t border-[#eef1f6]">
                  <div className="text-[10px] font-semibold text-[#a9b1c6] uppercase tracking-wide mb-1">
                    Akses Gudang
                    <span className="font-normal normal-case tracking-normal text-[#949eb8] ml-1">(penerimaan diblokir jika tidak di-assign)</span>
                  </div>
                  <WarehouseAccessTable
                    rows={supplierWarehouses.map((r) => ({ id: r.id, code: r.warehouseCode, name: r.warehouseName, by: formatTimestamp(r.createdAt) }))}
                    secondColumnHeader="Ditambahkan"
                    canUpdate={canUpdate}
                    isRemoving={isRemovingSupplierWarehouse}
                    onRemove={(id, label) => requestRemoveWarehouse(id, label, 'SUPPLIER')}
                    onAdd={() => openAddWarehouseModal('SUPPLIER')}
                    hasAddHandler={!!onAddSupplierWarehouse}
                  />
                </div>
              </PanelSection>
            )}

            {/* Consignee Extension */}
            {data.roles.includes('CONSIGNEE') && (
              <PanelSection>
                <PanelLabel>Ekstensi Penerima</PanelLabel>
                <PanelRow label="EDI Code" value={<span className="font-mono">{data.consigneeAttr?.ediCode || '—'}</span>} />
                {data.consigneeAttr?.notes && <PanelRow label="Catatan" value={data.consigneeAttr.notes} />}

                {/* Consignee Warehouse Access */}
                <div className="mt-3 pt-3 border-t border-[#eef1f6]">
                  <div className="text-[10px] font-semibold text-[#a9b1c6] uppercase tracking-wide mb-1">
                    Akses Gudang
                    <span className="font-normal normal-case tracking-normal text-[#949eb8] ml-1">(Surat Jalan diblokir jika tidak di-assign)</span>
                  </div>
                  <WarehouseAccessTable
                    rows={consigneeWarehouses.map((r) => ({ id: r.id, code: r.warehouseCode, name: r.warehouseName, by: formatTimestamp(r.createdAt) }))}
                    secondColumnHeader="Ditambahkan"
                    canUpdate={canUpdate}
                    isRemoving={isRemovingConsigneeWarehouse}
                    onRemove={(id, label) => requestRemoveWarehouse(id, label, 'CONSIGNEE')}
                    onAdd={() => openAddWarehouseModal('CONSIGNEE')}
                    hasAddHandler={!!onAddConsigneeWarehouse}
                  />
                </div>

                {/* Consignee Addresses */}
                <div className="mt-3 pt-3 border-t border-[#eef1f6]">
                  <div className="text-[10px] font-semibold text-[#a9b1c6] uppercase tracking-wide mb-2">Alamat Pengiriman</div>
                  <ConsigneeAddressList addresses={data.consigneeAddresses ?? []} />
                </div>
              </PanelSection>
            )}

            {/* Carrier Extension */}
            {data.roles.includes('COURIER') && (
              <PanelSection>
                <PanelLabel>Ekstensi Ekspedisi</PanelLabel>
                <PanelRow label="Mode Transport" value={data.carrierAttr?.transportMode || '—'} />
                <PanelRow label="EDI Code" value={<span className="font-mono">{data.carrierAttr?.ediCode || '—'}</span>} />
                <PanelRow label="URL Tracking" value={data.carrierAttr?.trackingUrl ? <span className="text-[#4a90d9] break-all">{data.carrierAttr.trackingUrl}</span> : '—'} />
                <PanelRow label="Format AWB" value={<span className="font-mono">{data.carrierAttr?.awbFormat || '—'}</span>} />
                {data.carrierAttr?.notes && <PanelRow label="Catatan" value={data.carrierAttr.notes} />}

                <a
                  href="/business-parties/carrier-service-types"
                  className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 border border-[#ebebeb] rounded-lg text-[12px] font-medium text-[#485885] hover:bg-[#f7f9fc] hover:border-[#cdd5ea] transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>
                  Lihat Tipe Layanan →
                </a>
              </PanelSection>
            )}

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
              {canUpdate && onDelete && (
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
        title="Nonaktifkan Mitra Bisnis"
        description={`Nonaktifkan "${data.name}"? Mitra ini tidak akan muncul di selector transaksi baru. Diblokir jika ada transaksi terbuka.`}
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
        title="Hapus Mitra Bisnis"
        description={`Yakin ingin menghapus "${data.name}"? Data mitra akan dihapus dan tidak dapat dikembalikan.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isActioning}
        onConfirm={async () => {
          if (!onDelete) return
          setIsActioning(true)
          try {
            await onDelete(data.id)
            setShowDeleteConfirm(false)
            onClose()
          } finally {
            setIsActioning(false)
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Remove Warehouse Confirm Dialog */}
      <ConfirmDialog
        open={showRemoveWarehouseConfirm}
        title="Hapus Akses Gudang"
        description={`Hapus akses gudang "${pendingWarehouseAccess?.label || '-'}" dari mitra ini?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isAnyWarehouseMutating}
        onConfirm={confirmRemoveWarehouse}
        onCancel={() => {
          setShowRemoveWarehouseConfirm(false)
          setPendingWarehouseAccess(null)
        }}
      />

      {/* Add Warehouse Modal */}
      {showAddWarehouseModal && (
        <div className="fixed inset-0 z-[60] bg-[rgba(15,23,42,0.32)] flex items-center justify-center p-4">
          <div className="w-full max-w-[480px] bg-white rounded-2xl shadow-[0_16px_40px_rgba(15,23,42,0.2)] border border-[#ebebeb] p-5">
            <div className="text-[16px] font-semibold text-[#001871]">Tambah Akses Gudang</div>
            <p className="text-[12px] text-[#687598] mt-1">Pilih gudang untuk assign ke {data.name}</p>

            <div className="mt-4">
              <label className="block text-[11px] font-medium text-[#485885] mb-1.5">Gudang *</label>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="w-full border border-[#ebebeb] rounded-lg px-3 py-[8px] text-[13px] text-[#1f2b59] bg-white focus:outline-none focus:border-[#001871]"
              >
                {isWarehouseOptionsLoading ? (
                  <option value="">Memuat daftar gudang...</option>
                ) : availableWarehouseOptions.length === 0 ? (
                  <option value="">Tidak ada gudang yang bisa ditambahkan</option>
                ) : (
                  <>
                    <option value="">— Pilih gudang —</option>
                    {availableWarehouseOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} — {item.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddWarehouseModal(false)
                  setSelectedWarehouseId('')
                }}
                className="flex-1 bg-[#f1f3f8] text-[#1f2b59] border-none rounded-lg py-2 text-[13px] font-medium cursor-pointer hover:bg-[#e7ebf5] transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAddWarehouse}
                disabled={!selectedWarehouseId || isAnyWarehouseMutating || isWarehouseOptionsLoading}
                className="flex-1 bg-[#001871] text-white border-none rounded-lg py-2 text-[13px] font-medium cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {isAnyWarehouseMutating ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────

interface WarehouseAccessTableRow {
  id: string
  code: string
  name: string
  by?: string
}

function WarehouseAccessTable({
  rows,
  secondColumnHeader = 'Oleh',
  canUpdate,
  isRemoving,
  onRemove,
  onAdd,
  hasAddHandler,
}: {
  rows: WarehouseAccessTableRow[]
  secondColumnHeader?: string
  canUpdate?: boolean
  isRemoving?: boolean
  onRemove: (id: string, label: string) => void
  onAdd: () => void
  hasAddHandler: boolean
}) {
  return (
    <div>
      {rows.length > 0 ? (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#eef1f6]">
              <th className="text-[9px] font-semibold text-[#a9b1c6] uppercase tracking-wide text-left px-2 py-1.5">Gudang</th>
              <th className="text-[9px] font-semibold text-[#a9b1c6] uppercase tracking-wide text-left px-2 py-1.5">{secondColumnHeader}</th>
              {canUpdate && <th className="w-8"></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[#eef1f6] last:border-b-0">
                <td className="px-2 py-2 align-middle">
                  <div className="text-[11px] font-mono font-semibold text-[#1f2b59]">{row.code}</div>
                  <div className="text-[10px] text-[#949eb8] mt-0.5">{row.name || '-'}</div>
                </td>
                <td className="px-2 py-2 align-middle text-[11px] text-[#949eb8]">{row.by || '-'}</td>
                {canUpdate && (
                  <td className="px-1 py-2 align-middle text-right">
                    <button
                      type="button"
                      onClick={() => onRemove(row.id, row.code)}
                      disabled={isRemoving}
                      className="text-[#ef3340] cursor-pointer rounded-md p-1.5 hover:bg-[rgba(239,51,64,0.08)] transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="text-[11px] text-[#a9b1c6] text-center py-3">Belum ada gudang yang di-assign.</div>
      )}

      {canUpdate && hasAddHandler && (
        <button
          type="button"
          onClick={onAdd}
          className="w-full mt-2 border border-dashed border-[#d8deed] text-[#485885] bg-white rounded-lg py-1.5 text-[11px] font-medium cursor-pointer hover:bg-[#f7f9fc] transition-colors"
        >
          + Tambah Gudang
        </button>
      )}
    </div>
  )
}

function ConsigneeAddressList({ addresses }: { addresses: ConsigneeAddress[] }) {
  if (addresses.length === 0) {
    return <div className="text-[11px] text-[#a9b1c6]">Belum ada alamat pengiriman.</div>
  }

  return (
    <div className="flex flex-col gap-2">
      {addresses.map((addr) => (
        <div key={addr.id} className="border border-[#ebebeb] rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[12px] font-semibold text-[#1f2b59]">{addr.addressLabel}</span>
            {addr.isDefault && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[rgba(85,191,89,0.1)] text-[#55bf59]">
                Default
              </span>
            )}
          </div>
          <div className="text-[11px] text-[#485885] leading-relaxed">
            {[addr.address, addr.city, addr.country].filter(Boolean).join(', ') || '—'}
          </div>
          {(addr.deliveryWindowStart || addr.deliveryWindowEnd) && (
            <div className="text-[10px] text-[#949eb8] mt-1">
              Jam terima: {addr.deliveryWindowStart || '?'} – {addr.deliveryWindowEnd || '?'}
            </div>
          )}
          {addr.handlingInstructions && (
            <div className="text-[10px] text-[#949eb8] mt-0.5 italic">{addr.handlingInstructions}</div>
          )}
        </div>
      ))}
    </div>
  )
}
