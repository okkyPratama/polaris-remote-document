package models

type SearchRequest struct {
	Filters SearchFilters `json:"filters"`
	Paging  SearchPaging  `json:"paging"`
}

type SearchFilters struct {
	And []FilterCondition `json:"and"`
	Or  []FilterCondition `json:"or"`
}

type FilterCondition struct {
	Field    string      `json:"field"`
	Operator string      `json:"operator"`
	Value    interface{} `json:"value"`
}

type SearchPaging struct {
	Page     int    `json:"page"`
	PageSize int    `json:"pageSize"`
	SortBy   string `json:"sortBy"`
	SortDir  string `json:"sortDir"`
}
