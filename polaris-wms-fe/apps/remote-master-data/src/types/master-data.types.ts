import { z } from 'zod'

// TODO: Define MasterData types and schema

export interface MasterDataItem {
  id: number
  name: string
}

export const masterDataFormSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
})

export type MasterDataFormData = z.infer<typeof masterDataFormSchema>
