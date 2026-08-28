import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Panel, PanelBody, PanelFooter, Input, Select, SingleSelect, type SingleSelectOption } from '@polaris/ui'
import type { CompanyGroup } from '../../types/companyGroup.types'
import type { CompanyFormData } from '../../types/company.types'
import { companyFormSchema } from '../../types/company.types'
import { companiesApi } from '../../api/companies.api'

// Schema untuk assign existing company
const assignSchema = z.object({
  companyId: z.string().min(1, 'Pilih perusahaan'),
})
type AssignFormData = z.infer<typeof assignSchema>

const STATUS_OPTIONS = [
  { value: 'AKTIF', label: 'Aktif' },
  { value: 'NONAKTIF', label: 'Nonaktif' },
]

async function loadCompaniesOptions(query: string): Promise<SingleSelectOption[]> {
  const res = await companiesApi.getAll({ search: query, status: 'AKTIF', pageSize: 50, companyGroupIdNull: true })
  return res.data.map((c) => ({
    value: c.id,
    label: c.name,
    description: c.code,
  }))
}

type SubPanel = 'assign' | 'create-new'

interface Props {
  open: boolean
  group: CompanyGroup | null
  onClose: () => void
  onAssign: (companyId: string) => Promise<void>
  onCreateCompany: (data: CompanyFormData) => Promise<void>
}

export function AssignEntityPanel({ open, group, onClose, onAssign, onCreateCompany }: Props) {
  const [subPanel, setSubPanel] = useState<SubPanel>('assign')

  if (!group) return null

  return (
    <>
      {subPanel === 'assign' && (
        <AssignSubPanel
          open={open}
          group={group}
          onClose={onClose}
          onAssign={onAssign}
          onCreateNew={() => setSubPanel('create-new')}
        />
      )}
      {subPanel === 'create-new' && (
        <CreateCompanySubPanel
          open={open}
          group={group}
          onClose={onClose}
          onBack={() => setSubPanel('assign')}
          onSubmit={onCreateCompany}
        />
      )}
    </>
  )
}

// ─── Sub-panel: Assign existing company ────────────────────────────────────────

interface AssignSubPanelProps {
  open: boolean
  group: CompanyGroup
  onClose: () => void
  onAssign: (companyId: string) => Promise<void>
  onCreateNew: () => void
}

function AssignSubPanel({ open, group, onClose, onAssign, onCreateNew }: AssignSubPanelProps) {
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<AssignFormData>({
    resolver: zodResolver(assignSchema),
    defaultValues: { companyId: '' },
  })

  const onFormSubmit = handleSubmit(async (data) => {
    await onAssign(data.companyId)
  })

  return (
    <Panel open={open} onClose={onClose}>
      <div className="flex items-center justify-between pr-7 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[#001871] mb-0.5">Pilih Perusahaan</h2>
          <p className="text-[11px] text-[#485885]">Tambahkan perusahaan ke dalam grup ini</p>
        </div>
        <button
          type="button"
          onClick={onCreateNew}
          className="text-[11px] font-medium text-[#001871] hover:underline cursor-pointer whitespace-nowrap"
        >
          + Buat Perusahaan Baru
        </button>
      </div>

      <PanelBody>
        {/* Group (disabled/locked) */}
        <Input
          label="Grup Perusahaan"
          value={`${group.name} / ${group.code}`}
          disabled
        />

        {/* Pilih Perusahaan */}
        <Controller
          name="companyId"
          control={control}
          render={({ field }) => (
            <SingleSelect
              label="Pilih Perusahaan *"
              placeholder="— Pilih Perusahaan —"
              value={field.value}
              onChange={(val) => field.onChange(val)}
              loadOptions={loadCompaniesOptions}
              error={errors.companyId?.message}
              emptyMessage="Tidak ada perusahaan ditemukan"
            />
          )}
        />
      </PanelBody>

      <PanelFooter onCancel={onClose} onSubmit={onFormSubmit} submitLabel="Simpan" loading={isSubmitting} />
    </Panel>
  )
}

// ─── Sub-panel: Create new company ────────────────────────────────────────────

interface CreateCompanySubPanelProps {
  open: boolean
  group: CompanyGroup
  onClose: () => void
  onBack: () => void
  onSubmit: (data: CompanyFormData) => Promise<void>
}

function CreateCompanySubPanel({ open, group, onClose, onBack, onSubmit }: CreateCompanySubPanelProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CompanyFormData>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      code: '',
      name: '',
      companyGroupId: group.id,
      contactName: '',
      email: '',
      phone: '',
      address: '',
      status: 'AKTIF',
    },
  })

  const onFormSubmit = handleSubmit(async (data) => {
    await onSubmit({ ...data, companyGroupId: group.id })
  })

  return (
    <Panel open={open} onClose={onClose}>
      <div className="pr-7 mb-3.5">
        <div className="flex items-center gap-2 mb-2">
          <button
            type="button"
            onClick={onBack}
            className="text-[#485885] hover:text-[#001871] cursor-pointer transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-sm font-semibold text-[#001871] mb-0.5">Buat Perusahaan Baru</h2>
            <p className="text-[11px] text-[#485885]">Perusahaan akan langsung masuk ke grup <span className="font-medium text-[#001871]">{group.name}</span></p>
          </div>
        </div>
      </div>

      <PanelBody>
        {/* Group (locked) */}
        <Input
          label="Grup Perusahaan"
          value={`${group.name} / ${group.code}`}
          disabled
        />
        <Input
          label="Kode Perusahaan *"
          placeholder="cth. POLARIS-DIST"
          error={errors.code?.message}
          {...register('code')}
        />
        <Input
          label="Nama Perusahaan *"
          placeholder="Nama lengkap perusahaan"
          error={errors.name?.message}
          {...register('name')}
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

      <PanelFooter onCancel={onBack} onSubmit={onFormSubmit} submitLabel="Simpan" loading={isSubmitting} />
    </Panel>
  )
}
