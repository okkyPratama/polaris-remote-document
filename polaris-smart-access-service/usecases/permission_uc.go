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
)

type PermissionUseCasesImpl struct {
	allUseCases *AllUseCasesImpl
}

func NewPermissionUseCases(allUc *AllUseCasesImpl) *PermissionUseCasesImpl {
	return &PermissionUseCasesImpl{allUseCases: allUc}
}

func (uc *PermissionUseCasesImpl) Save(params models.PermissionReq) *hmodels.UseCasesError {
	var errMsg []string
	if len(params.Key) == 0 {
		errMsg = append(errMsg, "body.key is required.")
	}
	if len(params.Resource) == 0 {
		errMsg = append(errMsg, "body.resource is required.")
	}
	if len(params.Action) == 0 {
		errMsg = append(errMsg, "body.action is required.")
	}
	if len(errMsg) > 0 {
		return hutils.BuildUseCasesError(errMsg, http.StatusBadRequest, -1, "Failed")
	}

	repo := uc.allUseCases.Repository.GetPermissionRepository()
	existing, err := repo.FindByKey(params.Key)
	if err != nil {
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if existing != nil {
		return hutils.BuildUseCasesError([]string{fmt.Sprintf("Permission key '%s' already exists.", params.Key)}, http.StatusBadRequest, -1, "Failed")
	}

	now := time.Now()
	entity := &repository.Permission{
		Id:          hutils.GenerateUUID(),
		Key:         params.Key,
		Resource:    params.Resource,
		Action:      params.Action,
		Description: sql.NullString{String: params.Description, Valid: len(params.Description) > 0},
		Module:      sql.NullString{String: params.Module, Valid: len(params.Module) > 0},
		CreatedBy:   params.CreatedBy,
	}

	if err := repo.Save(entity); err != nil {
		hlogger.Log.Errorf("Permission.Save failed: %v", err)
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	uc.allUseCases.SendAuditTrail(params.CreatedBy, now, constants.KeyCreate, "Permission", nil, entity)
	return nil
}

func (uc *PermissionUseCasesImpl) Update(params models.PermissionReq) *hmodels.UseCasesError {
	var errMsg []string
	if len(params.Id) == 0 {
		errMsg = append(errMsg, "body.id is required.")
	}
	if len(params.Key) == 0 {
		errMsg = append(errMsg, "body.key is required.")
	}
	if len(params.Resource) == 0 {
		errMsg = append(errMsg, "body.resource is required.")
	}
	if len(params.Action) == 0 {
		errMsg = append(errMsg, "body.action is required.")
	}
	if len(errMsg) > 0 {
		return hutils.BuildUseCasesError(errMsg, http.StatusBadRequest, -1, "Failed")
	}

	repo := uc.allUseCases.Repository.GetPermissionRepository()
	existing, err := repo.FindByID(params.Id)
	if err != nil {
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if existing == nil {
		return hutils.BuildUseCasesError([]string{"Permission not found."}, http.StatusBadRequest, -1, "Failed")
	}

	// Check key uniqueness if changed
	if existing.Key != params.Key {
		dup, _ := repo.FindByKey(params.Key)
		if dup != nil {
			return hutils.BuildUseCasesError([]string{fmt.Sprintf("Permission key '%s' already exists.", params.Key)}, http.StatusBadRequest, -1, "Failed")
		}
	}

	now := time.Now()
	existing.Key = params.Key
	existing.Resource = params.Resource
	existing.Action = params.Action
	existing.Description = sql.NullString{String: params.Description, Valid: len(params.Description) > 0}
	existing.Module = sql.NullString{String: params.Module, Valid: len(params.Module) > 0}
	existing.UpdatedBy = params.UpdatedBy
	existing.UpdatedAt = now

	if err := repo.Update(existing); err != nil {
		hlogger.Log.Errorf("Permission.Update failed: %v", err)
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	uc.allUseCases.SendAuditTrail(params.UpdatedBy, now, constants.KeyUpdate, "Permission", nil, existing)
	return nil
}

func (uc *PermissionUseCasesImpl) Delete(params models.PermissionReq) *hmodels.UseCasesError {
	if len(params.Id) == 0 {
		return hutils.BuildUseCasesError([]string{"body.id is required."}, http.StatusBadRequest, -1, "Failed")
	}

	repo := uc.allUseCases.Repository.GetPermissionRepository()
	existing, err := repo.FindByID(params.Id)
	if err != nil {
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if existing == nil {
		return hutils.BuildUseCasesError([]string{"Permission not found."}, http.StatusBadRequest, -1, "Failed")
	}

	existing.DeletedBy = sql.NullString{String: params.DeletedBy, Valid: true}
	if err := repo.Delete(existing); err != nil {
		hlogger.Log.Errorf("Permission.Delete failed: %v", err)
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	uc.allUseCases.SendAuditTrail(params.DeletedBy, time.Now(), constants.KeyDelete, "Permission", existing, nil)
	return nil
}

func (uc *PermissionUseCasesImpl) GetById(id string) (*models.PermissionResp, *hmodels.UseCasesError) {
	if len(id) == 0 {
		return nil, hutils.BuildUseCasesError([]string{"body.id is required."}, http.StatusBadRequest, -1, "Failed")
	}

	repo := uc.allUseCases.Repository.GetPermissionRepository()
	data, err := repo.FindByID(id)
	if err != nil {
		return nil, hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if data == nil {
		return nil, nil
	}
	return uc.toResp(data), nil
}

func (uc *PermissionUseCasesImpl) Search(param hmodels.SearchRequest) (*hmodels.ResponseContent, *hmodels.UseCasesError) {
	if param.Paging.PageSize == 0 {
		param.Paging.PageSize = 25
	}
	if param.Paging.PageSize > 100 {
		param.Paging.PageSize = 100
	}
	if param.Paging.Page == 0 {
		param.Paging.Page = 1
	}

	repo := uc.allUseCases.Repository.GetPermissionRepository()
	data, total, err := repo.FindBy(param)
	if err != nil {
		return nil, hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	resp := hutils.BuildResponseContent(param, hutils.ArrayStructToArrayInterface(uc.toArrayResp(data)), total)
	return resp, nil
}

func (uc *PermissionUseCasesImpl) toResp(entity *repository.Permission) *models.PermissionResp {
	return &models.PermissionResp{
		Id:          entity.Id,
		Key:         entity.Key,
		Resource:    entity.Resource,
		Action:      entity.Action,
		Description: entity.Description.String,
		Module:      entity.Module.String,
		CreatedBy:   entity.CreatedBy,
		CreatedAt:   entity.CreatedAt,
		UpdatedBy:   entity.UpdatedBy,
		UpdatedAt:   entity.UpdatedAt,
	}
}

func (uc *PermissionUseCasesImpl) toArrayResp(entities []repository.Permission) []*models.PermissionResp {
	resp := make([]*models.PermissionResp, 0, len(entities))
	for _, e := range entities {
		resp = append(resp, uc.toResp(&e))
	}
	return resp
}
