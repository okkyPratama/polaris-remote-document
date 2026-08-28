package usecases

import (
	"context"
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

type RoleApiUseCasesImpl struct {
	allUseCases *AllUseCasesImpl
}

func NewRoleApiUseCases(allUc *AllUseCasesImpl) *RoleApiUseCasesImpl {
	return &RoleApiUseCasesImpl{
		allUseCases: allUc,
	}
}

func (uc *RoleApiUseCasesImpl) validationReq(params models.RoleApiReq, actionType string) []string {
	var errMsg []string
	if actionType == constants.ActionDelete {
		if len(params.Id) == 0 {
			errMsg = append(errMsg, "id is required")
		}
		if len(params.RoleName) == 0 {
			errMsg = append(errMsg, "role name is required")
		}
		if len(params.DeletedBy) == 0 {
			errMsg = append(errMsg, "deleted by is required")
		}
	}
	if actionType == constants.ActionAdd {
		if len(params.RoleName) == 0 {
			errMsg = append(errMsg, "role name is required")
		}
		if len(params.HttpMethod) == 0 {
			errMsg = append(errMsg, "http method is required")
		}
		if len(params.HttpEndpoint) == 0 {
			errMsg = append(errMsg, "http endpoint is required")
		}
		if len(params.CreatedBy) == 0 {
			errMsg = append(errMsg, "created by is required")
		}
	}
	if actionType == constants.ActionUpdate {
		if len(params.Id) == 0 {
			errMsg = append(errMsg, "id is required")
		}
		if len(params.RoleName) == 0 {
			errMsg = append(errMsg, "role name is required")
		}
		if len(params.HttpMethod) == 0 {
			errMsg = append(errMsg, "http method is required")
		}
		if len(params.HttpEndpoint) == 0 {
			errMsg = append(errMsg, "http endpoint is required")
		}
		if len(params.UpdatedBy) == 0 {
			errMsg = append(errMsg, "updated by is required")
		}

	}
	return errMsg
}

func (uc *RoleApiUseCasesImpl) Save(params models.RoleApiReq) *hmodels.UseCasesError {

	errMsg := uc.validationReq(params, constants.ActionAdd)
	if len(errMsg) > 0 {
		return hutils.BuildUseCasesError(errMsg, http.StatusBadRequest, -1, "Failed")
	}

	now := time.Now()
	roleUc := uc.allUseCases.Role
	roleApiRepo := uc.allUseCases.Repository.RoleApiRepository()
	redis := uc.allUseCases.Helper.GetRedisClient()

	role, respUc := roleUc.GetByUniqueKey(params.RoleName)

	if respUc != nil {
		return respUc
	}
	if role == nil {
		return hutils.BuildUseCasesError(append(errMsg, "role does not exist"), http.StatusBadRequest, -1, "Failed")
	}
	if role.Status != "ACTIVE" {
		return hutils.BuildUseCasesError(append(errMsg, "role is not active, please activate first."), http.StatusBadRequest, -1, "Failed")
	}
	oldData, err := roleApiRepo.FindByUniqueKey(params.RoleName, params.HttpMethod, params.HttpEndpoint)
	if err != nil {
		hlogger.Log.Errorf("Could not find role apis by unique key: %+v error:%+v", params, err)
		return hutils.BuildUseCasesError(append(errMsg, err.Error()), http.StatusInternalServerError, -100006, "Database Error")
	}
	if oldData != nil {
		return hutils.BuildUseCasesError(append(errMsg, fmt.Sprintf("Duplicate data for rolename: %s, method: %s, endpoint: %s", params.RoleName, params.HttpMethod, params.HttpEndpoint)), http.StatusBadRequest, -1, "Failed")
	}

	params.Id = hutils.GenerateUUID()
	newData := &repository.RoleApi{
		Id:           params.Id,
		RoleName:     params.RoleName,
		ServiceName:  params.ServiceName,
		Description:  params.Description,
		HttpMethod:   params.HttpMethod,
		HttpEndpoint: params.HttpEndpoint,
		IsActive:     true,
		CreatedBy:    params.CreatedBy,
		CreatedAt:    now,
		UpdatedBy:    params.CreatedBy,
		UpdatedAt:    now,
		DeletedBy:    sql.NullString{Valid: false},
		DeletedAt:    sql.NullTime{Valid: false},
	}

	cacheKey := hutils.GenerateCacheKey(constants.KeyCacheRoleApiId, params.Id)
	err = roleApiRepo.Save(newData)
	if err != nil {
		hlogger.Log.Errorf("Could not save req: %+v to data: %+v", params, err)
		return hutils.BuildUseCasesError(append(errMsg, err.Error()), http.StatusInternalServerError, -100006, "Database Error")
	}
	//err = uc.redis.Set(context.Background(), cacheKey, uc.toRoleApiResp(dataForAdd), 1*time.Minute)
	newDataResp := uc.toRoleApiResp(newData)
	err = redis.Set(context.Background(), cacheKey, newDataResp, 1*time.Minute)
	if err != nil {
		hlogger.Log.Errorf("Could not set to redis key:%s data: %+v error: %+v", cacheKey, newDataResp, err)
	}
	uc.allUseCases.SendAuditTrail(params.CreatedBy, now, constants.KeyCreate, "RoleApi", oldData, newData)
	uc.allUseCases.RefreshApiPermissionCacheForRole(params.RoleName)
	return nil
}

func (uc *RoleApiUseCasesImpl) Update(params models.RoleApiReq) *hmodels.UseCasesError {
	errMsg := uc.validationReq(params, constants.ActionUpdate)
	if len(errMsg) > 0 {
		return hutils.BuildUseCasesError(errMsg, http.StatusBadRequest, -1, "Failed")
	}

	now := time.Now()
	roleUc := uc.allUseCases.Role
	roleApiRepo := uc.allUseCases.Repository.RoleApiRepository()
	redis := uc.allUseCases.Helper.GetRedisClient()

	role, respUc := roleUc.GetByUniqueKey(params.RoleName)
	if respUc != nil {
		return respUc
	}
	if role == nil {
		return hutils.BuildUseCasesError(append(errMsg, "role does not exist"), http.StatusBadRequest, -1, "Failed")
	}
	if role.Status != "ACTIVE" {
		return hutils.BuildUseCasesError(append(errMsg, "role is not active, please activate first."), http.StatusBadRequest, -1, "Failed")
	}

	cacheKey := hutils.GenerateCacheKey(constants.KeyCacheRoleApiId, params.Id)

	oldData, err := roleApiRepo.FindByID(params.Id)
	if err != nil {
		return hutils.BuildUseCasesError(append(errMsg, err.Error()), http.StatusInternalServerError, -100006, "Database Error")
	}

	if oldData == nil {
		return hutils.BuildUseCasesError(append(errMsg, "Data not found"), http.StatusBadRequest, -1, "Failed")
	}
	if oldData.RoleName != params.RoleName {
		return hutils.BuildUseCasesError(append(errMsg, "Data not found"), http.StatusBadRequest, -1, "Failed")
	}
	newData := *oldData
	newData.HttpMethod = params.HttpMethod
	newData.HttpEndpoint = params.HttpEndpoint
	newData.RoleName = params.RoleName
	newData.ServiceName = params.ServiceName
	newData.Description = params.Description
	newData.IsActive = params.IsActive
	newData.UpdatedBy = params.UpdatedBy
	newData.UpdatedAt = now

	err = roleApiRepo.Update(&newData)
	if err != nil {
		hlogger.Log.Errorf("Could not update req: %+v to data: %+v", params, err)
		return hutils.BuildUseCasesError(append(errMsg, err.Error()), http.StatusInternalServerError, -100006, "Database Error")
	}
	dataResp := uc.toRoleApiResp(&newData)
	err = redis.Set(context.Background(), cacheKey, dataResp, 1*time.Minute)
	if err != nil {
		hlogger.Log.Errorf("Could not update local cahe key:%s data: %+v error: %+v", cacheKey, dataResp, err)
	}
	uc.allUseCases.SendAuditTrail(params.UpdatedBy, now, constants.KeyUpdate, "RoleApi", oldData, &newData)
	uc.allUseCases.RefreshApiPermissionCacheForRole(params.RoleName)
	return nil
}

func (uc *RoleApiUseCasesImpl) Delete(params models.RoleApiReq) *hmodels.UseCasesError {
	errMsg := uc.validationReq(params, constants.ActionDelete)
	if len(errMsg) > 0 {
		return hutils.BuildUseCasesError(errMsg, http.StatusBadRequest, -1, "Failed")
	}

	now := time.Now()
	roleApiRepo := uc.allUseCases.Repository.RoleApiRepository()
	redis := uc.allUseCases.Helper.GetRedisClient()

	oldData, err := roleApiRepo.FindByID(params.Id)
	if err != nil {
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error")
	}
	if oldData == nil {
		return hutils.BuildUseCasesError(append(errMsg, "Data not found"), http.StatusBadRequest, -1, "Failed")
	}
	if oldData.RoleName != params.RoleName {
		return hutils.BuildUseCasesError(append(errMsg, "Data not found"), http.StatusBadRequest, -1, "Failed")
	}
	cacheKey := hutils.GenerateCacheKey(constants.KeyCacheRoleApiId, params.Id)
	newData := *oldData
	newData.IsActive = false
	newData.DeletedBy = sql.NullString{String: params.DeletedBy, Valid: true}
	newData.DeletedAt = sql.NullTime{Time: now, Valid: true}

	err = roleApiRepo.Delete(&newData)
	if err != nil {
		hlogger.Log.Errorf("Could not update req: %+v to data: %+v", params, err)
		return hutils.BuildUseCasesError(append(errMsg, err.Error()), http.StatusInternalServerError, -100006, "Database Error")
	}
	newDataResp := uc.toRoleApiResp(&newData)
	err = redis.Set(context.Background(), cacheKey, newDataResp, 1*time.Minute)
	if err != nil {
		hlogger.Log.Errorf("Could not update local cahe key:%s data: %+v error: %+v", cacheKey, newDataResp, err)
	}
	uc.allUseCases.SendAuditTrail(params.DeletedBy, now, constants.KeyDelete, "RoleApi", oldData, &newData)
	uc.allUseCases.RefreshApiPermissionCacheForRole(oldData.RoleName)
	return nil
}

func (uc *RoleApiUseCasesImpl) GetById(id string) (*models.RoleApiResp, *hmodels.UseCasesError) {
	if len(id) == 0 {
		return nil, hutils.BuildUseCasesError([]string{"empty id"}, http.StatusBadRequest, -1, "Failed")
	}
	cacheKey := hutils.GenerateCacheKey(constants.KeyCacheRoleApiId, id)
	var cacheData *models.RoleApiResp

	roleApiRepo := uc.allUseCases.Repository.RoleApiRepository()
	redis := uc.allUseCases.Helper.GetRedisClient()

	err := redis.Get(context.Background(), cacheKey, &cacheData)
	var dbData *repository.RoleApi
	var respData *models.RoleApiResp
	if err != nil || cacheData == nil {
		dbData, err = roleApiRepo.FindByID(id)
		if err != nil {
			return nil, hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error")
		}
		if dbData != nil {
			respData = uc.toRoleApiResp(dbData)
			err = redis.Set(context.Background(), cacheKey, respData, 1*time.Minute)
			if err != nil {
				hlogger.Log.Errorf("Error set user role by id to redis key: %s, data: %+v error: %+v", cacheKey, dbData, err)
			}
		}

		return respData, nil
	}
	respData = cacheData
	jsonStr, err := hutils.InterfaceToJsonString(cacheData)
	if err != nil {
		hlogger.Log.Errorf("cannot convert cahce data to json string: %v", err)
	}
	hlogger.Log.Debugf("found data by id from redis: %s", jsonStr)
	return respData, nil
}

func (uc *RoleApiUseCasesImpl) Search(param hmodels.SearchRequest) (*hmodels.ResponseContent, *hmodels.UseCasesError) {
	if param.Paging.PageSize == 0 {
		param.Paging.PageSize = 10
	}
	if len(param.Paging.SortDirection) == 0 || (param.Paging.SortDirection != "asc" && param.Paging.SortDirection != "desc") {
		param.Paging.SortDirection = "asc"
	}

	roleApiRepo := uc.allUseCases.Repository.RoleApiRepository()

	data, total, err := roleApiRepo.FindBy(param)
	if err != nil {
		return nil, hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error")
	}
	resp := hutils.BuildResponseContent(param, hutils.ArrayStructToArrayInterface(uc.toArrayRoleApiResp(data)), total)
	return resp, nil
}

func (uc *RoleApiUseCasesImpl) toArrayRoleApiResp(params []repository.RoleApi) []*models.RoleApiResp {
	resp := make([]*models.RoleApiResp, 0)
	for _, val := range params {
		resp = append(resp, uc.toRoleApiResp(&val))
	}
	return resp
}
func (uc *RoleApiUseCasesImpl) toRoleApiResp(param *repository.RoleApi) *models.RoleApiResp {

	return &models.RoleApiResp{
		Id:           param.Id,
		RoleName:     param.RoleName,
		HttpMethod:   param.HttpMethod,
		HttpEndpoint: param.HttpEndpoint,
		IsActive:     param.IsActive,
		ServiceName:  param.ServiceName,
		Description:  param.Description,
		CreatedBy:    param.CreatedBy,
		CreatedAt:    param.CreatedAt,
		UpdatedBy:    param.UpdatedBy,
		UpdatedAt:    param.UpdatedAt,
		DeletedBy:    param.DeletedBy.String,
		DeletedAt:    param.DeletedAt.Time,
	}
}

func (uc *RoleApiUseCasesImpl) GetAll() ([]interface{}, *hmodels.UseCasesError) {
	roleApiRepo := uc.allUseCases.Repository.RoleApiRepository()

	data, err := roleApiRepo.FindAll()
	if err != nil {
		return nil, hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error")
	}

	return hutils.ArrayStructToArrayInterface(uc.toArrayRoleApiResp(data)), nil
}

func (uc *RoleApiUseCasesImpl) ToggleActive(params models.ToggleActiveReq) *hmodels.UseCasesError {
	if params.Id == "" {
		return hutils.BuildUseCasesError([]string{"id is required"}, http.StatusBadRequest, -1, "Failed")
	}
	if params.UpdatedBy == "" {
		return hutils.BuildUseCasesError([]string{"updatedBy is required"}, http.StatusBadRequest, -1, "Failed")
	}

	now := time.Now()
	roleApiRepo := uc.allUseCases.Repository.RoleApiRepository()
	redis := uc.allUseCases.Helper.GetRedisClient()
	cacheKey := hutils.GenerateCacheKey(constants.KeyCacheRoleApiId, params.Id)

	oldData, err := roleApiRepo.FindByID(params.Id)
	if err != nil {
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error")
	}

	if oldData == nil {
		return hutils.BuildUseCasesError([]string{"Data not found"}, http.StatusBadRequest, -1, "Failed")
	}

	newData := *oldData
	newData.IsActive = params.IsActive
	newData.UpdatedBy = params.UpdatedBy
	newData.UpdatedAt = now

	err = roleApiRepo.Update(&newData)
	if err != nil {
		hlogger.Log.Errorf("Could not toggle active: %+v error: %+v", params, err)
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error")
	}

	dataResp := uc.toRoleApiResp(&newData)
	err = redis.Set(context.Background(), cacheKey, dataResp, 1*time.Minute)
	if err != nil {
		hlogger.Log.Errorf("Could not update cache key: %s error: %+v", cacheKey, err)
	}

	uc.allUseCases.SendAuditTrail(params.UpdatedBy, now, constants.KeyUpdate, "RoleApi", oldData, &newData)
	uc.allUseCases.RefreshApiPermissionCacheForRole(oldData.RoleName)
	return nil
}

func (uc *RoleApiUseCasesImpl) DeleteById(id string, deletedBy string) *hmodels.UseCasesError {
	if id == "" {
		return hutils.BuildUseCasesError([]string{"id is required"}, http.StatusBadRequest, -1, "Failed")
	}
	if deletedBy == "" {
		return hutils.BuildUseCasesError([]string{"deletedBy is required"}, http.StatusBadRequest, -1, "Failed")
	}

	now := time.Now()
	roleApiRepo := uc.allUseCases.Repository.RoleApiRepository()
	redis := uc.allUseCases.Helper.GetRedisClient()
	cacheKey := hutils.GenerateCacheKey(constants.KeyCacheRoleApiId, id)

	oldData, err := roleApiRepo.FindByID(id)
	if err != nil {
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error")
	}

	if oldData == nil {
		return hutils.BuildUseCasesError([]string{"Data not found"}, http.StatusBadRequest, -1, "Failed")
	}

	newData := *oldData
	newData.IsActive = false
	newData.DeletedBy = sql.NullString{String: deletedBy, Valid: true}
	newData.DeletedAt = sql.NullTime{Time: now, Valid: true}

	err = roleApiRepo.Delete(&newData)
	if err != nil {
		hlogger.Log.Errorf("Could not delete role api: id=%s error: %+v", id, err)
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error")
	}

	dataResp := uc.toRoleApiResp(&newData)
	err = redis.Set(context.Background(), cacheKey, dataResp, 1*time.Minute)
	if err != nil {
		hlogger.Log.Errorf("Could not update cache key: %s error: %+v", cacheKey, err)
	}

	uc.allUseCases.SendAuditTrail(deletedBy, now, constants.KeyDelete, "RoleApi", oldData, &newData)
	uc.allUseCases.RefreshApiPermissionCacheForRole(oldData.RoleName)
	return nil
}

// GetByRoleName - Get all endpoint mappings for a specific role (for QA inspection)
// Returns: List of endpoints accessible by this role
func (uc *RoleApiUseCasesImpl) GetByRoleName(roleName string) ([]*models.RoleApiResp, *hmodels.UseCasesError) {
	if roleName == "" {
		return nil, hutils.BuildUseCasesError([]string{"role name is required"}, http.StatusBadRequest, -1, "Failed")
	}

	roleApiRepo := uc.allUseCases.Repository.RoleApiRepository()
	data, err := roleApiRepo.FindByRoleName(roleName)
	if err != nil {
		return nil, hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error")
	}

	return uc.toArrayRoleApiResp(data), nil
}

// GetRoleSummary - Get summary of all roles with their endpoint counts (for QA inspection)
// Returns: Map of role_name → endpoint count + sample endpoints
func (uc *RoleApiUseCasesImpl) GetRoleSummary() (*models.RoleApiSummaryResp, *hmodels.UseCasesError) {
	roleApiRepo := uc.allUseCases.Repository.RoleApiRepository()
	roleRepo := uc.allUseCases.Repository.GetRoleRepository()

	// Get all roles
	roles, err := roleRepo.FindAllActive()
	if err != nil {
		return nil, hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error")
	}

	summary := &models.RoleApiSummaryResp{
		Roles: make([]models.RoleApiSummaryItem, 0, len(roles)),
	}

	// For each role, count endpoints
	for _, role := range roles {
		endpoints, err := roleApiRepo.FindByRoleName(role.Code)
		if err != nil {
			hlogger.Log.Errorf("GetRoleSummary: failed to get endpoints for role %s: %v", role.Code, err)
			continue
		}

		// Count active vs inactive
		activeCount := 0
		inactiveCount := 0
		sampleEndpoints := make([]string, 0)

		for _, ep := range endpoints {
			if ep.IsActive {
				activeCount++
				// Collect first 5 active endpoints as sample
				if len(sampleEndpoints) < 5 {
					sampleEndpoints = append(sampleEndpoints, fmt.Sprintf("%s %s", ep.HttpMethod, ep.HttpEndpoint))
				}
			} else {
				inactiveCount++
			}
		}

		summary.Roles = append(summary.Roles, models.RoleApiSummaryItem{
			RoleName:        role.Code,
			RoleDisplayName: role.Name,
			TotalEndpoints:  len(endpoints),
			ActiveEndpoints: activeCount,
			InactiveEndpoints: inactiveCount,
			SampleEndpoints: sampleEndpoints,
		})
	}

	return summary, nil
}
