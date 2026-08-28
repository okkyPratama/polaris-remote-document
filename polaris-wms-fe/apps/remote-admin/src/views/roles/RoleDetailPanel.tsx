import { useState, useMemo } from 'react'
import { Panel, PanelSection, PanelLabel, PanelFooter, ConfirmDialog } from '@polaris/ui'
import type { Role, PermissionItem } from '../../types/role.types'

interface Props {
  open: boolean
  data: Role | null
  onClose: () => void
  onEdit?: () => void
  onDelete?: (id: string) => Promise<void>
}

export function RoleDetailPanel({ open, data, onClose, onEdit, onDelete }: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const permissionsByModule = useMemo(() => {
    const map = new Map<string, PermissionItem[]>()
    for (const p of data?.permissions || []) {
      const key = p.module || p.resource || 'other'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    return Array.from(map.entries()).map(([module, permissions]) => ({
      module,
      label: module.charAt(0).toUpperCase() + module.slice(1),
      permissions,
    }))
  }, [data?.permissions])

  if (!data) return null

  const handleDelete = async () => {
    setDeleting(true)
    try {
      if (onDelete) {
        await onDelete(data.id)
      }
      setShowDeleteConfirm(false)
      onClose()
    } catch {
      throw new Error('Failed to delete role')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Panel open={open} onClose={onClose}>
        {/* Header */}
        <div className="pr-7 mb-4">
          <h2 className="text-[10px] font-bold text-[#001871] leading-tight mb-1.5">{data.code}</h2>
          <h2 className="text-[15px] font-bold text-[#001871] leading-tight mb-1.5">{data.name}</h2>
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${data.type === 'SYSTEM' ? 'bg-[rgba(0,24,113,0.08)] text-[#001871]' : 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]'}`}>
              {data.type === 'SYSTEM' ? 'Sistem' : 'Kustom'}
            </span>
          </div>
        </div>

        {/* System lock notice */}
        {data.type === 'SYSTEM' && (
          <div className="flex items-start gap-2 bg-[rgba(0,24,113,0.06)] rounded-lg px-3 py-2.5 mb-4">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#485885" strokeWidth="2" className="flex-shrink-0 mt-px"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            <span className="text-[11px] text-[#485885] leading-snug">Peran sistem tidak dapat diedit. Izin ditentukan oleh sistem.</span>
          </div>
        )}

        {/* Deskripsi */}
        <PanelSection>
          <PanelLabel>Deskripsi</PanelLabel>
          <p className="text-[13px] text-[#485885] leading-relaxed">{data.description}</p>
        </PanelSection>

        {/* Pengguna */}
        <PanelSection>
          <PanelLabel>Pengguna</PanelLabel>
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#1f2b59]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            {data.userCount} pengguna
          </div>
        </PanelSection>

        {/* Izin per Domain */}
        <PanelSection>
          <PanelLabel>Izin per Domain</PanelLabel>
          <div className="flex flex-col gap-3.5">
            {permissionsByModule.length === 0 ? (
              <p className="text-[12px] text-[#a9b1c6]">Tidak ada izin yang ditetapkan.</p>
            ) : (
              permissionsByModule.map((group) => (
                <div key={group.module}>
                  <div className="text-[11px] font-semibold text-[#485885] pb-1.5 border-b border-[#f1f3f8] mb-1.5">{group.label}</div>
                  <div className="flex flex-col gap-1">
                    {group.permissions.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 text-[11px] text-[#485885] py-0.5">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#55bf59" strokeWidth="3" className="flex-shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
                        {p.description || p.key}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </PanelSection>

        {/* Actions */}
        {data.type === 'CUSTOM' && (onEdit || onDelete) && (
          <PanelFooter>
            {onEdit && <button onClick={onEdit} className="flex-1 bg-[#001871] text-white border-none rounded-lg py-2 text-[13px] font-medium cursor-pointer hover:opacity-90 transition-opacity">Edit Peran</button>}
            {onDelete && <button onClick={() => setShowDeleteConfirm(true)} className="border border-[rgba(239,51,64,0.3)] bg-white text-[#ef3340] rounded-lg py-2 px-4 text-[13px] cursor-pointer hover:bg-[rgba(239,51,64,0.04)] transition-colors">Hapus</button>}
          </PanelFooter>
        )}
      </Panel>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Hapus Peran"
        description={`Yakin ingin menghapus peran "${data.name}"? Pengguna yang memiliki peran ini akan kehilangan izin terkait.`}
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
