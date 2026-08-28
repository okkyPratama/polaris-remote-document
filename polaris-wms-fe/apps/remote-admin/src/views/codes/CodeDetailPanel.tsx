import { useState, useEffect, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Panel, PanelSection, PanelLabel, PanelRow, PanelFooter, PanelBody, ConfirmDialog, Input, Select, SingleSelect, type SingleSelectOption } from '@polaris/ui'
import type { Code, CodeDetail } from '../../types/code.types'
import { codesApi } from '../../api/codes.api'
import { warehouseApi } from '../../api/warehouse.api'
import { useCreateCodeDetail, useUpdateCodeDetail, useDeleteCodeDetail } from '../../hooks/useCodes'
import { toast } from '@polaris/ui'

const detailFormSchema = z.object({
  codeDetailId: z.string().min(1, 'Kode ID wajib diisi'),
  codeName: z.string().min(1, 'Nama kode wajib diisi'),
  sequence: z.string().optional(),
  ownerId: z.string().optional(),
  warehouseId: z.string().optional(),
  ownerName: z.string().optional(),
  warehouseName: z.string().optional(),
  status: z.enum(['AKTIF', 'NONAKTIF']).optional(),
})

type DetailFormData = z.infer<typeof detailFormSchema>

const STATUS_OPTIONS = [
  { value: 'AKTIF', label: 'Aktif' },
  { value: 'NONAKTIF', label: 'Nonaktif' },
]

type SubView = 'list' | 'detail-item' | 'create-item' | 'edit-item'

interface Props {
  open: boolean
  data: Code | null
  onClose: () => void
  onEdit?: () => void
  onDelete?: (id: string) => Promise<void>
  canCreateDetail?: boolean
  canUpdateDetail?: boolean
  canDeleteDetail?: boolean
}

export function CodeDetailPanel({ open, data, onClose, onEdit, onDelete, canCreateDetail = false, canUpdateDetail = false, canDeleteDetail = false }: Props) {
  const [detail, setDetail] = useState<Code | null>(null)
  const [subView, setSubView] = useState<SubView>('list')
  const [selectedDetail, setSelectedDetail] = useState<CodeDetail | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDeleteDetailConfirm, setShowDeleteDetailConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editWarehouseOption, setEditWarehouseOption] = useState<SingleSelectOption | null>(null)

  const createDetailMutation = useCreateCodeDetail()
  const updateDetailMutation = useUpdateCodeDetail()
  const deleteDetailMutation = useDeleteCodeDetail()

  const dataId = data?.id
  useEffect(() => {
    if (!open || !dataId) { setDetail(null); setSubView('list'); return }
    codesApi.getById(dataId)
      .then((res) => { if (res) setDetail(res) })
      .catch(() => setDetail(null))
  }, [open, dataId])

  // Resolve warehouse name saat masuk edit-item
  useEffect(() => {
    if (subView === 'edit-item' && selectedDetail?.warehouseId) {
      if (selectedDetail.warehouseId === '*') {
        setEditWarehouseOption({ value: '*', label: 'Semua Warehouse' })
      } else {
        warehouseApi.getById(selectedDetail.warehouseId)
          .then((wh) => setEditWarehouseOption({ value: wh.id, label: wh.name, description: wh.code }))
          .catch(() => setEditWarehouseOption({ value: selectedDetail.warehouseId, label: selectedDetail.warehouseId }))
      }
    } else {
      setEditWarehouseOption(null)
    }
  }, [subView, selectedDetail])

  const code = detail ?? data
  if (!code) return null

  const handleDeleteHeader = async () => {
    if (!onDelete) return
    setDeleting(true)
    try {
      await onDelete(code.id)
      setShowDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteDetail = async () => {
    if (!selectedDetail) return
    setDeleting(true)
    try {
      const msg = await deleteDetailMutation.mutateAsync(selectedDetail.id)
      toast.success('Berhasil', msg || 'Kode detail berhasil dihapus')
      setShowDeleteDetailConfirm(false)
      setSelectedDetail(null)
      setSubView('list')
      // Refresh detail
      const fresh = await codesApi.getById(code.id)
      if (fresh) setDetail(fresh)
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Error', error.errorMessage?.[0] || error.message || 'Gagal menghapus')
    } finally {
      setDeleting(false)
    }
  }

  const handleDetailFormSubmit = async (formData: DetailFormData) => {
    const warehouseValue = formData.warehouseId === '*' ? '*' : (formData.warehouseId || null)
    const ownerValue = formData.ownerId === '*' ? '*' : (formData.ownerId || null)
    try {
      if (subView === 'create-item') {
        const msg = await createDetailMutation.mutateAsync({
          typeCodeId: code.id,
          codeDetailId: formData.codeDetailId,
          codeName: formData.codeName,
          sequence: formData.sequence ? Number(formData.sequence) : 0,
          status: formData.status,
          ownerId: ownerValue,
          warehouseId: warehouseValue,
        })
        toast.success('Berhasil', msg || 'Kode detail berhasil ditambahkan')
      } else {
        const msg = await updateDetailMutation.mutateAsync({
          id: selectedDetail!.id,
          data: {
            codeDetailId: formData.codeDetailId,
            codeName: formData.codeName,
            sequence: formData.sequence ? Number(formData.sequence) : 0,
            status: formData.status,
            ownerId: ownerValue,
            warehouseId: warehouseValue,
          },
        })
        toast.success('Berhasil', msg || 'Kode detail berhasil diperbarui')
      }
      setSubView('list')
      setSelectedDetail(null)
      const fresh = await codesApi.getById(code.id)
      if (fresh) setDetail(fresh)
    } catch (err) {
      const error = err as { errorMessage?: string[]; message?: string }
      toast.error('Error', error.errorMessage?.[0] || error.message || 'Gagal menyimpan')
    }
  }

  // ─── Sub-views ────────────────────────────────────────────────────────────────

  if (subView === 'detail-item' && selectedDetail) {
    return (
      <>
        <Panel open={open} onClose={onClose}>
          <button type="button" onClick={() => { setSubView('list'); setSelectedDetail(null) }} className="flex items-center gap-1.5 text-[11px] text-[#485885] hover:text-[#001871] cursor-pointer mb-3 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Kembali ke daftar
          </button>
          <PanelSection>
            <PanelLabel>Detail Kode</PanelLabel>
            <div className="flex flex-col gap-2">
              <PanelRow label="Kode Deskripsi" value={selectedDetail.codeName} />
              <PanelRow label="Urutan" value={String(selectedDetail.sequence)} />
              <PanelRow label="Warehouse" value={String(selectedDetail.warehouseName)} />
              <PanelRow label="Owner" value={String(selectedDetail.ownerName)} />
              <PanelRow label="Status" value={selectedDetail.status} />
            </div>
          </PanelSection>
          <PanelFooter>
            {!code.isSystem && canUpdateDetail && <button onClick={() => setSubView('edit-item')} className="flex-1 bg-[#001871] text-white border-none rounded-lg py-2 text-[13px] font-medium cursor-pointer hover:opacity-90 transition-opacity">Edit</button>}
            {!code.isSystem && canDeleteDetail && <button onClick={() => setShowDeleteDetailConfirm(true)} className="border border-[rgba(239,51,64,0.3)] bg-white text-[#ef3340] rounded-lg py-2 px-4 text-[13px] cursor-pointer hover:bg-[rgba(239,51,64,0.04)] transition-colors">Hapus</button>}
          </PanelFooter>
        </Panel>
        <ConfirmDialog open={showDeleteDetailConfirm} title="Hapus Kode Detail" description={`Yakin ingin menghapus "${selectedDetail.codeName}"?`} confirmLabel="Hapus" cancelLabel="Batal" variant="danger" isLoading={deleting} onConfirm={handleDeleteDetail} onCancel={() => setShowDeleteDetailConfirm(false)} />
      </>
    )
  }

  if (subView === 'create-item' || subView === 'edit-item') {
    return (
      <Panel open={open} onClose={onClose}>
        <button type="button" onClick={() => { setSubView('list'); setSelectedDetail(null) }} className="flex items-center gap-1.5 text-[11px] text-[#485885] hover:text-[#001871] cursor-pointer mb-3 transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Kembali ke daftar
        </button>
        <div className="mb-3.5">
          <h2 className="text-sm font-semibold text-[#001871] mb-0.5">{subView === 'create-item' ? 'Tambah Kode Detail' : 'Edit Kode Detail'}</h2>
          <p className="text-[11px] text-[#485885]">Kode tipe: <span className="font-mono font-semibold text-[#001871]">{code.typeCode}</span></p>
        </div>
        <DetailForm
          mode={subView === 'create-item' ? 'create' : 'edit'}
          initialData={subView === 'edit-item' && selectedDetail ? { codeDetailId: selectedDetail.codeId || '', codeName: selectedDetail.codeName, sequence: String(selectedDetail.sequence), ownerId: selectedDetail.ownerId || '', warehouseId: selectedDetail.warehouseId || '', status: selectedDetail.status } : undefined}
          initialWarehouseOption={editWarehouseOption}
          onSubmit={handleDetailFormSubmit}
          onCancel={() => { setSubView('list'); setSelectedDetail(null) }}
        />
      </Panel>
    )
  }

  // ─── Default: List view ───────────────────────────────────────────────────────

  return (
    <>
      <Panel open={open} onClose={onClose}>
        <div className="flex items-start gap-3 pr-7 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[rgba(0,24,113,0.08)] flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#001871" strokeWidth="2">
              <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
              <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4" />
              <circle cx="12" cy="12" r="2" />
              <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4" />
              <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-mono font-bold text-[#485885] tracking-wider mb-0.5">{code.typeCode}</div>
            <div className="text-[15px] font-bold text-[#001871] leading-tight mb-1.5">{code.typeCodeDescription}</div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${code.status === 'AKTIF' ? 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]' : 'bg-[rgba(169,177,198,0.18)] text-[#a9b1c6]'}`}>{code.status}</span>
          </div>
        </div>

        <PanelSection>
          <div className="flex items-center justify-between mb-2">
            <PanelLabel>Daftar Kode ({code.details?.length ?? code.detailCount})</PanelLabel>
            {!code.isSystem && canCreateDetail && <button type="button" onClick={() => setSubView('create-item')} className="text-[11px] font-medium text-[#001871] hover:underline cursor-pointer">+ Tambah</button>}
          </div>
          {code.details && code.details.length > 0 ? (
            <div className="border border-[#ebebeb] rounded-lg overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#fafbfd]">
                    <th className="px-2.5 py-2 text-left text-[10px] font-bold text-[#a9b1c6] uppercase tracking-wide">Kode</th>
                    <th className="px-2.5 py-2 text-left text-[10px] font-bold text-[#a9b1c6] uppercase tracking-wide">Nama</th>
                    <th className="px-2.5 py-2 text-left text-[10px] font-bold text-[#a9b1c6] uppercase tracking-wide">Warehouse</th>
                    <th className="px-2.5 py-2 text-left text-[10px] font-bold text-[#a9b1c6] uppercase tracking-wide">Owner</th>
                    <th className="px-2.5 py-2 text-left text-[10px] font-bold text-[#a9b1c6] uppercase tracking-wide">Urutan</th>
                    <th className="px-2.5 py-2 text-left text-[10px] font-bold text-[#a9b1c6] uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {code.details.map((d) => (
                    <tr key={d.id} onClick={() => { setSelectedDetail(d); setSubView('detail-item') }} className="border-t border-[#f1f3f8] hover:bg-[rgba(0,24,113,0.03)] cursor-pointer transition-colors">
                      <td className="px-2.5 py-2 text-[12px] font-medium text-[#1f2b59]">{d.codeId}</td>
                      <td className="px-2.5 py-2 text-[12px] font-medium text-[#1f2b59]">{d.codeName}</td>
                      <td className="px-2.5 py-2 text-[12px] text-[#485885]">{d.warehouseName || '-'}</td>
                      <td className="px-2.5 py-2 text-[12px] text-[#485885]">{d.ownerName || '-'}</td>
                      <td className="px-2.5 py-2 text-[11px] text-[#485885]">{d.sequence}</td>
                      <td className="px-2.5 py-2">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${d.status === 'AKTIF' ? 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]' : 'bg-[rgba(169,177,198,0.15)] text-[#a9b1c6]'}`}>{d.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border border-dashed border-[#ebebeb] rounded-lg py-5 text-center text-[12px] text-[#a9b1c6]">Belum ada kode detail</div>
          )}
        </PanelSection>

        {!code.isSystem && (onEdit || onDelete) && (
          <PanelFooter>
            {onEdit && <button onClick={onEdit} className="flex-1 bg-[#001871] text-white border-none rounded-lg py-2 text-[13px] font-medium cursor-pointer hover:opacity-90 transition-opacity">Edit</button>}
            {onDelete && <button onClick={() => setShowDeleteConfirm(true)} className="border border-[rgba(239,51,64,0.3)] bg-white text-[#ef3340] rounded-lg py-2 px-4 text-[13px] cursor-pointer hover:bg-[rgba(239,51,64,0.04)] transition-colors">Hapus</button>}
          </PanelFooter>
        )}
      </Panel>

      <ConfirmDialog open={showDeleteConfirm} title="Hapus Kode Tipe" description={`Yakin ingin menghapus "${code.typeCode}"? Semua kode detail di dalamnya juga akan terhapus.`} confirmLabel="Hapus" cancelLabel="Batal" variant="danger" isLoading={deleting} onConfirm={handleDeleteHeader} onCancel={() => setShowDeleteConfirm(false)} />
    </>
  )
}

// ─── Detail Form (internal) ─────────────────────────────────────────────────────

function DetailForm({ mode, initialData, initialWarehouseOption, onSubmit, onCancel }: {
  mode: 'create' | 'edit'
  initialData?: DetailFormData
  initialWarehouseOption?: SingleSelectOption | null
  onSubmit: (data: DetailFormData) => Promise<void>
  onCancel: () => void
}) {
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<DetailFormData>({
    resolver: zodResolver(detailFormSchema),
    defaultValues: initialData || { codeDetailId: '', codeName: '', sequence: '', ownerId: '*', warehouseId: '*', status: 'AKTIF' },
  })

  const [showStatusConfirm, setShowStatusConfirm] = useState(false)
  const [pendingData, setPendingData] = useState<DetailFormData | null>(null)

  const loadWarehouseOptions = useCallback(async (query: string): Promise<SingleSelectOption[]> => {
    const res = await warehouseApi.getAll({ search: query, status: 'AKTIF', pageSize: 50 })
    const options: SingleSelectOption[] = [
      { value: '*', label: 'Semua Warehouse' },
      ...res.data.map((w) => ({ value: w.id, label: w.name, description: w.code })),
    ]
    return options
  }, [])

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
      <PanelBody>
        <Input label="Kode ID *" placeholder="cth. AMBIENT" error={errors.codeDetailId?.message} {...register('codeDetailId')} />
        <Input label="Kode Deskripsi *" placeholder="cth. Ambient" error={errors.codeName?.message} {...register('codeName')} />
        <Input label="Urutan" placeholder="cth. 1" {...register('sequence')} />
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[#485885]">Owner</label>
          <select {...register('ownerId')} className="w-full border border-[#ebebeb] rounded-lg px-3 py-[7px] text-[13px] text-[#1f2b59] bg-white focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] transition-[border-color,box-shadow]">
            <option value="*">Semua Owner</option>
          </select>
        </div>
        <Controller
          name="warehouseId"
          control={control}
          render={({ field }) => (
            <SingleSelect
              label="Warehouse"
              placeholder="— Pilih Warehouse (opsional) —"
              value={field.value ?? ''}
              onChange={(val) => field.onChange(val)}
              loadOptions={loadWarehouseOptions}
              initialOption={initialWarehouseOption}
              error={errors.warehouseId?.message}
              emptyMessage="Tidak ada warehouse ditemukan"
            />
          )}
        />
        <Select label="Status" options={STATUS_OPTIONS} {...register('status')} />
      </PanelBody>
      <PanelFooter onCancel={onCancel} onSubmit={onFormSubmit} submitLabel={'Simpan'} loading={isSubmitting} />

      <ConfirmDialog
        open={showStatusConfirm}
        title={isDeactivating ? 'Nonaktifkan Kode Detail' : 'Aktifkan Kode Detail'}
        description={isDeactivating
          ? `Yakin ingin menonaktifkan kode "${initialData?.codeName}"?`
          : `Yakin ingin mengaktifkan kembali kode "${initialData?.codeName}"?`
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
