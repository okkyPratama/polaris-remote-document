package models

import "time"

// UserRoleReq — sesuai REQ-011 section 5.6 (userId + roleIds array)
type UserRoleReq struct {
	Id        string   `json:"id"`
	UserId    string   `json:"userId"`
	RoleIds   []string `json:"roleIds"`
	CreatedBy string   `json:"createdBy"`
	UpdatedBy string   `json:"updatedBy"`
	DeletedBy string   `json:"deletedBy"`
}

// UserRoleResp — sesuai REQ-011
type UserRoleResp struct {
	Id        string    `json:"id"`
	UserId    string    `json:"userId"`
	RoleId    string    `json:"roleId"`
	CreatedBy string    `json:"createdBy"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedBy string    `json:"updatedBy"`
	UpdatedAt time.Time `json:"updatedAt"`
}
