package engine

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

var placeholderRegex = regexp.MustCompile(`\{\{([^}]*)\}\}`)

// MergeEngine replaces placeholders in a template with actual data values.
type MergeEngine struct{}

// NewMergeEngine creates a new MergeEngine instance.
func NewMergeEngine() *MergeEngine {
	return &MergeEngine{}
}

// Merge substitutes all placeholders in the template with values from the data map.
func (m *MergeEngine) Merge(template *TemplateData, data map[string]interface{}) (*MergedTemplate, error) {
	merged := &MergedTemplate{
		Size:     template.Size,
		MarginMM: template.MarginMM,
		Elements: make([]MergedElement, 0, len(template.Elements)),
	}

	for _, elem := range template.Elements {
		mergedElem, err := m.mergeElement(elem, data)
		if err != nil {
			return nil, fmt.Errorf("merging element %s: %w", elem.ID, err)
		}
		merged.Elements = append(merged.Elements, mergedElem)
	}

	return merged, nil
}

func (m *MergeEngine) mergeElement(elem Element, data map[string]interface{}) (MergedElement, error) {
	mergedElem := MergedElement{
		ID:         elem.ID,
		Type:       elem.Type,
		XMM:        elem.XMM,
		YMM:        elem.YMM,
		WidthMM:    elem.WidthMM,
		HeightMM:   elem.HeightMM,
		ZOrder:     elem.ZOrder,
		Properties: elem.Properties,
	}

	switch elem.Type {
	case ElementTypeStaticText:
		resolved, err := m.resolveStaticText(elem.Properties, data)
		if err != nil {
			return mergedElem, err
		}
		mergedElem.ResolvedText = resolved

	case ElementTypeDynamicText:
		resolved, err := m.resolveDynamicText(elem.Properties, data)
		if err != nil {
			return mergedElem, err
		}
		mergedElem.ResolvedText = resolved

	case ElementTypeBarcode:
		resolved, err := m.resolveBarcodeData(elem.Properties, data)
		if err != nil {
			return mergedElem, err
		}
		mergedElem.ResolvedData = resolved

	case ElementTypeQRCode:
		resolved, err := m.resolveQRCodeData(elem.Properties, data)
		if err != nil {
			return mergedElem, err
		}
		mergedElem.ResolvedData = resolved

	case ElementTypeRepeater:
		resolvedRows, err := m.resolveRepeater(elem.Properties, data)
		if err != nil {
			return mergedElem, err
		}
		mergedElem.ResolvedRows = resolvedRows
	}

	return mergedElem, nil
}

func (m *MergeEngine) resolveStaticText(props json.RawMessage, data map[string]interface{}) (string, error) {
	var p StaticTextProperties
	if err := json.Unmarshal(props, &p); err != nil {
		return "", fmt.Errorf("parsing static text properties: %w", err)
	}
	return m.replacePlaceholders(p.Content, data), nil
}

func (m *MergeEngine) resolveDynamicText(props json.RawMessage, data map[string]interface{}) (string, error) {
	var p DynamicTextProperties
	if err := json.Unmarshal(props, &p); err != nil {
		return "", fmt.Errorf("parsing dynamic text properties: %w", err)
	}
	return m.lookupValue(p.Placeholder, data), nil
}

func (m *MergeEngine) resolveBarcodeData(props json.RawMessage, data map[string]interface{}) (string, error) {
	var p BarcodeProperties
	if err := json.Unmarshal(props, &p); err != nil {
		return "", fmt.Errorf("parsing barcode properties: %w", err)
	}
	return m.resolveDataSource(p.DataSource, p.StaticValue, p.Placeholder, data), nil
}

func (m *MergeEngine) resolveQRCodeData(props json.RawMessage, data map[string]interface{}) (string, error) {
	var p QRCodeProperties
	if err := json.Unmarshal(props, &p); err != nil {
		return "", fmt.Errorf("parsing qrcode properties: %w", err)
	}
	return m.resolveDataSource(p.DataSource, p.StaticValue, p.Placeholder, data), nil
}

func (m *MergeEngine) resolveDataSource(dataSource, staticValue, placeholder string, data map[string]interface{}) string {
	if dataSource == "static" {
		return staticValue
	}
	return m.lookupValue(placeholder, data)
}

func (m *MergeEngine) replacePlaceholders(text string, data map[string]interface{}) string {
	if !strings.Contains(text, "{{") {
		return text
	}
	return placeholderRegex.ReplaceAllStringFunc(text, func(match string) string {
		key := strings.TrimSpace(match[2 : len(match)-2])
		return m.lookupValue(key, data)
	})
}

func (m *MergeEngine) lookupValue(key string, data map[string]interface{}) string {
	if data == nil {
		return ""
	}
	val, exists := data[key]
	if !exists || val == nil {
		return ""
	}
	if s, ok := val.(string); ok {
		return s
	}
	return fmt.Sprintf("%v", val)
}

func (m *MergeEngine) resolveRepeater(props json.RawMessage, data map[string]interface{}) ([][]string, error) {
	var p RepeaterProperties
	if err := json.Unmarshal(props, &p); err != nil {
		return nil, fmt.Errorf("parsing repeater properties: %w", err)
	}

	if data == nil {
		return [][]string{}, nil
	}

	val, exists := data[p.DataKey]
	if !exists || val == nil {
		return [][]string{}, nil
	}

	arr, ok := val.([]interface{})
	if !ok {
		return [][]string{}, nil
	}

	if p.MaxRows > 0 && len(arr) > p.MaxRows {
		arr = arr[:p.MaxRows]
	}

	rows := make([][]string, 0, len(arr))
	for i, item := range arr {
		itemMap, ok := item.(map[string]interface{})
		if !ok {
			row := make([]string, len(p.Columns))
			rows = append(rows, row)
			continue
		}

		row := make([]string, len(p.Columns))
		for colIdx, col := range p.Columns {
			if col.Placeholder == "_index" {
				row[colIdx] = fmt.Sprintf("%d", i+1)
			} else {
				row[colIdx] = m.lookupValue(col.Placeholder, itemMap)
			}
		}
		rows = append(rows, row)
	}

	return rows, nil
}
