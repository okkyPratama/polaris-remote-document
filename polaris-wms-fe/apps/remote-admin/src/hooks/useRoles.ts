import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rolesApi } from '../api/roles.api'
import type { RoleFormData } from '../types/role.types'

const QUERY_KEY = 'roles'

export function useRoles(params?: {
  search?: string
  type?: string
  page?: number
  pageSize?: number
}) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => rolesApi.getAll(params),
  })
}

export function useRoleDetail(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => rolesApi.getById(id!),
    enabled: !!id,
  })
}

export function useCreateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: RoleFormData) => rolesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RoleFormData }) =>
      rolesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useDeleteRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => rolesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}
