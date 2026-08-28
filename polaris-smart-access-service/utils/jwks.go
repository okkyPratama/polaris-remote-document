package utils

import (
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"sync"
	"time"

	"bitbucket.org/log-tech/helper-go/hlogger"
	"bitbucket.org/log-tech/helper-go/hutils"
)

// JWKSConfig — Keycloak JWKS configuration
type JWKSConfig struct {
	JwksURL string // e.g. http://keycloak:8080/realms/titipaja/protocol/openid-connect/certs
}

// JWKSVerifier — verifies JWT tokens using Keycloak JWKS endpoint
type JWKSVerifier struct {
	config     JWKSConfig
	keys       map[string]*rsa.PublicKey
	mu         sync.RWMutex
	lastFetch  time.Time
	cacheTTL   time.Duration
	httpClient *http.Client
}

// JWKS response from Keycloak
type jwksResponse struct {
	Keys []jwkKey `json:"keys"`
}

type jwkKey struct {
	Kid string `json:"kid"` // Key ID
	Kty string `json:"kty"` // Key type (RSA)
	Alg string `json:"alg"` // Algorithm (RS256)
	Use string `json:"use"` // Usage (sig)
	N   string `json:"n"`   // Modulus
	E   string `json:"e"`   // Exponent
}

var (
	verifierInstance *JWKSVerifier
	verifierOnce     sync.Once
)

// GetJWKSVerifier — singleton JWKS verifier
func GetJWKSVerifier() *JWKSVerifier {
	verifierOnce.Do(func() {
		keycloakHost := hutils.GetEnv("KEYCLOAK_HOST", "localhost:8080")
		keycloakRealm := hutils.GetEnv("KEYCLOAK_REALM", "titipaja")
		keycloakProtocol := hutils.GetEnv("KEYCLOAK_PROTOCOL", "http")

		jwksURL := fmt.Sprintf("%s://%s/realms/%s/protocol/openid-connect/certs", keycloakProtocol, keycloakHost, keycloakRealm)

		verifierInstance = &JWKSVerifier{
			config:   JWKSConfig{JwksURL: jwksURL},
			keys:     make(map[string]*rsa.PublicKey),
			cacheTTL: 1 * time.Hour,
			httpClient: &http.Client{
				Timeout: 5 * time.Second,
			},
		}
		hlogger.Log.Infof("JWKS Verifier initialized with URL: %s", jwksURL)
	})
	return verifierInstance
}

// VerifyToken — verify JWT signature and return claims
func (v *JWKSVerifier) VerifyToken(tokenString string) (map[string]interface{}, error) {
	// Parse JWT header to get kid
	parts := splitToken(tokenString)
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid JWT format")
	}

	headerBytes, err := base64URLDecode(parts[0])
	if err != nil {
		return nil, fmt.Errorf("failed to decode JWT header: %w", err)
	}

	var header struct {
		Kid string `json:"kid"`
		Alg string `json:"alg"`
	}
	if err := json.Unmarshal(headerBytes, &header); err != nil {
		return nil, fmt.Errorf("failed to parse JWT header: %w", err)
	}

	if header.Alg != "RS256" {
		return nil, fmt.Errorf("unsupported algorithm: %s", header.Alg)
	}

	// Get public key for this kid
	pubKey, err := v.getKey(header.Kid)
	if err != nil {
		return nil, fmt.Errorf("failed to get public key: %w", err)
	}

	// Verify signature
	if err := verifyRS256(parts[0]+"."+parts[1], parts[2], pubKey); err != nil {
		return nil, fmt.Errorf("signature verification failed: %w", err)
	}

	// Decode payload
	payloadBytes, err := base64URLDecode(parts[1])
	if err != nil {
		return nil, fmt.Errorf("failed to decode JWT payload: %w", err)
	}

	var claims map[string]interface{}
	if err := json.Unmarshal(payloadBytes, &claims); err != nil {
		return nil, fmt.Errorf("failed to parse JWT claims: %w", err)
	}

	// Check expiration
	if exp, ok := claims["exp"].(float64); ok {
		if time.Now().Unix() > int64(exp) {
			return nil, fmt.Errorf("token expired")
		}
	}

	return claims, nil
}

func (v *JWKSVerifier) getKey(kid string) (*rsa.PublicKey, error) {
	v.mu.RLock()
	key, exists := v.keys[kid]
	needRefresh := time.Since(v.lastFetch) > v.cacheTTL
	v.mu.RUnlock()

	if exists && !needRefresh {
		return key, nil
	}

	// Fetch JWKS
	if err := v.fetchKeys(); err != nil {
		// If we have a cached key, use it even if stale
		if exists {
			return key, nil
		}
		return nil, err
	}

	v.mu.RLock()
	key, exists = v.keys[kid]
	v.mu.RUnlock()

	if !exists {
		return nil, fmt.Errorf("key not found for kid: %s", kid)
	}
	return key, nil
}

func (v *JWKSVerifier) fetchKeys() error {
	resp, err := v.httpClient.Get(v.config.JwksURL)
	if err != nil {
		hlogger.Log.Errorf("JWKS fetch failed from %s: %v", v.config.JwksURL, err)
		return fmt.Errorf("failed to fetch JWKS: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("JWKS endpoint returned status %d", resp.StatusCode)
	}

	var jwks jwksResponse
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return fmt.Errorf("failed to decode JWKS response: %w", err)
	}

	v.mu.Lock()
	defer v.mu.Unlock()

	for _, key := range jwks.Keys {
		if key.Kty != "RSA" || key.Use != "sig" {
			continue
		}
		pubKey, err := parseRSAPublicKey(key.N, key.E)
		if err != nil {
			hlogger.Log.Warnf("Failed to parse JWKS key %s: %v", key.Kid, err)
			continue
		}
		v.keys[key.Kid] = pubKey
	}
	v.lastFetch = time.Now()

	hlogger.Log.Infof("JWKS keys refreshed: %d keys loaded", len(v.keys))
	return nil
}

func parseRSAPublicKey(nStr, eStr string) (*rsa.PublicKey, error) {
	nBytes, err := base64URLDecode(nStr)
	if err != nil {
		return nil, fmt.Errorf("failed to decode modulus: %w", err)
	}

	eBytes, err := base64URLDecode(eStr)
	if err != nil {
		return nil, fmt.Errorf("failed to decode exponent: %w", err)
	}

	n := new(big.Int).SetBytes(nBytes)
	e := 0
	for _, b := range eBytes {
		e = e<<8 + int(b)
	}

	return &rsa.PublicKey{N: n, E: e}, nil
}

func splitToken(token string) []string {
	parts := make([]string, 0, 3)
	start := 0
	for i := 0; i < len(token); i++ {
		if token[i] == '.' {
			parts = append(parts, token[start:i])
			start = i + 1
		}
	}
	parts = append(parts, token[start:])
	return parts
}

func base64URLDecode(s string) ([]byte, error) {
	// Add padding if needed
	switch len(s) % 4 {
	case 2:
		s += "=="
	case 3:
		s += "="
	}
	return base64.URLEncoding.DecodeString(s)
}
