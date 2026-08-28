import { z } from 'zod'

export interface PermissionItem {
  id: string
  key: string
  resource: string
  action: string
  module?: string
  description?: string
}

export interface PermissionDomain {
  domain: string
  label: string
  permissions: PermissionItem[]
}

export interface RoleScope {
  companyId?: string
  companyName?: string
  warehouseId?: string
  warehouseName?: string
}

export interface Role {
  id: string
  code: string
  name: string
  description: string
  isSystem?: boolean
  status: 'ACTIVE' | 'INACTIVE'
  scopes?: RoleScope[]
  permissionCount?: number
  createdBy?: string
  createdAt: string
  updatedBy?: string
  updatedAt?: string
  // Computed / backward compat
  type: 'SYSTEM' | 'CUSTOM'
  userCount: number
  permissions?: PermissionItem[]
}

export const roleFormSchema = z.object({
  code: z.string().min(1, 'Kode peran wajib diisi'),
  name: z.string().min(1, 'Nama peran wajib diisi'),
  description: z.string().optional(),
  warehouseIds: z.array(z.string()).optional(),
  permissionIds: z.array(z.string()).min(1, 'Minimal 1 izin wajib dipilih'),
})

export type RoleFormData = z.infer<typeof roleFormSchema>
