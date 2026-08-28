package repository

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"bitbucket.org/log-tech/helper-go/hmodels"
	"gorm.io/gorm"
)

type Permission struct {
	Id          string         `gorm:"primaryKey;column:id"`
	Key         string         `gorm:"column:key"`
	Resource    string         `gorm:"column:resource"`
	Action      string         `gorm:"column:action"`
	Description sql.NullString `gorm:"column:description"`
	Module      sql.NullString `gorm:"column:module"`
	IsDeleted   bool           `gorm:"column:is_deleted"`
	CreatedBy   string         `gorm:"column:created_by"`
	CreatedAt   time.Time      `gorm:"column:created_at"`
	UpdatedBy   string         `gorm:"column:updated_by"`
	UpdatedAt   time.Time      `gorm:"column:updated_at"`
	DeletedBy   sql.NullString `gorm:"column:deleted_by"`
	DeletedAt   sql.NullTime   `gorm:"column:deleted_at"`
}

func (Permission) TableName() string {
	return "sa_m_permission"
}

type PermissionRepository struct {
	Db *gorm.DB
}

func NewPermissionRepository(dbInstance *gorm.DB) (*PermissionRepository, error) {
	if dbInstance == nil {
		return nil, errors.New("failed to get database connection")
	}
	return &PermissionRepository{Db: dbInstance}, nil
}

func (r *PermissionRepository) Save(param *Permission) error {
	param.CreatedAt = time.Now()
	param.UpdatedBy = param.CreatedBy
	param.UpdatedAt = param.CreatedAt
	param.IsDeleted = false
	return r.Db.Create(param).Error
}

func (r *PermissionRepository) Update(param *Permission) error {
	param.UpdatedAt = time.Now()
	return r.Db.Save(param).Error
}

func (r *PermissionRepository) Delete(param *Permission) error {
	now := time.Now()
	return r.Db.Model(&Permission{Id: param.Id}).Updates(map[string]interface{}{
		"is_deleted": true,
		"deleted_by": param.DeletedBy,
		"deleted_at": sql.NullTime{Time: now, Valid: true},
	}).Error
}

func (r *PermissionRepository) FindByID(id string) (*Permission, error) {
	var result Permission
	if err := r.Db.Where("id = ? AND is_deleted = false", id).First(&result).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (r *PermissionRepository) FindByKey(key string) (*Permission, error) {
	var result Permission
	if err := r.Db.Where("`key` = ? AND is_deleted = false", key).First(&result).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (r *PermissionRepository) FindByUniqueKey(key string) (*Permission, error) {
	return r.FindByKey(key)
}

func (r *PermissionRepository) FindBy(param hmodels.SearchRequest) ([]Permission, int64, error) {
	db := r.Db.Model(&Permission{}).Where("is_deleted = false")
	paging := param.Paging
	offset := 0

	if paging.Page > 1 {
		offset = (paging.Page - 1) * paging.PageSize
	}

	// Apply filters
	for key, value := range param.Filters {
		switch key {
		case "key":
			db = db.Where("`key` ILIKE ?", fmt.Sprintf("%%%v%%", value))
		case "resource":
			db = db.Where("resource = ?", value)
		case "action":
			db = db.Where("action = ?", value)
		case "module":
			db = db.Where("module = ?", value)
		}
	}

	if len(paging.SortBy) > 0 {
		db = db.Order(fmt.Sprintf("%s %s", paging.SortBy, paging.SortDirection))
	} else {
		db = db.Order("resource ASC, action ASC")
	}

	var data []Permission
	var totalData int64
	if err := db.Count(&totalData).Error; err != nil {
		return nil, 0, err
	}
	if err := db.Limit(paging.PageSize).Offset(offset).Find(&data).Error; err != nil {
		return nil, 0, err
	}
	return data, totalData, nil
}
