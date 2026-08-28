package engine

import (
	"encoding/json"
	"fmt"
	"math"
	"regexp"
	"unicode/utf8"
)

// ValidMargins defines the allowed margin values in mm.
var ValidMargins = []float64{2.0, 2.5, 3.0}

// placeholderPattern matches valid placeholder names: lowercase letters, digits, underscores, 1-50 chars.
var placeholderPattern = regexp.MustCompile(`^[a-z0-9_]{1,50}$`)

// ean13Pattern matches exactly 13 digits.
var ean13Pattern = regexp.MustCompile(`^[0-9]{13}$`)

// code39Pattern defines valid characters for Code 39 barcodes.
var code39Pattern = regexp.MustCompile(`^[A-Z0-9 \-\.\$\/\+\%]*$`)

// validAlignments defines the valid alignment values.
var validAlignments = map[string]bool{"left": true, "center": true, "right": true}

// ValidationError holds field-level validation errors.
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// ValidateTemplate performs full validation of a template and returns all validation errors.
func ValidateTemplate(name string, sizeType string, marginMM float64, elements json.RawMessage) []string {
	var errors []ValidationError

	errors = append(errors, validateName(name)...)
	errors = append(errors, validateSizeType(sizeType)...)
	errors = append(errors, validateMargin(marginMM)...)

	if len(errors) == 0 && len(elements) > 0 {
		var elems []Element
		if err := json.Unmarshal(elements, &elems); err == nil && len(elems) > 0 {
			size, _ := GetStandardSize(sizeType)
			printAreaWidth := size.WidthMM - 2*marginMM
			printAreaHeight := size.HeightMM - 2*marginMM
			errors = append(errors, validateElements(elems, printAreaWidth, printAreaHeight)...)
		}
	}

	if len(errors) == 0 {
		return nil
	}

	errMsg := make([]string, 0, len(errors))
	for _, e := range errors {
		errMsg = append(errMsg, fmt.Sprintf("%s: %s", e.Field, e.Message))
	}
	return errMsg
}

// SnapAndClampElements applies coordinate snapping and element boundary clamping to all elements.
func SnapAndClampElements(sizeType string, marginMM float64, elements json.RawMessage) (json.RawMessage, error) {
	if len(elements) == 0 {
		return elements, nil
	}

	var elems []Element
	if err := json.Unmarshal(elements, &elems); err != nil {
		return elements, err
	}
	if len(elems) == 0 {
		return elements, nil
	}

	size, ok := GetStandardSize(sizeType)
	if !ok {
		// Still snap coordinates even without valid size
		for i := range elems {
			elems[i].XMM = SnapCoordinate(elems[i].XMM)
			elems[i].YMM = SnapCoordinate(elems[i].YMM)
			elems[i].WidthMM = SnapCoordinate(elems[i].WidthMM)
			elems[i].HeightMM = SnapCoordinate(elems[i].HeightMM)
		}
		return json.Marshal(elems)
	}

	printAreaWidth := size.WidthMM - 2*marginMM
	printAreaHeight := size.HeightMM - 2*marginMM

	for i := range elems {
		elems[i].XMM = SnapCoordinate(elems[i].XMM)
		elems[i].YMM = SnapCoordinate(elems[i].YMM)
		elems[i].WidthMM = SnapCoordinate(elems[i].WidthMM)
		elems[i].HeightMM = SnapCoordinate(elems[i].HeightMM)

		elems[i].XMM, elems[i].YMM = ClampElementBounds(
			elems[i].XMM, elems[i].YMM,
			elems[i].WidthMM, elems[i].HeightMM,
			printAreaWidth, printAreaHeight,
		)
	}

	return json.Marshal(elems)
}

// SnapCoordinate snaps a coordinate to the nearest 0.5mm increment.
func SnapCoordinate(x float64) float64 {
	return math.Round(x*2) / 2
}

// ClampElementBounds adjusts element position to ensure it stays within the print area.
func ClampElementBounds(x, y, width, height, printAreaWidth, printAreaHeight float64) (float64, float64) {
	if x < 0 {
		x = 0
	}
	if y < 0 {
		y = 0
	}
	if x+width > printAreaWidth {
		x = printAreaWidth - width
	}
	if y+height > printAreaHeight {
		y = printAreaHeight - height
	}
	if x < 0 {
		x = 0
	}
	if y < 0 {
		y = 0
	}
	return x, y
}

// --- Internal validation functions ---

func validateName(name string) []ValidationError {
	var errors []ValidationError
	length := utf8.RuneCountInString(name)
	if length == 0 {
		errors = append(errors, ValidationError{Field: "name", Message: "Template name is required"})
	} else if length > 100 {
		errors = append(errors, ValidationError{Field: "name", Message: "Template name must be at most 100 characters"})
	}
	return errors
}

func validateSizeType(sizeType string) []ValidationError {
	var errors []ValidationError
	if sizeType == "" {
		errors = append(errors, ValidationError{Field: "size.type", Message: "Size type is required"})
		return errors
	}
	if _, ok := GetStandardSize(sizeType); !ok {
		errors = append(errors, ValidationError{Field: "size.type", Message: fmt.Sprintf("Invalid size type '%s': must be one of the registered standard sizes", sizeType)})
	}
	return errors
}

func validateMargin(margin float64) []ValidationError {
	var errors []ValidationError
	if !isValidMargin(margin) {
		errors = append(errors, ValidationError{Field: "margin_mm", Message: fmt.Sprintf("Margin must be one of 2.0, 2.5, or 3.0 mm, got %.1f", margin)})
	}
	return errors
}

func isValidMargin(margin float64) bool {
	for _, valid := range ValidMargins {
		if margin == valid {
			return true
		}
	}
	return false
}

func validateElements(elements []Element, printAreaWidth, printAreaHeight float64) []ValidationError {
	var errors []ValidationError
	for i, elem := range elements {
		prefix := fmt.Sprintf("elements[%d]", i)
		errors = append(errors, validateElementBounds(elem, prefix, printAreaWidth, printAreaHeight)...)
		errors = append(errors, validateElementMinSize(elem, prefix)...)
		errors = append(errors, validateElementProperties(elem, prefix)...)
	}
	return errors
}

func validateElementBounds(elem Element, prefix string, printAreaWidth, printAreaHeight float64) []ValidationError {
	var errors []ValidationError
	if elem.XMM < 0 {
		errors = append(errors, ValidationError{Field: prefix + ".x_mm", Message: "Element X position must be >= 0"})
	}
	if elem.YMM < 0 {
		errors = append(errors, ValidationError{Field: prefix + ".y_mm", Message: "Element Y position must be >= 0"})
	}
	if elem.XMM+elem.WidthMM > printAreaWidth {
		errors = append(errors, ValidationError{Field: prefix + ".x_mm", Message: fmt.Sprintf("Element exceeds print area width: x(%.1f) + width(%.1f) > %.1f", elem.XMM, elem.WidthMM, printAreaWidth)})
	}
	if elem.YMM+elem.HeightMM > printAreaHeight {
		errors = append(errors, ValidationError{Field: prefix + ".y_mm", Message: fmt.Sprintf("Element exceeds print area height: y(%.1f) + height(%.1f) > %.1f", elem.YMM, elem.HeightMM, printAreaHeight)})
	}
	return errors
}

func validateElementMinSize(elem Element, prefix string) []ValidationError {
	var errors []ValidationError
	minWidth := 2.0
	minHeight := 2.0

	switch elem.Type {
	case ElementTypeBarcode:
		minWidth = 20.0
		minHeight = 8.0
	case ElementTypeQRCode:
		minWidth = 10.0
		minHeight = 10.0
	}

	if elem.WidthMM < minWidth {
		errors = append(errors, ValidationError{Field: prefix + ".width_mm", Message: fmt.Sprintf("Element width must be at least %.1f mm, got %.1f", minWidth, elem.WidthMM)})
	}
	if elem.HeightMM < minHeight {
		errors = append(errors, ValidationError{Field: prefix + ".height_mm", Message: fmt.Sprintf("Element height must be at least %.1f mm, got %.1f", minHeight, elem.HeightMM)})
	}
	return errors
}

func validateElementProperties(elem Element, prefix string) []ValidationError {
	if elem.Properties == nil || len(elem.Properties) == 0 {
		return nil
	}

	switch elem.Type {
	case ElementTypeStaticText:
		return validateStaticTextProps(elem.Properties, prefix)
	case ElementTypeDynamicText:
		return validateDynamicTextProps(elem.Properties, prefix)
	case ElementTypeBarcode:
		return validateBarcodeProps(elem.Properties, prefix)
	case ElementTypeQRCode:
		return validateQRCodeProps(elem.Properties, prefix)
	case ElementTypeRepeater:
		return validateRepeaterProps(elem.Properties, prefix)
	default:
		return nil
	}
}

func validateStaticTextProps(raw json.RawMessage, prefix string) []ValidationError {
	var props StaticTextProperties
	if err := json.Unmarshal(raw, &props); err != nil {
		return []ValidationError{{Field: prefix + ".properties", Message: "Invalid static text properties: " + err.Error()}}
	}
	var errors []ValidationError
	if utf8.RuneCountInString(props.Content) > 500 {
		errors = append(errors, ValidationError{Field: prefix + ".properties.content", Message: "Static text content must be at most 500 characters"})
	}
	if props.FontSizePt < 4 || props.FontSizePt > 72 {
		errors = append(errors, ValidationError{Field: prefix + ".properties.font_size_pt", Message: fmt.Sprintf("Font size must be between 4 and 72 pt, got %d", props.FontSizePt)})
	}
	return errors
}

func validateDynamicTextProps(raw json.RawMessage, prefix string) []ValidationError {
	var props DynamicTextProperties
	if err := json.Unmarshal(raw, &props); err != nil {
		return []ValidationError{{Field: prefix + ".properties", Message: "Invalid dynamic text properties: " + err.Error()}}
	}
	var errors []ValidationError
	if props.Placeholder == "" {
		errors = append(errors, ValidationError{Field: prefix + ".properties.placeholder", Message: "Placeholder name is required"})
	} else if !placeholderPattern.MatchString(props.Placeholder) {
		errors = append(errors, ValidationError{Field: prefix + ".properties.placeholder", Message: "Placeholder name must match pattern [a-z0-9_]{1,50}"})
	}
	if props.FontSizePt < 4 || props.FontSizePt > 72 {
		errors = append(errors, ValidationError{Field: prefix + ".properties.font_size_pt", Message: fmt.Sprintf("Font size must be between 4 and 72 pt, got %d", props.FontSizePt)})
	}
	return errors
}

func validateBarcodeProps(raw json.RawMessage, prefix string) []ValidationError {
	var props BarcodeProperties
	if err := json.Unmarshal(raw, &props); err != nil {
		return []ValidationError{{Field: prefix + ".properties", Message: "Invalid barcode properties: " + err.Error()}}
	}
	var errors []ValidationError

	validFormats := map[string]bool{"code128": true, "code39": true, "ean13": true}
	if !validFormats[props.Format] {
		errors = append(errors, ValidationError{Field: prefix + ".properties.format", Message: fmt.Sprintf("Invalid barcode format '%s': must be one of code128, code39, ean13", props.Format)})
	}
	if props.DataSource != "static" && props.DataSource != "placeholder" {
		errors = append(errors, ValidationError{Field: prefix + ".properties.data_source", Message: "Barcode data_source must be 'static' or 'placeholder'"})
	}
	if props.DataSource == "placeholder" && props.Placeholder != "" {
		if !placeholderPattern.MatchString(props.Placeholder) {
			errors = append(errors, ValidationError{Field: prefix + ".properties.placeholder", Message: "Placeholder name must match pattern [a-z0-9_]{1,50}"})
		}
	}
	if props.DataSource == "static" && props.StaticValue != "" {
		errors = append(errors, validateBarcodeData(props.StaticValue, props.Format, prefix+".properties.static_value")...)
	}
	return errors
}

func validateQRCodeProps(raw json.RawMessage, prefix string) []ValidationError {
	var props QRCodeProperties
	if err := json.Unmarshal(raw, &props); err != nil {
		return []ValidationError{{Field: prefix + ".properties", Message: "Invalid QR code properties: " + err.Error()}}
	}
	var errors []ValidationError

	if props.DataSource != "static" && props.DataSource != "placeholder" {
		errors = append(errors, ValidationError{Field: prefix + ".properties.data_source", Message: "QR code data_source must be 'static' or 'placeholder'"})
	}
	if props.DataSource == "placeholder" && props.Placeholder != "" {
		if !placeholderPattern.MatchString(props.Placeholder) {
			errors = append(errors, ValidationError{Field: prefix + ".properties.placeholder", Message: "Placeholder name must match pattern [a-z0-9_]{1,50}"})
		}
	}
	if props.DataSource == "static" && props.StaticValue != "" {
		if utf8.RuneCountInString(props.StaticValue) > 2953 {
			errors = append(errors, ValidationError{Field: prefix + ".properties.static_value", Message: "QR code data must be at most 2953 characters"})
		}
	}
	return errors
}

func validateRepeaterProps(raw json.RawMessage, prefix string) []ValidationError {
	var props RepeaterProperties
	if err := json.Unmarshal(raw, &props); err != nil {
		return []ValidationError{{Field: prefix + ".properties", Message: "Invalid repeater properties: " + err.Error()}}
	}
	var errors []ValidationError

	if props.DataKey == "" {
		errors = append(errors, ValidationError{Field: prefix + ".properties.data_key", Message: "Repeater data_key is required"})
	} else if !placeholderPattern.MatchString(props.DataKey) {
		errors = append(errors, ValidationError{Field: prefix + ".properties.data_key", Message: "Repeater data_key must match pattern [a-z0-9_]{1,50}"})
	}
	if props.RowHeightMM < 4 {
		errors = append(errors, ValidationError{Field: prefix + ".properties.row_height_mm", Message: fmt.Sprintf("Repeater row_height_mm must be at least 4 mm, got %.1f", props.RowHeightMM)})
	}
	if props.MaxRows < 1 || props.MaxRows > 50 {
		errors = append(errors, ValidationError{Field: prefix + ".properties.max_rows", Message: fmt.Sprintf("Repeater max_rows must be between 1 and 50, got %d", props.MaxRows)})
	}
	if len(props.Columns) == 0 {
		errors = append(errors, ValidationError{Field: prefix + ".properties.columns", Message: "Repeater must have at least 1 column"})
	} else {
		for i, col := range props.Columns {
			colPrefix := fmt.Sprintf("%s.properties.columns[%d]", prefix, i)
			if col.Placeholder == "" {
				errors = append(errors, ValidationError{Field: colPrefix + ".placeholder", Message: "Column placeholder is required"})
			} else if col.Placeholder != "_index" && !placeholderPattern.MatchString(col.Placeholder) {
				errors = append(errors, ValidationError{Field: colPrefix + ".placeholder", Message: "Column placeholder must match pattern [a-z0-9_]{1,50}"})
			}
			if col.WidthMM <= 0 {
				errors = append(errors, ValidationError{Field: colPrefix + ".width_mm", Message: fmt.Sprintf("Column width_mm must be greater than 0, got %.1f", col.WidthMM)})
			}
			if col.FontSizePt < 4 || col.FontSizePt > 72 {
				errors = append(errors, ValidationError{Field: colPrefix + ".font_size_pt", Message: fmt.Sprintf("Column font_size_pt must be between 4 and 72, got %d", col.FontSizePt)})
			}
			if !validAlignments[col.Alignment] {
				errors = append(errors, ValidationError{Field: colPrefix + ".alignment", Message: fmt.Sprintf("Column alignment must be one of left, center, right, got '%s'", col.Alignment)})
			}
		}
	}
	return errors
}

func validateBarcodeData(data string, format string, field string) []ValidationError {
	var errors []ValidationError
	switch format {
	case "ean13":
		if !ean13Pattern.MatchString(data) {
			errors = append(errors, ValidationError{Field: field, Message: "EAN-13 barcode data must be exactly 13 numeric digits"})
		}
	case "code39":
		if len(data) > 48 {
			errors = append(errors, ValidationError{Field: field, Message: "Code 39 barcode data must be at most 48 characters"})
		} else if !code39Pattern.MatchString(data) {
			errors = append(errors, ValidationError{Field: field, Message: "Code 39 barcode data contains invalid characters (valid: A-Z, 0-9, space, -, ., $, /, +, %)"})
		}
	case "code128":
		if len(data) > 80 {
			errors = append(errors, ValidationError{Field: field, Message: "Code 128 barcode data must be at most 80 characters"})
		} else {
			for _, r := range data {
				if r > 127 {
					errors = append(errors, ValidationError{Field: field, Message: "Code 128 barcode data must contain only ASCII characters (0-127)"})
					break
				}
			}
		}
	}
	return errors
}
