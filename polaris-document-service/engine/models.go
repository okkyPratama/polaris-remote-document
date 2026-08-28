package engine

import "encoding/json"

// PageSize defines the dimensions and orientation of a template page.
type PageSize struct {
	Type        string  `json:"type"`
	WidthMM     float64 `json:"width_mm"`
	HeightMM    float64 `json:"height_mm"`
	Orientation string  `json:"orientation"`
}

// Element represents a visual element placed on a template.
type Element struct {
	ID         string          `json:"id"`
	Type       string          `json:"type"`
	XMM        float64         `json:"x_mm"`
	YMM        float64         `json:"y_mm"`
	WidthMM    float64         `json:"width_mm"`
	HeightMM   float64         `json:"height_mm"`
	ZOrder     int             `json:"z_order"`
	Properties json.RawMessage `json:"properties"`
}

// TemplateData represents a template ready for merge and rendering.
type TemplateData struct {
	Size     PageSize  `json:"size"`
	MarginMM float64   `json:"margin_mm"`
	Elements []Element `json:"elements"`
}

// MergedTemplate represents a template after placeholder merge with actual data.
type MergedTemplate struct {
	Size     PageSize        `json:"size"`
	MarginMM float64         `json:"margin_mm"`
	Elements []MergedElement `json:"elements"`
}

// MergedElement is an element after merging placeholders with data values.
type MergedElement struct {
	ID           string          `json:"id"`
	Type         string          `json:"type"`
	XMM          float64         `json:"x_mm"`
	YMM          float64         `json:"y_mm"`
	WidthMM      float64         `json:"width_mm"`
	HeightMM     float64         `json:"height_mm"`
	ZOrder       int             `json:"z_order"`
	Properties   json.RawMessage `json:"properties"`
	ResolvedText string          `json:"resolved_text,omitempty"`
	ResolvedData string          `json:"resolved_data,omitempty"`
	ResolvedRows [][]string      `json:"resolved_rows,omitempty"`
}

// Element type constants.
const (
	ElementTypeStaticText  = "static_text"
	ElementTypeDynamicText = "dynamic_text"
	ElementTypeBarcode     = "barcode"
	ElementTypeQRCode      = "qrcode"
	ElementTypeImage       = "image"
	ElementTypeLine        = "line"
	ElementTypeBox         = "box"
	ElementTypeRepeater    = "repeater"
)

// Property types for JSON parsing.
type StaticTextProperties struct {
	Content    string `json:"content"`
	FontFamily string `json:"font_family"`
	FontSizePt int    `json:"font_size_pt"`
	FontBold   bool   `json:"font_bold"`
	FontItalic bool   `json:"font_italic"`
	Alignment  string `json:"alignment"`
}

type DynamicTextProperties struct {
	Placeholder string `json:"placeholder"`
	FontFamily  string `json:"font_family"`
	FontSizePt  int    `json:"font_size_pt"`
	FontBold    bool   `json:"font_bold"`
	FontItalic  bool   `json:"font_italic"`
	Alignment   string `json:"alignment"`
}

type BarcodeProperties struct {
	Format      string `json:"format"`
	DataSource  string `json:"data_source"`
	StaticValue string `json:"static_value,omitempty"`
	Placeholder string `json:"placeholder,omitempty"`
}

type QRCodeProperties struct {
	ErrorCorrection string `json:"error_correction"`
	DataSource      string `json:"data_source"`
	StaticValue     string `json:"static_value,omitempty"`
	Placeholder     string `json:"placeholder,omitempty"`
}

type ImageProperties struct {
	SourceURL  string `json:"source_url"`
	SourceType string `json:"source_type"`
}

type LineProperties struct {
	ThicknessMM float64 `json:"thickness_mm"`
	Orientation string  `json:"orientation"`
}

type BoxProperties struct {
	ThicknessMM float64 `json:"thickness_mm"`
	Fill        bool    `json:"fill"`
}

type RepeaterColumn struct {
	Label       string  `json:"label"`
	Placeholder string  `json:"placeholder"`
	XOffsetMM   float64 `json:"x_offset_mm"`
	WidthMM     float64 `json:"width_mm"`
	FontFamily  string  `json:"font_family"`
	FontSizePt  int     `json:"font_size_pt"`
	Alignment   string  `json:"alignment"`
}

type RepeaterProperties struct {
	DataKey      string           `json:"data_key"`
	RowHeightMM  float64          `json:"row_height_mm"`
	MaxRows      int              `json:"max_rows"`
	ShowHeader   bool             `json:"show_header"`
	ShowRowLines bool             `json:"show_row_lines"`
	Columns      []RepeaterColumn `json:"columns"`
}

// StandardSizes maps size type keys to their corresponding PageSize definitions.
var StandardSizes = map[string]PageSize{
	"thermal_a6": {
		Type:        "thermal_a6",
		WidthMM:     100,
		HeightMM:    150,
		Orientation: "portrait",
	},
	"a5_document": {
		Type:        "a5_document",
		WidthMM:     148,
		HeightMM:    210,
		Orientation: "portrait",
	},
	"sticker_4x8": {
		Type:        "sticker_4x8",
		WidthMM:     40,
		HeightMM:    80,
		Orientation: "portrait",
	},
	"sticker_3x10": {
		Type:        "sticker_3x10",
		WidthMM:     100,
		HeightMM:    30,
		Orientation: "landscape",
	},
}

// GetStandardSize returns the PageSize for a given type key and whether it exists.
func GetStandardSize(sizeType string) (PageSize, bool) {
	size, ok := StandardSizes[sizeType]
	return size, ok
}
