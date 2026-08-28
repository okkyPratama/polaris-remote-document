package usecases

import (
	"context"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"bitbucket.org/log-tech/helper-go/hlogger"
	"bitbucket.org/log-tech/helper-go/hmodels"
	"bitbucket.org/log-tech/helper-go/hutils"
	"bitbucket.org/log-tech/polaris-smart-access-service/constants"
	"bitbucket.org/log-tech/polaris-smart-access-service/data-access/repository"
	"bitbucket.org/log-tech/polaris-smart-access-service/models"
	"bitbucket.org/log-tech/polaris-smart-access-service/utils"
	"github.com/google/uuid"
)

type UserProvisioningUseCasesImpl struct {
	allUseCases *AllUseCasesImpl
}

func NewUserProvisioningUseCases(allUc *AllUseCasesImpl) *UserProvisioningUseCasesImpl {
	return &UserProvisioningUseCasesImpl{allUseCases: allUc}
}

func (uc *UserProvisioningUseCasesImpl) Save(params models.UserProvisioningReq) (*models.UserProvisioningCreateResp, *hmodels.UseCasesError) {
	var errMsg []string
	if params.Username == "" {
		errMsg = append(errMsg, "Username is required.")
	} else {
		// Username format validation: alphanumeric, underscore, dash, min 3 chars, max 32 chars
		if len(params.Username) < 3 {
			errMsg = append(errMsg, "Username must be at least 3 characters long.")
		}
		if len(params.Username) > 32 {
			errMsg = append(errMsg, "Username cannot exceed 32 characters.")
		}
		// Check if username contains only valid characters
		if !isValidUsername(params.Username) {
			errMsg = append(errMsg, "Username can only contain letters, numbers, underscore (_), and dash (-).")
		}
	}
	if params.Email == "" {
		errMsg = append(errMsg, "Email is required.")
	}
	// initialPassword is the REQ-014 field name; keep Password as alias
	if params.Password == "" && params.InitialPassword != "" {
		params.Password = params.InitialPassword
	}
	if len(errMsg) > 0 {
		return nil, hutils.BuildUseCasesError(errMsg, http.StatusBadRequest, -1, "Failed")
	}

	// Check duplicate in local DB
	repo := uc.allUseCases.Repository.GetAuthUserRepository()
	existingUser, err := repo.FindByUsername(params.Username)
	if err != nil {
		return nil, hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if existingUser != nil {
		return nil, hutils.BuildUseCasesError([]string{fmt.Sprintf("Username '%s' is already taken. Please use a different username.", params.Username)}, http.StatusBadRequest, -1, "Failed")
	}

	// Split fullName into firstName + lastName (for Keycloak)
	fullName := strings.TrimSpace(params.FullName)
	firstName, lastName := splitFullName(fullName)

	// Status from body (default ACTIVE)
	status := strings.ToUpper(params.Status)
	if status == "" {
		status = "ACTIVE"
	}

	// Create user in Keycloak (REQ-014 Section 4, API #2)
	kcAdmin := utils.GetKeycloakAdmin()
	kcUser := utils.KeycloakUser{
		Username:        params.Username,
		Email:           params.Email,
		FirstName:       firstName,
		LastName:        lastName,
		Enabled:         status != "INACTIVE",
		EmailVerified:   false,
		RequiredActions: []string{"VERIFY_EMAIL", "UPDATE_PASSWORD"},
	}
	if params.Password != "" {
		kcUser.Credentials = []utils.KeycloakCredential{
			{Type: "password", Value: params.Password, Temporary: false},
		}
	}

	keycloakId, err := kcAdmin.CreateUser(kcUser)
	if err != nil {
		hlogger.Log.Errorf("UserProvisioning.Save: Keycloak create failed: %v", err)
		return nil, hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Keycloak Error.")
	}

	// Always trigger execute-actions-email after create (REQ-014 Section 4, API #6)
	// Sends email with VERIFY_EMAIL + UPDATE_PASSWORD actions to user
	if err := kcAdmin.ExecuteActionsEmail(keycloakId, []string{"VERIFY_EMAIL", "UPDATE_PASSWORD"}); err != nil {
		hlogger.Log.Warnf("UserProvisioning.Save: execute actions email failed: %v (non-blocking)", err)
	}

	// Save to local DB (sa_m_user)
	userId, _ := uuid.NewV7()
	now := time.Now()
	entity := &repository.AuthUser{
		Id:         userId.String(),
		KeycloakId: keycloakId,
		Username:   params.Username,
		Email:      params.Email,
		FullName:   fullName,
		Status:     status,
		CreatedBy:  params.CreatedBy,
		UpdatedBy:  params.CreatedBy,
	}

	savedUser, err := repo.UpsertByKeycloakId(entity)
	if err != nil {
		hlogger.Log.Errorf("UserProvisioning.Save: DB upsert failed: %v", err)
		return nil, hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	// Assign roles (REQ-014: initial role assignment)
	if len(params.RoleIds) > 0 {
		roleReq := models.UserRoleReq{UserId: savedUser.Id, RoleIds: params.RoleIds, CreatedBy: params.CreatedBy}
		if errUc := uc.allUseCases.UserRole.Save(roleReq); errUc != nil {
			hlogger.Log.Errorf("UserProvisioning.Save: assign roles failed: %v", errUc.ErrorMessage)
			// ROLLBACK: Delete user yang baru dibuat
			uc.rollbackUserCreation(savedUser.Id, keycloakId, params.CreatedBy)
			return nil, hutils.BuildUseCasesError([]string{"Assign roles failed: " + errUc.ErrorMessage[0]}, http.StatusInternalServerError, -1, "Failed")
		}
	}

	// Assign warehouses (REQ-014: initial warehouse assignment)
	if len(params.WarehouseIds) > 0 {
		whReq := models.UserWarehouseReq{UserId: savedUser.Id, WarehouseIds: params.WarehouseIds, CreatedBy: params.CreatedBy}
		if errUc := uc.allUseCases.UserWarehouse.Save(whReq); errUc != nil {
			hlogger.Log.Errorf("UserProvisioning.Save: assign warehouses failed: %v", errUc.ErrorMessage)
			// ROLLBACK: Delete user yang baru dibuat
			uc.rollbackUserCreation(savedUser.Id, keycloakId, params.CreatedBy)
			return nil, hutils.BuildUseCasesError([]string{"Assign warehouses failed: " + errUc.ErrorMessage[0]}, http.StatusInternalServerError, -1, "Failed")
		}
	}

	// Assign owners (REQ-014: initial owner assignment)
	for _, ownerId := range params.OwnerIds {
		ownerReq := models.UserOwnerReq{UserId: savedUser.Id, OwnerId: ownerId, CreatedBy: params.CreatedBy}
		if errUc := uc.allUseCases.UserOwner.Save(ownerReq); errUc != nil {
			hlogger.Log.Errorf("UserProvisioning.Save: assign owner %s failed: %v", ownerId, errUc.ErrorMessage)
			// ROLLBACK: Delete user yang baru dibuat
			uc.rollbackUserCreation(savedUser.Id, keycloakId, params.CreatedBy)
			return nil, hutils.BuildUseCasesError([]string{"Assign owner failed: " + errUc.ErrorMessage[0]}, http.StatusInternalServerError, -1, "Failed")
		}
	}

	resp := &models.UserProvisioningCreateResp{
		Id:             savedUser.Id,
		Username:       savedUser.Username,
		KeycloakSynced: keycloakId != "",
	}

	uc.allUseCases.SendAuditTrail(params.CreatedBy, now, constants.KeyCreate, "User", nil, resp)
	return resp, nil
}

// isValidUsername - check if username contains only valid characters (alphanumeric, dash, underscore)
func isValidUsername(username string) bool {
	// Pattern: alphanumeric, dash, underscore
	pattern := `^[a-zA-Z0-9_-]+$`
	match, err := regexp.MatchString(pattern, username)
	if err != nil {
		return false
	}
	return match
}

// rollbackUserCreation - delete user dari Keycloak dan local DB jika assignment gagal
func (uc *UserProvisioningUseCasesImpl) rollbackUserCreation(userId string, keycloakId string, deletedBy string) {
	hlogger.Log.Infof("UserProvisioning.Save: ROLLBACK initiated for user %s", userId)

	// 1. Delete dari Keycloak
	if keycloakId != "" {
		kcAdmin := utils.GetKeycloakAdmin()
		if err := kcAdmin.DeleteUser(keycloakId); err != nil {
			hlogger.Log.Errorf("Rollback: failed to delete user from Keycloak %s: %v", keycloakId, err)
		} else {
			hlogger.Log.Infof("Rollback: user deleted from Keycloak %s", keycloakId)
		}
	}

	// 2. Soft-delete dari local DB (mark as INACTIVE)
	repo := uc.allUseCases.Repository.GetAuthUserRepository()
	existing, err := repo.FindByID(userId)
	if err == nil && existing != nil {
		existing.Status = "INACTIVE"
		existing.UpdatedBy = deletedBy
		existing.UpdatedAt = time.Now()
		if err := repo.Update(existing); err != nil {
			hlogger.Log.Errorf("Rollback: failed to mark user as inactive %s: %v", userId, err)
		} else {
			hlogger.Log.Infof("Rollback: user marked as inactive %s", userId)
		}
	}

	// 3. Delete roles yang sudah di-assign
	userRoles, _ := uc.allUseCases.Repository.GetUserRoleRepository().FindByUserId(userId)
	for _, ur := range userRoles {
		delReq := models.UserRoleReq{UserId: userId, RoleIds: []string{ur.RoleId}, DeletedBy: deletedBy}
		if errUc := uc.allUseCases.UserRole.Delete(delReq); errUc != nil {
			hlogger.Log.Errorf("Rollback: failed to delete role %s for user %s: %v", ur.RoleId, userId, errUc.ErrorMessage)
		}
	}

	// 4. Delete warehouses yang sudah di-assign
	userWarehouses, _ := uc.allUseCases.Repository.GetUserWarehouseRepository().FindByUserID(userId)
	for _, uw := range userWarehouses {
		delReq := models.UserWarehouseReq{UserId: userId, WarehouseIds: []string{uw.WarehouseId}, DeletedBy: deletedBy}
		if errUc := uc.allUseCases.UserWarehouse.Delete(delReq); errUc != nil {
			hlogger.Log.Errorf("Rollback: failed to delete warehouse %s for user %s: %v", uw.WarehouseId, userId, errUc.ErrorMessage)
		}
	}

	// 5. Delete owners yang sudah di-assign
	userOwners, _ := uc.allUseCases.Repository.GetUserOwnerRepository().FindByUserID(userId)
	for _, uo := range userOwners {
		delReq := models.UserOwnerReq{UserId: userId, OwnerId: uo.OwnerId, DeletedBy: deletedBy}
		if errUc := uc.allUseCases.UserOwner.Delete(delReq); errUc != nil {
			hlogger.Log.Errorf("Rollback: failed to delete owner %s for user %s: %v", uo.OwnerId, userId, errUc.ErrorMessage)
		}
	}

	hlogger.Log.Infof("UserProvisioning.Save: ROLLBACK completed for user %s", userId)
}

func (uc *UserProvisioningUseCasesImpl) Update(params models.UserProvisioningReq) *hmodels.UseCasesError {
	if params.Id == "" {
		return hutils.BuildUseCasesError([]string{"body.id is required."}, http.StatusBadRequest, -1, "Failed")
	}

	repo := uc.allUseCases.Repository.GetAuthUserRepository()
	existing, err := repo.FindByID(params.Id)
	if err != nil {
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if existing == nil {
		return hutils.BuildUseCasesError([]string{"User not found."}, http.StatusBadRequest, -1, "Failed")
	}

	// Split fullName into firstName + lastName (for Keycloak)
	fullName := strings.TrimSpace(params.FullName)
	firstName, lastName := splitFullName(fullName)

	// Resolve effective values (fallback to existing when not provided)
	newEmail := existing.Email
	if params.Email != "" {
		newEmail = params.Email
	}
	newStatus := existing.Status
	if params.Status != "" {
		newStatus = strings.ToUpper(params.Status)
	}

	// Fetch current user roles for change detection
	current, _ := uc.allUseCases.Repository.GetUserRoleRepository().FindByUserId(existing.Id)

	// VALIDATION PHASE: Validate all changes BEFORE committing
	// 1. Validate roles if provided
	if len(params.RoleIds) > 0 {
		roleRepo := uc.allUseCases.Repository.GetRoleRepository()
		for _, roleId := range params.RoleIds {
			role, err := roleRepo.FindByID(roleId)
			if err != nil || role == nil {
				return hutils.BuildUseCasesError([]string{"Role " + roleId + " not found."}, http.StatusBadRequest, -1, "Failed")
			}
		}
	}

	// 2. Validate warehouses if provided (check with master-data gRPC)
	if len(params.WarehouseIds) > 0 {
		warehouseMap, err := uc.allUseCases.MasterdataWarehouseGrpc.GetWarehousesByIds(params.WarehouseIds)
		if err != nil {
			hlogger.Log.Errorf("UserProvisioning.Update: GetWarehousesByIds gRPC failed: %v", err)
			return hutils.BuildUseCasesError([]string{"Validasi warehouse gagal dari master data service."}, http.StatusInternalServerError, -100006, "Database Error.")
		}
		for _, whId := range params.WarehouseIds {
			if _, exists := warehouseMap[whId]; !exists {
				return hutils.BuildUseCasesError([]string{whId + " warehouse tidak ditemukan di master data."}, http.StatusBadRequest, -1, "Failed")
			}
		}
	}

	// 3. Validate owners if provided (check if owner exists from current assignments)
	if len(params.OwnerIds) > 0 {
		// Just validate format, can't check master data for owners in local DB only
		for _, ownerId := range params.OwnerIds {
			if ownerId == "" {
				return hutils.BuildUseCasesError([]string{"Owner ID cannot be empty."}, http.StatusBadRequest, -1, "Failed")
			}
		}
	}

	// COMMIT PHASE: All validations passed, now apply all changes
	// 1. Update in Keycloak (name, email, enabled)
	kcAdmin := utils.GetKeycloakAdmin()
	kcUser := utils.KeycloakUser{
		Username: existing.Username,
		Email:    newEmail,
		Enabled:  newStatus != "INACTIVE",
	}
	// Only send name if provided in this request
	if fullName != "" {
		kcUser.FirstName = firstName
		kcUser.LastName = lastName
	}
	if err := kcAdmin.UpdateUser(existing.KeycloakId, kcUser); err != nil {
		hlogger.Log.Errorf("UserProvisioning.Update: Keycloak update failed: %v", err)
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Keycloak Error.")
	}

	// 2. Update local DB (sa_m_user)
	existing.Email = newEmail
	existing.Status = newStatus
	if fullName != "" {
		existing.FullName = fullName
	}
	existing.UpdatedBy = params.UpdatedBy
	existing.UpdatedAt = time.Now()

	if err := repo.Update(existing); err != nil {
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	// 3. Re-sync roles if provided (delete existing, assign new set)
	// Detect role change: compare current role IDs with requested role IDs
	shouldInvalidateSessions := false

	// Check if RoleIds was explicitly provided in request (indicates intent to change roles)
	// Note: We detect this by checking if RoleIds field was populated (even if empty array)
	// However, Go doesn't distinguish between nil and empty slice, so we use a different approach:
	// If params contains RoleIds, always compare and sync (treat as explicit change request)

	// Build map of current role IDs
	currentRoleIds := make(map[string]bool)
	for _, ur := range current {
		currentRoleIds[ur.RoleId] = true
	}

	// Build map of requested role IDs
	newRoleIds := make(map[string]bool)
	for _, roleId := range params.RoleIds {
		newRoleIds[roleId] = true
	}

	// Always sync roles if params.RoleIds was provided in request body
	// (Check: if request has RoleIds field, params.RoleIds will be populated, even if empty)
	// Compare for changes
	if len(currentRoleIds) != len(newRoleIds) {
		shouldInvalidateSessions = true
	} else {
		// Same length, check if all IDs match
		for roleId := range currentRoleIds {
			if !newRoleIds[roleId] {
				shouldInvalidateSessions = true
				break
			}
		}
	}

	// Re-sync roles only if provided OR if user has roles but now wants empty (explicit removal)
	// Use Update method to properly handle sync (delete old + add new)
	if len(params.RoleIds) > 0 || len(currentRoleIds) > 0 {
		roleReq := models.UserRoleReq{UserId: existing.Id, RoleIds: params.RoleIds, UpdatedBy: params.UpdatedBy}
		if errUc := uc.allUseCases.UserRole.Update(roleReq); errUc != nil {
			hlogger.Log.Errorf("UserProvisioning.Update: sync roles failed: %v", errUc.ErrorMessage)
		}
	}

	// Invalidate all sessions if role changed (S1-007 AC-1.2.9)
	if shouldInvalidateSessions {
		go func() {
			defer func() {
				if r := recover(); r != nil {
					hlogger.Log.Errorf("UserProvisioning.Update role invalidation panic: %v", r)
				}
			}()
			hlogger.Log.Infof("UserProvisioning.Update: role changed for user %s, invalidating all sessions", existing.Id)
			if err := uc.allUseCases.Resolve.InvalidateAllUserSessions(existing.Id, params.UpdatedBy); err != nil {
				hlogger.Log.Errorf("UserProvisioning.Update: failed to invalidate sessions: %v", err)
			}
		}()
	}

	// 4. Re-sync warehouses if provided (NO invalidation)
	// Use Update method to properly handle sync (delete old + add new)
	if len(params.WarehouseIds) > 0 {
		whReq := models.UserWarehouseReq{UserId: existing.Id, WarehouseIds: params.WarehouseIds, UpdatedBy: params.UpdatedBy}
		if errUc := uc.allUseCases.UserWarehouse.Update(whReq); errUc != nil {
			hlogger.Log.Errorf("UserProvisioning.Update: sync warehouses failed: %v", errUc.ErrorMessage)
		}
	}

	// 5. Re-sync owners if provided (NO invalidation)
	// Use Delete + Save pattern for owners (no Update method)
	if len(params.OwnerIds) > 0 {
		uc.syncUserOwners(existing.Id, params.OwnerIds, params.UpdatedBy)
	}

	uc.allUseCases.SendAuditTrail(params.UpdatedBy, time.Now(), constants.KeyUpdate, "User", nil, existing)
	return nil
}

// syncUserRoles removes roles no longer desired, adds new roles, handles session invalidation
// Pattern: similar to master-data (manage relationships, not the main entity)
func (uc *UserProvisioningUseCasesImpl) syncUserRoles(userId string, roleIds []string, updatedBy string) {
	current, _ := uc.allUseCases.Repository.GetUserRoleRepository().FindByUserId(userId)

	// Build sets for comparison
	currentRoleIds := make(map[string]bool)
	for _, ur := range current {
		currentRoleIds[ur.RoleId] = true
	}

	desiredRoleIds := make(map[string]bool)
	for _, roleId := range roleIds {
		desiredRoleIds[roleId] = true
	}

	// Collect roles to add and delete
	rolesToAdd := make([]string, 0)
	rolesToDelete := make([]string, 0)

	// Find roles to delete (in current but not in desired)
	for roleId := range currentRoleIds {
		if !desiredRoleIds[roleId] {
			rolesToDelete = append(rolesToDelete, roleId)
		}
	}

	// Find roles to add (in desired but not in current)
	for roleId := range desiredRoleIds {
		if !currentRoleIds[roleId] {
			rolesToAdd = append(rolesToAdd, roleId)
		}
	}

	// Execute deletes (without invalidation — we'll do it once at the end)
	for _, roleId := range rolesToDelete {
		delReq := models.UserRoleReq{UserId: userId, RoleIds: []string{roleId}, DeletedBy: updatedBy}
		if errUc := uc.allUseCases.UserRole.Delete(delReq); errUc != nil {
			hlogger.Log.Errorf("syncUserRoles: delete role %s failed: %v", roleId, errUc.ErrorMessage)
		}
	}

	// Execute adds (without invalidation — we'll do it once at the end)
	if len(rolesToAdd) > 0 {
		addReq := models.UserRoleReq{UserId: userId, RoleIds: rolesToAdd, CreatedBy: updatedBy}
		if errUc := uc.allUseCases.UserRole.Save(addReq); errUc != nil {
			hlogger.Log.Errorf("syncUserRoles: assign roles failed: %v", errUc.ErrorMessage)
		}
	}

	hlogger.Log.Debugf("syncUserRoles: added %d roles, deleted %d roles for user %s", len(rolesToAdd), len(rolesToDelete), userId)
}

// syncUserWarehouses removes warehouses no longer present then adds new ones dengan enrichment dari master-data gRPC.
// Pattern: similar to master-data (manage relationships, not the main entity)
// Note: UserWarehouse.Save() handles soft-delete reactivation automatically
func (uc *UserProvisioningUseCasesImpl) syncUserWarehouses(userId string, warehouseIds []string, updatedBy string) {
	current, _ := uc.allUseCases.Repository.GetUserWarehouseRepository().FindByUserID(userId)

	// Build sets for comparison (only consider active warehouses)
	currentWarehouses := make(map[string]bool)
	for _, uw := range current {
		currentWarehouses[uw.WarehouseId] = true
	}

	desiredWarehouses := make(map[string]bool)
	for _, whId := range warehouseIds {
		desiredWarehouses[whId] = true
	}

	// Collect warehouses to add and delete
	warehousesToAdd := make([]string, 0)
	warehousesToDelete := make([]string, 0)

	// Find warehouses to delete (in current but not in desired)
	for whId := range currentWarehouses {
		if !desiredWarehouses[whId] {
			warehousesToDelete = append(warehousesToDelete, whId)
		}
	}

	// Find warehouses to add (in desired but not in current)
	for whId := range desiredWarehouses {
		if !currentWarehouses[whId] {
			warehousesToAdd = append(warehousesToAdd, whId)
		}
	}

	// Execute deletes
	for _, whId := range warehousesToDelete {
		delReq := models.UserWarehouseReq{UserId: userId, WarehouseIds: []string{whId}, DeletedBy: updatedBy}
		if errUc := uc.allUseCases.UserWarehouse.Delete(delReq); errUc != nil {
			hlogger.Log.Errorf("syncUserWarehouses: delete warehouse %s failed: %v", whId, errUc.ErrorMessage)
		}
	}

	// Execute adds (UserWarehouse.Save handles soft-delete reactivation)
	if len(warehousesToAdd) > 0 {
		addReq := models.UserWarehouseReq{UserId: userId, WarehouseIds: warehousesToAdd, CreatedBy: updatedBy}
		if errUc := uc.allUseCases.UserWarehouse.Save(addReq); errUc != nil {
			hlogger.Log.Errorf("syncUserWarehouses: assign warehouses failed: %v", errUc.ErrorMessage)
		}
	}

	hlogger.Log.Debugf("syncUserWarehouses: added %d warehouses, deleted %d warehouses for user %s", len(warehousesToAdd), len(warehousesToDelete), userId)
}

// syncUserOwners removes owners no longer present then adds new ones.
// Pattern: similar to master-data (manage relationships, not the main entity)
// Note: UserOwner.Save() handles soft-delete reactivation automatically
func (uc *UserProvisioningUseCasesImpl) syncUserOwners(userId string, ownerIds []string, updatedBy string) {
	current, _ := uc.allUseCases.Repository.GetUserOwnerRepository().FindByUserID(userId)

	// Build sets for comparison (only consider active owners)
	currentOwners := make(map[string]bool)
	for _, uo := range current {
		currentOwners[uo.OwnerId] = true
	}

	desiredOwners := make(map[string]bool)
	for _, ownerId := range ownerIds {
		desiredOwners[ownerId] = true
	}

	// Collect owners to add and delete
	ownersToAdd := make([]string, 0)
	ownersToDelete := make([]string, 0)

	// Find owners to delete (in current but not in desired)
	for ownerId := range currentOwners {
		if !desiredOwners[ownerId] {
			ownersToDelete = append(ownersToDelete, ownerId)
		}
	}

	// Find owners to add (in desired but not in current)
	for ownerId := range desiredOwners {
		if !currentOwners[ownerId] {
			ownersToAdd = append(ownersToAdd, ownerId)
		}
	}

	// Execute deletes
	for _, ownerId := range ownersToDelete {
		delReq := models.UserOwnerReq{UserId: userId, OwnerId: ownerId, DeletedBy: updatedBy}
		if errUc := uc.allUseCases.UserOwner.Delete(delReq); errUc != nil {
			hlogger.Log.Errorf("syncUserOwners: delete owner %s failed: %v", ownerId, errUc.ErrorMessage)
		}
	}

	// Execute adds (UserOwner.Save handles soft-delete reactivation)
	for _, ownerId := range ownersToAdd {
		addReq := models.UserOwnerReq{UserId: userId, OwnerId: ownerId, CreatedBy: updatedBy}
		if errUc := uc.allUseCases.UserOwner.Save(addReq); errUc != nil {
			hlogger.Log.Errorf("syncUserOwners: add owner %s failed: %v", ownerId, errUc.ErrorMessage)
		}
	}

	hlogger.Log.Debugf("syncUserOwners: added %d owners, deleted %d owners for user %s", len(ownersToAdd), len(ownersToDelete), userId)
}

func (uc *UserProvisioningUseCasesImpl) Deactivate(params models.UserProvisioningReq) *hmodels.UseCasesError {
	if params.Id == "" {
		return hutils.BuildUseCasesError([]string{"body.id is required."}, http.StatusBadRequest, -1, "Failed")
	}

	repo := uc.allUseCases.Repository.GetAuthUserRepository()
	existing, err := repo.FindByID(params.Id)
	if err != nil {
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if existing == nil {
		return hutils.BuildUseCasesError([]string{"User not found."}, http.StatusBadRequest, -1, "Failed")
	}

	// Disable in Keycloak (soft delete — don't hard delete from IdP)
	kcAdmin := utils.GetKeycloakAdmin()
	if err := kcAdmin.DisableUser(existing.KeycloakId); err != nil {
		hlogger.Log.Errorf("UserProvisioning.Deactivate: Keycloak disable failed: %v", err)
	}

	// Invalidate all active sessions (REQ-014 AC-14.2)
	activeSessions, _ := uc.allUseCases.Repository.GetSessionRepository().FindActiveByUserId(existing.Id)
	for _, session := range activeSessions {
		_ = uc.allUseCases.Repository.GetSessionRepository().Invalidate(session.Id, params.UpdatedBy)
	}
	// Invalidate Redis caches (permissions, scope, warehouse context)
	uc.allUseCases.Resolve.InvalidateUserCache(existing.Id)

	// Invalidate warehouse context - force logout from any selected warehouse
	_ = uc.allUseCases.Helper.GetRedisClient().Delete(context.Background(), "polaris:warehouse_context:"+existing.Id)

	// Soft delete in local DB
	existing.Status = "INACTIVE"
	existing.UpdatedBy = params.UpdatedBy
	existing.UpdatedAt = time.Now()
	if err := repo.Update(existing); err != nil {
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	uc.allUseCases.SendAuditTrail(params.UpdatedBy, time.Now(), constants.KeyUpdate, "User", existing, existing)
	return nil
}

func (uc *UserProvisioningUseCasesImpl) Reactivate(params models.UserProvisioningReq) *hmodels.UseCasesError {
	if params.Id == "" {
		return hutils.BuildUseCasesError([]string{"body.id is required."}, http.StatusBadRequest, -1, "Failed")
	}

	repo := uc.allUseCases.Repository.GetAuthUserRepository()
	existing, err := repo.FindByID(params.Id)
	if err != nil {
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if existing == nil {
		return hutils.BuildUseCasesError([]string{"User not found."}, http.StatusBadRequest, -1, "Failed")
	}

	// Enable in Keycloak
	kcAdmin := utils.GetKeycloakAdmin()
	if err := kcAdmin.EnableUser(existing.KeycloakId); err != nil {
		hlogger.Log.Errorf("UserProvisioning.Reactivate: Keycloak enable failed: %v", err)
	}

	// Update local DB
	existing.Status = "ACTIVE"
	existing.UpdatedBy = params.UpdatedBy
	existing.UpdatedAt = time.Now()
	if err := repo.Update(existing); err != nil {
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	uc.allUseCases.SendAuditTrail(params.UpdatedBy, time.Now(), constants.KeyUpdate, "User", existing, existing)
	return nil
}

func (uc *UserProvisioningUseCasesImpl) GetAll(param hmodels.SearchRequest) (*hmodels.ResponseContent, *hmodels.UseCasesError) {
	if param.Paging.PageSize == 0 {
		param.Paging.PageSize = 25
	}
	if param.Paging.PageSize > 100 {
		param.Paging.PageSize = 100
	}
	if param.Paging.Page == 0 {
		param.Paging.Page = 1
	}

	repo := uc.allUseCases.Repository.GetAuthUserRepository()
	data, total, err := repo.FindAll(param)
	if err != nil {
		return nil, hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	items := make([]interface{}, 0, len(data))
	for _, d := range data {
		// Resolve roles (full detail like detailById)
		roles := []models.UserProvRoleResp{}
		userRoles, _ := uc.allUseCases.Repository.GetUserRoleRepository().FindByUserId(d.Id)
		for _, ur := range userRoles {
			role, err := uc.allUseCases.Repository.GetRoleRepository().FindByID(ur.RoleId)
			if err == nil && role != nil {
				roles = append(roles, models.UserProvRoleResp{
					Id:       role.Id,
					Code:     role.Code,
					Name:     role.Name,
					IsSystem: role.IsSystem,
				})
			}
		}

		// Count warehouses (only count, no detail)
		userWarehouses, _ := uc.allUseCases.Repository.GetUserWarehouseRepository().FindByUserID(d.Id)
		warehouseCount := len(userWarehouses)

		// displayName dari sa_m_user.fullname (di-sync dari Keycloak saat login)
		displayName := d.FullName
		if displayName == "" {
			displayName = d.Username
		}

		items = append(items, models.UserProvisioningListResp{
			Id:             d.Id,
			Username:       d.Username,
			Email:          d.Email,
			FullName:       displayName,
			Status:         d.Status,
			Roles:          roles,
			WarehouseCount: warehouseCount,
			CreatedAt:      d.CreatedAt,
			CreatedBy:      d.CreatedBy,
			UpdatedAt:      d.UpdatedAt,
			UpdatedBy:      d.UpdatedBy,
		})
	}
	resp := hutils.BuildResponseContent(param, items, total)
	return resp, nil
}

// splitFullName splits a full name into firstName + lastName for Keycloak.
// First token = firstName, the rest = lastName.
func splitFullName(fullName string) (string, string) {
	fullName = strings.TrimSpace(fullName)
	if fullName == "" {
		return "", ""
	}
	parts := strings.SplitN(fullName, " ", 2)
	if len(parts) == 1 {
		return parts[0], ""
	}
	return parts[0], strings.TrimSpace(parts[1])
}

func (uc *UserProvisioningUseCasesImpl) GetById(id string) (*models.UserProvisioningDetailResp, *hmodels.UseCasesError) {
	if id == "" {
		return nil, hutils.BuildUseCasesError([]string{"body.id is required."}, http.StatusBadRequest, -1, "Failed")
	}

	repo := uc.allUseCases.Repository.GetAuthUserRepository()
	data, err := repo.FindByID(id)
	if err != nil {
		return nil, hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if data == nil {
		return nil, nil
	}

	// displayName dari sa_m_user.fullname (di-sync dari Keycloak saat login)
	displayName := data.FullName
	if displayName == "" {
		displayName = data.Username
	}

	resp := &models.UserProvisioningDetailResp{
		Id:         data.Id,
		Username:   data.Username,
		Email:      data.Email,
		FullName:   displayName,
		Status:     data.Status,
		KeycloakId: data.KeycloakId,
		CreatedAt:  data.CreatedAt,
		CreatedBy:  data.CreatedBy,
	}

	// Load roles
	userRoles, _ := uc.allUseCases.Repository.GetUserRoleRepository().FindByUserId(data.Id)
	for _, ur := range userRoles {
		role, err := uc.allUseCases.Repository.GetRoleRepository().FindByID(ur.RoleId)
		if err == nil && role != nil {
			resp.Roles = append(resp.Roles, models.UserProvRoleResp{
				Id:       role.Id,
				Code:     role.Code,
				Name:     role.Name,
				IsSystem: role.IsSystem,
			})
		}
	}
	if resp.Roles == nil {
		resp.Roles = []models.UserProvRoleResp{}
	}

	// Load scopes (warehouses + owners)
	userWarehouses, _ := uc.allUseCases.Repository.GetUserWarehouseRepository().FindByUserID(data.Id)
	for _, uw := range userWarehouses {
		warehouseName := uw.WarehouseName
		if warehouseName == "" {
			warehouseName = uw.WarehouseId
		}
		resp.Warehouses = append(resp.Warehouses, models.UserProvWarehouseResp{
			Id:            uw.Id,
			WarehouseId:   uw.WarehouseId,
			WarehouseName: warehouseName,
		})
	}
	if resp.Warehouses == nil {
		resp.Warehouses = []models.UserProvWarehouseResp{}
	}
	userOwners, _ := uc.allUseCases.Repository.GetUserOwnerRepository().FindByUserID(data.Id)
	for _, uo := range userOwners {
		resp.Owners = append(resp.Owners, models.UserProvOwnerResp{
			Id:        uo.Id,
			OwnerId:   uo.OwnerId,
			OwnerName: uo.OwnerName,
		})
	}
	if resp.Owners == nil {
		resp.Owners = []models.UserProvOwnerResp{}
	}

	// Count active sessions
	sessions, _ := uc.allUseCases.Repository.GetSessionRepository().FindActiveByUserId(data.Id)
	resp.ActiveSessions = len(sessions)

	// Get last login time from sa_t_login_event
	lastLogin, _ := uc.allUseCases.Repository.GetLoginEventRepository().FindLastLoginByUsername(data.Username)
	if lastLogin != nil {
		resp.LastLoginAt = &lastLogin.OccurredAt
	}

	return resp, nil
}

func (uc *UserProvisioningUseCasesImpl) ResetPassword(params models.UserProvisioningReq) *hmodels.UseCasesError {
	if params.Id == "" {
		return hutils.BuildUseCasesError([]string{"body.id is required."}, http.StatusBadRequest, -1, "Failed")
	}
	if params.Password == "" {
		return hutils.BuildUseCasesError([]string{"body.password is required."}, http.StatusBadRequest, -1, "Failed")
	}

	repo := uc.allUseCases.Repository.GetAuthUserRepository()
	existing, err := repo.FindByID(params.Id)
	if err != nil {
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if existing == nil {
		return hutils.BuildUseCasesError([]string{"User not found."}, http.StatusBadRequest, -1, "Failed")
	}

	kcAdmin := utils.GetKeycloakAdmin()
	if err := kcAdmin.ResetPassword(existing.KeycloakId, params.Password, false); err != nil {
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Keycloak Error.")
	}

	return nil
}
