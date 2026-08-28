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

func RoleApiRestController(group *gin.RouterGroup, allUseCases *usecases.AllUseCasesImpl) {
	group.POST("/getAll", getAllRoleApi(allUseCases))
	group.POST("/detailById", getByIdRoleApi(allUseCases))
	group.POST("/save", addRoleApi(allUseCases))
	group.POST("/edit", updateRoleApi(allUseCases))
	group.POST("/delete", deleteRoleApi(allUseCases))
	group.POST("/toggleActive", toggleActiveRoleApi(allUseCases))
	group.POST("/search", searchRoleApi(allUseCases))
	// QA inspection endpoints - untuk melihat pemetaan role-ke-endpoint
	group.POST("/getByRoleName", getByRoleNameRoleApi(allUseCases))
	group.POST("/getRoleSummary", getRoleSummaryRoleApi(allUseCases))
}

func addRoleApi(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		bodyReq, errMsg, isValid := isValidRoleApiRequest(c, constants.ActionAdd)
		if !isValid {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", errMsg))
			return
		}

		errUc := allUseCases.RoleApi.Save(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}

		c.JSON(httpCode, hutils.BuildRestResponseSuccess(nil))
	}
}
func updateRoleApi(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		bodyReq, errMsg, isValid := isValidRoleApiRequest(c, constants.ActionUpdate)
		if !isValid {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", errMsg))
			return
		}
		errUc := allUseCases.RoleApi.Update(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}

		c.JSON(httpCode, hutils.BuildRestResponseSuccess(nil))
	}
}
func deleteRoleApi(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		var bodyReq models.DeleteRoleApiReq
		if err := c.ShouldBindJSON(&bodyReq); err != nil {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{"body.id is required"}))
			return
		}

		username := c.GetHeader("user-username")
		if username == "" {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{"header user-username not set"}))
			return
		}

		errUc := allUseCases.RoleApi.DeleteById(bodyReq.Id, username)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}

		c.JSON(httpCode, hutils.BuildRestResponseSuccess(nil))
	}
}
func getByIdRoleApi(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		var bodyReq models.GetByIdReq
		if err := c.ShouldBindJSON(&bodyReq); err != nil {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{"body.id is required"}))
			return
		}
		if bodyReq.Id == "" {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{"body.id is required"}))
			return
		}
		data, errUc := allUseCases.RoleApi.GetById(bodyReq.Id)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		content := hmodels.ResponseContent{Data: []interface{}{data}}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(&content))
	}
}

func searchRoleApi(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		bodyReq, errMsg, valid := isValidSearchRoleApiRequest(c)
		if !valid {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", errMsg))
			return
		}

		// SECURITY: Get user context from header (injected by access-gate)
		userId := c.GetHeader("X-User-Id")
		if userId == "" {
			errMsg = append(errMsg, "X-User-Id header missing (access-gate not configured)")
			c.JSON(http.StatusForbidden, hutils.BuildRestResponseFailure(http.StatusForbidden, -403, "Failed", errMsg))
			return
		}

		// SECURITY: Add owner filter to search request (enforce owner scoping)
		// Resolve user's owner context from session
		sessionToken := c.GetHeader("X-Session-Token")
		if sessionToken != "" {
			// Optional: resolve owner_ids from session for additional filtering
			// For now, rely on database-level owner filtering
		}

		resp, errUc := allUseCases.RoleApi.Search(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(resp))
	}
}
func isValidSearchRoleApiRequest(ctx *gin.Context) (hmodels.SearchRequest, []string, bool) {
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
func isValidRoleApiRequest(ctx *gin.Context, actionType string) (models.RoleApiReq, []string, bool) {
	var errMsg []string
	valid := true
	username := ctx.GetHeader("user-username")
	if len(username) == 0 {
		errMsg = append(errMsg, "header user-username not set.")
	}
	var bodyRequest models.RoleApiReq
	if err := ctx.ShouldBindJSON(&bodyRequest); err != nil {
		return bodyRequest, append(errMsg, err.Error()), false
	}
	if actionType == constants.ActionAdd {
		if len(bodyRequest.RoleName) == 0 {
			errMsg = append(errMsg, "body.roleName is required.")
		}
		if len(bodyRequest.HttpMethod) == 0 {
			errMsg = append(errMsg, "body.httpMethod is required.")
		}
		if len(bodyRequest.HttpEndpoint) == 0 {
			errMsg = append(errMsg, "body.httpEndpoint is required.")
		}
		bodyRequest.IsActive = true
		bodyRequest.CreatedBy = username
	}
	if actionType == constants.ActionUpdate {
		if len(bodyRequest.Id) == 0 {
			errMsg = append(errMsg, "body.id is required")
		}
		if len(bodyRequest.RoleName) == 0 {
			errMsg = append(errMsg, "body.roleName is required.")
		}
		if len(bodyRequest.HttpMethod) == 0 {
			errMsg = append(errMsg, "body.httpMethod is required.")
		}
		if len(bodyRequest.HttpEndpoint) == 0 {
			errMsg = append(errMsg, "body.httpEndpoint is required.")
		}
		bodyRequest.UpdatedBy = username
	}
	if actionType == constants.ActionDelete {
		if len(bodyRequest.Id) == 0 {
			errMsg = append(errMsg, "body.id is required")
		}
		if len(bodyRequest.RoleName) == 0 {
			errMsg = append(errMsg, "body.roleName is required.")
		}
		bodyRequest.DeletedBy = username
	}

	if len(errMsg) > 0 {
		valid = false
	}
	return bodyRequest, errMsg, valid
}

func getAllRoleApi(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		bodyReq, errMsg, valid := isValidSearchRoleApiRequest(c)
		if !valid {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", errMsg))
			return
		}

		resp, errUc := allUseCases.RoleApi.Search(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(resp))
	}
}

func toggleActiveRoleApi(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		var bodyReq models.ToggleActiveReq
		if err := c.ShouldBindJSON(&bodyReq); err != nil {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{err.Error()}))
			return
		}

		username := c.GetHeader("user-username")
		if username == "" {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{"header user-username not set"}))
			return
		}
		bodyReq.UpdatedBy = username

		errUc := allUseCases.RoleApi.ToggleActive(bodyReq)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}

		c.JSON(httpCode, hutils.BuildRestResponseSuccess(nil))
	}
}

// getByRoleNameRoleApi - Get all endpoint mappings for a specific role (QA inspection)
// Returns: List of all endpoints accessible by the specified role
func getByRoleNameRoleApi(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK
		var bodyReq models.GetByRoleNameReq
		if err := c.ShouldBindJSON(&bodyReq); err != nil {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{err.Error()}))
			return
		}

		if bodyReq.RoleName == "" {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{"body.roleName is required"}))
			return
		}

		data, errUc := allUseCases.RoleApi.GetByRoleName(bodyReq.RoleName)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}

		// Convert to interface array
		items := make([]interface{}, 0, len(data))
		for _, item := range data {
			items = append(items, item)
		}

		content := hmodels.ResponseContent{Data: items}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(&content))
	}
}

// getRoleSummaryRoleApi - Get summary of all roles with endpoint counts (QA inspection)
// Returns: Summary showing which roles have endpoint mappings configured
func getRoleSummaryRoleApi(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK

		data, errUc := allUseCases.RoleApi.GetRoleSummary()
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}

		content := hmodels.ResponseContent{Data: []interface{}{data}}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(&content))
	}
}
