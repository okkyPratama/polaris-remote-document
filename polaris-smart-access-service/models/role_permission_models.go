package models

import "time"

// RolePermissionReq — sesuai REQ-011 section 5.2 (role_id + permission_id)
type RolePermissionReq struct {
	Id           string `json:"id"`
	RoleId       string `json:"roleId"`
	PermissionId string `json:"permissionId"`
	CreatedBy    string `json:"createdBy"`
	UpdatedBy    string `json:"updatedBy"`
	DeletedBy    string `json:"deletedBy"`
}

// RolePermissionResp — sesuai REQ-011
type RolePermissionResp struct {
	Id           string    `json:"id"`
	RoleId       string    `json:"roleId"`
	PermissionId string    `json:"permissionId"`
	CreatedBy    string    `json:"createdBy"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedBy    string    `json:"updatedBy"`
	UpdatedAt    time.Time `json:"updatedAt"`
}
