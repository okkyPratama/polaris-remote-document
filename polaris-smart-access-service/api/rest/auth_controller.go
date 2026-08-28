package rest

import (
	"net/http"
	"strings"

	"bitbucket.org/log-tech/helper-go/hlogger"
	"bitbucket.org/log-tech/helper-go/hmodels"
	"bitbucket.org/log-tech/helper-go/hutils"
	"bitbucket.org/log-tech/polaris-smart-access-service/models"
	"bitbucket.org/log-tech/polaris-smart-access-service/usecases"
	"bitbucket.org/log-tech/polaris-smart-access-service/utils"
	"github.com/gin-gonic/gin"
)

func AuthRestController(group *gin.RouterGroup, allUseCases *usecases.AllUseCasesImpl) {
	group.POST("/session", loginHandler(allUseCases))
	group.POST("/logout", logoutHandler(allUseCases))
}

func SessionRestController(group *gin.RouterGroup, allUseCases *usecases.AllUseCasesImpl) {
	group.POST("/switchContext", switchContextHandler(allUseCases))
	group.POST("/current", currentSessionHandler(allUseCases))
}

func loginHandler(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, errMsg := parseKeycloakToken(c)
		if claims == nil {
			c.JSON(http.StatusUnauthorized, hutils.BuildRestResponseFailure(http.StatusUnauthorized, -1, "Failed", errMsg))
			return
		}
		ipAddress := c.ClientIP()
		userAgent := c.GetHeader("User-Agent")
		data, errUc := allUseCases.Auth.Login(*claims, ipAddress, userAgent)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		content := &hmodels.ResponseContent{Data: []interface{}{data}}
		c.JSON(http.StatusOK, hutils.BuildRestResponseSuccess(content))
	}
}

// validateXUserIdHeader — validate X-User-Id header matches session context (defense against header spoofing)
func validateXUserIdHeader(expectedUserId string) gin.HandlerFunc {
	return func(c *gin.Context) {
		xUserId := c.GetHeader("X-User-Id")
		if xUserId == "" {
			// If no X-User-Id header, skip validation (might be login endpoint)
			c.Next()
			return
		}

		if xUserId != expectedUserId {
			hlogger.Log.Warnf("Possible header spoofing attempt: X-User-Id=%s does not match session user=%s from token", xUserId, expectedUserId)
			c.JSON(http.StatusForbidden, hutils.BuildRestResponseFailure(http.StatusForbidden, -403, "Failed", []string{"Request context validation failed."}))
			c.Abort()
			return
		}
		c.Next()
	}
}

func logoutHandler(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		sessionToken := c.GetHeader("X-Session-Token")
		username := c.GetHeader("user-username")
		ipAddress := c.ClientIP()
		if sessionToken == "" {
			c.JSON(http.StatusUnauthorized, hutils.BuildRestResponseFailure(http.StatusUnauthorized, -1, "Failed", []string{"X-Session-Token header is required."}))
			return
		}
		errUc := allUseCases.Auth.Logout(sessionToken, username, ipAddress)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		c.JSON(http.StatusOK, hutils.BuildRestResponseSuccess(nil))
	}
}

func switchContextHandler(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		sessionToken := c.GetHeader("X-Session-Token")
		username := c.GetHeader("user-username")
		if sessionToken == "" {
			c.JSON(http.StatusUnauthorized, hutils.BuildRestResponseFailure(http.StatusUnauthorized, -1, "Failed", []string{"X-Session-Token header is required."}))
			return
		}
		var bodyReq models.SwitchContextReq
		if err := c.ShouldBindJSON(&bodyReq); err != nil {
			c.JSON(http.StatusBadRequest, hutils.BuildRestResponseFailure(http.StatusBadRequest, -1, "Failed", []string{err.Error()}))
			return
		}
		errUc := allUseCases.Auth.SwitchContext(sessionToken, bodyReq, username)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		c.JSON(http.StatusOK, hutils.BuildRestResponseSuccess(nil))
	}
}

func currentSessionHandler(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		sessionToken := c.GetHeader("X-Session-Token")
		if sessionToken == "" {
			c.JSON(http.StatusUnauthorized, hutils.BuildRestResponseFailure(http.StatusUnauthorized, -1, "Failed", []string{"X-Session-Token header is required."}))
			return
		}
		data, errUc := allUseCases.Auth.GetCurrentSession(sessionToken)
		if errUc != nil {
			c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
			return
		}
		content := &hmodels.ResponseContent{Data: []interface{}{data}}
		c.JSON(http.StatusOK, hutils.BuildRestResponseSuccess(content))
	}
}

func parseKeycloakToken(c *gin.Context) (*models.KeycloakTokenClaims, []string) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return nil, []string{"Authorization header is required."}
	}
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return nil, []string{"Invalid Authorization header format. Expected: Bearer <token>"}
	}
	token := parts[1]

	// Verify JWT signature via Keycloak JWKS
	verifier := utils.GetJWKSVerifier()
	claimsMap, err := verifier.VerifyToken(token)
	if err != nil {
		hlogger.Log.Warnf("JWT verification failed: %v", err)
		return nil, []string{"Invalid or expired token."}
	}

	// Map claims to struct
	claims := &models.KeycloakTokenClaims{}
	if sub, ok := claimsMap["sub"].(string); ok {
		claims.Sub = sub
	}
	if username, ok := claimsMap["preferred_username"].(string); ok {
		claims.PreferredUsername = username
	}
	if email, ok := claimsMap["email"].(string); ok {
		claims.Email = email
	}
	if name, ok := claimsMap["name"].(string); ok {
		claims.Name = name
	}

	if claims.Sub == "" {
		return nil, []string{"Token missing subject (sub) claim."}
	}
	return claims, nil
}
