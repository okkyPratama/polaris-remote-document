import type { Common } from '../types/common.types'

// TODO: Replace with actual API calls via @polaris/service fetcher

export const commonApi = {
  getAll: async (): Promise<Common[]> => {
    // TODO: return (await fetcher.get('/...'))
    return []
  },

  create: async (payload: any): Promise<Common> => {
    console.log('API create:', payload)
    return { id: Date.now(), ...payload }
  },
}
