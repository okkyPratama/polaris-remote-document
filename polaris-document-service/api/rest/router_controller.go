package rest

import (
	"bitbucket.org/log-tech/helper-go/hrest"
	"bitbucket.org/log-tech/polaris-document-service/usecases"
)

func RegisterRestController(srv *hrest.Server, allUseCases *usecases.AllUseCasesImpl) {
	health := srv.Group("/health")
	{
		HealthRestController(health, allUseCases)
	}

	v1 := srv.Group("/api/v1")
	{
		templates := v1.Group("/templates")
		{
			TemplateRestController(templates, allUseCases)
		}
		templateAssignments := v1.Group("/template-assignments")
		{
			TemplateAssignmentRestController(templateAssignments, allUseCases)
		}
		pdf := v1.Group("/pdf")
		{
			CropRestController(pdf, allUseCases)
			ProxyRestController(pdf, allUseCases)
		}
	}
}
