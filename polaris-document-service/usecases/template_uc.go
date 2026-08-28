package usecases

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"bitbucket.org/log-tech/helper-go/hlogger"
	"bitbucket.org/log-tech/helper-go/hmodels"
	"bitbucket.org/log-tech/helper-go/hutils"
	"bitbucket.org/log-tech/polaris-document-service/data-access/repository"
	"bitbucket.org/log-tech/polaris-document-service/engine"
	"bitbucket.org/log-tech/polaris-document-service/models"
	"github.com/google/uuid"
)

type TemplateUseCasesImpl struct {
	repo *repository.TemplateRepository
}

func NewTemplateUseCases(allUc *AllUseCasesImpl) *TemplateUseCasesImpl {
	return &TemplateUseCasesImpl{
		repo: allUc.Repository.GetTemplateRepository(),
	}
}

func (uc *TemplateUseCasesImpl) Save(params models.TemplateReq) (*models.TemplateResp, *hmodels.UseCasesError) {
	var errMsg []string

	if len(params.CreatedBy) == 0 {
		errMsg = append(errMsg, "header user-username not set.")
	}
	if len(errMsg) > 0 {
		return nil, hutils.BuildUseCasesError(errMsg, http.StatusBadRequest, -1, "Failed")
	}

	// Check duplicate template_code
	exists, err := uc.repo.ExistsByCode(params.TemplateCode, "")
	if err != nil {
		hlogger.Log.Errorf("Error checking code uniqueness: %v", err)
		return nil, hutils.BuildUseCasesError([]string{"Database Error."}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if exists {
		return nil, hutils.BuildUseCasesError([]string{"Template dengan kode tersebut sudah ada."}, http.StatusBadRequest, -1, "Failed")
	}

	// Check duplicate name
	exists, err = uc.repo.ExistsByName(params.Name, "")
	if err != nil {
		hlogger.Log.Errorf("Error checking name uniqueness: %v", err)
		return nil, hutils.BuildUseCasesError([]string{"Database Error."}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if exists {
		return nil, hutils.BuildUseCasesError([]string{"Template dengan nama tersebut sudah ada."}, http.StatusBadRequest, -1, "Failed")
	}

	// Generate UUID v7
	id, err := uuid.NewV7()
	if err != nil {
		hlogger.Log.Errorf("Error generating UUID: %v", err)
		return nil, hutils.BuildUseCasesError([]string{"Internal error."}, http.StatusInternalServerError, -1, "Failed")
	}

	entity := &repository.Template{
		ID:              id.String(),
		TemplateCode:    params.TemplateCode,
		Name:            params.Name,
		TemplateType:    params.TemplateType,
		OutputFormat:    params.OutputFormat,
		Description:     sql.NullString{String: params.Description, Valid: len(params.Description) > 0},
		TemplateContent: params.TemplateContent,
		Version:         1,
		PageSettingsJSON: marshalPageSettings(params.PageSettingsJSON),
		IsSystemDefault: params.IsSystemDefault,
		IsActive:        true,
		CreatedBy:       params.CreatedBy,
	}

	if err := uc.repo.Save(entity); err != nil {
		hlogger.Log.Errorf("Error saving template: %v", err)
		return nil, hutils.BuildUseCasesError([]string{"Database Error."}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	return uc.toTemplateResp(entity), nil
}

func (uc *TemplateUseCasesImpl) Update(params models.TemplateReq) (*models.TemplateResp, *hmodels.UseCasesError) {
	var errMsg []string

	if len(params.ID) == 0 {
		errMsg = append(errMsg, "body.id is required.")
	}
	if len(params.UpdatedBy) == 0 {
		errMsg = append(errMsg, "header user-username not set.")
	}
	if len(errMsg) > 0 {
		return nil, hutils.BuildUseCasesError(errMsg, http.StatusBadRequest, -1, "Failed")
	}

	// Find existing
	existing, err := uc.repo.FindByID(params.ID)
	if err != nil {
		hlogger.Log.Errorf("Error finding template: %v", err)
		return nil, hutils.BuildUseCasesError([]string{"Database Error."}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if existing == nil {
		return nil, hutils.BuildUseCasesError([]string{"Template tidak ditemukan."}, http.StatusNotFound, -1, "Failed")
	}

	// Check duplicate code (excluding current)
	if params.TemplateCode != existing.TemplateCode {
		exists, err := uc.repo.ExistsByCode(params.TemplateCode, params.ID)
		if err != nil {
			hlogger.Log.Errorf("Error checking code uniqueness: %v", err)
			return nil, hutils.BuildUseCasesError([]string{"Database Error."}, http.StatusInternalServerError, -100006, "Database Error.")
		}
		if exists {
			return nil, hutils.BuildUseCasesError([]string{"Template dengan kode tersebut sudah ada."}, http.StatusBadRequest, -1, "Failed")
		}
	}

	// Check duplicate name (excluding current)
	if params.Name != existing.Name {
		exists, err := uc.repo.ExistsByName(params.Name, params.ID)
		if err != nil {
			hlogger.Log.Errorf("Error checking name uniqueness: %v", err)
			return nil, hutils.BuildUseCasesError([]string{"Database Error."}, http.StatusInternalServerError, -100006, "Database Error.")
		}
		if exists {
			return nil, hutils.BuildUseCasesError([]string{"Template dengan nama tersebut sudah ada."}, http.StatusBadRequest, -1, "Failed")
		}
	}

	// Increment version if template_content changed
	newVersion := existing.Version
	if params.TemplateContent != existing.TemplateContent {
		newVersion = existing.Version + 1
	}

	existing.TemplateCode = params.TemplateCode
	existing.Name = params.Name
	existing.TemplateType = params.TemplateType
	existing.OutputFormat = params.OutputFormat
	existing.Description = sql.NullString{String: params.Description, Valid: len(params.Description) > 0}
	existing.TemplateContent = params.TemplateContent
	existing.Version = newVersion
	existing.PageSettingsJSON = marshalPageSettings(params.PageSettingsJSON)
	existing.IsSystemDefault = params.IsSystemDefault
	existing.IsActive = params.IsActive
	existing.UpdatedBy = params.UpdatedBy

	if err := uc.repo.Update(existing); err != nil {
		hlogger.Log.Errorf("Error updating template: %v", err)
		return nil, hutils.BuildUseCasesError([]string{"Database Error."}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	return uc.toTemplateResp(existing), nil
}

func (uc *TemplateUseCasesImpl) Delete(id string, deletedBy string) *hmodels.UseCasesError {
	if len(id) == 0 {
		return hutils.BuildUseCasesError([]string{"body.id is required."}, http.StatusBadRequest, -1, "Failed")
	}
	if len(deletedBy) == 0 {
		return hutils.BuildUseCasesError([]string{"header user-username not set."}, http.StatusBadRequest, -1, "Failed")
	}

	existing, err := uc.repo.FindByID(id)
	if err != nil {
		hlogger.Log.Errorf("Error finding template for delete: %v", err)
		return hutils.BuildUseCasesError([]string{"Database Error."}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if existing == nil {
		return hutils.BuildUseCasesError([]string{"Template tidak ditemukan."}, http.StatusNotFound, -1, "Failed")
	}

	// System default protection
	if existing.IsSystemDefault {
		return hutils.BuildUseCasesError([]string{"Template system default tidak dapat dihapus."}, http.StatusBadRequest, -1, "Failed")
	}

	existing.DeletedBy = sql.NullString{String: deletedBy, Valid: true}
	existing.UpdatedBy = deletedBy

	if err := uc.repo.Delete(existing); err != nil {
		hlogger.Log.Errorf("Error deleting template: %v", err)
		return hutils.BuildUseCasesError([]string{"Database Error."}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	return nil
}

func (uc *TemplateUseCasesImpl) GetById(id string) (*models.TemplateResp, *hmodels.UseCasesError) {
	if len(id) == 0 {
		return nil, hutils.BuildUseCasesError([]string{"parameter id is required."}, http.StatusBadRequest, -1, "Failed")
	}

	entity, err := uc.repo.FindByID(id)
	if err != nil {
		hlogger.Log.Errorf("Error finding template: %v", err)
		return nil, hutils.BuildUseCasesError([]string{"Database Error."}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if entity == nil {
		return nil, hutils.BuildUseCasesError([]string{"Template tidak ditemukan."}, http.StatusNotFound, -1, "Failed")
	}

	return uc.toTemplateResp(entity), nil
}

func (uc *TemplateUseCasesImpl) Search(params models.SearchRequest) (*hmodels.ResponseContent, *hmodels.UseCasesError) {
	page := params.Paging.Page
	pageSize := params.Paging.PageSize
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 25
	}
	if pageSize > 100 {
		return nil, hutils.BuildUseCasesError([]string{"pageSize must not exceed 100."}, http.StatusBadRequest, -1, "Failed")
	}

	conditions := make([]repository.FilterCondition, 0)
	for _, f := range params.Filters.And {
		conditions = append(conditions, repository.FilterCondition{
			Field: f.Field, Operator: f.Operator, Value: f.Value,
		})
	}

	data, total, err := uc.repo.FindAllFiltered(conditions, page, pageSize, params.Paging.SortBy, params.Paging.SortDir)
	if err != nil {
		hlogger.Log.Errorf("Error listing templates: %v", err)
		return nil, hutils.BuildUseCasesError([]string{"Database Error."}, http.StatusInternalServerError, -100006, "Database Error.")
	}

	respData := make([]interface{}, 0)
	for _, item := range data {
		respData = append(respData, uc.toTemplateSummaryResp(&item))
	}

	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}

	return &hmodels.ResponseContent{
		Data: respData,
		Paging: &hmodels.ResponsePaging{
			Page: page, PageSize: pageSize,
			Count: len(data), TotalItems: int(total), TotalPages: totalPages,
		},
	}, nil
}

func (uc *TemplateUseCasesImpl) toTemplateResp(entity *repository.Template) *models.TemplateResp {
	description := ""
	if entity.Description.Valid {
		description = entity.Description.String
	}
	return &models.TemplateResp{
		ID:               entity.ID,
		TemplateCode:     entity.TemplateCode,
		Name:             entity.Name,
		TemplateType:     entity.TemplateType,
		OutputFormat:     entity.OutputFormat,
		Description:      description,
		TemplateContent:  entity.TemplateContent,
		Version:          entity.Version,
		PageSettingsJSON: entity.PageSettingsJSON,
		IsSystemDefault:  entity.IsSystemDefault,
		IsActive:         entity.IsActive,
		CreatedBy:        entity.CreatedBy,
		CreatedAt:        entity.CreatedAt,
		UpdatedBy:        entity.UpdatedBy,
		UpdatedAt:        entity.UpdatedAt,
	}
}

func (uc *TemplateUseCasesImpl) toTemplateSummaryResp(entity *repository.Template) *models.TemplateSummaryResp {
	description := ""
	if entity.Description.Valid {
		description = entity.Description.String
	}
	return &models.TemplateSummaryResp{
		ID:               entity.ID,
		TemplateCode:     entity.TemplateCode,
		Name:             entity.Name,
		TemplateType:     entity.TemplateType,
		OutputFormat:     entity.OutputFormat,
		Description:      description,
		Version:          entity.Version,
		PageSettingsJSON: entity.PageSettingsJSON,
		IsSystemDefault:  entity.IsSystemDefault,
		IsActive:         entity.IsActive,
		CreatedBy:        entity.CreatedBy,
		CreatedAt:        entity.CreatedAt,
		UpdatedBy:        entity.UpdatedBy,
		UpdatedAt:        entity.UpdatedAt,
	}
}

func marshalPageSettings(ps *models.PageSettingsJSON) json.RawMessage {
	if ps == nil {
		return nil
	}
	data, err := json.Marshal(ps)
	if err != nil {
		return nil
	}
	return data
}

// Generate renders a PDF from template + data.
// 1. Fetch template by ID
// 2. Parse templateContent into engine.TemplateData
// 3. Merge placeholders with provided data
// 4. Render to PDF bytes
func (uc *TemplateUseCasesImpl) Generate(templateId string, data map[string]interface{}) ([]byte, *hmodels.UseCasesError) {
	if len(templateId) == 0 {
		return nil, hutils.BuildUseCasesError([]string{"body.templateId is required."}, http.StatusBadRequest, -1, "Failed")
	}

	// Fetch template
	entity, err := uc.repo.FindByID(templateId)
	if err != nil {
		hlogger.Log.Errorf("Error finding template for generate: %v", err)
		return nil, hutils.BuildUseCasesError([]string{"Database Error."}, http.StatusInternalServerError, -100006, "Database Error.")
	}
	if entity == nil {
		return nil, hutils.BuildUseCasesError([]string{"Template tidak ditemukan."}, http.StatusNotFound, -1, "Failed")
	}
	if !entity.IsActive {
		return nil, hutils.BuildUseCasesError([]string{"Template tidak aktif."}, http.StatusBadRequest, -1, "Failed")
	}

	// Parse templateContent — could be:
	// 1. Full TemplateData JSON: {"size":{...},"margin_mm":...,"elements":[...]}
	// 2. Just elements array: [{...},{...}]
	var templateData engine.TemplateData
	content := []byte(entity.TemplateContent)

	// Try parsing as full TemplateData first
	if err := json.Unmarshal(content, &templateData); err != nil || len(templateData.Elements) == 0 {
		// Try parsing as elements array directly
		var elements []engine.Element
		if err2 := json.Unmarshal(content, &elements); err2 != nil {
			hlogger.Log.Errorf("Error parsing templateContent: %v / %v", err, err2)
			return nil, hutils.BuildUseCasesError([]string{"Template content tidak dapat di-render. Format harus berupa JSON layout."}, http.StatusBadRequest, -1, "Failed")
		}
		templateData.Elements = elements
	}

	// Determine page size from pageSettingsJson
	if entity.PageSettingsJSON != nil && len(entity.PageSettingsJSON) > 0 {
		var ps models.PageSettingsJSON
		if err := json.Unmarshal(entity.PageSettingsJSON, &ps); err == nil {
			templateData.Size = engine.PageSize{
				Type:        ps.SizeType,
				WidthMM:     ps.WidthMm,
				HeightMM:    ps.HeightMm,
				Orientation: ps.Orientation,
			}
			if templateData.MarginMM == 0 {
				templateData.MarginMM = ps.MarginMm
			}
		}
	}

	// Fallback if no page size set
	if templateData.Size.WidthMM == 0 {
		templateData.Size = engine.PageSize{Type: "A4", WidthMM: 210, HeightMM: 297, Orientation: "portrait"}
		templateData.MarginMM = 10
	}

	pageSize := templateData.Size

	// Merge placeholders with data
	mergeEngine := engine.NewMergeEngine()
	merged, err := mergeEngine.Merge(&templateData, data)
	if err != nil {
		hlogger.Log.Errorf("Error merging template: %v", err)
		return nil, hutils.BuildUseCasesError([]string{"Gagal memproses placeholder template: " + err.Error()}, http.StatusBadRequest, -1, "Failed")
	}

	// Render to PDF
	barcodeGen := engine.NewBarcodeGenerator()
	renderer := engine.NewPDFRenderer(barcodeGen)
	pdfBytes, err := renderer.Render([]*engine.MergedTemplate{merged}, pageSize)
	if err != nil {
		hlogger.Log.Errorf("Error rendering PDF: %v", err)
		return nil, hutils.BuildUseCasesError([]string{"Gagal membuat PDF: " + err.Error()}, http.StatusInternalServerError, -1, "Failed")
	}

	return pdfBytes, nil
}
