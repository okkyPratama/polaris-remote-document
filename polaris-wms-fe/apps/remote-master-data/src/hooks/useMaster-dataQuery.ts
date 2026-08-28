import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { masterDataApi } from '../api/master-data.api'
import { toast } from '@polaris/ui'
import { MSG_CREATE_SUCCESS, MSG_CREATE_ERROR } from '@polaris/config'

export const masterDataKeys = {
  all: ['masterData'] as const,
  lists: () => [...masterDataKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...masterDataKeys.lists(), { filters }] as const,
}

export const useMasterDataList = (filters?: Record<string, unknown>) => {
  return useQuery({
    queryKey: masterDataKeys.list(filters),
    queryFn: () => masterDataApi.getAll(),
    staleTime: 5 * 60 * 1000,
  })
}

export const useCreateMasterData = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: unknown) => masterDataApi.create(payload),
    onSuccess: () => {
      toast.success('Berhasil', MSG_CREATE_SUCCESS)
      queryClient.invalidateQueries({ queryKey: masterDataKeys.lists() })
    },
    onError: () => {
      toast.error('Gagal', MSG_CREATE_ERROR)
    },
  })
}
