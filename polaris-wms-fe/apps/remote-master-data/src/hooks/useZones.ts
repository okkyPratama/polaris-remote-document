import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { zoneApi } from '../api/zone.api'
import type { ZoneFormData, ZoneSearchParams } from '../types/spatial.types'

const QUERY_KEY = 'zones'
const ZONE_GROUP_QUERY_KEY = 'zone-groups'

function invalidateZoneQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
  // Zone Group detail may later show child counts / related spatial summary.
  queryClient.invalidateQueries({ queryKey: [ZONE_GROUP_QUERY_KEY, 'detail'] })
}

export function useZones(params?: ZoneSearchParams) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => zoneApi.getAll(params),
  })
}

export function useZoneDetail(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => zoneApi.getById(id!),
    enabled: !!id,
  })
}

export function useCreateZone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ZoneFormData) => zoneApi.create(data),
    onSuccess: () => {
      invalidateZoneQueries(queryClient)
    },
  })
}

export function useUpdateZone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ZoneFormData }) => zoneApi.update(id, data),
    onSuccess: () => {
      invalidateZoneQueries(queryClient)
    },
  })
}

export function useDeleteZone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => zoneApi.delete(id),
    onSuccess: () => {
      invalidateZoneQueries(queryClient)
    },
  })
}
