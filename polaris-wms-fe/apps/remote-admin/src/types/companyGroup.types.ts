import { z } from 'zod'

export interface CompanyGroupEntity {
  code: string
  name: string
  city: string
  status: 'AKTIF' | 'NONAKTIF'
}

export interface CompanyGroup {
  id: string
  code: string
  name: string
  industry?: string
  companyCount?: number
  status: 'AKTIF' | 'NONAKTIF'
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  description?: string
  address?: string
  createdBy?: string
  createdAt: string
  updatedBy?: string
  updatedAt?: string
  entities?: CompanyGroupEntity[]
}

export const companyGroupFormSchema = z.object({
  code: z.string().min(1, 'Kode group wajib diisi'),
  name: z.string().min(1, 'Nama group wajib diisi'),
  industry: z.string().optional(),
  description: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['AKTIF', 'NONAKTIF']).optional(),
})

export type CompanyGroupFormData = z.infer<typeof companyGroupFormSchema>
