package constants

const (
	KeySourceName         = "POLARIS"
	KeyConfigDbRedis      = "redis"
	KeyConfigDbLocalCache = "local_cache"
	KeyConfigDbRmqClient  = "rmq_client"
	KeyConfigDbLog        = "log"
	KeyConfigDbGeneral    = "general"
	KeyConfigDbGrpcServer = "grpc_server"
	KeyConfigDbRestServer = "rest_server"

	KeyCache                 = "POLARIS_SMART_ACCESS_SERVICE"
	KeyCacheUser             = KeyCache + "_USER"
	KeyCacheUserByUsername   = KeyCacheUser + ":USERNAME:"
	KeyCacheEmployee         = KeyCache + "_EMP"
	KeyCacheEmployeeId       = KeyCacheEmployee + ":ID:"
	KeyCacheEmployeeCode     = KeyCacheEmployee + ":CODE:"
	KeyCacheUserRole         = KeyCache + "_USER_ROLE"
	KeyCacheUserRoleId       = KeyCacheUserRole + ":ID:"
	KeyCacheRole             = KeyCache + "_ROLE"
	KeyCacheRoleId           = KeyCacheRole + ":ID:"
	KeyCacheRoleApi          = KeyCache + "_ROLE_API"
	KeyCacheRoleApiId        = KeyCacheRoleApi + ":ID:"
	KeyCacheRolePermission   = KeyCache + "_ROLE_PERMISSION"
	KeyCacheRolePermissionId = KeyCacheRolePermission + ":ID:"
	KeyCachePermission       = KeyCache + "_PERMISSION"
	KeyCachePermissionId     = KeyCachePermission + ":ID:"
	KeyCachePermissionName   = KeyCachePermission + ":NAME:"
	KeyCacheFlexParams       = KeyCache + "_FLEX_PARAMS"
	KeyCacheFlexParamsId     = KeyCacheFlexParams + ":ID:"
	KeyCacheRoleVersion      = "polaris:role_version"

	KeyCreate = "CREATE"
	KeyUpdate = "UPDATE"
	KeyDelete = "DELETE"

	ActionAdd    = "add"
	ActionDelete = "delete"
	ActionUpdate = "update"

	RepositorySortDirectionAsc  = "asc"
	RepositorySortDirectionDesc = "desc"
	RepositoryMaxLimitFind      = 1000

	// Session Management Constants (S1-004: Session timeout enforcement, REQ-014)
	SessionStatusActive      = "ACTIVE"
	SessionStatusInvalidated = "INVALIDATED"
	SessionTimeoutErrorCode  = -100007
	SessionTimeoutMessage    = "Session Timeout"
	SystemUserName           = "SYSTEM"
)

// Session Error Messages
var (
	SessionErrorMessages = map[string]string{
		"validation_failed":   "Failed to validate session.",
		"not_found":           "Session not found.",
		"expired_invalidated": "Session expired or invalidated.",
		"expired":             "Session has expired. Please login again.",
	}
	RepositoryOperatorString  = []string{"=", "!=", "like", "ilike", "len"}
	RepositoryOperatorNumber  = []string{"=", "!=", "<", "<=", ">", ">="}
	RepositoryOperatorBoolean = []string{"=", "!="}
	RepositoryOperatorDate    = []string{"=", "!=", "<", "<=", ">", ">="}
)
