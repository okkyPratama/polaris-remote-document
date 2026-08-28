package usecases

import (
	"bytes"
	"fmt"
	"math"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/types"
)

// Common page size thresholds (in points, 1mm = 2.83465pt)
const (
	mmToPoints = 2.83465

	// A4 dimensions in points (210×297mm)
	a4WidthPt  = 210 * mmToPoints
	a4HeightPt = 297 * mmToPoints

	// Tolerance for detecting A4-like pages (±5mm)
	pageSizeTolerancePt = 5 * mmToPoints

	// Default content ratio for auto-crop heuristic.
	// Most marketplace shipping labels occupy the upper 55% of an A4 page.
	defaultContentRatio = 0.55
)

type CropUseCasesImpl struct{}

func NewCropUseCases() *CropUseCasesImpl {
	return &CropUseCasesImpl{}
}

// CropToSize crops each page of the PDF to the specified target dimensions.
// The crop area is taken from the top-left of each page.
func (uc *CropUseCasesImpl) CropToSize(pdfBytes []byte, targetWidthMM, targetHeightMM float64) ([]byte, error) {
	if len(pdfBytes) == 0 {
		return nil, fmt.Errorf("crop: empty PDF input")
	}
	if targetWidthMM <= 0 || targetHeightMM <= 0 {
		return nil, fmt.Errorf("crop: target dimensions must be positive (got %.1f×%.1fmm)", targetWidthMM, targetHeightMM)
	}

	targetWidthPt := targetWidthMM * mmToPoints
	targetHeightPt := targetHeightMM * mmToPoints

	ctx, err := readPDFContext(pdfBytes)
	if err != nil {
		return nil, fmt.Errorf("crop: failed to read PDF: %w", err)
	}

	for pageNr := 1; pageNr <= ctx.PageCount; pageNr++ {
		pageDict, _, inhPAttrs, err := ctx.PageDict(pageNr, false)
		if err != nil {
			return nil, fmt.Errorf("crop: failed to get page %d: %w", pageNr, err)
		}
		if pageDict == nil {
			continue
		}

		mediaBox := inhPAttrs.MediaBox
		if mediaBox == nil {
			continue
		}

		pageHeight := mediaBox.Height()
		cropWidth := math.Min(targetWidthPt, mediaBox.Width())
		cropHeight := math.Min(targetHeightPt, pageHeight)

		cropBox := types.NewRectangle(
			mediaBox.LL.X,
			mediaBox.LL.Y+pageHeight-cropHeight,
			mediaBox.LL.X+cropWidth,
			mediaBox.LL.Y+pageHeight,
		)

		pageDict["CropBox"] = cropBox.Array()
		pageDict["MediaBox"] = cropBox.Array()
	}

	return writePDFContext(ctx)
}

// AutoCrop automatically detects and crops whitespace from each page.
// Uses heuristic: for A4-like pages, crops to upper portion where content typically resides.
func (uc *CropUseCasesImpl) AutoCrop(pdfBytes []byte, paddingMM float64) ([]byte, error) {
	if len(pdfBytes) == 0 {
		return nil, fmt.Errorf("autocrop: empty PDF input")
	}
	if paddingMM < 0 {
		paddingMM = 0
	}

	paddingPt := paddingMM * mmToPoints

	ctx, err := readPDFContext(pdfBytes)
	if err != nil {
		return nil, fmt.Errorf("autocrop: failed to read PDF: %w", err)
	}

	for pageNr := 1; pageNr <= ctx.PageCount; pageNr++ {
		pageDict, _, inhPAttrs, err := ctx.PageDict(pageNr, false)
		if err != nil {
			return nil, fmt.Errorf("autocrop: failed to get page %d: %w", pageNr, err)
		}
		if pageDict == nil {
			continue
		}

		mediaBox := inhPAttrs.MediaBox
		if mediaBox == nil {
			continue
		}

		contentBox := detectContentBounds(mediaBox)
		croppedBox := applyPadding(contentBox, mediaBox, paddingPt)

		pageDict["CropBox"] = croppedBox.Array()
		pageDict["MediaBox"] = croppedBox.Array()
	}

	return writePDFContext(ctx)
}

func detectContentBounds(mediaBox *types.Rectangle) *types.Rectangle {
	pageWidth := mediaBox.Width()
	pageHeight := mediaBox.Height()

	if isA4Like(pageWidth, pageHeight) {
		contentHeight := pageHeight * defaultContentRatio
		return types.NewRectangle(
			mediaBox.LL.X,
			mediaBox.LL.Y+pageHeight-contentHeight,
			mediaBox.LL.X+pageWidth,
			mediaBox.LL.Y+pageHeight,
		)
	}

	if isA4Like(pageHeight, pageWidth) {
		contentWidth := pageWidth * defaultContentRatio
		return types.NewRectangle(
			mediaBox.LL.X,
			mediaBox.LL.Y,
			mediaBox.LL.X+contentWidth,
			mediaBox.LL.Y+pageHeight,
		)
	}

	return types.NewRectangle(
		mediaBox.LL.X,
		mediaBox.LL.Y,
		mediaBox.LL.X+pageWidth,
		mediaBox.LL.Y+pageHeight,
	)
}

func isA4Like(width, height float64) bool {
	return math.Abs(width-a4WidthPt) < pageSizeTolerancePt &&
		math.Abs(height-a4HeightPt) < pageSizeTolerancePt
}

func applyPadding(contentBox, mediaBox *types.Rectangle, paddingPt float64) *types.Rectangle {
	return types.NewRectangle(
		math.Max(mediaBox.LL.X, contentBox.LL.X-paddingPt),
		math.Max(mediaBox.LL.Y, contentBox.LL.Y-paddingPt),
		math.Min(mediaBox.LL.X+mediaBox.Width(), contentBox.UR.X+paddingPt),
		math.Min(mediaBox.LL.Y+mediaBox.Height(), contentBox.UR.Y+paddingPt),
	)
}

func readPDFContext(pdfBytes []byte) (*model.Context, error) {
	reader := bytes.NewReader(pdfBytes)
	conf := model.NewDefaultConfiguration()
	conf.ValidationMode = model.ValidationRelaxed
	return api.ReadAndValidate(reader, conf)
}

func writePDFContext(ctx *model.Context) ([]byte, error) {
	var buf bytes.Buffer
	if err := api.WriteContext(ctx, &buf); err != nil {
		return nil, fmt.Errorf("failed to write PDF: %w", err)
	}
	return buf.Bytes(), nil
}
