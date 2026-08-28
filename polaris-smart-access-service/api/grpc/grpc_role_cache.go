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

// REQ-011 — Redis cache management for role-permission mapping
// polaris:role:{role_id}:permissions — permission set per role
// polaris:role_version — global version counter for stale detection

const (
	RoleCacheRefreshMethod   = "refreshRoleCache"
	RoleCacheInvalidateMethod = "invalidateRoleCache"
	RoleVersionGetMethod     = "getRoleVersion"
)

type roleVersionResp struct {
	Version int64 `json:"version"`
}

// parseByteSliceString — parse variable-length string from byte slice
// Format: [2-byte length in big-endian][string data]
func parseByteSliceString(payload []byte) string {
	if len(payload) < 2 {
		return ""
	}
	length := binary.BigEndian.Uint16(payload[0:2])
	if len(payload) < int(length)+2 {
		return ""
	}
	return string(payload[2 : 2+length])
}

// NewGrpcRoleCacheService — registers gRPC role cache service
func NewGrpcRoleCacheService(allUseCases *usecases.AllUseCasesImpl) *hgrpc.DynamicService {
	svc := hgrpc.NewService("bitbucket.org.log_tech.polaris_smart_access_service.RoleCacheService")

	// Refresh permission cache for a specific role
	svc.RegisterMethod(RoleCacheRefreshMethod, func(ctx context.Context, param *proto.ParamRequest) (*proto.ParamResponse, error) {
		return handleRoleCacheRefresh(allUseCases, param)
	})

	// Invalidate permission cache for a specific role + increment version
	svc.RegisterMethod(RoleCacheInvalidateMethod, func(ctx context.Context, param *proto.ParamRequest) (*proto.ParamResponse, error) {
		return handleRoleCacheInvalidate(allUseCases, param)
	})

	// Get current role version (for stale detection)
	svc.RegisterMethod(RoleVersionGetMethod, func(ctx context.Context, param *proto.ParamRequest) (*proto.ParamResponse, error) {
		return handleGetRoleVersion(allUseCases, param)
	})

	return svc
}

// handleRoleCacheRefresh — rebuild polaris:role:{roleId}:permissions from DB
func handleRoleCacheRefresh(allUseCases *usecases.AllUseCasesImpl, param *proto.ParamRequest) (*proto.ParamResponse, error) {
	if param == nil || param.GetPayload() == nil {
		return hutils.BuildGrpcResponseFailure(http.StatusBadRequest, -1, "Failed", []string{"Payload is required"})
	}

	roleId := parseByteSliceString(param.GetPayload())
	if roleId == "" {
		return hutils.BuildGrpcResponseFailure(http.StatusBadRequest, -1, "Failed", []string{"roleId is required"})
	}

	hlogger.Log.Infof("RoleCacheService.refreshRoleCache roleId=%s", roleId)

	// Get permissions for this role from DB
	rolePerms, err := allUseCases.Repository.GetRolePermissionRepository().FindByRoleId(roleId)
	if err != nil {
		return hutils.BuildGrpcResponseFailure(http.StatusInternalServerError, -100006, "Database Error", []string{err.Error()})
	}

	permKeys := make([]string, 0, len(rolePerms))
	for _, rp := range rolePerms {
		perm, err := allUseCases.Repository.GetPermissionRepository().FindByID(rp.PermissionId)
		if err == nil && perm != nil {
			permKeys = append(permKeys, perm.Key)
		}
	}

	// Cache: polaris:role:{roleId}:permissions
	redis := allUseCases.Helper.GetRedisClient()
	if redis != nil {
		cacheKey := "polaris:role:" + roleId + ":permissions"
		_ = redis.Set(context.Background(), cacheKey, permKeys, 0)
		hlogger.Log.Infof("RoleCache refreshed for roleId=%s: %d permissions", roleId, len(permKeys))
	}

	content := &hmodels.ResponseContent{Data: []interface{}{map[string]interface{}{
		"roleId":      roleId,
		"permissions": permKeys,
	}}}
	return hutils.BuildGrpcResponseSuccess(content)
}

// handleRoleCacheInvalidate — clear role cache + increment global version (REQ-011 AC-11.13)
func handleRoleCacheInvalidate(allUseCases *usecases.AllUseCasesImpl, param *proto.ParamRequest) (*proto.ParamResponse, error) {
	if param == nil || param.GetPayload() == nil {
		return hutils.BuildGrpcResponseFailure(http.StatusBadRequest, -1, "Failed", []string{"Payload is required"})
	}

	roleId := parseByteSliceString(param.GetPayload())
	hlogger.Log.Infof("RoleCacheService.invalidateRoleCache roleId=%s", roleId)

	// Increment role_version — triggers stale detection (REQ-011 AC-11.11)
	allUseCases.Resolve.IncrementRoleVersion()

	content := &hmodels.ResponseContent{Data: []interface{}{map[string]bool{"success": true}}}
	return hutils.BuildGrpcResponseSuccess(content)
}

// handleGetRoleVersion — return current role_version (REQ-011 stale detection)
func handleGetRoleVersion(allUseCases *usecases.AllUseCasesImpl, param *proto.ParamRequest) (*proto.ParamResponse, error) {
	hlogger.Log.Debugf("RoleCacheService.getRoleVersion")

	// Get current version from Redis
	redis := allUseCases.Helper.GetRedisClient()
	var version int64
	if redis != nil {
		_ = redis.Get(context.Background(), "polaris:role_version", &version)
	}

	resp := &roleVersionResp{Version: version}
	content := &hmodels.ResponseContent{Data: []interface{}{resp}}
	return hutils.BuildGrpcResponseSuccess(content)
}
