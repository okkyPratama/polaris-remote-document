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

func UserRoleRestController(group *gin.RouterGroup, allUseCases *usecases.AllUseCasesImpl) {
	group.POST("/detailById", getByIdUserRole(allUseCases))
	group.POST("/search", searchUserRole(allUseCases))
	group.POST("/save", addUserRole(allUseCases))
	group.POST("/delete", deleteUserRole(allUseCases))
}

func addUserRole(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		bodyReq, errMsg, isValid := isValidUserRoleRequest(c, constants.ActionAdd)
		if !isValid {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", errMsg))
			return
		}
		errUc := allUseCases.UserRole.Save(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(nil))
	}
}

func deleteUserRole(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		bodyReq, errMsg, isValid := isValidUserRoleRequest(c, constants.ActionDelete)
		if !isValid {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", errMsg))
			return
		}
		errUc := allUseCases.UserRole.Delete(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(nil))
	}
}

func getByIdUserRole(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		var bodyReq models.UserRoleReq
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
		data, errUc := allUseCases.UserRole.GetById(bodyReq.Id)
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

func searchUserRole(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		var bodyReq hmodels.SearchRequest
		if err := c.ShouldBindJSON(&bodyReq); err != nil {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{"body message must be json structure."}))
			return
		}
		resp, errUc := allUseCases.UserRole.Search(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(resp))
	}
}

func isValidUserRoleRequest(ctx *gin.Context, actionType string) (models.UserRoleReq, []string, bool) {
	var errMsg []string
	valid := true
	username := ctx.GetHeader("user-username")
	if len(username) == 0 {
		errMsg = append(errMsg, "header user-username not set.")
	}
	var bodyRequest models.UserRoleReq
	if err := ctx.ShouldBindJSON(&bodyRequest); err != nil {
		return bodyRequest, append(errMsg, err.Error()), false
	}
	if actionType == constants.ActionAdd {
		if bodyRequest.UserId == "" {
			errMsg = append(errMsg, "body.userId is required.")
		}
		if len(bodyRequest.RoleIds) == 0 {
			errMsg = append(errMsg, "body.roleIds is required.")
		}
		bodyRequest.CreatedBy = username
	}
	if actionType == constants.ActionDelete {
		if bodyRequest.UserId == "" {
			errMsg = append(errMsg, "body.userId is required.")
		}
		if len(bodyRequest.RoleIds) == 0 {
			errMsg = append(errMsg, "body.roleIds is required.")
		}
		bodyRequest.DeletedBy = username
	}
	if len(errMsg) > 0 {
		valid = false
	}
	return bodyRequest, errMsg, valid
}
