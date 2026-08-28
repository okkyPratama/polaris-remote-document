import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Panel, PanelHeader, PanelBody, PanelFooter, Input, Select } from '@polaris/ui'
import { codesApi } from '../../api/codes.api'

const SCOPE_ITEMS = [
  { value: 'COMPANY', label: 'Entity/Company', badge: 'E' },
  { value: 'WAREHOUSE', label: 'Warehouse', badge: 'W' },
  { value: 'OWNER', label: 'Owner', badge: 'O' },
  { value: 'PRODUCT', label: 'Product/SKU', badge: 'S' },
]

const formSchema = z.object({
  configKey: z.string().min(1, 'Kunci config wajib diisi'),
  configValue: z.string().min(1, 'Nilai wajib diisi'),
  dataType: z.string().min(1, 'Tipe data wajib diisi'),
  description: z.string().optional(),
  category: z.string().optional(),
  configGroup: z.string().optional(),
  typeCode: z.string().optional(),
  scope: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

export interface ConfigFormData {
  configKey: string
  configValue: string
  dataType: string
  description?: string
  category?: string
  configGroup?: string
  typeCode?: string
  scope?: string
}

interface Props {
  open: boolean
  mode: 'create' | 'edit'
  initialData?: ConfigFormData
  onClose: () => void
  onSubmit: (data: ConfigFormData) => Promise<void>
}

export function ConfigFormPanel({ open, mode, initialData, onClose, onSubmit }: Props) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData as FormData,
  })

  const [dataTypeOptions, setDataTypeOptions] = useState<{ value: string; label: string }[]>([])
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([])
  const optionsLoadedRef = useRef(false)

  // State for dynamic configValue field based on typeCode
  // 'idle' = typeCode kosong, show free text
  // 'loading' = sedang lookup
  // 'has-options' = lookup berhasil, ada data → dropdown
  // 'empty-options' = lookup berhasil, tapi kosong → dropdown dengan info
  type ValueFieldState = 'idle' | 'loading' | 'has-options' | 'empty-options'
  const [valueFieldState, setValueFieldState] = useState<ValueFieldState>('idle')
  const [valueOptions, setValueOptions] = useState<{ value: string; label: string }[]>([])
  const typeCodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const typeCodeValue = watch('typeCode') || ''

  // Lookup values when typeCode changes
  useEffect(() => {
    if (typeCodeDebounceRef.current) clearTimeout(typeCodeDebounceRef.current)

    if (!typeCodeValue.trim()) {
      setValueFieldState('idle')
      setValueOptions([])
      return
    }

    setValueFieldState('loading')
    typeCodeDebounceRef.current = setTimeout(() => {
      codesApi.lookup(typeCodeValue.trim(), '*', '*').then((details) => {
        if (details.length > 0) {
          setValueOptions(details.map((d) => ({ value: d.codeId || d.codeName, label: d.codeName })))
          setValueFieldState('has-options')
        } else {
          setValueOptions([])
          setValueFieldState('empty-options')
        }
      }).catch(() => {
        setValueFieldState('idle')
        setValueOptions([])
      })
    }, 500)

    return () => {
      if (typeCodeDebounceRef.current) clearTimeout(typeCodeDebounceRef.current)
    }
  }, [typeCodeValue])

  // Load data type and category options once on first open
  useEffect(() => {
    if (!open || optionsLoadedRef.current) return
    optionsLoadedRef.current = true

    Promise.all([
      codesApi.lookup('CONFIG_DATA_TYPE', '*', '*').then((details) => {
        const opts = details.map((d) => ({ value: d.codeId || d.codeName, label: d.codeName }))
        setDataTypeOptions(opts)
        return opts
      }).catch(() => { setDataTypeOptions([]); return [] }),
      codesApi.lookup('CONFIG_CATEGORY', '*', '*').then((details) => {
        const opts = details.map((d) => ({ value: d.codeId || d.codeName, label: d.codeName }))
        setCategoryOptions(opts)
        return opts
      }).catch(() => { setCategoryOptions([]); return [] }),
    ]).then(() => {
      if (initialData) {
        reset(initialData as FormData)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const scopeValue = watch('scope') || ''
  const selectedScopes = scopeValue ? scopeValue.split(',').map((s) => s.trim()).filter(Boolean) : []

  // Check if config has no overridable scope (SYSTEM-only) — in edit mode only configValue is editable
  const hasOverridableScope = selectedScopes.some((s) => ['COMPANY', 'WAREHOUSE', 'OWNER', 'PRODUCT'].includes(s))
  const isEditValueOnly = mode === 'edit' && !hasOverridableScope

  const toggleScope = (value: string) => {
    const current = new Set(selectedScopes)
    if (current.has(value)) {
      current.delete(value)
    } else {
      current.add(value)
    }
    setValue('scope', Array.from(current).join(','), { shouldDirty: true })
  }

  const prevOpen = useRef(false)
  useEffect(() => {
    if (open && !prevOpen.current) {
      reset((initialData as FormData) || {
        configKey: '',
        configValue: '',
        dataType: '',
        description: '',
        category: '',
        configGroup: '',
        typeCode: '',
        scope: '',
      })
    }
    prevOpen.current = open
  }, [open, initialData, reset])

  const onFormSubmit = handleSubmit(async (data) => {
    await onSubmit(data)
  })

  // Render the Nilai field based on typeCode lookup state
  const renderValueField = () => {
    if (valueFieldState === 'idle') {
      // No typeCode → free text
      return (
        <Input
          label="Nilai *"
          placeholder="cth. 10"
          error={errors.configValue?.message}
          {...register('configValue')}
        />
      )
    }

    if (valueFieldState === 'loading') {
      return (
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[#485885]">Nilai *</label>
          <div className="w-full border border-[#ebebeb] rounded-lg py-[7px] px-3 text-[13px] text-[#949eb8] bg-[#fafbfd]">
            Memuat pilihan nilai...
          </div>
        </div>
      )
    }

    if (valueFieldState === 'has-options') {
      return (
        <Select
          label="Nilai *"
          options={[{ value: '', label: 'Pilih nilai...' }, ...valueOptions]}
          error={errors.configValue?.message}
          {...register('configValue')}
        />
      )
    }

    // empty-options: dropdown tapi kasih tau kosong
    return (
      <div className="flex flex-col gap-1">
        <Select
          label="Nilai *"
          options={[{ value: '', label: 'Tidak ada list nilai untuk tipe kode ini' }]}
          error={errors.configValue?.message}
          {...register('configValue')}
        />
        <span className="text-[10px] text-[#949eb8]">
          Tipe kode "{typeCodeValue}" tidak memiliki daftar nilai.
        </span>
      </div>
    )
  }

  return (
    <>
      <Panel open={open} onClose={onClose}>
        <PanelHeader
          title={mode === 'create' ? 'Tambah Config' : 'Edit Config'}
          description={mode === 'create' ? 'Isi data konfigurasi baru' : 'Ubah data konfigurasi'}
        />
        {mode === 'edit' && (
          <div className="flex items-start gap-2 bg-[rgba(0,24,113,0.05)] border border-[rgba(0,24,113,0.15)] rounded-lg px-3 py-2.5 mb-3.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#485885" strokeWidth="2" className="flex-shrink-0 mt-px">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="text-[11px] text-[#485885] leading-snug">Kunci Config tidak dapat diubah setelah dibuat.</span>
          </div>
        )}
        <PanelBody>
          <Input
            label="Kode Konfigurasi *"
            placeholder="cth. APR_ADJ_THR_QTY"
            disabled={mode === 'edit'}
            error={errors.configKey?.message}
            {...register('configKey')}
          />
          <Input
            label="Kode Tipe"
            placeholder="cth. TIMEZONE"
            disabled={mode === 'edit'}
            error={errors.typeCode?.message}
            {...register('typeCode')}
          />
          {renderValueField()}
          <Select
            label="Tipe Data"
            disabled={mode === 'edit'}
            options={[{ value: '', label: 'Pilih tipe data...' }, ...dataTypeOptions]}
            error={errors.dataType?.message}
            {...register('dataType')}
          />
          <Input
            label="Deskripsi"
            placeholder="Deskripsi konfigurasi"
            disabled={isEditValueOnly}
            error={errors.description?.message}
            {...register('description')}
          />
          <Select
            label="Kategori"
            disabled={isEditValueOnly}
            options={[{ value: '', label: 'Pilih kategori...' }, ...categoryOptions]}
            error={errors.category?.message}
            {...register('category')}
          />
          <Input
            label="Grup"
            placeholder="cth. Inventory, Receipt"
            disabled={isEditValueOnly}
            error={errors.configGroup?.message}
            {...register('configGroup')}
          />
          {/* Cakupan - Multi-select chips */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[#485885]">Cakupan</label>
            <div className="grid grid-cols-2 gap-2">
              {SCOPE_ITEMS.map((item) => {
                const isSelected = selectedScopes.includes(item.value)
                return (
                  <button
                    key={item.value}
                    type="button"
                    disabled={mode === 'edit'}
                    onClick={() => mode !== 'edit' && toggleScope(item.value)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all ${
                      mode === 'edit' ? 'cursor-default opacity-70' : 'cursor-pointer'
                    } ${
                      isSelected
                        ? 'border-[rgba(0,24,113,0.25)] bg-[rgba(0,24,113,0.04)]'
                        : 'border-[#ebebeb] bg-white hover:border-[#c8cdd9]'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'bg-[#001871] text-white'
                          : 'bg-[#f1f3f8] text-[#a9b1c6]'
                      }`}
                    >
                      {item.badge}
                    </span>
                    <span className={`text-[12px] font-medium ${isSelected ? 'text-[#001871]' : 'text-[#485885]'}`}>
                      {item.label}
                    </span>
                    {isSelected && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#001871" strokeWidth="2.5" className="ml-auto flex-shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </PanelBody>
        <PanelFooter onCancel={onClose} onSubmit={onFormSubmit} submitLabel="Simpan" loading={isSubmitting} />
      </Panel>
    </>
  )
}
