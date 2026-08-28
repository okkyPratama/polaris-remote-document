import { z } from 'zod'

export interface UserRole {
  id: string
  code: string
  name: string
  isSystem: boolean
}

export interface UserWarehouse {
  id: string
  warehouseId: string
  warehouseName: string
}

export interface UserOwner {
  id: string
  ownerId: string
  ownerName: string
}

export interface User {
  id: string
  keycloakId?: string
  username: string
  email: string
  fullName?: string
  status: 'ACTIVE' | 'INACTIVE'
  isDeleted?: boolean
  createdBy?: string
  createdAt: string
  updatedBy?: string
  updatedAt?: string
  roles?: UserRole[]
  warehouses?: UserWarehouse[]
  warehouseCount?: number
  owners?: UserOwner[]
  lastLoginAt?: string | null
  activeSessions?: number
}

export const userFormSchema = z.object({
  username: z.string().min(1, 'Nama pengguna wajib diisi').regex(/^\S+$/, 'Nama pengguna tidak boleh mengandung spasi'),
  fullName: z.string().min(1, 'Nama lengkap wajib diisi'),
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid').regex(/^\S+$/, 'Email tidak boleh mengandung spasi'),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  roleIds: z.array(z.string()).optional(),
  warehouseIds: z.array(z.string()).optional(),
  ownerIds: z.array(z.string()).optional(),
})

export type UserFormData = z.infer<typeof userFormSchema>
