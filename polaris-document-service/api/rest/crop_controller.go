package rest

import (
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"bitbucket.org/log-tech/helper-go/hutils"
	"bitbucket.org/log-tech/polaris-document-service/models"
	"bitbucket.org/log-tech/polaris-document-service/usecases"
	"github.com/gin-gonic/gin"
)

var cropHttpClient = &http.Client{
	Timeout: 10 * time.Second,
}

func CropRestController(group *gin.RouterGroup, allUseCases *usecases.AllUseCasesImpl) {
	group.POST("/cropPdf", cropPdf(allUseCases))
}

func cropPdf(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK

		var bodyReq models.CropReq
		if err := c.ShouldBindJSON(&bodyReq); err != nil {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{err.Error()}))
			return
		}

		// Validate request
		var errMsg []string
		if bodyReq.URL == "" {
			errMsg = append(errMsg, "body.url is required.")
		} else {
			parsedURL, err := url.ParseRequestURI(bodyReq.URL)
			if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
				errMsg = append(errMsg, "body.url must start with http:// or https://")
			}
		}
		if !bodyReq.AutoCrop {
			if bodyReq.TargetWidthMM <= 0 || bodyReq.TargetHeightMM <= 0 {
				errMsg = append(errMsg, "body.targetWidthMm and body.targetHeightMm must be positive when autoCrop is false.")
			}
		}
		if len(errMsg) > 0 {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", errMsg))
			return
		}

		// Fetch PDF from URL
		resp, err := cropHttpClient.Get(bodyReq.URL)
		if err != nil {
			if isTimeoutError(err) {
				httpCode = http.StatusGatewayTimeout
				c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{"Request timeout while fetching PDF."}))
				return
			}
			httpCode = http.StatusBadGateway
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{"Failed to fetch PDF from URL."}))
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			httpCode = http.StatusBadGateway
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{"Failed to fetch PDF from URL."}))
			return
		}

		contentType := resp.Header.Get("Content-Type")
		if !strings.Contains(strings.ToLower(contentType), "application/pdf") {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{"URL does not return a PDF."}))
			return
		}

		pdfBytes, err := io.ReadAll(resp.Body)
		if err != nil {
			httpCode = http.StatusBadGateway
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{"Failed to read PDF response body."}))
			return
		}

		// Perform crop
		var croppedPDF []byte
		if bodyReq.AutoCrop {
			paddingMM := bodyReq.PaddingMM
			if paddingMM < 0 {
				paddingMM = 0
			}
			croppedPDF, err = allUseCases.CropUseCases.AutoCrop(pdfBytes, paddingMM)
		} else {
			croppedPDF, err = allUseCases.CropUseCases.CropToSize(pdfBytes, bodyReq.TargetWidthMM, bodyReq.TargetHeightMM)
		}

		if err != nil {
			httpCode = http.StatusInternalServerError
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{"Crop processing failed."}))
			return
		}

		c.Header("Content-Disposition", "inline; filename=\"cropped.pdf\"")
		c.Data(httpCode, "application/pdf", croppedPDF)
	}
}
