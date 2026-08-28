import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { locationApi } from '../api/location.api'
import type {
  LocationBulkItem,
  LocationFormData,
  LocationSearchParams,
} from '../types/spatial.types'

const QUERY_KEY = 'locations'
const ZONE_QUERY_KEY = 'zones'

function invalidateLocationQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
  // Zone detail may later show child location counts.
  queryClient.invalidateQueries({ queryKey: [ZONE_QUERY_KEY, 'detail'] })
}

export function useLocations(params?: LocationSearchParams) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => locationApi.getAll(params),
  })
}

export function useLocationDetail(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => locationApi.getById(id!),
    enabled: !!id,
  })
}

export function useCreateLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: LocationFormData) => locationApi.create(data),
    onSuccess: () => {
      invalidateLocationQueries(queryClient)
    },
  })
}

export function useUpdateLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LocationFormData }) =>
      locationApi.update(id, data),
    onSuccess: () => {
      invalidateLocationQueries(queryClient)
    },
  })
}

export function useDeleteLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => locationApi.delete(id),
    onSuccess: () => {
      invalidateLocationQueries(queryClient)
    },
  })
}

export function useBulkCreateLocations() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (items: LocationBulkItem[]) => locationApi.bulkCreate(items),
    onSuccess: () => {
      invalidateLocationQueries(queryClient)
    },
  })
}
