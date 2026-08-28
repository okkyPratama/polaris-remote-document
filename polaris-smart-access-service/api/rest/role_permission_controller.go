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

func RolePermissionRestController(group *gin.RouterGroup, allUseCases *usecases.AllUseCasesImpl) {
	group.POST("/getAll", searchRolePermission(allUseCases))
	group.POST("/detailById", getByIdRolePermission(allUseCases))
	group.POST("/save", addRolePermission(allUseCases))
	group.POST("/edit", updateRolePermission(allUseCases))
	group.POST("/delete", deleteRolePermission(allUseCases))
}

func addRolePermission(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		bodyReq, errMsg, isValid := isValidRolePermissionRequest(c, constants.ActionAdd)
		if !isValid {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", errMsg))
			return
		}
		errUc := allUseCases.RolePermission.Save(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(nil))
	}
}

func updateRolePermission(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		bodyReq, errMsg, isValid := isValidRolePermissionRequest(c, constants.ActionUpdate)
		if !isValid {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", errMsg))
			return
		}
		errUc := allUseCases.RolePermission.Update(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(nil))
	}
}

func deleteRolePermission(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		bodyReq, errMsg, isValid := isValidRolePermissionRequest(c, constants.ActionDelete)
		if !isValid {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", errMsg))
			return
		}
		errUc := allUseCases.RolePermission.Delete(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(nil))
	}
}

func getByIdRolePermission(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		var bodyReq models.RolePermissionReq
		if err := c.ShouldBindJSON(&bodyReq); err != nil {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{err.Error()}))
			return
		}
		if bodyReq.Id == "" {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{"body.id is required."}))
			return
		}
		data, errUc := allUseCases.RolePermission.GetById(bodyReq.Id)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		content := &hmodels.ResponseContent{Data: []interface{}{}}
		if data != nil {
			content = &hmodels.ResponseContent{Data: []interface{}{data}}
		}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(content))
	}
}

func searchRolePermission(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		var bodyReq hmodels.SearchRequest
		if err := c.ShouldBindJSON(&bodyReq); err != nil {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{"body message must be json structure."}))
			return
		}
		resp, errUc := allUseCases.RolePermission.Search(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(resp))
	}
}

func isValidRolePermissionRequest(ctx *gin.Context, actionType string) (models.RolePermissionReq, []string, bool) {
	var errMsg []string
	valid := true
	username := ctx.GetHeader("user-username")
	if len(username) == 0 {
		errMsg = append(errMsg, "header user-username not set.")
	}
	var bodyRequest models.RolePermissionReq
	if err := ctx.ShouldBindJSON(&bodyRequest); err != nil {
		return bodyRequest, append(errMsg, err.Error()), false
	}
	if actionType == constants.ActionAdd {
		if bodyRequest.RoleId == "" {
			errMsg = append(errMsg, "body.roleId is required.")
		}
		if bodyRequest.PermissionId == "" {
			errMsg = append(errMsg, "body.permissionId is required.")
		}
		bodyRequest.CreatedBy = username
	}
	if actionType == constants.ActionUpdate {
		if bodyRequest.Id == "" {
			errMsg = append(errMsg, "body.id is required.")
		}
		if bodyRequest.RoleId == "" {
			errMsg = append(errMsg, "body.roleId is required.")
		}
		if bodyRequest.PermissionId == "" {
			errMsg = append(errMsg, "body.permissionId is required.")
		}
		bodyRequest.UpdatedBy = username
	}
	if actionType == constants.ActionDelete {
		if bodyRequest.Id == "" {
			errMsg = append(errMsg, "body.id is required.")
		}
		bodyRequest.DeletedBy = username
	}
	if len(errMsg) > 0 {
		valid = false
	}
	return bodyRequest, errMsg, valid
}
