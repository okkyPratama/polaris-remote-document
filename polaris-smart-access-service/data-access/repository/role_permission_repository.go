package repository

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"bitbucket.org/log-tech/helper-go/hmodels"
	"gorm.io/gorm"
)

type RolePermission struct {
	Id           string         `gorm:"primaryKey;column:id"`
	RoleId       string         `gorm:"column:role_id"`
	PermissionId string         `gorm:"column:permission_id"`
	IsDeleted    bool           `gorm:"column:is_deleted"`
	CreatedBy    string         `gorm:"column:created_by"`
	CreatedAt    time.Time      `gorm:"column:created_at"`
	UpdatedBy    string         `gorm:"column:updated_by"`
	UpdatedAt    time.Time      `gorm:"column:updated_at"`
	DeletedBy    sql.NullString `gorm:"column:deleted_by"`
	DeletedAt    sql.NullTime   `gorm:"column:deleted_at"`
}

func (RolePermission) TableName() string {
	return "sa_r_role_permission"
}

type RolePermissionRepository struct {
	Db *gorm.DB
}

func NewRolePermissionRepository(dbInstance *gorm.DB) (*RolePermissionRepository, error) {
	if dbInstance == nil {
		return nil, errors.New("failed to get database connection")
	}
	return &RolePermissionRepository{Db: dbInstance}, nil
}

func (r *RolePermissionRepository) Save(param *RolePermission) error {
	param.CreatedAt = time.Now()
	param.UpdatedBy = param.CreatedBy
	param.UpdatedAt = param.CreatedAt
	param.IsDeleted = false
	return r.Db.Create(param).Error
}

func (r *RolePermissionRepository) Update(param *RolePermission) error {
	param.UpdatedAt = time.Now()
	return r.Db.Save(param).Error
}

func (r *RolePermissionRepository) Delete(param *RolePermission) error {
	now := time.Now()
	return r.Db.Model(&RolePermission{Id: param.Id}).Updates(map[string]interface{}{
		"is_deleted": true,
		"deleted_by": param.DeletedBy,
		"deleted_at": sql.NullTime{Time: now, Valid: true},
	}).Error
}

func (r *RolePermissionRepository) FindByID(id string) (*RolePermission, error) {
	var result RolePermission
	if err := r.Db.Where("id = ? AND is_deleted = false", id).First(&result).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (r *RolePermissionRepository) FindByUniqueKey(roleId string, permissionId string) (*RolePermission, error) {
	var result RolePermission
	if err := r.Db.Where("role_id = ? AND permission_id = ? AND is_deleted = false", roleId, permissionId).First(&result).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

// FindAnyByUniqueKey — find row regardless of is_deleted (used to reactivate soft-deleted mappings)
func (r *RolePermissionRepository) FindAnyByUniqueKey(roleId string, permissionId string) (*RolePermission, error) {
	var result RolePermission
	if err := r.Db.Where("role_id = ? AND permission_id = ?", roleId, permissionId).First(&result).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

// Reactivate — un-delete a soft-deleted mapping
func (r *RolePermissionRepository) Reactivate(id string, updatedBy string) error {
	return r.Db.Model(&RolePermission{Id: id}).Updates(map[string]interface{}{
		"is_deleted": false,
		"deleted_by": sql.NullString{},
		"deleted_at": sql.NullTime{},
		"updated_by": updatedBy,
		"updated_at": time.Now(),
	}).Error
}

func (r *RolePermissionRepository) FindByRoleId(roleId string) ([]RolePermission, error) {
	var result []RolePermission
	if err := r.Db.Where("role_id = ? AND is_deleted = false", roleId).Find(&result).Error; err != nil {
		return nil, err
	}
	return result, nil
}

func (r *RolePermissionRepository) FindBy(param hmodels.SearchRequest) ([]RolePermission, int64, error) {
	db := r.Db.Model(&RolePermission{}).Where("is_deleted = false")
	paging := param.Paging
	offset := 0

	if paging.Page > 1 {
		offset = (paging.Page - 1) * paging.PageSize
	}

	for key, value := range param.Filters {
		switch key {
		case "roleId", "role_id":
			db = db.Where("role_id = ?", value)
		case "permissionId", "permission_id":
			db = db.Where("permission_id = ?", value)
		}
	}

	if len(paging.SortBy) > 0 {
		db = db.Order(fmt.Sprintf("%s %s", paging.SortBy, paging.SortDirection))
	} else {
		db = db.Order("created_at DESC")
	}

	var data []RolePermission
	var totalData int64
	if err := db.Count(&totalData).Error; err != nil {
		return nil, 0, err
	}
	if err := db.Limit(paging.PageSize).Offset(offset).Find(&data).Error; err != nil {
		return nil, 0, err
	}
	return data, totalData, nil
}
