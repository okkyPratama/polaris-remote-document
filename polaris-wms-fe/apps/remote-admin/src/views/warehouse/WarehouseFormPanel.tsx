import { useEffect, useState, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Panel, PanelBody, PanelFooter, Input, Select, SingleSelect, ConfirmDialog, type SingleSelectOption  } from '@polaris/ui'
import type { WarehouseFormData } from '../../types/warehouse.types'
import { warehouseFormSchema } from '../../types/warehouse.types'
import { companiesApi } from '../../api/companies.api'
import { codesApi } from '../../api/codes.api'

const STATUS_OPTIONS = [
  { value: 'AKTIF', label: 'Aktif' },
  { value: 'NONAKTIF', label: 'Nonaktif' },
]

interface Props {
  open: boolean
  mode: 'create' | 'edit'
  initialData?: WarehouseFormData
  /** Company info for pre-populating the SingleSelect in edit mode */
  initialCompany?: { id: string; name: string; code?: string } | null
  onClose: () => void
  onSubmit: (data: WarehouseFormData) => Promise<void>
}

async function loadCompaniesOptions(query: string): Promise<SingleSelectOption[]> {
  const res = await companiesApi.getAll({ search: query, status: 'AKTIF', pageSize: 50 })
  return res.data.map((g) => ({
    value: g.id,
    label: g.name,
    description: g.code,
  }))
}

const EMPTY_DEFAULTS: WarehouseFormData = { 
  code: '', 
  name: '', 
  address: '', 
  city: '', 
  province: '', 
  postalCode: '', 
  capacity: '', 
  area: '', 
  pic: '', 
  phone: '', 
  tempZones: [], 
  timezone: 'Asia/Jakarta', 
  status: 'AKTIF', 
  companyId: '' 
}

export function WarehouseFormPanel({ open, mode, initialData, initialCompany, onClose, onSubmit }: Props) {
  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseFormSchema),
    defaultValues: initialData || EMPTY_DEFAULTS,
  })

  const [showStatusConfirm, setShowStatusConfirm] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<WarehouseFormData | null>(null)
  const [tempZoneOptions, setTempZoneOptions] = useState<string[]>([])

  // Load temperature zones from codes API
  useEffect(() => {
    codesApi.getAll({ search: 'TEMPERATURE_ZONE', status: 'AKTIF', pageSize: 1 }).then((res) => {
      const tempCode = res.data.find((c) => c.typeCode === 'TEMPERATURE_ZONE')
      if (tempCode && tempCode.details) {
        setTempZoneOptions(tempCode.details.filter((d) => d.status === 'AKTIF').map((d) => d.codeName))
      } else if (tempCode) {
        // details not in getAll, fetch by id
        codesApi.getById(tempCode.id).then((detail) => {
          if (detail?.details) {
            setTempZoneOptions(detail.details.filter((d) => d.status === 'AKTIF').map((d) => d.codeName))
          }
        })
      }
    }).catch(() => {
      // Biarkan kosong jika gagal load — tidak ada fallback hardcode
      setTempZoneOptions([])
    })
  }, [])

  const prevOpenRef = useRef(false)
  const prevInitialRef = useRef<WarehouseFormData | undefined>(undefined)

  useEffect(() => {
    // Reset form ketika panel baru dibuka (open: false → true)
    if (open && !prevOpenRef.current) {
      reset(initialData || EMPTY_DEFAULTS)
    }
    // Reset form ketika initialData berubah (edit detail selesai di-fetch) selagi panel terbuka
    else if (open && initialData && initialData !== prevInitialRef.current) {
      reset(initialData)
    }
    prevOpenRef.current = open
    prevInitialRef.current = initialData
  }, [open, initialData, reset])

  const onFormSubmit = handleSubmit(async (data) => {
    // Jika mode edit dan status berubah, tampilkan confirmation dialog
    if (mode === 'edit' && initialData && data.status !== initialData.status) {
      setPendingFormData(data)
      setShowStatusConfirm(true)
      return
    }
    await onSubmit(data)
  })

  const handleConfirmStatusChange = async () => {
    if (pendingFormData) {
      await onSubmit(pendingFormData)
      setPendingFormData(null)
      setShowStatusConfirm(false)
    }
  }

  const isDeactivating = pendingFormData?.status === 'NONAKTIF'

  return (
    <>
    <Panel open={open} onClose={onClose}>
      <div className="pr-7 mb-3.5">
        <h2 className="text-sm font-semibold text-[#001871] mb-1">
          {mode === 'create' ? 'Tambah Gudang' : 'Edit Gudang'}
        </h2>
        <p className="text-[11px] text-[#485885]">
          {mode === 'create' ? 'Isi profil gudang, kapasitas, dan zona suhu yang tersedia' : 'Ubah data gudang'}
        </p>
      </div>

      {mode === 'edit' && (
        <div className="flex items-start gap-2 bg-[rgba(0,24,113,0.05)] border border-[rgba(0,24,113,0.15)] rounded-lg px-3 py-2.5 mb-3.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#485885" strokeWidth="2" className="flex-shrink-0 mt-px"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          <span className="text-[11px] text-[#485885] leading-snug">Kode Gudang tidak dapat diubah setelah gudang dibuat.</span>
        </div>
      )}

      <PanelBody>
        <Controller
          name="companyId"
          control={control}
          render={({ field }) => (
            <SingleSelect
              label="Perusahaan"
              placeholder="— Pilih Perusahaan —"
              value={field.value ?? ''}
              onChange={(val) => field.onChange(val)}
              loadOptions={loadCompaniesOptions}
              disabled={mode === 'edit'}
              error={errors.companyId?.message}
              emptyMessage="Tidak ada perusahaan ditemukan"
              initialOption={initialCompany ? { value: initialCompany.id, label: initialCompany.name, description: initialCompany.code } : null}
            />
          )}
        />
        <Input label="Kode Gudang *" placeholder="cth. WH-BDG-01" disabled={mode === 'edit'} error={errors.code?.message} {...register('code')} />
        <Input label="Nama Gudang *" placeholder="Nama lengkap gudang" error={errors.name?.message} {...register('name')} />
        <Input label="Alamat *" placeholder="Jl. Nama Jalan No.X" error={errors.address?.message} {...register('address')} />
        <div className="grid grid-cols-[1fr_1fr_0.6fr] gap-2.5">
          <Input label="Kota *" placeholder="Kota" error={errors.city?.message} {...register('city')} />
          <Input label="Provinsi *" placeholder="Provinsi" error={errors.province?.message} {...register('province')} />
          <Input label="Kode Pos" placeholder="13910" {...register('postalCode')} />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Input label="Kapasitas Palet" placeholder="cth. 800" {...register('capacity')} />
          <Input label="Luas Area (m²)" placeholder="cth. 2100" {...register('area')} />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Input label="PIC *" placeholder="Penanggung jawab" error={errors.pic?.message} {...register('pic')} />
          <Input label="Telepon" placeholder="021-..." {...register('phone')} />
        </div>

        {/* Zona Suhu */}
        <Controller
          control={control}
          name="tempZones"
          render={({ field }) => (
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-[#485885]">Zona Suhu</label>
              <div className="flex flex-wrap gap-2">
                {tempZoneOptions.map((zone) => {
                  const checked = field.value?.includes(zone)
                  return (
                    <label key={zone} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer text-xs font-medium select-none transition-all ${checked ? 'border-[#001871] text-[#001871] bg-[rgba(0,24,113,0.06)]' : 'border-[#ebebeb] text-[#485885]'}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const newVal = e.target.checked
                            ? [...(field.value || []), zone]
                            : (field.value || []).filter((z) => z !== zone)
                          field.onChange(newVal)
                        }}
                        className="accent-[#001871] cursor-pointer w-3.5 h-3.5"
                      />
                      {zone}
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        />

        <Select label="Status" options={STATUS_OPTIONS} {...register('status')} />
      </PanelBody>
      <PanelFooter onCancel={onClose} onSubmit={onFormSubmit} submitLabel="Simpan" loading={isSubmitting} />
    </Panel>

    <ConfirmDialog
      open={showStatusConfirm}
      title={isDeactivating ? 'Nonaktifkan Gudang' : 'Aktifkan Gudang'}
      description={isDeactivating
        ? `Yakin ingin mengubah status gudang menjadi Nonaktif? Gudang tidak akan dapat digunakan untuk operasional.`
        : `Yakin ingin mengaktifkan kembali gudang ini?`
      }
      confirmLabel={isDeactivating ? 'Nonaktifkan' : 'Aktifkan'}
      cancelLabel="Batal"
      variant={isDeactivating ? 'danger' : 'default'}
      isLoading={isSubmitting}
      onConfirm={handleConfirmStatusChange}
      onCancel={() => { setShowStatusConfirm(false); setPendingFormData(null) }}
    />
    </>
  )
}
