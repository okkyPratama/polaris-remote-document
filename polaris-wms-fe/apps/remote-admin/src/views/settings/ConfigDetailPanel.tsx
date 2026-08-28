import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Panel, PanelSection, PanelLabel, PanelRow, PanelFooter, ConfirmDialog, toast } from '@polaris/ui'
import { formatTimestamp } from '@polaris/service'
import type { ConfigHeader, ConfigDetail } from '../../types/config.types'
import { useDeleteConfigDetail } from '../../hooks/useConfigs'

interface Props {
  open: boolean
  data: ConfigHeader | null
  onClose: () => void
  onEdit?: () => void
  onDelete?: (id: string) => void
  onAddOverride?: () => void
  onEditOverride?: (detail: ConfigDetail) => void
  canDeleteDetail?: boolean
}



function resolveSource(detail: ConfigDetail): string {
  const parts: string[] = []
  if (detail.productName) parts.push('Product')
  if (detail.ownerName) parts.push('Owner')
  if (detail.warehouseName) parts.push('Warehouse')
  if (detail.companyName) parts.push('Company')
  return parts.join(' + ') || 'Global'
}

function resolveTarget(detail: ConfigDetail): string {
  return detail.ownerName || detail.warehouseName || detail.productName || detail.companyName || '—'
}

/** Parse scope string like "PRODUCT,OWNER" into array */
function parseScopeFlags(scope?: string): string[] {
  if (!scope) return []
  return scope.split(',').map((s) => s.trim()).filter(Boolean)
}

/** Valid override scope keys — "SYSTEM" is NOT an overridable scope */
const OVERRIDABLE_SCOPES = ['COMPANY', 'WAREHOUSE', 'OWNER', 'PRODUCT']

/** Check if config has any overridable scope (not just SYSTEM) */
function hasOverridableScope(scope?: string): boolean {
  const flags = parseScopeFlags(scope)
  return flags.some((f) => OVERRIDABLE_SCOPES.includes(f))
}

const SCOPE_LABELS: Record<string, string> = {
  COMPANY: 'Entity/Company',
  WAREHOUSE: 'Warehouse',
  OWNER: 'Owner',
  PRODUCT: 'Product/SKU',
}

export function ConfigDetailPanel({ open, data, onClose, onEdit, onDelete, onAddOverride, onEditOverride, canDeleteDetail = false }: Props) {
  const [deleteTarget, setDeleteTarget] = useState<ConfigDetail | null>(null)
  const [showDeleteHeader, setShowDeleteHeader] = useState(false)
  const [isDeletingHeader, setIsDeletingHeader] = useState(false)
  const deleteMutation = useDeleteConfigDetail()

  if (!data) return null

  const details = data.details || []
  const scopeFlags = parseScopeFlags(data.scope)

  const handleDeleteDetail = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success('Berhasil', 'Override berhasil dihapus')
      setDeleteTarget(null)
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Error', error.errorMessage?.[0] || error.message || 'Gagal menghapus override')
    }
  }

  return (
    <>
      <Panel open={open} onClose={onClose}>
        {/* Header */}
        <div className="pr-7 mb-4">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono text-[#a9b1c6] tracking-wide mb-1">{data.configKey}</div>
            <h2 className="text-[15px] font-bold text-[#001871] leading-tight mb-2">
              {data.description || data.configKey}
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {data.category && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(0,24,113,0.07)] text-[#001871]">
                {data.category}
              </span>
            )}
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#f1f3f8] text-[#485885]">
              {data.dataType}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${data.status === 'ACTIVE' ? 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]' : 'bg-[rgba(169,177,198,0.18)] text-[#a9b1c6]'}`}>
              {data.status}
            </span>
          </div>
        </div>

        {/* Nilai */}
        <PanelSection>
          <PanelLabel>Nilai</PanelLabel>
          <div className="flex flex-col gap-2">
            <PanelRow label="System Default" value={
              <span className="font-mono font-medium">{data.configValue || '—'}</span>
            } />
            <PanelRow label="Override Count" value={
              <span className={data.detailCount > 0 ? 'font-medium text-[#001871]' : 'text-[#a9b1c6]'}>
                {data.detailCount > 0 ? `${data.detailCount} override` : 'Tidak ada override'}
              </span>
            } />
          </div>
        </PanelSection>

        {/* Scope */}
        {scopeFlags.length > 0 && (
          <PanelSection>
            <PanelLabel>Scope Override</PanelLabel>
            <div className="grid grid-cols-2 gap-1.5">
              {['COMPANY', 'WAREHOUSE', 'OWNER', 'PRODUCT'].map((key) => {
                const isOn = scopeFlags.includes(key)
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] ${
                      isOn
                        ? 'border-[rgba(0,24,113,0.15)] bg-[rgba(0,24,113,0.04)] text-[#001871] font-medium'
                        : 'border-[#ebebeb] bg-white text-[#a9b1c6]'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center ${
                      isOn ? 'bg-[#001871] text-white' : 'bg-[#f1f3f8] text-[#a9b1c6]'
                    }`}>
                      {key === 'COMPANY' ? 'E' : key === 'PRODUCT' ? 'S' : key.charAt(0)}
                    </span>
                    {SCOPE_LABELS[key] || key}
                  </div>
                )
              })}
            </div>
          </PanelSection>
        )}

        {/* Overrides */}
        <PanelSection>
          <PanelLabel>Overrides</PanelLabel>
          {details.length === 0 ? (
            <p className="text-[12px] text-[#a9b1c6]">Tidak ada override aktif</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {details.map((d) => (
                <div
                  key={d.id}
                  className={`flex items-center gap-2 px-2.5 py-2 border border-[#ebebeb] rounded-lg bg-[#fafbfd] transition-colors group ${
                    hasOverridableScope(data.scope) && onEditOverride
                      ? 'hover:border-[#001871]/20 cursor-pointer'
                      : 'cursor-default opacity-70'
                  }`}
                  onClick={() => hasOverridableScope(data.scope) && onEditOverride?.(d)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-[#1f2b59] truncate">
                      {resolveTarget(d)}
                    </div>
                    <div className="text-[11px] text-[#949eb8] mt-0.5">
                      <span className="font-mono">{d.configValue}</span>
                      <span className="mx-1.5">·</span>
                      <span>{resolveSource(d)}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(d) }}
                    className={`${canDeleteDetail && hasOverridableScope(data.scope) ? '' : 'hidden'} w-6 h-6 flex items-center justify-center rounded text-[#ef3340] hover:bg-[rgba(239,51,64,0.06)] transition-all cursor-pointer border-none bg-transparent`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </PanelSection>

        {/* Info */}
        <PanelSection>
          <PanelLabel>Informasi</PanelLabel>
          <div className="flex flex-col gap-2">
            <PanelRow label="Dibuat oleh" value={data.createdBy || '—'} />
            <PanelRow label="Dibuat" value={formatTimestamp(data.createdAt)} />
            <PanelRow label="Diubah oleh" value={data.updatedBy || '—'} />
            <PanelRow label="Diubah" value={formatTimestamp(data.updatedAt)} />
          </div>
        </PanelSection>

        {/* Actions */}
        {(onEdit || ((onAddOverride || onDelete) && hasOverridableScope(data.scope))) ? (
          <PanelFooter>
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex-[3] bg-[#001871] text-white border-none rounded-lg py-2 text-[13px] font-medium cursor-pointer hover:opacity-90 transition-opacity"
              >
                Edit Config
              </button>
            )}
            {onAddOverride && hasOverridableScope(data.scope) && (
              <button
                onClick={onAddOverride}
                className="flex-[2] bg-white text-[#001871] border border-[#001871] rounded-lg py-2 text-[13px] font-medium cursor-pointer hover:bg-[rgba(0,24,113,0.04)] transition-colors"
              >
                Tambah Override
              </button>
            )}
            {onDelete && hasOverridableScope(data.scope) && (
              <button
                onClick={() => setShowDeleteHeader(true)}
                className="flex-1 bg-white text-[#ef3340] border border-[#ef3340] rounded-lg py-2 text-[13px] font-medium cursor-pointer hover:bg-[rgba(239,51,64,0.06)] transition-colors"
              >
                Hapus
              </button>
            )}
          </PanelFooter>
        ) : null}

        {/* Lock notice for invariant params or SYSTEM-only scope */}
        {!hasOverridableScope(data.scope) && (
          <div className="flex items-start gap-2 bg-[rgba(169,177,198,0.1)] border border-[#ebebeb] rounded-lg px-3 py-2.5 mt-3">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#485885" strokeWidth="2" className="flex-shrink-0 mt-px"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            <span className="text-[11px] text-[#485885] leading-snug">Parameter ini hanya berlaku pada level System — tidak dapat di-override pada level manapun.</span>
          </div>
        )}
      </Panel>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Override"
        description={`Yakin ingin menghapus override untuk "${deleteTarget ? resolveTarget(deleteTarget) : ''}"?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={handleDeleteDetail}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={showDeleteHeader}
        title="Hapus Config"
        description={`Yakin ingin menghapus config "${data?.configKey}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isDeletingHeader}
        onConfirm={async () => {
          if (!data || !onDelete) return
          setIsDeletingHeader(true)
          try {
            await onDelete(data.id)
            setShowDeleteHeader(false)
          } finally {
            setIsDeletingHeader(false)
          }
        }}
        onCancel={() => setShowDeleteHeader(false)}
      />
    </>
  )
}
