import { useState, useEffect, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Panel, PanelBody, PanelFooter, Input, Select, SingleSelect, type SingleSelectOption } from '@polaris/ui'
import type { Company } from '../../types/company.types'
import type { WarehouseFormData } from '../../types/warehouse.types'
import { warehouseFormSchema } from '../../types/warehouse.types'
import { warehouseApi } from '../../api/warehouse.api'
import { codesApi } from '../../api/codes.api'

// Schema untuk assign existing warehouse
const assignSchema = z.object({
  warehouseId: z.string().min(1, 'Pilih gudang'),
})
type AssignFormData = z.infer<typeof assignSchema>

const STATUS_OPTIONS = [
  { value: 'AKTIF', label: 'Aktif' },
  { value: 'NONAKTIF', label: 'Nonaktif' },
]

async function loadWarehouseOptions(query: string): Promise<SingleSelectOption[]> {
  const res = await warehouseApi.getAll({ search: query, status: 'AKTIF', pageSize: 50, companyIdNull: true })
  return res.data.map((w) => ({
    value: w.id,
    label: w.name,
    description: w.code,
  }))
}

type SubPanel = 'assign' | 'create-new'

interface Props {
  open: boolean
  company: Company | null
  onClose: () => void
  onAssign: (warehouseId: string) => Promise<void>
  onCreateWarehouse: (data: WarehouseFormData) => Promise<void>
}

export function AssignWarehousePanel({ open, company, onClose, onAssign, onCreateWarehouse }: Props) {
  const [subPanel, setSubPanel] = useState<SubPanel>('assign')

  // Reset sub-panel saat panel dibuka
  const prevOpen = useRef(false)
  useEffect(() => {
    if (open && !prevOpen.current) setSubPanel('assign')
    prevOpen.current = open
  }, [open])

  if (!company) return null

  return (
    <>
      {subPanel === 'assign' && (
        <AssignSubPanel open={open} company={company} onClose={onClose} onAssign={onAssign} onCreateNew={() => setSubPanel('create-new')} />
      )}
      {subPanel === 'create-new' && (
        <CreateWarehouseSubPanel open={open} company={company} onClose={onClose} onBack={() => setSubPanel('assign')} onSubmit={onCreateWarehouse} />
      )}
    </>
  )
}

// ─── Sub-panel: Assign existing warehouse ──────────────────────────────────────

interface AssignSubPanelProps {
  open: boolean
  company: Company
  onClose: () => void
  onAssign: (warehouseId: string) => Promise<void>
  onCreateNew: () => void
}

function AssignSubPanel({ open, company, onClose, onAssign, onCreateNew }: AssignSubPanelProps) {
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<AssignFormData>({
    resolver: zodResolver(assignSchema),
    defaultValues: { warehouseId: '' },
  })

  const onFormSubmit = handleSubmit(async (data) => {
    await onAssign(data.warehouseId)
  })

  return (
    <Panel open={open} onClose={onClose}>
      <div className="flex items-center justify-between pr-7 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[#001871] mb-0.5">Pilih Gudang</h2>
          <p className="text-[11px] text-[#485885]">Tambahkan gudang ke perusahaan ini</p>
        </div>
        <button type="button" onClick={onCreateNew} className="text-[11px] font-medium text-[#001871] hover:underline cursor-pointer whitespace-nowrap">
          + Buat Gudang Baru
        </button>
      </div>

      <PanelBody>
        <Input label="Perusahaan" value={`${company.name} (${company.code})`} disabled />

        <Controller
          name="warehouseId"
          control={control}
          render={({ field }) => (
            <SingleSelect
              label="Pilih Gudang *"
              placeholder="— Pilih Gudang —"
              value={field.value}
              onChange={(val) => field.onChange(val)}
              loadOptions={loadWarehouseOptions}
              error={errors.warehouseId?.message}
              emptyMessage="Tidak ada gudang ditemukan"
            />
          )}
        />
      </PanelBody>

      <PanelFooter onCancel={onClose} onSubmit={onFormSubmit} submitLabel="Simpan" loading={isSubmitting} />
    </Panel>
  )
}

// ─── Sub-panel: Create new warehouse ──────────────────────────────────────────

interface CreateWarehouseSubPanelProps {
  open: boolean
  company: Company
  onClose: () => void
  onBack: () => void
  onSubmit: (data: WarehouseFormData) => Promise<void>
}

function CreateWarehouseSubPanel({ open, company, onClose, onBack, onSubmit }: CreateWarehouseSubPanelProps) {
  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseFormSchema),
    defaultValues: {
      companyId: company.id,
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
      status: 'AKTIF',
    },
  })

  const [tempZoneOptions, setTempZoneOptions] = useState<string[]>([])

  useEffect(() => {
    codesApi.getAll({ search: 'TEMPERATURE_ZONE', status: 'AKTIF', pageSize: 1 }).then((res) => {
      const tempCode = res.data.find((c) => c.typeCode === 'TEMPERATURE_ZONE')
      if (tempCode && tempCode.details) {
        setTempZoneOptions(tempCode.details.filter((d) => d.status === 'AKTIF').map((d) => d.codeName))
      } else if (tempCode) {
        codesApi.getById(tempCode.id).then((detail) => {
          if (detail?.details) {
            setTempZoneOptions(detail.details.filter((d) => d.status === 'AKTIF').map((d) => d.codeName))
          }
        })
      }
    }).catch(() => setTempZoneOptions([]))
  }, [])

  const prevOpen = useRef(false)
  useEffect(() => {
    if (open && !prevOpen.current) {
      reset({ companyId: company.id, code: '', name: '', address: '', city: '', province: '', postalCode: '', capacity: '', area: '', pic: '', phone: '', tempZones: [], status: 'AKTIF' })
    }
    prevOpen.current = open
  }, [open, company.id, reset])

  const onFormSubmit = handleSubmit(async (data) => {
    await onSubmit({ ...data, companyId: company.id })
  })

  return (
    <Panel open={open} onClose={onClose}>
      {/* Back link */}
      <button type="button" onClick={onClose} className="flex items-center gap-1.5 text-[11px] text-[#485885] hover:text-[#001871] cursor-pointer mb-3 transition-colors">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        Kembali ke perusahaan
      </button>

      <div className="mb-3.5">
        <h2 className="text-sm font-semibold text-[#001871] mb-0.5">Tambah Gudang</h2>
        <p className="text-[11px] text-[#485885]">Gudang baru akan terdaftar di bawah perusahaan ini</p>
      </div>

      {/* Company badge (locked) */}
      <div className="flex items-center gap-2 bg-[#f1f3f8] border border-[#ebebeb] rounded-lg px-3 py-2.5 mb-4">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#485885" strokeWidth="2" className="flex-shrink-0">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
        <span className="text-[12px] text-[#485885]">Perusahaan: {company.name} ({company.code})</span>
      </div>

      <PanelBody>
        <Input label="Kode Gudang *" placeholder="Contoh: WH-BDG-01" error={errors.code?.message} {...register('code')} />
        <Input label="Nama Gudang *" placeholder="Nama lengkap gudang" error={errors.name?.message} {...register('name')} />
        <Input label="Alamat *" placeholder="Jl. Nama Jalan No.X" error={errors.address?.message} {...register('address')} />
        <div className="grid grid-cols-[1fr_1fr_0.6fr] gap-2.5">
          <Input label="Kota *" placeholder="Kota" error={errors.city?.message} {...register('city')} />
          <Input label="Provinsi *" placeholder="Provinsi" error={errors.province?.message} {...register('province')} />
          <Input label="Kode Pos" placeholder="13910" {...register('postalCode')} />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Input label="Kapasitas Palet" placeholder="Contoh: 800" {...register('capacity')} />
          <Input label="Luas Area (m²)" placeholder="Contoh: 2.100" {...register('area')} />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Input label="PIC *" placeholder="Nama penanggung jawab" error={errors.pic?.message} {...register('pic')} />
          <Input label="Telepon PIC" placeholder="+62..." {...register('phone')} />
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

      <PanelFooter onCancel={onBack} onSubmit={onFormSubmit} submitLabel="Simpan" loading={isSubmitting} />
    </Panel>
  )
}
