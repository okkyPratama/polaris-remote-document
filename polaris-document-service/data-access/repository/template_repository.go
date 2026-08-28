package repository

import (
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"gorm.io/gorm"
)

type Template struct {
	ID              string         `gorm:"primaryKey;column:id" json:"id"`
	TemplateCode    string         `gorm:"column:template_code" json:"templateCode"`
	Name            string         `gorm:"column:name" json:"name"`
	TemplateType    string         `gorm:"column:template_type" json:"templateType"`
	OutputFormat    string         `gorm:"column:output_format" json:"outputFormat"`
	Description     sql.NullString `gorm:"column:description" json:"description"`
	TemplateContent string          `gorm:"column:template_content" json:"templateContent"`
	Version         int             `gorm:"column:version" json:"version"`
	PageSettingsJSON json.RawMessage `gorm:"column:page_settings_json;type:json" json:"pageSettingsJson"`
	IsSystemDefault bool            `gorm:"column:is_system_default" json:"isSystemDefault"`
	IsActive        bool           `gorm:"column:is_active" json:"isActive"`
	IsDeleted       bool           `gorm:"column:is_deleted" json:"isDeleted"`
	CreatedBy       string         `gorm:"column:created_by" json:"createdBy"`
	CreatedAt       time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedBy       string         `gorm:"column:updated_by" json:"updatedBy"`
	UpdatedAt       time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedBy       sql.NullString `gorm:"column:deleted_by" json:"deletedBy"`
	DeletedAt       sql.NullTime   `gorm:"column:deleted_at" json:"deletedAt"`
}

func (Template) TableName() string { return "m_template" }

type TemplateRepository struct {
	Db *gorm.DB
}

func NewTemplateRepository(dbInstance *gorm.DB) (*TemplateRepository, error) {
	if dbInstance == nil {
		return nil, errors.New("failed to get database connection")
	}
	return &TemplateRepository{Db: dbInstance}, nil
}

func (r *TemplateRepository) Save(entity *Template) error {
	if len(entity.CreatedBy) == 0 {
		return errors.New("no provide user action for save")
	}
	entity.CreatedAt = time.Now()
	entity.UpdatedBy = entity.CreatedBy
	entity.UpdatedAt = entity.CreatedAt
	entity.IsDeleted = false
	return r.Db.Create(entity).Error
}

func (r *TemplateRepository) Update(entity *Template) error {
	if len(entity.UpdatedBy) == 0 {
		return errors.New("no provided user action for update")
	}
	entity.UpdatedAt = time.Now()
	return r.Db.Save(entity).Error
}

func (r *TemplateRepository) Delete(entity *Template) error {
	if !entity.DeletedBy.Valid {
		return errors.New("no provided user action for delete")
	}
	entity.IsDeleted = true
	entity.DeletedAt = sql.NullTime{Time: time.Now(), Valid: true}
	return r.Db.Save(entity).Error
}

func (r *TemplateRepository) FindByID(id string) (*Template, error) {
	var result Template
	if err := r.Db.Where("id = ? AND is_deleted = ?", id, false).First(&result).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (r *TemplateRepository) FindByCode(code string) (*Template, error) {
	var result Template
	if err := r.Db.Where("template_code = ? AND is_deleted = ?", code, false).First(&result).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (r *TemplateRepository) FindByName(name string) (*Template, error) {
	var result Template
	if err := r.Db.Where("name = ? AND is_deleted = ?", name, false).First(&result).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (r *TemplateRepository) FindSystemDefault(templateType string) (*Template, error) {
	var result Template
	if err := r.Db.Where("template_type = ? AND is_system_default = ? AND is_active = ? AND is_deleted = ?",
		templateType, true, true, false).First(&result).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (r *TemplateRepository) ExistsByCode(code string, excludeID string) (bool, error) {
	var count int64
	query := r.Db.Model(&Template{}).Where("template_code = ? AND is_deleted = ?", code, false)
	if excludeID != "" {
		query = query.Where("id != ?", excludeID)
	}
	if err := query.Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *TemplateRepository) ExistsByName(name string, excludeID string) (bool, error) {
	var count int64
	query := r.Db.Model(&Template{}).Where("name = ? AND is_deleted = ?", name, false)
	if excludeID != "" {
		query = query.Where("id != ?", excludeID)
	}
	if err := query.Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *TemplateRepository) FindAllFiltered(conditions []FilterCondition, page, pageSize int, sortBy, sortDir string) ([]Template, int64, error) {
	var results []Template
	var total int64

	query := r.Db.Model(&Template{}).Where("is_deleted = ?", false)
	query = ApplyFilters(query, conditions, templateAllowedColumns)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	orderClause := BuildOrderClause(sortBy, sortDir, templateAllowedColumns)
	offset := (page - 1) * pageSize
	if err := query.Order(orderClause).Offset(offset).Limit(pageSize).Find(&results).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, 0, nil
		}
		return nil, 0, err
	}
	return results, total, nil
}

var templateAllowedColumns = map[string]string{
	"name":            "name",
	"templateCode":    "template_code",
	"templateType":    "template_type",
	"outputFormat":    "output_format",
	"isActive":        "is_active",
	"isSystemDefault": "is_system_default",
	"createdBy":       "created_by",
	"createdAt":       "created_at",
	"updatedAt":       "updated_at",
}
