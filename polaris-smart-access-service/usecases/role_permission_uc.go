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
)

type RolePermissionUseCasesImpl struct {
	allUseCases *AllUseCasesImpl
}

func NewRolePermissionUseCases(allUc *AllUseCasesImpl) *RolePermissionUseCasesImpl {
	return &RolePermissionUseCasesImpl{allUseCases: allUc}
}

func (uc *RolePermissionUseCasesImpl) Save(params models.RolePermissionReq) *hmodels.UseCasesError {
	if params.RoleId == "" {
		return hutils.BuildUseCasesError([]string{"body.roleId is required."}, http.StatusBadRequest, -1, "Failed")
	}
	if params.PermissionId == "" {
		return hutils.BuildUseCasesError([]string{"body.permissionId is required."}, http.StatusBadRequest, -1, "Failed")
	}

	repo := uc.allUseCases.Repository.GetRolePermissionRepository()

	// Validate role exists and is active
	role, err := uc.allUseCases.Repository.GetRoleRepository().FindByID(params.RoleId)
	if err != nil {
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if role == nil {
		return hutils.BuildUseCasesError([]string{"Role not found."}, http.StatusBadRequest, -1, "Failed")
	}
	if role.Status != "ACTIVE" {
		return hutils.BuildUseCasesError([]string{"Role is not active."}, http.StatusBadRequest, -1, "Failed")
	}

	// Validate permission exists and is not deleted
	perm, err := uc.allUseCases.Repository.GetPermissionRepository().FindByID(params.PermissionId)
	if err != nil {
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if perm == nil {
		return hutils.BuildUseCasesError([]string{"Permission not found."}, http.StatusBadRequest, -1, "Failed")
	}

	// Check duplicate
	existing, err := repo.FindByUniqueKey(params.RoleId, params.PermissionId)
	if err != nil {
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if existing != nil {
		return hutils.BuildUseCasesError([]string{"Role-permission mapping already exists."}, http.StatusBadRequest, -1, "Failed")
	}

	now := time.Now()
	entity := &repository.RolePermission{
		Id:           hutils.GenerateUUID(),
		RoleId:       params.RoleId,
		PermissionId: params.PermissionId,
		CreatedBy:    params.CreatedBy,
	}

	if err := repo.Save(entity); err != nil {
		hlogger.Log.Errorf("RolePermission.Save failed: %v", err)
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	uc.allUseCases.SendAuditTrail(params.CreatedBy, now, constants.KeyCreate, "RolePermission", nil, entity)
	return nil
}

func (uc *RolePermissionUseCasesImpl) Update(params models.RolePermissionReq) *hmodels.UseCasesError {
	if params.Id == "" {
		return hutils.BuildUseCasesError([]string{"body.id is required."}, http.StatusBadRequest, -1, "Failed")
	}
	if params.RoleId == "" {
		return hutils.BuildUseCasesError([]string{"body.roleId is required."}, http.StatusBadRequest, -1, "Failed")
	}
	if params.PermissionId == "" {
		return hutils.BuildUseCasesError([]string{"body.permissionId is required."}, http.StatusBadRequest, -1, "Failed")
	}

	repo := uc.allUseCases.Repository.GetRolePermissionRepository()
	existing, err := repo.FindByID(params.Id)
	if err != nil {
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if existing == nil {
		return hutils.BuildUseCasesError([]string{"Data not found."}, http.StatusBadRequest, -1, "Failed")
	}

	now := time.Now()
	existing.RoleId = params.RoleId
	existing.PermissionId = params.PermissionId
	existing.UpdatedBy = params.UpdatedBy
	existing.UpdatedAt = now

	if err := repo.Update(existing); err != nil {
		hlogger.Log.Errorf("RolePermission.Update failed: %v", err)
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	uc.allUseCases.SendAuditTrail(params.UpdatedBy, now, constants.KeyUpdate, "RolePermission", nil, existing)
	return nil
}

func (uc *RolePermissionUseCasesImpl) Delete(params models.RolePermissionReq) *hmodels.UseCasesError {
	if params.Id == "" {
		return hutils.BuildUseCasesError([]string{"body.id is required."}, http.StatusBadRequest, -1, "Failed")
	}

	repo := uc.allUseCases.Repository.GetRolePermissionRepository()
	existing, err := repo.FindByID(params.Id)
	if err != nil {
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if existing == nil {
		return hutils.BuildUseCasesError([]string{"Data not found."}, http.StatusBadRequest, -1, "Failed")
	}

	existing.DeletedBy = sql.NullString{String: params.DeletedBy, Valid: true}
	if err := repo.Delete(existing); err != nil {
		hlogger.Log.Errorf("RolePermission.Delete failed: %v", err)
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	uc.allUseCases.SendAuditTrail(params.DeletedBy, time.Now(), constants.KeyDelete, "RolePermission", existing, nil)
	return nil
}

func (uc *RolePermissionUseCasesImpl) GetById(id string) (*models.RolePermissionResp, *hmodels.UseCasesError) {
	repo := uc.allUseCases.Repository.GetRolePermissionRepository()
	data, err := repo.FindByID(id)
	if err != nil {
		return nil, hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if data == nil {
		return nil, nil
	}
	return uc.toResp(data), nil
}

func (uc *RolePermissionUseCasesImpl) Search(param hmodels.SearchRequest) (*hmodels.ResponseContent, *hmodels.UseCasesError) {
	if param.Paging.PageSize == 0 {
		param.Paging.PageSize = 25
	}
	if param.Paging.PageSize > 100 {
		param.Paging.PageSize = 100
	}
	if param.Paging.Page == 0 {
		param.Paging.Page = 1
	}

	repo := uc.allUseCases.Repository.GetRolePermissionRepository()
	data, total, err := repo.FindBy(param)
	if err != nil {
		return nil, hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	resp := hutils.BuildResponseContent(param, hutils.ArrayStructToArrayInterface(uc.toArrayResp(data)), total)
	return resp, nil
}

func (uc *RolePermissionUseCasesImpl) toResp(entity *repository.RolePermission) *models.RolePermissionResp {
	return &models.RolePermissionResp{
		Id:           entity.Id,
		RoleId:       entity.RoleId,
		PermissionId: entity.PermissionId,
		CreatedBy:    entity.CreatedBy,
		CreatedAt:    entity.CreatedAt,
		UpdatedBy:    entity.UpdatedBy,
		UpdatedAt:    entity.UpdatedAt,
	}
}

func (uc *RolePermissionUseCasesImpl) toArrayResp(entities []repository.RolePermission) []*models.RolePermissionResp {
	resp := make([]*models.RolePermissionResp, 0, len(entities))
	for _, e := range entities {
		resp = append(resp, uc.toResp(&e))
	}
	return resp
}
