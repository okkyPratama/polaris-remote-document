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

func RoleRestController(group *gin.RouterGroup, allUseCases *usecases.AllUseCasesImpl) {
	group.POST("/getAll", searchRole(allUseCases))
	group.POST("/detailById", getByIdRole(allUseCases))
	group.POST("/save", addRole(allUseCases))
	group.POST("/edit", updateRole(allUseCases))
	group.POST("/delete", deleteRole(allUseCases))
}

func addRole(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		bodyReq, errMsg, isValid := isValidRoleRequest(c, constants.ActionAdd)
		if !isValid {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", errMsg))
			return
		}
		data, errUc := allUseCases.Role.Save(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		content := hmodels.ResponseContent{Data: []interface{}{data}}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(&content))
	}
}

func updateRole(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		bodyReq, errMsg, isValid := isValidRoleRequest(c, constants.ActionUpdate)
		if !isValid {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", errMsg))
			return
		}
		data, errUc := allUseCases.Role.Update(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		content := hmodels.ResponseContent{Data: []interface{}{data}}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(&content))
	}
}

func deleteRole(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		bodyReq, errMsg, isValid := isValidRoleRequest(c, constants.ActionDelete)
		if !isValid {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", errMsg))
			return
		}
		errUc := allUseCases.Role.Delete(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(nil))
	}
}

func getByIdRole(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		var bodyReq struct {
			Id string `json:"id"`
		}
		if err := c.ShouldBindJSON(&bodyReq); err != nil {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{err.Error()}))
			return
		}
		data, errUc := allUseCases.Role.GetById(bodyReq.Id)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		content := hmodels.ResponseContent{Data: []interface{}{data}}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(&content))
	}
}

func searchRole(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		var searchReq hmodels.SearchRequest
		if err := c.ShouldBindJSON(&searchReq); err != nil {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{err.Error()}))
			return
		}
		data, errUc := allUseCases.Role.Search(searchReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(data))
	}
}

func isValidRoleRequest(ctx *gin.Context, actionType string) (models.RoleReq, []string, bool) {
	var errMsg []string
	valid := true

	username := ctx.GetHeader("user-username")
	if len(username) == 0 {
		errMsg = append(errMsg, "header user-username not set.")
	}

	var bodyRequest models.RoleReq
	if err := ctx.ShouldBindJSON(&bodyRequest); err != nil {
		return bodyRequest, append(errMsg, err.Error()), false
	}

	if actionType == constants.ActionAdd {
		if len(bodyRequest.Code) == 0 {
			errMsg = append(errMsg, "body.code is required.")
		}
		if len(bodyRequest.Name) == 0 {
			errMsg = append(errMsg, "body.name is required.")
		}
		bodyRequest.CreatedBy = username
		bodyRequest.UpdatedBy = username
	}
	if actionType == constants.ActionUpdate {
		if len(bodyRequest.Id) == 0 {
			errMsg = append(errMsg, "body.id is required.")
		}
		if len(bodyRequest.Name) == 0 {
			errMsg = append(errMsg, "body.name is required.")
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
