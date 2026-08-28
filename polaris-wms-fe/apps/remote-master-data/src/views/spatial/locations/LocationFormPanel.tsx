import { useEffect, useMemo, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Panel, PanelBody, PanelFooter, Input, Select } from '@polaris/ui'
import {
  defaultLocationFormValues,
  locationFormSchema,
  LOCATION_TYPE_OPTIONS,
  type LocationFormData,
  type SpatialOption,
} from '../../../types/spatial.types'
import { useZoneOptions } from '../../../hooks/useZoneOptions'

const OPTIONS_LOAD_ERROR = 'Gagal memuat Zona'

/** Current parent from location detail — `{ id, code, name }` only. Inactive is inferred from absence in ACTIVE options. */
export type CurrentZoneOption = SpatialOption

export function buildZoneFormOptions(
  options: SpatialOption[],
  mode: 'create' | 'edit',
  currentZone?: SpatialOption | null
): Array<{ value: string; label: string }> {
  const mapped = options.map((zone) => ({
    value: zone.id,
    label: `${zone.code} — ${zone.name}`,
  }))

  if (mode === 'edit' && currentZone && !mapped.some((opt) => opt.value === currentZone.id)) {
    return [
      {
        value: currentZone.id,
        label: `${currentZone.code} — ${currentZone.name} (Nonaktif)`,
      },
      ...mapped,
    ]
  }

  return mapped
}

interface LocationFormPanelProps {
  open: boolean
  mode: 'create' | 'edit'
  initialData?: LocationFormData
  /** Current parent — injected on edit when missing from ACTIVE options (treated as inactive). */
  currentZone?: SpatialOption | null
  onClose: () => void
  onSubmit: (data: LocationFormData) => Promise<void>
}

export function LocationFormPanel({
  open,
  mode,
  initialData,
  currentZone,
  onClose,
  onSubmit,
}: LocationFormPanelProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    clearErrors,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LocationFormData>({
    resolver: zodResolver(locationFormSchema) as never,
    defaultValues: defaultLocationFormValues,
  })

  const prevOpenRef = useRef(false)
  const statusValue = watch('status')

  const {
    data: activeZones,
    isLoading: zonesLoading,
    isError: zonesError,
  } = useZoneOptions()

  const zoneOptions = useMemo(
    () => buildZoneFormOptions(activeZones ?? [], mode, currentZone),
    [activeZones, currentZone, mode]
  )

  const optionsReady = !zonesLoading && !zonesError
  const hasActiveParents = (activeZones?.length ?? 0) > 0
  const showCreateBlocked = mode === 'create' && optionsReady && !hasActiveParents

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      if (mode === 'create') {
        reset({ ...defaultLocationFormValues, status: 'ACTIVE' })
      } else {
        reset(
          initialData
            ? {
                ...initialData,
                name: initialData.name ?? null,
                maxLpnCount: initialData.maxLpnCount ?? null,
                maxWeightKg: initialData.maxWeightKg ?? null,
              }
            : defaultLocationFormValues
        )
      }
    }
    prevOpenRef.current = open
  }, [open, initialData, mode, reset])

  const onFormSubmit = handleSubmit(async (data) => {
    // Create always ACTIVE; edit keeps existing status (read-only in UI).
    const payload: LocationFormData =
      mode === 'create'
        ? { ...data, status: 'ACTIVE' }
        : { ...data, status: initialData?.status ?? data.status }
    await onSubmit(payload)
  })

  return (
    <Panel open={open} onClose={onClose}>
      <div className="pr-7 mb-3.5">
        <h2 className="text-sm font-semibold text-[#001871] mb-1">
          {mode === 'create' ? 'Tambah Lokasi' : 'Edit Lokasi'}
        </h2>
        <p className="text-[11px] text-[#485885]">
          {mode === 'create'
            ? 'Konfigurasi bin/slot di bawah Zona'
            : 'Ubah konfigurasi lokasi (status tidak diubah lewat form ini)'}
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
            Kode Lokasi tidak dapat diubah. Status juga tidak diubah lewat edit — nonaktifkan
            memerlukan validasi Inventory Service; status Diblokir hanya lewat buka/tutup blokir.
          </span>
        </div>
      )}

      {showCreateBlocked ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
          <h3 className="text-sm font-medium text-[#485885] mb-1">Belum ada Zona aktif</h3>
          <p className="text-xs text-[#949eb8] max-w-[280px]">
            Buat Zona aktif terlebih dahulu sebelum membuat Lokasi.
          </p>
        </div>
      ) : (
        <>
          <PanelBody>
            <Controller
              name="zoneId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Zona *"
                  options={[
                    {
                      value: '',
                      label: zonesLoading
                        ? 'Memuat...'
                        : zonesError
                          ? OPTIONS_LOAD_ERROR
                          : '— Pilih Zona —',
                    },
                    ...(zonesLoading || zonesError ? [] : zoneOptions),
                  ]}
                  error={zonesError ? OPTIONS_LOAD_ERROR : errors.zoneId?.message}
                  value={field.value}
                  onChange={(e) => {
                    field.onChange(e.target.value)
                    clearErrors('zoneId')
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  disabled={zonesLoading || zonesError}
                  aria-busy={zonesLoading || undefined}
                  aria-invalid={zonesError || undefined}
                />
              )}
            />
            <Input
              label="Kode *"
              placeholder="cth. LOC-A01-01"
              disabled={mode === 'edit'}
              error={errors.code?.message}
              {...register('code')}
            />
            <Input
              label="Nama"
              placeholder="Opsional"
              error={errors.name?.message}
              {...register('name')}
            />
            <Select
              label="Tipe lokasi *"
              options={LOCATION_TYPE_OPTIONS}
              error={errors.locationType?.message}
              {...register('locationType')}
            />
            <Input
              label="Urutan *"
              type="number"
              step="1"
              placeholder="0"
              error={errors.sequence?.message}
              {...register('sequence')}
            />
            <div className="grid grid-cols-2 gap-2.5">
              <Input
                label="Max jumlah LPN"
                type="number"
                step="1"
                placeholder="opsional"
                error={errors.maxLpnCount?.message}
                {...register('maxLpnCount')}
              />
              <Input
                label="Max berat (kg)"
                type="number"
                step="any"
                placeholder="opsional"
                error={errors.maxWeightKg?.message}
                {...register('maxWeightKg')}
              />
            </div>
            {mode === 'create' ? (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-[#485885]">Status</label>
                <div className="border border-[#ebebeb] rounded-lg px-[11px] py-[7px] text-[13px] text-[#485885] bg-[#fafbfd]">
                  Aktif — default (perubahan status ditunda)
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-[#485885]">Status</label>
                <div className="border border-[#ebebeb] rounded-lg px-[11px] py-[7px] text-[13px] text-[#485885] bg-[#fafbfd]">
                  {statusValue === 'INACTIVE' ? 'Nonaktif' : 'Aktif'}
                  <span className="text-[11px] text-[#949eb8] ml-1">(hanya baca)</span>
                </div>
              </div>
            )}
          </PanelBody>

          <PanelFooter
            onCancel={onClose}
            onSubmit={onFormSubmit}
            submitLabel="Simpan"
            loading={isSubmitting}
          />
        </>
      )}
    </Panel>
  )
}
