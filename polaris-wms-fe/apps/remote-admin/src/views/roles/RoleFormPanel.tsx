import { useEffect, useState, useCallback, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Panel, PanelBody, PanelFooter, Input, TextArea } from '@polaris/ui'
import type { RoleFormData, PermissionDomain } from '../../types/role.types'
import { roleFormSchema } from '../../types/role.types'
import { permissionsApi } from '../../api/permissions.api'

interface Props {
  open: boolean
  mode: 'create' | 'edit'
  initialData?: RoleFormData
  onClose: () => void
  onBack?: () => void
  onSubmit: (data: RoleFormData) => Promise<void>
}

export function RoleFormPanel({ open, mode, initialData, onClose, onBack, onSubmit }: Props) {
  const isEdit = mode === 'edit'

  const [permissionDomains, setPermissionDomains] = useState<PermissionDomain[]>([])
  const [permissionsLoading, setPermissionsLoading] = useState(false)

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<RoleFormData>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: initialData,
  })

  const fetchPermissions = useCallback(async () => {
    setPermissionsLoading(true)
    try {
      const domains = await permissionsApi.getAll()
      setPermissionDomains(domains)
    } catch {
      // silent
    } finally {
      setPermissionsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  const prevOpenRef = useRef(false)
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      reset(initialData ?? { code: '', name: '', description: '', permissionIds: [] })
    }
    prevOpenRef.current = open
  }, [open, initialData, reset])

  const onFormSubmit = handleSubmit(async (data) => {
    await onSubmit(data)
  })

  return (
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
          {isEdit ? `Edit: ${initialData?.name ?? ''}` : 'Tambah Peran Kustom'}
        </h2>
        {!isEdit && (
          <p className="text-[11px] text-[#485885]">
            Peran kustom dapat dikombinasikan dengan peran sistem
          </p>
        )}
      </div>

      {/* System role lock notice (edit only) */}
      {isEdit && (
        <div className="flex items-start gap-2 bg-[rgba(0,24,113,0.06)] rounded-lg px-3 py-2.5 mb-3.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#485885" strokeWidth="2" className="flex-shrink-0 mt-px">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="text-[11px] text-[#485885] leading-snug">
            Hanya tersedia untuk peran kustom. Peran sistem tidak dapat diubah.
          </span>
        </div>
      )}

      <PanelBody>
        {/* Kode Peran */}
        <Input
          label="Kode Peran *"
          placeholder="Contoh: ROLE-OPR-IN"
          error={errors.code?.message}
          {...register('code')}
        />
        
        {/* Nama Peran */}
        <Input
          label="Nama Peran *"
          placeholder="Contoh: Operator Inbound"
          error={errors.name?.message}
          {...register('name')}
        />

        {/* Deskripsi */}
        <TextArea
          label="Deskripsi"
          placeholder="Uraian singkat tanggung jawab peran ini"
          rows={2}
          {...register('description')}
        />

        {/* Permissions */}
        <div className="border-t border-[#f1f3f8] pt-3.5 mt-1">
          <div className="text-[10px] font-bold text-[#a9b1c6] uppercase tracking-[0.08em] mb-2.5">Izin</div>

          <div className="flex items-start gap-2 bg-[rgba(0,24,113,0.06)] rounded-lg px-3 py-2.5 mb-3.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#485885" strokeWidth="2" className="flex-shrink-0 mt-px">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-[11px] text-[#485885] leading-snug">
              Izin dikumulatif — pengguna mendapatkan izin gabungan dari semua peran yang ditetapkan.
            </span>
          </div>

          {errors.permissionIds && (
            <p className="text-[11px] text-[#ef3340] mb-2">{errors.permissionIds.message}</p>
          )}

          {permissionsLoading ? (
            <div className="text-[12px] text-[#a9b1c6] py-4 text-center">Memuat izin...</div>
          ) : (
            <Controller
              control={control}
              name="permissionIds"
              render={({ field }) => (
                <div className="flex flex-col gap-3">
                  {permissionDomains.map((domain) => {
                    const domainPermIds = domain.permissions.map((p) => p.id)
                    const allChecked = domainPermIds.every((id) => field.value?.includes(id))
                    const someChecked = domainPermIds.some((id) => field.value?.includes(id))

                    const toggleDomain = () => {
                      const newVal = allChecked
                        ? (field.value || []).filter((id) => !domainPermIds.includes(id))
                        : [...new Set([...(field.value || []), ...domainPermIds])]
                      field.onChange(newVal)
                    }

                    const togglePerm = (permId: string) => {
                      const newVal = field.value?.includes(permId)
                        ? (field.value || []).filter((id) => id !== permId)
                        : [...(field.value || []), permId]
                      field.onChange(newVal)
                    }

                    return (
                      <div key={domain.domain} className="border border-[#ebebeb] rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 bg-[#fafbfd] border-b border-[#ebebeb]">
                          <span className="text-[11px] font-semibold text-[#485885]">{domain.label}</span>
                          <label className="flex items-center gap-1.5 text-[11px] text-[#485885] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={allChecked}
                              ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked }}
                              onChange={toggleDomain}
                              className="accent-[#001871] cursor-pointer"
                            />
                            Semua
                          </label>
                        </div>
                        <div className="px-3 py-2 flex flex-col gap-1.5">
                          {domain.permissions.map((p) => (
                            <label key={p.id} className="flex items-center gap-2 text-xs text-[#1f2b59] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={field.value?.includes(p.id)}
                                onChange={() => togglePerm(p.id)}
                                className="accent-[#001871] cursor-pointer flex-shrink-0"
                              />
                              <span>{p.description || p.key}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            />
          )}
        </div>
      </PanelBody>

      <PanelFooter onCancel={onClose} onSubmit={onFormSubmit} submitLabel="Simpan" loading={isSubmitting} />
    </Panel>
  )
}
