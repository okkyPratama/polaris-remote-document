package grpc

import (
	"context"
	"encoding/binary"
	"net/http"

	"bitbucket.org/log-tech/helper-go/hgrpc"
	"bitbucket.org/log-tech/helper-go/hgrpc/proto"
	"bitbucket.org/log-tech/helper-go/hlogger"
	"bitbucket.org/log-tech/helper-go/hmodels"
	"bitbucket.org/log-tech/helper-go/hutils"
	"bitbucket.org/log-tech/polaris-smart-access-service/usecases"
)

// REQ-011 section 5.11 & 5.12 — gRPC endpoints for permission resolution
// Called by polaris-access-gate (Lua → gRPC fallback) and other services

const (
	PermissionResolveMethod    = "resolvePermissions"
	PermissionCheckMethod      = "checkPermission"
	PermissionInvalidateMethod = "invalidateUserPermissions"
)

type permissionResolveResp struct {
	Permissions []string `json:"permissions"`
	Roles       []string `json:"roles"`
	RoleVersion int64    `json:"roleVersion"`
}

type permissionCheckResp struct {
	Allowed bool `json:"allowed"`
}

// NewGrpcPermissionService — registers gRPC permission service (REQ-011)
func NewGrpcPermissionService(allUseCases *usecases.AllUseCasesImpl) *hgrpc.DynamicService {
	svc := hgrpc.NewService("bitbucket.org.log_tech.polaris_smart_access_service.PermissionService")

	// REQ-011 section 5.11 — Resolve effective permissions
	svc.RegisterMethod(PermissionResolveMethod, func(ctx context.Context, param *proto.ParamRequest) (*proto.ParamResponse, error) {
		return handlePermissionResolve(allUseCases, param)
	})

	// REQ-011 section 5.12 — Real-time permission check
	svc.RegisterMethod(PermissionCheckMethod, func(ctx context.Context, param *proto.ParamRequest) (*proto.ParamResponse, error) {
		return handlePermissionCheck(allUseCases, param)
	})

	// Cache invalidation — called when role/permission changes
	svc.RegisterMethod(PermissionInvalidateMethod, func(ctx context.Context, param *proto.ParamRequest) (*proto.ParamResponse, error) {
		return handlePermissionInvalidate(allUseCases, param)
	})

	return svc
}

// handlePermissionResolve — REQ-011 section 5.11
// Resolves effective permissions = union(role_permissions) + direct_user_permissions
// Caches result to Redis: polaris:permissions:{userId}:{warehouseId}
// Payload format: [2-byte userId length][userId][2-byte warehouseId length][warehouseId]
func handlePermissionResolve(allUseCases *usecases.AllUseCasesImpl, param *proto.ParamRequest) (*proto.ParamResponse, error) {
	if param == nil || param.GetPayload() == nil {
		return hutils.BuildGrpcResponseFailure(http.StatusBadRequest, -1, "Failed", []string{"Payload is required"})
	}

	payload := param.GetPayload()
	if len(payload) < 4 {
		return hutils.BuildGrpcResponseFailure(http.StatusBadRequest, -1, "Failed", []string{"Invalid payload format"})
	}

	// Parse userId (first 2 bytes = length, then string)
	userIdLen := binary.BigEndian.Uint16(payload[0:2])
	if len(payload) < int(userIdLen)+2 {
		return hutils.BuildGrpcResponseFailure(http.StatusBadRequest, -1, "Failed", []string{"Invalid userId"})
	}
	userId := string(payload[2 : 2+userIdLen])

	// Parse warehouseId (next 2 bytes = length, then string)
	offset := 2 + userIdLen
	if len(payload) < int(offset)+2 {
		return hutils.BuildGrpcResponseFailure(http.StatusBadRequest, -1, "Failed", []string{"Invalid warehouseId"})
	}
	warehouseIdLen := binary.BigEndian.Uint16(payload[offset : offset+2])
	if len(payload) < int(offset+2+warehouseIdLen) {
		return hutils.BuildGrpcResponseFailure(http.StatusBadRequest, -1, "Failed", []string{"Invalid warehouseId"})
	}
	warehouseId := string(payload[offset+2 : offset+2+warehouseIdLen])

	if userId == "" {
		return hutils.BuildGrpcResponseFailure(http.StatusBadRequest, -1, "Failed", []string{"userId is required"})
	}

	hlogger.Log.Debugf("PermissionService.resolvePermissions userId=%s warehouseId=%s", userId, warehouseId)

	permissions, roles, roleVersion, errUc := allUseCases.Resolve.ResolvePermissions(userId, warehouseId)
	if errUc != nil {
		return hutils.BuildGrpcResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage)
	}

	// Populate to Redis async
	go allUseCases.Resolve.PopulatePermissionsToRedis(userId, warehouseId, permissions)

	resp := &permissionResolveResp{
		Permissions: permissions,
		Roles:       roles,
		RoleVersion: roleVersion,
	}
	content := &hmodels.ResponseContent{Data: []interface{}{resp}}
	return hutils.BuildGrpcResponseSuccess(content)
}

// handlePermissionCheck — REQ-011 section 5.12
// Real-time permission check — used by access-gate as Redis fallback
// Payload format: [2-byte userId length][userId][2-byte warehouseId length][warehouseId][2-byte permissionKey length][permissionKey]
func handlePermissionCheck(allUseCases *usecases.AllUseCasesImpl, param *proto.ParamRequest) (*proto.ParamResponse, error) {
	if param == nil || param.GetPayload() == nil {
		return hutils.BuildGrpcResponseFailure(http.StatusBadRequest, -1, "Failed", []string{"Payload is required"})
	}

	payload := param.GetPayload()
	if len(payload) < 6 {
		return hutils.BuildGrpcResponseFailure(http.StatusBadRequest, -1, "Failed", []string{"Invalid payload format"})
	}

	// Parse userId
	userIdLen := binary.BigEndian.Uint16(payload[0:2])
	if len(payload) < int(userIdLen)+2 {
		return hutils.BuildGrpcResponseFailure(http.StatusBadRequest, -1, "Failed", []string{"Invalid userId"})
	}
	userId := string(payload[2 : 2+userIdLen])

	// Parse warehouseId
	offset := 2 + userIdLen
	if len(payload) < int(offset)+2 {
		return hutils.BuildGrpcResponseFailure(http.StatusBadRequest, -1, "Failed", []string{"Invalid warehouseId"})
	}
	warehouseIdLen := binary.BigEndian.Uint16(payload[offset : offset+2])
	if len(payload) < int(offset+2+warehouseIdLen) {
		return hutils.BuildGrpcResponseFailure(http.StatusBadRequest, -1, "Failed", []string{"Invalid warehouseId"})
	}
	warehouseId := string(payload[offset+2 : offset+2+warehouseIdLen])

	// Parse permissionKey
	offset2 := offset + 2 + warehouseIdLen
	if len(payload) < int(offset2)+2 {
		return hutils.BuildGrpcResponseFailure(http.StatusBadRequest, -1, "Failed", []string{"Invalid permissionKey"})
	}
	permKeyLen := binary.BigEndian.Uint16(payload[offset2 : offset2+2])
	if len(payload) < int(offset2+2+permKeyLen) {
		return hutils.BuildGrpcResponseFailure(http.StatusBadRequest, -1, "Failed", []string{"Invalid permissionKey"})
	}
	permissionKey := string(payload[offset2+2 : offset2+2+permKeyLen])

	if userId == "" || permissionKey == "" {
		return hutils.BuildGrpcResponseFailure(http.StatusBadRequest, -1, "Failed", []string{"userId and permissionKey are required"})
	}

	hlogger.Log.Debugf("PermissionService.checkPermission userId=%s permissionKey=%s", userId, permissionKey)

	permissions, _, _, errUc := allUseCases.Resolve.ResolvePermissions(userId, warehouseId)
	if errUc != nil {
		return hutils.BuildGrpcResponseFailure(errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage)
	}

	allowed := false
	for _, p := range permissions {
		if p == permissionKey {
			allowed = true
			break
		}
	}

	resp := &permissionCheckResp{Allowed: allowed}
	content := &hmodels.ResponseContent{Data: []interface{}{resp}}
	return hutils.BuildGrpcResponseSuccess(content)
}

// handlePermissionInvalidate — invalidate Redis cache for user (REQ-011 AC-11.11)
// Payload format: [2-byte userId length][userId]
func handlePermissionInvalidate(allUseCases *usecases.AllUseCasesImpl, param *proto.ParamRequest) (*proto.ParamResponse, error) {
	if param == nil || param.GetPayload() == nil {
		return hutils.BuildGrpcResponseFailure(http.StatusBadRequest, -1, "Failed", []string{"Payload is required"})
	}

	userId := parseByteSliceString(param.GetPayload())
	if userId == "" {
		return hutils.BuildGrpcResponseFailure(http.StatusBadRequest, -1, "Failed", []string{"userId is required"})
	}

	hlogger.Log.Infof("PermissionService.invalidateUserPermissions userId=%s", userId)
	allUseCases.Resolve.InvalidateUserCache(userId)
	allUseCases.Resolve.IncrementRoleVersion()

	content := &hmodels.ResponseContent{Data: []interface{}{map[string]bool{"success": true}}}
	return hutils.BuildGrpcResponseSuccess(content)
}
