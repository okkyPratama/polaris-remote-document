import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Panel,
  PanelBody,
  PanelFooter,
  Input,
  Select,
  MultiSelect,
  ConfirmDialog,
  type MultiSelectOption,
} from '@polaris/ui'
import {
  defaultZoneFormValues,
  zoneFormSchema,
  ZONE_ACTIVITY_OPTIONS,
  SPATIAL_STATUS_OPTIONS,
  type SpatialOption,
  type ZoneFormData,
  type ZoneActivity,
} from '../../../types/spatial.types'
import { useZoneGroupOptions } from '../../../hooks/useZoneGroupOptions'

const STATUS_OPTIONS = SPATIAL_STATUS_OPTIONS.map((opt) => ({
  value: opt.value,
  label: opt.label,
}))

const ACTIVITY_OPTIONS: MultiSelectOption[] = ZONE_ACTIVITY_OPTIONS.map((opt) => ({
  value: opt.value,
  label: opt.label,
}))

const OPTIONS_LOAD_ERROR = 'Gagal memuat Grup Zona'

/** Current parent from zone detail — `{ id, code, name }` only. Inactive is inferred from absence in ACTIVE options. */
export type CurrentZoneGroupOption = SpatialOption

export function buildZoneGroupFormOptions(
  options: SpatialOption[],
  mode: 'create' | 'edit',
  currentZoneGroup?: SpatialOption | null
): Array<{ value: string; label: string }> {
  const mapped = options.map((zg) => ({
    value: zg.id,
    label: `${zg.code} — ${zg.name}`,
  }))

  if (
    mode === 'edit' &&
    currentZoneGroup &&
    !mapped.some((opt) => opt.value === currentZoneGroup.id)
  ) {
    return [
      {
        value: currentZoneGroup.id,
        label: `${currentZoneGroup.code} — ${currentZoneGroup.name} (Nonaktif)`,
      },
      ...mapped,
    ]
  }

  return mapped
}

interface ZoneFormPanelProps {
  open: boolean
  mode: 'create' | 'edit'
  initialData?: ZoneFormData
  /** Current parent — injected on edit when missing from ACTIVE options (treated as inactive). */
  currentZoneGroup?: SpatialOption | null
  onClose: () => void
  onSubmit: (data: ZoneFormData) => Promise<void>
}

export function ZoneFormPanel({
  open,
  mode,
  initialData,
  currentZoneGroup,
  onClose,
  onSubmit,
}: ZoneFormPanelProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ZoneFormData>({
    resolver: zodResolver(zoneFormSchema) as never,
    defaultValues: defaultZoneFormValues,
  })

  const [showStatusConfirm, setShowStatusConfirm] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<ZoneFormData | null>(null)
  const prevOpenRef = useRef(false)

  const {
    data: activeZoneGroups,
    isLoading: zoneGroupsLoading,
    isError: zoneGroupsError,
  } = useZoneGroupOptions()

  const zoneGroupOptions = useMemo(
    () => buildZoneGroupFormOptions(activeZoneGroups ?? [], mode, currentZoneGroup),
    [activeZoneGroups, currentZoneGroup, mode]
  )

  const optionsReady = !zoneGroupsLoading && !zoneGroupsError
  const hasActiveParents = (activeZoneGroups?.length ?? 0) > 0
  const showCreateBlocked = mode === 'create' && optionsReady && !hasActiveParents

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      reset(initialData ?? defaultZoneFormValues)
      setShowStatusConfirm(false)
      setPendingFormData(null)
    }
    prevOpenRef.current = open
  }, [open, initialData, reset])

  const submitForm = async (data: ZoneFormData) => {
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
            {mode === 'create' ? 'Tambah Zona' : 'Edit Zona'}
          </h2>
          <p className="text-[11px] text-[#485885]">
            {mode === 'create'
              ? 'Konfigurasi zona operasional di bawah Grup Zona'
              : 'Ubah konfigurasi zona'}
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
              Kode Zona tidak dapat diubah setelah dibuat.
            </span>
          </div>
        )}

        {showCreateBlocked ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <h3 className="text-sm font-medium text-[#485885] mb-1">Belum ada Grup Zona aktif</h3>
            <p className="text-xs text-[#949eb8] max-w-[280px]">
              Buat Grup Zona aktif terlebih dahulu sebelum membuat Zona.
            </p>
          </div>
        ) : (
          <>
            <PanelBody>
              <Controller
                name="zoneGroupId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Grup Zona *"
                    options={[
                      {
                        value: '',
                        label: zoneGroupsLoading
                          ? 'Memuat...'
                          : zoneGroupsError
                            ? OPTIONS_LOAD_ERROR
                            : '— Pilih Grup Zona —',
                      },
                      ...(zoneGroupsLoading || zoneGroupsError ? [] : zoneGroupOptions),
                    ]}
                    error={zoneGroupsError ? OPTIONS_LOAD_ERROR : errors.zoneGroupId?.message}
                    value={field.value}
                    onChange={(e) => {
                      field.onChange(e.target.value)
                      clearErrors('zoneGroupId')
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    disabled={zoneGroupsLoading || zoneGroupsError}
                    aria-busy={zoneGroupsLoading || undefined}
                    aria-invalid={zoneGroupsError || undefined}
                  />
                )}
              />
              <Input
                label="Kode *"
                placeholder="cth. ZN-A01"
                disabled={mode === 'edit'}
                error={errors.code?.message}
                {...register('code')}
              />
              <Input
                label="Nama *"
                placeholder="Nama zona"
                error={errors.name?.message}
                {...register('name')}
              />
              <Controller
                name="allowedActivities"
                control={control}
                render={({ field }) => (
                  <MultiSelect
                    label="Aktivitas yang diizinkan"
                    placeholder="— Opsional —"
                    options={ACTIVITY_OPTIONS}
                    value={field.value}
                    onChange={(next) => {
                      // MultiSelect toggles unique values; cast to ZoneActivity[].
                      field.onChange(next as ZoneActivity[])
                    }}
                    error={
                      errors.allowedActivities?.message ||
                      errors.allowedActivities?.root?.message ||
                      (Array.isArray(errors.allowedActivities)
                        ? errors.allowedActivities.find((item) => item?.message)?.message
                        : undefined)
                    }
                  />
                )}
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
          </>
        )}
      </Panel>

      <ConfirmDialog
        open={showStatusConfirm}
        title={isDeactivating ? 'Nonaktifkan Zona' : 'Aktifkan Zona'}
        description={
          isDeactivating
            ? 'Yakin ingin mengubah status menjadi Nonaktif? Zona nonaktif tidak tersedia untuk operasi baru.'
            : 'Yakin ingin mengaktifkan kembali Zona ini?'
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
