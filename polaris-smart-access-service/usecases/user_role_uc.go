package usecases

import (
	"database/sql"
	"net/http"
	"time"

	"bitbucket.org/log-tech/helper-go/hlogger"
	"bitbucket.org/log-tech/helper-go/hmodels"
	"bitbucket.org/log-tech/helper-go/hutils"
	"bitbucket.org/log-tech/polaris-smart-access-service/constants"
	"bitbucket.org/log-tech/polaris-smart-access-service/data-access/repository"
	"bitbucket.org/log-tech/polaris-smart-access-service/models"
	"gorm.io/gorm"
)

type UserRoleUseCasesImpl struct {
	allUseCases *AllUseCasesImpl
}

func NewUserRoleUseCases(allUc *AllUseCasesImpl) *UserRoleUseCasesImpl {
	return &UserRoleUseCasesImpl{allUseCases: allUc}
}

func (uc *UserRoleUseCasesImpl) Save(params models.UserRoleReq) *hmodels.UseCasesError {
	if params.UserId == "" {
		return hutils.BuildUseCasesError([]string{"body.userId is required."}, http.StatusBadRequest, -1, "Failed")
	}
	if len(params.RoleIds) == 0 {
		return hutils.BuildUseCasesError([]string{"body.roleIds is required."}, http.StatusBadRequest, -1, "Failed")
	}

	repo := uc.allUseCases.Repository.GetUserRoleRepository()
	roleRepo := uc.allUseCases.Repository.GetRoleRepository()
	now := time.Now()

	for _, roleId := range params.RoleIds {
		// Validate role exists and is active
		role, err := roleRepo.FindByID(roleId)
		if err != nil {
			return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
		}
		if role == nil {
			hlogger.Log.Warnf("UserRole.Save: role %s not found, skipping", roleId)
			continue
		}
		if role.Status != "ACTIVE" {
			hlogger.Log.Warnf("UserRole.Save: role %s is not active, skipping", roleId)
			continue
		}

		// Check if already assigned (active)
		existing, err := repo.FindByUniqueKey(params.UserId, roleId)
		if err != nil {
			return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
		}
		if existing != nil {
			continue // already assigned, skip
		}

		// Check if soft-deleted record exists — reactivate instead of insert (avoid unique constraint violation)
		var softDeletedRecord repository.UserRole
		err = repo.Db.
			Where("user_id = ? AND role_id = ? AND is_deleted = true", params.UserId, roleId).
			First(&softDeletedRecord).Error

		if err == nil {
			// Soft-deleted record exists — reactivate it
			softDeletedRecord.IsDeleted = false
			softDeletedRecord.DeletedBy = sql.NullString{}
			softDeletedRecord.DeletedAt = sql.NullTime{}
			softDeletedRecord.UpdatedBy = params.CreatedBy
			softDeletedRecord.UpdatedAt = now
			if err := repo.Update(&softDeletedRecord); err != nil {
				hlogger.Log.Errorf("UserRole.Save: failed to reactivate soft-deleted role %s: %v", roleId, err)
				return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
			}
			continue
		} else if err != gorm.ErrRecordNotFound {
			// Actual database error (not "not found")
			hlogger.Log.Errorf("UserRole.Save: error checking soft-deleted role %s: %v", roleId, err)
			return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
		}
		// If ErrRecordNotFound, proceed to create new record below

		// No existing record — create new
		entity := &repository.UserRole{
			Id:        hutils.GenerateUUID(),
			UserId:    params.UserId,
			RoleId:    roleId,
			CreatedBy: params.CreatedBy,
		}
		if err := repo.Save(entity); err != nil {
			hlogger.Log.Errorf("UserRole.Save failed for roleId %s: %v", roleId, err)
			return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
		}
	}

	// TAMBAH DISINI: Invalidate semua session user saat role diassign (S1-007 AC-1.2.9)
	go func() {
		defer func() {
			if r := recover(); r != nil {
				hlogger.Log.Errorf("UserRole.Save invalidation panic: %v", r)
			}
		}()
		if err := uc.allUseCases.Resolve.InvalidateAllUserSessions(params.UserId, params.CreatedBy); err != nil {
			hlogger.Log.Errorf("UserRole.Save: failed to invalidate sessions: %v", err)
		}
	}()

	uc.allUseCases.SendAuditTrail(params.CreatedBy, now, constants.KeyCreate, "UserRole", nil, params)
	return nil
}

func (uc *UserRoleUseCasesImpl) Delete(params models.UserRoleReq) *hmodels.UseCasesError {
	if params.UserId == "" {
		return hutils.BuildUseCasesError([]string{"body.userId is required."}, http.StatusBadRequest, -1, "Failed")
	}
	if len(params.RoleIds) == 0 {
		return hutils.BuildUseCasesError([]string{"body.roleIds is required."}, http.StatusBadRequest, -1, "Failed")
	}

	repo := uc.allUseCases.Repository.GetUserRoleRepository()

	for _, roleId := range params.RoleIds {
		existing, err := repo.FindByUniqueKey(params.UserId, roleId)
		if err != nil {
			return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
		}
		if existing == nil {
			continue
		}
		existing.DeletedBy = sql.NullString{String: params.DeletedBy, Valid: true}
		if err := repo.Delete(existing); err != nil {
			hlogger.Log.Errorf("UserRole.Delete failed for roleId %s: %v", roleId, err)
			return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
		}
	}

	// TAMBAH DISINI: Invalidate semua session user saat role dihapus (S1-007 AC-1.2.9)
	go func() {
		defer func() {
			if r := recover(); r != nil {
				hlogger.Log.Errorf("UserRole.Delete invalidation panic: %v", r)
			}
		}()
		if err := uc.allUseCases.Resolve.InvalidateAllUserSessions(params.UserId, params.DeletedBy); err != nil {
			hlogger.Log.Errorf("UserRole.Delete: failed to invalidate sessions: %v", err)
		}
	}()

	uc.allUseCases.SendAuditTrail(params.DeletedBy, time.Now(), constants.KeyDelete, "UserRole", params, nil)
	return nil
}

func (uc *UserRoleUseCasesImpl) Update(params models.UserRoleReq) *hmodels.UseCasesError {
	if params.UserId == "" {
		return hutils.BuildUseCasesError([]string{"body.userId is required."}, http.StatusBadRequest, -1, "Failed")
	}
	if len(params.RoleIds) == 0 {
		return hutils.BuildUseCasesError([]string{"body.roleIds is required."}, http.StatusBadRequest, -1, "Failed")
	}

	repo := uc.allUseCases.Repository.GetUserRoleRepository()
	roleRepo := uc.allUseCases.Repository.GetRoleRepository()

	// Get current role assignments
	current, err := repo.FindByUserId(params.UserId)
	if err != nil {
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	// Build desired set
	desiredMap := make(map[string]bool)
	for _, roleId := range params.RoleIds {
		desiredMap[roleId] = true
	}

	// Remove roles no longer in desired set
	for _, ur := range current {
		if !desiredMap[ur.RoleId] {
			ur.DeletedBy = sql.NullString{String: params.UpdatedBy, Valid: true}
			if err := repo.Delete(&ur); err != nil {
				hlogger.Log.Errorf("UserRole.Update: delete role %s failed: %v", ur.RoleId, err)
			}
		}
	}

	// Add new roles
	now := time.Now()
	for _, roleId := range params.RoleIds {
		// Validate role exists and is active
		role, err := roleRepo.FindByID(roleId)
		if err != nil {
			return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
		}
		if role == nil {
			hlogger.Log.Warnf("UserRole.Update: role %s not found, skipping", roleId)
			continue
		}
		if role.Status != "ACTIVE" {
			hlogger.Log.Warnf("UserRole.Update: role %s is not active, skipping", roleId)
			continue
		}

		// Check if already exists (active)
		existing, err := repo.FindByUniqueKey(params.UserId, roleId)
		if err != nil {
			return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
		}
		if existing != nil {
			continue // already assigned, skip
		}

		// Check if soft-deleted record exists — reactivate instead of insert
		var softDeletedRecord repository.UserRole
		err = repo.Db.
			Where("user_id = ? AND role_id = ? AND is_deleted = true", params.UserId, roleId).
			First(&softDeletedRecord).Error

		if err == nil {
			// Soft-deleted record exists — reactivate it
			softDeletedRecord.IsDeleted = false
			softDeletedRecord.DeletedBy = sql.NullString{}
			softDeletedRecord.DeletedAt = sql.NullTime{}
			softDeletedRecord.UpdatedBy = params.UpdatedBy
			softDeletedRecord.UpdatedAt = now
			if err := repo.Update(&softDeletedRecord); err != nil {
				hlogger.Log.Errorf("UserRole.Update: failed to reactivate soft-deleted role %s: %v", roleId, err)
				return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
			}
			continue
		} else if err != gorm.ErrRecordNotFound {
			// Actual database error
			hlogger.Log.Errorf("UserRole.Update: error checking soft-deleted role %s: %v", roleId, err)
			return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
		}
		// If ErrRecordNotFound, proceed to create new record

		// No existing record — create new
		entity := &repository.UserRole{
			Id:        hutils.GenerateUUID(),
			UserId:    params.UserId,
			RoleId:    roleId,
			CreatedBy: params.UpdatedBy,
		}
		if err := repo.Save(entity); err != nil {
			hlogger.Log.Errorf("UserRole.Update: save role %s failed: %v", roleId, err)
			return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
		}
	}

	uc.allUseCases.SendAuditTrail(params.UpdatedBy, now, constants.KeyUpdate, "UserRole", nil, params)
	return nil
}

func (uc *UserRoleUseCasesImpl) GetById(id string) (*models.UserRoleResp, *hmodels.UseCasesError) {
	repo := uc.allUseCases.Repository.GetUserRoleRepository()
	data, err := repo.FindByID(id)
	if err != nil {
		return nil, hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if data == nil {
		return nil, nil
	}
	return uc.toResp(data), nil
}

func (uc *UserRoleUseCasesImpl) Search(param hmodels.SearchRequest) (*hmodels.ResponseContent, *hmodels.UseCasesError) {
	if param.Paging.PageSize == 0 {
		param.Paging.PageSize = 25
	}
	if param.Paging.PageSize > 100 {
		param.Paging.PageSize = 100
	}
	if param.Paging.Page == 0 {
		param.Paging.Page = 1
	}

	repo := uc.allUseCases.Repository.GetUserRoleRepository()
	data, total, err := repo.FindBy(param)
	if err != nil {
		return nil, hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	resp := hutils.BuildResponseContent(param, hutils.ArrayStructToArrayInterface(uc.toArrayResp(data)), total)
	return resp, nil
}

func (uc *UserRoleUseCasesImpl) toResp(entity *repository.UserRole) *models.UserRoleResp {
	return &models.UserRoleResp{
		Id:        entity.Id,
		UserId:    entity.UserId,
		RoleId:    entity.RoleId,
		CreatedBy: entity.CreatedBy,
		CreatedAt: entity.CreatedAt,
		UpdatedBy: entity.UpdatedBy,
		UpdatedAt: entity.UpdatedAt,
	}
}

func (uc *UserRoleUseCasesImpl) toArrayResp(entities []repository.UserRole) []*models.UserRoleResp {
	resp := make([]*models.UserRoleResp, 0, len(entities))
	for _, e := range entities {
		resp = append(resp, uc.toResp(&e))
	}
	return resp
}
