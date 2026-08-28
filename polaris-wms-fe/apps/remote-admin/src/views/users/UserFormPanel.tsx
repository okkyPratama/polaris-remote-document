import { useEffect, useState, useCallback, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Panel, PanelBody, PanelFooter, Input, MultiSelect, ConfirmDialog } from '@polaris/ui'
import type { MultiSelectOption } from '@polaris/ui'
import type { UserFormData } from '../../types/user.types'
import { userFormSchema } from '../../types/user.types'
import { rolesApi } from '../../api/roles.api'
import { warehouseApi } from '../../api/warehouse.api'

const SELECT_CLASS =
  "w-full border border-[#ebebeb] rounded-lg px-3 py-[7px] text-[13px] text-[#1f2b59] bg-white appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%2712%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23485885%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center] focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] transition-[border-color,box-shadow] disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#fafbfd]"

async function loadRoleOptions(query: string): Promise<MultiSelectOption[]> {
  const res = await rolesApi.getAll({ search: query, pageSize: 50 })
  return res.data.map((g) => ({
    value: g.id,
    label: g.name,
  }))
}

interface Props {
  open: boolean
  mode: 'create' | 'edit'
  initialData?: UserFormData
  onClose: () => void
  onBack?: () => void
  onSubmit: (data: UserFormData) => Promise<void>
}

export function UserFormPanel({ open, mode, initialData, onClose, onBack, onSubmit }: Props) {
  const [warehouseOptions, setWarehouseOptions] = useState<MultiSelectOption[]>([])
  const [warehousesLoading, setWarehousesLoading] = useState(false)
  const [roleOptions, setRoleOptions] = useState<MultiSelectOption[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const isEdit = mode === 'edit'

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: initialData,
  })

  const fetchWarehouses = useCallback(async (search?: string) => {
    setWarehousesLoading(true)
    try {
      const res = await warehouseApi.getAll({ search, status: 'AKTIF', pageSize: 50 })
      setWarehouseOptions(res.data.map((w) => ({ value: w.id, label: w.name })))
    } catch {
      // silent
    } finally {
      setWarehousesLoading(false)
    }
  }, [])

  const fetchRoles = useCallback(async (search?: string) => {
    setRolesLoading(true)
    try {
      const options = await loadRoleOptions(search ?? '')
      setRoleOptions(options)
    } catch {
      // silent
    } finally {
      setRolesLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWarehouses()
    fetchRoles()
  }, [fetchWarehouses, fetchRoles])

  const prevOpenRef = useRef(false)
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      reset(
        initialData ?? {
          fullName: '',
          username: '',
          email: '',
          status: 'ACTIVE',
          roleIds: [],
          warehouseIds: [],
        }
      )
    }
    prevOpenRef.current = open
  }, [open, initialData, reset])

  const [pendingData, setPendingData] = useState<UserFormData | null>(null)
  const [showStatusConfirm, setShowStatusConfirm] = useState(false)
  const submitLock = useRef(false)

  const statusChanged = (data: UserFormData) =>
    isEdit && initialData?.status && data.status !== initialData.status

  const onFormSubmit = handleSubmit(async (data) => {
    if (isSubmitting || submitLock.current) return
    submitLock.current = true
    try {
      if (statusChanged(data)) {
        setPendingData(data)
        setShowStatusConfirm(true)
        return
      }
      await onSubmit(data)
    } finally {
      submitLock.current = false
    }
  })

  const handleConfirmStatusChange = async () => {
    if (pendingData) {
      await onSubmit(pendingData)
    }
    setShowStatusConfirm(false)
    setPendingData(null)
  }

  return (
    <>
    <Panel open={open} onClose={onClose}>
      {/* Back button (edit only) */}
      {isEdit && onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-[11px] text-[#485885] hover:text-[#001871] mb-3 transition-colors"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Kembali ke detail
        </button>
      )}

      {/* Header */}
      <div className="pr-7 mb-3.5">
        <h2 className="text-sm font-semibold text-[#001871] mb-1">
          {isEdit ? `Edit: ${initialData?.fullName ?? initialData?.username ?? ''}` : 'Tambah Pengguna'}
        </h2>
        {!isEdit && (
          <p className="text-[11px] text-[#485885]">
            Isi informasi akun dan tetapkan peran serta akses gudang
          </p>
        )}
      </div>

      {/* Lock notice (edit only) */}
      {isEdit && (
        <div className="flex items-start gap-2 bg-[rgba(0,24,113,0.06)] rounded-lg px-3 py-2.5 mb-3.5">
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="#485885" strokeWidth="2" className="flex-shrink-0 mt-px"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="text-[11px] text-[#485885] leading-snug">
            Username tidak dapat diubah setelah akun dibuat.
          </span>
        </div>
      )}

      <PanelBody>
        {/* Nama Lengkap */}
        <Input
          label="Nama Lengkap *"
          placeholder="Nama lengkap pengguna"
          error={errors.fullName?.message}
          {...register('fullName')}
        />

        {/* Nama Pengguna */}
        <Input
          label="Nama Pengguna *"
          disabled={isEdit}
          className={isEdit ? 'opacity-50 cursor-not-allowed bg-[#fafbfd]' : ''}
          placeholder="Nama pengguna"
          error={errors.username?.message}
          onKeyDown={(e) => { if (e.key === ' ') e.preventDefault() }}
          {...register('username')}
        />

        {/* Email */}
        <Input
          label="Email *"
          type="email"          
          placeholder="nama@domain.com"
          error={errors.email?.message}
          onKeyDown={(e) => { if (e.key === ' ') e.preventDefault() }}
          {...register('email')}
        />

        {/* Peran */}
        <Controller
          name="roleIds"
          control={control}
          render={({ field }) => (
            <MultiSelect
              label="Peran"
              placeholder="— Pilih Peran —"
              options={roleOptions}
              value={field.value ?? []}
              onChange={field.onChange}
              onSearch={fetchRoles}
              loading={rolesLoading}
              error={errors.roleIds?.message}
            />
          )}
        />

        {/* Akses Gudang */}
        <Controller
          control={control}
          name="warehouseIds"
          render={({ field }) => (
            <MultiSelect
              label="Akses Gudang"
              placeholder="— Pilih Gudang —"
              options={warehouseOptions}
              value={field.value ?? []}
              onChange={field.onChange}
              onSearch={fetchWarehouses}
              loading={warehousesLoading}
              error={errors.warehouseIds?.message}
            />
          )}
        />

        {/* Status */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[#485885]">Status</label>
          <select {...register('status')} className={SELECT_CLASS}>
            <option value="ACTIVE">AKTIF</option>
            <option value="INACTIVE">NONAKTIF</option>
          </select>
        </div>
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
      title={pendingData?.status === 'INACTIVE' ? 'Nonaktifkan Pengguna' : 'Aktifkan Pengguna'}
      description={
        pendingData?.status === 'INACTIVE'
          ? `Yakin ingin menonaktifkan pengguna ini? Pengguna tidak akan dapat login setelah dinonaktifkan.`
          : `Yakin ingin mengaktifkan kembali pengguna ini? Pengguna akan dapat login setelah diaktifkan.`
      }
      confirmLabel={pendingData?.status === 'INACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
      cancelLabel="Batal"
      variant={pendingData?.status === 'INACTIVE' ? 'danger' : 'default'}
      isLoading={isSubmitting}
      onConfirm={handleConfirmStatusChange}
      onCancel={() => { setShowStatusConfirm(false); setPendingData(null) }}
    />
    </>
  )
}
