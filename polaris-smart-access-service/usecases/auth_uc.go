package usecases

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"bitbucket.org/log-tech/helper-go/hlogger"
	"bitbucket.org/log-tech/helper-go/hmodels"
	"bitbucket.org/log-tech/helper-go/hutils"
	"bitbucket.org/log-tech/polaris-smart-access-service/constants"
	"bitbucket.org/log-tech/polaris-smart-access-service/data-access/repository"
	"bitbucket.org/log-tech/polaris-smart-access-service/models"
	"github.com/google/uuid"
)

type AuthUseCasesImpl struct {
	allUseCases *AllUseCasesImpl
}

func NewAuthUseCases(allUc *AllUseCasesImpl) *AuthUseCasesImpl {
	return &AuthUseCasesImpl{allUseCases: allUc}
}

func (uc *AuthUseCasesImpl) Login(claims models.KeycloakTokenClaims, ipAddress string, userAgent string) (*models.LoginResp, *hmodels.UseCasesError) {
	if claims.Sub == "" {
		return nil, hutils.BuildUseCasesError([]string{"Invalid token: missing subject."}, http.StatusUnauthorized, -1, "Failed")
	}

	// --- Rate Limiting Check (AC-10.6, AC-10.H5, AC-10.H6) ---
	username := claims.PreferredUsername
	uc.writeLoginAttempt(username, ipAddress, userAgent, false, "ATTEMPT")

	// Cek apakah user sudah ter-lock (AC-10.H5)
	existingUser, _ := uc.allUseCases.Repository.GetAuthUserRepository().FindByKeycloakId(claims.Sub)
	if existingUser != nil && existingUser.LockedUntil != nil {
		if time.Now().Before(*existingUser.LockedUntil) {
			uc.writeLoginEvent(claims.Sub, username, ipAddress, "LOGIN", false)
			uc.writeLoginAttempt(username, ipAddress, userAgent, false, "LOCKED")
			return nil, hutils.BuildUseCasesError(
				[]string{"Account is locked due to too many failed login attempts. Please try again later."},
				http.StatusTooManyRequests, -100008, "Account Locked.")
		}
		// Lock expired → auto unlock (reset counter + clear old attempts)
		_ = uc.allUseCases.Repository.GetAuthUserRepository().ResetFailedLogin(existingUser.Id)
		_ = uc.allUseCases.Repository.GetLoginAttemptRepository().ClearFailedAttempts(username)
	}

	// Cek failed attempts dalam window (AC-10.6)
	windowMin := uc.getRateLimitWindowMin()
	maxAttempts := uc.getMaxFailedAttempts()
	lockMin := uc.getLockDurationMin()

	failedCount, err := uc.allUseCases.Repository.GetLoginAttemptRepository().CountFailedInWindow(username, windowMin)
	if err != nil {
		hlogger.Log.Errorf("Login: count failed attempts error: %v", err)
	}
	if failedCount >= int64(maxAttempts) {
		// Lock account (AC-10.6)
		lockedUntil := time.Now().Add(time.Duration(lockMin) * time.Minute)
		if existingUser != nil {
			_ = uc.allUseCases.Repository.GetAuthUserRepository().IncrementFailedLogin(existingUser.Id, lockedUntil)
		}
		uc.writeLoginEvent(claims.Sub, username, ipAddress, "LOGIN", false)
		uc.writeLoginAttempt(username, ipAddress, userAgent, false, "EXCEEDED_LIMIT")
		return nil, hutils.BuildUseCasesError(
			[]string{
				fmt.Sprintf(
					"Too many failed login attempts. Account locked for %d minutes.",
					uc.getLockDurationMin(),
				),
			},
			http.StatusTooManyRequests,
			-100008,
			"Account Locked",
		)
	}

	// --- End Rate Limiting ---

	// Build full name from Keycloak claims (given_name + family_name), fallback to name claim
	fullName := strings.TrimSpace(strings.TrimSpace(claims.FirstName) + " " + strings.TrimSpace(claims.LastName))
	if fullName == "" {
		fullName = strings.TrimSpace(claims.Name)
	}

	userId, _ := uuid.NewV7()
	authUser := &repository.AuthUser{
		Id:         userId.String(),
		KeycloakId: claims.Sub,
		Username:   username,
		Email:      claims.Email,
		FullName:   fullName,
		Status:     "ACTIVE",
		CreatedBy:  username,
		UpdatedBy:  username,
	}

	savedUser, err := uc.allUseCases.Repository.GetAuthUserRepository().UpsertByKeycloakId(authUser)
	if err != nil {
		hlogger.Log.Errorf("Login: upsert user failed: %v", err)
		uc.writeLoginEvent(claims.Sub, username, ipAddress, "LOGIN", false)
		return nil, hutils.BuildUseCasesError([]string{"Failed to process user."}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	// Successful login → reset failed counter (AC-10.H6)
	_ = uc.allUseCases.Repository.GetAuthUserRepository().ResetFailedLogin(savedUser.Id)

	roleSet := uc.resolveRoleSet(savedUser.Id)

	sessionId, _ := uuid.NewV7()
	now := time.Now()
	sessionTimeoutMin := uc.getSessionTimeoutMinutes()
	expiresAt := now.Add(time.Duration(sessionTimeoutMin) * time.Minute)

	roleSetJson, _ := json.Marshal(roleSet)

	session := &repository.Session{
		Id:             sessionId.String(),
		UserId:         savedUser.Id,
		WarehouseId:    "",
		OwnerContextId: "",
		RoleSet:        string(roleSetJson),
		IpAddress:      ipAddress,
		UserAgent:      userAgent,
		Status:         "ACTIVE",
		ExpiresAt:      expiresAt,
		CreatedBy:      username,
		UpdatedBy:      username,
	}

	if err := uc.allUseCases.Repository.GetSessionRepository().Create(session); err != nil {
		hlogger.Log.Errorf("Login: create session failed: %v", err)
		uc.writeLoginEvent(claims.Sub, username, ipAddress, "LOGIN", false)
		return nil, hutils.BuildUseCasesError([]string{"Failed to create session."}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	uc.writeLoginEvent(claims.Sub, username, ipAddress, "LOGIN", true)
	uc.writeLoginAttempt(username, ipAddress, userAgent, true, "")

	// Resolve authorized warehouses
	warehouses := uc.resolveWarehouses(savedUser.Id)

	// Resolve owner scope
	ownerIds := uc.resolveOwnerIds(savedUser.Id)
	canonicalUsername := strings.TrimSpace(savedUser.Username)

	// Populate Redis cache synchronously so session.username is available before login returns.
	warehouseIds := make([]string, 0, len(warehouses))
	for _, w := range warehouses {
		warehouseIds = append(warehouseIds, w.Id)
	}
	sessionTTL := time.Duration(uc.getSessionTimeoutMinutes()) * time.Minute

	// Store session (username from sa_m_user — canonical after upsert)
	uc.allUseCases.Resolve.PopulateSessionToRedisWithTTL(sessionId.String(), savedUser.Id, canonicalUsername, "", ownerIds, roleSet, sessionTTL)
	uc.allUseCases.Resolve.PopulateScopeToRedis(savedUser.Id, warehouseIds, ownerIds)

	// Populate API permissions for each role (async for performance)
	go func() {
		defer func() {
			if r := recover(); r != nil {
				hlogger.Log.Errorf("Login async RefreshApiPermissionCache panic: %v", r)
			}
		}()
		uc.allUseCases.RefreshApiPermissionCache(roleSet, sessionTTL)
	}()

	resp := &models.LoginResp{
		SessionToken: sessionId.String(),
		UserId:       savedUser.Id,
		Warehouses:   warehouses,
	}

	uc.allUseCases.SendAuditTrail(claims.PreferredUsername, now, constants.KeyCreate, "Session", nil, resp)
	return resp, nil
}

func (uc *AuthUseCasesImpl) SwitchContext(sessionId string, req models.SwitchContextReq, username string) *hmodels.UseCasesError {
	if sessionId == "" {
		return hutils.BuildUseCasesError([]string{"Session token required."}, http.StatusUnauthorized, -1, "Failed")
	}
	if req.WarehouseId == "" {
		return hutils.BuildUseCasesError([]string{"body.warehouseId is required."}, http.StatusBadRequest, -1, "Failed")
	}

	session, err := uc.allUseCases.Repository.GetSessionRepository().FindByID(sessionId)
	if err != nil || session == nil {
		return hutils.BuildUseCasesError([]string{"Session not found or expired."}, http.StatusUnauthorized, -1, "Failed")
	}
	if session.Status != "ACTIVE" {
		return hutils.BuildUseCasesError([]string{"Session is not active."}, http.StatusUnauthorized, -1, "Failed")
	}

	// Validate user has access to this warehouse
	userWarehouse, err := uc.allUseCases.Repository.GetUserWarehouseRepository().FindByUserAndWarehouse(session.UserId, req.WarehouseId)
	if err != nil {
		return hutils.BuildUseCasesError([]string{"Failed to validate warehouse access."}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if userWarehouse == nil {
		return hutils.BuildUseCasesError([]string{"User does not have access to this warehouse."}, http.StatusForbidden, -1, "Failed")
	}

	// AC-15.5: Check warehouse status via gRPC - block new switches to deactivated warehouses
	warehouseMap, err := uc.allUseCases.MasterdataWarehouseGrpc.GetWarehousesByIds([]string{req.WarehouseId})
	if err != nil {
		hlogger.Log.Errorf("SwitchContext: GetWarehousesByIds gRPC call failed: %v", err)
		// Fallback: allow switch without status check if gRPC fails
	} else if len(warehouseMap) > 0 {
		if whDetail, exists := warehouseMap[req.WarehouseId]; exists && whDetail.Status != "ACTIVE" {
			return hutils.BuildUseCasesError(
				[]string{"Target warehouse is deactivated. Cannot switch context."},
				http.StatusForbidden, -1, "Failed")
		}
	}

	// Canonical username from sa_m_user — never trust request header / Redis for audit actor.
	sessionUser, userErr := uc.allUseCases.Repository.GetAuthUserRepository().FindByID(session.UserId)
	if userErr != nil {
		hlogger.Log.Errorf("SwitchContext: FindByID user failed for %s: %v", session.UserId, userErr)
		return hutils.BuildUseCasesError([]string{"Failed to resolve user for session cache."}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	canonicalUsername := ""
	if sessionUser != nil {
		canonicalUsername = strings.TrimSpace(sessionUser.Username)
	}
	if canonicalUsername == "" {
		hlogger.Log.Errorf("SwitchContext: canonical username empty for user %s", session.UserId)
		return hutils.BuildUseCasesError([]string{"Failed to resolve user for session cache."}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	err = uc.allUseCases.Repository.GetSessionRepository().UpdateWarehouseContext(sessionId, req.WarehouseId, req.OwnerContextId, username)
	if err != nil {
		return hutils.BuildUseCasesError([]string{"Failed to switch context."}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	// Re-resolve and re-populate Redis for new warehouse context
	go func() {
		defer func() {
			if r := recover(); r != nil {
				hlogger.Log.Errorf("SwitchContext async panic: %v", r)
			}
		}()
		ownerIds := uc.resolveOwnerIds(session.UserId)
		roleSet := uc.resolveRoleSet(session.UserId)
		sessionTTL := time.Duration(uc.getSessionTimeoutMinutes()) * time.Minute

		// Update session in Redis with new warehouse context (username from DB)
		uc.allUseCases.Resolve.PopulateSessionToRedisWithTTL(sessionId, session.UserId, canonicalUsername, req.WarehouseId, ownerIds, roleSet, sessionTTL)

		// Re-populate API permissions (in case role changed)
		uc.allUseCases.RefreshApiPermissionCache(roleSet, sessionTTL)
	}()

	return nil
}

func (uc *AuthUseCasesImpl) GetCurrentSession(sessionId string) (*models.SessionResp, *hmodels.UseCasesError) {
	if sessionId == "" {
		return nil, hutils.BuildUseCasesError([]string{"Session token required."}, http.StatusUnauthorized, -1, "Failed")
	}

	// FAST PATH: Lookup Redis dulu (session dari login sudah ada di Redis)
	// Key: polaris:session:{sessionId}
	sessionData, err := uc.getSessionFromRedis(sessionId)
	if err != nil {
		hlogger.Log.Warnf("GetCurrentSession: Redis lookup error: %v", err)
		// Fallback ke DB jika Redis error
	}

	var userId string
	var warehouse string
	var ownerIds []string
	var roleSet []string
	var expiresAt time.Time

	if sessionData != nil {
		// Session ditemukan di Redis (dari login fresh)
		userId = sessionData.UserId
		warehouse = sessionData.WarehouseId
		ownerIds = sessionData.OwnerIds
		roleSet = sessionData.RoleSet

		// Get actual expiresAt from DB, not estimated
		dbSession, dbErr := uc.allUseCases.Repository.GetSessionRepository().FindByID(sessionId)
		if dbErr != nil || dbSession == nil {
			hlogger.Log.Warnf("GetCurrentSession: Redis hit but DB session not found, invalidating cache")
			if redis := uc.allUseCases.Helper.GetRedisClient(); redis != nil {
				deleteSessionCache(context.Background(), redis, sessionId)
			}
			return nil, hutils.BuildUseCasesError([]string{"Session not found or expired."}, http.StatusUnauthorized, -1, "Failed")
		}
		if dbSession.Status != "ACTIVE" {
			return nil, hutils.BuildUseCasesError([]string{"Session expired or invalidated."}, http.StatusUnauthorized, -1, "Failed")
		}
		expiresAt = dbSession.ExpiresAt

		// Canonical username from DB — never preserve stale Redis username.
		user, userErr := uc.allUseCases.Repository.GetAuthUserRepository().FindByID(userId)
		if userErr != nil || user == nil || strings.TrimSpace(user.Username) == "" {
			hlogger.Log.Errorf("GetCurrentSession: canonical username lookup failed for user %s: err=%v — invalidating session cache (fail-closed)", userId, userErr)
			if redis := uc.allUseCases.Helper.GetRedisClient(); redis != nil {
				deleteSessionCache(context.Background(), redis, sessionId)
			}
			return nil, hutils.BuildUseCasesError([]string{"Failed to resolve user for session cache."}, http.StatusInternalServerError, -100006, "Database Error.")
		}
		username := strings.TrimSpace(user.Username)

		// Self-heal stale ownerIds / missing username: Redis fast path can lag behind mutations.
		// DB errors must not be treated as unrestricted (nil ownerIds).
		dbOwnerIds, ownerErr := uc.loadOwnerIds(userId)
		if ownerErr != nil {
			hlogger.Log.Errorf("GetCurrentSession: loadOwnerIds failed for user %s: %v — invalidating session cache (fail-closed)", userId, ownerErr)
			if redis := uc.allUseCases.Helper.GetRedisClient(); redis != nil {
				deleteSessionCache(context.Background(), redis, sessionId)
			}
			return nil, hutils.BuildUseCasesError([]string{"Failed to resolve owner scope."}, http.StatusInternalServerError, -100006, "Database Error.")
		}
		needHeal := !OwnerIDSlicesEqual(ownerIds, dbOwnerIds) || strings.TrimSpace(sessionData.Username) != username
		if needHeal {
			ownerIds = dbOwnerIds
			uc.healSessionOwnerCache(sessionId, userId, username, warehouse, roleSet, dbOwnerIds)
		}

		// Resolve roles from role set
		roles := []models.UserProvRoleResp{}
		for _, roleCode := range roleSet {
			role, _ := uc.allUseCases.Repository.GetRoleRepository().FindByCode(roleCode)
			if role != nil && role.Status == "ACTIVE" {
				roles = append(roles, models.UserProvRoleResp{
					Id:       role.Id,
					Code:     role.Code,
					Name:     role.Name,
					IsSystem: role.IsSystem,
				})
			}
		}

		availableEndpoints := uc.resolveAvailableEndpoints(roleSet)
		permissions := uc.resolveFeaturePermissions(roleSet)

		return &models.SessionResp{
			UserId:             userId,
			Username:           username,
			CurrentWarehouseId: warehouse,
			OwnerContextIds:    ownerIds,
			Roles:              roles,
			Permissions:        permissions,
			AvailableEndpoints: availableEndpoints,
			ExpiresAt:          expiresAt,
		}, nil
	}

	// Fallback: Lookup database
	dbSession, dbErr := uc.allUseCases.Repository.GetSessionRepository().FindByID(sessionId)
	if dbErr != nil || dbSession == nil {
		return nil, hutils.BuildUseCasesError([]string{"Session not found or expired."}, http.StatusUnauthorized, -1, "Failed")
	}
	if dbSession.Status != "ACTIVE" {
		return nil, hutils.BuildUseCasesError([]string{"Session expired or invalidated."}, http.StatusUnauthorized, -1, "Failed")
	}
	userId = dbSession.UserId
	warehouse = dbSession.WarehouseId
	expiresAt = dbSession.ExpiresAt

	// Parse role set from JSON
	if dbSession.RoleSet != "" {
		_ = json.Unmarshal([]byte(dbSession.RoleSet), &roleSet)
	}

	// Resolve owner IDs dari DB — fail closed on DB error (nil != unrestricted here)
	var ownerErr error
	ownerIds, ownerErr = uc.loadOwnerIds(userId)
	if ownerErr != nil {
		hlogger.Log.Errorf("GetCurrentSession: loadOwnerIds failed for user %s on DB fallback: %v", userId, ownerErr)
		return nil, hutils.BuildUseCasesError([]string{"Failed to resolve owner scope."}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	// Canonical username from DB — required so Redis rebuild can feed Access Gate.
	user, userErr := uc.allUseCases.Repository.GetAuthUserRepository().FindByID(userId)
	if userErr != nil || user == nil || strings.TrimSpace(user.Username) == "" {
		hlogger.Log.Errorf("GetCurrentSession: canonical username lookup failed for user %s on DB fallback: err=%v", userId, userErr)
		return nil, hutils.BuildUseCasesError([]string{"Failed to resolve user for session cache."}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	username := strings.TrimSpace(user.Username)

	// Rebuild Redis synchronously so subsequent gated requests see session.username.
	uc.healSessionOwnerCache(sessionId, userId, username, warehouse, roleSet, ownerIds)

	// Resolve roles from role set
	roles := []models.UserProvRoleResp{}
	for _, roleCode := range roleSet {
		role, _ := uc.allUseCases.Repository.GetRoleRepository().FindByCode(roleCode)
		if role != nil && role.Status == "ACTIVE" {
			roles = append(roles, models.UserProvRoleResp{
				Id:       role.Id,
				Code:     role.Code,
				Name:     role.Name,
				IsSystem: role.IsSystem,
			})
		}
	}

	// Resolve available endpoints (endpoint-based permission) for FE UI control
	availableEndpoints := uc.resolveAvailableEndpoints(roleSet)

	// Resolve feature-based permissions (legacy, for FE menu control)
	// From sa_r_role_permission table via user's assigned roles
	permissions := uc.resolveFeaturePermissions(roleSet)

	// Return session response
	return &models.SessionResp{
		UserId:             userId,
		Username:           username,
		CurrentWarehouseId: warehouse,
		OwnerContextIds:    ownerIds,
		Roles:              roles,
		Permissions:        permissions, // Feature-based permissions for FE
		AvailableEndpoints: availableEndpoints,
		ExpiresAt:          expiresAt,
	}, nil
}

// getSessionFromRedis — fetch session from Redis cache (polaris:session:{sessionId})
func (uc *AuthUseCasesImpl) getSessionFromRedis(sessionId string) (*models.SessionDataCached, error) {
	redis := uc.allUseCases.Helper.GetRedisClient()
	if redis == nil {
		return nil, fmt.Errorf("Redis client not available")
	}

	ctx := context.Background()
	sessionKey := "polaris:session:" + sessionId
	var sessionData models.SessionDataCached
	err := redis.Get(ctx, sessionKey, &sessionData)
	if err != nil {
		return nil, fmt.Errorf("Redis get failed: %v", err)
	}

	// Check if data is empty/not found
	if sessionData.UserId == "" {
		return nil, nil // Not found in Redis
	}

	return &sessionData, nil
}

// healSessionOwnerCache rewrites Redis session ownerIds/username synchronously when stale.
// Username must be the canonical value from sa_m_user (never from Redis).
// Rewrite only when DB session exists, is ACTIVE, matches user, and is not expired;
// otherwise the Redis key is deleted (fail-closed).
func (uc *AuthUseCasesImpl) healSessionOwnerCache(sessionID, userID, username, warehouseID string, roleSet, ownerIDs []string) {
	redis := uc.allUseCases.Helper.GetRedisClient()
	if redis == nil {
		return
	}

	healSessionOwnerCacheWithDeps(sessionID, userID, username, warehouseID, roleSet, ownerIDs, ownerSessionHealDeps{
		findByID: func(id string) (*repository.Session, error) {
			return uc.allUseCases.Repository.GetSessionRepository().FindByID(id)
		},
		redis: redis,
		now:   time.Now(),
	})
}

type ownerSessionHealDeps struct {
	findByID func(sessionID string) (*repository.Session, error)
	redis    sessionCacheRedis
	now      time.Time
}

func healSessionOwnerCacheWithDeps(
	sessionID, userID, username, warehouseID string,
	roleSet, ownerIDs []string,
	deps ownerSessionHealDeps,
) {
	if deps.redis == nil {
		return
	}
	if deps.now.IsZero() {
		deps.now = time.Now()
	}
	ctx := context.Background()

	dbSession, err := deps.findByID(sessionID)
	if err != nil {
		hlogger.Log.Errorf("healSessionOwnerCache: FindByID failed for session %s: %v — invalidating Redis cache (fail-closed)", sessionID, err)
		deleteSessionCache(ctx, deps.redis, sessionID)
		return
	}

	ttl, ok := SessionEligibleForOwnerRewrite(dbSession, userID, deps.now)
	if !ok {
		hlogger.Log.Warnf("healSessionOwnerCache: session %s not eligible for rewrite — invalidating Redis cache (fail-closed)", sessionID)
		deleteSessionCache(ctx, deps.redis, sessionID)
		return
	}

	payload, err := BuildSessionCachePayload(userID, username, warehouseID, ownerIDs, roleSet)
	if err != nil {
		hlogger.Log.Errorf("healSessionOwnerCache: invalid payload for session %s: %v — invalidating Redis cache (fail-closed)", sessionID, err)
		deleteSessionCache(ctx, deps.redis, sessionID)
		return
	}
	if err := writeSessionOwnerContext(ctx, deps.redis, sessionID, payload, ttl); err != nil {
		hlogger.Log.Errorf("healSessionOwnerCache: failed to rewrite session %s: %v", sessionID, err)
	}
}

func (uc *AuthUseCasesImpl) Logout(sessionId string, username string, ipAddress string) *hmodels.UseCasesError {
	if sessionId == "" {
		return hutils.BuildUseCasesError([]string{"Session token required."}, http.StatusUnauthorized, -1, "Failed")
	}

	err := uc.allUseCases.Repository.GetSessionRepository().Invalidate(sessionId, username)
	if err != nil {
		return hutils.BuildUseCasesError([]string{"Failed to invalidate session."}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	uc.writeLoginEvent("", username, ipAddress, "LOGOUT", true)
	uc.allUseCases.SendAuditTrail(username, time.Now(), constants.KeyDelete, "Session", nil, nil)
	return nil
}

func (uc *AuthUseCasesImpl) GetUserInfo(param hmodels.SearchRequest) (*hmodels.ResponseContent, *hmodels.UseCasesError) {
	if param.Paging.PageSize == 0 {
		param.Paging.PageSize = 25
	}
	if param.Paging.PageSize > 100 {
		param.Paging.PageSize = 100
	}
	if param.Paging.Page == 0 {
		param.Paging.Page = 1
	}

	resp := hutils.BuildResponseContent(param, []interface{}{}, 0)
	return resp, nil
}

func (uc *AuthUseCasesImpl) resolveRoleSet(userId string) []string {
	userRoles, err := uc.allUseCases.Repository.GetUserRoleRepository().FindByUserId(userId)
	if err != nil {
		hlogger.Log.Errorf("resolveRoleSet failed: %v", err)
		return []string{}
	}
	roleCodes := make([]string, 0, len(userRoles))
	for _, ur := range userRoles {
		role, err := uc.allUseCases.Repository.GetRoleRepository().FindByID(ur.RoleId)
		if err != nil || role == nil {
			continue
		}
		if role.Status == "ACTIVE" {
			roleCodes = append(roleCodes, role.Code)
		}
	}
	return roleCodes
}

// resolveAvailableEndpoints — resolve all available endpoints for user's roles (for FE UI control)
// Returns list of endpoints user can access via endpoint-based permission
func (uc *AuthUseCasesImpl) resolveAvailableEndpoints(roleSet []string) []models.AvailableEndpoint {
	endpointSet := make(map[string]models.AvailableEndpoint) // Use map to deduplicate

	for _, roleCode := range roleSet {
		// Get all API endpoints for this role from sa_r_role_api
		roleApis, err := uc.allUseCases.Repository.RoleApiRepository().FindByRoleName(roleCode)
		if err != nil {
			hlogger.Log.Errorf("resolveAvailableEndpoints: RoleApiRepository().FindByRoleName failed for role code %s: %v", roleCode, err)
			continue
		}

		// Build endpoint list (trim wildcards, deduplicate)
		for _, api := range roleApis {
			endpoint := api.HttpEndpoint
			endpoint = strings.TrimPrefix(endpoint, "*")
			endpoint = strings.TrimSuffix(endpoint, "*")

			key := api.HttpMethod + ":" + endpoint
			endpointSet[key] = models.AvailableEndpoint{
				Method:   api.HttpMethod,
				Endpoint: endpoint,
				IsActive: api.IsActive,
			}
		}
	}

	// Convert map to slice
	availableEndpoints := make([]models.AvailableEndpoint, 0, len(endpointSet))
	for _, ep := range endpointSet {
		availableEndpoints = append(availableEndpoints, ep)
	}

	return availableEndpoints
}

func (uc *AuthUseCasesImpl) resolveWarehouses(userId string) []models.WarehouseResp {
	// Get user's warehouses from local DB
	userWarehouses, err := uc.allUseCases.Repository.GetUserWarehouseRepository().FindByUserID(userId)
	if err != nil {
		hlogger.Log.Errorf("resolveWarehouses: FindByUserID failed: %v", err)
		return []models.WarehouseResp{}
	}

	if len(userWarehouses) == 0 {
		return []models.WarehouseResp{}
	}

	// Extract warehouse IDs and fetch details from Master Data via gRPC
	warehouseIds := make([]string, 0, len(userWarehouses))
	for _, uw := range userWarehouses {
		warehouseIds = append(warehouseIds, uw.WarehouseId)
	}

	warehouseMap, err := uc.allUseCases.MasterdataWarehouseGrpc.GetWarehousesByIds(warehouseIds)
	if err != nil {
		hlogger.Log.Errorf("resolveWarehouses: GetWarehousesByIds gRPC call failed: %v", err)
		// Fallback: return from local DB without ACTIVE filtering
		resp := make([]models.WarehouseResp, 0, len(userWarehouses))
		for _, uw := range userWarehouses {
			resp = append(resp, models.WarehouseResp{
				Id:   uw.WarehouseId,
				Code: uw.WarehouseCode,
				Name: uw.WarehouseName,
			})
		}
		return resp
	}

	// Filter: only include ACTIVE warehouses from gRPC response
	resp := make([]models.WarehouseResp, 0, len(userWarehouses))
	for _, uw := range userWarehouses {
		if whDetail, exists := warehouseMap[uw.WarehouseId]; exists && whDetail.Status == "ACTIVE" {
			resp = append(resp, models.WarehouseResp{
				Id:   whDetail.Id,
				Code: whDetail.WarehouseCode,
				Name: whDetail.WarehouseName,
			})
		}
	}

	hlogger.Log.Debugf("resolveWarehouses: user %s has %d total warehouses, %d are ACTIVE", userId, len(userWarehouses), len(resp))
	return resp
}

// LoadOwnerIDs loads owner IDs via the provided finder.
// Empty assignment list yields nil (unrestricted). DB errors are returned as-is.
func LoadOwnerIDs(find func(userID string) ([]repository.UserOwner, error), userID string) ([]string, error) {
	owners, err := find(userID)
	if err != nil {
		return nil, err
	}
	return OwnerIDsFromUserOwners(owners), nil
}

// loadOwnerIds loads owner IDs from sa_r_user_owner and surfaces DB errors.
// Empty result is nil (unrestricted). A DB error is never converted to nil.
func (uc *AuthUseCasesImpl) loadOwnerIds(userId string) ([]string, error) {
	return LoadOwnerIDs(func(id string) ([]repository.UserOwner, error) {
		return uc.allUseCases.Repository.GetUserOwnerRepository().FindByUserID(id)
	}, userId)
}

// resolveOwnerIds — resolve owner_ids dari sa_r_user_owner for login/switch-context.
// Empty result = user can access all owners (Supervisor/Manager).
// Prefer loadOwnerIds on security-sensitive read paths that must fail-closed.
func (uc *AuthUseCasesImpl) resolveOwnerIds(userId string) []string {
	ids, err := uc.loadOwnerIds(userId)
	if err != nil {
		hlogger.Log.Errorf("resolveOwnerIds failed: %v", err)
		return nil
	}
	return ids
}

func (uc *AuthUseCasesImpl) getMaxFailedAttempts() int {
	// Try to resolve config from master-data service via gRPC
	if uc.allUseCases.MasterdataConfigGrpc != nil {
		configResp, err := uc.allUseCases.MasterdataConfigGrpc.ResolveConfig("LOGIN_MAX_FAILED_ATTEMPTS")
		if err == nil && configResp != nil && configResp.ResolvedValue != "" {
			if val, err := strconv.Atoi(configResp.ResolvedValue); err == nil && val > 0 {
				return val
			}
		}
	}
	// Default 5, fallback to env var
	return uc.parseIntEnv("LOGIN_MAX_FAILED_ATTEMPTS", 5)
}

func (uc *AuthUseCasesImpl) getRateLimitWindowMin() int {
	// Try to resolve config from master-data service via gRPC
	if uc.allUseCases.MasterdataConfigGrpc != nil {
		configResp, err := uc.allUseCases.MasterdataConfigGrpc.ResolveConfig("LOGIN_RATE_LIMIT_WINDOW_MIN")
		if err == nil && configResp != nil && configResp.ResolvedValue != "" {
			if val, err := strconv.Atoi(configResp.ResolvedValue); err == nil && val > 0 {
				return val
			}
		}
	}
	// Default 15 minutes, fallback to env var
	return uc.parseIntEnv("LOGIN_RATE_LIMIT_WINDOW_MIN", 15)
}

func (uc *AuthUseCasesImpl) getLockDurationMin() int {
	// Try to resolve config from master-data service via gRPC
	if uc.allUseCases.MasterdataConfigGrpc != nil {
		configResp, err := uc.allUseCases.MasterdataConfigGrpc.ResolveConfig("LOGIN_LOCK_DURATION_MIN")
		if err == nil && configResp != nil && configResp.ResolvedValue != "" {
			if val, err := strconv.Atoi(configResp.ResolvedValue); err == nil && val > 0 {
				return val
			}
		}
	}
	// Default 30 minutes, fallback to env var
	return uc.parseIntEnv("LOGIN_LOCK_DURATION_MIN", 30)
}

func (uc *AuthUseCasesImpl) parseIntEnv(key string, defaultValue int) int {
	valStr := hutils.GetEnv(key, "")
	if valStr == "" {
		return defaultValue
	}
	v, err := strconv.Atoi(valStr)
	if err != nil || v <= 0 {
		return defaultValue
	}
	return v
}

func (uc *AuthUseCasesImpl) getSessionTimeoutMinutes() int {
	// Try to resolve config from master-data service via gRPC
	if uc.allUseCases.MasterdataConfigGrpc != nil {
		configResp, err := uc.allUseCases.MasterdataConfigGrpc.ResolveConfig("SES_TIMEOUT_MIN")
		if err == nil && configResp != nil && configResp.ResolvedValue != "" {
			timeout, parseErr := strconv.Atoi(configResp.ResolvedValue)
			if parseErr == nil && timeout > 0 {
				// Cache to Redis for access-gate sliding session
				redis := uc.allUseCases.Helper.GetRedisClient()
				if redis != nil {
					ctx := context.Background()
					configKey := "polaris:config:SES_TIMEOUT_MIN"
					_ = redis.Set(ctx, configKey, configResp.ResolvedValue, 24*time.Hour)
				}
				hlogger.Log.Debugf("getSessionTimeoutMinutes: resolved from gRPC config service: %d minutes", timeout)
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

func (uc *AuthUseCasesImpl) writeLoginAttempt(username string, ipAddress string, userAgent string, isSuccess bool, failureReason string) {
	attemptId, _ := uuid.NewV7()
	attempt := &repository.LoginAttempt{
		Id:            attemptId.String(),
		Username:      username,
		IpAddress:     ipAddress,
		UserAgent:     userAgent,
		IsSuccess:     isSuccess,
		FailureReason: failureReason,
	}
	if err := uc.allUseCases.Repository.GetLoginAttemptRepository().Create(attempt); err != nil {
		hlogger.Log.Errorf("writeLoginAttempt failed: %v", err)
	}
}

func (uc *AuthUseCasesImpl) writeLoginEvent(keycloakId string, username string, ipAddress string, eventType string, isSuccess bool) {
	eventId, _ := uuid.NewV7()
	event := &repository.LoginEvent{
		Id:         eventId.String(),
		KeycloakId: keycloakId,
		Username:   username,
		IpAddress:  ipAddress,
		EventType:  eventType,
		IsSuccess:  isSuccess,
		CreatedBy:  username,
		UpdatedBy:  username,
	}
	if err := uc.allUseCases.Repository.GetLoginEventRepository().Create(event); err != nil {
		hlogger.Log.Errorf("writeLoginEvent failed: %v", err)
	}
}

// resolveFeaturePermissions — resolve feature-based permissions from sa_r_role_permission
// Returns array of permission keys (strings) for FE menu control
// Legacy system: used alongside endpoint-based permissions (sa_r_role_api)
func (uc *AuthUseCasesImpl) resolveFeaturePermissions(roleCodes []string) []models.UserProvPermissionResp {
	if len(roleCodes) == 0 {
		return []models.UserProvPermissionResp{}
	}

	// Resolve role IDs from role codes
	roleIds := make([]string, 0, len(roleCodes))
	for _, roleCode := range roleCodes {
		role, err := uc.allUseCases.Repository.GetRoleRepository().FindByCode(roleCode)
		if err != nil || role == nil {
			hlogger.Log.Warnf("resolveFeaturePermissions: role code %s not found", roleCode)
			continue
		}
		roleIds = append(roleIds, role.Id)
	}

	// Collect permissions from all roles (deduplicate)
	permissionSet := make(map[string]bool)
	for _, roleId := range roleIds {
		rolePerms, err := uc.allUseCases.Repository.GetRolePermissionRepository().FindByRoleId(roleId)
		if err != nil {
			hlogger.Log.Errorf("resolveFeaturePermissions: error getting role permissions for %s: %v", roleId, err)
			continue
		}

		for _, rp := range rolePerms {
			// Resolve permission_id to permission details
			perm, err := uc.allUseCases.Repository.GetPermissionRepository().FindByID(rp.PermissionId)
			if err != nil {
				hlogger.Log.Errorf("resolveFeaturePermissions: error getting permission %s: %v", rp.PermissionId, err)
				continue
			}
			if perm != nil && !perm.IsDeleted {
				permissionSet[perm.Id] = true
			}
		}
	}

	// Build response (deduplicated)
	permissions := make([]models.UserProvPermissionResp, 0, len(permissionSet))
	for permId := range permissionSet {
		perm, err := uc.allUseCases.Repository.GetPermissionRepository().FindByID(permId)
		if err == nil && perm != nil {
			permissions = append(permissions, models.UserProvPermissionResp{
				Id:       perm.Id,
				Key:      perm.Key,
				Resource: perm.Resource,
				Action:   perm.Action,
			})
		}
	}

	return permissions
}
