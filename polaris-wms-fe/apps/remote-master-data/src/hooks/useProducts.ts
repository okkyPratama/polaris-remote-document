import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productsApi } from '../api/product.api'
import { businessPartiesApi } from '../api/businessParty.api'
import type { ProductFormData, ProductSearchParams, OwnerOption } from '../types/product.types'

const QUERY_KEY = 'products'

export function useProducts(params?: ProductSearchParams) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => productsApi.getAll(params),
  })
}

export function useProductDetail(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => productsApi.getById(id!),
    enabled: !!id,
  })
}

export function useProductSearch(keyword: string, ownerId?: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'search', keyword, ownerId],
    queryFn: () => productsApi.search(keyword, ownerId),
    enabled: keyword.length >= 2,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ProductFormData) => productsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductFormData }) => productsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useDeactivateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => productsApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useReactivateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => productsApi.reactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useOwnerOptions() {
  return useQuery({
    queryKey: ['owner-options'],
    queryFn: async (): Promise<OwnerOption[]> => {
      const res = await businessPartiesApi.getAll({ role: 'OWNER', status: 'ACTIVE', page: 1, pageSize: 100 })
      return res.data.map((bp) => ({ id: bp.id, code: bp.code, name: bp.name }))
    },
    staleTime: 60_000,
  })
}

export function useCategoryOptions() {
  return useQuery({
    queryKey: ['product-category-options'],
    queryFn: () => productsApi.getCategoryOptions(),
    staleTime: 60_000,
  })
}
