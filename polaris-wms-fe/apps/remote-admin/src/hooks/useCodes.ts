import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { codesApi } from '../api/codes.api'

const QUERY_KEY = 'codes'

export function useCodes(params?: {
  search?: string
  status?: 'ALL' | 'AKTIF' | 'NONAKTIF'
  page?: number
  pageSize?: number
}) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => codesApi.getAll(params),
  })
}

export function useCodeDetail(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => codesApi.getById(id!),
    enabled: !!id,
  })
}

export function useCreateCode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { typeCode: string; typeCodeDescription: string; status?: string }) => codesApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }) },
  })
}

export function useUpdateCode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { typeCodeDescription?: string; status?: string } }) => codesApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }) },
  })
}

export function useDeleteCode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => codesApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }) },
  })
}

export function useCreateCodeDetail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { typeCodeId: string; codeDetailId: string; codeName: string; sequence?: number; status?: string; ownerId?: string | null; warehouseId?: string | null }) => codesApi.createDetail(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }) },
  })
}

export function useUpdateCodeDetail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { codeDetailId?: string; codeName?: string; sequence?: number; status?: string; ownerId?: string | null; warehouseId?: string | null } }) => codesApi.updateDetail(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }) },
  })
}

export function useDeleteCodeDetail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => codesApi.deleteDetail(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }) },
  })
}
