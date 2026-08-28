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

type RoleApi struct {
	Id           string         `gorm:"primaryKey;column:id" json:"id" yaml:"id"`
	RoleName     string         `gorm:"column:role_name" json:"roleName" yaml:"roleName"`
	ServiceName  string         `gorm:"column:service_name" json:"serviceName" yaml:"serviceName"`
	Description  string         `gorm:"column:description" json:"description" yaml:"description"`
	HttpMethod   string         `gorm:"column:http_method" json:"httpMethod" yaml:"httpMethod"`
	HttpEndpoint string         `gorm:"column:http_endpoint" json:"httpEndpoint" yaml:"httpEndpoint"`
	IsActive     bool           `gorm:"column:is_active" json:"isActive" yaml:"isActive" default:"true"`
	CreatedBy    string         `gorm:"column:created_by" json:"createdBy" yaml:"createdBy"`
	CreatedAt    time.Time      `gorm:"column:created_at" json:"createdAt" yaml:"createdAt"`
	UpdatedBy    string         `gorm:"column:updated_by" json:"updatedBy" yaml:"updatedBy"`
	UpdatedAt    time.Time      `gorm:"column:updated_at" json:"updatedAt" yaml:"updatedAt"`
	DeletedBy    sql.NullString `gorm:"column:deleted_by" json:"deletedBy" yaml:"deletedBy"`
	DeletedAt    sql.NullTime   `gorm:"column:deleted_at" json:"deletedAt" yaml:"deletedAt"`
}

func (RoleApi) TableName() string {
	return "sa_r_role_api"
}

type RoleApiRepository struct {
	Db *gorm.DB
}

func NewRoleApiRepository(dbInstance *gorm.DB) (*RoleApiRepository, error) {

	if dbInstance == nil {
		return nil, errors.New("failed to get database connection")
	}

	//// Auto-migrate the table structure
	//if err := dbInstance.AutoMigrate(&RoleApi{}); err != nil {
	//	return nil, err
	//}

	return &RoleApiRepository{Db: dbInstance}, nil
}

func (r *RoleApiRepository) Save(param *RoleApi) error {
	if len(param.CreatedBy) == 0 {
		return errors.New("no provide user action for save")
	}
	param.CreatedAt = time.Now()
	param.UpdatedBy = param.CreatedBy
	param.UpdatedAt = param.CreatedAt
	return r.Db.Create(param).Error
}

func (r *RoleApiRepository) Update(param *RoleApi) error {
	if len(param.UpdatedBy) == 0 {
		return errors.New("no provided user action for update")
	}
	param.UpdatedAt = time.Now()
	return r.Db.Save(param).Error
}

func (r *RoleApiRepository) Delete(param *RoleApi) error {
	if !param.DeletedBy.Valid {
		return errors.New("no provided user action for delete")
	}
	param.IsActive = false
	param.DeletedAt = sql.NullTime{Time: time.Now(), Valid: true}
	return r.Db.Model(&RoleApi{Id: param.Id}).Omit("updated_at").Updates(map[string]interface{}{
		"is_active":  param.IsActive,
		"deleted_at": param.DeletedAt,
		"deleted_by": param.DeletedBy,
	}).Error
}

func (r *RoleApiRepository) FindByID(id string) (*RoleApi, error) {
	var result RoleApi
	if err := r.Db.First(&result, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (r *RoleApiRepository) FindByUniqueKey(roleName string, method string, endpoint string) (*RoleApi, error) {
	var result RoleApi
	if err := r.Db.Where(&RoleApi{RoleName: roleName, HttpMethod: method, HttpEndpoint: endpoint}).First(&result).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (r *RoleApiRepository) FindByRoleName(roleName string) ([]RoleApi, error) {
	var result []RoleApi
	if err := r.Db.Where("role_name=?", roleName).Find(&result).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return result, nil
}

func (r *RoleApiRepository) FindAll() ([]RoleApi, error) {
	var result []RoleApi
	if err := r.Db.Find(&result).Limit(constants.RepositoryMaxLimitFind).Error; err != nil {
		return nil, err
	}
	return result, nil
}

func (r *RoleApiRepository) FindBy(param hmodels.SearchRequest) ([]RoleApi, int64, error) {
	db := r.Db.Model(&RoleApi{})
	filters := r.createFilter(param.Filters)
	paging := param.Paging
	offset := 0

	if paging.Page > 1 {
		offset = (paging.Page - 1) * paging.PageSize
	}

	for field, value := range filters {
		db = db.Where(fmt.Sprintf("%s = ?", field), value)
	}
	if len(paging.SortBy) > 0 {
		db = db.Order(fmt.Sprintf("%s %s", paging.SortBy, paging.SortDirection))
	}
	var data []RoleApi
	var totalData int64
	err := db.Limit(constants.RepositoryMaxLimitFind).Count(&totalData).Error
	if err != nil {
		return nil, 0, err
	}
	err = db.Limit(paging.PageSize).Offset(offset).Find(&data).Error
	if err != nil {
		return nil, 0, err
	}
	return data, totalData, nil
}

func (r *RoleApiRepository) createFilter(param map[string]interface{}) map[string]interface{} {
	filters := make(map[string]interface{})
	for key, value := range param {

		if key == "rolename" || key == "role_name" || key == "Rolename" || key == "RoleName" {
			filters["role_name"] = value
			continue
		}
		if key == "servicename" || key == "service_name" || key == "Servicename" || key == "ServiceName" {
			filters["service_name"] = value
			continue
		}
		if key == "description" || key == "Description" {
			filters["description"] = value
			continue
		}
		if key == "httpmethod" || key == "http_method" || key == "Httpmethod" || key == "HttpMethod" || key == "httpMethod" {
			filters["http_method"] = value
			continue
		}
		if key == "httpendpoint" || key == "http_endpoint" || key == "Httpendpoint" || key == "HttpEndpoint" || key == "httpEndpoint" {
			filters["http_endpoint"] = value
			continue
		}
		if key == "isactive" || key == "is_active" || key == "IsActive" || key == "isActive" {
			filters["is_active"] = value
			continue
		}
		if key == "createdby" || key == "created_by" || key == "Createdby" || key == "CreatedBy" || key == "createdBy" {
			filters["created_by"] = value
			continue
		}
		if key == "createdat" || key == "created_at" || key == "Createdat" || key == "CreatedAt" || key == "createdAt" {
			filters["created_at"] = value
			continue
		}
		if key == "modifiedby" || key == "modified_by" || key == "Modifiedby" || key == "ModifiedBy" || key == "modifiedBy" {
			filters["modified_by"] = value
			continue
		}
		if key == "modifiedat" || key == "modified_at" || key == "Modifiedat" || key == "ModifiedAt" || key == "modifiedAt" {
			filters["modified_at"] = value
			continue
		}
		if key == "deletedby" || key == "deleted_by" || key == "Deletedby" || key == "DeletedBy" || key == "deletedBy" {
			filters["deleted_by"] = value
			continue
		}
		if key == "deletedat" || key == "deleted_at" || key == "Deletedat" || key == "DeletedAt" || key == "deletedAt" {
			filters["deleted_at"] = value
			continue
		}
		filters[key] = value
	}
	return filters
}
