import { useEffect, useRef, useState } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { Panel, PanelBody, PanelFooter, Input, Select, ConfirmDialog, toast } from '@polaris/ui'
import type { ProductFormData, OwnerOption, CategoryOption } from '../../types/product.types'
import {
  productFormSchema,
  defaultProductFormValues,
  LPN_TRACKING_LEVEL_OPTIONS,
  EXPIRY_DATE_RULE_OPTIONS,
  ALTERNATE_CODE_TYPE_OPTIONS,
} from '../../types/product.types'

type FormTab = 'identitas' | 'pelacakan' | 'dimensi'

const TABS: { value: FormTab; label: string }[] = [
  { value: 'identitas', label: 'Identitas' },
  { value: 'pelacakan', label: 'Pelacakan' },
  { value: 'dimensi', label: 'UOM & Dimensi' },
]

interface Props {
  open: boolean
  mode: 'create' | 'edit'
  initialData?: ProductFormData | null
  ownerOptions: OwnerOption[]
  categoryOptions: CategoryOption[]
  hasReceipts?: boolean
  onClose: () => void
  onSubmit: (data: ProductFormData) => Promise<void>
}

export function ProductFormPanel({
  open,
  mode,
  initialData,
  ownerOptions,
  categoryOptions,
  hasReceipts = false,
  onClose,
  onSubmit,
}: Props) {
  const [activeTab, setActiveTab] = useState<FormTab>('identitas')

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initialData ?? defaultProductFormValues,
  })

  const { fields: altCodeFields, append: appendAltCode, remove: removeAltCode } = useFieldArray({
    control,
    name: 'alternateCodes',
  })

  const lotTracking = watch('lotTracking')
  const expiryTracking = watch('expiryTracking')

  // Reset expiryTracking if lotTracking is disabled
  useEffect(() => {
    if (!lotTracking && expiryTracking) {
      setValue('expiryTracking', false)
    }
  }, [lotTracking, expiryTracking, setValue])

  const prevOpenRef = useRef(false)
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      reset(initialData ?? defaultProductFormValues)
      setActiveTab('identitas')
    }
    prevOpenRef.current = open
  }, [open, initialData, reset])

  const onFormSubmit = handleSubmit(async (data) => {
    // Manual validation: expiry tracking requires lot tracking
    if (data.expiryTracking && !data.lotTracking) {
      toast.error('Validasi', 'Expiry tracking membutuhkan lot tracking aktif')
      return
    }
    // Coerce empty numeric strings to null (HTML inputs return '' for empty number fields)
    const coerced: ProductFormData = {
      ...data,
      shelfLifeInboundMinDays: data.shelfLifeInboundMinDays ?? null,
      shelfLifeOutboundMinDays: data.shelfLifeOutboundMinDays ?? null,
      expiryWarningDays: data.expiryWarningDays ?? null,
      expiryDateRule: data.expiryDateRule || null,
      overReceiptPct: data.overReceiptPct ?? null,
      declaredGrossWeightKg: data.declaredGrossWeightKg ?? null,
      declaredNetWeightKg: data.declaredNetWeightKg ?? null,
      declaredTareWeightKg: data.declaredTareWeightKg ?? null,
      lengthCm: data.lengthCm ?? null,
      widthCm: data.widthCm ?? null,
      heightCm: data.heightCm ?? null,
    }
    await onSubmit(coerced)
  })

  const trackingLocked = mode === 'edit' && hasReceipts

  return (
    <Panel open={open} onClose={onClose}>
      <div className="pr-7 mb-3.5">
        <h2 className="text-sm font-semibold text-[#001871] mb-1">
          {mode === 'create' ? 'Tambah Produk / SKU' : 'Edit Produk / SKU'}
        </h2>
        <p className="text-[11px] text-[#485885]">
          {mode === 'create'
            ? 'Daftarkan SKU baru ke dalam katalog'
            : 'Ubah data produk yang sudah terdaftar'}
        </p>
      </div>

      {/* Tracking lock banner */}
      {trackingLocked && (
        <div className="flex items-start gap-2 bg-[rgba(245,158,11,0.07)] border border-[rgba(245,158,11,0.2)] rounded-lg px-3 py-2.5 mb-3.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" className="flex-shrink-0 mt-px">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="text-[11px] text-[#92400e] leading-snug">
            Aturan pelacakan tidak dapat diubah karena SKU sudah pernah diterima.
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#ebebeb] mb-4 -mx-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-2 text-[12px] border-b-2 -mb-px whitespace-nowrap transition-colors ${
              activeTab === tab.value
                ? 'text-[#001871] font-semibold border-[#001871]'
                : 'text-[#485885] border-transparent hover:text-[#1f2b59]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <PanelBody>
        {/* ═══ Tab: Identitas ═══ */}
        {activeTab === 'identitas' && (
          <>
            <Input
              label="Kode SKU *"
              placeholder="Contoh: SKU-HW-001"
              disabled={mode === 'edit'}
              error={errors.skuCode?.message}
              {...register('skuCode')}
            />
            <Input
              label="Nama Produk *"
              placeholder="Nama produk sesuai kemasan"
              error={errors.name?.message}
              {...register('name')}
            />
            <Controller
              name="ownerId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Owner *"
                  options={[
                    { value: '', label: '— Pilih owner —' },
                    ...ownerOptions.map((o) => ({ value: o.id, label: `${o.code} — ${o.name}` })),
                  ]}
                  disabled={mode === 'edit'}
                  error={errors.ownerId?.message}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              )}
            />
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Kategori"
                  options={[
                    { value: '', label: '— Pilih kategori —' },
                    ...categoryOptions.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                  error={errors.categoryId?.message}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              )}
            />
            <Input
              label="Deskripsi"
              placeholder="Deskripsi singkat produk"
              error={errors.description?.message}
              {...register('description')}
            />
            <div className="grid grid-cols-2 gap-2.5">
              <Input
                label="GTIN (opsional)"
                placeholder="EAN-13 / GS1 barcode"
                error={errors.gtin?.message}
                {...register('gtin')}
              />
              <Input
                label="Easy Code (opsional)"
                placeholder="Kode singkat operator"
                error={errors.easyCode?.message}
                {...register('easyCode')}
              />
            </div>
            <Input
              label="Kode Supplier (opsional)"
              placeholder="Kode SKU dari supplier"
              error={errors.supplierSkuCode?.message}
              {...register('supplierSkuCode')}
            />

            {/* Kode Alternatif section */}
            <div className="mt-2">
              <div className="text-[11px] font-semibold text-[#485885] flex items-center gap-1.5 pb-1.5 border-b border-[#f1f3f8] mb-2.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                Kode Alternatif
              </div>
              <div className="flex flex-col gap-2">
                {altCodeFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <Controller
                      name={`alternateCodes.${index}.codeType`}
                      control={control}
                      render={({ field: f }) => (
                        <select
                          value={f.value}
                          onChange={(e) => f.onChange(e.target.value)}
                          className="border border-[#ebebeb] rounded-lg px-2 py-[7px] text-[12px] text-[#1f2b59] bg-white min-w-[120px] focus:outline-none focus:border-[#001871]"
                        >
                          {ALTERNATE_CODE_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      )}
                    />
                    <Input
                      placeholder="Nilai kode"
                      error={errors.alternateCodes?.[index]?.codeValue?.message}
                      {...register(`alternateCodes.${index}.codeValue`)}
                    />
                    <button
                      type="button"
                      onClick={() => removeAltCode(index)}
                      className="text-[#a9b1c6] hover:text-[#ef3340] p-1.5 rounded transition-colors flex-shrink-0 mt-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => appendAltCode({ codeType: 'CUSTOMER_REF', codeValue: '' })}
                className="w-full mt-2 border border-dashed border-[#d8deed] text-[#485885] bg-white rounded-lg py-1.5 text-[11px] font-medium cursor-pointer hover:bg-[#f7f9fc] transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3 h-3" />
                Tambah Kode
              </button>
            </div>
          </>
        )}

        {/* ═══ Tab: Pelacakan ═══ */}
        {activeTab === 'pelacakan' && (
          <>
            {/* Aturan Pelacakan */}
            <div className="text-[11px] font-semibold text-[#485885] flex items-center gap-1.5 pb-1.5 border-b border-[#f1f3f8] mb-2.5">
              Aturan Pelacakan
              <span className="text-[10px] font-normal text-[#a9b1c6]">Terkunci setelah penerimaan pertama</span>
            </div>

            <ToggleRow
              label="Pelacakan Lot"
              description="Setiap penerimaan wajib mencantumkan nomor lot"
              checked={lotTracking}
              disabled={trackingLocked}
              onChange={(v) => setValue('lotTracking', v)}
            />
            <ToggleRow
              label="Pelacakan Kedaluwarsa"
              description="Wajibkan pengisian tanggal kedaluwarsa saat penerimaan"
              checked={expiryTracking}
              disabled={trackingLocked || !lotTracking}
              onChange={(v) => setValue('expiryTracking', v)}
            />

            <Controller
              name="lpnTrackingLevel"
              control={control}
              render={({ field }) => (
                <Select
                  label="Level LPN *"
                  options={LPN_TRACKING_LEVEL_OPTIONS.map((o) => ({ value: o.value, label: `${o.value} — ${o.label}` }))}
                  disabled={trackingLocked}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              )}
            />

            <ToggleRow
              label="Pelacakan Berat"
              description="Catat berat aktual per lot/LPN saat penerimaan"
              checked={watch('weightTracking')}
              disabled={trackingLocked}
              onChange={(v) => setValue('weightTracking', v)}
            />

            {expiryTracking && (
              <Controller
                name="expiryDateRule"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Aturan Tanggal Exp"
                    options={[
                      { value: '', label: '— Tidak ada —' },
                      ...EXPIRY_DATE_RULE_OPTIONS.map((o) => ({ value: o.value, label: `${o.value} — ${o.label}` })),
                    ]}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                )}
              />
            )}

            {/* Flag Operasional */}
            <div className="text-[11px] font-semibold text-[#485885] pb-1.5 border-b border-[#f1f3f8] mb-2.5 mt-4">
              Flag Operasional
            </div>

            <ToggleRow
              label="Izinkan Penerimaan"
              description="Nonaktifkan untuk menghentikan inbound sementara"
              checked={watch('allowReceiving')}
              onChange={(v) => setValue('allowReceiving', v)}
            />
            <ToggleRow
              label="Izinkan Pengeluaran"
              description="Nonaktifkan untuk menghentikan outbound sementara"
              checked={watch('allowOutbound')}
              onChange={(v) => setValue('allowOutbound', v)}
            />
            <ToggleRow
              label="Material Berbahaya (Hazmat)"
              description="Diarahkan ke zona hazmat — divalidasi oleh aturan zona"
              checked={watch('isHazardous')}
              onChange={(v) => setValue('isHazardous', v)}
            />

            {/* Toleransi & Masa Simpan */}
            <div className="text-[11px] font-semibold text-[#485885] pb-1.5 border-b border-[#f1f3f8] mb-2.5 mt-4">
              Toleransi & Masa Simpan
            </div>

            <Input
              label="Toleransi Over-Receipt (%)"
              placeholder="Kosongkan untuk ikut konfigurasi gudang"
              type="number"
              step="0.5"
              {...register('overReceiptPct', { setValueAs: (v: string) => v === '' ? null : Number(v) })}
            />

            {expiryTracking && (
              <>
                <Input
                  label="Min. Masa Simpan Inbound (hari)"
                  placeholder="Contoh: 180"
                  type="number"
                  {...register('shelfLifeInboundMinDays', { setValueAs: (v: string) => v === '' ? null : Number(v) })}
                />
                <Input
                  label="Min. Masa Simpan Outbound (hari)"
                  placeholder="Contoh: 30"
                  type="number"
                  {...register('shelfLifeOutboundMinDays', { setValueAs: (v: string) => v === '' ? null : Number(v) })}
                />
                <Input
                  label="Notifikasi Exp. (hari sebelumnya)"
                  placeholder="Contoh: 14"
                  type="number"
                  {...register('expiryWarningDays', { setValueAs: (v: string) => v === '' ? null : Number(v) })}
                />
              </>
            )}
          </>
        )}

        {/* ═══ Tab: UOM & Dimensi ═══ */}
        {activeTab === 'dimensi' && (
          <>
            {/* Unit of Measure */}
            <div className="text-[11px] font-semibold text-[#485885] pb-1.5 border-b border-[#f1f3f8] mb-2.5">
              Unit of Measure
            </div>

            <Controller
              name="baseUom"
              control={control}
              render={({ field }) => (
                <Select
                  label="UOM Dasar *"
                  options={[
                    { value: '', label: '— Pilih UOM —' },
                    { value: 'EA', label: 'EA — Satuan' },
                    { value: 'KG', label: 'KG — Kilogram' },
                    { value: 'LTR', label: 'LTR — Liter' },
                  ]}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              )}
            />

            <div className="grid grid-cols-2 gap-2.5">
              <Input
                label="Default UOM Penerimaan"
                placeholder="cth. CTN"
                {...register('defaultReceivingUom')}
              />
              <Input
                label="Default UOM Pengeluaran"
                placeholder="cth. EA"
                {...register('defaultIssuingUom')}
              />
            </div>

            {/* Berat Dinyatakan */}
            <div className="text-[11px] font-semibold text-[#485885] pb-1.5 border-b border-[#f1f3f8] mb-2.5 mt-4 flex items-center gap-1.5">
              Berat Dinyatakan
              <span className="text-[10px] font-normal text-[#a9b1c6]">Nilai nominal — bukan pengukuran aktual</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Input
                label="Berat Kotor (kg)"
                placeholder="0.000"
                type="number"
                step="0.001"
                {...register('declaredGrossWeightKg', { setValueAs: (v: string) => v === '' ? null : Number(v) })}
              />
              <Input
                label="Berat Neto (kg)"
                placeholder="0.000"
                type="number"
                step="0.001"
                {...register('declaredNetWeightKg', { setValueAs: (v: string) => v === '' ? null : Number(v) })}
              />
              <Input
                label="Berat Tara (kg)"
                placeholder="0.000"
                type="number"
                step="0.001"
                {...register('declaredTareWeightKg', { setValueAs: (v: string) => v === '' ? null : Number(v) })}
              />
            </div>

            {/* Dimensi */}
            <div className="text-[11px] font-semibold text-[#485885] pb-1.5 border-b border-[#f1f3f8] mb-2.5 mt-4">
              Dimensi
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Input
                label="Panjang (cm)"
                placeholder="0"
                type="number"
                step="0.1"
                {...register('lengthCm', { setValueAs: (v: string) => v === '' ? null : Number(v) })}
              />
              <Input
                label="Lebar (cm)"
                placeholder="0"
                type="number"
                step="0.1"
                {...register('widthCm', { setValueAs: (v: string) => v === '' ? null : Number(v) })}
              />
              <Input
                label="Tinggi (cm)"
                placeholder="0"
                type="number"
                step="0.1"
                {...register('heightCm', { setValueAs: (v: string) => v === '' ? null : Number(v) })}
              />
            </div>
          </>
        )}
      </PanelBody>

      <PanelFooter
        onCancel={onClose}
        onSubmit={onFormSubmit}
        submitLabel="Simpan"
        loading={isSubmitting}
      />
    </Panel>
  )
}

// ─── Toggle Sub-component ───────────────────────────────────────────

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className={`flex items-center justify-between px-3 py-2.5 border border-[#ebebeb] rounded-lg bg-[#fafbfd] ${disabled ? 'opacity-45 pointer-events-none' : ''}`}>
      <div>
        <div className="text-[12px] text-[#1f2b59]">{label}</div>
        {description && <div className="text-[10px] text-[#a9b1c6] mt-0.5">{description}</div>}
      </div>
      <label className="relative inline-block w-9 h-5 flex-shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="opacity-0 w-0 h-0 peer"
        />
        <span className="absolute cursor-pointer inset-0 bg-[#dee1ed] rounded-full transition-colors peer-checked:bg-[#001871] before:content-[''] before:absolute before:w-3.5 before:h-3.5 before:left-[3px] before:top-[3px] before:bg-white before:rounded-full before:transition-transform before:shadow-[0_1px_3px_rgba(0,0,0,0.15)] peer-checked:before:translate-x-4" />
      </label>
    </div>
  )
}
