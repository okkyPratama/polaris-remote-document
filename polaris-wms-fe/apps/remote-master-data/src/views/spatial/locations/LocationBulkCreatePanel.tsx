import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Panel, PanelBody, PanelFooter } from '@polaris/ui'
import { extractLocationBulkFailure } from '../../../api/location.api'
import {
  createEmptyBulkItem,
  locationBulkFormSchema,
  LOCATION_TYPE_OPTIONS,
  locationTypeLabel,
  type LocationBulkItem,
  type LocationBulkRowError,
} from '../../../types/spatial.types'
import { useZoneOptions } from '../../../hooks/useZoneOptions'

const OPTIONS_LOAD_ERROR = 'Gagal memuat Zona'

type Step = 'edit' | 'preview'

interface LocationBulkCreatePanelProps {
  open: boolean
  onClose: () => void
  onSubmit: (items: LocationBulkItem[]) => Promise<void>
  isSubmitting?: boolean
}

type FieldErrors = Record<string, string>

function fieldKey(rowIndex: number, field: string) {
  return `${rowIndex}.${field}`
}

function validateItems(items: LocationBulkItem[]): FieldErrors {
  const result = locationBulkFormSchema.safeParse({ items })
  const errors: FieldErrors = {}
  if (result.success) return errors

  for (const issue of result.error.issues) {
    const path = issue.path
    if (path[0] === 'items' && typeof path[1] === 'number' && typeof path[2] === 'string') {
      errors[fieldKey(path[1], path[2])] = issue.message
    } else if (path[0] === 'items') {
      errors.batch = issue.message
    }
  }
  return errors
}

export function LocationBulkCreatePanel({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
}: LocationBulkCreatePanelProps) {
  const [step, setStep] = useState<Step>('edit')
  const [items, setItems] = useState<LocationBulkItem[]>([createEmptyBulkItem()])
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [rowErrors, setRowErrors] = useState<LocationBulkRowError[]>([])
  const [batchMessage, setBatchMessage] = useState<string | null>(null)
  const prevOpenRef = useRef(false)

  const {
    data: activeZones,
    isLoading: zonesLoading,
    isError: zonesError,
  } = useZoneOptions()

  const zoneOptions = useMemo(
    () =>
      (activeZones ?? []).map((zone) => ({
        value: zone.id,
        label: `${zone.code} — ${zone.name}`,
      })),
    [activeZones]
  )

  const zoneLabelById = useMemo(() => {
    const map = new Map<string, string>()
    zoneOptions.forEach((opt) => map.set(opt.value, opt.label))
    return map
  }, [zoneOptions])

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setStep('edit')
      setItems([createEmptyBulkItem()])
      setFieldErrors({})
      setRowErrors([])
      setBatchMessage(null)
    }
    prevOpenRef.current = open
  }, [open])

  const updateItem = (index: number, patch: Partial<LocationBulkItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
    setFieldErrors((prev) => {
      const next = { ...prev }
      Object.keys(patch).forEach((field) => {
        delete next[fieldKey(index, field)]
      })
      delete next.batch
      return next
    })
    setRowErrors([])
  }

  const addRow = () => {
    if (isSubmitting) return
    setItems((prev) => [...prev, createEmptyBulkItem(prev[0]?.zoneId || '')])
    setRowErrors([])
  }

  const removeRow = (index: number) => {
    if (isSubmitting) return
    setItems((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, i) => i !== index)
    })
    setFieldErrors({})
    setRowErrors([])
  }

  const goPreview = () => {
    if (isSubmitting) return
    const errors = validateItems(items)
    setFieldErrors(errors)
    setRowErrors([])
    setBatchMessage(null)
    if (Object.keys(errors).length > 0) return
    setStep('preview')
  }

  const handleSubmit = async () => {
    if (isSubmitting) return
    const errors = validateItems(items)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setStep('edit')
      return
    }
    try {
      await onSubmit(items)
      setRowErrors([])
      setBatchMessage(null)
    } catch (err) {
      const failure = extractLocationBulkFailure(err)
      setBatchMessage(failure.message)
      setRowErrors(failure.errors)
      setStep('edit')
    }
  }

  const rowErrorByIndex = useMemo(() => {
    const map = new Map<number, LocationBulkRowError>()
    rowErrors.forEach((err) => map.set(err.index, err))
    return map
  }, [rowErrors])

  if (!open) return null

  const optionsReady = !zonesLoading && !zonesError
  const hasActiveZones = zoneOptions.length > 0
  const zoneSelectDisabled = isSubmitting || zonesLoading || zonesError

  return (
    <Panel open={open} onClose={onClose} width="min(720px, 58%)" className="min-w-[420px]">
      <div className="pr-7 mb-3.5">
        <h2 className="text-sm font-semibold text-[#001871] mb-1">Buat Lokasi Massal</h2>
        <p className="text-[11px] text-[#485885]">
          {step === 'edit'
            ? 'Tambah beberapa Lokasi sekaligus. Semua baris dibuat dengan status Aktif.'
            : 'Pratinjau baris yang akan dikirim. Tidak ada keberhasilan parsial — gagal satu, gagal semua.'}
        </p>
      </div>

      {optionsReady && !hasActiveZones ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
          <h3 className="text-sm font-medium text-[#485885] mb-1">Belum ada Zona aktif</h3>
          <p className="text-xs text-[#949eb8] max-w-[280px]">
            Buat Zona aktif terlebih dahulu sebelum membuat Lokasi secara massal.
          </p>
        </div>
      ) : (
        <>
          {batchMessage && (
            <div className="mb-3.5 rounded-lg border border-[rgba(239,51,64,0.2)] bg-[rgba(239,51,64,0.06)] px-3 py-2.5">
              <p className="text-[12px] font-medium text-[#ef3340] mb-0.5">{batchMessage}</p>
              <p className="text-[11px] text-[#485885]">
                Tidak ada data yang dibuat.
              </p>
            </div>
          )}

          {fieldErrors.batch && (
            <p className="text-[11px] text-[#ef3340] mb-2">{fieldErrors.batch}</p>
          )}

          {step === 'edit' ? (
            <PanelBody className="gap-3">
              <div className="flex flex-col gap-3">
                {items.map((item, index) => {
                  const backendErr = rowErrorByIndex.get(index)
                  return (
                    <div
                      key={index}
                      className="border border-[#ebebeb] rounded-xl p-3 flex flex-col gap-2.5 bg-[#fafbfd]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#001871]">
                          Baris {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          disabled={isSubmitting || items.length <= 1}
                          className="text-[#ef3340] text-[11px] flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          Hapus
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex flex-col gap-1 col-span-2">
                          <span className="text-[11px] font-medium text-[#485885]">Zona *</span>
                          <select
                            value={item.zoneId}
                            disabled={zoneSelectDisabled}
                            aria-busy={zonesLoading || undefined}
                            aria-invalid={zonesError || undefined}
                            onChange={(e) => updateItem(index, { zoneId: e.target.value })}
                            className="w-full border border-[#ebebeb] rounded-lg px-2.5 py-[7px] text-[13px] text-[#1f2b59] bg-white"
                          >
                            <option value="">
                              {zonesLoading
                                ? 'Memuat...'
                                : zonesError
                                  ? OPTIONS_LOAD_ERROR
                                  : '— Pilih Zona —'}
                            </option>
                            {zonesLoading || zonesError
                              ? null
                              : zoneOptions.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                          </select>
                          {zonesError && (
                            <span className="text-[11px] text-[#ef3340]">{OPTIONS_LOAD_ERROR}</span>
                          )}
                          {fieldErrors[fieldKey(index, 'zoneId')] && (
                            <span className="text-[11px] text-[#ef3340]">
                              {fieldErrors[fieldKey(index, 'zoneId')]}
                            </span>
                          )}
                        </label>

                        <label className="flex flex-col gap-1">
                          <span className="text-[11px] font-medium text-[#485885]">Kode *</span>
                          <input
                            value={item.code}
                            disabled={isSubmitting}
                            onChange={(e) => updateItem(index, { code: e.target.value })}
                            placeholder="LOC-A01-01"
                            className="w-full border border-[#ebebeb] rounded-lg px-2.5 py-[7px] text-[13px] text-[#1f2b59] bg-white font-mono"
                          />
                          {fieldErrors[fieldKey(index, 'code')] && (
                            <span className="text-[11px] text-[#ef3340]">
                              {fieldErrors[fieldKey(index, 'code')]}
                            </span>
                          )}
                        </label>

                        <label className="flex flex-col gap-1">
                          <span className="text-[11px] font-medium text-[#485885]">Nama</span>
                          <input
                            value={item.name ?? ''}
                            disabled={isSubmitting}
                            onChange={(e) =>
                              updateItem(index, {
                                name: e.target.value.trim() ? e.target.value : null,
                              })
                            }
                            placeholder="Opsional"
                            className="w-full border border-[#ebebeb] rounded-lg px-2.5 py-[7px] text-[13px] text-[#1f2b59] bg-white"
                          />
                        </label>

                        <label className="flex flex-col gap-1">
                          <span className="text-[11px] font-medium text-[#485885]">Tipe *</span>
                          <select
                            value={item.locationType}
                            disabled={isSubmitting}
                            onChange={(e) =>
                              updateItem(index, {
                                locationType: e.target.value as LocationBulkItem['locationType'],
                              })
                            }
                            className="w-full border border-[#ebebeb] rounded-lg px-2.5 py-[7px] text-[13px] text-[#1f2b59] bg-white"
                          >
                            {LOCATION_TYPE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          {fieldErrors[fieldKey(index, 'locationType')] && (
                            <span className="text-[11px] text-[#ef3340]">
                              {fieldErrors[fieldKey(index, 'locationType')]}
                            </span>
                          )}
                        </label>

                        <label className="flex flex-col gap-1">
                          <span className="text-[11px] font-medium text-[#485885]">Urutan *</span>
                          <input
                            type="number"
                            step="1"
                            value={item.sequence}
                            disabled={isSubmitting}
                            onChange={(e) =>
                              updateItem(index, {
                                sequence: e.target.value === '' ? 0 : Number(e.target.value),
                              })
                            }
                            className="w-full border border-[#ebebeb] rounded-lg px-2.5 py-[7px] text-[13px] text-[#1f2b59] bg-white font-mono"
                          />
                          {fieldErrors[fieldKey(index, 'sequence')] && (
                            <span className="text-[11px] text-[#ef3340]">
                              {fieldErrors[fieldKey(index, 'sequence')]}
                            </span>
                          )}
                        </label>

                        <label className="flex flex-col gap-1">
                          <span className="text-[11px] font-medium text-[#485885]">Max LPN</span>
                          <input
                            type="number"
                            step="1"
                            value={item.maxLpnCount ?? ''}
                            disabled={isSubmitting}
                            onChange={(e) =>
                              updateItem(index, {
                                maxLpnCount:
                                  e.target.value === '' ? null : Number(e.target.value),
                              })
                            }
                            placeholder="opsional"
                            className="w-full border border-[#ebebeb] rounded-lg px-2.5 py-[7px] text-[13px] text-[#1f2b59] bg-white"
                          />
                          {fieldErrors[fieldKey(index, 'maxLpnCount')] && (
                            <span className="text-[11px] text-[#ef3340]">
                              {fieldErrors[fieldKey(index, 'maxLpnCount')]}
                            </span>
                          )}
                        </label>

                        <label className="flex flex-col gap-1">
                          <span className="text-[11px] font-medium text-[#485885]">
                            Max berat (kg)
                          </span>
                          <input
                            type="number"
                            step="any"
                            value={item.maxWeightKg ?? ''}
                            disabled={isSubmitting}
                            onChange={(e) =>
                              updateItem(index, {
                                maxWeightKg:
                                  e.target.value === '' ? null : Number(e.target.value),
                              })
                            }
                            placeholder="opsional"
                            className="w-full border border-[#ebebeb] rounded-lg px-2.5 py-[7px] text-[13px] text-[#1f2b59] bg-white"
                          />
                          {fieldErrors[fieldKey(index, 'maxWeightKg')] && (
                            <span className="text-[11px] text-[#ef3340]">
                              {fieldErrors[fieldKey(index, 'maxWeightKg')]}
                            </span>
                          )}
                        </label>
                      </div>

                      {backendErr && (
                        <div className="rounded-lg bg-[rgba(239,51,64,0.06)] px-2.5 py-2">
                          <p className="text-[11px] font-medium text-[#ef3340] mb-1">
                            Backend error (index {backendErr.index}
                            {backendErr.code ? ` · ${backendErr.code}` : ''})
                          </p>
                          <ul className="list-disc pl-4 space-y-0.5">
                            {backendErr.messages.map((msg) => (
                              <li key={msg} className="text-[11px] text-[#485885]">
                                {msg}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={addRow}
                disabled={isSubmitting}
                className="self-start text-[12px] font-medium text-[#001871] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah baris
              </button>
            </PanelBody>
          ) : (
            <PanelBody>
              <div className="border border-[#ebebeb] rounded-xl overflow-hidden">
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-[#f8f9fc] text-[#485885]">
                    <tr>
                      <th className="px-2.5 py-2 font-medium">#</th>
                      <th className="px-2.5 py-2 font-medium">Zona</th>
                      <th className="px-2.5 py-2 font-medium">Kode</th>
                      <th className="px-2.5 py-2 font-medium">Tipe</th>
                      <th className="px-2.5 py-2 font-medium">Urutan</th>
                      <th className="px-2.5 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-t border-[#f1f3f8]">
                        <td className="px-2.5 py-2 text-[#a9b1c6]">{index + 1}</td>
                        <td className="px-2.5 py-2 text-[#1f2b59]">
                          {zoneLabelById.get(item.zoneId) || item.zoneId}
                        </td>
                        <td className="px-2.5 py-2 font-mono text-[#001871]">{item.code}</td>
                        <td className="px-2.5 py-2 text-[#485885]">
                          {locationTypeLabel(item.locationType)}
                        </td>
                        <td className="px-2.5 py-2 font-mono text-[#485885]">{item.sequence}</td>
                        <td className="px-2.5 py-2 text-[#55bf59] font-medium">Aktif</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-[#949eb8] mt-2">
                {items.length} baris akan dikirim.
              </p>
            </PanelBody>
          )}

          <PanelFooter>
            {step === 'edit' ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 border border-[#ebebeb] bg-white text-[#485885] rounded-lg py-2 text-[13px] cursor-pointer disabled:opacity-60"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={goPreview}
                  disabled={isSubmitting || zonesLoading || zonesError}
                  className="flex-1 bg-[#001871] text-white border-none rounded-lg py-2 text-[13px] font-medium cursor-pointer disabled:opacity-60"
                >
                  Pratinjau
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep('edit')}
                  disabled={isSubmitting}
                  className="flex-1 border border-[#ebebeb] bg-white text-[#485885] rounded-lg py-2 text-[13px] cursor-pointer disabled:opacity-60"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 bg-[#001871] text-white border-none rounded-lg py-2 text-[13px] font-medium cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? 'Menyimpan...' : `Kirim ${items.length} Lokasi`}
                </button>
              </>
            )}
          </PanelFooter>
        </>
      )}
    </Panel>
  )
}
