package rest

import (
	"net/http"

	"bitbucket.org/log-tech/helper-go/hlogger"
	"bitbucket.org/log-tech/helper-go/hmodels"
	"bitbucket.org/log-tech/helper-go/hutils"
	"bitbucket.org/log-tech/polaris-smart-access-service/usecases"
	"github.com/gin-gonic/gin"
)

// ResolveRestController — REST endpoint for permission resolution and session validation
// Used by polaris-access-gate to enforce RBAC at API Gateway level
// REQ-011 section 5.11 — Permission Resolution
func ResolveRestController(route *gin.RouterGroup, allUseCases *usecases.AllUseCasesImpl) {
	route.POST("/resolve-permissions", resolvePermissions(allUseCases))
	route.POST("/validate-session", validateSession(allUseCases))
}

// resolvePermissions — Resolve effective permissions for user
// Endpoint: POST /api/v1/admin/resolve-permissions
// Request: { "userId": "...", "warehouseId": "..." }
// Response: { "data": [{ "permissions": [...], "roles": [...], "roleVersion": 123 }] }
// Used by: polaris-access-gate for RBAC enforcement
func resolvePermissions(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK

		var bodyReq struct {
			UserID      string `json:"userId" binding:"required"`
			WarehouseID string `json:"warehouseId"`
		}

		if err := c.ShouldBindJSON(&bodyReq); err != nil {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{err.Error()}))
			return
		}

		if bodyReq.UserID == "" {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{"userId is required"}))
			return
		}

		hlogger.Log.Infof("ResolveRestController.resolvePermissions userId=%s warehouseId=%s", bodyReq.UserID, bodyReq.WarehouseID)

		permissions, roles, roleVersion, errUc := allUseCases.Resolve.ResolvePermissions(bodyReq.UserID, bodyReq.WarehouseID)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}

		// Populate to Redis async
		go allUseCases.Resolve.PopulatePermissionsToRedis(bodyReq.UserID, bodyReq.WarehouseID, permissions)

		resp := map[string]interface{}{
			"permissions": permissions,
			"roles":       roles,
			"roleVersion": roleVersion,
		}

		content := &hmodels.ResponseContent{Data: []interface{}{resp}}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(content))
	}
}

// validateSession — Check if session is still active (not invalidated)
// Endpoint: POST /api/v1/admin/validate-session
// Request: { "sessionId": "...", "userId": "..." }
// Response: { "data": { "is_valid": true/false, "status": "ACTIVE"/"INVALIDATED" } }
// Used by: polaris-access-gate to check if user session was invalidated due to role change
func validateSession(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		httpCode := http.StatusOK

		var bodyReq struct {
			SessionID string `json:"sessionId" binding:"required"`
			UserID    string `json:"userId" binding:"required"`
		}

		if err := c.ShouldBindJSON(&bodyReq); err != nil {
			httpCode = http.StatusBadRequest
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", []string{err.Error()}))
			return
		}

		hlogger.Log.Debugf("ResolveRestController.validateSession sessionId=%s userId=%s", bodyReq.SessionID, bodyReq.UserID)

		// Get session from DB
		sessionRepo := allUseCases.Repository.GetSessionRepository()
		session, err := sessionRepo.FindByID(bodyReq.SessionID)
		if err != nil {
			httpCode = http.StatusInternalServerError
			c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -100006, "Database Error", []string{err.Error()}))
			return
		}

		// Determine session status
		isValid := true
		status := "ACTIVE"

		if session == nil {
			isValid = false
			status = "NOT_FOUND"
		} else if session.Status == "INVALIDATED" {
			isValid = false
			status = "INVALIDATED"
		} else if session.Status == "EXPIRED" {
			isValid = false
			status = "EXPIRED"
		}

		resp := map[string]interface{}{
			"is_valid": isValid,
			"status":   status,
		}

		content := &hmodels.ResponseContent{Data: []interface{}{resp}}
		c.JSON(httpCode, hutils.BuildRestResponseSuccess(content))
	}
}
