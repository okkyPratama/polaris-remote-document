package repository

import (
	"database/sql"
	"errors"
	"time"

	"gorm.io/gorm"
)

type UserWarehouse struct {
	Id            string         `gorm:"primaryKey;column:id" json:"id"`
	UserId        string         `gorm:"column:user_id" json:"userId"`
	WarehouseId   string         `gorm:"column:warehouse_id" json:"warehouseId"`
	WarehouseCode string         `gorm:"column:warehouse_code" json:"warehouseCode"`
	WarehouseName string         `gorm:"column:warehouse_name" json:"warehouseName"`
	IsDeleted     bool           `gorm:"column:is_deleted" json:"isDeleted"`
	CreatedBy     string         `gorm:"column:created_by" json:"createdBy"`
	CreatedAt     time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedBy     string         `gorm:"column:updated_by" json:"updatedBy"`
	UpdatedAt     time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedBy     sql.NullString `gorm:"column:deleted_by" json:"deletedBy"`
	DeletedAt     sql.NullTime   `gorm:"column:deleted_at" json:"deletedAt"`
}

func (UserWarehouse) TableName() string {
	return "sa_r_user_warehouse"
}

type UserWarehouseRepository struct {
	Db *gorm.DB
}

func NewUserWarehouseRepository(dbInstance *gorm.DB) (*UserWarehouseRepository, error) {
	if dbInstance == nil {
		return nil, errors.New("failed to get database connection")
	}
	return &UserWarehouseRepository{Db: dbInstance}, nil
}

func (r *UserWarehouseRepository) FindByUserID(userId string) ([]UserWarehouse, error) {
	var results []UserWarehouse
	if err := r.Db.Where("user_id = ? AND is_deleted = false", userId).Find(&results).Error; err != nil {
		return nil, err
	}
	return results, nil
}

func (r *UserWarehouseRepository) FindByUserAndWarehouse(userId string, warehouseId string) (*UserWarehouse, error) {
	var result UserWarehouse
	if err := r.Db.Where("user_id = ? AND warehouse_id = ? AND is_deleted = false", userId, warehouseId).First(&result).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (r *UserWarehouseRepository) Save(param *UserWarehouse) error {
	if len(param.CreatedBy) == 0 {
		return errors.New("no provided user action for save")
	}
	param.CreatedAt = time.Now()
	param.UpdatedBy = param.CreatedBy
	param.UpdatedAt = param.CreatedAt
	param.IsDeleted = false
	return r.Db.Create(param).Error
}

func (r *UserWarehouseRepository) Delete(param *UserWarehouse) error {
	if !param.DeletedBy.Valid {
		return errors.New("no provided user action for delete")
	}
	param.IsDeleted = true
	param.DeletedAt = sql.NullTime{Time: time.Now(), Valid: true}
	return r.Db.Model(&UserWarehouse{Id: param.Id}).Updates(map[string]interface{}{
		"is_deleted": true,
		"deleted_at": param.DeletedAt,
		"deleted_by": param.DeletedBy,
	}).Error
}

func (r *UserWarehouseRepository) Update(param *UserWarehouse) error {
	param.UpdatedAt = time.Now()
	return r.Db.Model(&UserWarehouse{Id: param.Id}).Updates(map[string]interface{}{
		"warehouse_id":   param.WarehouseId,
		"warehouse_code": param.WarehouseCode,
		"warehouse_name": param.WarehouseName,
		"is_deleted":     param.IsDeleted,
		"deleted_by":     param.DeletedBy,
		"deleted_at":     param.DeletedAt,
		"updated_by":     param.UpdatedBy,
		"updated_at":     param.UpdatedAt,
	}).Error
}

func (r *UserWarehouseRepository) FindByID(id string) (*UserWarehouse, error) {
	var result UserWarehouse
	if err := r.Db.Where("id = ? AND is_deleted = false", id).First(&result).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (r *UserWarehouseRepository) FindBy(userId string) ([]UserWarehouse, error) {
	var results []UserWarehouse
	query := r.Db.Where("is_deleted = false")
	if userId != "" {
		query = query.Where("user_id = ?", userId)
	}
	if err := query.Order("created_at DESC").Find(&results).Error; err != nil {
		return nil, err
	}
	return results, nil
}
