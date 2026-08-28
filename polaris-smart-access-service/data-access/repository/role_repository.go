package repository

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"bitbucket.org/log-tech/helper-go/hmodels"
	"bitbucket.org/log-tech/polaris-smart-access-service/constants"
	"gorm.io/gorm"
)

type Role struct {
	Id          string         `gorm:"primaryKey;column:id" json:"id"`
	Code        string         `gorm:"column:code" json:"code"`
	Name        string         `gorm:"column:name" json:"name"`
	Description sql.NullString `gorm:"column:description" json:"description"`
	IsSystem    bool           `gorm:"column:is_system" json:"isSystem"`
	Status      string         `gorm:"column:status" json:"status"`
	IsDeleted   bool           `gorm:"column:is_deleted" json:"isDeleted"`
	CreatedBy   string         `gorm:"column:created_by" json:"createdBy"`
	CreatedAt   time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedBy   string         `gorm:"column:updated_by" json:"updatedBy"`
	UpdatedAt   time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedBy   sql.NullString `gorm:"column:deleted_by" json:"deletedBy"`
	DeletedAt   sql.NullTime   `gorm:"column:deleted_at" json:"deletedAt"`
}

func (Role) TableName() string {
	return "sa_m_role"
}

type RoleRepository struct {
	Db *gorm.DB
}

func NewRoleRepository(dbInstance *gorm.DB) (*RoleRepository, error) {
	if dbInstance == nil {
		return nil, errors.New("failed to get database connection")
	}
	return &RoleRepository{Db: dbInstance}, nil
}

func (r *RoleRepository) Save(param *Role) error {
	if len(param.CreatedBy) == 0 {
		return errors.New("no provide user action for save")
	}
	param.CreatedAt = time.Now()
	param.UpdatedBy = param.CreatedBy
	param.UpdatedAt = param.CreatedAt
	param.IsDeleted = false
	if param.Status == "" {
		param.Status = "ACTIVE"
	}
	return r.Db.Create(param).Error
}

func (r *RoleRepository) Update(param *Role) error {
	if len(param.UpdatedBy) == 0 {
		return errors.New("no provided user action for update")
	}
	param.UpdatedAt = time.Now()
	return r.Db.Save(param).Error
}

func (r *RoleRepository) Delete(param *Role) error {
	if !param.DeletedBy.Valid {
		return errors.New("no provided user action for delete")
	}
	param.IsDeleted = true
	param.DeletedAt = sql.NullTime{Time: time.Now(), Valid: true}
	return r.Db.Model(&Role{Id: param.Id}).Updates(map[string]interface{}{
		"is_deleted": true,
		"deleted_at": param.DeletedAt,
		"deleted_by": param.DeletedBy,
	}).Error
}

func (r *RoleRepository) FindByID(id string) (*Role, error) {
	var result Role
	if err := r.Db.Where("id = ? AND is_deleted = false", id).First(&result).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (r *RoleRepository) FindByCode(code string) (*Role, error) {
	var result Role
	if err := r.Db.Where("code = ? AND is_deleted = false", code).First(&result).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (r *RoleRepository) FindAll() ([]Role, error) {
	var entities []Role
	if err := r.Db.Where("is_deleted = false").Limit(constants.RepositoryMaxLimitFind).Find(&entities).Error; err != nil {
		return nil, err
	}
	return entities, nil
}

func (r *RoleRepository) FindBy(param hmodels.SearchRequest) ([]Role, int64, error) {
	db := r.Db.Model(&Role{}).Where("is_deleted = false")
	paging := param.Paging
	offset := 0

	if paging.Page > 1 {
		offset = (paging.Page - 1) * paging.PageSize
	}

	// Parse structured filter: {"and": [{"field":"...", "operator":"...", "value":"..."}]}
	if andFilters, ok := param.Filters["and"]; ok {
		if filterList, ok := andFilters.([]interface{}); ok {
			for _, f := range filterList {
				filter, ok := f.(map[string]interface{})
				if !ok {
					continue
				}
				field, _ := filter["field"].(string)
				operator, _ := filter["operator"].(string)
				value := filter["value"]

				// Whitelist fields
				switch field {
				case "code", "name", "status":
					// valid
				case "is_system":
					// valid
				default:
					continue
				}

				switch operator {
				case "=":
					db = db.Where(fmt.Sprintf("%s = ?", field), value)
				case "!=":
					db = db.Where(fmt.Sprintf("%s != ?", field), value)
				case "like", "ilike":
					db = db.Where(fmt.Sprintf("LOWER(%s) LIKE LOWER(?)", field), value)
				}
			}
		}
	}

	// Sort
	if len(paging.SortBy) > 0 {
		direction := paging.SortDirection
		if direction == "" {
			direction = "DESC"
		}
		db = db.Order(fmt.Sprintf("%s %s", paging.SortBy, direction))
	} else {
		db = db.Order("created_at DESC")
	}

	var totalData int64
	if err := db.Count(&totalData).Error; err != nil {
		return nil, 0, err
	}

	var data []Role
	if err := db.Limit(paging.PageSize).Offset(offset).Find(&data).Error; err != nil {
		return nil, 0, err
	}

	return data, totalData, nil
}

func (r *RoleRepository) CountUsersByRoleId(roleId string) int {
	var count int64
	if err := r.Db.Model(&UserRole{}).Where("role_id = ? AND is_deleted = false", roleId).Count(&count).Error; err != nil {
		return 0
	}
	return int(count)
}

// FindAllActive - Get all active roles (status = ACTIVE, is_deleted = false)
func (r *RoleRepository) FindAllActive() ([]Role, error) {
	var entities []Role
	if err := r.Db.Where("status = ? AND is_deleted = false", "ACTIVE").
		Limit(constants.RepositoryMaxLimitFind).
		Order("code ASC").
		Find(&entities).Error; err != nil {
		return nil, err
	}
	return entities, nil
}
