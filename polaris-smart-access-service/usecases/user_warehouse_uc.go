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
	"bitbucket.org/log-tech/polaris-smart-access-service/models/grpc"
	"gorm.io/gorm"
)

type UserWarehouseUseCasesImpl struct {
	allUseCases *AllUseCasesImpl
}

func NewUserWarehouseUseCases(allUc *AllUseCasesImpl) *UserWarehouseUseCasesImpl {
	return &UserWarehouseUseCasesImpl{allUseCases: allUc}
}

func (uc *UserWarehouseUseCasesImpl) Save(params models.UserWarehouseReq) *hmodels.UseCasesError {
	if params.UserId == "" {
		return hutils.BuildUseCasesError([]string{"body.userId is required."}, http.StatusBadRequest, -1, "Failed")
	}
	if len(params.WarehouseIds) == 0 {
		return hutils.BuildUseCasesError([]string{"body.warehouseIds is required."}, http.StatusBadRequest, -1, "Failed")
	}

	// Validasi format warehouse IDs
	for _, whId := range params.WarehouseIds {
		if whId == "" {
			return hutils.BuildUseCasesError([]string{"Warehouse ID cannot be empty."}, http.StatusBadRequest, -1, "Failed")
		}
	}

	// Enrich warehouse data dari master-data via gRPC (optional, non-blocking)
	warehouseMap, err := uc.allUseCases.MasterdataWarehouseGrpc.GetWarehousesByIds(params.WarehouseIds)
	if err != nil {
		// Log warning tapi jangan block
		hlogger.Log.Warnf("UserWarehouse.Save: GetWarehousesByIds gRPC failed (non-blocking): %v", err)
		warehouseMap = make(map[string]*grpc.WarehouseResp)
	}

	repo := uc.allUseCases.Repository.GetUserWarehouseRepository()
	now := time.Now()

	for _, whId := range params.WarehouseIds {
		// Check if already assigned (active)
		existing, err := repo.FindByUserAndWarehouse(params.UserId, whId)
		if err != nil {
			return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
		}
		if existing != nil {
			continue // already assigned, skip
		}

		// Check if soft-deleted record exists — reactivate instead of insert (avoid unique constraint violation)
		var softDeletedRecord repository.UserWarehouse
		err = repo.Db.
			Where("user_id = ? AND warehouse_id = ? AND is_deleted = true", params.UserId, whId).
			First(&softDeletedRecord).Error

		if err == nil {
			// Soft-deleted record exists — reactivate it with updated warehouse data
			softDeletedRecord.IsDeleted = false
			softDeletedRecord.DeletedBy = sql.NullString{}
			softDeletedRecord.DeletedAt = sql.NullTime{}
			softDeletedRecord.UpdatedBy = params.CreatedBy
			softDeletedRecord.UpdatedAt = now
			// Update warehouse code/name from gRPC (in case they changed)
			if wh, exists := warehouseMap[whId]; exists {
				softDeletedRecord.WarehouseCode = wh.WarehouseCode
				softDeletedRecord.WarehouseName = wh.WarehouseName
			}
			if err := repo.Update(&softDeletedRecord); err != nil {
				hlogger.Log.Errorf("UserWarehouse.Save: failed to reactivate soft-deleted warehouse %s: %v", whId, err)
				return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
			}
			continue
		} else if err != gorm.ErrRecordNotFound {
			// Actual database error (not "not found")
			hlogger.Log.Errorf("UserWarehouse.Save: error checking soft-deleted warehouse %s: %v", whId, err)
			return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
		}
		// If ErrRecordNotFound, proceed to create new record below

		// Ambil warehouse code dan name dari gRPC response
		warehouseCode := ""
		warehouseName := ""
		if wh, exists := warehouseMap[whId]; exists {
			warehouseCode = wh.WarehouseCode
			warehouseName = wh.WarehouseName
		}

		entity := &repository.UserWarehouse{
			Id:            hutils.GenerateUUID(),
			UserId:        params.UserId,
			WarehouseId:   whId,
			WarehouseCode: warehouseCode,
			WarehouseName: warehouseName,
			CreatedBy:     params.CreatedBy,
			CreatedAt:     now,
			UpdatedBy:     params.CreatedBy,
			UpdatedAt:     now,
		}
		if err := repo.Save(entity); err != nil {
			hlogger.Log.Errorf("UserWarehouse.Save failed for warehouseId %s: %v", whId, err)
			return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
		}
	}

	uc.allUseCases.SendAuditTrail(params.CreatedBy, now, constants.KeyCreate, "UserWarehouse", nil, params)
	return nil
}

func (uc *UserWarehouseUseCasesImpl) Delete(params models.UserWarehouseReq) *hmodels.UseCasesError {
	if params.UserId == "" {
		return hutils.BuildUseCasesError([]string{"body.userId is required."}, http.StatusBadRequest, -1, "Failed")
	}
	if len(params.WarehouseIds) == 0 {
		return hutils.BuildUseCasesError([]string{"body.warehouseIds is required."}, http.StatusBadRequest, -1, "Failed")
	}

	repo := uc.allUseCases.Repository.GetUserWarehouseRepository()

	for _, whId := range params.WarehouseIds {
		existing, err := repo.FindByUserAndWarehouse(params.UserId, whId)
		if err != nil {
			return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
		}
		if existing == nil {
			continue
		}
		existing.DeletedBy = sql.NullString{String: params.DeletedBy, Valid: true}
		if err := repo.Delete(existing); err != nil {
			hlogger.Log.Errorf("UserWarehouse.Delete failed for warehouseId %s: %v", whId, err)
			return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
		}
	}

	uc.allUseCases.SendAuditTrail(params.DeletedBy, time.Now(), constants.KeyDelete, "UserWarehouse", params, nil)
	return nil
}

// Update — sync warehouse assignments dengan enrich data dari master-data (remove old, add new)
func (uc *UserWarehouseUseCasesImpl) Update(params models.UserWarehouseReq) *hmodels.UseCasesError {
	if params.UserId == "" {
		return hutils.BuildUseCasesError([]string{"body.userId is required."}, http.StatusBadRequest, -1, "Failed")
	}
	if len(params.WarehouseIds) == 0 {
		return hutils.BuildUseCasesError([]string{"body.warehouseIds is required."}, http.StatusBadRequest, -1, "Failed")
	}

	// Enrich warehouse data dari master-data via gRPC (optional, non-blocking)
	warehouseMap, err := uc.allUseCases.MasterdataWarehouseGrpc.GetWarehousesByIds(params.WarehouseIds)
	if err != nil {
		hlogger.Log.Warnf("UserWarehouse.Update: GetWarehousesByIds gRPC failed (non-blocking): %v", err)
		warehouseMap = make(map[string]*grpc.WarehouseResp)
	}

	// Validasi warehouse IDs
	for _, whId := range params.WarehouseIds {
		if whId == "" {
			return hutils.BuildUseCasesError([]string{"Warehouse ID cannot be empty."}, http.StatusBadRequest, -1, "Failed")
		}
	}

	repo := uc.allUseCases.Repository.GetUserWarehouseRepository()

	// Get current warehouse assignments
	current, err := repo.FindByUserID(params.UserId)
	if err != nil {
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	// Build desired set
	desiredMap := make(map[string]bool)
	for _, whId := range params.WarehouseIds {
		desiredMap[whId] = true
	}

	now := time.Now()

	// Remove warehouses no longer in desired set
	for _, uw := range current {
		if !desiredMap[uw.WarehouseId] {
			uw.DeletedBy = sql.NullString{String: params.UpdatedBy, Valid: true}
			if err := repo.Delete(&uw); err != nil {
				hlogger.Log.Errorf("UserWarehouse.Update: delete warehouse %s failed: %v", uw.WarehouseId, err)
			}
		}
	}

	// Add new warehouses
	for _, whId := range params.WarehouseIds {
		// Check if already exists (active)
		existing, err := repo.FindByUserAndWarehouse(params.UserId, whId)
		if err != nil {
			return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
		}
		if existing != nil {
			continue // already assigned, skip
		}

		// Check if soft-deleted record exists — reactivate instead of insert
		var softDeletedRecord repository.UserWarehouse
		err = repo.Db.
			Where("user_id = ? AND warehouse_id = ? AND is_deleted = true", params.UserId, whId).
			First(&softDeletedRecord).Error

		if err == nil {
			// Soft-deleted record exists — reactivate it with updated warehouse data
			softDeletedRecord.IsDeleted = false
			softDeletedRecord.DeletedBy = sql.NullString{}
			softDeletedRecord.DeletedAt = sql.NullTime{}
			softDeletedRecord.UpdatedBy = params.UpdatedBy
			softDeletedRecord.UpdatedAt = now
			// Update warehouse code/name from gRPC
			if wh, exists := warehouseMap[whId]; exists {
				softDeletedRecord.WarehouseCode = wh.WarehouseCode
				softDeletedRecord.WarehouseName = wh.WarehouseName
			}
			if err := repo.Update(&softDeletedRecord); err != nil {
				hlogger.Log.Errorf("UserWarehouse.Update: failed to reactivate soft-deleted warehouse %s: %v", whId, err)
				return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
			}
			continue
		} else if err != gorm.ErrRecordNotFound {
			// Actual database error
			hlogger.Log.Errorf("UserWarehouse.Update: error checking soft-deleted warehouse %s: %v", whId, err)
			return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
		}
		// If ErrRecordNotFound, proceed to create new record

		// Ambil warehouse code dan name dari gRPC response
		warehouseCode := ""
		warehouseName := ""
		if wh, exists := warehouseMap[whId]; exists {
			warehouseCode = wh.WarehouseCode
			warehouseName = wh.WarehouseName
		}

		entity := &repository.UserWarehouse{
			Id:            hutils.GenerateUUID(),
			UserId:        params.UserId,
			WarehouseId:   whId,
			WarehouseCode: warehouseCode,
			WarehouseName: warehouseName,
			CreatedBy:     params.UpdatedBy,
			CreatedAt:     now,
			UpdatedBy:     params.UpdatedBy,
			UpdatedAt:     now,
		}
		if err := repo.Save(entity); err != nil {
			hlogger.Log.Errorf("UserWarehouse.Update: save warehouse %s failed: %v", whId, err)
			return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
		}
	}

	uc.allUseCases.SendAuditTrail(params.UpdatedBy, now, constants.KeyUpdate, "UserWarehouse", nil, params)
	return nil
}

func (uc *UserWarehouseUseCasesImpl) GetByUserId(userId string) ([]models.UserWarehouseResp, *hmodels.UseCasesError) {
	if userId == "" {
		return nil, hutils.BuildUseCasesError([]string{"userId is required."}, http.StatusBadRequest, -1, "Failed")
	}

	repo := uc.allUseCases.Repository.GetUserWarehouseRepository()
	data, err := repo.FindByUserID(userId)
	if err != nil {
		return nil, hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	// Convert DB entity ke response DTO
	resp := make([]models.UserWarehouseResp, 0, len(data))
	for _, entity := range data {
		resp = append(resp, *uc.toResp(&entity))
	}
	return resp, nil
}

func (uc *UserWarehouseUseCasesImpl) GetById(id string) (*models.UserWarehouseResp, *hmodels.UseCasesError) {
	if id == "" {
		return nil, hutils.BuildUseCasesError([]string{"body.id is required."}, http.StatusBadRequest, -1, "Failed")
	}

	repo := uc.allUseCases.Repository.GetUserWarehouseRepository()
	data, err := repo.FindByID(id)
	if err != nil {
		return nil, hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if data == nil {
		return nil, nil
	}

	return uc.toResp(data), nil
}

func (uc *UserWarehouseUseCasesImpl) toResp(entity *repository.UserWarehouse) *models.UserWarehouseResp {
	return &models.UserWarehouseResp{
		Id:            entity.Id,
		UserId:        entity.UserId,
		WarehouseId:   entity.WarehouseId,
		WarehouseCode: entity.WarehouseCode,
		WarehouseName: entity.WarehouseName,
		CreatedBy:     entity.CreatedBy,
		CreatedAt:     entity.CreatedAt,
		UpdatedBy:     entity.UpdatedBy,
		UpdatedAt:     entity.UpdatedAt,
	}
}
