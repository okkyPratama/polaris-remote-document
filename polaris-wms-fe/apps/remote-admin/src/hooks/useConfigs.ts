import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { configsApi } from '../api/configs.api'

const QUERY_KEY = 'configs'

export function useConfigs(params?: {
  search?: string
  category?: string
  page?: number
  pageSize?: number
}) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => configsApi.getAll(params),
  })
}

export function useConfigDetail(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => configsApi.getById(id!),
    enabled: !!id,
  })
}

export function useConfigResolve(configKey: string | undefined, warehouseId?: string, ownerId?: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'resolve', configKey, warehouseId, ownerId],
    queryFn: () => configsApi.resolve(configKey!, warehouseId, ownerId),
    enabled: !!configKey,
  })
}

export function useCreateConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      configKey: string
      configValue: string
      dataType: string
      description?: string
      category?: string
      configGroup?: string
      typeCode?: string
      scope?: string
    }) => configsApi.save(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useUpdateConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { configValue?: string; description?: string; category?: string; configGroup?: string } }) =>
      configsApi.edit(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useDeleteConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => configsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useAddConfigDetail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      configId: string
      productId?: string | null
      ownerId?: string | null
      warehouseId?: string | null
      companyId?: string | null
      configValue: string
      status?: string
    }) => configsApi.addDetail(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useUpdateConfigDetail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: {
      id: string
      productId?: string | null
      ownerId?: string | null
      warehouseId?: string | null
      companyId?: string | null
      configValue: string
      status?: string
    }) => configsApi.editDetail(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useDeleteConfigDetail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => configsApi.deleteDetail(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}
