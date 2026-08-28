package usecases

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"bitbucket.org/log-tech/helper-go/hlogger"
	"bitbucket.org/log-tech/helper-go/hmodels"
	"bitbucket.org/log-tech/helper-go/hutils"
	"bitbucket.org/log-tech/polaris-smart-access-service/constants"
	"bitbucket.org/log-tech/polaris-smart-access-service/data-access/repository"
	"bitbucket.org/log-tech/polaris-smart-access-service/models"
	"github.com/google/uuid"
)

type RoleUseCasesImpl struct {
	allUseCases *AllUseCasesImpl
}

func NewRoleUseCases(allUc *AllUseCasesImpl) *RoleUseCasesImpl {
	return &RoleUseCasesImpl{allUseCases: allUc}
}

func (uc *RoleUseCasesImpl) validationReq(params models.RoleReq, actionType string) []string {
	var errMsg []string
	if actionType == constants.ActionAdd {
		if len(params.Code) == 0 {
			errMsg = append(errMsg, "body.code is required.")
		}
		if len(params.Name) == 0 {
			errMsg = append(errMsg, "body.name is required.")
		}
		if len(params.CreatedBy) == 0 {
			errMsg = append(errMsg, "createdBy is required.")
		}
	}
	if actionType == constants.ActionUpdate {
		if len(params.Id) == 0 {
			errMsg = append(errMsg, "body.id is required.")
		}
		if len(params.Name) == 0 {
			errMsg = append(errMsg, "body.name is required.")
		}
		if len(params.UpdatedBy) == 0 {
			errMsg = append(errMsg, "updatedBy is required.")
		}
	}
	if actionType == constants.ActionDelete {
		if len(params.Id) == 0 {
			errMsg = append(errMsg, "body.id is required.")
		}
		if len(params.DeletedBy) == 0 {
			errMsg = append(errMsg, "deletedBy is required.")
		}
	}
	return errMsg
}

func (uc *RoleUseCasesImpl) Save(params models.RoleReq) (*models.RoleListResp, *hmodels.UseCasesError) {
	errMsg := uc.validationReq(params, constants.ActionAdd)
	if len(errMsg) > 0 {
		return nil, hutils.BuildUseCasesError(errMsg, http.StatusBadRequest, -1, "Failed")
	}

	// Check duplicate code
	existing, err := uc.allUseCases.Repository.GetRoleRepository().FindByCode(params.Code)
	if err != nil {
		return nil, hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if existing != nil {
		return nil, hutils.BuildUseCasesError([]string{fmt.Sprintf("Role code '%s' already exists.", params.Code)}, http.StatusBadRequest, -1, "Failed")
	}

	// Validate permission IDs
	if len(params.PermissionIds) > 0 {
		invalidIds := uc.validatePermissionIds(params.PermissionIds)
		if len(invalidIds) > 0 {
			hlogger.Log.Errorf("Role validation failed: invalid permission IDs: %v", invalidIds)
			return nil, hutils.BuildUseCasesError([]string{fmt.Sprintf("Invalid permission IDs: %v", invalidIds)}, http.StatusBadRequest, -1, "Failed")
		}
	}

	id, _ := uuid.NewV7()
	now := time.Now()
	entity := &repository.Role{
		Id:          id.String(),
		Code:        params.Code,
		Name:        params.Name,
		Description: sql.NullString{String: params.Description, Valid: len(params.Description) > 0},
		IsSystem:    false,
		Status:      "ACTIVE",
		IsDeleted:   false,
		CreatedBy:   params.CreatedBy,
		CreatedAt:   now,
		UpdatedBy:   params.CreatedBy,
		UpdatedAt:   now,
	}

	if err := uc.allUseCases.Repository.GetRoleRepository().Save(entity); err != nil {
		hlogger.Log.Errorf("Could not save role: %+v error: %+v", params, err)
		return nil, hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	// Save role-permission mappings
	uc.savePermissions(entity.Id, params.PermissionIds, params.CreatedBy)

	// Increment role version for stale detection
	uc.allUseCases.Resolve.IncrementRoleVersion()

	resp := uc.toRoleResp(entity)
	uc.allUseCases.SendAuditTrail(params.CreatedBy, now, constants.KeyCreate, "Role", nil, resp)
	return resp, nil
}

func (uc *RoleUseCasesImpl) Update(params models.RoleReq) (*models.RoleListResp, *hmodels.UseCasesError) {
	errMsg := uc.validationReq(params, constants.ActionUpdate)
	if len(errMsg) > 0 {
		return nil, hutils.BuildUseCasesError(errMsg, http.StatusBadRequest, -1, "Failed")
	}

	existing, err := uc.allUseCases.Repository.GetRoleRepository().FindByID(params.Id)
	if err != nil {
		return nil, hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if existing == nil {
		return nil, hutils.BuildUseCasesError([]string{"Role not found."}, http.StatusBadRequest, -1, "Failed")
	}

	// System roles cannot be modified
	if existing.IsSystem {
		return nil, hutils.BuildUseCasesError([]string{"System roles cannot be modified."}, http.StatusForbidden, -1, "Failed")
	}

	// Validate permission IDs
	if len(params.PermissionIds) > 0 {
		invalidIds := uc.validatePermissionIds(params.PermissionIds)
		if len(invalidIds) > 0 {
			hlogger.Log.Errorf("Role validation failed: invalid permission IDs: %v", invalidIds)
			return nil, hutils.BuildUseCasesError([]string{fmt.Sprintf("Invalid permission IDs: %v", invalidIds)}, http.StatusBadRequest, -1, "Failed")
		}
	}

	oldData := uc.toRoleResp(existing)

	existing.Name = params.Name
	if len(params.Description) > 0 {
		existing.Description = sql.NullString{String: params.Description, Valid: true}
	}
	if len(params.Status) > 0 {
		existing.Status = params.Status
	}
	existing.UpdatedBy = params.UpdatedBy
	existing.UpdatedAt = time.Now()

	if err := uc.allUseCases.Repository.GetRoleRepository().Update(existing); err != nil {
		hlogger.Log.Errorf("Could not update role: %+v error: %+v", params, err)
		return nil, hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	// Re-save permissions (delete old, insert new)
	if params.PermissionIds != nil {
		uc.deletePermissionsByRoleId(existing.Id, params.UpdatedBy)
		uc.savePermissions(existing.Id, params.PermissionIds, params.UpdatedBy)
	}

	// Increment role version for stale detection
	uc.allUseCases.Resolve.IncrementRoleVersion()

	resp := uc.toRoleResp(existing)
	uc.allUseCases.SendAuditTrail(params.UpdatedBy, time.Now(), constants.KeyUpdate, "Role", oldData, resp)
	return resp, nil
}

func (uc *RoleUseCasesImpl) Delete(params models.RoleReq) *hmodels.UseCasesError {
	errMsg := uc.validationReq(params, constants.ActionDelete)
	if len(errMsg) > 0 {
		return hutils.BuildUseCasesError(errMsg, http.StatusBadRequest, -1, "Failed")
	}

	existing, err := uc.allUseCases.Repository.GetRoleRepository().FindByID(params.Id)
	if err != nil {
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if existing == nil {
		return hutils.BuildUseCasesError([]string{"Role not found."}, http.StatusBadRequest, -1, "Failed")
	}

	// System roles cannot be deleted
	if existing.IsSystem {
		return hutils.BuildUseCasesError([]string{"System roles cannot be deleted."}, http.StatusForbidden, -1, "Failed")
	}

	oldData := uc.toRoleResp(existing)
	existing.DeletedBy = sql.NullString{String: params.DeletedBy, Valid: true}

	if err := uc.allUseCases.Repository.GetRoleRepository().Delete(existing); err != nil {
		hlogger.Log.Errorf("Could not delete role: %+v error: %+v", params, err)
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	// Increment role version for stale detection
	uc.allUseCases.Resolve.IncrementRoleVersion()

	uc.allUseCases.SendAuditTrail(params.DeletedBy, time.Now(), constants.KeyDelete, "Role", oldData, nil)
	return nil
}

func (uc *RoleUseCasesImpl) GetById(id string) (*models.RoleDetailResp, *hmodels.UseCasesError) {
	if len(id) == 0 {
		return nil, hutils.BuildUseCasesError([]string{"body.id is required."}, http.StatusBadRequest, -1, "Failed")
	}
	data, err := uc.allUseCases.Repository.GetRoleRepository().FindByID(id)
	if err != nil {
		return nil, hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if data == nil {
		return nil, hutils.BuildUseCasesError([]string{"Role not found."}, http.StatusBadRequest, -1, "Failed")
	}
	detail := &models.RoleDetailResp{
		Id:          data.Id,
		Code:        data.Code,
		Name:        data.Name,
		Description: data.Description.String,
		IsSystem:    data.IsSystem,
		Status:      data.Status,
		Permissions: uc.loadPermissions(data.Id),
		UserCount:   uc.countUserByRoleId(data.Id),
		CreatedBy:   data.CreatedBy,
		CreatedAt:   data.CreatedAt,
		UpdatedBy:   data.UpdatedBy,
		UpdatedAt:   data.UpdatedAt,
	}
	return detail, nil
}

func (uc *RoleUseCasesImpl) Search(param hmodels.SearchRequest) (*hmodels.ResponseContent, *hmodels.UseCasesError) {
	if param.Paging.PageSize == 0 {
		param.Paging.PageSize = 25
	}
	if param.Paging.PageSize > 100 {
		param.Paging.PageSize = 100
	}
	if param.Paging.Page == 0 {
		param.Paging.Page = 1
	}

	data, totalData, err := uc.allUseCases.Repository.GetRoleRepository().FindBy(param)
	if err != nil {
		return nil, hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	resp := hutils.BuildResponseContent(param, hutils.ArrayStructToArrayInterface(uc.toArrayRoleResp(data)), totalData)
	return resp, nil
}

func (uc *RoleUseCasesImpl) toRoleResp(entity *repository.Role) *models.RoleListResp {
	return &models.RoleListResp{
		Id:              entity.Id,
		Code:            entity.Code,
		Name:            entity.Name,
		Description:     entity.Description.String,
		IsSystem:        entity.IsSystem,
		Status:          entity.Status,
		PermissionCount: uc.countPermissions(entity.Id),
		UserCount:       uc.countUserByRoleId(entity.Id),
		CreatedBy:       entity.CreatedBy,
		CreatedAt:       entity.CreatedAt,
		UpdatedBy:       entity.UpdatedBy,
		UpdatedAt:       entity.UpdatedAt,
	}
}

func (uc *RoleUseCasesImpl) toArrayRoleResp(entities []repository.Role) []*models.RoleListResp {
	resp := make([]*models.RoleListResp, 0, len(entities))
	for _, entity := range entities {
		resp = append(resp, uc.toRoleResp(&entity))
	}
	return resp
}

func (uc *RoleUseCasesImpl) GetByUniqueKey(name string) (*models.RoleListResp, *hmodels.UseCasesError) {
	data, err := uc.allUseCases.Repository.GetRoleRepository().FindByCode(name)
	if err != nil {
		return nil, hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if data == nil {
		return nil, nil
	}
	return uc.toRoleResp(data), nil
}

// validatePermissionIds — ensure all permissionIds exist; returns list of invalid ids.
func (uc *RoleUseCasesImpl) validatePermissionIds(permissionIds []string) []string {
	permRepo := uc.allUseCases.Repository.GetPermissionRepository()
	var invalid []string
	for _, permId := range permissionIds {
		perm, err := permRepo.FindByID(permId)
		if err != nil || perm == nil {
			invalid = append(invalid, permId)
		}
	}
	return invalid
}

func (uc *RoleUseCasesImpl) savePermissions(roleId string, permissionIds []string, createdBy string) {
	if len(permissionIds) == 0 {
		return
	}
	repo := uc.allUseCases.Repository.GetRolePermissionRepository()
	for _, permId := range permissionIds {
		// If a mapping already exists (even soft-deleted), reactivate it to avoid
		// hitting the (role_id, permission_id) unique constraint on re-insert.
		existing, err := repo.FindAnyByUniqueKey(roleId, permId)
		if err != nil {
			hlogger.Log.Errorf("savePermissions: lookup failed for roleId %s, permId %s: %v", roleId, permId, err)
			continue
		}
		if existing != nil {
			if existing.IsDeleted {
				if err := repo.Reactivate(existing.Id, createdBy); err != nil {
					hlogger.Log.Errorf("Could not reactivate role-permission %s: %v", existing.Id, err)
				}
			}
			continue
		}
		entity := &repository.RolePermission{
			Id:           hutils.GenerateUUID(),
			RoleId:       roleId,
			PermissionId: permId,
			CreatedBy:    createdBy,
		}
		if err := repo.Save(entity); err != nil {
			hlogger.Log.Errorf("Could not save role-permission for roleId %s, permId %s: %v", roleId, permId, err)
		}
	}
}

func (uc *RoleUseCasesImpl) countPermissions(roleId string) int {
	perms, err := uc.allUseCases.Repository.GetRolePermissionRepository().FindByRoleId(roleId)
	if err != nil {
		return 0
	}
	return len(perms)
}

func (uc *RoleUseCasesImpl) loadPermissions(roleId string) []models.RolePermissionItemResp {
	rolePerms, err := uc.allUseCases.Repository.GetRolePermissionRepository().FindByRoleId(roleId)
	if err != nil {
		hlogger.Log.Errorf("Could not load permissions for roleId %s: %v", roleId, err)
		return []models.RolePermissionItemResp{}
	}
	result := make([]models.RolePermissionItemResp, 0, len(rolePerms))
	for _, rp := range rolePerms {
		perm, err := uc.allUseCases.Repository.GetPermissionRepository().FindByID(rp.PermissionId)
		if err != nil || perm == nil {
			continue
		}
		result = append(result, models.RolePermissionItemResp{
			Id:       perm.Id,
			Key:      perm.Key,
			Resource: perm.Resource,
			Action:   perm.Action,
		})
	}
	return result
}

func (uc *RoleUseCasesImpl) deletePermissionsByRoleId(roleId string, deletedBy string) {
	rolePerms, err := uc.allUseCases.Repository.GetRolePermissionRepository().FindByRoleId(roleId)
	if err != nil {
		hlogger.Log.Errorf("Could not find permissions to delete for roleId %s: %v", roleId, err)
		return
	}
	repo := uc.allUseCases.Repository.GetRolePermissionRepository()
	for _, rp := range rolePerms {
		rp.DeletedBy = sql.NullString{String: deletedBy, Valid: true}
		if err := repo.Delete(&rp); err != nil {
			hlogger.Log.Errorf("Could not delete role-permission %s: %v", rp.Id, err)
		}
	}
}

func (uc *RoleUseCasesImpl) countUserByRoleId(roleId string) int {
	count, err := uc.allUseCases.Repository.GetUserRoleRepository().CountByRoleId(roleId)
	if err != nil {
		hlogger.Log.Errorf("Could not count users for roleId %s: %v", roleId, err)
		return 0
	}
	return count
}
