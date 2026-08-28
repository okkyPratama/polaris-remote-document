import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Panel, PanelBody, PanelFooter, Input, Select, TextArea, ConfirmDialog } from '@polaris/ui'
import {
  defaultZoneGroupFormValues,
  PUTAWAY_MODE_OPTIONS,
  SPATIAL_STATUS_OPTIONS,
  zoneGroupFormSchema,
  type ZoneGroupFormData,
} from '../../../types/spatial.types'

const STATUS_OPTIONS = SPATIAL_STATUS_OPTIONS.map((opt) => ({
  value: opt.value,
  label: opt.label,
}))

interface ZoneGroupFormPanelProps {
  open: boolean
  mode: 'create' | 'edit'
  initialData?: ZoneGroupFormData
  onClose: () => void
  onSubmit: (data: ZoneGroupFormData) => Promise<void>
}

export function ZoneGroupFormPanel({
  open,
  mode,
  initialData,
  onClose,
  onSubmit,
}: ZoneGroupFormPanelProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ZoneGroupFormData>({
    // zod transform schemas need a cast for RHF resolver generics
    resolver: zodResolver(zoneGroupFormSchema) as never,
    defaultValues: defaultZoneGroupFormValues,
  })

  const [showStatusConfirm, setShowStatusConfirm] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<ZoneGroupFormData | null>(null)
  const prevOpenRef = useRef(false)

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      reset(initialData ?? defaultZoneGroupFormValues)
      setShowStatusConfirm(false)
      setPendingFormData(null)
    }
    prevOpenRef.current = open
  }, [open, initialData, reset])

  const submitForm = async (data: ZoneGroupFormData) => {
    await onSubmit(data)
  }

  const onFormSubmit = handleSubmit(async (data) => {
    if (mode === 'edit' && initialData && data.status !== initialData.status) {
      setPendingFormData(data)
      setShowStatusConfirm(true)
      return
    }
    await submitForm(data)
  })

  const handleConfirmStatusChange = async () => {
    if (!pendingFormData || isSubmitting) return
    await submitForm(pendingFormData)
    setPendingFormData(null)
    setShowStatusConfirm(false)
  }

  const isDeactivating = pendingFormData?.status === 'INACTIVE'

  return (
    <>
      <Panel open={open} onClose={onClose}>
        <div className="pr-7 mb-3.5">
          <h2 className="text-sm font-semibold text-[#001871] mb-1">
            {mode === 'create' ? 'Tambah Grup Zona' : 'Edit Grup Zona'}
          </h2>
          <p className="text-[11px] text-[#485885]">
            {mode === 'create'
              ? 'Konfigurasi pengelompokan zona dan suhu gudang'
              : 'Ubah konfigurasi grup zona'}
          </p>
        </div>

        {mode === 'edit' && (
          <div className="flex items-start gap-2 bg-[rgba(0,24,113,0.05)] border border-[rgba(0,24,113,0.15)] rounded-lg px-3 py-2.5 mb-3.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#485885"
              strokeWidth="2"
              className="flex-shrink-0 mt-px"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="text-[11px] text-[#485885] leading-snug">
              Kode Grup Zona tidak dapat diubah setelah dibuat.
            </span>
          </div>
        )}

        <PanelBody>
          <Input
            label="Kode *"
            placeholder="cth. ZG-DRY"
            disabled={mode === 'edit'}
            error={errors.code?.message}
            {...register('code')}
          />
          <Input
            label="Nama *"
            placeholder="Nama grup zona"
            error={errors.name?.message}
            {...register('name')}
          />
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Input
                label="Suhu Min (°C)"
                type="number"
                step="any"
                placeholder="Contoh: 2"
                error={errors.temperatureMin?.message}
                {...register('temperatureMin')}
              />
              <p className="text-[10px] text-[#949eb8] mt-1">Batas bawah rentang suhu</p>
            </div>
            <div>
              <Input
                label="Suhu Max (°C)"
                type="number"
                step="any"
                placeholder="Contoh: 8"
                error={errors.temperatureMax?.message}
                {...register('temperatureMax')}
              />
              <p className="text-[10px] text-[#949eb8] mt-1">Batas atas rentang suhu</p>
            </div>
          </div>
          <Select
            label="Mode Putaway default *"
            options={PUTAWAY_MODE_OPTIONS}
            error={errors.defaultPutawayMode?.message}
            {...register('defaultPutawayMode')}
          />
          <TextArea
            label="Handling rules (JSON)"
            placeholder='cth. {"priority":1}'
            rows={4}
            error={errors.handlingRulesJson?.message}
            {...register('handlingRulesJson')}
          />
          <Select
            label="Status *"
            options={STATUS_OPTIONS}
            error={errors.status?.message}
            {...register('status')}
          />
        </PanelBody>

        <PanelFooter
          onCancel={onClose}
          onSubmit={onFormSubmit}
          submitLabel="Simpan"
          loading={isSubmitting}
        />
      </Panel>

      <ConfirmDialog
        open={showStatusConfirm}
        title={isDeactivating ? 'Nonaktifkan Grup Zona' : 'Aktifkan Grup Zona'}
        description={
          isDeactivating
            ? 'Yakin ingin mengubah status menjadi Nonaktif? Grup Zona nonaktif tidak dapat digunakan sebagai induk zona baru.'
            : 'Yakin ingin mengaktifkan kembali Grup Zona ini?'
        }
        confirmLabel={isDeactivating ? 'Nonaktifkan' : 'Aktifkan'}
        cancelLabel="Batal"
        variant={isDeactivating ? 'danger' : 'default'}
        isLoading={isSubmitting}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => {
          setShowStatusConfirm(false)
          setPendingFormData(null)
        }}
      />
    </>
  )
}
