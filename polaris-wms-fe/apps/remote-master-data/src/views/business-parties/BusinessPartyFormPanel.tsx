import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ConfirmDialog, Input, Panel, PanelBody, PanelFooter } from '@polaris/ui'
import type {
  BusinessParty,
  BusinessPartyFormData,
  BusinessPartyFormInput,
  BusinessPartyRole,
} from '../../types/businessParty.types'
import {
  businessPartyFormSchema,
  defaultBusinessPartyFormValues,
  toBusinessPartyFormData,
} from '../../types/businessParty.types'

const ROLE_OPTIONS: { value: BusinessPartyRole; label: string }[] = [
  { value: 'OWNER', label: 'Owner' },
  { value: 'SUPPLIER', label: 'Pemasok' },
  { value: 'CONSIGNEE', label: 'Penerima' },
  { value: 'COURIER', label: 'Ekspedisi' },
]

interface Props {
  open: boolean
  mode: 'create' | 'edit'
  initialData?: BusinessParty | null
  onClose: () => void
  onBack?: () => void
  onSubmit: (data: BusinessPartyFormData) => Promise<void>
}

export function BusinessPartyFormPanel({
  open,
  mode,
  initialData,
  onClose,
  onBack,
  onSubmit,
}: Props) {
  const isEdit = mode === 'edit'
  const [activeTab, setActiveTab] = useState<'identitas' | 'ekstensi'>('identitas')
  const [showStatusConfirm, setShowStatusConfirm] = useState(false)
  const [pendingData, setPendingData] = useState<BusinessPartyFormData | null>(null)

  const {
    register,
    control,
    reset,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BusinessPartyFormInput, unknown, BusinessPartyFormData>({
    resolver: zodResolver(businessPartyFormSchema),
    defaultValues: defaultBusinessPartyFormValues as BusinessPartyFormInput,
  })

  useEffect(() => {
    if (!open) return
    setActiveTab('identitas')
    if (initialData) {
      reset(toBusinessPartyFormData(initialData))
      return
    }
    reset(defaultBusinessPartyFormValues)
  }, [open, initialData, reset])

  const selectedRoles = watch('roles')
  const hasOwnerRole = selectedRoles?.includes('OWNER')
  const hasSupplierRole = selectedRoles?.includes('SUPPLIER')
  const hasConsigneeRole = selectedRoles?.includes('CONSIGNEE')
  const hasCarrierRole = selectedRoles?.includes('COURIER')
  const hasAnyExtension = hasOwnerRole || hasSupplierRole || hasConsigneeRole || hasCarrierRole

  return (
    <>
      <Panel open={open} onClose={onClose}>
        {isEdit && onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-[11px] text-[#485885] hover:text-[#001871] mb-3 transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Kembali ke detail
          </button>
        )}

        <div className="pr-7 mb-3.5">
          <h2 className="text-sm font-semibold text-[#001871] mb-1">
            {isEdit ? `Edit: ${initialData?.name ?? ''}` : 'Tambah Mitra Bisnis'}
          </h2>
          <p className="text-[11px] text-[#485885]">
            Lengkapi identitas mitra, tipe peran, dan atribut ekstensi per tipe
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#ebebeb] mb-3">
          <button
            type="button"
            onClick={() => setActiveTab('identitas')}
            className={`px-3 py-2 text-[12px] border-b-2 -mb-px transition-colors ${
              activeTab === 'identitas'
                ? 'text-[#001871] font-semibold border-[#001871]'
                : 'text-[#485885] border-transparent hover:text-[#1f2b59]'
            }`}
          >
            Identitas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ekstensi')}
            className={`px-3 py-2 text-[12px] border-b-2 -mb-px transition-colors ${
              activeTab === 'ekstensi'
                ? 'text-[#001871] font-semibold border-[#001871]'
                : 'text-[#485885] border-transparent hover:text-[#1f2b59]'
            }`}
          >
            Ekstensi
          </button>
        </div>

        <form onSubmit={handleSubmit((data) => {
          if (isEdit && initialData && data.status !== initialData.status) {
            setPendingData(data)
            setShowStatusConfirm(true)
            return
          }
          onSubmit(data)
        })}>
          {/* ─── Tab: Identitas ─── */}
          <PanelBody className={activeTab === 'identitas' ? '' : 'hidden'}>
            <Input
              label="Kode Mitra *"
              placeholder="Contoh: BP-HW-001"
              disabled={isEdit}
              className={isEdit ? 'opacity-60 cursor-not-allowed bg-[#fafbfd]' : ''}
              error={errors.code?.message}
              {...register('code')}
            />
            <Input label="Nama Mitra *" placeholder="Nama resmi perusahaan" error={errors.name?.message} {...register('name')} />
            <Input label="NPWP" placeholder="xx.xxx.xxx.x-xxx.xxx" error={errors.npwp?.message} {...register('npwp')} />

            <Controller
              name="roles"
              control={control}
              render={({ field }) => (
                <div className="mb-3">
                  <label className="block text-[11px] font-medium text-[#485885] mb-2">Tipe Mitra *</label>
                  <div className="flex flex-wrap gap-2">
                    {ROLE_OPTIONS.map((opt) => {
                      const checked = field.value?.includes(opt.value)
                      return (
                        <label
                          key={opt.value}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs cursor-pointer transition-colors ${
                            checked
                              ? 'border-[#001871] bg-[rgba(0,24,113,0.06)] text-[#001871]'
                              : 'border-[#e5e9f4] text-[#485885] hover:border-[#cdd5ea]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const curr = field.value ?? []
                              if (e.target.checked) field.onChange([...curr, opt.value])
                              else field.onChange(curr.filter((v) => v !== opt.value))
                            }}
                          />
                          {opt.label}
                        </label>
                      )
                    })}
                  </div>
                  {errors.roles?.message && <p className="text-[11px] text-[#ef3340] mt-1">{errors.roles.message}</p>}
                </div>
              )}
            />

            <Input label="Kontak Person" placeholder="Nama PIC" error={errors.contactName?.message} {...register('contactName')} />
            <Input label="Email Kontak" placeholder="nama@domain.com" error={errors.contactEmail?.message} {...register('contactEmail')} />
            <Input label="Telepon Kontak" placeholder="+62..." error={errors.contactPhone?.message} {...register('contactPhone')} />
            <Input label="Alamat" placeholder="Alamat lengkap" error={errors.address?.message} {...register('address')} />
            <Input label="Kota" placeholder="Kota" error={errors.city?.message} {...register('city')} />
            <Input label="Provinsi" placeholder="Provinsi" error={errors.province?.message} {...register('province')} />
            <Input label="Kode Pos" placeholder="Kode pos" error={errors.zipcode?.message} {...register('zipcode')} />
            <Input label="Kode Negara" placeholder="ID" error={errors.countryCode?.message} {...register('countryCode')} />

            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <div className="mb-3">
                  <label className="block text-[11px] font-medium text-[#485885] mb-1">Status</label>
                  <select
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="w-full border border-[#ebebeb] rounded-lg px-3 py-[7px] text-[13px] text-[#1f2b59] bg-white focus:outline-none focus:border-[#001871]"
                  >
                    <option value="ACTIVE">Aktif</option>
                    <option value="INACTIVE">Nonaktif</option>
                  </select>
                </div>
              )}
            />
          </PanelBody>

          {/* ─── Tab: Ekstensi ─── */}
          <PanelBody className={activeTab === 'ekstensi' ? '' : 'hidden'}>
            {!hasAnyExtension && (
              <div className="text-[12px] text-[#a9b1c6] border border-dashed border-[#dee1ed] rounded-lg px-3 py-3">
                Pilih tipe mitra di tab Identitas untuk mengisi atribut ekstensi.
              </div>
            )}

            {/* Owner Extension */}
            {hasOwnerRole && (
              <div className="mt-1">
                <div className="flex items-center gap-2 border-b border-[#eef1f6] pb-2 mb-3">
                  <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[rgba(0,24,113,0.08)] text-[#001871]">Owner</div>
                </div>

                <div className="flex flex-col gap-3.5">
                  <Input label="Alias Internal" placeholder="Alias internal owner" {...register('ownerAttr.internalAlias')} />
                  <Input label="EDI Code" placeholder="Kode EDI" {...register('ownerAttr.ediCode')} />

                  {/* Catatan - textarea */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-[#485885]">Catatan</label>
                    <textarea
                      placeholder="Catatan operasional owner (opsional)"
                      className="w-full border border-[#ebebeb] rounded-lg px-3 py-2 text-[13px] text-[#1f2b59] bg-white placeholder:text-[#949eb8] focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] transition-[border-color,box-shadow] resize-y min-h-[60px]"
                      {...register('ownerAttr.notes')}
                    />
                  </div>
                </div>

                {/* Section: Kebijakan Exp. & Barcode */}
                <div className="flex items-center gap-2 mt-5 mb-3 border-b border-[#eef1f6] pb-2">
                  <span className="text-[11px] font-semibold text-[#485885]">Kebijakan Exp. & Barcode</span>
                </div>

                <div className="flex flex-col gap-3.5">
                  {/* Level Penegakan Exp. - select */}
                  <Controller
                    name="ownerAttr.expiryPolicyLevel"
                    control={control}
                    render={({ field }) => (
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium text-[#485885]">Level Penegakan Exp.</label>
                        <select
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="w-full border border-[#ebebeb] rounded-lg px-3 py-[7px] pr-8 text-[13px] text-[#1f2b59] bg-white appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%2712%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23485885%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center] focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] cursor-pointer"
                        >
                          <option value="">— Tidak ditentukan —</option>
                          <option value="STRICT">STRICT — exp date wajib, blokir jika tidak ada</option>
                          <option value="WARNING">WARNING — opsional, sistem memberi peringatan</option>
                          <option value="PERMISSIVE">PERMISSIVE — opsional, tanpa peringatan</option>
                        </select>
                      </div>
                    )}
                  />

                  <Input label="Notifikasi Exp. (hari)" type="number" placeholder="Contoh: 14" {...register('ownerAttr.expiryWarnDays')} />

                  {/* Barcode Parser - select */}
                  <Controller
                    name="ownerAttr.barcodeParser"
                    control={control}
                    render={({ field }) => (
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium text-[#485885]">Barcode Parser</label>
                        <select
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="w-full border border-[#ebebeb] rounded-lg px-3 py-[7px] pr-8 text-[13px] text-[#1f2b59] bg-white appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%2712%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23485885%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center] focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] cursor-pointer"
                        >
                          <option value="">— Tidak ada (scan mentah) —</option>
                          <option value="EAN13">EAN-13 Standar</option>
                          <option value="GS1128">GS1-128 Coldchain</option>
                          <option value="QR">QR Internal</option>
                        </select>
                      </div>
                    )}
                  />

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-[#485885]">
                      Prefix SKU Kustom <span className="font-normal text-[#949eb8]">(opsional)</span>
                    </label>
                    <input
                      placeholder="Contoh: CS- atau HW-"
                      className="w-full border border-[#ebebeb] rounded-lg px-3 py-[7px] text-[13px] text-[#1f2b59] bg-white placeholder:text-[#949eb8] focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] transition-[border-color,box-shadow]"
                      {...register('ownerAttr.skuPrefix')}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Supplier Extension */}
            {hasSupplierRole && (
              <div className="mt-5">
                <div className="flex items-center gap-2 border-b border-[#eef1f6] pb-2 mb-3">
                  <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[rgba(85,191,89,0.08)] text-[#55bf59]">Pemasok</div>
                </div>

                <div className="flex flex-col gap-3.5">
                  <Input label="Kode Supplier" placeholder="Kode internal supplier" {...register('supplierAttr.supplierCode')} />
                  <Input label="EDI Code" placeholder="Kode EDI" {...register('supplierAttr.ediCode')} />
                  <Input label="Lead Time (hari)" type="number" placeholder="Contoh: 7" {...register('supplierAttr.leadTimeDays')} />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input label="Kota Asal" placeholder="Kota" {...register('supplierAttr.originCity')} />
                    </div>
                    <div className="flex-1">
                      <Input label="Negara Asal" placeholder="Indonesia" {...register('supplierAttr.originCountry')} />
                    </div>
                  </div>

                  {/* Catatan - textarea */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-[#485885]">Catatan</label>
                    <textarea
                      placeholder="Catatan operasional pemasok (opsional)"
                      className="w-full border border-[#ebebeb] rounded-lg px-3 py-2 text-[13px] text-[#1f2b59] bg-white placeholder:text-[#949eb8] focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] transition-[border-color,box-shadow] resize-y min-h-[60px]"
                      {...register('supplierAttr.notes')}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Consignee Extension */}
            {hasConsigneeRole && (
              <div className="mt-5">
                <div className="flex items-center gap-2 border-b border-[#eef1f6] pb-2 mb-3">
                  <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[rgba(233,123,46,0.08)] text-[#e97b2e]">Penerima</div>
                </div>

                <div className="flex flex-col gap-3.5">
                  <Input label="EDI Code" placeholder="Kode EDI" {...register('consigneeAttr.ediCode')} />

                  {/* Catatan - textarea */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-[#485885]">Catatan</label>
                    <textarea
                      placeholder="Catatan operasional penerima (opsional)"
                      className="w-full border border-[#ebebeb] rounded-lg px-3 py-2 text-[13px] text-[#1f2b59] bg-white placeholder:text-[#949eb8] focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] transition-[border-color,box-shadow] resize-y min-h-[60px]"
                      {...register('consigneeAttr.notes')}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Carrier Extension */}
            {hasCarrierRole && (
              <div className="mt-5">
                <div className="flex items-center gap-2 border-b border-[#eef1f6] pb-2 mb-3">
                  <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[rgba(74,144,217,0.08)] text-[#4a90d9]">Ekspedisi</div>
                </div>

                <div className="flex flex-col gap-3.5">
                  {/* Mode Transport - select */}
                  <Controller
                    name="carrierAttr.transportMode"
                    control={control}
                    render={({ field }) => (
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium text-[#485885]">Mode Transport</label>
                        <select
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="w-full border border-[#ebebeb] rounded-lg px-3 py-[7px] pr-8 text-[13px] text-[#1f2b59] bg-white appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%2712%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23485885%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center] focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] cursor-pointer"
                        >
                          <option value="">— Pilih —</option>
                          <option value="ROAD">ROAD (Darat)</option>
                          <option value="SEA">SEA (Laut)</option>
                          <option value="AIR">AIR (Udara)</option>
                          <option value="RAIL">RAIL (Kereta)</option>
                        </select>
                      </div>
                    )}
                  />

                  <Input label="EDI Code" placeholder="Kode EDI" {...register('carrierAttr.ediCode')} />
                  <Input label="URL Tracking" placeholder="https://…/track?no={awb}" {...register('carrierAttr.trackingUrl')} />

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-[#485885]">
                      Format AWB <span className="font-normal text-[#949eb8]">(regex)</span>
                    </label>
                    <input
                      placeholder="Contoh: [0-9]{12}"
                      className="w-full border border-[#ebebeb] rounded-lg px-3 py-[7px] text-[13px] text-[#1f2b59] bg-white placeholder:text-[#949eb8] focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] transition-[border-color,box-shadow]"
                      {...register('carrierAttr.awbFormat')}
                    />
                  </div>

                  {/* Catatan - textarea */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-[#485885]">Catatan</label>
                    <textarea
                      placeholder="Catatan operasional ekspedisi (opsional)"
                      className="w-full border border-[#ebebeb] rounded-lg px-3 py-2 text-[13px] text-[#1f2b59] bg-white placeholder:text-[#949eb8] focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] transition-[border-color,box-shadow] resize-y min-h-[60px]"
                      {...register('carrierAttr.notes')}
                    />
                  </div>
                </div>
              </div>
            )}
          </PanelBody>

          <PanelFooter>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#f1f3f8] text-[#1f2b59] border-none rounded-lg py-2 text-[13px] font-medium cursor-pointer hover:bg-[#e7ebf5] transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-[#001871] text-white border-none rounded-lg py-2 text-[13px] font-medium cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </PanelFooter>
        </form>
      </Panel>

      <ConfirmDialog
        open={showStatusConfirm}
        title={pendingData?.status === 'INACTIVE' ? 'Nonaktifkan Mitra' : 'Aktifkan Mitra'}
        description={
          pendingData?.status === 'INACTIVE'
            ? `Yakin ingin menonaktifkan "${pendingData?.name || ''}"? Mitra yang nonaktif tidak akan muncul di pilihan transaksi baru.`
            : `Yakin ingin mengaktifkan kembali "${pendingData?.name || ''}"?`
        }
        confirmLabel={pendingData?.status === 'INACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
        cancelLabel="Batal"
        variant={pendingData?.status === 'INACTIVE' ? 'danger' : 'default'}
        isLoading={isSubmitting}
        onConfirm={async () => {
          if (pendingData) {
            await onSubmit(pendingData)
            setPendingData(null)
            setShowStatusConfirm(false)
          }
        }}
        onCancel={() => {
          setPendingData(null)
          setShowStatusConfirm(false)
        }}
      />
    </>
  )
}
