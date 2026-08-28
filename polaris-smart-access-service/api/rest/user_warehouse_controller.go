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

func UserWarehouseRestController(group *gin.RouterGroup, allUseCases *usecases.AllUseCasesImpl) {
	group.POST("/getAll", getUserWarehouses(allUseCases))
	group.POST("/detailById", getByIdUserWarehouse(allUseCases))
	group.POST("/save", addUserWarehouse(allUseCases))
	group.POST("/delete", deleteUserWarehouse(allUseCases))
}

func addUserWarehouse(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		bodyReq, errMsg, isValid := isValidUserWarehouseRequest(c, constants.ActionAdd)
		if !isValid {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", errMsg))
			return
		}
		errUc := allUseCases.UserWarehouse.Save(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(nil))
	}
}

func deleteUserWarehouse(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		bodyReq, errMsg, isValid := isValidUserWarehouseRequest(c, constants.ActionDelete)
		if !isValid {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", errMsg))
			return
		}
		errUc := allUseCases.UserWarehouse.Delete(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(nil))
	}
}

func getUserWarehouses(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
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
		data, errUc := allUseCases.UserWarehouse.GetByUserId(bodyReq.UserId)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		items := make([]interface{}, 0, len(data))
		for _, d := range data {
			items = append(items, d)
		}
		content := &hmodels.ResponseContent{Data: items}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(content))
	}
}

func getByIdUserWarehouse(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
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
		data, errUc := allUseCases.UserWarehouse.GetById(bodyReq.Id)
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

func isValidUserWarehouseRequest(ctx *gin.Context, actionType string) (models.UserWarehouseReq, []string, bool) {
	var errMsg []string
	valid := true

	username := ctx.GetHeader("user-username")
	if len(username) == 0 {
		errMsg = append(errMsg, "header user-username not set.")
	}

	var bodyRequest models.UserWarehouseReq
	if err := ctx.ShouldBindJSON(&bodyRequest); err != nil {
		return bodyRequest, append(errMsg, err.Error()), false
	}

	if actionType == constants.ActionAdd {
		if bodyRequest.UserId == "" {
			errMsg = append(errMsg, "body.userId is required.")
		}
		if len(bodyRequest.WarehouseIds) == 0 {
			errMsg = append(errMsg, "body.warehouseIds is required.")
		}
		bodyRequest.CreatedBy = username
	}
	if actionType == constants.ActionDelete {
		if bodyRequest.UserId == "" {
			errMsg = append(errMsg, "body.userId is required.")
		}
		if len(bodyRequest.WarehouseIds) == 0 {
			errMsg = append(errMsg, "body.warehouseIds is required.")
		}
		bodyRequest.DeletedBy = username
	}

	if len(errMsg) > 0 {
		valid = false
	}
	return bodyRequest, errMsg, valid
}
