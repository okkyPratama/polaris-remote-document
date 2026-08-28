package repository

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

type Session struct {
	Id             string    `gorm:"primaryKey;column:id" json:"id"`
	UserId         string    `gorm:"column:user_id" json:"userId"`
	WarehouseId    string    `gorm:"column:warehouse_id" json:"warehouseId"`
	OwnerContextId string    `gorm:"column:owner_context_id" json:"ownerContextId"`
	RoleSet        string    `gorm:"column:role_set;type:json" json:"roleSet"`
	IpAddress      string    `gorm:"column:ip_address" json:"ipAddress"`
	UserAgent      string    `gorm:"column:user_agent" json:"userAgent"`
	Status         string    `gorm:"column:status" json:"status"`
	LastActivityAt time.Time `gorm:"column:last_activity_at" json:"lastActivityAt"`
	ExpiresAt      time.Time `gorm:"column:expires_at" json:"expiresAt"`
	IsDeleted      bool      `gorm:"column:is_deleted" json:"isDeleted"`
	CreatedBy      string    `gorm:"column:created_by" json:"createdBy"`
	CreatedAt      time.Time `gorm:"column:created_at" json:"createdAt"`
	UpdatedBy      string    `gorm:"column:updated_by" json:"updatedBy"`
	UpdatedAt      time.Time `gorm:"column:updated_at" json:"updatedAt"`
}

func (Session) TableName() string {
	return "sa_t_session"
}

type SessionRepository struct {
	Db *gorm.DB
}

func NewSessionRepository(dbInstance *gorm.DB) (*SessionRepository, error) {
	if dbInstance == nil {
		return nil, errors.New("failed to get database connection")
	}
	return &SessionRepository{Db: dbInstance}, nil
}

func (r *SessionRepository) Create(entity *Session) error {
	entity.CreatedAt = time.Now()
	entity.UpdatedAt = entity.CreatedAt
	entity.LastActivityAt = entity.CreatedAt
	entity.IsDeleted = false
	if entity.Status == "" {
		entity.Status = "ACTIVE"
	}
	return r.Db.Create(entity).Error
}

func (r *SessionRepository) FindByID(id string) (*Session, error) {
	var result Session
	if err := r.Db.Where("id = ? AND is_deleted = false", id).First(&result).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (r *SessionRepository) FindActiveByUserId(userId string) ([]Session, error) {
	var results []Session
	if err := r.Db.Where("user_id = ? AND status = 'ACTIVE' AND is_deleted = false", userId).Find(&results).Error; err != nil {
		return nil, err
	}
	return results, nil
}

func (r *SessionRepository) UpdateWarehouseContext(sessionId string, warehouseId string, ownerContextId string, updatedBy string) error {
	return r.Db.Model(&Session{}).Where("id = ?", sessionId).Updates(map[string]interface{}{
		"warehouse_id":     warehouseId,
		"owner_context_id": ownerContextId,
		"updated_by":       updatedBy,
		"updated_at":       time.Now(),
		"last_activity_at": time.Now(),
	}).Error
}

func (r *SessionRepository) Invalidate(sessionId string, updatedBy string) error {
	return r.Db.Model(&Session{}).Where("id = ?", sessionId).Updates(map[string]interface{}{
		"status":     "INVALIDATED",
		"updated_by": updatedBy,
		"updated_at": time.Now(),
	}).Error
}

func (r *SessionRepository) UpdateLastActivity(sessionId string) error {
	return r.Db.Model(&Session{}).Where("id = ?", sessionId).Update("last_activity_at", time.Now()).Error
}
