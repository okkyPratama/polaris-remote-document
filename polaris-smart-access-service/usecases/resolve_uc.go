package usecases

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"bitbucket.org/log-tech/helper-go/hlogger"
	"bitbucket.org/log-tech/helper-go/hmodels"
	"bitbucket.org/log-tech/helper-go/hutils"
	"bitbucket.org/log-tech/polaris-smart-access-service/constants"
)

type ResolveUseCasesImpl struct {
	allUseCases *AllUseCasesImpl
}

func NewResolveUseCases(allUc *AllUseCasesImpl) *ResolveUseCasesImpl {
	return &ResolveUseCasesImpl{allUseCases: allUc}
}

// ResolvePermissions — resolve effective permissions for user in warehouse context
// DEPRECATED: This function resolves permissions from sa_r_role_permission (legacy feature-based permission)
// Now using endpoint-based permission via sa_r_role_api + access-gate Redis cache (polaris:api_permission:{role_code})
// Moved to auth_uc.resolveFeaturePermissions() — remove this method once frontend migration complete
func (uc *ResolveUseCasesImpl) ResolvePermissions(userId string, warehouseId string) ([]string, []string, int64, *hmodels.UseCasesError) {
	if userId == "" {
		return nil, nil, 0, hutils.BuildUseCasesError([]string{"userId is required."}, http.StatusBadRequest, -1, "Failed")
	}

	// 1. Get user's roles from sa_r_user_role
	userRoles, err := uc.allUseCases.Repository.GetUserRoleRepository().FindByUserId(userId)
	if err != nil {
		return nil, nil, 0, hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	// 2. Collect role IDs and get permissions per role
	permissionSet := make(map[string]bool)
	roleIds := make([]string, 0)

	for _, ur := range userRoles {
		roleIds = append(roleIds, ur.RoleId)
		// Get permissions for this role
		rolePerms, err := uc.allUseCases.Repository.GetRolePermissionRepository().FindByRoleId(ur.RoleId)
		if err != nil {
			hlogger.Log.Errorf("ResolvePermissions: error getting role permissions for %s: %v", ur.RoleId, err)
			continue
		}
		for _, rp := range rolePerms {
			// Resolve permission_id to permission key
			perm, err := uc.allUseCases.Repository.GetPermissionRepository().FindByID(rp.PermissionId)
			if err == nil && perm != nil {
				permissionSet[perm.Key] = true
			}
		}
	}

	// 4. Convert set to slice
	permissions := make([]string, 0, len(permissionSet))
	for p := range permissionSet {
		permissions = append(permissions, p)
	}

	// 5. Get role version (for stale detection)
	var roleVersion int64
	redis := uc.allUseCases.Helper.GetRedisClient()
	if redis != nil {
		var versionStr string
		err := redis.Get(context.Background(), constants.KeyCacheRoleVersion, &versionStr)
		if err == nil && versionStr != "" {
			json.Unmarshal([]byte(versionStr), &roleVersion)
		}
	}

	return permissions, roleIds, roleVersion, nil
}

// PopulateSessionToRedis — write session data to Redis for access-gate lookup with configurable TTL
func (uc *ResolveUseCasesImpl) PopulateSessionToRedis(sessionId string, userId string, username string, warehouseId string, ownerIds []string, roleSet []string) {
	ttl := time.Duration(uc.getSessionTimeoutMinutes()) * time.Minute
	uc.PopulateSessionToRedisWithTTL(sessionId, userId, username, warehouseId, ownerIds, roleSet, ttl)
}

// PopulateSessionToRedisWithTTL — write session data to Redis with configurable TTL (sliding)
// Session contains: userId, username, warehouseId, ownerIds, roleSet (role codes)
// Permission check in access-gate uses separate polaris:api_permission:{role_code} cache
func (uc *ResolveUseCasesImpl) PopulateSessionToRedisWithTTL(sessionId string, userId string, username string, warehouseId string, ownerIds []string, roleSet []string, ttl time.Duration) {
	redis := uc.allUseCases.Helper.GetRedisClient()
	if redis == nil {
		hlogger.Log.Warn("PopulateSessionToRedisWithTTL: Redis client is nil, skipping")
		return
	}

	sessionData, err := BuildSessionCachePayload(userId, username, warehouseId, ownerIds, roleSet)
	if err != nil {
		hlogger.Log.Errorf(
			"PopulateSessionToRedisWithTTL: invalid payload for session %s: %v — invalidating cache (fail-closed)",
			sessionId, err,
		)
		deleteSessionCache(context.Background(), redis, sessionId)
		return
	}

	sessionKey := "polaris:session:" + sessionId
	if err := redis.Set(context.Background(), sessionKey, sessionData, ttl); err != nil {
		hlogger.Log.Errorf("PopulateSessionToRedisWithTTL failed for session %s: %v — invalidating cache (fail-closed)", sessionId, err)
		deleteSessionCache(context.Background(), redis, sessionId)
		return
	}

	// Index session ID per user untuk bulk invalidation saat role berubah
	// polaris:user_sessions:{userId} = JSON array berisi session IDs
	uc.addSessionToUserIndex(context.Background(), userId, sessionId, ttl)
}

// addSessionToUserIndex — tambahkan sessionId ke index polaris:user_sessions:{userId}
func (uc *ResolveUseCasesImpl) addSessionToUserIndex(ctx context.Context, userId string, sessionId string, ttl time.Duration) {
	redis := uc.allUseCases.Helper.GetRedisClient()
	if redis == nil {
		return
	}

	userSessionsKey := "polaris:user_sessions:" + userId

	// Baca existing index
	var sessionIds []string
	_ = redis.Get(ctx, userSessionsKey, &sessionIds)

	// Tambahkan session baru jika belum ada
	for _, id := range sessionIds {
		if id == sessionId {
			return // Sudah ada, skip
		}
	}
	sessionIds = append(sessionIds, sessionId)

	// Simpan kembali dengan TTL yang sama
	if err := redis.Set(ctx, userSessionsKey, sessionIds, ttl); err != nil {
		hlogger.Log.Warnf("addSessionToUserIndex: failed to update index for user %s: %v", userId, err)
	}
}

// PopulatePermissionsToRedis — write resolved permissions to Redis with session TTL
// DEPRECATED: Now using polaris:api_permission:{role_code} cache (populated by RefreshApiPermissionCache)
// Remove once fully migrated to endpoint-based permission system
func (uc *ResolveUseCasesImpl) PopulatePermissionsToRedis(userId string, warehouseId string, permissions []string) {
	redis := uc.allUseCases.Helper.GetRedisClient()
	if redis == nil {
		hlogger.Log.Warn("PopulatePermissionsToRedis: Redis client is nil, skipping")
		return
	}

	var permKey string
	if warehouseId != "" {
		permKey = "polaris:permissions:" + userId + ":" + warehouseId
	} else {
		// Warehouse kosong - key tanpa trailing colon
		permKey = "polaris:permissions:" + userId
	}

	// Use default session TTL (24 hours) for consistency with session expiration
	sessionTTL := time.Duration(uc.getSessionTimeoutMinutes()) * time.Minute
	err := redis.Set(context.Background(), permKey, permissions, sessionTTL)
	if err != nil {
		hlogger.Log.Errorf("PopulatePermissionsToRedis failed for %s: %v", permKey, err)
	}
}

// PopulateScopeToRedis — write user scope to Redis with same TTL as session
func (uc *ResolveUseCasesImpl) PopulateScopeToRedis(userId string, warehouseIds []string, ownerIds []string) {
	redis := uc.allUseCases.Helper.GetRedisClient()
	if redis == nil {
		hlogger.Log.Warn("PopulateScopeToRedis: Redis client is nil, skipping")
		return
	}

	// Use default session TTL (24 hours) for consistency with session expiration
	sessionTTL := time.Duration(uc.getSessionTimeoutMinutes()) * time.Minute

	whKey := "polaris:scope:" + userId + ":warehouses"
	err := redis.Set(context.Background(), whKey, warehouseIds, sessionTTL)
	if err != nil {
		hlogger.Log.Errorf("PopulateScopeToRedis warehouses failed: %v", err)
	}

	ownerKey := "polaris:scope:" + userId + ":owners"
	err = redis.Set(context.Background(), ownerKey, ownerIds, sessionTTL)
	if err != nil {
		hlogger.Log.Errorf("PopulateScopeToRedis owners failed: %v", err)
	}
}

// InvalidateUserCache — clear all cached data for a user
// DEPRECATED: Empty implementation, no longer used
// Remove in next cleanup
func (uc *ResolveUseCasesImpl) InvalidateUserCache(userId string) {
	redis := uc.allUseCases.Helper.GetRedisClient()
	if redis == nil {
		return
	}
	// Note: Redis client may not support pattern delete directly
	// For now we invalidate known keys
	hlogger.Log.Infof("InvalidateUserCache for userId: %s", userId)
}

// IncrementRoleVersion — increment global role version counter
// DEPRECATED: Role versioning not used in endpoint-based permission system
// Remove once fully migrated to endpoint-based permissions
func (uc *ResolveUseCasesImpl) IncrementRoleVersion() {
	redis := uc.allUseCases.Helper.GetRedisClient()
	if redis == nil {
		return
	}

	var currentVersion int64
	err := redis.Get(context.Background(), constants.KeyCacheRoleVersion, &currentVersion)
	if err != nil {
		currentVersion = 0
	}
	currentVersion++
	err = redis.Set(context.Background(), constants.KeyCacheRoleVersion, currentVersion, 0)
	if err != nil {
		hlogger.Log.Errorf("IncrementRoleVersion failed: %v", err)
	}
}

// InvalidateAllUserSessions — invalidate semua active sessions user saat role berubah (S1-007 AC-1.2.9)
// Mengeset status session menjadi INVALIDATED di DB agar user harus login ulang
func (uc *ResolveUseCasesImpl) InvalidateAllUserSessions(userId string, updatedBy string) error {
	if userId == "" {
		return nil
	}

	// 1. Get semua active session dari DB
	sessions, err := uc.allUseCases.Repository.GetSessionRepository().FindActiveByUserId(userId)
	if err != nil {
		hlogger.Log.Errorf("InvalidateAllUserSessions: failed to find sessions for user %s: %v", userId, err)
		return err
	}

	if len(sessions) == 0 {
		hlogger.Log.Debugf("InvalidateAllUserSessions: no active sessions found for user %s", userId)
		return nil
	}

	// 2. Invalidate setiap session di DB
	for _, session := range sessions {
		err := uc.allUseCases.Repository.GetSessionRepository().Invalidate(session.Id, updatedBy)
		if err != nil {
			hlogger.Log.Errorf("InvalidateAllUserSessions: failed to invalidate session %s: %v", session.Id, err)
		} else {
			hlogger.Log.Infof("InvalidateAllUserSessions: session %s invalidated for user %s", session.Id, userId)
		}
	}

	// 3. Clear Redis session cache with Delete (fail-closed; do not Set nil)
	redis := uc.allUseCases.Helper.GetRedisClient()
	if redis == nil {
		hlogger.Log.Errorf("InvalidateAllUserSessions: Redis client is nil after DB invalidation for user %s", userId)
		return fmt.Errorf("InvalidateAllUserSessions: Redis client is nil")
	}
	if err := clearSessionCaches(context.Background(), redis, sessions); err != nil {
		hlogger.Log.Errorf("InvalidateAllUserSessions: Redis Delete failed for user %s: %v", userId, err)
		return err
	}

	// Hapus user sessions index
	userSessionsKey := "polaris:user_sessions:" + userId
	if err := redis.Delete(context.Background(), userSessionsKey); err != nil {
		hlogger.Log.Warnf("InvalidateAllUserSessions: failed to delete user sessions index for user %s: %v", userId, err)
	}

	hlogger.Log.Infof("InvalidateAllUserSessions: cleared Redis cache for %d sessions", len(sessions))

	hlogger.Log.Infof("InvalidateAllUserSessions: %d session(s) invalidated for user %s", len(sessions), userId)
	return nil
}

// getSessionTimeoutMinutes — get session timeout dari gRPC config service
// Cache ke Redis untuk penggunaan berikutnya dan access-gate
// Fallback ke SES_TIMEOUT_MIN env var jika gRPC error
// Default 30 minutes jika keduanya tidak ada
func (uc *ResolveUseCasesImpl) getSessionTimeoutMinutes() int {
	// Try to resolve config from master-data service via gRPC
	if uc.allUseCases.MasterdataConfigGrpc != nil {
		configResp, err := uc.allUseCases.MasterdataConfigGrpc.ResolveConfig("SES_TIMEOUT_MIN")
		if err == nil && configResp != nil && configResp.ResolvedValue != "" {
			timeout, parseErr := strconv.Atoi(configResp.ResolvedValue)
			if parseErr == nil && timeout > 0 {
				// Cache to Redis for subsequent calls and access-gate
				redis := uc.allUseCases.Helper.GetRedisClient()
				if redis != nil {
					ctx := context.Background()
					configKey := "polaris:config:SES_TIMEOUT_MIN"
					_ = redis.Set(ctx, configKey, configResp.ResolvedValue, 24*time.Hour)
				}
				return timeout
			}
		}
	}

	// Fallback: try Redis cache (dari login sebelumnya atau keycloak.lua yang set)
	redis := uc.allUseCases.Helper.GetRedisClient()
	if redis != nil {
		ctx := context.Background()
		configKey := "polaris:config:SES_TIMEOUT_MIN"
		var timeoutStr string
		err := redis.Get(ctx, configKey, &timeoutStr)
		if err == nil && timeoutStr != "" {
			timeout, parseErr := strconv.Atoi(timeoutStr)
			if parseErr == nil && timeout > 0 {
				return timeout
			}
		}
	}

	// Fallback ke environment variable
	timeoutStr := hutils.GetEnv("SES_TIMEOUT_MIN", "30")
	timeout, err := strconv.Atoi(timeoutStr)
	if err != nil || timeout <= 0 {
		return 30
	}
	return timeout
}
