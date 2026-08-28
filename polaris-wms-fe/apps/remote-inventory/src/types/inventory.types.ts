import { z } from 'zod'

// TODO: Define Inventory types and schema

export interface Inventory {
  id: number
  name: string
}

export const inventoryFormSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
})

export type InventoryFormData = z.infer<typeof inventoryFormSchema>
