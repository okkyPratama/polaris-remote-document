package rest

import (
	"net/http"

	"bitbucket.org/log-tech/helper-go/hmodels"
	"bitbucket.org/log-tech/helper-go/hutils"
	"bitbucket.org/log-tech/polaris-document-service/models"
	"bitbucket.org/log-tech/polaris-document-service/usecases"
	"github.com/gin-gonic/gin"
)

func TemplateAssignmentRestController(group *gin.RouterGroup, allUseCases *usecases.AllUseCasesImpl) {
	group.POST("/assign", assignTemplate(allUseCases))
	group.POST("/getByScope", getByScopeAssignment(allUseCases))
	group.POST("/getByTemplateId", getByTemplateIdAssignment(allUseCases))
}

func assignTemplate(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		bodyReq, errMsg, isValid := isValidAssignmentRequest(c)
		if !isValid {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", errMsg))
			return
		}

		data, errUc := allUseCases.TemplateAssignmentUseCases.Assign(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}

		c.JSON(httpCode, hutils.BuildRestResponseSuccess(&hmodels.ResponseContent{
			Data: []interface{}{data},
		}))
	}
}

func getByScopeAssignment(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK

		username := getValidatedUsername(c)
		if len(username) == 0 {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{"header user-username not set."}))
			return
		}

		var bodyReq models.GetByScopeReq
		if err := c.ShouldBindJSON(&bodyReq); err != nil {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{err.Error()}))
			return
		}

		data, errUc := allUseCases.TemplateAssignmentUseCases.GetByScope(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}

		respData := make([]interface{}, 0, len(data))
		for _, item := range data {
			respData = append(respData, item)
		}

		c.JSON(httpCode, hutils.BuildRestResponseSuccess(&hmodels.ResponseContent{
			Data: respData,
		}))
	}
}

func getByTemplateIdAssignment(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
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

		data, errUc := allUseCases.TemplateAssignmentUseCases.GetByTemplateId(bodyReq.ID)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}

		respData := make([]interface{}, 0, len(data))
		for _, item := range data {
			respData = append(respData, item)
		}

		c.JSON(httpCode, hutils.BuildRestResponseSuccess(&hmodels.ResponseContent{
			Data: respData,
		}))
	}
}

func isValidAssignmentRequest(ctx *gin.Context) (models.TemplateAssignmentReq, []string, bool) {
	var errMsg []string
	valid := true
	username := getValidatedUsername(ctx)
	if len(username) == 0 {
		errMsg = append(errMsg, "header user-username not set.")
	}

	var bodyRequest models.TemplateAssignmentReq
	if err := ctx.ShouldBindJSON(&bodyRequest); err != nil {
		return bodyRequest, append(errMsg, err.Error()), false
	}

	if len(bodyRequest.TemplateType) == 0 {
		errMsg = append(errMsg, "body.templateType is required.")
	}
	if len(bodyRequest.TemplateID) == 0 {
		errMsg = append(errMsg, "body.templateId is required.")
	}
	if len(bodyRequest.EffectiveFrom) == 0 {
		errMsg = append(errMsg, "body.effectiveFrom is required.")
	}
	if len(bodyRequest.CompanyID) == 0 && len(bodyRequest.WarehouseID) == 0 && len(bodyRequest.OwnerID) == 0 {
		errMsg = append(errMsg, "Minimal satu dari companyId, warehouseId, atau ownerId harus terisi.")
	}

	bodyRequest.CreatedBy = username
	bodyRequest.UpdatedBy = username

	if len(errMsg) > 0 {
		valid = false
	}
	return bodyRequest, errMsg, valid
}
