import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { carrierServiceTypeApi } from '../api/carrierServiceType.api'
import type { CarrierServiceTypeFormData, CarrierServiceTypeSearchParams } from '../types/carrierServiceType.types'

const QUERY_KEY = 'carrier-service-types'

export function useCarrierServiceTypes(params?: CarrierServiceTypeSearchParams) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => carrierServiceTypeApi.getAll(params),
  })
}

export function useCarrierServiceTypeDetail(id?: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => carrierServiceTypeApi.getById(id!),
    enabled: !!id,
  })
}

export function useCreateCarrierServiceType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CarrierServiceTypeFormData) => carrierServiceTypeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useUpdateCarrierServiceType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CarrierServiceTypeFormData }) =>
      carrierServiceTypeApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useDeactivateCarrierServiceType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => carrierServiceTypeApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}
