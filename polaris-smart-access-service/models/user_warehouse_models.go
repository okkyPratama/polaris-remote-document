package models

import "time"

// UserWarehouseReq — sesuai REQ-012 section 5.2/5.3 (userId + warehouseIds array)
type UserWarehouseReq struct {
	Id           string   `json:"id"`
	UserId       string   `json:"userId"`
	WarehouseIds []string `json:"warehouseIds"`
	CreatedBy    string   `json:"createdBy"`
	UpdatedBy    string   `json:"updatedBy"`
	DeletedBy    string   `json:"deletedBy"`
}

// UserWarehouseResp — sesuai REQ-012
type UserWarehouseResp struct {
	Id            string    `json:"id"`
	UserId        string    `json:"userId"`
	WarehouseId   string    `json:"warehouseId"`
	WarehouseCode string    `json:"warehouseCode"`
	WarehouseName string    `json:"warehouseName"`
	CreatedBy     string    `json:"createdBy"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedBy     string    `json:"updatedBy"`
	UpdatedAt     time.Time `json:"updatedAt"`
}
