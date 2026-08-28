import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Panel, PanelHeader, PanelBody, PanelFooter, Input, Select, ConfirmDialog } from '@polaris/ui'

const formSchema = z.object({
  typeCode: z.string().min(1, 'Kode tipe wajib diisi'),
  typeCodeDescription: z.string().min(1, 'Deskripsi wajib diisi'),
  status: z.enum(['AKTIF', 'NONAKTIF']).optional(),
})

type FormData = z.infer<typeof formSchema>

const STATUS_OPTIONS = [
  { value: 'AKTIF', label: 'Aktif' },
  { value: 'NONAKTIF', label: 'Nonaktif' },
]

interface Props {
  open: boolean
  mode: 'create' | 'edit'
  initialData?: { typeCode: string; typeCodeDescription: string; status?: string }
  onClose: () => void
  onSubmit: (data: { typeCode: string; typeCodeDescription: string; status?: string }) => Promise<void>
}

export function CodeFormPanel({ open, mode, initialData, onClose, onSubmit }: Props) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData as FormData,
  })

  const [showStatusConfirm, setShowStatusConfirm] = useState(false)
  const [pendingData, setPendingData] = useState<FormData | null>(null)

  const prevOpen = useRef(false)
  useEffect(() => {
    if (open && !prevOpen.current) {
      reset((initialData as FormData) || { typeCode: '', typeCodeDescription: '', status: 'AKTIF' })
    }
    prevOpen.current = open
  }, [open, initialData, reset])

  const onFormSubmit = handleSubmit(async (data) => {
    if (mode === 'edit' && initialData?.status && data.status !== initialData.status) {
      setPendingData(data)
      setShowStatusConfirm(true)
      return
    }
    await onSubmit(data)
  })

  const handleConfirmStatusChange = async () => {
    if (pendingData) {
      await onSubmit(pendingData)
      setPendingData(null)
      setShowStatusConfirm(false)
    }
  }

  const isDeactivating = pendingData?.status === 'NONAKTIF'

  return (
    <>
      <Panel open={open} onClose={onClose}>
        <PanelHeader
          title={mode === 'create' ? 'Tambah Kode Tipe' : 'Edit Kode Tipe'}
          description={mode === 'create' ? 'Isi data kode tipe baru' : 'Ubah data kode tipe'}
        />
        {mode === 'edit' && (
          <div className="flex items-start gap-2 bg-[rgba(0,24,113,0.05)] border border-[rgba(0,24,113,0.15)] rounded-lg px-3 py-2.5 mb-3.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#485885" strokeWidth="2" className="flex-shrink-0 mt-px">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="text-[11px] text-[#485885] leading-snug">Kode Tipe tidak dapat diubah setelah dibuat.</span>
          </div>
        )}
        <PanelBody>
          <Input label="Kode Tipe *" placeholder="cth. TEMPERATURE_ZONE" disabled={mode === 'edit'} error={errors.typeCode?.message} {...register('typeCode')} />
          <Input label="Deskripsi *" placeholder="Deskripsi kode tipe" error={errors.typeCodeDescription?.message} {...register('typeCodeDescription')} />
          <Select label="Status" options={STATUS_OPTIONS} error={errors.status?.message} {...register('status')} />
        </PanelBody>
        <PanelFooter onCancel={onClose} onSubmit={onFormSubmit} submitLabel={'Simpan'} loading={isSubmitting} />
      </Panel>

      <ConfirmDialog
        open={showStatusConfirm}
        title={isDeactivating ? 'Nonaktifkan Kode Tipe' : 'Aktifkan Kode Tipe'}
        description={isDeactivating
          ? `Yakin ingin menonaktifkan kode tipe "${initialData?.typeCode}"?`
          : `Yakin ingin mengaktifkan kembali kode tipe "${initialData?.typeCode}"?`
        }
        confirmLabel={isDeactivating ? 'Nonaktifkan' : 'Aktifkan'}
        cancelLabel="Batal"
        variant={isDeactivating ? 'danger' : 'default'}
        isLoading={isSubmitting}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => { setShowStatusConfirm(false); setPendingData(null) }}
      />
    </>
  )
}
