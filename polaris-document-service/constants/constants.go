package constants

const (
	ActionAdd    = "add"
	ActionDelete = "delete"
	ActionUpdate = "update"

	RepositorySortDirectionAsc  = "asc"
	RepositorySortDirectionDesc = "desc"
	RepositoryMaxLimitFind      = 1000

	KeyCreate     = "CREATE"
	KeyUpdate     = "UPDATE"
	KeyDelete     = "DELETE"
	KeySourceName = "POLARIS"

	ModuleTemplate = "TEMPLATE"
)

var (
	RepositoryOperatorString  = []string{"=", "!=", "like", "ilike", "len"}
	RepositoryOperatorNumber  = []string{"=", "!=", "<", "<=", ">", ">="}
	RepositoryOperatorBoolean = []string{"=", "!="}
	RepositoryOperatorDate    = []string{"=", "!=", "<", "<=", ">", ">="}
)
