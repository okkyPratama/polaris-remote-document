package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"bitbucket.org/log-tech/helper-go/hlogger"
	"bitbucket.org/log-tech/helper-go/hutils"
)

// KeycloakAdminConfig - configuration for Keycloak Admin API
type KeycloakAdminConfig struct {
	Host         string // e.g. 10.193.1.63:8080
	Protocol     string // http or https
	Realm        string // e.g. titipaja
	AdminUser    string // admin username (master realm)
	AdminPass    string // admin password
	ClientId     string // e.g. admin-cli or polaris-wms
	ClientSecret string // client secret (if confidential client)
	RedirectURI  string // FE login URL for post-action redirect (e.g. http://your-app.com/login)
}

// KeycloakAdminClient - client for Keycloak Admin REST API
type KeycloakAdminClient struct {
	config      KeycloakAdminConfig
	accessToken string
	tokenExpiry time.Time
	mu          sync.Mutex
	httpClient  *http.Client
}

// KeycloakUser - user representation
type KeycloakUser struct {
	Id              string               `json:"id,omitempty"`
	Username        string               `json:"username"`
	Email           string               `json:"email,omitempty"`
	FirstName       string               `json:"firstName,omitempty"`
	LastName        string               `json:"lastName,omitempty"`
	Enabled         bool                 `json:"enabled"`
	EmailVerified   bool                 `json:"emailVerified,omitempty"`
	Credentials     []KeycloakCredential `json:"credentials,omitempty"`
	RequiredActions []string             `json:"requiredActions,omitempty"`
}

type KeycloakCredential struct {
	Type      string `json:"type"`
	Value     string `json:"value"`
	Temporary bool   `json:"temporary"`
}

var (
	kcAdminInstance *KeycloakAdminClient
	kcAdminOnce     sync.Once
)

// GetKeycloakAdmin - singleton admin client
func GetKeycloakAdmin() *KeycloakAdminClient {
	kcAdminOnce.Do(func() {
		kcAdminInstance = &KeycloakAdminClient{
			config: KeycloakAdminConfig{
				Host:         hutils.GetEnv("KEYCLOAK_HOST", "localhost:8080"),
				Protocol:     hutils.GetEnv("KEYCLOAK_PROTOCOL", "http"),
				Realm:        hutils.GetEnv("KEYCLOAK_REALM", "titipaja"),
				AdminUser:    hutils.GetEnv("KEYCLOAK_ADMIN_USER", "admin"),
				AdminPass:    hutils.GetEnv("KEYCLOAK_ADMIN_PASS", ""),
				ClientId:     hutils.GetEnv("KEYCLOAK_ADMIN_CLIENT_ID", "admin-cli"),
				ClientSecret: hutils.GetEnv("KEYCLOAK_ADMIN_CLIENT_SECRET", ""),
				RedirectURI:  hutils.GetEnv("KEYCLOAK_REDIRECT_URI", ""),
			},
			httpClient: &http.Client{Timeout: 10 * time.Second},
		}
	})
	return kcAdminInstance
}

// getAdminToken - get admin access token from master realm
func (c *KeycloakAdminClient) getAdminToken() (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.accessToken != "" && time.Now().Before(c.tokenExpiry) {
		return c.accessToken, nil
	}

	tokenURL := fmt.Sprintf("%s://%s/realms/%s/protocol/openid-connect/token", c.config.Protocol, c.config.Host, c.config.Realm)
	data := url.Values{}
	data.Set("username", c.config.AdminUser)
	data.Set("password", c.config.AdminPass)
	data.Set("grant_type", "password")
	data.Set("client_id", c.config.ClientId)
	if c.config.ClientSecret != "" {
		data.Set("client_secret", c.config.ClientSecret)
	}

	resp, err := c.httpClient.Post(tokenURL, "application/x-www-form-urlencoded", strings.NewReader(data.Encode()))
	if err != nil {
		return "", fmt.Errorf("keycloak admin token request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("keycloak admin token failed status %d: %s", resp.StatusCode, string(body))
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", fmt.Errorf("failed to decode token response: %w", err)
	}

	c.accessToken = tokenResp.AccessToken
	c.tokenExpiry = time.Now().Add(time.Duration(tokenResp.ExpiresIn-10) * time.Second)
	return c.accessToken, nil
}

// CreateUser - create user in Keycloak realm
func (c *KeycloakAdminClient) CreateUser(user KeycloakUser) (string, error) {
	token, err := c.getAdminToken()
	if err != nil {
		return "", err
	}

	userURL := fmt.Sprintf("%s://%s/admin/realms/%s/users", c.config.Protocol, c.config.Host, c.config.Realm)
	body, _ := json.Marshal(user)

	req, _ := http.NewRequest("POST", userURL, bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("create user request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusConflict {
		return "", fmt.Errorf("user already exists: %s", user.Username)
	}
	if resp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("create user failed status %d: %s", resp.StatusCode, string(respBody))
	}

	// Get user ID from Location header
	location := resp.Header.Get("Location")
	parts := strings.Split(location, "/")
	if len(parts) > 0 {
		return parts[len(parts)-1], nil
	}
	return "", nil
}

// GetUserById — get user by Keycloak user ID
func (c *KeycloakAdminClient) GetUserById(userId string) (*KeycloakUser, error) {
	token, err := c.getAdminToken()
	if err != nil {
		return nil, err
	}

	userURL := fmt.Sprintf("%s://%s/admin/realms/%s/users/%s", c.config.Protocol, c.config.Host, c.config.Realm, userId)
	req, _ := http.NewRequest("GET", userURL, nil)
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("get user by id request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("get user by id failed status %d", resp.StatusCode)
	}

	var user KeycloakUser
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUserByUsername — find user by username
func (c *KeycloakAdminClient) GetUserByUsername(username string) (*KeycloakUser, error) {
	token, err := c.getAdminToken()
	if err != nil {
		return nil, err
	}

	userURL := fmt.Sprintf("%s://%s/admin/realms/%s/users?username=%s&exact=true", c.config.Protocol, c.config.Host, c.config.Realm, url.QueryEscape(username))

	req, _ := http.NewRequest("GET", userURL, nil)
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("get user request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("get user failed status %d", resp.StatusCode)
	}

	var users []KeycloakUser
	if err := json.NewDecoder(resp.Body).Decode(&users); err != nil {
		return nil, err
	}
	if len(users) == 0 {
		return nil, nil
	}
	return &users[0], nil
}

// UpdateUser — update user in Keycloak
func (c *KeycloakAdminClient) UpdateUser(userId string, user KeycloakUser) error {
	token, err := c.getAdminToken()
	if err != nil {
		return err
	}

	userURL := fmt.Sprintf("%s://%s/admin/realms/%s/users/%s", c.config.Protocol, c.config.Host, c.config.Realm, userId)
	body, _ := json.Marshal(user)

	req, _ := http.NewRequest("PUT", userURL, bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("update user request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("update user failed status %d: %s", resp.StatusCode, string(respBody))
	}
	return nil
}

// DeleteUser — delete user from Keycloak (hard delete)
func (c *KeycloakAdminClient) DeleteUser(userId string) error {
	token, err := c.getAdminToken()
	if err != nil {
		return err
	}

	userURL := fmt.Sprintf("%s://%s/admin/realms/%s/users/%s", c.config.Protocol, c.config.Host, c.config.Realm, userId)

	req, _ := http.NewRequest("DELETE", userURL, nil)
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("delete user request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("delete user failed status %d: %s", resp.StatusCode, string(respBody))
	}
	return nil
}

// ResetPassword — reset user password
func (c *KeycloakAdminClient) ResetPassword(userId string, password string, temporary bool) error {
	token, err := c.getAdminToken()
	if err != nil {
		return err
	}

	pwURL := fmt.Sprintf("%s://%s/admin/realms/%s/users/%s/reset-password", c.config.Protocol, c.config.Host, c.config.Realm, userId)
	cred := KeycloakCredential{Type: "password", Value: password, Temporary: temporary}
	body, _ := json.Marshal(cred)

	req, _ := http.NewRequest("PUT", pwURL, bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("reset password request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("reset password failed status %d: %s", resp.StatusCode, string(respBody))
	}

	hlogger.Log.Infof("Password reset for user %s", userId)
	return nil
}

// DisableUser — disable user account
func (c *KeycloakAdminClient) DisableUser(userId string) error {
	// Fetch current user to get username (required by Keycloak PUT)
	user, err := c.GetUserById(userId)
	if err != nil || user == nil {
		return fmt.Errorf("cannot fetch user for disable: %v", err)
	}
	user.Enabled = false
	return c.UpdateUser(userId, *user)
}

// EnableUser — enable user account
func (c *KeycloakAdminClient) EnableUser(userId string) error {
	user, err := c.GetUserById(userId)
	if err != nil || user == nil {
		return fmt.Errorf("cannot fetch user for enable: %v", err)
	}
	user.Enabled = true
	return c.UpdateUser(userId, *user)
}

// ExecuteActionsEmail — send email with required actions to user (e.g., UPDATE_PASSWORD for password reset)
func (c *KeycloakAdminClient) ExecuteActionsEmail(userId string, actions []string) error {
	token, err := c.getAdminToken()
	if err != nil {
		return err
	}

	// Keycloak endpoint: PUT /admin/realms/{realm}/users/{id}/execute-actions-email
	actionsURL := fmt.Sprintf("%s://%s/admin/realms/%s/users/%s/execute-actions-email", c.config.Protocol, c.config.Host, c.config.Realm, userId)

	// Build query params for actions: ?lifespan=86400&redirect_uri=...&client_id=...
	query := url.Values{}
	query.Set("lifespan", "86400") // 24 hours
	for _, action := range actions {
		query.Add("actions", action)
	}

	// Add redirect_uri + client_id so after password reset, Keycloak redirects user to login page
	// Note: client_id here must be the FE client (not admin-cli) that has redirect_uri registered
	if c.config.RedirectURI != "" {
		feClientId := hutils.GetEnv("KEYCLOAK_FE_CLIENT_ID", "polaris")
		query.Set("redirect_uri", c.config.RedirectURI)
		query.Set("client_id", feClientId)
	}

	executeURL := actionsURL + "?" + query.Encode()

	req, _ := http.NewRequest("PUT", executeURL, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("execute actions email request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("execute actions email failed status %d: %s", resp.StatusCode, string(respBody))
	}

	hlogger.Log.Infof("Executed actions %v for user %s via email", actions, userId)
	return nil
}
