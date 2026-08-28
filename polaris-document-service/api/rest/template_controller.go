package rest

import (
	"net/http"
	"strings"

	"bitbucket.org/log-tech/helper-go/hmodels"
	"bitbucket.org/log-tech/helper-go/hutils"
	"bitbucket.org/log-tech/polaris-document-service/constants"
	"bitbucket.org/log-tech/polaris-document-service/models"
	"bitbucket.org/log-tech/polaris-document-service/usecases"
	"github.com/gin-gonic/gin"
)

// getValidatedUsername extracts and validates the user-username header.
// Returns empty string if header is missing, empty, whitespace-only, or contains unresolved template variables.
func getValidatedUsername(c *gin.Context) string {
	username := strings.TrimSpace(c.GetHeader("user-username"))
	if len(username) == 0 {
		return ""
	}
	// Reject unresolved template variables (e.g. "{{username}}" from API tools)
	if strings.Contains(username, "{{") && strings.Contains(username, "}}") {
		return ""
	}
	return username
}

func TemplateRestController(group *gin.RouterGroup, allUseCases *usecases.AllUseCasesImpl) {
	group.POST("/save", saveTemplate(allUseCases))
	group.POST("/edit", editTemplate(allUseCases))
	group.POST("/delete", deleteTemplate(allUseCases))
	group.POST("/detailById", detailByIdTemplate(allUseCases))
	group.POST("/getAll", getAllTemplates(allUseCases))
	group.POST("/generate", generateTemplate(allUseCases))
}

func saveTemplate(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		bodyReq, errMsg, isValid := isValidTemplateRequest(c, constants.ActionAdd)
		if !isValid {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", errMsg))
			return
		}

		result, errUc := allUseCases.TemplateUseCases.Save(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}

		c.JSON(httpCode, hutils.BuildRestResponseSuccess(&hmodels.ResponseContent{
			Data: []interface{}{result},
		}))
	}
}

func editTemplate(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		bodyReq, errMsg, isValid := isValidTemplateRequest(c, constants.ActionUpdate)
		if !isValid {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", errMsg))
			return
		}

		_, errUc := allUseCases.TemplateUseCases.Update(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}

		c.JSON(httpCode, hutils.BuildRestResponseSuccess(nil))
	}
}

func deleteTemplate(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		username := getValidatedUsername(c)
		if len(username) == 0 {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{"header user-username not set."}))
			return
		}

		var bodyReq models.DeleteReq
		if err := c.ShouldBindJSON(&bodyReq); err != nil {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{err.Error()}))
			return
		}

		errUc := allUseCases.TemplateUseCases.Delete(bodyReq.ID, username)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}

		c.JSON(httpCode, hutils.BuildRestResponseSuccess(nil))
	}
}

func detailByIdTemplate(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK

		username := getValidatedUsername(c)
		if len(username) == 0 {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{"header user-username not set."}))
			return
		}

		var bodyReq models.DetailByIdReq
		if err := c.ShouldBindJSON(&bodyReq); err != nil {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{err.Error()}))
			return
		}
		if len(bodyReq.ID) == 0 {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{"body.id is required."}))
			return
		}

		data, errUc := allUseCases.TemplateUseCases.GetById(bodyReq.ID)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}

		c.JSON(httpCode, hutils.BuildRestResponseSuccess(&hmodels.ResponseContent{
			Data: []interface{}{data},
		}))
	}
}

func getAllTemplates(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK

		username := getValidatedUsername(c)
		if len(username) == 0 {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{"header user-username not set."}))
			return
		}

		var searchReq models.SearchRequest
		if err := c.ShouldBindJSON(&searchReq); err != nil {
			// Allow empty body — use defaults
			searchReq = models.SearchRequest{}
		}

		content, errUc := allUseCases.TemplateUseCases.Search(searchReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}

		c.JSON(httpCode, hutils.BuildRestResponseSuccess(content))
	}
}

func isValidTemplateRequest(ctx *gin.Context, actionType string) (models.TemplateReq, []string, bool) {
	var errMsg []string
	valid := true
	username := getValidatedUsername(ctx)
	if len(username) == 0 {
		errMsg = append(errMsg, "header user-username not set.")
	}

	var bodyRequest models.TemplateReq
	if err := ctx.ShouldBindJSON(&bodyRequest); err != nil {
		return bodyRequest, append(errMsg, err.Error()), false
	}

	if actionType == constants.ActionAdd {
		if len(bodyRequest.TemplateCode) == 0 {
			errMsg = append(errMsg, "body.templateCode is required.")
		}
		if len(bodyRequest.Name) == 0 {
			errMsg = append(errMsg, "body.name is required.")
		}
		if len(bodyRequest.TemplateType) == 0 {
			errMsg = append(errMsg, "body.templateType is required.")
		}
		if len(bodyRequest.OutputFormat) == 0 {
			errMsg = append(errMsg, "body.outputFormat is required.")
		}
		if len(bodyRequest.TemplateContent) == 0 {
			errMsg = append(errMsg, "body.templateContent is required.")
		}
		bodyRequest.CreatedBy = username
		bodyRequest.UpdatedBy = username
	}

	if actionType == constants.ActionUpdate {
		if len(bodyRequest.ID) == 0 {
			errMsg = append(errMsg, "body.id is required.")
		}
		if len(bodyRequest.TemplateCode) == 0 {
			errMsg = append(errMsg, "body.templateCode is required.")
		}
		if len(bodyRequest.Name) == 0 {
			errMsg = append(errMsg, "body.name is required.")
		}
		if len(bodyRequest.TemplateType) == 0 {
			errMsg = append(errMsg, "body.templateType is required.")
		}
		if len(bodyRequest.OutputFormat) == 0 {
			errMsg = append(errMsg, "body.outputFormat is required.")
		}
		if len(bodyRequest.TemplateContent) == 0 {
			errMsg = append(errMsg, "body.templateContent is required.")
		}
		bodyRequest.UpdatedBy = username
	}

	if len(errMsg) > 0 {
		valid = false
	}
	return bodyRequest, errMsg, valid
}

func generateTemplate(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		var bodyReq models.GenerateTemplateReq
		if err := c.ShouldBindJSON(&bodyReq); err != nil {
			c.JSON(http.StatusBadRequest, hutils.BuildRestResponseFailure(http.StatusBadRequest, -1, "Failed", []string{err.Error()}))
			return
		}

		if len(bodyReq.TemplateID) == 0 {
			c.JSON(http.StatusBadRequest, hutils.BuildRestResponseFailure(http.StatusBadRequest, -1, "Failed", []string{"body.templateId is required."}))
			return
		}

		pdfBytes, errUc := allUseCases.TemplateUseCases.Generate(bodyReq.TemplateID, bodyReq.Data)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}

		c.Header("Content-Type", "application/pdf")
		c.Header("Content-Disposition", "inline; filename=output.pdf")
		c.Data(http.StatusOK, "application/pdf", pdfBytes)
	}
}
