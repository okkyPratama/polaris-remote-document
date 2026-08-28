package test

import (
	"encoding/binary"
	"encoding/json"
	"testing"
	"time"

	"bitbucket.org/log-tech/helper-go/hgrpc"
	"bitbucket.org/log-tech/helper-go/hlogger"
)

// TestRefreshRoleCache — test gRPC role cache refresh endpoint
// Payload format: [2-byte roleId length][roleId]
func TestRefreshRoleCache(t *testing.T) {
	client := hgrpc.NewClient(getGrpcRoleCacheConfig())
	if client == nil {
		t.Fatalf("Failed to create gRPC client")
	}
	defer client.Close()

	tests := []struct {
		name        string
		roleId      string
		expectError bool
	}{
		{
			name:        "Refresh cache for admin role",
			roleId:      "admin",
			expectError: false,
		},
		{
			name:        "Refresh cache for user role",
			roleId:      "user",
			expectError: false,
		},
		{
			name:        "Refresh cache for viewer role",
			roleId:      "viewer",
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			payload := buildStringPayloadForRoleCache(tt.roleId)

			resp, err := client.Call(
				"bitbucket.org.log_tech.polaris_smart_access_service.RoleCacheService",
				"refreshRoleCache",
				payload,
				5*time.Second,
			)

			if (err != nil) != tt.expectError {
				t.Errorf("Expected error: %v, got: %v", tt.expectError, err)
			}

			if resp == nil && !tt.expectError {
				t.Errorf("Expected response, got nil")
			}

			if resp != nil {
				hlogger.Log.Infof("RefreshRoleCache [%s]: success", tt.name)
			}
		})
	}
}

// TestInvalidateRoleCache — test gRPC role cache invalidation endpoint
// Payload format: [2-byte roleId length][roleId]
func TestInvalidateRoleCache(t *testing.T) {
	client := hgrpc.NewClient(getGrpcRoleCacheConfig())
	if client == nil {
		t.Fatalf("Failed to create gRPC client")
	}
	defer client.Close()

	tests := []struct {
		name        string
		roleId      string
		expectError bool
	}{
		{
			name:        "Invalidate cache for admin role",
			roleId:      "admin",
			expectError: false,
		},
		{
			name:        "Invalidate cache for user role",
			roleId:      "user",
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			payload := buildStringPayloadForRoleCache(tt.roleId)

			resp, err := client.Call(
				"bitbucket.org.log_tech.polaris_smart_access_service.RoleCacheService",
				"invalidateRoleCache",
				payload,
				5*time.Second,
			)

			if (err != nil) != tt.expectError {
				t.Errorf("Expected error: %v, got: %v", tt.expectError, err)
			}

			if resp == nil && !tt.expectError {
				t.Errorf("Expected response, got nil")
			}

			if resp != nil {
				hlogger.Log.Infof("InvalidateRoleCache [%s]: success", tt.name)
			}
		})
	}
}

// TestGetRoleVersion — test gRPC get role version endpoint
// Payload format: empty payload
func TestGetRoleVersion(t *testing.T) {
	client := hgrpc.NewClient(getGrpcRoleCacheConfig())
	if client == nil {
		t.Fatalf("Failed to create gRPC client")
	}
	defer client.Close()

	t.Run("GetRoleVersion", func(t *testing.T) {
		payload := []byte{}

		resp, err := client.Call(
			"bitbucket.org.log_tech.polaris_smart_access_service.RoleCacheService",
			"getRoleVersion",
			payload,
			5*time.Second,
		)

		if err != nil {
			t.Errorf("getRoleVersion failed: %v", err)
		}

		if resp == nil {
			t.Errorf("Expected response, got nil")
		}

		if resp != nil {
			hlogger.Log.Infof("GetRoleVersion success: %+v", resp)
		}
	})
}

// TestRoleCacheWorkflow — integration test untuk workflow role cache management
func TestRoleCacheWorkflow(t *testing.T) {
	client := hgrpc.NewClient(getGrpcRoleCacheConfig())
	if client == nil {
		t.Fatalf("Failed to create gRPC client")
	}
	defer client.Close()

	roleId := "integration-test-role"

	// Step 1: Get initial version
	t.Run("Step1_GetInitialVersion", func(t *testing.T) {
		payload := []byte{}
		resp, err := client.Call(
			"bitbucket.org.log_tech.polaris_smart_access_service.RoleCacheService",
			"getRoleVersion",
			payload,
			5*time.Second,
		)

		if err != nil {
			t.Errorf("getRoleVersion failed: %v", err)
		}
		if resp == nil {
			t.Errorf("Expected response for getRoleVersion")
		}

		if resp.Data != nil {
			hlogger.Log.Infof("Step 1 - Initial version retrieved")
		}
	})

	// Step 2: Refresh role cache
	t.Run("Step2_RefreshRoleCache", func(t *testing.T) {
		payload := buildStringPayloadForRoleCache(roleId)
		resp, err := client.Call(
			"bitbucket.org.log_tech.polaris_smart_access_service.RoleCacheService",
			"refreshRoleCache",
			payload,
			5*time.Second,
		)

		if err != nil {
			t.Errorf("refreshRoleCache failed: %v", err)
		}
		if resp == nil {
			t.Errorf("Expected response for refreshRoleCache")
		}

		hlogger.Log.Infof("Step 2 - Refreshed cache for role: %s", roleId)
	})

	// Step 3: Get version after refresh
	t.Run("Step3_GetVersionAfterRefresh", func(t *testing.T) {
		payload := []byte{}
		resp, err := client.Call(
			"bitbucket.org.log_tech.polaris_smart_access_service.RoleCacheService",
			"getRoleVersion",
			payload,
			5*time.Second,
		)

		if err != nil {
			t.Errorf("getRoleVersion failed: %v", err)
		}
		if resp == nil {
			t.Errorf("Expected response for getRoleVersion")
		}

		if resp.Data != nil {
			hlogger.Log.Infof("Step 3 - Version after refresh retrieved")
		}
	})

	// Step 4: Invalidate cache
	t.Run("Step4_InvalidateCache", func(t *testing.T) {
		payload := buildStringPayloadForRoleCache(roleId)
		resp, err := client.Call(
			"bitbucket.org.log_tech.polaris_smart_access_service.RoleCacheService",
			"invalidateRoleCache",
			payload,
			5*time.Second,
		)

		if err != nil {
			t.Errorf("invalidateRoleCache failed: %v", err)
		}
		if resp == nil {
			t.Errorf("Expected response for invalidateRoleCache")
		}

		hlogger.Log.Infof("Step 4 - Invalidated cache for role: %s", roleId)
	})

	// Step 5: Get final version
	t.Run("Step5_GetFinalVersion", func(t *testing.T) {
		payload := []byte{}
		resp, err := client.Call(
			"bitbucket.org.log_tech.polaris_smart_access_service.RoleCacheService",
			"getRoleVersion",
			payload,
			5*time.Second,
		)

		if err != nil {
			t.Errorf("getRoleVersion failed: %v", err)
		}
		if resp == nil {
			t.Errorf("Expected response for getRoleVersion")
		}

		if resp.Data != nil {
			hlogger.Log.Infof("Step 5 - Final version retrieved")
		}
	})
}

// TestMultipleRoleCacheOperations — test multiple role cache operations concurrently
func TestMultipleRoleCacheOperations(t *testing.T) {
	client := hgrpc.NewClient(getGrpcRoleCacheConfig())
	if client == nil {
		t.Fatalf("Failed to create gRPC client")
	}
	defer client.Close()

	roles := []string{"admin", "user", "viewer", "manager", "operator"}

	t.Run("RefreshMultipleRoles", func(t *testing.T) {
		for _, roleId := range roles {
			payload := buildStringPayloadForRoleCache(roleId)
			resp, err := client.Call(
				"bitbucket.org.log_tech.polaris_smart_access_service.RoleCacheService",
				"refreshRoleCache",
				payload,
				5*time.Second,
			)

			if err != nil {
				t.Errorf("refreshRoleCache for %s failed: %v", roleId, err)
			}
			if resp == nil {
				t.Errorf("Expected response for refreshRoleCache on role %s", roleId)
			}

			hlogger.Log.Infof("Refreshed cache for role: %s", roleId)
		}
	})

	t.Run("InvalidateMultipleRoles", func(t *testing.T) {
		for _, roleId := range roles {
			payload := buildStringPayloadForRoleCache(roleId)
			resp, err := client.Call(
				"bitbucket.org.log_tech.polaris_smart_access_service.RoleCacheService",
				"invalidateRoleCache",
				payload,
				5*time.Second,
			)

			if err != nil {
				t.Errorf("invalidateRoleCache for %s failed: %v", roleId, err)
			}
			if resp == nil {
				t.Errorf("Expected response for invalidateRoleCache on role %s", roleId)
			}

			hlogger.Log.Infof("Invalidated cache for role: %s", roleId)
		}
	})
}

// Helper functions

// buildStringPayloadForRoleCache — builds [2-byte length][string data] format for role cache
func buildStringPayloadForRoleCache(value string) []byte {
	data := []byte(value)
	payload := make([]byte, 2+len(data))
	binary.BigEndian.PutUint16(payload[0:2], uint16(len(data)))
	copy(payload[2:], data)
	return payload
}

// getGrpcRoleCacheConfig — returns gRPC role cache service config
func getGrpcRoleCacheConfig() hgrpc.ClientConfig {
	return hgrpc.ClientConfig{
		Address: "localhost:28081",
		Check:   true,
	}
}

// parseRoleVersionResponse — helper to parse role version response
func parseRoleVersionResponse(data []byte) map[string]int64 {
	var result map[string]int64
	if err := json.Unmarshal(data, &result); err != nil {
		hlogger.Log.Warnf("Failed to parse version response: %v", err)
		return nil
	}
	return result
}
