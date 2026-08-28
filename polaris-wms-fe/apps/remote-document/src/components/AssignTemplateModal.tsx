import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast, SingleSelect } from '@polaris/ui'
import { templateAssignmentApi } from '../api/template.api'
import { useOwnerOptionsLoader, useWarehouseOptionsLoader, useCompanyOptionsLoader } from '../hooks/useMasterData'

interface AssignTemplateModalProps {
  templateId: string
  templateType: string
  onClose: () => void
  onSuccess: () => void
}

export function AssignTemplateModal({ templateId, templateType, onClose, onSuccess }: AssignTemplateModalProps) {
  const queryClient = useQueryClient()
  const [ownerId, setOwnerId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Master data loaders for SingleSelect
  const { loadOptions: loadOwnerOptions } = useOwnerOptionsLoader()
  const { loadOptions: loadWarehouseOptions } = useWarehouseOptionsLoader()
  const { loadOptions: loadCompanyOptions } = useCompanyOptionsLoader()

  const ownerLoader = useCallback((q: string) => loadOwnerOptions(q), [loadOwnerOptions])
  const warehouseLoader = useCallback((q: string) => loadWarehouseOptions(q), [loadWarehouseOptions])
  const companyLoader = useCallback((q: string) => loadCompanyOptions(q), [loadCompanyOptions])

  const handleSubmit = async () => {
    // Validate: at least one scope must be selected
    if (!ownerId && !warehouseId && !companyId) {
      setError('Minimal satu scope (Owner, Gudang, atau Company) harus dipilih.')
      return
    }

    setError(null)
    setSaving(true)

    try {
      await templateAssignmentApi.assign({
        templateId,
        templateType,
        ownerId: ownerId || null,
        warehouseId: warehouseId || null,
        companyId: companyId || null,
        effectiveFrom: new Date().toISOString().split('T')[0],
      })

      toast.success('Berhasil', 'Penugasan template berhasil disimpan.')
      // Invalidate all assignment queries so both the detail panel and the table refresh
      queryClient.invalidateQueries({ queryKey: ['template-assignments'] })
      onSuccess()
    } catch (err: unknown) {
      let msg = 'Gagal menyimpan penugasan'
      if (err && typeof err === 'object' && 'errorMessage' in err) {
        const a = err as { errorMessage?: string[] }
        if (a.errorMessage?.[0]) msg = a.errorMessage[0]
      }
      toast.error('Error', msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '480px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,.15)' }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '14px', right: '14px', background: 'none', border: 'none', cursor: 'pointer', color: '#a9b1c6', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}
        >
          &times;
        </button>

        {/* Header */}
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#001871', marginBottom: '4px' }}>Penugasan Template</div>
        <div style={{ fontSize: '11px', color: '#485885', marginBottom: '20px' }}>
          Tentukan scope penugasan untuk template ini. Minimal satu scope harus dipilih.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Owner */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 500, color: '#485885' }}>Tugaskan ke Owner</label>
            <SingleSelect
              placeholder="— Pilih Owner —"
              value={ownerId}
              onChange={(val) => { setOwnerId(val); setError(null) }}
              loadOptions={ownerLoader}
              emptyMessage="Tidak ada owner ditemukan"
              debounce={300}
            />
          </div>

          {/* Warehouse */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 500, color: '#485885' }}>Tugaskan ke Gudang</label>
            <SingleSelect
              placeholder="— Pilih Gudang —"
              value={warehouseId}
              onChange={(val) => { setWarehouseId(val); setError(null) }}
              loadOptions={warehouseLoader}
              emptyMessage="Tidak ada gudang ditemukan"
              debounce={300}
            />
          </div>

          {/* Company */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 500, color: '#485885' }}>Tugaskan ke Company</label>
            <SingleSelect
              placeholder="— Pilih Company —"
              value={companyId}
              onChange={(val) => { setCompanyId(val); setError(null) }}
              loadOptions={companyLoader}
              emptyMessage="Tidak ada company ditemukan"
              debounce={300}
            />
          </div>

          {/* Validation error */}
          {error && (
            <div style={{ fontSize: '11px', color: '#ef3340', padding: '6px 10px', background: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}

          {/* Footer buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', paddingTop: '14px', borderTop: '1px solid #f1f3f8' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: '#f1f3f8', color: '#1f2b59', border: '1px solid #ebebeb', cursor: 'pointer' }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: '#001871', color: '#fff', border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Menyimpan...' : 'Simpan Penugasan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
