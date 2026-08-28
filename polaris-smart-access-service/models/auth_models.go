package models

import "time"

// LoginReq — request body kosong, identitas dari Keycloak token header
type LoginReq struct {
	KeycloakToken string `json:"-"` // dari header Authorization
	IpAddress     string `json:"-"` // dari request context
	UserAgent     string `json:"-"` // dari header User-Agent
}

// LoginResp — sesuai REQ-010 section 5.1
// Includes user object dengan roles untuk access-gate permission check
type LoginResp struct {
	SessionToken string          `json:"sessionToken"`
	UserId       string          `json:"userId"`
	Warehouses   []WarehouseResp `json:"warehouses"`
}

type WarehouseResp struct {
	Id   string `json:"id"`
	Code string `json:"code"`
	Name string `json:"name"`
}

// SwitchContextReq — sesuai REQ-010 section 5.2
type SwitchContextReq struct {
	WarehouseId    string `json:"warehouseId"`
	OwnerContextId string `json:"ownerContextId"`
}

// SessionResp — sesuai REQ-010 section 5.3
type SessionResp struct {
	UserId             string                   `json:"userId"`
	Username           string                   `json:"username"`
	CurrentWarehouseId string                   `json:"currentWarehouseId"`
	OwnerContextIds    []string                 `json:"ownerContextIds"`
	Roles              []UserProvRoleResp       `json:"roles"`
	Permissions        []UserProvPermissionResp `json:"permissions"` // DEPRECATED: empty array, use availableEndpoints
	AvailableEndpoints []AvailableEndpoint      `json:"availableEndpoints"`
	ExpiresAt          time.Time                `json:"expiresAt"`
}

// AvailableEndpoint — endpoint yang accessible oleh user (endpoint-based permission)
// Format: {method}:{endpoint} (e.g. POST:/api/v1/admin/roles/getAll)
type AvailableEndpoint struct {
	Method   string `json:"method"`   // HTTP method: POST, GET, PUT, DELETE
	Endpoint string `json:"endpoint"` // API path: /api/v1/admin/roles/getAll
	IsActive bool   `json:"isActive"` // Whether endpoint is active for this role
}

// KeycloakTokenClaims — parsed dari JWT Keycloak
type KeycloakTokenClaims struct {
	Sub               string `json:"sub"`                // keycloak_id
	PreferredUsername string `json:"preferred_username"` // username
	Email             string `json:"email"`
	Name              string `json:"name"`
	FirstName         string `json:"given_name"`
	LastName          string `json:"family_name"`
}

// SessionDataCached — structure untuk session di Redis (polaris:session:{sessionId})
// Diisi saat login, dibaca saat GetCurrentSession
type SessionDataCached struct {
	UserId      string      `json:"userId"`
	Username    string      `json:"username"` // audit actor for Access Gate user-username
	WarehouseId string      `json:"warehouseId"`
	OwnerIds    []string    `json:"ownerIds"`
	RoleSet     []string    `json:"roleSet"`        // Array of role codes
	User        interface{} `json:"user,omitempty"` // User object for access-gate
}
