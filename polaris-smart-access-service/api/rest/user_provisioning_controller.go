package rest

import (
	"io"
	"net/http"

	"bitbucket.org/log-tech/helper-go/hmodels"
	"bitbucket.org/log-tech/helper-go/hutils"
	"bitbucket.org/log-tech/polaris-smart-access-service/constants"
	"bitbucket.org/log-tech/polaris-smart-access-service/models"
	"bitbucket.org/log-tech/polaris-smart-access-service/usecases"
	"github.com/gin-gonic/gin"
)

func UserProvisioningRestController(group *gin.RouterGroup, allUseCases *usecases.AllUseCasesImpl) {
	group.POST("/getAll", getAllUsers(allUseCases))
	group.POST("/detailById", detailByIdUser(allUseCases))
	group.POST("/save", saveUser(allUseCases))
	group.POST("/edit", editUser(allUseCases))
	group.POST("/deactivate", deactivateUser(allUseCases))
	group.POST("/reactivate", reactivateUser(allUseCases))
	group.POST("/resetPassword", resetPasswordUser(allUseCases))
}

func saveUser(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		bodyReq, errMsg, isValid := isValidUserProvisioningRequest(c, constants.ActionAdd)
		if !isValid {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", errMsg))
			return
		}
		data, errUc := allUseCases.UserProvisioning.Save(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		content := &hmodels.ResponseContent{Data: []interface{}{data}}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(content))
	}
}

func editUser(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		bodyReq, errMsg, isValid := isValidUserProvisioningRequest(c, constants.ActionUpdate)
		if !isValid {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", errMsg))
			return
		}
		errUc := allUseCases.UserProvisioning.Update(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(nil))
	}
}

func deactivateUser(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		username := c.GetHeader("user-username")
		var bodyReq models.UserProvisioningReq
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
		bodyReq.UpdatedBy = username
		errUc := allUseCases.UserProvisioning.Deactivate(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(nil))
	}
}

func reactivateUser(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		username := c.GetHeader("user-username")
		var bodyReq models.UserProvisioningReq
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
		bodyReq.UpdatedBy = username
		errUc := allUseCases.UserProvisioning.Reactivate(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(nil))
	}
}

func getAllUsers(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		var searchReq hmodels.SearchRequest
		// Tolerate empty body (EOF) — treat as default search with paging defaults
		if err := c.ShouldBindJSON(&searchReq); err != nil && err != io.EOF {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{err.Error()}))
			return
		}

		data, errUc := allUseCases.UserProvisioning.GetAll(searchReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(data))
	}
}

func detailByIdUser(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		var bodyReq models.UserProvisioningReq
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
		data, errUc := allUseCases.UserProvisioning.GetById(bodyReq.Id)
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

func resetPasswordUser(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		var bodyReq models.UserProvisioningReq
		username := c.GetHeader("user-username")
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
		if bodyReq.Password == "" {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{"body.password is required."}))
			return
		}
		bodyReq.UpdatedBy = username
		errUc := allUseCases.UserProvisioning.ResetPassword(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(nil))
	}
}

func isValidUserProvisioningRequest(ctx *gin.Context, actionType string) (models.UserProvisioningReq, []string, bool) {
	var errMsg []string
	valid := true
	username := ctx.GetHeader("user-username")
	if username == "" {
		errMsg = append(errMsg, "header user-username not set.")
	}
	var bodyRequest models.UserProvisioningReq
	if err := ctx.ShouldBindJSON(&bodyRequest); err != nil {
		return bodyRequest, append(errMsg, err.Error()), false
	}
	if actionType == constants.ActionAdd {
		if bodyRequest.Username == "" {
			errMsg = append(errMsg, "body.username is required.")
		}
		if bodyRequest.Email == "" {
			errMsg = append(errMsg, "body.email is required.")
		}
		bodyRequest.CreatedBy = username
	}
	if actionType == constants.ActionUpdate {
		if bodyRequest.Id == "" {
			errMsg = append(errMsg, "body.id is required.")
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
