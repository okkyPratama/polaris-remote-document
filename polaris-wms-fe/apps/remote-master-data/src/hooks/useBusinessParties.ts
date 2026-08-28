import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { businessPartiesApi } from '../api/businessParty.api'
import type { BusinessPartyFormData, BusinessPartySearchParams } from '../types/businessParty.types'

const QUERY_KEY = 'business-parties'

export function useBusinessParties(params?: BusinessPartySearchParams) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => businessPartiesApi.getAll(params),
  })
}

export function useBusinessPartyDetail(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => businessPartiesApi.getById(id!),
    enabled: !!id,
  })
}

export function useCreateBusinessParty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: BusinessPartyFormData) => businessPartiesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useUpdateBusinessParty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BusinessPartyFormData }) =>
      businessPartiesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useDeleteBusinessParty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => businessPartiesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useDeactivateBusinessParty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => businessPartiesApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useReactivateBusinessParty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => businessPartiesApi.reactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useBusinessPartyWarehouseOptions(enabled = false) {
  return useQuery({
    queryKey: [QUERY_KEY, 'warehouse-options'],
    queryFn: () => businessPartiesApi.getWarehouseOptions(),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── Owner Warehouse Access ─────────────────────────────────────────

export function useAssignOwnerWarehouse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ ownerId, warehouseId }: { ownerId: string; warehouseId: string }) =>
      businessPartiesApi.assignOwnerWarehouse(ownerId, warehouseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useRemoveOwnerWarehouse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ accessId }: { accessId: string }) =>
      businessPartiesApi.removeOwnerWarehouse(accessId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

// ─── Supplier Warehouse Access ──────────────────────────────────────

export function useAssignSupplierWarehouse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ supplierId, warehouseId }: { supplierId: string; warehouseId: string }) =>
      businessPartiesApi.assignSupplierWarehouse(supplierId, warehouseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useRemoveSupplierWarehouse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ businessPartyId }: { businessPartyId: string }) =>
      businessPartiesApi.removeSupplierWarehouse(businessPartyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

// ─── Consignee Warehouse Access ─────────────────────────────────────

export function useAssignConsigneeWarehouse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ consigneeId, warehouseId }: { consigneeId: string; warehouseId: string }) =>
      businessPartiesApi.assignConsigneeWarehouse(consigneeId, warehouseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useRemoveConsigneeWarehouse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ businessPartyId }: { businessPartyId: string }) =>
      businessPartiesApi.removeConsigneeWarehouse(businessPartyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}
