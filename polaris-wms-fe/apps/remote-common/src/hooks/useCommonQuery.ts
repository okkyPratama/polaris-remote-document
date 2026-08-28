import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { commonApi } from '../api/common.api'
import { toast } from '@polaris/ui'
import { MSG_CREATE_SUCCESS, MSG_CREATE_ERROR } from '@polaris/config'

export const commonKeys = {
  all: ['common'] as const,
  lists: () => [...commonKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...commonKeys.lists(), { filters }] as const,
}

export const useCommonList = (filters?: Record<string, unknown>) => {
  return useQuery({
    queryKey: commonKeys.list(filters),
    queryFn: () => commonApi.getAll(),
    staleTime: 5 * 60 * 1000,
  })
}

export const useCreateCommon = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: any) => commonApi.create(payload),
    onSuccess: () => {
      toast.success('Berhasil', MSG_CREATE_SUCCESS)
      queryClient.invalidateQueries({ queryKey: commonKeys.lists() })
    },
    onError: () => {
      toast.error('Gagal', MSG_CREATE_ERROR)
    },
  })
}
