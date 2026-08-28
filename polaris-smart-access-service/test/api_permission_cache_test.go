package test

import (
	"reflect"
	"testing"

	"bitbucket.org/log-tech/polaris-smart-access-service/data-access/repository"
	"bitbucket.org/log-tech/polaris-smart-access-service/usecases"
)

func TestBuildApiPermissionEntries(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		in   []repository.RoleApi
		want []string
	}{
		{
			name: "preserves trailing wildcard on uom path",
			in: []repository.RoleApi{
				{HttpMethod: "POST", HttpEndpoint: "/api/v1/master-data/uom/*", IsActive: true},
			},
			want: []string{"POST:/api/v1/master-data/uom/*"},
		},
		{
			name: "skips inactive mappings",
			in: []repository.RoleApi{
				{HttpMethod: "POST", HttpEndpoint: "/api/v1/master-data/uom/*", IsActive: false},
				{HttpMethod: "GET", HttpEndpoint: "/api/v1/master-data/uom/getAll", IsActive: true},
			},
			want: []string{"GET:/api/v1/master-data/uom/getAll"},
		},
		{
			name: "keeps exact endpoints intact",
			in: []repository.RoleApi{
				{HttpMethod: "GET", HttpEndpoint: "/api/v1/master-data/uom/getAll", IsActive: true},
				{HttpMethod: "POST", HttpEndpoint: "/api/v1/master-data/uom/create", IsActive: true},
			},
			want: []string{
				"GET:/api/v1/master-data/uom/getAll",
				"POST:/api/v1/master-data/uom/create",
			},
		},
		{
			name: "deduplicates identical method and endpoint",
			in: []repository.RoleApi{
				{HttpMethod: "POST", HttpEndpoint: "/api/v1/master-data/uom/*", IsActive: true},
				{HttpMethod: "POST", HttpEndpoint: "/api/v1/master-data/uom/*", IsActive: true},
				{HttpMethod: "GET", HttpEndpoint: "/api/v1/master-data/uom/getAll", IsActive: true},
			},
			want: []string{
				"POST:/api/v1/master-data/uom/*",
				"GET:/api/v1/master-data/uom/getAll",
			},
		},
		{
			name: "empty active mappings yield empty slice not nil",
			in: []repository.RoleApi{
				{HttpMethod: "POST", HttpEndpoint: "/api/v1/master-data/uom/*", IsActive: false},
			},
			want: []string{},
		},
		{
			name: "nil input yields empty slice",
			in:   nil,
			want: []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := usecases.BuildApiPermissionEntries(tt.in)
			if got == nil {
				t.Fatalf("expected non-nil empty slice, got nil")
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Fatalf("BuildApiPermissionEntries() = %#v, want %#v", got, tt.want)
			}
		})
	}
}

func TestApiPermissionCacheKey(t *testing.T) {
	t.Parallel()
	got := usecases.ApiPermissionCacheKey("WAREHOUSE_ADMIN")
	want := "polaris:api_permission:WAREHOUSE_ADMIN"
	if got != want {
		t.Fatalf("ApiPermissionCacheKey() = %q, want %q", got, want)
	}
}
