import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { companyGroupApi } from '../api/companyGroup.api'
import type { CompanyGroupFormData } from '../types/companyGroup.types'

const QUERY_KEY = 'company-groups'

export function useCompanyGroups(params?: {
  search?: string
  status?: 'ALL' | 'AKTIF' | 'NONAKTIF'
  page?: number
  pageSize?: number
}) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => companyGroupApi.getAll(params),
  })
}

export function useCompanyGroupDetail(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => companyGroupApi.getById(id!),
    enabled: !!id,
  })
}

export function useCreateCompanyGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CompanyGroupFormData) => companyGroupApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useUpdateCompanyGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CompanyGroupFormData }) =>
      companyGroupApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useDeleteCompanyGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => companyGroupApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}
