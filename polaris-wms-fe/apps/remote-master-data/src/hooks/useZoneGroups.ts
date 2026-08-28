import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { zoneGroupApi } from '../api/zone-group.api'
import type { ZoneGroupFormData, ZoneGroupSearchParams } from '../types/spatial.types'

const QUERY_KEY = 'zone-groups'

export function useZoneGroups(params?: ZoneGroupSearchParams) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => zoneGroupApi.getAll(params),
  })
}

export function useZoneGroupDetail(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => zoneGroupApi.getById(id!),
    enabled: !!id,
  })
}

export function useCreateZoneGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ZoneGroupFormData) => zoneGroupApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useUpdateZoneGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ZoneGroupFormData }) =>
      zoneGroupApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useDeleteZoneGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => zoneGroupApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}
