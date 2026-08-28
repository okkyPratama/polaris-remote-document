import { useEffect, useState, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Panel, PanelBody, PanelFooter, Input, Select, SingleSelect, ConfirmDialog, type SingleSelectOption } from '@polaris/ui'
import type { CompanyFormData } from '../../types/company.types'
import { companyFormSchema } from '../../types/company.types'
import { companyGroupApi } from '../../api/companyGroup.api'

const STATUS_OPTIONS = [
  { value: 'AKTIF', label: 'Aktif' },
  { value: 'NONAKTIF', label: 'Nonaktif' },
]

async function loadCompanyGroupOptions(query: string): Promise<SingleSelectOption[]> {
  const res = await companyGroupApi.getAll({ search: query, status: 'AKTIF', pageSize: 50 })
  return res.data.map((g) => ({
    value: g.id,
    label: g.name,
    description: g.code,
  }))
}

interface Props {
  open: boolean
  mode: 'create' | 'edit'
  initialData?: CompanyFormData
  /** Pre-populated option for company group SingleSelect (used in edit mode) */
  initialGroupOption?: SingleSelectOption | null
  onClose: () => void
  onSubmit: (data: CompanyFormData) => Promise<void>
}

export function CompanyFormPanel({ open, mode, initialData, initialGroupOption, onClose, onSubmit }: Props) {
  const [showStatusConfirm, setShowStatusConfirm] = useState(false)
  const [pendingData, setPendingData] = useState<CompanyFormData | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: initialData,
  })

  const prevOpenRef = useRef(false)
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      reset(initialData ?? {
        code: '',
        name: '',
        companyGroupId: '',
        npwp: '',
        email: '',
        phone: '',
        contactName: '',
        city: '',
        province: '',
        address: '',
        status: 'AKTIF',
      })
    }
    prevOpenRef.current = open
  }, [open, initialData, reset])

  const onFormSubmit = handleSubmit(async (data) => {
    // Jika mode edit dan status berubah, tampilkan confirmation dialog
    if (mode === 'edit' && initialData?.status && data.status !== initialData.status) {
      setPendingData(data)
      setShowStatusConfirm(true)
      return
    }
    // Tidak ada perubahan status, simpan langsung
    await onSubmit(data)
  })

  const handleConfirmStatusChange = async () => {
    if (pendingData) {
      await onSubmit(pendingData)
      setPendingData(null)
      setShowStatusConfirm(false)
    }
  }

  const handleCancelStatusChange = () => {
    setPendingData(null)
    setShowStatusConfirm(false)
  }

  const statusChangeLabel = pendingData?.status === 'NONAKTIF' ? 'Nonaktifkan' : 'Aktifkan'
  const statusChangeDesc = pendingData?.status === 'NONAKTIF'
    ? `Yakin ingin menonaktifkan perusahaan "${initialData?.name}"? Perusahaan yang nonaktif tidak akan muncul di pilihan.`
    : `Yakin ingin mengaktifkan kembali perusahaan "${initialData?.name}"?`

  return (
    <>
      <Panel open={open} onClose={onClose}>
        <div className="pr-7 mb-3.5">
          <h2 className="text-sm font-semibold text-[#001871] mb-1">
            {mode === 'create' ? 'Tambah Perusahaan' : 'Edit Perusahaan'}
          </h2>
          <p className="text-[11px] text-[#485885]">
            {mode === 'create'
              ? 'Daftarkan entitas perusahaan baru'
              : 'Ubah data perusahaan yang sudah terdaftar'}
          </p>
        </div>

        {mode === 'edit' && (
          <div className="flex items-start gap-2 bg-[rgba(0,24,113,0.05)] border border-[rgba(0,24,113,0.15)] rounded-lg px-3 py-2.5 mb-3.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#485885" strokeWidth="2" className="flex-shrink-0 mt-px">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="text-[11px] text-[#485885] leading-snug">
              Kode Perusahaan dan Grup tidak dapat diubah setelah perusahaan dibuat.
            </span>
          </div>
        )}

        <PanelBody>
          <Input
            label="Kode Perusahaan *"
            placeholder="cth. POLARIS-DIST"
            disabled={mode === 'edit'}
            error={errors.code?.message}
            {...register('code')}
          />
          <Input
            label="Nama Perusahaan *"
            placeholder="Nama lengkap perusahaan"
            error={errors.name?.message}
            {...register('name')}
          />
          <Controller
            name="companyGroupId"
            control={control}
            render={({ field }) => (
              <SingleSelect
                label="Grup Perusahaan"
                placeholder="— Pilih Grup —"
                value={field.value ?? ''}
                onChange={(val) => field.onChange(val)}
                loadOptions={loadCompanyGroupOptions}
                initialOption={initialGroupOption}
                disabled={mode === 'edit'}
                error={errors.companyGroupId?.message}
                emptyMessage="Tidak ada grup ditemukan"
              />
            )}
          />
          <Input
            label="Nama Kontak"
            placeholder="Nama penanggung jawab"
            error={errors.contactName?.message}
            {...register('contactName')}
          />
          <div className="grid grid-cols-2 gap-2.5">
            <Input
              label="Email"
              placeholder="email@perusahaan.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Telepon"
              placeholder="+62..."
              error={errors.phone?.message}
              {...register('phone')}
            />
          </div>
          <Input
            label="Alamat"
            placeholder="Jl. Nama Jalan No.X"
            error={errors.address?.message}
            {...register('address')}
          />
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            error={errors.status?.message}
            {...register('status')}
          />
        </PanelBody>

        <PanelFooter
          onCancel={onClose}
          onSubmit={onFormSubmit}
          submitLabel={'Simpan'}
          loading={isSubmitting}
        />
      </Panel>

      <ConfirmDialog
        open={showStatusConfirm}
        title={`${statusChangeLabel} Perusahaan`}
        description={statusChangeDesc}
        confirmLabel={statusChangeLabel}
        cancelLabel="Batal"
        variant={pendingData?.status === 'NONAKTIF' ? 'danger' : 'default'}
        isLoading={isSubmitting}
        onConfirm={handleConfirmStatusChange}
        onCancel={handleCancelStatusChange}
      />
    </>
  )
}
