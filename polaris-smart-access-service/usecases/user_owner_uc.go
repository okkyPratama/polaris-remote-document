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

type UserOwnerUseCasesImpl struct {
	allUseCases *AllUseCasesImpl
}

func NewUserOwnerUseCases(allUc *AllUseCasesImpl) *UserOwnerUseCasesImpl {
	return &UserOwnerUseCasesImpl{allUseCases: allUc}
}

func (uc *UserOwnerUseCasesImpl) Save(params models.UserOwnerReq) *hmodels.UseCasesError {
	if params.UserId == "" {
		return hutils.BuildUseCasesError([]string{"body.userId is required."}, http.StatusBadRequest, -1, "Failed")
	}
	if params.OwnerId == "" {
		return hutils.BuildUseCasesError([]string{"body.ownerId is required."}, http.StatusBadRequest, -1, "Failed")
	}
	if params.OwnerCode == "" {
		return hutils.BuildUseCasesError([]string{"body.ownerCode is required."}, http.StatusBadRequest, -1, "Failed")
	}
	if params.OwnerName == "" {
		return hutils.BuildUseCasesError([]string{"body.ownerName is required."}, http.StatusBadRequest, -1, "Failed")
	}
	if params.CreatedBy == "" {
		return hutils.BuildUseCasesError([]string{"createdBy is required."}, http.StatusBadRequest, -1, "Failed")
	}

	repo := uc.allUseCases.Repository.GetUserOwnerRepository()

	// Check if already assigned (active)
	existing, err := repo.FindByUserAndOwner(params.UserId, params.OwnerId)
	if err != nil {
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if existing != nil {
		return hutils.BuildUseCasesError([]string{"User already assigned to this owner."}, http.StatusBadRequest, -1, "Failed")
	}

	// Check if soft-deleted record exists — reactivate instead of insert (avoid unique constraint violation)
	var softDeletedRecord repository.UserOwner
	err = repo.Db.
		Where("user_id = ? AND owner_id = ? AND is_deleted = true", params.UserId, params.OwnerId).
		First(&softDeletedRecord).Error

	now := time.Now()

	if err == nil {
		// Soft-deleted record exists — reactivate it
		softDeletedRecord.IsDeleted = false
		softDeletedRecord.DeletedBy = sql.NullString{}
		softDeletedRecord.DeletedAt = sql.NullTime{}
		softDeletedRecord.OwnerCode = params.OwnerCode
		softDeletedRecord.OwnerName = params.OwnerName
		softDeletedRecord.UpdatedBy = params.CreatedBy
		softDeletedRecord.UpdatedAt = now
		if err := repo.Update(&softDeletedRecord); err != nil {
			hlogger.Log.Errorf("UserOwner.Save: failed to reactivate soft-deleted owner %s: %v", params.OwnerId, err)
			return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
		}
		uc.allUseCases.SendAuditTrail(params.CreatedBy, now, constants.KeyCreate, "UserOwner", nil, uc.toResp(&softDeletedRecord))
		uc.syncOwnerSessionsAfterMutation(params.UserId, params.CreatedBy)
		return nil
	} else if err != gorm.ErrRecordNotFound {
		// Actual database error (not "not found")
		hlogger.Log.Errorf("UserOwner.Save: error checking soft-deleted owner %s: %v", params.OwnerId, err)
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	// If ErrRecordNotFound, proceed to create new record below

	entity := &repository.UserOwner{
		Id:        hutils.GenerateUUID(),
		UserId:    params.UserId,
		OwnerId:   params.OwnerId,
		OwnerCode: params.OwnerCode,
		OwnerName: params.OwnerName,
		CreatedBy: params.CreatedBy,
		CreatedAt: now,
		UpdatedBy: params.CreatedBy,
		UpdatedAt: now,
	}

	if err := repo.Save(entity); err != nil {
		hlogger.Log.Errorf("Could not save user owner: %+v error: %+v", params, err)
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	uc.allUseCases.SendAuditTrail(params.CreatedBy, now, constants.KeyCreate, "UserOwner", nil, uc.toResp(entity))
	uc.syncOwnerSessionsAfterMutation(params.UserId, params.CreatedBy)
	return nil
}

func (uc *UserOwnerUseCasesImpl) Delete(params models.UserOwnerReq) *hmodels.UseCasesError {
	if params.Id == "" {
		return hutils.BuildUseCasesError([]string{"body.id is required."}, http.StatusBadRequest, -1, "Failed")
	}
	if params.DeletedBy == "" {
		return hutils.BuildUseCasesError([]string{"deletedBy is required."}, http.StatusBadRequest, -1, "Failed")
	}

	repo := uc.allUseCases.Repository.GetUserOwnerRepository()

	existing, err := repo.FindByID(params.Id)
	if err != nil {
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if existing == nil {
		return hutils.BuildUseCasesError([]string{"Data not found."}, http.StatusBadRequest, -1, "Failed")
	}

	oldData := uc.toResp(existing)
	existing.DeletedBy = sql.NullString{String: params.DeletedBy, Valid: true}

	if err := repo.Delete(existing); err != nil {
		hlogger.Log.Errorf("Could not delete user owner: %+v error: %+v", params, err)
		return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	uc.allUseCases.SendAuditTrail(params.DeletedBy, time.Now(), constants.KeyDelete, "UserOwner", oldData, nil)
	uc.syncOwnerSessionsAfterMutation(existing.UserId, params.DeletedBy)
	return nil
}

// syncOwnerSessionsAfterMutation refreshes ownerIds on active session caches.
// On refresh failure it fail-closes by invalidating all active sessions for the user.
func (uc *UserOwnerUseCasesImpl) syncOwnerSessionsAfterMutation(userID, actor string) {
	if err := uc.allUseCases.RefreshOwnerContextForActiveSessions(userID); err != nil {
		hlogger.Log.Errorf(
			"UserOwner: refresh owner session cache failed for user %s: %v — invalidating active sessions (fail-closed)",
			userID, err,
		)
		if invErr := uc.allUseCases.Resolve.InvalidateAllUserSessions(userID, actor); invErr != nil {
			hlogger.Log.Errorf("UserOwner: InvalidateAllUserSessions failed for user %s: %v", userID, invErr)
		}
	}
}

func (uc *UserOwnerUseCasesImpl) GetByUserId(userId string) ([]models.UserOwnerResp, *hmodels.UseCasesError) {
	if userId == "" {
		return nil, hutils.BuildUseCasesError([]string{"userId is required."}, http.StatusBadRequest, -1, "Failed")
	}

	repo := uc.allUseCases.Repository.GetUserOwnerRepository()
	data, err := repo.FindByUserID(userId)
	if err != nil {
		return nil, hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	resp := make([]models.UserOwnerResp, 0, len(data))
	for _, entity := range data {
		resp = append(resp, *uc.toResp(&entity))
	}
	return resp, nil
}

func (uc *UserOwnerUseCasesImpl) toResp(entity *repository.UserOwner) *models.UserOwnerResp {
	return &models.UserOwnerResp{
		Id:        entity.Id,
		UserId:    entity.UserId,
		OwnerId:   entity.OwnerId,
		OwnerCode: entity.OwnerCode,
		OwnerName: entity.OwnerName,
		CreatedBy: entity.CreatedBy,
		CreatedAt: entity.CreatedAt,
		UpdatedBy: entity.UpdatedBy,
		UpdatedAt: entity.UpdatedAt,
	}
}
