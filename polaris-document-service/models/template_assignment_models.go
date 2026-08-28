package models

import "time"

// TemplateAssignmentReq is the request DTO for assign operations.
type TemplateAssignmentReq struct {
	ID            string `json:"id"`
	CompanyID     string `json:"companyId"`
	WarehouseID   string `json:"warehouseId"`
	OwnerID       string `json:"ownerId"`
	TemplateType  string `json:"templateType"`
	TemplateID    string `json:"templateId"`
	EffectiveFrom string `json:"effectiveFrom"`

	CreatedBy string `json:"createdBy"`
	UpdatedBy string `json:"updatedBy"`
}

// TemplateAssignmentResp is the response DTO for template assignment.
type TemplateAssignmentResp struct {
	ID            string    `json:"id"`
	CompanyID     string    `json:"companyId"`
	WarehouseID   string    `json:"warehouseId"`
	OwnerID       string    `json:"ownerId"`
	TemplateType  string    `json:"templateType"`
	TemplateID    string    `json:"templateId"`
	EffectiveFrom string    `json:"effectiveFrom"`
	CreatedBy     string    `json:"createdBy"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedBy     string    `json:"updatedBy"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// GetByScopeReq is the request DTO for getByScope operations.
type GetByScopeReq struct {
	CompanyID    string `json:"companyId"`
	WarehouseID  string `json:"warehouseId"`
	OwnerID      string `json:"ownerId"`
	TemplateType string `json:"templateType"`
}
