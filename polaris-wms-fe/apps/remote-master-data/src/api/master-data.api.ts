import type { MasterDataItem } from '../types/master-data.types'

// TODO: Replace with actual API calls via @polaris/service fetcher

export const masterDataApi = {
  getAll: async (): Promise<MasterDataItem[]> => {
    return []
  },

  create: async (payload: unknown): Promise<MasterDataItem> => {
    console.log('API create:', payload)
    return { id: Date.now(), name: '' }
  },
}
