import type { SearchRequest, FilterCondition, PagingRequest } from '../types'

/**
 * Helper to build search request body sesuai backend standard.
 *
 * Usage:
 * ```ts
 * const body = buildSearchRequest({
 *   filters: [
 *     { field: 'status', operator: '=', value: 'ACTIVE' },
 *     { field: 'name', operator: 'ilike', value: searchTerm },
 *   ],
 *   paging: { page: 1, pageSize: 25, sortBy: 'createdAt', sortDir: 'DESC' },
 * })
 *
 * const response = await fetcher.post<ApiListResponse<Company>>('/company/getAll', body)
 * ```
 */
export function buildSearchRequest(params: {
  filters?: FilterCondition[]
  orFilters?: FilterCondition[]
  paging?: PagingRequest
}): SearchRequest {
  const request: SearchRequest = {}

  // Build filters
  if (params.filters?.length || params.orFilters?.length) {
    request.filters = {}
    if (params.filters?.length) {
      request.filters.and = params.filters
    }
    if (params.orFilters?.length) {
      request.filters.or = params.orFilters
    }
  }

  // Build paging
  if (params.paging) {
    request.paging = {
      page: params.paging.page ?? 1,
      pageSize: params.paging.pageSize ?? 25,
      sortBy: params.paging.sortBy ?? 'created_at',
      sortDir: params.paging.sortDir ?? 'DESC',
    }
  }

  return request
}
