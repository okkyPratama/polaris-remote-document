package repository

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

// Entity: sa_t_login_event — login/logout/timeout events
type LoginEvent struct {
	Id         string    `gorm:"primaryKey;column:id" json:"id"`
	KeycloakId string    `gorm:"column:keycloak_id" json:"keycloakId"`
	Username   string    `gorm:"column:username" json:"username"`
	IpAddress  string    `gorm:"column:ip_address" json:"ipAddress"`
	EventType  string    `gorm:"column:event_type" json:"eventType"`
	IsSuccess  bool      `gorm:"column:is_success" json:"isSuccess"`
	OccurredAt time.Time `gorm:"column:occurred_at" json:"occurredAt"`
	IsDeleted  bool      `gorm:"column:is_deleted" json:"isDeleted"`
	CreatedBy  string    `gorm:"column:created_by" json:"createdBy"`
	CreatedAt  time.Time `gorm:"column:created_at" json:"createdAt"`
	UpdatedBy  string    `gorm:"column:updated_by" json:"updatedBy"`
	UpdatedAt  time.Time `gorm:"column:updated_at" json:"updatedAt"`
}

func (LoginEvent) TableName() string {
	return "sa_t_login_event"
}

type LoginEventRepository struct {
	Db *gorm.DB
}

func NewLoginEventRepository(dbInstance *gorm.DB) (*LoginEventRepository, error) {
	if dbInstance == nil {
		return nil, errors.New("failed to get database connection")
	}
	return &LoginEventRepository{Db: dbInstance}, nil
}

func (r *LoginEventRepository) Create(entity *LoginEvent) error {
	entity.CreatedAt = time.Now()
	entity.UpdatedAt = entity.CreatedAt
	entity.IsDeleted = false
	if entity.OccurredAt.IsZero() {
		entity.OccurredAt = entity.CreatedAt
	}
	return r.Db.Create(entity).Error
}

func (r *LoginEventRepository) FindByUsername(username string, limit int) ([]LoginEvent, error) {
	var results []LoginEvent
	if err := r.Db.Where("username = ? AND is_deleted = false", username).
		Order("occurred_at DESC").
		Limit(limit).
		Find(&results).Error; err != nil {
		return nil, err
	}
	return results, nil
}

func (r *LoginEventRepository) FindLastLoginByUsername(username string) (*LoginEvent, error) {
	var result LoginEvent
	if err := r.Db.Where("username = ? AND event_type = 'LOGIN' AND is_success = true AND is_deleted = false", username).
		Order("occurred_at DESC").
		First(&result).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}
