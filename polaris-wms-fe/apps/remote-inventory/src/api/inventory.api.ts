import type { Inventory } from '../types/inventory.types'

// TODO: Replace with actual API calls via @polaris/service fetcher

export const inventoryApi = {
  getAll: async (): Promise<Inventory[]> => {
    // TODO: return (await fetcher.get('/...'))
    return []
  },

  create: async (payload: any): Promise<Inventory> => {
    console.log('API create:', payload)
    return { id: Date.now(), ...payload }
  },
}
