// ─── Search / Paging request — mirrors backend SearchRequest model ─────────────

export interface SearchRequest {
  filters: SearchFilters
  paging: SearchPaging
}

export interface SearchFilters {
  and?: FilterCondition[]
  or?: FilterCondition[]
}

export interface FilterCondition {
  field: string
  operator: string
  value: unknown
}

export interface SearchPaging {
  page: number
  pageSize: number
  sortBy?: string
  sortDir?: string
}
