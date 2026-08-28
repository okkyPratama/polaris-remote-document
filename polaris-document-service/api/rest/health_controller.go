package rest

import (
	"net/http"

	"bitbucket.org/log-tech/polaris-document-service/usecases"
	"github.com/gin-gonic/gin"
)

func HealthRestController(group *gin.RouterGroup, allUseCases *usecases.AllUseCasesImpl) {
	group.GET("/check", check(allUseCases))
}

func check(allUseCases *usecases.AllUseCasesImpl) func(c *gin.Context) {
	return func(c *gin.Context) {
		c.String(http.StatusOK, "Server is healthy.")
	}
}
