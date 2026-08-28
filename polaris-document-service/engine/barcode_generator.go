package engine

import (
	"image"
	"image/color"

	"github.com/boombuler/barcode"
	"github.com/boombuler/barcode/code128"
	"github.com/boombuler/barcode/code39"
	"github.com/boombuler/barcode/ean"
	"github.com/boombuler/barcode/qr"
)

// BarcodeGenerator produces barcode and QR code images.
type BarcodeGenerator interface {
	GenerateCode128(data string, width, height int) (image.Image, error)
	GenerateCode39(data string, width, height int) (image.Image, error)
	GenerateEAN13(data string, width, height int) (image.Image, error)
	GenerateQRCode(data string, size int) (image.Image, error)
}

// BarcodeGeneratorImpl implements BarcodeGenerator using boombuler/barcode.
type BarcodeGeneratorImpl struct{}

// NewBarcodeGenerator creates a new BarcodeGeneratorImpl.
func NewBarcodeGenerator() *BarcodeGeneratorImpl {
	return &BarcodeGeneratorImpl{}
}

func (g *BarcodeGeneratorImpl) GenerateCode128(data string, width, height int) (image.Image, error) {
	if data == "" {
		return blankImage(width, height), nil
	}
	bc, err := code128.Encode(data)
	if err != nil {
		return blankImage(width, height), nil
	}
	scaled, err := barcode.Scale(bc, width, height)
	if err != nil {
		return blankImage(width, height), nil
	}
	return scaled, nil
}

func (g *BarcodeGeneratorImpl) GenerateCode39(data string, width, height int) (image.Image, error) {
	if data == "" {
		return blankImage(width, height), nil
	}
	bc, err := code39.Encode(data, false, false)
	if err != nil {
		return blankImage(width, height), nil
	}
	scaled, err := barcode.Scale(bc, width, height)
	if err != nil {
		return blankImage(width, height), nil
	}
	return scaled, nil
}

func (g *BarcodeGeneratorImpl) GenerateEAN13(data string, width, height int) (image.Image, error) {
	if data == "" {
		return blankImage(width, height), nil
	}
	bc, err := ean.Encode(data)
	if err != nil {
		return blankImage(width, height), nil
	}
	scaled, err := barcode.Scale(bc, width, height)
	if err != nil {
		return blankImage(width, height), nil
	}
	return scaled, nil
}

func (g *BarcodeGeneratorImpl) GenerateQRCode(data string, size int) (image.Image, error) {
	if data == "" {
		return blankImage(size, size), nil
	}
	bc, err := qr.Encode(data, qr.M, qr.Auto)
	if err != nil {
		return blankImage(size, size), nil
	}
	scaled, err := barcode.Scale(bc, size, size)
	if err != nil {
		return blankImage(size, size), nil
	}
	return scaled, nil
}

func blankImage(width, height int) image.Image {
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	white := color.RGBA{R: 255, G: 255, B: 255, A: 255}
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			img.Set(x, y, white)
		}
	}
	return img
}
