import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  QueryKey,
} from '@tanstack/react-query'
import { createElement } from 'react'
import { fetcher } from './fetcher'
import type {
  ApiResponse,
  ApiError,
  QueryProviderProps,
  ApiQueryOptions,
  ApiQueryRawOptions,
} from './types'

const defaultQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 3,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
})

export const QueryProvider = ({ children, queryClient = defaultQueryClient }: QueryProviderProps) => {
  return createElement(QueryClientProvider, { client: queryClient }, children)
}

export function useApiQuery<TData = any>(
  queryKey: QueryKey,
  url: string,
  options?: ApiQueryOptions<TData>
) {
  return useQuery<ApiResponse<TData>, ApiError>({
    queryKey,
    queryFn: () => fetcher.get<TData>(url, options?.request),
    ...options,
  })
}

export function useApiQueryRaw<TData = any>(
  queryKey: QueryKey,
  url: string,
  options?: ApiQueryRawOptions<TData>
) {
  return useQuery<TData, ApiError>({
    queryKey,
    queryFn: () => fetcher.getRaw<TData>(url, options?.request),
    ...options,
  })
}

export { defaultQueryClient as queryClient }
