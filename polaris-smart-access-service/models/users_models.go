package models

// UserAttrResp — resolved user attributes with roles & permissions (REQ-011)
type UserAttrResp struct {
	UserId    string         `json:"userId"`
	Username  string         `json:"username"`
	Email     string         `json:"email"`
	FirstName string         `json:"firstName"`
	LastName  string         `json:"lastName"`
	Roles     []UserAttrRole `json:"roles"`
}

// UserAttrRole — role detail within user attribute response
type UserAttrRole struct {
	RoleId      string   `json:"roleId"`
	RoleCode    string   `json:"roleCode"`
	RoleName    string   `json:"roleName"`
	Permissions []string `json:"permissions"`
}
