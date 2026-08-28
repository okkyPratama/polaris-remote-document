package repository

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

// Entity: sa_t_login_attempt — login attempt tracking untuk rate limiting
type LoginAttempt struct {
	Id            string    `gorm:"primaryKey;column:id" json:"id"`
	Username      string    `gorm:"column:username" json:"username"`
	IpAddress     string    `gorm:"column:ip_address" json:"ipAddress"`
	UserAgent     string    `gorm:"column:user_agent" json:"userAgent"`
	IsSuccess     bool      `gorm:"column:is_success" json:"isSuccess"`
	FailureReason string    `gorm:"column:failure_reason" json:"failureReason"`
	AttemptedAt   time.Time `gorm:"column:attempted_at" json:"attemptedAt"`
	IsDeleted     bool      `gorm:"column:is_deleted" json:"isDeleted"`
	CreatedAt     time.Time `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt     time.Time `gorm:"column:updated_at" json:"updatedAt"`
}

func (LoginAttempt) TableName() string {
	return "sa_t_login_attempt"
}

type LoginAttemptRepository struct {
	Db *gorm.DB
}

func NewLoginAttemptRepository(dbInstance *gorm.DB) (*LoginAttemptRepository, error) {
	if dbInstance == nil {
		return nil, errors.New("failed to get database connection")
	}
	return &LoginAttemptRepository{Db: dbInstance}, nil
}

func (r *LoginAttemptRepository) Create(entity *LoginAttempt) error {
	entity.CreatedAt = time.Now()
	entity.UpdatedAt = entity.CreatedAt
	entity.IsDeleted = false
	if entity.AttemptedAt.IsZero() {
		entity.AttemptedAt = entity.CreatedAt
	}
	return r.Db.Create(entity).Error
}

// CountFailedInWindow — hitung failed attempts dalam window menit terakhir
func (r *LoginAttemptRepository) CountFailedInWindow(username string, windowMinutes int) (int64, error) {
	var count int64
	since := time.Now().Add(-time.Duration(windowMinutes) * time.Minute)
	err := r.Db.Model(&LoginAttempt{}).
		Where("username = ? AND is_success = false AND is_deleted = false AND attempted_at >= ?", username, since).
		Count(&count).Error
	return count, err
}

// CountFailedByIPInWindow — hitung failed attempts dari IP tertentu dalam window
func (r *LoginAttemptRepository) CountFailedByIPInWindow(ipAddress string, windowMinutes int) (int64, error) {
	var count int64
	since := time.Now().Add(-time.Duration(windowMinutes) * time.Minute)
	err := r.Db.Model(&LoginAttempt{}).
		Where("ip_address = ? AND is_success = false AND is_deleted = false AND attempted_at >= ?", ipAddress, since).
		Count(&count).Error
	return count, err
}

// ClearFailedAttempts — soft-delete all failed attempts for a username (after auto-unlock)
func (r *LoginAttemptRepository) ClearFailedAttempts(username string) error {
	return r.Db.Model(&LoginAttempt{}).
		Where("username = ? AND is_success = false AND is_deleted = false", username).
		Updates(map[string]interface{}{
			"is_deleted": true,
			"updated_at": time.Now(),
		}).Error
}
