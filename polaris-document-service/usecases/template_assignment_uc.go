package usecases

import (
	"database/sql"
	"net/http"

	"bitbucket.org/log-tech/helper-go/hlogger"
	"bitbucket.org/log-tech/helper-go/hmodels"
	"bitbucket.org/log-tech/helper-go/hutils"
	"bitbucket.org/log-tech/polaris-document-service/data-access/repository"
	"bitbucket.org/log-tech/polaris-document-service/models"
	"github.com/google/uuid"
)

type TemplateAssignmentUseCasesImpl struct {
	repo         *repository.TemplateAssignmentRepository
	templateRepo *repository.TemplateRepository
}

func NewTemplateAssignmentUseCases(allUc *AllUseCasesImpl) *TemplateAssignmentUseCasesImpl {
	return &TemplateAssignmentUseCasesImpl{
		repo:         allUc.Repository.GetTemplateAssignmentRepository(),
		templateRepo: allUc.Repository.GetTemplateRepository(),
	}
}

func (uc *TemplateAssignmentUseCasesImpl) Assign(params models.TemplateAssignmentReq) (*models.TemplateAssignmentResp, *hmodels.UseCasesError) {
	var errMsg []string

	if len(params.CreatedBy) == 0 {
		errMsg = append(errMsg, "header user-username not set.")
	}
	if len(params.TemplateType) == 0 {
		errMsg = append(errMsg, "body.templateType is required.")
	}
	if len(params.TemplateID) == 0 {
		errMsg = append(errMsg, "body.templateId is required.")
	}
	if len(params.EffectiveFrom) == 0 {
		errMsg = append(errMsg, "body.effectiveFrom is required.")
	}
	// At least one scope must be provided
	if len(params.CompanyID) == 0 && len(params.WarehouseID) == 0 && len(params.OwnerID) == 0 {
		errMsg = append(errMsg, "Minimal satu dari companyId, warehouseId, atau ownerId harus terisi.")
	}
	if len(errMsg) > 0 {
		return nil, hutils.BuildUseCasesError(errMsg, http.StatusBadRequest, -1, "Failed")
	}

	// Validate that template exists
	template, err := uc.templateRepo.FindByID(params.TemplateID)
	if err != nil {
		hlogger.Log.Errorf("Error finding template: %v", err)
		return nil, hutils.BuildUseCasesError([]string{"Database Error."}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if template == nil {
		return nil, hutils.BuildUseCasesError([]string{"Template tidak ditemukan."}, http.StatusBadRequest, -1, "Failed")
	}

	// Check duplicate assignment
	exists, err := uc.repo.ExistsDuplicate(params.CompanyID, params.WarehouseID, params.OwnerID, params.TemplateType, params.EffectiveFrom, "")
	if err != nil {
		hlogger.Log.Errorf("Error checking duplicate assignment: %v", err)
		return nil, hutils.BuildUseCasesError([]string{"Database Error."}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if exists {
		return nil, hutils.BuildUseCasesError([]string{"Assignment dengan scope dan tanggal efektif yang sama sudah ada."}, http.StatusBadRequest, -1, "Failed")
	}

	// Generate UUID v7
	id, err := uuid.NewV7()
	if err != nil {
		hlogger.Log.Errorf("Error generating UUID: %v", err)
		return nil, hutils.BuildUseCasesError([]string{"Internal error."}, http.StatusInternalServerError, -1, "Failed")
	}

	entity := &repository.TemplateAssignment{
		ID:            id.String(),
		CompanyID:     sql.NullString{String: params.CompanyID, Valid: len(params.CompanyID) > 0},
		WarehouseID:   sql.NullString{String: params.WarehouseID, Valid: len(params.WarehouseID) > 0},
		OwnerID:       sql.NullString{String: params.OwnerID, Valid: len(params.OwnerID) > 0},
		TemplateType:  params.TemplateType,
		TemplateID:    params.TemplateID,
		EffectiveFrom: params.EffectiveFrom,
		CreatedBy:     params.CreatedBy,
	}

	if err := uc.repo.Save(entity); err != nil {
		hlogger.Log.Errorf("Error saving template assignment: %v", err)
		return nil, hutils.BuildUseCasesError([]string{"Database Error."}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	return uc.toAssignmentResp(entity), nil
}

func (uc *TemplateAssignmentUseCasesImpl) GetByTemplateId(templateID string) ([]models.TemplateAssignmentResp, *hmodels.UseCasesError) {
	if len(templateID) == 0 {
		return nil, hutils.BuildUseCasesError([]string{"body.templateId is required."}, http.StatusBadRequest, -1, "Failed")
	}

	results, err := uc.repo.FindByTemplateID(templateID)
	if err != nil {
		hlogger.Log.Errorf("Error finding assignments by templateId: %v", err)
		return nil, hutils.BuildUseCasesError([]string{"Database Error."}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	respData := make([]models.TemplateAssignmentResp, 0, len(results))
	for _, item := range results {
		respData = append(respData, *uc.toAssignmentResp(&item))
	}

	return respData, nil
}

func (uc *TemplateAssignmentUseCasesImpl) GetByScope(params models.GetByScopeReq) ([]models.TemplateAssignmentResp, *hmodels.UseCasesError) {
	if len(params.TemplateType) == 0 {
		return nil, hutils.BuildUseCasesError([]string{"body.templateType is required."}, http.StatusBadRequest, -1, "Failed")
	}

	results, err := uc.repo.FindAllByScope(params.CompanyID, params.WarehouseID, params.OwnerID, params.TemplateType)
	if err != nil {
		hlogger.Log.Errorf("Error finding assignments by scope: %v", err)
		return nil, hutils.BuildUseCasesError([]string{"Database Error."}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	respData := make([]models.TemplateAssignmentResp, 0, len(results))
	for _, item := range results {
		respData = append(respData, *uc.toAssignmentResp(&item))
	}

	return respData, nil
}

func (uc *TemplateAssignmentUseCasesImpl) toAssignmentResp(entity *repository.TemplateAssignment) *models.TemplateAssignmentResp {
	companyID := ""
	if entity.CompanyID.Valid {
		companyID = entity.CompanyID.String
	}
	warehouseID := ""
	if entity.WarehouseID.Valid {
		warehouseID = entity.WarehouseID.String
	}
	ownerID := ""
	if entity.OwnerID.Valid {
		ownerID = entity.OwnerID.String
	}

	return &models.TemplateAssignmentResp{
		ID:            entity.ID,
		CompanyID:     companyID,
		WarehouseID:   warehouseID,
		OwnerID:       ownerID,
		TemplateType:  entity.TemplateType,
		TemplateID:    entity.TemplateID,
		EffectiveFrom: entity.EffectiveFrom,
		CreatedBy:     entity.CreatedBy,
		CreatedAt:     entity.CreatedAt,
		UpdatedBy:     entity.UpdatedBy,
		UpdatedAt:     entity.UpdatedAt,
	}
}
