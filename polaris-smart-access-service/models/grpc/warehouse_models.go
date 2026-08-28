package grpc

import "time"

type WarehouseResp struct {
	Id            string    `json:"id"`
	WarehouseName string    `json:"warehouseName" validate:"required"`
	WarehouseCode string    `json:"warehouseCode" validate:"required"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
	DeletedAt     time.Time `json:"deletedAt"`
	CreatedBy     string    `json:"createdBy"`
	UpdatedBy     string    `json:"updatedBy"`
	DeletedBy     string    `json:"deletedBy"`
}
