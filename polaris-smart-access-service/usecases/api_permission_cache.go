package usecases

import (
	"context"
	"encoding/json"
	"strconv"
	"time"

	"bitbucket.org/log-tech/helper-go/hlogger"
	"bitbucket.org/log-tech/helper-go/hutils"
	"bitbucket.org/log-tech/polaris-smart-access-service/data-access/repository"
)

const apiPermissionCacheKeyPrefix = "polaris:api_permission:"

// ApiPermissionCacheKey returns the Redis key Access Gate reads for a role code.
func ApiPermissionCacheKey(roleCode string) string {
	return apiPermissionCacheKeyPrefix + roleCode
}

// BuildApiPermissionEntries builds Access Gate cache values as METHOD:ENDPOINT.
// Rules:
//   - only is_active = true mappings
//   - preserve trailing/leading wildcards on HttpEndpoint (e.g. /uom/*)
//   - deduplicate identical METHOD:ENDPOINT pairs
//   - empty active set yields an empty slice (caller still writes [] to Redis)
func BuildApiPermissionEntries(roleApis []repository.RoleApi) []string {
	seen := make(map[string]struct{}, len(roleApis))
	entries := make([]string, 0, len(roleApis))

	for _, api := range roleApis {
		if !api.IsActive {
			continue
		}
		entry := api.HttpMethod + ":" + api.HttpEndpoint
		if _, exists := seen[entry]; exists {
			continue
		}
		seen[entry] = struct{}{}
		entries = append(entries, entry)
	}

	return entries
}

func (a *AllUseCasesImpl) apiPermissionSessionTTL() time.Duration {
	// Try to resolve config from master-data service via gRPC
	if a != nil && a.MasterdataConfigGrpc != nil {
		configResp, err := a.MasterdataConfigGrpc.ResolveConfig("SES_TIMEOUT_MIN")
		if err == nil && configResp != nil && configResp.ResolvedValue != "" {
			timeout, parseErr := strconv.Atoi(configResp.ResolvedValue)
			if parseErr == nil && timeout > 0 {
				// Cache to Redis for subsequent calls
				if a.Helper != nil {
					redis := a.Helper.GetRedisClient()
					if redis != nil {
						ctx := context.Background()
						_ = redis.Set(ctx, "polaris:config:SES_TIMEOUT_MIN", configResp.ResolvedValue, 24*time.Hour)
					}
				}
				return time.Duration(timeout) * time.Minute
			}
		}
	}

	// Fallback: try Redis cache
	if a != nil && a.Helper != nil {
		redis := a.Helper.GetRedisClient()
		if redis != nil {
			ctx := context.Background()
			configKey := "polaris:config:SES_TIMEOUT_MIN"
			var timeoutStr string
			err := redis.Get(ctx, configKey, &timeoutStr)
			if err == nil && timeoutStr != "" {
				timeout, parseErr := strconv.Atoi(timeoutStr)
				if parseErr == nil && timeout > 0 {
					return time.Duration(timeout) * time.Minute
				}
			}
		}
	}

	// Fallback to environment variable
	timeoutStr := hutils.GetEnv("SES_TIMEOUT_MIN", "30")
	timeout, err := strconv.Atoi(timeoutStr)
	if err != nil || timeout <= 0 {
		timeout = 30
	}
	return time.Duration(timeout) * time.Minute
}

// RefreshApiPermissionCache rebuilds polaris:api_permission:{roleCode} for each role.
// Always writes a JSON array (possibly empty) so Access Gate treats the role as known.
// Fail-closed: if DB read or Redis write fails, the role cache key is deleted so Access Gate
// denies with 403 instead of serving a stale permission set.
func (a *AllUseCasesImpl) RefreshApiPermissionCache(roleCodes []string, ttl time.Duration) {
	if a == nil || a.Helper == nil || a.Repository == nil {
		return
	}

	redis := a.Helper.GetRedisClient()
	if redis == nil {
		hlogger.Log.Warn("RefreshApiPermissionCache: Redis client is nil, skipping")
		return
	}
	if ttl <= 0 {
		ttl = a.apiPermissionSessionTTL()
	}

	ctx := context.Background()
	for _, roleCode := range roleCodes {
		if roleCode == "" {
			continue
		}

		cacheKey := ApiPermissionCacheKey(roleCode)

		roleApis, err := a.Repository.RoleApiRepository().FindByRoleName(roleCode)
		if err != nil {
			hlogger.Log.Errorf("RefreshApiPermissionCache: FindByRoleName failed for role code %s: %v — invalidating cache key %s (fail-closed)", roleCode, err, cacheKey)
			invalidateApiPermissionCache(ctx, redis, cacheKey, roleCode)
			continue
		}

		apiPermissions := BuildApiPermissionEntries(roleApis)
		permJSON, err := json.Marshal(apiPermissions)
		if err != nil {
			hlogger.Log.Errorf("RefreshApiPermissionCache: marshal failed for role code %s: %v — invalidating cache key %s (fail-closed)", roleCode, err, cacheKey)
			invalidateApiPermissionCache(ctx, redis, cacheKey, roleCode)
			continue
		}

		if err = redis.Set(ctx, cacheKey, permJSON, ttl); err != nil {
			hlogger.Log.Errorf("RefreshApiPermissionCache: failed to set Redis key %s for role code %s: %v — invalidating cache (fail-closed)", cacheKey, roleCode, err)
			invalidateApiPermissionCache(ctx, redis, cacheKey, roleCode)
		}
	}
}

func invalidateApiPermissionCache(ctx context.Context, redis interface {
	Delete(ctx context.Context, key string) error
}, cacheKey string, roleCode string) {
	if redis == nil {
		return
	}
	if err := redis.Delete(ctx, cacheKey); err != nil {
		hlogger.Log.Errorf("RefreshApiPermissionCache: failed to invalidate Redis key %s for role code %s after refresh failure: %v", cacheKey, roleCode, err)
	}
}

// RefreshApiPermissionCacheForRole refreshes a single role using the session TTL.
func (a *AllUseCasesImpl) RefreshApiPermissionCacheForRole(roleCode string) {
	if roleCode == "" {
		return
	}
	a.RefreshApiPermissionCache([]string{roleCode}, a.apiPermissionSessionTTL())
}
