package repository

import (
	"database/sql"
	"errors"
	"time"

	"gorm.io/gorm"
)

type UserOwner struct {
	Id        string         `gorm:"primaryKey;column:id" json:"id"`
	UserId    string         `gorm:"column:user_id" json:"userId"`
	OwnerId   string         `gorm:"column:owner_id" json:"ownerId"`
	OwnerCode string         `gorm:"column:owner_code" json:"ownerCode"`
	OwnerName string         `gorm:"column:owner_name" json:"ownerName"`
	IsDeleted bool           `gorm:"column:is_deleted" json:"isDeleted"`
	CreatedBy string         `gorm:"column:created_by" json:"createdBy"`
	CreatedAt time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedBy string         `gorm:"column:updated_by" json:"updatedBy"`
	UpdatedAt time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedBy sql.NullString `gorm:"column:deleted_by" json:"deletedBy"`
	DeletedAt sql.NullTime   `gorm:"column:deleted_at" json:"deletedAt"`
}

func (UserOwner) TableName() string {
	return "sa_r_user_owner"
}

type UserOwnerRepository struct {
	Db *gorm.DB
}

func NewUserOwnerRepository(dbInstance *gorm.DB) (*UserOwnerRepository, error) {
	if dbInstance == nil {
		return nil, errors.New("failed to get database connection")
	}
	return &UserOwnerRepository{Db: dbInstance}, nil
}

func (r *UserOwnerRepository) Save(param *UserOwner) error {
	if len(param.CreatedBy) == 0 {
		return errors.New("no provided user action for save")
	}
	param.CreatedAt = time.Now()
	param.UpdatedBy = param.CreatedBy
	param.UpdatedAt = param.CreatedAt
	param.IsDeleted = false
	return r.Db.Create(param).Error
}

func (r *UserOwnerRepository) Update(param *UserOwner) error {
	if len(param.UpdatedBy) == 0 {
		return errors.New("no provided user action for update")
	}
	param.UpdatedAt = time.Now()
	return r.Db.Save(param).Error
}

func (r *UserOwnerRepository) Delete(param *UserOwner) error {
	if !param.DeletedBy.Valid {
		return errors.New("no provided user action for delete")
	}
	param.IsDeleted = true
	param.DeletedAt = sql.NullTime{Time: time.Now(), Valid: true}
	return r.Db.Model(&UserOwner{Id: param.Id}).Updates(map[string]interface{}{
		"is_deleted": true,
		"deleted_at": param.DeletedAt,
		"deleted_by": param.DeletedBy,
	}).Error
}

func (r *UserOwnerRepository) FindByID(id string) (*UserOwner, error) {
	var result UserOwner
	if err := r.Db.Where("id = ? AND is_deleted = false", id).First(&result).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (r *UserOwnerRepository) FindByUserAndOwner(userId string, ownerId string) (*UserOwner, error) {
	var result UserOwner
	if err := r.Db.Where("user_id = ? AND owner_id = ? AND is_deleted = false", userId, ownerId).First(&result).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (r *UserOwnerRepository) FindByUserID(userId string) ([]UserOwner, error) {
	var results []UserOwner
	if err := r.Db.Where("user_id = ? AND is_deleted = false", userId).Find(&results).Error; err != nil {
		return nil, err
	}
	return results, nil
}
