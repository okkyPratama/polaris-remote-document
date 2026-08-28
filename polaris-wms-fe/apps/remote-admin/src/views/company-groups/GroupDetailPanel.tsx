import { useState, useEffect } from 'react'
import { Panel, PanelSection, PanelLabel, PanelRow, PanelFooter, ConfirmDialog } from '@polaris/ui'
import type { CompanyGroup } from '../../types/companyGroup.types'
import { companyGroupApi } from '../../api/companyGroup.api'

interface Props {
  open: boolean
  data: CompanyGroup | null
  onClose: () => void
  onEdit?: () => void
  onDelete?: (id: string) => Promise<void>
  onAddEntity?: () => void
}

export function GroupDetailPanel({ open, data, onClose, onEdit, onDelete, onAddEntity }: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [detail, setDetail] = useState<CompanyGroup | null>(null)

  const dataId = data?.id
  useEffect(() => {
    if (!open || !dataId) { setDetail(null); return }
    companyGroupApi.getById(dataId)
      .then((res) => { if (res) setDetail(res) })
      .catch(() => setDetail(null))
  }, [open, dataId])

  const group = detail ?? data
  if (!group) return null

  const handleDelete = async () => {
    setDeleting(true)
    try {
      if (onDelete) {
        await onDelete(group.id)
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
        <div className="flex items-start gap-3 pr-7 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[rgba(0,24,113,0.08)] flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#001871" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-mono font-bold text-[#485885] tracking-wider mb-0.5">{group.code}</div>
            <div className="text-[15px] font-bold text-[#001871] leading-tight mb-1.5">{group.name}</div>
            <div className="flex gap-1.5 flex-wrap">
              {group.industry && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(0,24,113,0.08)] text-[#001871]">{group.industry}</span>
              )}
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${group.status === 'AKTIF' ? 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]' : 'bg-[rgba(169,177,198,0.18)] text-[#a9b1c6]'}`}>{group.status}</span>
            </div>
          </div>
        </div>

        <PanelSection>
          <PanelLabel>Info Grup</PanelLabel>
          <div className="flex flex-col gap-2.5">
            <PanelRow label="Alamat" value={group.address || '-'} />
            <PanelRow label="Kontak" value={group.contactName || '-'} />
            <PanelRow label="Telepon" value={group.contactPhone || '-'} />
            <PanelRow label="Email" value={group.contactEmail || '-'} />
            <PanelRow label="Terdaftar" value={group.createdAt || '-'} />
            <PanelRow label="Jumlah Entitas" value={group.companyCount} />
          </div>
        </PanelSection>

        <PanelSection>
          <PanelLabel>Entitas ({group.companyCount})</PanelLabel>
          {group.entities && group.entities.length > 0 ? (
            <div className="border border-[#ebebeb] rounded-lg overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#fafbfd]">
                    <th className="px-2.5 py-2 text-left text-[10px] font-bold text-[#a9b1c6] uppercase tracking-wide">Kode</th>
                    <th className="px-2.5 py-2 text-left text-[10px] font-bold text-[#a9b1c6] uppercase tracking-wide">Nama</th>
                    <th className="px-2.5 py-2 text-left text-[10px] font-bold text-[#a9b1c6] uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {group.entities.map((e) => (
                    <tr key={e.code} className="border-t border-[#f1f3f8] hover:bg-[rgba(0,24,113,0.03)] transition-colors">
                      <td className="px-2.5 py-2 font-mono text-[11px] font-semibold text-[#001871]">{e.code}</td>
                      <td className="px-2.5 py-2 text-[12px] font-medium text-[#1f2b59]">{e.name}</td>
                      <td className="px-2.5 py-2">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${e.status === 'AKTIF' ? 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]' : 'bg-[rgba(169,177,198,0.15)] text-[#a9b1c6]'}`}>
                          {e.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border border-dashed border-[#ebebeb] rounded-lg py-5 text-center text-[12px] text-[#a9b1c6]">
              Belum ada entitas terdaftar
            </div>
          )}
        </PanelSection>

        <PanelFooter>
          {onEdit && <button
            onClick={onEdit}
            className="flex-1 bg-[#001871] text-white border-none rounded-lg py-2 text-[13px] font-medium cursor-pointer hover:opacity-90 transition-opacity"
          >
            Edit Grup
          </button>}
          {onAddEntity && <button
            onClick={onAddEntity}
            className="border border-[rgba(0,24,113,0.25)] bg-white text-[#001871] rounded-lg py-2 px-4 text-[13px] cursor-pointer hover:bg-[rgba(0,24,113,0.04)] transition-colors"
          >
            Tambah Entitas
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
        title="Hapus Grup Perusahaan"
        description={`Yakin ingin menghapus group "${group.name}"? Data grup akan dihapus permanen dan tidak dapat dikembalikan.`}
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
