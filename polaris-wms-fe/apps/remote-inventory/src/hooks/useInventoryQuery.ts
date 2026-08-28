import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '../api/inventory.api'
import { toast } from '@polaris/ui'
import { MSG_CREATE_SUCCESS, MSG_CREATE_ERROR } from '@polaris/config'

export const inventoryKeys = {
  all: ['inventory'] as const,
  lists: () => [...inventoryKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...inventoryKeys.lists(), { filters }] as const,
}

export const useInventoryList = (filters?: Record<string, unknown>) => {
  return useQuery({
    queryKey: inventoryKeys.list(filters),
    queryFn: () => inventoryApi.getAll(),
    staleTime: 5 * 60 * 1000,
  })
}

export const useCreateInventory = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: any) => inventoryApi.create(payload),
    onSuccess: () => {
      toast.success('Berhasil', MSG_CREATE_SUCCESS)
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() })
    },
    onError: () => {
      toast.error('Gagal', MSG_CREATE_ERROR)
    },
  })
}
