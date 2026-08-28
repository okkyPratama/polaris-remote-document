package models

import (
	"encoding/json"
	"time"
)

// PageSettingsJSON represents the page settings structure for a template.
type PageSettingsJSON struct {
	SizeType    string  `json:"sizeType"`
	WidthMm     float64 `json:"widthMm"`
	HeightMm    float64 `json:"heightMm"`
	MarginMm    float64 `json:"marginMm"`
	Orientation string  `json:"orientation"`
}

// TemplateReq is the request DTO for template save/edit operations.
type TemplateReq struct {
	ID               string           `json:"id"`
	TemplateCode     string           `json:"templateCode"`
	Name             string           `json:"name"`
	TemplateType     string           `json:"templateType"`
	OutputFormat     string           `json:"outputFormat"`
	Description      string           `json:"description"`
	TemplateContent  string           `json:"templateContent"`
	PageSettingsJSON *PageSettingsJSON `json:"pageSettingsJson"`
	IsSystemDefault  bool             `json:"isSystemDefault"`
	IsActive         bool             `json:"isActive"`

	CreatedBy string `json:"createdBy"`
	UpdatedBy string `json:"updatedBy"`
}

// TemplateResp is the full response DTO for template detail.
type TemplateResp struct {
	ID               string           `json:"id"`
	TemplateCode     string           `json:"templateCode"`
	Name             string           `json:"name"`
	TemplateType     string           `json:"templateType"`
	OutputFormat     string           `json:"outputFormat"`
	Description      string           `json:"description"`
	TemplateContent  string           `json:"templateContent"`
	Version          int              `json:"version"`
	PageSettingsJSON json.RawMessage  `json:"pageSettingsJson"`
	IsSystemDefault  bool             `json:"isSystemDefault"`
	IsActive         bool             `json:"isActive"`
	CreatedBy        string           `json:"createdBy"`
	CreatedAt        time.Time        `json:"createdAt"`
	UpdatedBy        string           `json:"updatedBy"`
	UpdatedAt        time.Time        `json:"updatedAt"`
}

// TemplateSummaryResp is the list response DTO (without template_content).
type TemplateSummaryResp struct {
	ID               string          `json:"id"`
	TemplateCode     string          `json:"templateCode"`
	Name             string          `json:"name"`
	TemplateType     string          `json:"templateType"`
	OutputFormat     string          `json:"outputFormat"`
	Description      string          `json:"description"`
	Version          int             `json:"version"`
	PageSettingsJSON json.RawMessage `json:"pageSettingsJson"`
	IsSystemDefault  bool            `json:"isSystemDefault"`
	IsActive         bool            `json:"isActive"`
	CreatedBy        string          `json:"createdBy"`
	CreatedAt        time.Time       `json:"createdAt"`
	UpdatedBy        string          `json:"updatedBy"`
	UpdatedAt        time.Time       `json:"updatedAt"`
}

// DeleteReq is the request DTO for delete operations.
type DeleteReq struct {
	ID string `json:"id"`
}

// DetailByIdReq is the request DTO for detail by ID operations.
type DetailByIdReq struct {
	ID string `json:"id"`
}

// GenerateTemplateReq is the request DTO for template generate (PDF render).
type GenerateTemplateReq struct {
	TemplateID string                 `json:"templateId"`
	Data       map[string]interface{} `json:"data"`
}
