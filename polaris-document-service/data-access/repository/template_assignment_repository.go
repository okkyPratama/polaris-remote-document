package repository

import (
	"database/sql"
	"errors"
	"time"

	"gorm.io/gorm"
)

type TemplateAssignment struct {
	ID            string         `gorm:"primaryKey;column:id" json:"id"`
	CompanyID     sql.NullString `gorm:"column:company_id" json:"companyId"`
	WarehouseID   sql.NullString `gorm:"column:warehouse_id" json:"warehouseId"`
	OwnerID       sql.NullString `gorm:"column:owner_id" json:"ownerId"`
	TemplateType  string         `gorm:"column:template_type" json:"templateType"`
	TemplateID    string         `gorm:"column:template_id" json:"templateId"`
	EffectiveFrom string         `gorm:"column:effective_from" json:"effectiveFrom"`
	IsDeleted     bool           `gorm:"column:is_deleted" json:"isDeleted"`
	CreatedBy     string         `gorm:"column:created_by" json:"createdBy"`
	CreatedAt     time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedBy     string         `gorm:"column:updated_by" json:"updatedBy"`
	UpdatedAt     time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedBy     sql.NullString `gorm:"column:deleted_by" json:"deletedBy"`
	DeletedAt     sql.NullTime   `gorm:"column:deleted_at" json:"deletedAt"`
}

func (TemplateAssignment) TableName() string { return "r_template_assignment" }

type TemplateAssignmentRepository struct {
	Db *gorm.DB
}

func NewTemplateAssignmentRepository(dbInstance *gorm.DB) (*TemplateAssignmentRepository, error) {
	if dbInstance == nil {
		return nil, errors.New("failed to get database connection")
	}
	return &TemplateAssignmentRepository{Db: dbInstance}, nil
}

func (r *TemplateAssignmentRepository) Save(entity *TemplateAssignment) error {
	if len(entity.CreatedBy) == 0 {
		return errors.New("no provide user action for save")
	}
	entity.CreatedAt = time.Now()
	entity.UpdatedBy = entity.CreatedBy
	entity.UpdatedAt = entity.CreatedAt
	entity.IsDeleted = false
	return r.Db.Create(entity).Error
}

func (r *TemplateAssignmentRepository) Update(entity *TemplateAssignment) error {
	if len(entity.UpdatedBy) == 0 {
		return errors.New("no provided user action for update")
	}
	entity.UpdatedAt = time.Now()
	return r.Db.Save(entity).Error
}

func (r *TemplateAssignmentRepository) Delete(entity *TemplateAssignment) error {
	if !entity.DeletedBy.Valid {
		return errors.New("no provided user action for delete")
	}
	entity.IsDeleted = true
	entity.DeletedAt = sql.NullTime{Time: time.Now(), Valid: true}
	return r.Db.Save(entity).Error
}

func (r *TemplateAssignmentRepository) FindByID(id string) (*TemplateAssignment, error) {
	var result TemplateAssignment
	if err := r.Db.Where("id = ? AND is_deleted = ?", id, false).First(&result).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

// FindByScope resolves template assignment using the resolution chain:
// 1. Owner + Warehouse
// 2. Owner only
// 3. Warehouse only
// 4. Company only
// First match wins. Each level: ORDER BY effective_from DESC LIMIT 1
func (r *TemplateAssignmentRepository) FindByScope(companyID, warehouseID, ownerID, templateType string) (*TemplateAssignment, error) {
	var result TemplateAssignment

	// Level 1: Owner + Warehouse (most specific)
	if ownerID != "" && warehouseID != "" {
		err := r.Db.Where(
			"owner_id = ? AND warehouse_id = ? AND template_type = ? AND is_deleted = ?",
			ownerID, warehouseID, templateType, false,
		).Order("effective_from DESC").First(&result).Error
		if err == nil {
			return &result, nil
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
	}

	// Level 2: Owner only
	if ownerID != "" {
		err := r.Db.Where(
			"owner_id = ? AND (warehouse_id IS NULL OR warehouse_id = '') AND (company_id IS NULL OR company_id = '') AND template_type = ? AND is_deleted = ?",
			ownerID, templateType, false,
		).Order("effective_from DESC").First(&result).Error
		if err == nil {
			return &result, nil
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
	}

	// Level 3: Warehouse only
	if warehouseID != "" {
		err := r.Db.Where(
			"warehouse_id = ? AND (owner_id IS NULL OR owner_id = '') AND (company_id IS NULL OR company_id = '') AND template_type = ? AND is_deleted = ?",
			warehouseID, templateType, false,
		).Order("effective_from DESC").First(&result).Error
		if err == nil {
			return &result, nil
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
	}

	// Level 4: Company only
	if companyID != "" {
		err := r.Db.Where(
			"company_id = ? AND (owner_id IS NULL OR owner_id = '') AND (warehouse_id IS NULL OR warehouse_id = '') AND template_type = ? AND is_deleted = ?",
			companyID, templateType, false,
		).Order("effective_from DESC").First(&result).Error
		if err == nil {
			return &result, nil
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
	}

	// No assignment found — caller should fall back to system default
	return nil, nil
}

// FindAllByScope retrieves all assignments matching the given scope filters.
func (r *TemplateAssignmentRepository) FindAllByScope(companyID, warehouseID, ownerID, templateType string) ([]TemplateAssignment, error) {
	var results []TemplateAssignment

	query := r.Db.Model(&TemplateAssignment{}).Where("is_deleted = ?", false)

	if companyID != "" {
		query = query.Where("company_id = ?", companyID)
	}
	if warehouseID != "" {
		query = query.Where("warehouse_id = ?", warehouseID)
	}
	if ownerID != "" {
		query = query.Where("owner_id = ?", ownerID)
	}
	if templateType != "" {
		query = query.Where("template_type = ?", templateType)
	}

	if err := query.Order("effective_from DESC").Find(&results).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return results, nil
}

// FindByTemplateID retrieves all assignments for a given template ID.
func (r *TemplateAssignmentRepository) FindByTemplateID(templateID string) ([]TemplateAssignment, error) {
	var results []TemplateAssignment
	if err := r.Db.Where("template_id = ? AND is_deleted = ?", templateID, false).
		Order("effective_from DESC").Find(&results).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return results, nil
}

// ExistsDuplicate checks if an assignment with the same scope already exists.
func (r *TemplateAssignmentRepository) ExistsDuplicate(companyID, warehouseID, ownerID, templateType, effectiveFrom, excludeID string) (bool, error) {
	var count int64
	query := r.Db.Model(&TemplateAssignment{}).Where("is_deleted = ?", false)

	if companyID != "" {
		query = query.Where("company_id = ?", companyID)
	} else {
		query = query.Where("(company_id IS NULL OR company_id = '')")
	}

	if warehouseID != "" {
		query = query.Where("warehouse_id = ?", warehouseID)
	} else {
		query = query.Where("(warehouse_id IS NULL OR warehouse_id = '')")
	}

	if ownerID != "" {
		query = query.Where("owner_id = ?", ownerID)
	} else {
		query = query.Where("(owner_id IS NULL OR owner_id = '')")
	}

	query = query.Where("template_type = ? AND effective_from = ?", templateType, effectiveFrom)

	if excludeID != "" {
		query = query.Where("id != ?", excludeID)
	}

	if err := query.Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}
