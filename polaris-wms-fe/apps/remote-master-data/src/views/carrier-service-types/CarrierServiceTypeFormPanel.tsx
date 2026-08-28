import { useEffect, useCallback, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Panel, PanelBody, PanelFooter, Input, Select, SingleSelect, type SingleSelectOption } from '@polaris/ui'
import type { CarrierServiceType, CarrierServiceTypeFormData } from '../../types/carrierServiceType.types'
import { businessPartiesApi } from '../../api/businessParty.api'

const formSchema = z.object({
  businessPartyId: z.string().min(1, 'Ekspedisi wajib dipilih'),
  serviceCode: z.string().min(1, 'Kode layanan wajib diisi').max(32),
  serviceName: z.string().min(1, 'Nama layanan wajib diisi').max(128),
  transportMode: z.enum(['ROAD', 'SEA', 'AIR', 'RAIL', '']).optional(),
  transitTimeMinDays: z.string().optional(),
  transitTimeMaxDays: z.string().optional(),
  slaDays: z.string().optional(),
  notes: z.string().max(512).optional(),
})

type FormValues = z.infer<typeof formSchema>

const TRANSPORT_MODE_OPTIONS = [
  { value: '', label: '— Tidak ditentukan —' },
  { value: 'ROAD', label: 'ROAD (Darat)' },
  { value: 'SEA', label: 'SEA (Laut)' },
  { value: 'AIR', label: 'AIR (Udara)' },
  { value: 'RAIL', label: 'RAIL (Kereta)' },
]

interface Props {
  open: boolean
  mode: 'create' | 'edit'
  initialData?: CarrierServiceType | null
  onClose: () => void
  onBack?: () => void
  onSubmit: (data: CarrierServiceTypeFormData) => Promise<void>
}

export function CarrierServiceTypeFormPanel({ open, mode, initialData, onClose, onBack, onSubmit }: Props) {
  const [initialCarrierOption, setInitialCarrierOption] = useState<SingleSelectOption | null>(null)

  const defaultValues: FormValues = {
    businessPartyId: '',
    serviceCode: '',
    serviceName: '',
    transportMode: '',
    transitTimeMinDays: '',
    transitTimeMaxDays: '',
    slaDays: '',
    notes: '',
  }

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && initialData) {
      reset({
        businessPartyId: initialData.businessPartyId,
        serviceCode: initialData.serviceCode,
        serviceName: initialData.serviceName,
        transportMode: initialData.transportMode || '',
        transitTimeMinDays: initialData.transitTimeMinDays != null ? String(initialData.transitTimeMinDays) : '',
        transitTimeMaxDays: initialData.transitTimeMaxDays != null ? String(initialData.transitTimeMaxDays) : '',
        slaDays: initialData.slaDays != null ? String(initialData.slaDays) : '',
        notes: initialData.notes || '',
      })
      setInitialCarrierOption({
        value: initialData.businessPartyId,
        label: initialData.carrierName,
        description: initialData.carrierCode,
      })
    } else {
      reset(defaultValues)
      setInitialCarrierOption(null)
    }
  }, [open, mode, initialData, reset])

  const loadCarrierOptions = useCallback(async (query: string): Promise<SingleSelectOption[]> => {
    const res = await businessPartiesApi.getAll({ search: query, role: 'COURIER', status: 'ACTIVE', pageSize: 50 })
    return res.data.map((bp) => ({
      value: bp.id,
      label: bp.name,
      description: bp.code,
    }))
  }, [])

  const onFormSubmit = handleSubmit(async (data) => {
    await onSubmit({
      businessPartyId: data.businessPartyId,
      serviceCode: data.serviceCode,
      serviceName: data.serviceName,
      transportMode: (data.transportMode || '') as CarrierServiceTypeFormData['transportMode'],
      transitTimeMinDays: data.transitTimeMinDays || '',
      transitTimeMaxDays: data.transitTimeMaxDays || '',
      slaDays: data.slaDays || '',
      notes: data.notes || '',
    })
  })

  return (
    <Panel open={open} onClose={onClose}>
      {/* Back link */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-[11px] text-[#485885] hover:text-[#001871] cursor-pointer bg-transparent border-none mb-3 p-0 transition-colors"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Kembali
        </button>
      )}

      <div className="mb-3.5">
        <h2 className="text-sm font-semibold text-[#001871] mb-0.5">
          {mode === 'create' ? 'Tambah Tipe Layanan' : 'Edit Tipe Layanan'}
        </h2>
        <p className="text-[11px] text-[#485885]">
          {mode === 'create' ? 'Tambahkan tipe layanan baru untuk ekspedisi' : 'Perbarui data tipe layanan'}
        </p>
      </div>

      <PanelBody>
        <Controller
          name="businessPartyId"
          control={control}
          render={({ field }) => (
            <SingleSelect
              label="Ekspedisi *"
              placeholder="— Pilih ekspedisi —"
              value={field.value}
              onChange={(val) => field.onChange(val)}
              loadOptions={loadCarrierOptions}
              initialOption={initialCarrierOption}
              error={errors.businessPartyId?.message}
              emptyMessage="Tidak ada ekspedisi ditemukan"
              disabled={mode === 'edit'}
            />
          )}
        />
        <Input
          label="Kode Layanan *"
          placeholder="Contoh: REG, YES, OKE"
          error={errors.serviceCode?.message}
          disabled={mode === 'edit'}
          {...register('serviceCode')}
        />
        <Input
          label="Nama Layanan *"
          placeholder="Contoh: Regular, Yakin Esok Sampai"
          error={errors.serviceName?.message}
          {...register('serviceName')}
        />
        <Select
          label="Mode Transportasi"
          options={TRANSPORT_MODE_OPTIONS}
          {...register('transportMode')}
        />
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              label="Transit Min (hari)"
              type="number"
              placeholder="1"
              {...register('transitTimeMinDays')}
            />
          </div>
          <div className="flex-1">
            <Input
              label="Transit Max (hari)"
              type="number"
              placeholder="3"
              {...register('transitTimeMaxDays')}
            />
          </div>
        </div>
        <Input
          label="SLA (hari)"
          type="number"
          placeholder="1"
          {...register('slaDays')}
        />
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[#485885]">Catatan</label>
          <textarea
            placeholder="Catatan operasional (opsional)"
            className="w-full border border-[#ebebeb] rounded-lg px-3 py-2 text-[13px] text-[#1f2b59] bg-white placeholder:text-[#949eb8] focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] transition-[border-color,box-shadow] resize-y min-h-[60px]"
            {...register('notes')}
          />
        </div>
      </PanelBody>

      <PanelFooter onCancel={onBack || onClose} onSubmit={onFormSubmit} submitLabel="Simpan" loading={isSubmitting} />
    </Panel>
  )
}
