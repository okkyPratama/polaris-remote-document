package middleware

import (
	"net/http"
	"time"

	"bitbucket.org/log-tech/helper-go/hlogger"
	"bitbucket.org/log-tech/helper-go/hutils"
	"bitbucket.org/log-tech/polaris-smart-access-service/constants"
	"bitbucket.org/log-tech/polaris-smart-access-service/usecases"
	"github.com/gin-gonic/gin"
)

// SessionTimeoutMiddleware — validates session expiry and enforces timeout
// Implements S1-004: Session timeout enforcement (#8795)
func SessionTimeoutMiddleware(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract session token from header
		// ← ADD THIS (verify middleware is called)
		hlogger.Log.Infof("DEBUG: SessionTimeoutMiddleware CALLED - path=%s, method=%s",
			c.Request.URL.Path, c.Request.Method)

		sessionToken := c.GetHeader("X-Session-Token")
		hlogger.Log.Infof("DEBUG: sessionToken from header = '%s'", sessionToken)

		if sessionToken == "" {
			hlogger.Log.Warnf("DEBUG: No session token, skip middleware")
			c.Next()
			return
		}

		// Get session dari database
		session, err := allUseCases.Repository.GetSessionRepository().FindByID(sessionToken)
		if err != nil {
			hlogger.Log.Errorf("SessionTimeoutMiddleware: FindByID error: %v", err)
			c.JSON(http.StatusUnauthorized, hutils.BuildRestResponseFailure(
				http.StatusUnauthorized,
				constants.SessionTimeoutErrorCode,
				constants.SessionTimeoutMessage,
				[]string{constants.SessionErrorMessages["validation_failed"]},
			))
			c.Abort()
			return
		}

		if session == nil {
			c.JSON(http.StatusUnauthorized, hutils.BuildRestResponseFailure(
				http.StatusUnauthorized,
				constants.SessionTimeoutErrorCode,
				constants.SessionTimeoutMessage,
				[]string{constants.SessionErrorMessages["not_found"]},
			))
			c.Abort()
			return
		}

		// Check session status
		if session.Status != constants.SessionStatusActive {
			c.JSON(http.StatusUnauthorized, hutils.BuildRestResponseFailure(
				http.StatusUnauthorized,
				constants.SessionTimeoutErrorCode,
				constants.SessionTimeoutMessage,
				[]string{constants.SessionErrorMessages["expired_invalidated"]},
			))
			c.Abort()
			return
		}

		hlogger.Log.Infof("DEBUG Middleware: session.ExpiresAt=%v, now=%v, expired=%v",
			session.ExpiresAt, time.Now(), time.Now().After(session.ExpiresAt))

		// ✅ CHECK SESSION EXPIRY (S1-004) — Main enforcement
		if time.Now().After(session.ExpiresAt) {
			// Auto-invalidate expired session
			_ = allUseCases.Repository.GetSessionRepository().Invalidate(sessionToken, constants.SystemUserName)

			hlogger.Log.Warnf("SessionTimeoutMiddleware: Session %s expired at %v", sessionToken, session.ExpiresAt)
			c.JSON(http.StatusUnauthorized, hutils.BuildRestResponseFailure(
				http.StatusUnauthorized,
				constants.SessionTimeoutErrorCode,
				constants.SessionTimeoutMessage,
				[]string{constants.SessionErrorMessages["expired"]},
			))
			c.Abort()
			return
		}

		// Update last activity timestamp
		_ = allUseCases.Repository.GetSessionRepository().UpdateLastActivity(sessionToken)

		// Store session info di context untuk dipakai di endpoint handler
		c.Set("session_id", sessionToken)
		c.Set("user_id", session.UserId)
		c.Set("warehouse_id", session.WarehouseId)

		c.Next()
	}
}
