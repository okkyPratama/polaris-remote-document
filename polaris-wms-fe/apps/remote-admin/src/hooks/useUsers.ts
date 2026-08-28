import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../api/users.api'
import type { UserFormData } from '../types/user.types'

const QUERY_KEY = 'users'

export function useUsers(params?: {
  search?: string
  status?: 'ALL' | 'ACTIVE' | 'INACTIVE'
  roleCode?: string
  page?: number
  pageSize?: number
}) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => usersApi.getAll(params),
  })
}

export function useUserDetail(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => usersApi.getById(id!),
    enabled: !!id,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UserFormData) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserFormData }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}
