import { useEffect, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Panel, PanelHeader, PanelBody, PanelFooter, Input, Select, ConfirmDialog } from '@polaris/ui'
import type { CompanyGroupFormData } from '../../types/companyGroup.types'
import { companyGroupFormSchema } from '../../types/companyGroup.types'

const STATUS_OPTIONS = [
  { value: 'AKTIF', label: 'Aktif' },
  { value: 'NONAKTIF', label: 'Nonaktif' },
]

interface Props {
  open: boolean
  mode: 'create' | 'edit'
  initialData?: CompanyGroupFormData
  onClose: () => void
  onSubmit: (data: CompanyGroupFormData) => Promise<void>
}

export function GroupFormPanel({ open, mode, initialData, onClose, onSubmit }: Props) {
  const [showStatusConfirm, setShowStatusConfirm] = useState(false)
  const [pendingData, setPendingData] = useState<CompanyGroupFormData | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CompanyGroupFormData>({
    resolver: zodResolver(companyGroupFormSchema),
    defaultValues: initialData,
  })

  const prevOpenRef = useRef(false)
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      reset(initialData || { code: '', name: '', industry: '', description: '', address: '', contactPhone: '', contactEmail: '', contactName: '', status: 'AKTIF' })
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
    ? `Yakin ingin menonaktifkan group "${initialData?.name}"? Group yang nonaktif tidak akan muncul di pilihan.`
    : `Yakin ingin mengaktifkan kembali group "${initialData?.name}"?`

  return (
    <>
      <Panel open={open} onClose={onClose}>
        <PanelHeader
          title={mode === 'create' ? 'Tambah Grup Perusahaan' : 'Edit Grup Perusahaan'}
          description={mode === 'create' ? 'Isi data grup perusahaan baru' : 'Ubah data grup'}
        />
        {mode === 'edit' && (
          <div className="flex items-start gap-2 bg-[rgba(0,24,113,0.05)] border border-[rgba(0,24,113,0.15)] rounded-lg px-3 py-2.5 mb-3.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#485885" strokeWidth="2" className="flex-shrink-0 mt-px">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="text-[11px] text-[#485885] leading-snug">
              Kode Grup tidak dapat diubah setelah grup dibuat.
            </span>
          </div>
        )}
        <PanelBody>
          <Input label="Kode Group *" placeholder="Contoh: GRP-XXXX" disabled={mode === 'edit'} error={errors.code?.message} {...register('code')} />
          <Input label="Nama Group *" placeholder="Nama lengkap grup" error={errors.name?.message} {...register('name')} />
          {/* <Input label="Industri" placeholder="Contoh: Otomotif & Distribusi" error={errors.industry?.message} {...register('industry')} /> */}          
          <Input label="Alamat" placeholder="Alamat grup perusahaan" error={errors.address?.message} {...register('address')} />
          <Input label="Nama Kontak" placeholder="Nama penanggung jawab" error={errors.contactName?.message} {...register('contactName')} />          
          <Input label="Telepon" placeholder="+628123456789" error={errors.contactPhone?.message} {...register('contactPhone')} />
          <Input label="Email" placeholder="email@perusahaan.co.id" error={errors.contactEmail?.message} {...register('contactEmail')} />
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            error={errors.status?.message}
            {...register('status')}
          />
        </PanelBody>
        <PanelFooter onCancel={onClose} onSubmit={onFormSubmit} submitLabel={'Simpan'} loading={isSubmitting} />
      </Panel>

      <ConfirmDialog
        open={showStatusConfirm}
        title={`${statusChangeLabel} Grup`}
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
