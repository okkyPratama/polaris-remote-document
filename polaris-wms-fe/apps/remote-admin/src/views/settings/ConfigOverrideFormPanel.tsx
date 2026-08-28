import { useState, useEffect, useRef } from 'react'
import { Panel, PanelFooter, toast } from '@polaris/ui'
import type { ConfigHeader, ConfigDetail } from '../../types/config.types'
import { useAddConfigDetail, useUpdateConfigDetail } from '../../hooks/useConfigs'
import { useWarehouses } from '../../hooks/useWarehouses'
import { useCompanies } from '../../hooks/useCompanies'
import { codesApi } from '../../api/codes.api'

interface Props {
  open: boolean
  config: ConfigHeader | null
  editDetail?: ConfigDetail | null
  onClose: () => void
  onBack: () => void
}

/** Parse scope string like "COMPANY,WAREHOUSE" to determine which fields to show */
function parseScopeFlags(scope?: string): string[] {
  if (!scope) return []
  return scope.split(',').map((s) => s.trim()).filter(Boolean)
}

export function ConfigOverrideFormPanel({ open, config, editDetail, onClose, onBack }: Props) {
  const [companyId, setCompanyId] = useState('*')
  const [warehouseId, setWarehouseId] = useState('*')
  const [ownerId, setOwnerId] = useState('*')
  const [productId, setProductId] = useState('*')
  const [configValue, setConfigValue] = useState('')

  const addMutation = useAddConfigDetail()
  const updateMutation = useUpdateConfigDetail()
  const { data: warehouseData } = useWarehouses({ page: 1, pageSize: 100 })
  const warehouses = warehouseData?.data ?? []
  const { data: companyData } = useCompanies({ page: 1, pageSize: 100 })
  const companies = companyData?.data ?? []

  const isEdit = !!editDetail
  const isSaving = addMutation.isPending || updateMutation.isPending
  const scopeFlags = config ? parseScopeFlags(config.scope) : []

  // Dynamic value field based on header's typeCode
  type ValueFieldState = 'idle' | 'loading' | 'has-options' | 'empty-options'
  const [valueFieldState, setValueFieldState] = useState<ValueFieldState>('idle')
  const [valueOptions, setValueOptions] = useState<{ value: string; label: string }[]>([])
  const prevTypeCodeRef = useRef<string | undefined>(undefined)

  // Lookup value options based on config.typeCode when panel opens or config changes
  useEffect(() => {
    if (!open) return

    const typeCode = config?.typeCode
    // Skip if same typeCode already loaded
    if (typeCode === prevTypeCodeRef.current) return
    prevTypeCodeRef.current = typeCode

    if (!typeCode) {
      setValueFieldState('idle')
      setValueOptions([])
      return
    }

    setValueFieldState('loading')
    codesApi.lookup(typeCode, '*', '*').then((details) => {
      if (details.length > 0) {
        setValueOptions(details.map((d) => ({ value: d.codeId || d.codeName, label: d.codeName })))
        setValueFieldState('has-options')
      } else {
        setValueOptions([])
        setValueFieldState('empty-options')
      }
    }).catch(() => {
      setValueFieldState('idle')
      setValueOptions([])
    })
  }, [open, config?.typeCode])

  useEffect(() => {
    if (editDetail) {
      setConfigValue(editDetail.configValue || '')
      setCompanyId(editDetail.companyId || '')
      setWarehouseId(editDetail.warehouseId || '')
      setOwnerId(editDetail.ownerId || '*')
      setProductId(editDetail.productId || '*')
    } else {
      setConfigValue('')
      setCompanyId('*')
      setWarehouseId('*')
      setOwnerId('*')
      setProductId('*')
    }
  }, [editDetail, open])

  if (!config) return null

  const handleSubmit = async () => {
    if (!configValue.trim()) {
      toast.error('Error', 'Nilai override wajib diisi')
      return
    }

    try {
      if (isEdit && editDetail) {
        await updateMutation.mutateAsync({
          id: editDetail.id,
          productId: productId || null,
          ownerId: ownerId || null,
          warehouseId: warehouseId || null,
          companyId: companyId || null,
          configValue: configValue.trim(),
          status: 'ACTIVE',
        })
        toast.success('Berhasil', 'Override berhasil diperbarui')
      } else {
        await addMutation.mutateAsync({
          configId: config.id,
          configValue: configValue.trim(),
          productId: productId || null,
          ownerId: ownerId || null,
          warehouseId: warehouseId || null,
          companyId: companyId || null,
          status: 'ACTIVE',
        })
        toast.success('Berhasil', 'Override berhasil ditambahkan')
      }
      onBack()
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Error', error.errorMessage?.[0] || error.message || 'Gagal menyimpan override')
    }
  }

  return (
    <Panel open={open} onClose={onClose}>
      {/* Back link */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[11px] text-[#485885] hover:text-[#001871] cursor-pointer bg-transparent border-none mb-3 p-0 transition-colors"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Kembali ke detail
      </button>

      {/* Title */}
      <h2 className="text-[14px] font-semibold text-[#001871] mb-1">
        {isEdit ? 'Edit Override' : 'Tambah Override'}
      </h2>
      <p className="text-[11px] text-[#485885] mb-4">
        {config.configKey} · System Default: <span className="font-mono">{config.configValue}</span>
      </p>

      {/* Form — show fields based on header scope */}
      <div className="flex flex-col gap-3.5">
        {/* Company selector — shown if scope includes COMPANY */}
        {scopeFlags.includes('COMPANY') && (
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-[#485885]">
              Perusahaan
            </label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              disabled={isEdit}
              className="w-full border border-[#ebebeb] rounded-lg px-3 py-[7px] pr-8 text-[13px] text-[#1f2b59] bg-white appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%2712%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23485885%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center] cursor-pointer focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] disabled:opacity-60 disabled:cursor-default"
            >
              <option value="*">Semua Perusahaan</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Warehouse selector — shown if scope includes WAREHOUSE */}
        {scopeFlags.includes('WAREHOUSE') && (
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-[#485885]">
              Gudang
            </label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              disabled={isEdit}
              className="w-full border border-[#ebebeb] rounded-lg px-3 py-[7px] pr-8 text-[13px] text-[#1f2b59] bg-white appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%2712%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23485885%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center] cursor-pointer focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] disabled:opacity-60 disabled:cursor-default"
            >
              <option value="*">Semua Gudang</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.code} — {wh.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Owner selector — shown if scope includes OWNER */}
        {scopeFlags.includes('OWNER') && (
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-[#485885]">
              Owner
            </label>
            <select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              disabled={isEdit}
              className="w-full border border-[#ebebeb] rounded-lg px-3 py-[7px] pr-8 text-[13px] text-[#1f2b59] bg-white appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%2712%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23485885%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center] cursor-pointer focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] disabled:opacity-60 disabled:cursor-default"
            >
              <option value="*">Semua Owner</option>
            </select>
          </div>
        )}

        {/* Product/SKU selector — shown if scope includes PRODUCT */}
        {scopeFlags.includes('PRODUCT') && (
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-[#485885]">
              Product/SKU
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              disabled={isEdit}
              className="w-full border border-[#ebebeb] rounded-lg px-3 py-[7px] pr-8 text-[13px] text-[#1f2b59] bg-white appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%2712%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23485885%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center] cursor-pointer focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] disabled:opacity-60 disabled:cursor-default"
            >
              <option value="*">Semua Product</option>
            </select>
          </div>
        )}

        {/* Config value — dynamic based on typeCode */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[#485885]">
            Nilai Override <span className="text-[#ef3340]">*</span>
          </label>
          {valueFieldState === 'loading' ? (
            <div className="w-full border border-[#ebebeb] rounded-lg py-[7px] px-3 text-[13px] text-[#949eb8] bg-[#fafbfd]">
              Memuat pilihan nilai...
            </div>
          ) : valueFieldState === 'has-options' ? (
            <select
              value={configValue}
              onChange={(e) => setConfigValue(e.target.value)}
              className="w-full border border-[#ebebeb] rounded-lg px-3 py-[7px] pr-8 text-[13px] text-[#1f2b59] bg-white appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%2712%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23485885%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center] cursor-pointer focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)]"
            >
              <option value="">Pilih nilai...</option>
              {valueOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : valueFieldState === 'empty-options' ? (
            <>
              <select
                value={configValue}
                onChange={(e) => setConfigValue(e.target.value)}
                className="w-full border border-[#ebebeb] rounded-lg px-3 py-[7px] pr-8 text-[13px] text-[#1f2b59] bg-white appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%2712%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23485885%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center] cursor-pointer focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)]"
              >
                <option value="">Tidak ada list nilai untuk tipe kode ini</option>
              </select>
              <span className="text-[10px] text-[#949eb8]">
                Tipe kode &ldquo;{config.typeCode}&rdquo; tidak memiliki daftar nilai.
              </span>
            </>
          ) : (
            <input
              type={config.dataType === 'INT' || config.dataType === 'DECIMAL' ? 'number' : 'text'}
              value={configValue}
              onChange={(e) => setConfigValue(e.target.value)}
              placeholder={`Masukkan nilai...`}
              className="w-full border border-[#ebebeb] rounded-lg py-[7px] px-3 text-[13px] text-[#1f2b59] bg-white placeholder:text-[#949eb8] focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] transition-[border-color,box-shadow]"
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <PanelFooter>
        <button
          onClick={onBack}
          className="flex-1 bg-[#f1f3f8] text-[#1f2b59] border-none rounded-lg py-2 text-[13px] font-medium cursor-pointer hover:bg-[#d9dde6] transition-colors"
        >
          Batal
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="flex-[2] bg-[#001871] text-white border-none rounded-lg py-2 text-[13px] font-medium cursor-pointer hover:bg-[#00206d] transition-colors disabled:opacity-60"
        >
          {isSaving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan Override'}
        </button>
      </PanelFooter>
    </Panel>
  )
}
