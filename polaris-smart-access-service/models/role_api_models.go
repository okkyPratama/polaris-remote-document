package models

import (
	"time"
)

type RoleApiReq struct {
	Id           string    `json:"id" yaml:"id"`
	RoleName     string    `json:"roleName" yaml:"roleName"`
	ServiceName  string    `json:"serviceName" yaml:"serviceName"`
	Description  string    `json:"description" yaml:"description"`
	HttpMethod   string    `json:"httpMethod" yaml:"httpMethod"`
	HttpEndpoint string    `json:"httpEndpoint" yaml:"httpEndpoint"`
	IsActive     bool      `json:"isActive" yaml:"isActive" default:"true"`
	CreatedBy    string    `json:"createdBy" yaml:"createdBy"`
	CreatedAt    time.Time `json:"createdAt" yaml:"createdAt"`
	UpdatedBy    string    `json:"updatedBy" yaml:"updatedBy"`
	UpdatedAt    time.Time `json:"updatedAt" yaml:"updatedAt"`
	DeletedBy    string    `json:"deletedBy" yaml:"deletedBy"`
	DeletedAt    time.Time `json:"deletedAt" yaml:"deletedAt"`
}

type RoleApiResp struct {
	Id           string    `json:"id" yaml:"id"`
	RoleName     string    `json:"roleName" yaml:"roleName"`
	ServiceName  string    `json:"serviceName" yaml:"serviceName"`
	Description  string    `json:"description" yaml:"description"`
	HttpMethod   string    `json:"httpMethod" yaml:"httpMethod"`
	HttpEndpoint string    `json:"httpEndpoint" yaml:"httpEndpoint"`
	IsActive     bool      `json:"isActive" yaml:"isActive" default:"true"`
	CreatedBy    string    `json:"createdBy" yaml:"createdBy"`
	CreatedAt    time.Time `json:"createdAt" yaml:"createdAt"`
	UpdatedBy    string    `json:"updatedBy" yaml:"updatedBy"`
	UpdatedAt    time.Time `json:"updatedAt" yaml:"updatedAt"`
	DeletedBy    string    `json:"deletedBy" yaml:"deletedBy"`
	DeletedAt    time.Time `json:"deletedAt" yaml:"deletedAt"`
}

type GetByIdReq struct {
	Id string `json:"id" binding:"required"`
}

type ToggleActiveReq struct {
	Id        string `json:"id" binding:"required"`
	IsActive  bool   `json:"isActive"`
	UpdatedBy string `json:"updatedBy"`
}

type DeleteRoleApiReq struct {
	Id string `json:"id" binding:"required"`
}

// RoleApiSummaryResp - Summary of all roles and their endpoint mappings (for QA inspection)
type RoleApiSummaryResp struct {
	Roles []RoleApiSummaryItem `json:"roles"`
}

type RoleApiSummaryItem struct {
	RoleName          string   `json:"roleName"`
	RoleDisplayName   string   `json:"roleDisplayName"`
	TotalEndpoints    int      `json:"totalEndpoints"`
	ActiveEndpoints   int      `json:"activeEndpoints"`
	InactiveEndpoints int      `json:"inactiveEndpoints"`
	SampleEndpoints   []string `json:"sampleEndpoints"` // First 5 active endpoints as examples
}

// GetByRoleNameReq - Request to get all endpoints for a specific role
type GetByRoleNameReq struct {
	RoleName string `json:"roleName" binding:"required"`
}
