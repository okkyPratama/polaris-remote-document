package models

import "time"

// PermissionReq — sesuai REQ-011 section 5.10
type PermissionReq struct {
	Id          string `json:"id"`
	Key         string `json:"key"`      // format: {resource}:{action}
	Resource    string `json:"resource"` // e.g. receipt, hold, user
	Action      string `json:"action"`   // e.g. create, view, override-regulatory
	Description string `json:"description"`
	Module      string `json:"module"` // e.g. inbound, outbound, admin
	CreatedBy   string `json:"createdBy"`
	UpdatedBy   string `json:"updatedBy"`
	DeletedBy   string `json:"deletedBy"`
}

// PermissionResp — sesuai REQ-011 API response
type PermissionResp struct {
	Id          string    `json:"id"`
	Key         string    `json:"key"`
	Resource    string    `json:"resource"`
	Action      string    `json:"action"`
	Description string    `json:"description"`
	Module      string    `json:"module"`
	CreatedBy   string    `json:"createdBy"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedBy   string    `json:"updatedBy"`
	UpdatedAt   time.Time `json:"updatedAt"`
}
