import { useEffect, useMemo, useRef } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Panel,
  PanelBody,
  PanelFooter,
  Input,
  Select,
  Button,
  Loading,
  AddButton,
} from '@polaris/ui'
import {
  defaultEaLevel,
  defaultUomHierarchyFormValues,
  uomHierarchyFormSchema,
  UOM_STATUS_OPTIONS,
  type UomCodeOption,
  type UomHierarchyFormData,
  type UomLevelFormData,
} from '../../types/uom.types'
import { useUomCodeOptions } from '../../hooks/useUoms'
import { resolveOwnerContextMode } from './ownerContext'

const STATUS_OPTIONS = UOM_STATUS_OPTIONS.map((opt) => ({
  value: opt.value,
  label: opt.label,
}))

const NON_EA_LEVELS = [2, 3, 4, 5] as const
const MAX_LEVELS = 5

export interface UomFormPanelProps {
  open: boolean
  mode: 'create' | 'edit'
  /**
   * Owner scope from session. Same semantics as UomPage:
   * null/undefined = free-text; [] = no access; ids = scoped.
   */
  ownerContextIds?: string[] | null
  initialData?: UomHierarchyFormData
  onClose: () => void
  onSubmit: (data: UomHierarchyFormData) => Promise<void>
}

function cloneFormValues(data?: UomHierarchyFormData): UomHierarchyFormData {
  if (data) {
    return {
      ...data,
      levels: data.levels.map((level) => ({ ...level })),
    }
  }

  return {
    ...defaultUomHierarchyFormValues,
    levels: [{ ...defaultEaLevel }],
  }
}

function resolveCodeOptionsError(error: unknown): string {
  const apiError = error as { message?: string; errorMessage?: string[] }
  return (
    apiError?.errorMessage?.[0] ||
    apiError?.message ||
    'Gagal memuat Master Code UOM. Silakan coba lagi.'
  )
}

/** Sort by level and wire parentUomCode to the previous level. Does not renumber levels. */
export function syncLevelParents(levels: UomLevelFormData[]): UomLevelFormData[] {
  const sorted = [...levels].sort((left, right) => left.level - right.level)

  return sorted.map((level, index) => {
    if (level.uomCode === 'EA' || index === 0) {
      return { ...level, parentUomCode: null }
    }

    const parentCode = sorted[index - 1]?.uomCode?.trim()
    return {
      ...level,
      parentUomCode: parentCode ? parentCode : null,
    }
  })
}

function nextAvailableLevel(levels: UomLevelFormData[]): number | null {
  const used = new Set(levels.map((level) => level.level))
  return NON_EA_LEVELS.find((level) => !used.has(level)) ?? null
}

/** Exported for regression tests — blank/zero/non-increasing child → em dash. */
export function previewFactorToParent(
  factor: number | string | null | undefined,
  parentFactor: number | string | null | undefined
): string {
  if (factor === null || factor === undefined) return '—'
  if (typeof factor === 'string' && factor.trim() === '') return '—'

  const child = typeof factor === 'number' ? factor : Number(factor)
  const parent = typeof parentFactor === 'number' ? parentFactor : Number(parentFactor)
  if (!Number.isFinite(child) || !Number.isFinite(parent) || parent <= 0) return '—'
  // Blank inputs coerce to 0 via Number(''); treat non-positive / non-increasing as unavailable.
  if (child <= 0 || child <= parent) return '—'
  if (child % parent !== 0) return '—'
  return String(child / parent)
}

function buildUomCodeOptions(
  codeOptions: UomCodeOption[] | undefined,
  levels: UomLevelFormData[],
  rowIndex: number
): Array<{ value: string; label: string }> {
  const currentCode = levels[rowIndex]?.uomCode ?? ''
  const used = new Set(
    levels
      .map((level, index) => (index === rowIndex ? '' : level.uomCode))
      .filter((code) => code && code !== 'EA')
  )

  const availableCodes = new Set((codeOptions ?? []).map((option) => option.code))
  const options = (codeOptions ?? [])
    .filter((option) => option.code !== 'EA')
    .filter((option) => !used.has(option.code) || option.code === currentCode)
    .map((option) => ({
      value: option.code,
      label: `${option.code} — ${option.name}`,
    }))

  // Keep unsupported current code visible so the user can see and replace it.
  if (
    currentCode &&
    currentCode !== 'EA' &&
    !availableCodes.has(currentCode) &&
    !options.some((option) => option.value === currentCode)
  ) {
    options.unshift({
      value: currentCode,
      label: `${currentCode} — tidak tersedia untuk Owner ini`,
    })
  }

  return [{ value: '', label: 'Pilih UOM' }, ...options]
}

/** Offer the row's own level plus the free ones — a taken level must not be reassigned. */
export function buildLevelOptions(
  levels: UomLevelFormData[],
  rowIndex: number
): Array<{ value: string; label: string }> {
  const currentLevel = levels[rowIndex]?.level
  const taken = new Set(
    levels.filter((_, index) => index !== rowIndex).map((level) => level.level)
  )

  const options = NON_EA_LEVELS.filter(
    (level) => level === currentLevel || !taken.has(level)
  ).map((level) => ({ value: String(level), label: String(level) }))

  // Keep an out-of-range level visible so the user can see and correct it.
  if (currentLevel && !NON_EA_LEVELS.some((level) => level === currentLevel)) {
    options.unshift({ value: String(currentLevel), label: String(currentLevel) })
  }

  return options
}

function isUnsupportedSelectedCode(
  code: string,
  codeOptions: UomCodeOption[] | undefined,
  optionsReady: boolean
): boolean {
  if (!optionsReady) return false
  const trimmed = code?.trim() ?? ''
  if (!trimmed || trimmed === 'EA') return false
  return !(codeOptions ?? []).some((option) => option.code === trimmed)
}

export function UomFormPanel({
  open,
  mode,
  ownerContextIds,
  initialData,
  onClose,
  onSubmit,
}: UomFormPanelProps) {
  const { mode: ownerMode, options: ownerOptions } = useMemo(
    () => resolveOwnerContextMode(ownerContextIds),
    [ownerContextIds]
  )
  const createOwnerBlocked = mode === 'create' && ownerMode === 'none'

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UomHierarchyFormData>({
    resolver: zodResolver(uomHierarchyFormSchema) as never,
    defaultValues: cloneFormValues(),
  })

  const { fields, replace } = useFieldArray({
    control,
    name: 'levels',
    keyName: 'fieldKey',
  })

  const prevOpenRef = useRef(false)
  const displayNameTouchedRef = useRef(false)

  const ownerId = watch('ownerId')
  const levels = watch('levels') ?? []

  const formEaIndex = levels.findIndex((level) => level.uomCode === 'EA')
  const formEaMissing = formEaIndex < 0
  const eaPath = formEaMissing ? null : (`levels.${formEaIndex}` as const)

  const {
    data: codeOptions,
    isLoading: codeOptionsLoading,
    isError: codeOptionsIsError,
    error: codeOptionsError,
    refetch: refetchCodeOptions,
    isFetching: codeOptionsFetching,
  } = useUomCodeOptions(ownerId)

  const eaOption = codeOptions?.find((option) => option.code === 'EA')
  const masterEaMissing =
    !codeOptionsLoading && !codeOptionsIsError && Array.isArray(codeOptions) && !eaOption
  const codeOptionsReady =
    !codeOptionsLoading && !codeOptionsIsError && Array.isArray(codeOptions)

  const usedNonEaCodes = new Set(
    levels.map((level) => level.uomCode).filter((code) => code && code !== 'EA')
  )
  const availableCodesForAdd = (codeOptions ?? []).filter(
    (option) => option.code !== 'EA' && !usedNonEaCodes.has(option.code)
  )
  const nextLevel = nextAvailableLevel(levels)
  const canAddLevel =
    !createOwnerBlocked &&
    !formEaMissing &&
    !codeOptionsLoading &&
    !codeOptionsIsError &&
    !masterEaMissing &&
    levels.length < MAX_LEVELS &&
    nextLevel !== null &&
    availableCodesForAdd.length > 0

  const hasUnsupportedCodes = levels.some((level) =>
    isUnsupportedSelectedCode(level.uomCode, codeOptions, codeOptionsReady)
  )
  // Create needs Master Code EA + healthy options. Edit keeps locked EA in form state,
  // so Master Code/query failures must not block INACTIVE / hierarchy saves.
  const formBlocked =
    createOwnerBlocked ||
    formEaMissing ||
    hasUnsupportedCodes ||
    (mode === 'create'
      ? codeOptionsLoading || codeOptionsIsError || masterEaMissing
      : codeOptionsLoading)

  /** Row count changed. replace() regenerates every fieldKey, so rows remount. */
  const applyLevels = (nextLevels: UomLevelFormData[]) => {
    replace(syncLevelParents(nextLevels))
  }

  /**
   * Same rows, new values. Going through replace() here would remount every row
   * and throw the panel's scroll and focus back to the first level.
   */
  const writeLevels = (nextLevels: UomLevelFormData[]) => {
    syncLevelParents(nextLevels).forEach((level, index) => {
      setValue(`levels.${index}` as 'levels.0', level, { shouldDirty: true })
    })
  }

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      displayNameTouchedRef.current = false
      const values = cloneFormValues(initialData)
      // Seed Owner into RHF state on open — disabled UI alone is not enough for submit.
      if (mode === 'create' && ownerMode === 'single') {
        values.ownerId = ownerOptions[0] ?? ''
      }
      reset(values)
    }
    prevOpenRef.current = open
  }, [open, initialData, reset, mode, ownerMode, ownerOptions])

  // Prefill EA display name from Master Code without overwriting user edits.
  useEffect(() => {
    if (!open || mode !== 'create' || formEaMissing || !eaPath) return
    if (displayNameTouchedRef.current) return
    if (!eaOption?.name) return

    setValue(`${eaPath}.displayName` as 'levels.0.displayName', eaOption.name, {
      shouldDirty: false,
      shouldValidate: false,
    })
  }, [open, mode, formEaMissing, eaPath, eaOption?.name, setValue])

  const handleCreateOwnerChange = (nextOwnerId: string) => {
    setValue('ownerId', nextOwnerId, { shouldDirty: true, shouldValidate: true })
    // UOM_GROUP options refresh via useUomCodeOptions(ownerId). Unsupported level
    // codes are revalidated by hasUnsupportedCodes — do not wipe SKU/hierarchy.
  }

  const handleAddLevel = () => {
    if (!canAddLevel || nextLevel === null) return
    const current = getValues('levels') ?? []
    applyLevels([
      ...current,
      {
        id: '',
        uomCode: '',
        displayName: '',
        level: nextLevel,
        // Empty until user fills — Zod rejects on submit.
        conversionFactorToEa: '' as unknown as number,
        parentUomCode: null,
        status: 'ACTIVE',
      },
    ])
  }

  const handleRemoveLevel = (index: number) => {
    const current = getValues('levels') ?? []
    if (current[index]?.uomCode === 'EA') return
    applyLevels(current.filter((_, rowIndex) => rowIndex !== index))
  }

  const handleLevelNumberChange = (index: number, rawValue: string) => {
    const nextLevelValue = Number(rawValue)
    if (!Number.isFinite(nextLevelValue)) return

    const current = [...(getValues('levels') ?? [])]
    if (current[index]?.level === nextLevelValue) return
    // Taken levels are not offered, so a collision means stale input — never swap silently.
    const taken = current.some(
      (level, rowIndex) => rowIndex !== index && level.level === nextLevelValue
    )
    if (taken) return

    current[index] = { ...current[index], level: nextLevelValue }
    writeLevels(current)
  }

  const handleUomCodeChange = (index: number, code: string) => {
    const option = codeOptions?.find((item) => item.code === code)

    setValue(`levels.${index}.uomCode` as 'levels.0.uomCode', code, { shouldDirty: true })
    setValue(
      `levels.${index}.displayName` as 'levels.0.displayName',
      code ? option?.name ?? '' : '',
      { shouldDirty: true }
    )

    // Levels are kept in ascending order, so only the row below inherits this code.
    const current = getValues('levels') ?? []
    const childIndex = index + 1
    if (childIndex < current.length) {
      setValue(
        `levels.${childIndex}.parentUomCode` as 'levels.0.parentUomCode',
        code ? code : null,
        { shouldDirty: true }
      )
    }
  }

  const submitForm = handleSubmit(async (data) => {
    if (formBlocked) return
    await onSubmit(data)
  })

  const levelErrors = errors.levels
  const eaFieldErrors =
    !formEaMissing && Array.isArray(levelErrors) ? levelErrors[formEaIndex] : undefined
  const levelsRootError =
    levelErrors && !Array.isArray(levelErrors) && 'message' in levelErrors
      ? String(levelErrors.message)
      : undefined

  const eaUomCode = eaPath ? watch(`${eaPath}.uomCode` as 'levels.0.uomCode') : undefined
  const eaLevel = eaPath ? watch(`${eaPath}.level` as 'levels.0.level') : undefined
  const eaFactor = eaPath
    ? watch(`${eaPath}.conversionFactorToEa` as 'levels.0.conversionFactorToEa')
    : undefined
  const eaStatus = eaPath ? watch(`${eaPath}.status` as 'levels.0.status') : undefined

  const createOwnerSelectOptions = [
    { value: '', label: 'Pilih Owner' },
    ...ownerOptions.map((id) => ({ value: id, label: id })),
  ]

  return (
    <Panel open={open} onClose={onClose}>
      <div className="pr-7 mb-3.5">
        <h2 className="text-sm font-semibold text-[#001871] mb-1">
          {mode === 'create' ? 'Tambah Hierarki UOM' : 'Edit Hierarki UOM'}
        </h2>
        <p className="text-[11px] text-[#485885]">
          {mode === 'create'
            ? 'Konfigurasi hierarki kemasan per Owner dan SKU'
            : 'Ubah konfigurasi hierarki kemasan'}
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
            Owner dan SKU tidak dapat diubah setelah hierarki dibuat.
          </span>
        </div>
      )}

      {createOwnerBlocked && (
        <div className="flex items-start gap-2 bg-[rgba(239,51,64,0.06)] border border-[rgba(239,51,64,0.2)] rounded-lg px-3 py-2.5 mb-3.5">
          <span className="text-[11px] text-[#ef3340] leading-snug">
            User belum memiliki akses Owner.
          </span>
        </div>
      )}

      <PanelBody>
        {mode === 'edit' ? (
          <>
            <input type="hidden" {...register('ownerId')} />
            <Input label="Owner ID *" value={ownerId || ''} disabled readOnly />
            <input type="hidden" {...register('skuCode')} />
            <Input label="SKU *" value={watch('skuCode') || ''} disabled readOnly />
          </>
        ) : createOwnerBlocked ? (
          <>
            <input type="hidden" {...register('ownerId')} />
            <Input label="Owner ID *" value="" disabled readOnly />
            <Input
              label="SKU *"
              placeholder="cth. SKU-001"
              error={errors.skuCode?.message}
              disabled
              {...register('skuCode')}
            />
          </>
        ) : ownerMode === 'single' ? (
          <>
            <input type="hidden" {...register('ownerId')} />
            <Input
              label="Owner ID *"
              value={ownerId || ownerOptions[0] || ''}
              disabled
              readOnly
              error={errors.ownerId?.message}
            />
            <Input
              label="SKU *"
              placeholder="cth. SKU-001"
              error={errors.skuCode?.message}
              {...register('skuCode')}
            />
          </>
        ) : ownerMode === 'multi' ? (
          <>
            <Select
              label="Owner ID *"
              aria-label="Owner ID"
              options={createOwnerSelectOptions}
              error={errors.ownerId?.message}
              value={ownerId || ''}
              onChange={(event) => handleCreateOwnerChange(event.target.value)}
            />
            <Input
              label="SKU *"
              placeholder="cth. SKU-001"
              error={errors.skuCode?.message}
              {...register('skuCode')}
            />
          </>
        ) : (
          <>
            <Input
              label="Owner ID *"
              placeholder="ID Owner"
              error={errors.ownerId?.message}
              {...register('ownerId')}
            />
            <Input
              label="SKU *"
              placeholder="cth. SKU-001"
              error={errors.skuCode?.message}
              {...register('skuCode')}
            />
          </>
        )}

        <Select
          label="Status *"
          options={STATUS_OPTIONS}
          error={errors.status?.message}
          disabled={createOwnerBlocked}
          {...register('status')}
        />

        <div className="border border-[#f1f3f8] rounded-lg px-3 py-3 bg-[#f8f9fc]">
          <div className="text-[11px] font-semibold text-[#001871] mb-2.5">
            Level dasar (EA)
          </div>

          {codeOptionsLoading ? (
            <div className="flex items-center gap-2 py-3">
              <Loading size="sm" />
              <span className="text-[12px] text-[#485885]">Memuat Master Code UOM…</span>
            </div>
          ) : codeOptionsIsError ? (
            <div className="flex flex-col gap-2 py-1">
              <p className="text-[12px] text-[#ef3340] leading-snug">
                {resolveCodeOptionsError(codeOptionsError)}
              </p>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={codeOptionsFetching}
                  onClick={() => refetchCodeOptions()}
                >
                  {codeOptionsFetching ? 'Memuat...' : 'Coba lagi'}
                </Button>
              </div>
            </div>
          ) : masterEaMissing ? (
            <p className="text-[12px] text-[#ef3340] leading-snug py-1">
              Kode EA tidak ditemukan di Master Code UOM_GROUP untuk Owner ini. Pastikan detail
              EA aktif tersedia (global atau khusus Owner).
            </p>
          ) : formEaMissing ? (
            <p className="text-[12px] text-[#ef3340] leading-snug py-1">
              Hierarki tidak memiliki level EA. Data tidak valid — perbaiki data atau buat ulang
              hierarki.
            </p>
          ) : eaPath ? (
            <>
              {/* Locked EA values — keep in RHF via hidden inputs (disabled fields omit on submit). */}
              <input type="hidden" {...register(`${eaPath}.id` as 'levels.0.id')} />
              <input type="hidden" {...register(`${eaPath}.uomCode` as 'levels.0.uomCode')} />
              <input
                type="hidden"
                {...register(`${eaPath}.level` as 'levels.0.level', { valueAsNumber: true })}
              />
              <input
                type="hidden"
                {...register(`${eaPath}.conversionFactorToEa` as 'levels.0.conversionFactorToEa', {
                  valueAsNumber: true,
                })}
              />
              <input
                type="hidden"
                {...register(`${eaPath}.parentUomCode` as 'levels.0.parentUomCode')}
              />
              <input type="hidden" {...register(`${eaPath}.status` as 'levels.0.status')} />

              <div className="flex flex-col gap-[13px]">
                <Input label="Kode UOM" value={eaUomCode || 'EA'} disabled readOnly />
                <Input
                  label="Nama tampilan *"
                  placeholder="cth. Each"
                  error={eaFieldErrors?.displayName?.message}
                  {...register(`${eaPath}.displayName` as 'levels.0.displayName', {
                    onChange: () => {
                      displayNameTouchedRef.current = true
                    },
                  })}
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <Input label="Level" value={String(eaLevel ?? 1)} disabled readOnly />
                  <Input
                    label="Faktor ke EA"
                    value={String(eaFactor ?? 1)}
                    disabled
                    readOnly
                  />
                </div>
                <Input label="Parent UOM" value="—" disabled readOnly />
                <Input
                  label="Status level"
                  value={eaStatus === 'INACTIVE' ? 'Nonaktif' : 'Aktif'}
                  disabled
                  readOnly
                />
              </div>
            </>
          ) : null}

          {levelsRootError && (
            <p className="text-[11px] text-[#ef3340] mt-2">{levelsRootError}</p>
          )}
        </div>

        {!formEaMissing &&
          fields.map((field, index) => {
            const row = levels[index]
            if (!row || row.uomCode === 'EA') return null

            const rowErrors = Array.isArray(levelErrors) ? levelErrors[index] : undefined
            const unsupportedCode = isUnsupportedSelectedCode(
              row.uomCode,
              codeOptions,
              codeOptionsReady
            )
            const uomCodeError = unsupportedCode
              ? `Kode UOM ${row.uomCode} tidak tersedia untuk Owner ini`
              : rowErrors?.uomCode?.message
            const parent = levels.find((level) => level.uomCode === row.parentUomCode)
            const factorPreview = previewFactorToParent(
              row.conversionFactorToEa,
              parent?.conversionFactorToEa
            )

            return (
              <div
                key={field.fieldKey}
                className="border border-[#f1f3f8] rounded-lg px-3 py-3 bg-white"
                data-testid={`uom-level-row-${index}`}
              >
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="text-[11px] font-semibold text-[#001871]">
                    Level kemasan {row.level || '—'}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveLevel(index)}
                    className="text-[11px] font-medium text-[#ef3340] cursor-pointer hover:underline"
                  >
                    Hapus
                  </button>
                </div>

                <div className="flex flex-col gap-[13px]">
                  <input type="hidden" {...register(`levels.${index}.id` as 'levels.0.id')} />
                  <input
                    type="hidden"
                    {...register(`levels.${index}.parentUomCode` as 'levels.0.parentUomCode')}
                  />

                  <Select
                    label="Kode UOM *"
                    options={buildUomCodeOptions(codeOptions, levels, index)}
                    error={uomCodeError}
                    value={row.uomCode || ''}
                    onChange={(event) => handleUomCodeChange(index, event.target.value)}
                  />
                  <Input
                    label="Nama tampilan *"
                    placeholder="Nama tampilan"
                    error={rowErrors?.displayName?.message}
                    value={row.displayName ?? ''}
                    onChange={(event) => {
                      setValue(
                        `levels.${index}.displayName` as 'levels.0.displayName',
                        event.target.value,
                        { shouldDirty: true, shouldValidate: true }
                      )
                    }}
                  />
                  <div className="grid grid-cols-2 gap-2.5">
                    <Select
                      label="Level *"
                      options={buildLevelOptions(levels, index)}
                      error={rowErrors?.level?.message}
                      value={row.level ? String(row.level) : ''}
                      onChange={(event) => handleLevelNumberChange(index, event.target.value)}
                    />
                    <Input
                      label="Faktor ke EA *"
                      type="number"
                      min={1}
                      step={1}
                      placeholder="cth. 12"
                      error={rowErrors?.conversionFactorToEa?.message}
                      {...register(`levels.${index}.conversionFactorToEa` as 'levels.0.conversionFactorToEa', {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  <Input
                    label="Parent UOM"
                    value={row.parentUomCode || '—'}
                    disabled
                    readOnly
                    error={rowErrors?.parentUomCode?.message}
                  />
                  <Input
                    label="Faktor ke parent"
                    value={factorPreview}
                    disabled
                    readOnly
                  />
                  <Select
                    label="Status level *"
                    options={STATUS_OPTIONS}
                    error={rowErrors?.status?.message}
                    {...register(`levels.${index}.status` as 'levels.0.status')}
                  />
                </div>
              </div>
            )
          })}

        <div className="flex items-center justify-between gap-2 pt-1">
          <AddButton
            type="button"
            label="Tambah Level"
            disabled={!canAddLevel}
            onClick={handleAddLevel}
            className={!canAddLevel ? 'opacity-50 pointer-events-none' : undefined}
          />
          <span className="text-[11px] text-[#a9b1c6]">
            {levels.length}/{MAX_LEVELS} level
          </span>
        </div>
      </PanelBody>

      <PanelFooter>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-[#f1f3f8] text-[#1f2b59] border-none rounded-lg py-[7px] text-[13px] font-medium cursor-pointer hover:bg-[#d9dde6] transition-colors"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={submitForm}
          disabled={isSubmitting || formBlocked}
          className="flex-[2] bg-[#001871] text-white border-none rounded-lg py-[7px] text-[13px] font-medium cursor-pointer hover:bg-[#00206d] transition-colors disabled:opacity-60"
        >
          {isSubmitting ? 'Menyimpan...' : 'Simpan'}
        </button>
      </PanelFooter>
    </Panel>
  )
}
