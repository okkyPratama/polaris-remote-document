package rest

import (
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"bitbucket.org/log-tech/helper-go/hutils"
	"bitbucket.org/log-tech/polaris-document-service/usecases"
	"github.com/gin-gonic/gin"
)

var proxyHttpClient = &http.Client{
	Timeout: 10 * time.Second,
}

func ProxyRestController(group *gin.RouterGroup, _ *usecases.AllUseCasesImpl) {
	group.GET("/proxyPdf", proxyPdf())
}

func proxyPdf() gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK

		rawURL := c.Query("url")
		if rawURL == "" {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{"query parameter 'url' is required."}))
			return
		}

		parsedURL, err := url.ParseRequestURI(rawURL)
		if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{"query parameter 'url' must start with http:// or https://"}))
			return
		}

		resp, err := proxyHttpClient.Get(rawURL)
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

		c.Header("Content-Type", "application/pdf")
		if contentDisposition := resp.Header.Get("Content-Disposition"); contentDisposition != "" {
			c.Header("Content-Disposition", contentDisposition)
		}

		c.Status(http.StatusOK)
		io.Copy(c.Writer, resp.Body)
	}
}

// isTimeoutError checks if an error is a timeout error.
func isTimeoutError(err error) bool {
	if err == nil {
		return false
	}
	if urlErr, ok := err.(*url.Error); ok {
		return urlErr.Timeout()
	}
	return false
}
