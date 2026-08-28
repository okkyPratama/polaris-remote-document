package rest

import (
	"net/http"

	"bitbucket.org/log-tech/helper-go/hmodels"
	"bitbucket.org/log-tech/helper-go/hutils"
	"bitbucket.org/log-tech/polaris-smart-access-service/constants"
	"bitbucket.org/log-tech/polaris-smart-access-service/models"
	"bitbucket.org/log-tech/polaris-smart-access-service/usecases"
	"github.com/gin-gonic/gin"
)

func PermissionRestController(group *gin.RouterGroup, allUseCases *usecases.AllUseCasesImpl) {
	group.POST("/getAll", searchPermission(allUseCases))
	group.POST("/detailById", getByIdPermission(allUseCases))
	group.POST("/save", addPermission(allUseCases))
	group.POST("/edit", updatePermission(allUseCases))
	group.POST("/delete", deletePermission(allUseCases))
}

func addPermission(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		bodyReq, errMsg, isValid := isValidPermissionRequest(c, constants.ActionAdd)
		if !isValid {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", errMsg))
			return
		}

		errUc := allUseCases.Permission.Save(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}

		c.JSON(httpCode, hutils.BuildRestResponseSuccess(nil))
	}
}
func updatePermission(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		bodyReq, errMsg, isValid := isValidPermissionRequest(c, constants.ActionUpdate)
		if !isValid {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", errMsg))
			return
		}
		errUc := allUseCases.Permission.Update(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}

		c.JSON(httpCode, hutils.BuildRestResponseSuccess(nil))
	}
}
func deletePermission(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		bodyReq, errMsg, isValid := isValidPermissionRequest(c, constants.ActionDelete)
		if !isValid {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", errMsg))
			return
		}

		errUc := allUseCases.Permission.Delete(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}

		c.JSON(httpCode, hutils.BuildRestResponseSuccess(nil))
	}
}
func getByIdPermission(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		var bodyReq models.PermissionReq
		if err := c.ShouldBindJSON(&bodyReq); err != nil {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{err.Error()}))
			return
		}
		if len(bodyReq.Id) == 0 {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{"body.id is required."}))
			return
		}
		data, errUc := allUseCases.Permission.GetById(bodyReq.Id)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}

		content := &hmodels.ResponseContent{
			Data: []interface{}{},
		}
		if data != nil {
			content = &hmodels.ResponseContent{
				Data: []interface{}{data},
			}
		}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(content))
	}
}

func searchPermission(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		bodyReq, errMsg, valid := isValidSearchPermissionRequest(c)
		if !valid {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", errMsg))
			return
		}
		resp, errUc := allUseCases.Permission.Search(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(resp))
	}
}
func isValidSearchPermissionRequest(ctx *gin.Context) (hmodels.SearchRequest, []string, bool) {
	var errMsg []string
	valid := true
	username := ctx.GetHeader("user-username")
	if len(username) == 0 {
		errMsg = append(errMsg, "header user-username not set.")
	}

	var bodyReq hmodels.SearchRequest
	if err := ctx.ShouldBindJSON(&bodyReq); err != nil {
		return bodyReq, append(errMsg, "body message must be json structure."), false
	}

	if len(errMsg) > 0 {
		valid = false
	}
	return bodyReq, errMsg, valid
}
func isValidPermissionRequest(ctx *gin.Context, actionType string) (models.PermissionReq, []string, bool) {
	var errMsg []string
	valid := true
	username := ctx.GetHeader("user-username")
	if len(username) == 0 {
		errMsg = append(errMsg, "header user-username not set.")
	}
	var bodyRequest models.PermissionReq
	if err := ctx.ShouldBindJSON(&bodyRequest); err != nil {
		return bodyRequest, append(errMsg, err.Error()), false
	}
	if actionType == constants.ActionAdd {
		if len(bodyRequest.Key) == 0 {
			errMsg = append(errMsg, "body.key is required.")
		}
		if len(bodyRequest.Resource) == 0 {
			errMsg = append(errMsg, "body.resource is required.")
		}
		if len(bodyRequest.Action) == 0 {
			errMsg = append(errMsg, "body.action is required.")
		}
		bodyRequest.CreatedBy = username
	}
	if actionType == constants.ActionUpdate {
		if len(bodyRequest.Id) == 0 {
			errMsg = append(errMsg, "body.id is required.")
		}
		if len(bodyRequest.Key) == 0 {
			errMsg = append(errMsg, "body.key is required.")
		}
		if len(bodyRequest.Resource) == 0 {
			errMsg = append(errMsg, "body.resource is required.")
		}
		if len(bodyRequest.Action) == 0 {
			errMsg = append(errMsg, "body.action is required.")
		}
		bodyRequest.UpdatedBy = username
	}
	if actionType == constants.ActionDelete {
		if len(bodyRequest.Id) == 0 {
			errMsg = append(errMsg, "body.id is required.")
		}
		bodyRequest.DeletedBy = username
	}

	if len(errMsg) > 0 {
		valid = false
	}
	return bodyRequest, errMsg, valid
}
