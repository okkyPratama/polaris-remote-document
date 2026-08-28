import { z } from 'zod'

// TODO: Define Common types and schema

export interface Common {
  id: number
  name: string
}

export const commonFormSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
})

export type CommonFormData = z.infer<typeof commonFormSchema>
