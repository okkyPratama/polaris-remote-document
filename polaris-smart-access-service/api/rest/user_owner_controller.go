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

func UserOwnerRestController(group *gin.RouterGroup, allUseCases *usecases.AllUseCasesImpl) {
	group.POST("/getAll", getUserOwners(allUseCases))
	group.POST("/save", addUserOwner(allUseCases))
	group.POST("/delete", deleteUserOwner(allUseCases))
}

func addUserOwner(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		bodyReq, errMsg, isValid := isValidUserOwnerRequest(c, constants.ActionAdd)
		if !isValid {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", errMsg))
			return
		}

		errUc := allUseCases.UserOwner.Save(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}

		c.JSON(httpCode, hutils.BuildRestResponseSuccess(nil))
	}
}

func deleteUserOwner(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		bodyReq, errMsg, isValid := isValidUserOwnerRequest(c, constants.ActionDelete)
		if !isValid {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", errMsg))
			return
		}

		errUc := allUseCases.UserOwner.Delete(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}

		c.JSON(httpCode, hutils.BuildRestResponseSuccess(nil))
	}
}

func getUserOwners(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		var bodyReq struct {
			UserId string `json:"userId"`
		}
		if err := c.ShouldBindJSON(&bodyReq); err != nil {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{err.Error()}))
			return
		}

		data, errUc := allUseCases.UserOwner.GetByUserId(bodyReq.UserId)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}

		items := make([]interface{}, 0, len(data))
		for _, d := range data {
			items = append(items, d)
		}
		content := hmodels.ResponseContent{Data: items}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(&content))
	}
}

func isValidUserOwnerRequest(ctx *gin.Context, actionType string) (models.UserOwnerReq, []string, bool) {
	var errMsg []string
	valid := true

	username := ctx.GetHeader("user-username")
	if len(username) == 0 {
		errMsg = append(errMsg, "header user-username not set.")
	}

	var bodyRequest models.UserOwnerReq
	if err := ctx.ShouldBindJSON(&bodyRequest); err != nil {
		return bodyRequest, append(errMsg, err.Error()), false
	}

	if actionType == constants.ActionAdd {
		if bodyRequest.UserId == "" {
			errMsg = append(errMsg, "body.userId is required.")
		}
		if bodyRequest.OwnerId == "" {
			errMsg = append(errMsg, "body.ownerId is required.")
		}
		if bodyRequest.OwnerCode == "" {
			errMsg = append(errMsg, "body.ownerCode is required.")
		}
		if bodyRequest.OwnerName == "" {
			errMsg = append(errMsg, "body.ownerName is required.")
		}
		bodyRequest.CreatedBy = username
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
