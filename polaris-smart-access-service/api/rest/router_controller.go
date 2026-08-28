package rest

import (
	"bitbucket.org/log-tech/helper-go/hredis"
	"bitbucket.org/log-tech/helper-go/hrest"
	"bitbucket.org/log-tech/polaris-smart-access-service/usecases"
)

func RegisterRestController(srv *hrest.Server, allUseCases *usecases.AllUseCasesImpl, redisClient *hredis.Client) {

	// ============================================
	// PUBLIC ROUTES — No RBAC Required
	// ============================================

	// Health check
	health := srv.Group("/health")
	{
		HealthRestController(health, allUseCases)
	}

	// REQ-010: Auth & Session
	auth := srv.Group("/auth")
	{
		AuthRestController(auth, allUseCases)
	}
	sessions := srv.Group("/sessions")
	{
		SessionRestController(sessions, allUseCases)
	}

	// ============================================
	// ADMIN ROUTES — RBAC Enforced at Access-Gate
	// Secondary RBAC check via middleware (defense-in-depth)
	// Permission checks handled by polaris-access-gate primarily
	// Backend service validates permissions as secondary layer
	// ============================================

	// REQ-011: Permission Resolution — Called by Access-Gate
	resolve := srv.Group("/admin")
	{
		ResolveRestController(resolve, allUseCases)
	}

	// REQ-011: RBAC — Roles
	role := srv.Group("/admin/roles")
	{
		RoleRestController(role, allUseCases)
	}

	// REQ-011: API Endpoint Definitions — Role API
	roleAPI := srv.Group("/admin/role-apis")
	{
		RoleApiRestController(roleAPI, allUseCases)
	}

	// REQ-011: RBAC — Permissions
	permission := srv.Group("/admin/permissions")
	{
		PermissionRestController(permission, allUseCases)
	}

	// REQ-011: RBAC — Role-Permission mapping
	rolePermission := srv.Group("/admin/role-permissions")
	{
		RolePermissionRestController(rolePermission, allUseCases)
	}

	// REQ-011: RBAC — User-Role assignment
	userRole := srv.Group("/admin/user-roles")
	{
		UserRoleRestController(userRole, allUseCases)
	}

	// REQ-012: Multi-level Access Scoping — User-Warehouse
	userWarehouse := srv.Group("/admin/user-warehouses")
	{
		UserWarehouseRestController(userWarehouse, allUseCases)
	}

	// REQ-012/013: Owner Data Isolation — User-Owner
	userOwner := srv.Group("/admin/user-owners")
	{
		UserOwnerRestController(userOwner, allUseCases)
	}

	// REQ-014: User Provisioning
	users := srv.Group("/admin/users")
	{
		UserProvisioningRestController(users, allUseCases)
	}
}
