package usecases

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"bitbucket.org/log-tech/helper-go/hlogger"
	"bitbucket.org/log-tech/polaris-smart-access-service/data-access/repository"
)

const sessionCacheKeyPrefix = "polaris:session:"

// SessionCacheKey returns the Redis key for an active user session.
func SessionCacheKey(sessionID string) string {
	return sessionCacheKeyPrefix + sessionID
}

// OwnerIDsFromUserOwners extracts owner IDs from active sa_r_user_owner rows.
// Empty input yields nil (Access Gate treats nil as unrestricted owner access).
func OwnerIDsFromUserOwners(owners []repository.UserOwner) []string {
	if len(owners) == 0 {
		return nil
	}
	ids := make([]string, 0, len(owners))
	for _, owner := range owners {
		ids = append(ids, owner.OwnerId)
	}
	return ids
}

// ParseSessionRoleSet parses the JSON role-set stored on sa_t_session.
// Invalid JSON returns an error so callers can fail-closed instead of wiping RBAC.
func ParseSessionRoleSet(roleSetJSON string) ([]string, error) {
	if roleSetJSON == "" {
		return []string{}, nil
	}
	var roleSet []string
	if err := json.Unmarshal([]byte(roleSetJSON), &roleSet); err != nil {
		return nil, fmt.Errorf("invalid session role_set JSON: %w", err)
	}
	if roleSet == nil {
		return []string{}, nil
	}
	return roleSet, nil
}

// RemainingSessionTTL returns the remaining Redis TTL for a DB session.
// ok=false when the session is already expired (do not rewrite Redis).
func RemainingSessionTTL(expiresAt, now time.Time) (time.Duration, bool) {
	if !expiresAt.After(now) {
		return 0, false
	}
	return expiresAt.Sub(now), true
}

// SessionEligibleForOwnerRewrite validates a DB session before Redis rewrite.
// Requires non-nil session, ACTIVE status, matching user ID, and non-expired expires_at.
func SessionEligibleForOwnerRewrite(session *repository.Session, expectedUserID string, now time.Time) (time.Duration, bool) {
	if session == nil {
		return 0, false
	}
	if session.Status != "ACTIVE" {
		return 0, false
	}
	if expectedUserID != "" && session.UserId != expectedUserID {
		return 0, false
	}
	return RemainingSessionTTL(session.ExpiresAt, now)
}

// OwnerIDSlicesEqual compares owner ID lists irrespective of order.
func OwnerIDSlicesEqual(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	counts := make(map[string]int, len(a))
	for _, id := range a {
		counts[id]++
	}
	for _, id := range b {
		counts[id]--
		if counts[id] < 0 {
			return false
		}
	}
	for _, n := range counts {
		if n != 0 {
			return false
		}
	}
	return true
}

// BuildSessionCachePayload builds the polaris:session:{id} Redis document.
// Username is required (trimmed); empty username must not produce a partial cache.
// Warehouse and role-set must be preserved from the existing session.
// ownerIDs may be nil (unrestricted); do not coerce nil to []string{}.
func BuildSessionCachePayload(userID, username, warehouseID string, ownerIDs, roleSet []string) (map[string]interface{}, error) {
	username = strings.TrimSpace(username)
	if username == "" {
		return nil, fmt.Errorf("session cache username is required")
	}
	if roleSet == nil {
		roleSet = []string{}
	}
	return map[string]interface{}{
		"userId":      userID,
		"username":    username,
		"warehouseId": warehouseID,
		"ownerIds":    ownerIDs,
		"roleSet":     roleSet,
	}, nil
}

type sessionCacheRedis interface {
	Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error
	Delete(ctx context.Context, key string) error
}

func deleteSessionCache(ctx context.Context, redis sessionCacheRedis, sessionID string) {
	if redis == nil || sessionID == "" {
		return
	}
	cacheKey := SessionCacheKey(sessionID)
	if err := redis.Delete(ctx, cacheKey); err != nil {
		hlogger.Log.Errorf("deleteSessionCache: failed to delete Redis key %s: %v", cacheKey, err)
	}
}

func invalidateSessionCaches(ctx context.Context, redis sessionCacheRedis, sessions []repository.Session) {
	_ = clearSessionCaches(ctx, redis, sessions)
}

// clearSessionCaches deletes Redis keys for the given sessions and returns the first Delete error.
func clearSessionCaches(ctx context.Context, redis sessionCacheRedis, sessions []repository.Session) error {
	if redis == nil {
		return fmt.Errorf("clearSessionCaches: Redis client is nil")
	}
	var firstErr error
	for _, session := range sessions {
		cacheKey := SessionCacheKey(session.Id)
		if err := redis.Delete(ctx, cacheKey); err != nil {
			hlogger.Log.Errorf("clearSessionCaches: failed to delete Redis key %s: %v", cacheKey, err)
			if firstErr == nil {
				firstErr = err
			}
		}
	}
	return firstErr
}

// writeSessionOwnerContext writes a session cache entry and fail-closes on error.
func writeSessionOwnerContext(
	ctx context.Context,
	redis sessionCacheRedis,
	sessionID string,
	payload map[string]interface{},
	ttl time.Duration,
) error {
	cacheKey := SessionCacheKey(sessionID)
	if err := redis.Set(ctx, cacheKey, payload, ttl); err != nil {
		hlogger.Log.Errorf(
			"writeSessionOwnerContext: Redis set failed for session %s: %v — invalidating cache (fail-closed)",
			sessionID, err,
		)
		deleteSessionCache(ctx, redis, sessionID)
		return err
	}
	return nil
}

// ownerSessionRefreshDeps isolates repository/redis/time for unit tests.
type ownerSessionRefreshDeps struct {
	findOwners   func(userID string) ([]repository.UserOwner, error)
	findSessions func(userID string) ([]repository.Session, error)
	findUser     func(userID string) (*repository.AuthUser, error)
	redis        sessionCacheRedis
	now          time.Time
}

// refreshOwnerContextForActiveSessions is the testable core of owner session sync.
func refreshOwnerContextForActiveSessions(userID string, deps ownerSessionRefreshDeps) error {
	if userID == "" {
		return nil
	}
	if deps.redis == nil {
		return fmt.Errorf("RefreshOwnerContextForActiveSessions: Redis client is nil")
	}
	if deps.now.IsZero() {
		deps.now = time.Now()
	}
	ctx := context.Background()

	sessions, sessErr := deps.findSessions(userID)
	owners, ownerErr := deps.findOwners(userID)

	if ownerErr != nil {
		hlogger.Log.Errorf(
			"RefreshOwnerContextForActiveSessions: FindByUserID failed for user %s: %v — fail-closed invalidating known session caches",
			userID, ownerErr,
		)
		if sessErr == nil {
			invalidateSessionCaches(ctx, deps.redis, sessions)
		}
		return ownerErr
	}
	if sessErr != nil {
		hlogger.Log.Errorf(
			"RefreshOwnerContextForActiveSessions: FindActiveByUserId failed for user %s: %v — cannot safely refresh; caller must fail-closed",
			userID, sessErr,
		)
		return sessErr
	}

	if deps.findUser == nil {
		invalidateSessionCaches(ctx, deps.redis, sessions)
		return fmt.Errorf("RefreshOwnerContextForActiveSessions: findUser is nil")
	}
	user, userErr := deps.findUser(userID)
	if userErr != nil {
		hlogger.Log.Errorf(
			"RefreshOwnerContextForActiveSessions: FindByID user failed for %s: %v — fail-closed invalidating session caches",
			userID, userErr,
		)
		invalidateSessionCaches(ctx, deps.redis, sessions)
		return userErr
	}
	username := ""
	if user != nil {
		username = strings.TrimSpace(user.Username)
	}
	if username == "" {
		err := fmt.Errorf("RefreshOwnerContextForActiveSessions: canonical username empty for user %s", userID)
		hlogger.Log.Errorf("%v — fail-closed invalidating session caches", err)
		invalidateSessionCaches(ctx, deps.redis, sessions)
		return err
	}

	ownerIDs := OwnerIDsFromUserOwners(owners)
	var firstErr error

	for _, session := range sessions {
		ttl, ok := RemainingSessionTTL(session.ExpiresAt, deps.now)
		if !ok {
			continue
		}

		roleSet, err := ParseSessionRoleSet(session.RoleSet)
		if err != nil {
			hlogger.Log.Errorf(
				"RefreshOwnerContextForActiveSessions: corrupt role_set on session %s: %v — invalidating cache (fail-closed)",
				session.Id, err,
			)
			deleteSessionCache(ctx, deps.redis, session.Id)
			if firstErr == nil {
				firstErr = err
			}
			continue
		}

		payload, err := BuildSessionCachePayload(session.UserId, username, session.WarehouseId, ownerIDs, roleSet)
		if err != nil {
			hlogger.Log.Errorf(
				"RefreshOwnerContextForActiveSessions: build payload failed for session %s: %v — invalidating cache (fail-closed)",
				session.Id, err,
			)
			deleteSessionCache(ctx, deps.redis, session.Id)
			if firstErr == nil {
				firstErr = err
			}
			continue
		}
		if err := writeSessionOwnerContext(ctx, deps.redis, session.Id, payload, ttl); err != nil {
			if firstErr == nil {
				firstErr = err
			}
		}
	}

	return firstErr
}

// RefreshOwnerContextForActiveSessions rewrites polaris:session:{id} for every
// non-expired ACTIVE session of the user with the latest owner IDs from DB.
// Warehouse and role-set on each session are preserved.
// Username is always loaded from sa_m_user (never preserved from Redis).
// On owner/session/user query failure it fail-closes by deleting known session caches when possible.
func (a *AllUseCasesImpl) RefreshOwnerContextForActiveSessions(userID string) error {
	if userID == "" || a == nil || a.Helper == nil || a.Repository == nil {
		return nil
	}

	redis := a.Helper.GetRedisClient()
	if redis == nil {
		hlogger.Log.Errorf("RefreshOwnerContextForActiveSessions: Redis client is nil for user %s", userID)
		return fmt.Errorf("RefreshOwnerContextForActiveSessions: Redis client is nil")
	}

	return refreshOwnerContextForActiveSessions(userID, ownerSessionRefreshDeps{
		findOwners: func(id string) ([]repository.UserOwner, error) {
			return a.Repository.GetUserOwnerRepository().FindByUserID(id)
		},
		findSessions: func(id string) ([]repository.Session, error) {
			return a.Repository.GetSessionRepository().FindActiveByUserId(id)
		},
		findUser: func(id string) (*repository.AuthUser, error) {
			return a.Repository.GetAuthUserRepository().FindByID(id)
		},
		redis: redis,
		now:   time.Now(),
	})
}
