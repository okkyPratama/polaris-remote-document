import { useEffect, useState } from 'react'
import { Panel, PanelSection, PanelLabel, PanelRow, PanelFooter, ConfirmDialog } from '@polaris/ui'
import type { Company } from '../../types/company.types'
import { companiesApi } from '../../api/companies.api'

interface Props {
  open: boolean
  data: Company | null
  onClose: () => void
  onEdit?: () => void
  onDelete?: (id: string) => Promise<void>
  onAddWarehouse?: () => void
}

export function CompanyDetailPanel({ open, data, onClose, onEdit, onDelete, onAddWarehouse }: Props) {
  const [detail, setDetail] = useState<Company | null>(null)
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!open || !data) { setDetail(null); return }
    setLoading(true)
    companiesApi.getById(data.id)
      .then(setDetail)
      .catch(() => setDetail(data))
      .finally(() => setLoading(false))
  }, [open, data])

  const company = detail ?? data
  if (!company) return null

  const handleDelete = async () => {
    setDeleting(true)
    try {
      if (onDelete) {
        await onDelete(company.id)
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
        {/* Header — icon + kode + nama + badges */}
        <div className="flex items-start gap-3 pr-7 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[rgba(0,24,113,0.08)] flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#001871" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-mono font-bold text-[#485885] tracking-wider mb-0.5">{company.code}</div>
            <div className="text-[15px] font-bold text-[#001871] leading-tight mb-1.5">{company.name}</div>
            <div className="flex gap-1.5 flex-wrap">
              {company.companyGroupCode && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(0,24,113,0.07)] text-[#001871]">
                  {company.companyGroupCode}
                </span>
              )}
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                company.status === 'AKTIF'
                  ? 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]'
                  : 'bg-[rgba(169,177,198,0.18)] text-[#a9b1c6]'
              }`}>
                {company.status}
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3 py-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-4 rounded bg-[#f1f3f8] animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Info Perusahaan */}
            <PanelSection>
              <PanelLabel>Info Perusahaan</PanelLabel>
              <div className="flex flex-col gap-2">
                {/* Group row — badge + nama */}
                <div className="grid grid-cols-[120px_1fr] gap-1.5 items-baseline">
                  <span className="text-[12px] text-[#949eb8]">Group</span>
                  <span className="text-[12px] text-[#1f2b59] flex items-center gap-1.5 flex-wrap">
                    {company.companyGroupCode && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[rgba(0,24,113,0.07)] text-[#001871]">
                        {company.companyGroupCode}
                      </span>
                    )}
                    {company.companyGroupName || '-'}
                  </span>
                </div>               
                <PanelRow label="Alamat" value={company.address || '-'} />
                <PanelRow label="Nama Kontak" value={company.contactName || '-'} />
                <PanelRow label="Telepon" value={company.contactPhone || '-'} /> 
                <PanelRow label="Email" value={company.contactEmail || '-'} />
                <PanelRow label="Terdaftar" value={company.createdAt || '-'} />
              </div>
            </PanelSection>

            {/* Gudang mini table */}
            <PanelSection>
              <PanelLabel>Gudang ({company.warehouseCount})</PanelLabel>
              {company.warehouses && company.warehouses.length > 0 ? (
                <div className="border border-[#ebebeb] rounded-lg overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#fafbfd]">
                        <th className="px-2.5 py-2 text-left text-[10px] font-bold text-[#a9b1c6] uppercase tracking-wide">Kode</th>
                        <th className="px-2.5 py-2 text-left text-[10px] font-bold text-[#a9b1c6] uppercase tracking-wide">Nama Gudang</th>
                        <th className="px-2.5 py-2 text-left text-[10px] font-bold text-[#a9b1c6] uppercase tracking-wide">Kota</th>
                        <th className="px-2.5 py-2 text-left text-[10px] font-bold text-[#a9b1c6] uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {company.warehouses.map((wh) => (
                        <tr key={wh.code} className="border-t border-[#f1f3f8] hover:bg-[rgba(0,24,113,0.03)] transition-colors">
                          <td className="px-2.5 py-2 font-mono text-[11px] font-semibold text-[#001871]">{wh.code}</td>
                          <td className="px-2.5 py-2 text-[12px] font-medium text-[#1f2b59]">{wh.name}</td>
                          <td className="px-2.5 py-2 text-[11px] text-[#a9b1c6]">{wh.city}</td>
                          <td className="px-2.5 py-2">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              wh.status === 'AKTIF'
                                ? 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]'
                                : 'bg-[rgba(169,177,198,0.15)] text-[#a9b1c6]'
                            }`}>
                              {wh.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="border border-dashed border-[#ebebeb] rounded-lg py-5 text-center text-[12px] text-[#a9b1c6]">
                  Belum ada gudang terdaftar
                </div>
              )}
            </PanelSection>
          </>
        )}

        <PanelFooter>
          {onEdit && <button
            onClick={onEdit}
            className="flex-1 bg-[#001871] text-white border-none rounded-lg py-2 text-[13px] font-medium cursor-pointer hover:opacity-90 transition-opacity"
          >
            Edit Perusahaan
          </button>}
          {onAddWarehouse && <button
            onClick={onAddWarehouse}
            className="border border-[rgba(0,24,113,0.25)] bg-white text-[#001871] rounded-lg py-2 px-4 text-[13px] cursor-pointer hover:bg-[rgba(0,24,113,0.04)] transition-colors"
          >
            Tambah Gudang
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
        title="Hapus Perusahaan"
        description={`Yakin ingin menghapus perusahaan "${company.name}"? Data perusahaan akan dihapus permanen dan tidak dapat dikembalikan.`}
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
