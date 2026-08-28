package models

import "time"

type RoleReq struct {
	Id            string   `json:"id"`
	Code          string   `json:"code"`
	Name          string   `json:"name"`
	Description   string   `json:"description"`
	Status        string   `json:"status"`
	PermissionIds []string `json:"permissionIds"`
	CreatedBy     string   `json:"createdBy"`
	UpdatedBy     string   `json:"updatedBy"`
	DeletedBy     string   `json:"deletedBy"`
}

// RoleListResp — response untuk getAll (tanpa detail permissions)
type RoleListResp struct {
	Id              string    `json:"id"`
	Code            string    `json:"code"`
	Name            string    `json:"name"`
	Description     string    `json:"description"`
	IsSystem        bool      `json:"isSystem"`
	Status          string    `json:"status"`
	PermissionCount int       `json:"permissionCount"`
	UserCount       int       `json:"userCount"`
	CreatedBy       string    `json:"createdBy"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedBy       string    `json:"updatedBy"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

// RoleDetailResp — response untuk detailById (include full permissions)
type RoleDetailResp struct {
	Id          string                   `json:"id"`
	Code        string                   `json:"code"`
	Name        string                   `json:"name"`
	Description string                   `json:"description"`
	IsSystem    bool                     `json:"isSystem"`
	Status      string                   `json:"status"`
	Permissions []RolePermissionItemResp `json:"permissions"`
	UserCount   int                      `json:"userCount"`
	CreatedBy   string                   `json:"createdBy"`
	CreatedAt   time.Time                `json:"createdAt"`
	UpdatedBy   string                   `json:"updatedBy"`
	UpdatedAt   time.Time                `json:"updatedAt"`
}

type RolePermissionItemResp struct {
	Id       string `json:"id"`
	Key      string `json:"key"`
	Resource string `json:"resource"`
	Action   string `json:"action"`
}
