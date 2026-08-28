package engine

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image"
	"image/png"
	"io"
	"net/http"
	"strings"

	"github.com/go-pdf/fpdf"
)

// PDFRenderer renders merged templates into a PDF document.
type PDFRenderer struct {
	barcodeGen BarcodeGenerator
}

// NewPDFRenderer creates a new PDFRenderer with the given barcode generator.
func NewPDFRenderer(barcodeGen BarcodeGenerator) *PDFRenderer {
	return &PDFRenderer{barcodeGen: barcodeGen}
}

// Render generates a PDF from merged templates. Each MergedTemplate becomes one page.
func (r *PDFRenderer) Render(pages []*MergedTemplate, pageSize PageSize) ([]byte, error) {
	orientation := "P"
	if pageSize.Orientation == "landscape" {
		orientation = "L"
	}

	pdf := fpdf.NewCustom(&fpdf.InitType{
		OrientationStr: orientation,
		UnitStr:        "mm",
		Size:           fpdf.SizeType{Wd: pageSize.WidthMM, Ht: pageSize.HeightMM},
	})
	pdf.SetAutoPageBreak(false, 0)

	for _, page := range pages {
		pdf.AddPage()
		marginMM := page.MarginMM
		pdf.SetMargins(marginMM, marginMM, marginMM)

		sortedElements := sortByZOrder(page.Elements)
		for _, elem := range sortedElements {
			r.renderElement(pdf, elem, marginMM)
		}
	}

	if pdf.Err() {
		return nil, fmt.Errorf("pdf generation error: %s", pdf.Error())
	}

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, fmt.Errorf("pdf output error: %w", err)
	}

	return buf.Bytes(), nil
}

func (r *PDFRenderer) renderElement(pdf *fpdf.Fpdf, elem MergedElement, marginMM float64) {
	absX := elem.XMM + marginMM
	absY := elem.YMM + marginMM

	switch elem.Type {
	case ElementTypeStaticText, ElementTypeDynamicText:
		r.renderText(pdf, elem, absX, absY)
	case ElementTypeBarcode:
		r.renderBarcode(pdf, elem, absX, absY)
	case ElementTypeQRCode:
		r.renderQRCode(pdf, elem, absX, absY)
	case ElementTypeLine:
		r.renderLine(pdf, elem, absX, absY)
	case ElementTypeBox:
		r.renderBox(pdf, elem, absX, absY)
	case ElementTypeImage:
		r.renderImage(pdf, elem, absX, absY)
	case ElementTypeRepeater:
		r.renderRepeater(pdf, elem, absX, absY)
	}
}

func (r *PDFRenderer) renderText(pdf *fpdf.Fpdf, elem MergedElement, absX, absY float64) {
	fontFamily := "Arial"
	fontSizePt := 12
	fontBold := false
	fontItalic := false
	alignment := "left"

	if elem.Properties != nil {
		var props struct {
			FontFamily string `json:"font_family"`
			FontSizePt int    `json:"font_size_pt"`
			FontBold   bool   `json:"font_bold"`
			FontItalic bool   `json:"font_italic"`
			Alignment  string `json:"alignment"`
		}
		if err := json.Unmarshal(elem.Properties, &props); err == nil {
			if props.FontFamily != "" {
				fontFamily = props.FontFamily
			}
			if props.FontSizePt > 0 {
				fontSizePt = props.FontSizePt
			}
			fontBold = props.FontBold
			fontItalic = props.FontItalic
			if props.Alignment != "" {
				alignment = props.Alignment
			}
		}
	}

	style := ""
	if fontBold {
		style += "B"
	}
	if fontItalic {
		style += "I"
	}

	pdfFont := mapFontFamily(fontFamily)
	pdf.SetFont(pdfFont, style, float64(fontSizePt))
	pdf.SetTextColor(0, 0, 0)

	alignStr := mapAlignment(alignment)

	pdf.ClipRect(absX, absY, elem.WidthMM, elem.HeightMM, false)
	pdf.SetXY(absX, absY)
	pdf.CellFormat(elem.WidthMM, elem.HeightMM, elem.ResolvedText, "", 0, alignStr, false, 0, "")
	pdf.ClipEnd()
}

func (r *PDFRenderer) renderBarcode(pdf *fpdf.Fpdf, elem MergedElement, absX, absY float64) {
	var props BarcodeProperties
	if err := json.Unmarshal(elem.Properties, &props); err != nil {
		return
	}

	const mmToPixel = 11.81
	widthPx := int(elem.WidthMM * mmToPixel)
	heightPx := int(elem.HeightMM * mmToPixel)
	if widthPx <= 0 || heightPx <= 0 {
		return
	}

	var img image.Image
	var err error

	switch props.Format {
	case "code39":
		img, err = r.barcodeGen.GenerateCode39(elem.ResolvedData, widthPx, heightPx)
	case "ean13":
		img, err = r.barcodeGen.GenerateEAN13(elem.ResolvedData, widthPx, heightPx)
	default:
		img, err = r.barcodeGen.GenerateCode128(elem.ResolvedData, widthPx, heightPx)
	}

	if err != nil || img == nil {
		return
	}
	r.embedImage(pdf, img, elem.ID+"_barcode", absX, absY, elem.WidthMM, elem.HeightMM)
}

func (r *PDFRenderer) renderQRCode(pdf *fpdf.Fpdf, elem MergedElement, absX, absY float64) {
	const mmToPixel = 11.81
	sizeMM := elem.WidthMM
	if elem.HeightMM < sizeMM {
		sizeMM = elem.HeightMM
	}
	sizePx := int(sizeMM * mmToPixel)
	if sizePx <= 0 {
		return
	}

	img, err := r.barcodeGen.GenerateQRCode(elem.ResolvedData, sizePx)
	if err != nil || img == nil {
		return
	}
	r.embedImage(pdf, img, elem.ID+"_qrcode", absX, absY, elem.WidthMM, elem.HeightMM)
}

func (r *PDFRenderer) renderLine(pdf *fpdf.Fpdf, elem MergedElement, absX, absY float64) {
	var props LineProperties
	if err := json.Unmarshal(elem.Properties, &props); err != nil {
		return
	}
	thickness := props.ThicknessMM
	if thickness <= 0 {
		thickness = 0.5
	}
	pdf.SetLineWidth(thickness)
	pdf.SetDrawColor(0, 0, 0)

	if props.Orientation == "vertical" {
		x := absX + elem.WidthMM/2
		pdf.Line(x, absY, x, absY+elem.HeightMM)
	} else {
		y := absY + elem.HeightMM/2
		pdf.Line(absX, y, absX+elem.WidthMM, y)
	}
}

func (r *PDFRenderer) renderBox(pdf *fpdf.Fpdf, elem MergedElement, absX, absY float64) {
	var props BoxProperties
	if err := json.Unmarshal(elem.Properties, &props); err != nil {
		return
	}
	thickness := props.ThicknessMM
	if thickness <= 0 {
		thickness = 0.5
	}
	pdf.SetLineWidth(thickness)
	pdf.SetDrawColor(0, 0, 0)

	if props.Fill {
		pdf.SetFillColor(0, 0, 0)
		pdf.Rect(absX, absY, elem.WidthMM, elem.HeightMM, "FD")
	} else {
		pdf.Rect(absX, absY, elem.WidthMM, elem.HeightMM, "D")
	}
}

func (r *PDFRenderer) renderImage(pdf *fpdf.Fpdf, elem MergedElement, absX, absY float64) {
	var props ImageProperties
	if err := json.Unmarshal(elem.Properties, &props); err != nil {
		return
	}
	if props.SourceURL == "" {
		return
	}

	switch props.SourceType {
	case "base64":
		r.renderBase64Image(pdf, props.SourceURL, elem.ID+"_img", absX, absY, elem.WidthMM, elem.HeightMM)
	default:
		r.renderURLImage(pdf, props.SourceURL, elem.ID+"_img", absX, absY, elem.WidthMM, elem.HeightMM)
	}
}

func (r *PDFRenderer) renderRepeater(pdf *fpdf.Fpdf, elem MergedElement, absX, absY float64) {
	var props RepeaterProperties
	if err := json.Unmarshal(elem.Properties, &props); err != nil {
		return
	}

	rowHeight := props.RowHeightMM
	if rowHeight <= 0 {
		rowHeight = 6.0
	}

	dataStartY := absY
	if props.ShowHeader {
		r.renderRepeaterHeader(pdf, props, absX, absY, elem.WidthMM, rowHeight)
		dataStartY = absY + rowHeight
	}

	for rowIdx, row := range elem.ResolvedRows {
		rowY := dataStartY + float64(rowIdx)*rowHeight
		r.renderRepeaterRow(pdf, props, row, absX, rowY, elem.WidthMM, rowHeight)

		if props.ShowRowLines {
			lineY := rowY + rowHeight
			pdf.SetLineWidth(0.2)
			pdf.SetDrawColor(0, 0, 0)
			pdf.Line(absX, lineY, absX+elem.WidthMM, lineY)
		}
	}
}

func (r *PDFRenderer) renderRepeaterHeader(pdf *fpdf.Fpdf, props RepeaterProperties, absX, absY, totalWidth, rowHeight float64) {
	for _, col := range props.Columns {
		cellX := absX + col.XOffsetMM
		pdfFont := mapFontFamily(col.FontFamily)
		fontSize := float64(col.FontSizePt)
		if fontSize <= 0 {
			fontSize = 7
		}
		pdf.SetFont(pdfFont, "B", fontSize)
		pdf.SetTextColor(0, 0, 0)
		alignStr := mapAlignment(col.Alignment)

		pdf.ClipRect(cellX, absY, col.WidthMM, rowHeight, false)
		pdf.SetXY(cellX, absY)
		pdf.CellFormat(col.WidthMM, rowHeight, col.Label, "", 0, alignStr, false, 0, "")
		pdf.ClipEnd()
	}

	lineY := absY + rowHeight
	pdf.SetLineWidth(0.3)
	pdf.SetDrawColor(0, 0, 0)
	pdf.Line(absX, lineY, absX+totalWidth, lineY)
}

func (r *PDFRenderer) renderRepeaterRow(pdf *fpdf.Fpdf, props RepeaterProperties, row []string, absX, rowY, totalWidth, rowHeight float64) {
	for colIdx, col := range props.Columns {
		cellX := absX + col.XOffsetMM
		cellText := ""
		if colIdx < len(row) {
			cellText = row[colIdx]
		}

		pdfFont := mapFontFamily(col.FontFamily)
		fontSize := float64(col.FontSizePt)
		if fontSize <= 0 {
			fontSize = 7
		}
		pdf.SetFont(pdfFont, "", fontSize)
		pdf.SetTextColor(0, 0, 0)
		alignStr := mapAlignment(col.Alignment)

		pdf.ClipRect(cellX, rowY, col.WidthMM, rowHeight, false)
		pdf.SetXY(cellX, rowY)
		pdf.CellFormat(col.WidthMM, rowHeight, cellText, "", 0, alignStr, false, 0, "")
		pdf.ClipEnd()
	}
}

func (r *PDFRenderer) renderBase64Image(pdf *fpdf.Fpdf, b64Data, name string, x, y, w, h float64) {
	if idx := strings.Index(b64Data, ","); idx >= 0 {
		b64Data = b64Data[idx+1:]
	}
	data, err := base64.StdEncoding.DecodeString(b64Data)
	if err != nil {
		return
	}
	reader := bytes.NewReader(data)
	imgType := detectImageType(data)
	opt := fpdf.ImageOptions{ImageType: imgType, ReadDpi: true}
	pdf.RegisterImageOptionsReader(name, opt, reader)
	pdf.ImageOptions(name, x, y, w, h, false, opt, 0, "")
}

func (r *PDFRenderer) renderURLImage(pdf *fpdf.Fpdf, url, name string, x, y, w, h float64) {
	resp, err := http.Get(url)
	if err != nil {
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return
	}
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return
	}
	reader := bytes.NewReader(data)
	imgType := detectImageType(data)
	opt := fpdf.ImageOptions{ImageType: imgType, ReadDpi: true}
	pdf.RegisterImageOptionsReader(name, opt, reader)
	pdf.ImageOptions(name, x, y, w, h, false, opt, 0, "")
}

func (r *PDFRenderer) embedImage(pdf *fpdf.Fpdf, img image.Image, name string, x, y, w, h float64) {
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return
	}
	reader := bytes.NewReader(buf.Bytes())
	opt := fpdf.ImageOptions{ImageType: "PNG", ReadDpi: true}
	pdf.RegisterImageOptionsReader(name, opt, reader)
	pdf.ImageOptions(name, x, y, w, h, false, opt, 0, "")
}

func sortByZOrder(elements []MergedElement) []MergedElement {
	sorted := make([]MergedElement, len(elements))
	copy(sorted, elements)
	for i := 1; i < len(sorted); i++ {
		key := sorted[i]
		j := i - 1
		for j >= 0 && sorted[j].ZOrder > key.ZOrder {
			sorted[j+1] = sorted[j]
			j--
		}
		sorted[j+1] = key
	}
	return sorted
}

func mapFontFamily(family string) string {
	switch strings.ToLower(family) {
	case "arial", "helvetica", "sans-serif":
		return "Arial"
	case "courier", "monospace":
		return "Courier"
	case "times", "times new roman", "serif":
		return "Times"
	default:
		return "Arial"
	}
}

func mapAlignment(alignment string) string {
	switch strings.ToLower(alignment) {
	case "center":
		return "CM"
	case "right":
		return "RM"
	default:
		return "LM"
	}
}

func detectImageType(data []byte) string {
	if len(data) < 4 {
		return "PNG"
	}
	if data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47 {
		return "PNG"
	}
	if data[0] == 0xFF && data[1] == 0xD8 {
		return "JPEG"
	}
	if data[0] == 0x47 && data[1] == 0x49 && data[2] == 0x46 {
		return "GIF"
	}
	return "PNG"
}
