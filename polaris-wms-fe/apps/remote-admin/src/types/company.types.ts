import { z } from 'zod'

export interface CompanyWarehouse {
  code: string
  name: string
  city: string
  status: 'AKTIF' | 'NONAKTIF'
}

export interface Company {
  id: string
  code: string
  name: string
  companyGroupId?: string
  companyGroupCode?: string
  companyGroupName?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  address?: string
  city?: string
  province?: string
  npwp?: string
  warehouseCount: number
  warehouses?: CompanyWarehouse[]
  status: 'AKTIF' | 'NONAKTIF'
  createdBy?: string
  createdAt: string
  updatedBy?: string
  updatedAt?: string
}

export const companyFormSchema = z.object({
  code: z.string().min(1, 'Kode perusahaan wajib diisi'),
  name: z.string().min(1, 'Nama perusahaan wajib diisi'),
  companyGroupId: z.string().optional(),
  npwp: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  contactName: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['AKTIF', 'NONAKTIF']).optional(),
})

export type CompanyFormData = z.infer<typeof companyFormSchema>
