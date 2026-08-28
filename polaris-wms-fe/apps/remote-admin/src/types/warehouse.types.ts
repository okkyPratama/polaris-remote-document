import { z } from 'zod'

export interface Warehouse {
  id: string
  code: string
  name: string
  address: string
  city: string
  province: string
  capacity: number
  area: number
  pic: string
  phone: string
  tempZones: ('Ambient' | 'Chiller' | 'Freezer')[]
  timezone: string
  status: 'AKTIF' | 'NONAKTIF'
  createdBy?: string
  createdAt: string
  updatedBy?: string
  updatedAt?: string
  companyId?: string
  companyCode?: string
  companyName?: string
  postalCode?: string
  countryCode?: string
  latitude?: number
  longitude?: number
  activeSince?: string
}

export const warehouseFormSchema = z.object({
  code: z.string().min(1, 'Kode gudang wajib diisi'),
  name: z.string().min(1, 'Nama gudang wajib diisi'),
  companyId: z.string().optional(),
  address: z.string().min(1, 'Alamat wajib diisi'),
  city: z.string().min(1, 'Kota wajib diisi'),
  province: z.string().min(1, 'Provinsi wajib diisi'),
  postalCode: z.string().optional(),
  capacity: z.string().optional(),
  area: z.string().optional(),
  pic: z.string().min(1, 'PIC wajib diisi'),
  phone: z.string().optional(),
  tempZones: z.array(z.string()).optional(),
  timezone: z.string().optional(),
  status: z.enum(['AKTIF', 'NONAKTIF']).optional(),
})

export type WarehouseFormData = z.infer<typeof warehouseFormSchema>
