import type { ReactNode } from 'react'
import type { QueryClient, QueryKey, UseQueryOptions } from '@tanstack/react-query'

export interface ApiResponse<T = unknown> {
  httpCode: number
  externalCode: number
  externalDesc: string
  data: T | null
  errorMessage?: string[]
}

export interface ApiListResponse<T = unknown> {
  httpCode: number
  externalCode: number
  externalDesc: string
  data: {
    data: T[]
    paging: PagingResponse
  }
  errorMessage?: string[]
}

export interface PagingResponse {
  page: number
  pageSize: number
  count: number
  totalItems: number
  totalPages: number
}

export interface PagingRequest {
  page?: number
  pageSize?: number
  sortBy?: string
  sortDir?: 'ASC' | 'DESC'
}

export interface FilterCondition {
  field: string
  operator: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'in' | 'notin' | 'between' | 'ilike'
  value: unknown
}

export interface SearchRequest {
  filters?: {
    and?: FilterCondition[]
    or?: FilterCondition[]
  }
  paging?: PagingRequest
}

export interface ApiError {
  httpCode: number
  externalCode?: number
  externalDesc?: string
  message: string
  status: number
  errorMessage?: string[]
  errors?: string[]
  /** Optional payload from failure responses (e.g. bulk row errors). */
  data?: unknown
}

export interface RemoteConfig {
  name: string
  url: string
  format?: 'esm' | 'systemjs' | 'var'
  from?: 'vite' | 'webpack'
  modules: string[]
}

export interface TokenDecode {
  sub: string
  name: string
  email: string
  preferred_username: string
  realm_access: {
    roles: string[]
  }
  permissions: string[]
  warehouses: string[]
  exp: number
  iat: number
}

export type ServiceType = 'default'

export interface NavigationItem {
  title: string
  path: string
  icon?: string
  children?: NavigationItem[]
  remote?: string
  module?: string
}

export type NavigationType = NavigationItem[]

export interface RouteType {
  name: string
  path: string
  remote?: string
  module?: string
}

export interface QueryProviderProps {
  children: ReactNode
  queryClient?: QueryClient
}

export type ApiQueryOptions<TData = any> = Omit<
  UseQueryOptions<ApiResponse<TData>, ApiError, ApiResponse<TData>, QueryKey>,
  'queryKey' | 'queryFn'
> & {
  request?: {
    headers?: Record<string, string>
    params?: Record<string, any>
    timeout?: number
  }
}

export type ApiQueryRawOptions<TData = any> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
> & {
  request?: {
    headers?: Record<string, string>
    params?: Record<string, any>
    timeout?: number
  }
}
