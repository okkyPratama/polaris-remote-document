package repository

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"bitbucket.org/log-tech/helper-go/hmodels"
	"gorm.io/gorm"
)

type UserRole struct {
	Id        string         `gorm:"primaryKey;column:id"`
	UserId    string         `gorm:"column:user_id"`
	RoleId    string         `gorm:"column:role_id"`
	IsDeleted bool           `gorm:"column:is_deleted"`
	CreatedBy string         `gorm:"column:created_by"`
	CreatedAt time.Time      `gorm:"column:created_at"`
	UpdatedBy string         `gorm:"column:updated_by"`
	UpdatedAt time.Time      `gorm:"column:updated_at"`
	DeletedBy sql.NullString `gorm:"column:deleted_by"`
	DeletedAt sql.NullTime   `gorm:"column:deleted_at"`
}

func (UserRole) TableName() string {
	return "sa_r_user_role"
}

type UserRoleRepository struct {
	Db *gorm.DB
}

func NewUserRoleRepository(dbInstance *gorm.DB) (*UserRoleRepository, error) {
	if dbInstance == nil {
		return nil, errors.New("failed to get database connection")
	}
	return &UserRoleRepository{Db: dbInstance}, nil
}

func (r *UserRoleRepository) Save(param *UserRole) error {
	param.CreatedAt = time.Now()
	param.UpdatedBy = param.CreatedBy
	param.UpdatedAt = param.CreatedAt
	param.IsDeleted = false
	return r.Db.Create(param).Error
}

func (r *UserRoleRepository) Update(param *UserRole) error {
	param.UpdatedAt = time.Now()
	return r.Db.Save(param).Error
}

func (r *UserRoleRepository) Delete(param *UserRole) error {
	now := time.Now()
	return r.Db.Model(&UserRole{Id: param.Id}).Updates(map[string]interface{}{
		"is_deleted": true,
		"deleted_by": param.DeletedBy,
		"deleted_at": sql.NullTime{Time: now, Valid: true},
	}).Error
}

func (r *UserRoleRepository) FindByID(id string) (*UserRole, error) {
	var result UserRole
	if err := r.Db.Where("id = ? AND is_deleted = false", id).First(&result).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (r *UserRoleRepository) FindByUniqueKey(userId string, roleId string) (*UserRole, error) {
	var result UserRole
	if err := r.Db.Where("user_id = ? AND role_id = ? AND is_deleted = false", userId, roleId).First(&result).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (r *UserRoleRepository) FindByUserId(userId string) ([]UserRole, error) {
	var result []UserRole
	if err := r.Db.Where("user_id = ? AND is_deleted = false", userId).Find(&result).Error; err != nil {
		return nil, err
	}
	return result, nil
}

func (r *UserRoleRepository) FindBy(param hmodels.SearchRequest) ([]UserRole, int64, error) {
	db := r.Db.Model(&UserRole{}).Where("is_deleted = false")
	paging := param.Paging
	offset := 0

	if paging.Page > 1 {
		offset = (paging.Page - 1) * paging.PageSize
	}

	for key, value := range param.Filters {
		switch key {
		case "userId", "user_id":
			db = db.Where("user_id = ?", value)
		case "roleId", "role_id":
			db = db.Where("role_id = ?", value)
		}
	}

	if len(paging.SortBy) > 0 {
		db = db.Order(fmt.Sprintf("%s %s", paging.SortBy, paging.SortDirection))
	} else {
		db = db.Order("created_at DESC")
	}

	var data []UserRole
	var totalData int64
	if err := db.Count(&totalData).Error; err != nil {
		return nil, 0, err
	}
	if err := db.Limit(paging.PageSize).Offset(offset).Find(&data).Error; err != nil {
		return nil, 0, err
	}
	return data, totalData, nil
}

func (r *UserRoleRepository) CountByRoleId(roleId string) (int, error) {
	var count int64
	if err := r.Db.Model(&UserRole{}).Where("role_id = ? AND is_deleted = false", roleId).Count(&count).Error; err != nil {
		return 0, err
	}
	return int(count), nil
}
