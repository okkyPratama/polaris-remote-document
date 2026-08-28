package models

import "time"

// UserProvisioningReq — REQ-014 section 5.2
type UserProvisioningReq struct {
	Id              string   `json:"id"`
	Username        string   `json:"username"`
	Email           string   `json:"email"`
	FullName        string   `json:"fullName"`
	Password        string   `json:"password"`
	InitialPassword string   `json:"initialPassword"`
	SendResetEmail  bool     `json:"sendResetEmail"`
	Status          string   `json:"status"`
	RoleIds         []string `json:"roleIds"`
	WarehouseIds    []string `json:"warehouseIds"`
	OwnerIds        []string `json:"ownerIds"`
	CreatedBy       string   `json:"createdBy"`
	UpdatedBy       string   `json:"updatedBy"`
	DeletedBy       string   `json:"deletedBy"`
}

// UserProvisioningCreateResp — REQ-014 create response (simplified)
type UserProvisioningCreateResp struct {
	Id             string `json:"id"`
	Username       string `json:"username"`
	KeycloakSynced bool   `json:"keycloakSynced"`
}

// UserProvisioningListResp — REQ-014 getAll list item
type UserProvisioningListResp struct {
	Id             string             `json:"id"`
	Username       string             `json:"username"`
	Email          string             `json:"email"`
	FullName       string             `json:"fullName"`
	Status         string             `json:"status"`
	Roles          []UserProvRoleResp `json:"roles"`
	WarehouseCount int                `json:"warehouseCount"`
	CreatedBy      string             `json:"createdBy"`
	CreatedAt      time.Time          `json:"createdAt"`
	UpdatedBy      string             `json:"updatedBy"`
	UpdatedAt      time.Time          `json:"updatedAt"`
}

// UserProvisioningDetailResp — REQ-014 section 5.3 detail response
type UserProvisioningDetailResp struct {
	Id             string                  `json:"id"`
	Username       string                  `json:"username"`
	Email          string                  `json:"email"`
	FullName       string                  `json:"fullName"`
	Status         string                  `json:"status"`
	KeycloakId     string                  `json:"keycloakId"`
	Roles          []UserProvRoleResp      `json:"roles"`
	Warehouses     []UserProvWarehouseResp `json:"warehouses"`
	Owners         []UserProvOwnerResp     `json:"owners"`
	ActiveSessions int                     `json:"activeSessions"`
	LastLoginAt    *time.Time              `json:"lastLoginAt"`
	CreatedBy      string                  `json:"createdBy"`
	CreatedAt      time.Time               `json:"createdAt"`
	UpdatedBy      string                  `json:"updatedBy"`
	UpdatedAt      time.Time               `json:"updatedAt"`
}

type UserProvRoleResp struct {
	Id       string `json:"id"`
	Code     string `json:"code"`
	Name     string `json:"name"`
	IsSystem bool   `json:"isSystem"`
}

type UserProvWarehouseResp struct {
	Id            string `json:"id"`
	WarehouseId   string `json:"warehouseId"`
	WarehouseName string `json:"warehouseName,omitempty"`
}

type UserProvOwnerResp struct {
	Id        string `json:"id"`
	OwnerId   string `json:"ownerId"`
	OwnerName string `json:"ownerName,omitempty"`
}

type UserProvPermissionResp struct {
	Id       string `json:"id"`
	Key      string `json:"key"`
	Resource string `json:"resource"`
	Action   string `json:"action"`
}
