package models

// CropReq is the request DTO for PDF crop operations.
type CropReq struct {
	URL            string  `json:"url"`
	TargetWidthMM  float64 `json:"targetWidthMm"`
	TargetHeightMM float64 `json:"targetHeightMm"`
	AutoCrop       bool    `json:"autoCrop"`
	PaddingMM      float64 `json:"paddingMm"`
}
