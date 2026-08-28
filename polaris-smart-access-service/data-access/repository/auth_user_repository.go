package repository

import (
	"errors"
	"fmt"
	"time"

	"bitbucket.org/log-tech/helper-go/hmodels"
	"gorm.io/gorm"
)

// Entity: sa_m_user — user identity mapping ke Keycloak
type AuthUser struct {
	Id                string     `gorm:"primaryKey;column:id" json:"id"`
	KeycloakId        string     `gorm:"column:keycloak_id" json:"keycloakId"`
	Username          string     `gorm:"column:username" json:"username"`
	Email             string     `gorm:"column:email" json:"email"`
	FullName          string     `gorm:"column:fullname" json:"fullName"`
	Status            string     `gorm:"column:status" json:"status"`
	FailedLoginCount  int        `gorm:"column:failed_login_count" json:"failedLoginCount"`
	LockedUntil       *time.Time `gorm:"column:locked_until" json:"lockedUntil"`
	LastFailedLoginAt *time.Time `gorm:"column:last_failed_login_at" json:"lastFailedLoginAt"`
	IsDeleted         bool       `gorm:"column:is_deleted" json:"isDeleted"`
	CreatedBy         string     `gorm:"column:created_by" json:"createdBy"`
	CreatedAt         time.Time  `gorm:"column:created_at" json:"createdAt"`
	UpdatedBy         string     `gorm:"column:updated_by" json:"updatedBy"`
	UpdatedAt         time.Time  `gorm:"column:updated_at" json:"updatedAt"`
}

func (AuthUser) TableName() string {
	return "sa_m_user"
}

type AuthUserRepository struct {
	Db *gorm.DB
}

func NewAuthUserRepository(dbInstance *gorm.DB) (*AuthUserRepository, error) {
	if dbInstance == nil {
		return nil, errors.New("failed to get database connection")
	}
	return &AuthUserRepository{Db: dbInstance}, nil
}

// Upsert by keycloak_id — create if not exists, update if exists
func (r *AuthUserRepository) UpsertByKeycloakId(entity *AuthUser) (*AuthUser, error) {
	var existing AuthUser
	err := r.Db.Where("keycloak_id = ?", entity.KeycloakId).First(&existing).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Create new
			entity.CreatedAt = time.Now()
			entity.UpdatedAt = entity.CreatedAt
			entity.IsDeleted = false
			if entity.Status == "" {
				entity.Status = "ACTIVE"
			}
			if err := r.Db.Create(entity).Error; err != nil {
				return nil, err
			}
			return entity, nil
		}
		return nil, err
	}
	// Update existing
	// CRITICAL: Username must NEVER be updated after creation (immutable identifier)
	// Only sync email and fullname from Keycloak
	existing.Email = entity.Email
	if entity.FullName != "" {
		existing.FullName = entity.FullName
	}
	existing.UpdatedBy = entity.UpdatedBy
	existing.UpdatedAt = time.Now()
	if err := r.Db.Save(&existing).Error; err != nil {
		return nil, err
	}
	return &existing, nil
}

func (r *AuthUserRepository) FindByKeycloakId(keycloakId string) (*AuthUser, error) {
	var result AuthUser
	if err := r.Db.Where("keycloak_id = ? AND is_deleted = false", keycloakId).First(&result).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (r *AuthUserRepository) FindByUsername(username string) (*AuthUser, error) {
	var result AuthUser
	if err := r.Db.Where("username = ? AND is_deleted = false", username).First(&result).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (r *AuthUserRepository) FindByID(id string) (*AuthUser, error) {
	var result AuthUser
	if err := r.Db.Where("id = ? AND is_deleted = false", id).First(&result).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &result, nil
}

func (r *AuthUserRepository) Update(entity *AuthUser) error {
	entity.UpdatedAt = time.Now()
	return r.Db.Save(entity).Error
}

func (r *AuthUserRepository) IncrementFailedLogin(userId string, lockedUntil time.Time) error {
	return r.Db.Model(&AuthUser{}).Where("id = ? AND is_deleted = false", userId).
		Updates(map[string]interface{}{
			"failed_login_count":   gorm.Expr("failed_login_count + 1"),
			"last_failed_login_at": time.Now(),
			"locked_until":         lockedUntil,
			"updated_at":           time.Now(),
		}).Error
}

func (r *AuthUserRepository) ResetFailedLogin(userId string) error {
	return r.Db.Model(&AuthUser{}).Where("id = ? AND is_deleted = false", userId).
		Updates(map[string]interface{}{
			"failed_login_count":   0,
			"last_failed_login_at": nil,
			"locked_until":         nil,
			"updated_at":           time.Now(),
		}).Error
}

func (r *AuthUserRepository) FindAll(param hmodels.SearchRequest) ([]AuthUser, int64, error) {
	db := r.Db.Model(&AuthUser{}).Where("sa_m_user.is_deleted = false")
	
	paging := param.Paging
	offset := 0

	if paging.Page > 1 {
		offset = (paging.Page - 1) * paging.PageSize
	}

	// Track if we need to join role tables
	needRoleJoin := false

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

				// Handle role filters (need JOIN)
				if field == "role_name" || field == "role_code" {
					if !needRoleJoin {
						db = db.Joins("LEFT JOIN sa_r_user_role ur ON ur.user_id = sa_m_user.id AND ur.is_deleted = false").
							Joins("LEFT JOIN sa_m_role r ON r.id = ur.role_id AND r.is_deleted = false")
						needRoleJoin = true
					}
					
					roleField := "r.name"
					if field == "role_code" {
						roleField = "r.code"
					}
					
					switch operator {
					case "=":
						db = db.Where(fmt.Sprintf("%s = ?", roleField), value)
					case "!=":
						db = db.Where(fmt.Sprintf("%s != ?", roleField), value)
					case "like", "ilike":
						db = db.Where(fmt.Sprintf("LOWER(%s) LIKE LOWER(?)", roleField), value)
					}
					continue
				}

				// Whitelist user fields
				switch field {
				case "username", "fullname", "email", "status":
					// valid
				case "keycloak_id":
					// valid
				default:
					continue // Skip unknown fields
				}

				// Apply filter with table prefix to avoid ambiguity
				dbField := fmt.Sprintf("sa_m_user.%s", field)
				switch operator {
				case "=":
					db = db.Where(fmt.Sprintf("%s = ?", dbField), value)
				case "!=":
					db = db.Where(fmt.Sprintf("%s != ?", dbField), value)
				case "like", "ilike":
					db = db.Where(fmt.Sprintf("LOWER(%s) LIKE LOWER(?)", dbField), value)
				}
			}
		}
	}

	// Add DISTINCT to avoid duplicate rows from JOINs
	if needRoleJoin {
		db = db.Distinct()
	}

	// Sort (add table prefix to avoid ambiguity)
	if len(paging.SortBy) > 0 {
		direction := paging.SortDirection
		if direction == "" {
			direction = "DESC"
		}
		db = db.Order(fmt.Sprintf("sa_m_user.%s %s", paging.SortBy, direction))
	} else {
		db = db.Order("sa_m_user.created_at DESC")
	}

	var totalData int64
	if err := db.Count(&totalData).Error; err != nil {
		return nil, 0, err
	}

	var data []AuthUser
	if err := db.Limit(paging.PageSize).Offset(offset).Find(&data).Error; err != nil {
		return nil, 0, err
	}
	
	return data, totalData, nil
}
