import { useState } from 'react'
import type { TemplateSummary, TemplateType, TemplateAssignment } from '../../types/template.types'
import { TEMPLATE_TYPE_META } from '../../types/template.types'
import { useTemplateAssignments } from '../../hooks/useTemplates'
import { useOwnerOptions, useWarehouseOptions, useCompanyOptions } from '../../hooks/useMasterData'
import { AssignTemplateModal } from '../../components/AssignTemplateModal'

function formatDate(iso: string): string {
  if (!iso) return '\u2014'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '\u2014'
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function TypeBadge({ type }: { type?: TemplateType | string }) {
  if (!type || !TEMPLATE_TYPE_META[type as TemplateType]) return null
  const meta = TEMPLATE_TYPE_META[type as TemplateType]
  return <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '9999px', letterSpacing: '0.03em', whiteSpace: 'nowrap', ...meta.badgeStyle }}>{meta.label}</span>
}

/** Resolve an ID to a name from the options list */
function resolveName(id: string | undefined, options: { value: string; label: string }[] | undefined): string {
  if (!id || !options) return id || '\u2014'
  const found = options.find((o) => o.value === id)
  return found ? found.label : id
}

interface Props {
  open: boolean
  data: TemplateSummary | null
  canUpdate?: boolean
  canDelete?: boolean
  onClose: () => void
  onEdit?: () => void
  onPreview?: () => void
  onDelete?: () => void
}

export function TemplateDetailPanel({
  open,
  data,
  canUpdate,
  canDelete,
  onClose,
  onEdit,
  onPreview,
  onDelete,
}: Props) {
  const [showAssignModal, setShowAssignModal] = useState(false)

  // Fetch assignments for the selected template
  const { data: assignments, isLoading: assignmentsLoading, refetch: refetchAssignments } = useTemplateAssignments(data?.id)

  // Master data for resolving IDs → names
  const { data: ownerOptions } = useOwnerOptions()
  const { data: warehouseOptions } = useWarehouseOptions()
  const { data: companyOptions } = useCompanyOptions()

  if (!open || !data) return null

  return (
    <div style={{
      width: '40%',
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      flexShrink: 0,
      boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.03)',
      overflowY: 'auto',
      maxHeight: 'calc(100vh - 140px)',
      position: 'relative',
      animation: 'slideIn 0.2s ease-out',
    }}>
      {/* Close button */}
      <button onClick={onClose} style={{ position: 'absolute', top: '14px', right: '14px', background: 'none', border: 'none', cursor: 'pointer', color: '#a9b1c6', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>&times;</button>

      {/* Code */}
      <div style={{ fontSize: '11px', fontFamily: 'var(--mono, monospace)', color: '#a9b1c6', marginBottom: '4px' }}>{data.templateCode}</div>

      {/* Name */}
      <div style={{ fontSize: '15px', fontWeight: 700, color: '#001871', paddingRight: '28px', marginBottom: '8px' }}>{data.name}</div>

      {/* Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
        <TypeBadge type={data.templateType} />
        <span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 7px', background: '#f1f3f8', color: '#485885', borderRadius: '6px' }}>{data.outputFormat}</span>
        <span style={{ fontSize: '10px', fontFamily: 'var(--mono, monospace)', padding: '2px 7px', background: '#f1f3f8', color: '#485885', borderRadius: '6px' }}>v{data.version}</span>
      </div>

      {/* Info Template section */}
      <div style={{ borderTop: '1px solid #f1f3f8', paddingTop: '14px', marginTop: '14px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#a9b1c6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Info Template</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {([
            ['Tipe', TEMPLATE_TYPE_META[data.templateType]?.label ?? data.templateType],
            ['Format Keluaran', data.outputFormat],
            ['Versi', `${data.version} (saat ini)`],
            ['Default Sistem', data.isSystemDefault ? 'Ya' : 'Tidak'],
            ['Dibuat', formatDate(data.createdAt)],
            ['Terakhir Diubah', formatDate(data.updatedAt)],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '6px', alignItems: 'baseline' }}>
              <span style={{ fontSize: '12px', color: '#949eb8' }}>{label}</span>
              <span style={{ fontSize: '12px', color: '#1f2b59' }}>{value}</span>
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '6px', alignItems: 'baseline' }}>
            <span style={{ fontSize: '12px', color: '#949eb8' }}>Status</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '12px' }}>
              <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', marginRight: '4px', background: data.isActive ? '#55bf59' : '#a9b1c6' }} />
              {data.isActive ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>
        </div>
      </div>

      {/* Page Settings (if applicable) */}
      {data.pageSettingsJson && (
        <div style={{ borderTop: '1px solid #f1f3f8', paddingTop: '14px', marginTop: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#a9b1c6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Pengaturan Halaman</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#949eb8' }}>Ukuran</span>
              <span style={{ fontSize: '12px', color: '#1f2b59' }}>{data.pageSettingsJson.sizeType} ({data.pageSettingsJson.widthMm}&times;{data.pageSettingsJson.heightMm}mm)</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#949eb8' }}>Margin</span>
              <span style={{ fontSize: '12px', color: '#1f2b59' }}>{data.pageSettingsJson.marginMm} mm</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#949eb8' }}>Orientasi</span>
              <span style={{ fontSize: '12px', color: '#1f2b59' }}>{data.pageSettingsJson.orientation}</span>
            </div>
          </div>
        </div>
      )}

      {/* Penugasan section — real data */}
      <div style={{ borderTop: '1px solid #f1f3f8', paddingTop: '14px', marginTop: '14px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#a9b1c6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Penugasan</div>

        {assignmentsLoading ? (
          <div style={{ fontSize: '12px', color: '#949eb8', padding: '8px 0' }}>Memuat penugasan...</div>
        ) : data.isSystemDefault && (!assignments || assignments.length === 0) ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', border: '1px solid #ebebeb', borderRadius: '8px', background: '#fafbfd' }}>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#1f2b59' }}>Default Sistem (fallback)</span>
            </div>
            <div style={{ fontSize: '11px', color: '#949eb8', paddingLeft: '10px' }}>
              Template ini dipakai untuk semua scope yang belum memiliki template {TEMPLATE_TYPE_META[data.templateType]?.label ?? data.templateType} khusus.
            </div>
          </div>
        ) : (!assignments || assignments.length === 0) ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '12px', color: '#949eb8', padding: '8px 0' }}>
              Belum ada penugasan. Template ini belum ditugaskan ke scope tertentu.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {assignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                ownerOptions={ownerOptions}
                warehouseOptions={warehouseOptions}
                companyOptions={companyOptions}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowAssignModal(true)}
          style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 500, background: '#f1f3f8', color: '#1f2b59', border: '1px solid #ebebeb', cursor: 'pointer', marginTop: '10px' }}
        >
          + Tugaskan ke Scope
        </button>

        {/* Assign Template Modal */}
        {showAssignModal && data && (
          <AssignTemplateModal
            templateId={data.id}
            templateType={data.templateType}
            onClose={() => setShowAssignModal(false)}
            onSuccess={() => {
              setShowAssignModal(false)
              refetchAssignments()
            }}
          />
        )}
      </div>

      {/* Action buttons */}
      <div style={{ borderTop: '1px solid #f1f3f8', paddingTop: '14px', marginTop: '14px', display: 'flex', gap: '8px' }}>
        {onPreview && (
          <button type="button" onClick={onPreview} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: '#f1f3f8', color: '#1f2b59', border: '1px solid #ebebeb', cursor: 'pointer' }}>
            Preview
          </button>
        )}
        {canUpdate && onEdit && (
          <button type="button" onClick={onEdit} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: '#001871', color: '#fff', border: 'none', cursor: 'pointer' }}>
            Edit Template
          </button>
        )}
        {canDelete && onDelete && !data.isSystemDefault && (
          <button type="button" onClick={onDelete} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: '#fff', color: '#ef3340', border: '1px solid rgba(239,51,64,0.3)', cursor: 'pointer' }}>
            Hapus
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Assignment Card Component ────────────────────────────────────────────────

interface AssignmentCardProps {
  assignment: TemplateAssignment
  ownerOptions?: { value: string; label: string }[]
  warehouseOptions?: { value: string; label: string }[]
  companyOptions?: { value: string; label: string }[]
}

function AssignmentCard({ assignment, ownerOptions, warehouseOptions, companyOptions }: AssignmentCardProps) {
  const scopeItems: { label: string; value: string; color: string }[] = []

  if (assignment.ownerId) {
    scopeItems.push({
      label: 'Owner',
      value: resolveName(assignment.ownerId, ownerOptions),
      color: '#92640a',
    })
  }
  if (assignment.warehouseId) {
    scopeItems.push({
      label: 'Warehouse',
      value: resolveName(assignment.warehouseId, warehouseOptions),
      color: '#1d4ed8',
    })
  }
  if (assignment.companyId) {
    scopeItems.push({
      label: 'Company',
      value: resolveName(assignment.companyId, companyOptions),
      color: '#065f46',
    })
  }

  return (
    <div style={{ padding: '10px 12px', border: '1px solid #ebebeb', borderRadius: '8px', background: '#fafbfd' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {scopeItems.map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, color: item.color, textTransform: 'uppercase', minWidth: '70px' }}>{item.label}</span>
            <span style={{ fontSize: '12px', color: '#1f2b59', wordBreak: 'break-all' }}>{item.value}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
          <span style={{ fontSize: '10px', fontWeight: 600, color: '#949eb8', textTransform: 'uppercase', minWidth: '70px' }}>Berlaku</span>
          <span style={{ fontSize: '11px', color: '#485885' }}>{formatDate(assignment.effectiveFrom)}</span>
        </div>
      </div>
    </div>
  )
}
