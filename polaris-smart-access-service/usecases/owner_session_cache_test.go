package usecases

import (
	"context"
	"errors"
	"reflect"
	"testing"
	"time"

	"bitbucket.org/log-tech/polaris-smart-access-service/data-access/repository"
)

func testFindUser(username string) func(string) (*repository.AuthUser, error) {
	return func(userID string) (*repository.AuthUser, error) {
		return &repository.AuthUser{Id: userID, Username: username}, nil
	}
}

func TestOwnerIDsFromUserOwners(t *testing.T) {
	t.Parallel()

	got := OwnerIDsFromUserOwners([]repository.UserOwner{
		{OwnerId: "o1"},
		{OwnerId: "o2"},
	})
	want := []string{"o1", "o2"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("OwnerIDsFromUserOwners() = %#v, want %#v", got, want)
	}

	if OwnerIDsFromUserOwners(nil) != nil {
		t.Fatalf("expected nil for empty owners (unrestricted)")
	}
}

func TestParseSessionRoleSet(t *testing.T) {
	t.Parallel()

	got, err := ParseSessionRoleSet(`["ADMIN","OPS"]`)
	if err != nil || !reflect.DeepEqual(got, []string{"ADMIN", "OPS"}) {
		t.Fatalf("ParseSessionRoleSet() = (%#v, %v)", got, err)
	}
	got, err = ParseSessionRoleSet("")
	if err != nil || !reflect.DeepEqual(got, []string{}) {
		t.Fatalf("empty JSON should yield empty slice, got (%#v, %v)", got, err)
	}
	got, err = ParseSessionRoleSet("{bad")
	if err == nil || got != nil {
		t.Fatalf("invalid JSON must error without empty role wipe, got (%#v, %v)", got, err)
	}
}

func TestRemainingSessionTTL(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 8, 3, 12, 0, 0, 0, time.UTC)
	ttl, ok := RemainingSessionTTL(now.Add(30*time.Minute), now)
	if !ok || ttl != 30*time.Minute {
		t.Fatalf("RemainingSessionTTL active = (%v, %v)", ttl, ok)
	}

	ttl, ok = RemainingSessionTTL(now.Add(-time.Second), now)
	if ok || ttl != 0 {
		t.Fatalf("expired session must not be rewritten, got (%v, %v)", ttl, ok)
	}
}

func TestSessionEligibleForOwnerRewrite(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 8, 3, 12, 0, 0, 0, time.UTC)
	active := &repository.Session{
		Id:        "s1",
		UserId:    "u1",
		Status:    "ACTIVE",
		ExpiresAt: now.Add(time.Hour),
	}
	if _, ok := SessionEligibleForOwnerRewrite(active, "u1", now); !ok {
		t.Fatal("active matching session should be eligible")
	}
	if _, ok := SessionEligibleForOwnerRewrite(active, "other", now); ok {
		t.Fatal("user mismatch must be ineligible")
	}
	active.Status = "INVALIDATED"
	if _, ok := SessionEligibleForOwnerRewrite(active, "u1", now); ok {
		t.Fatal("non-ACTIVE must be ineligible")
	}
	if _, ok := SessionEligibleForOwnerRewrite(nil, "u1", now); ok {
		t.Fatal("nil session must be ineligible")
	}
}

func TestOwnerIDSlicesEqual(t *testing.T) {
	t.Parallel()

	if !OwnerIDSlicesEqual([]string{"a", "b"}, []string{"b", "a"}) {
		t.Fatal("order should not matter")
	}
	if OwnerIDSlicesEqual([]string{"a"}, []string{"a", "b"}) {
		t.Fatal("length mismatch should differ")
	}
}

func TestBuildSessionCachePayloadIncludesUsername(t *testing.T) {
	t.Parallel()

	got, err := BuildSessionCachePayload("u1", "  reynald  ", "wh-1", []string{"o1"}, []string{"ADMIN"})
	if err != nil {
		t.Fatalf("BuildSessionCachePayload: %v", err)
	}
	want := map[string]interface{}{
		"userId":      "u1",
		"username":    "reynald",
		"warehouseId": "wh-1",
		"ownerIds":    []string{"o1"},
		"roleSet":     []string{"ADMIN"},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("BuildSessionCachePayload() = %#v, want %#v", got, want)
	}

	gotNil, err := BuildSessionCachePayload("u1", "reynald", "wh-1", nil, nil)
	if err != nil {
		t.Fatalf("BuildSessionCachePayload nil owners: %v", err)
	}
	ownerIDs, _ := gotNil["ownerIds"].([]string)
	if ownerIDs != nil {
		t.Fatalf("nil ownerIds must stay nil (unrestricted), got %#v", gotNil["ownerIds"])
	}
}

func TestBuildSessionCachePayloadRejectsEmptyUsername(t *testing.T) {
	t.Parallel()

	for _, username := range []string{"", "   "} {
		got, err := BuildSessionCachePayload("u1", username, "wh-1", []string{"o1"}, []string{"ADMIN"})
		if err == nil || got != nil {
			t.Fatalf("empty username %q must fail without partial payload, got (%#v, %v)", username, got, err)
		}
	}
}

type fakeSessionRedis struct {
	setErr    error
	deleteErr error
	sets      []fakeSetCall
	deletes   []string
}

type fakeSetCall struct {
	key   string
	value interface{}
	ttl   time.Duration
}

func (f *fakeSessionRedis) Set(_ context.Context, key string, value interface{}, ttl time.Duration) error {
	f.sets = append(f.sets, fakeSetCall{key: key, value: value, ttl: ttl})
	return f.setErr
}

func (f *fakeSessionRedis) Delete(_ context.Context, key string) error {
	f.deletes = append(f.deletes, key)
	return f.deleteErr
}

func TestWriteSessionOwnerContextFailClosed(t *testing.T) {
	t.Parallel()

	redis := &fakeSessionRedis{setErr: errors.New("redis down")}
	payload, err := BuildSessionCachePayload("u1", "reynald", "wh-1", []string{"o1"}, []string{"ADMIN"})
	if err != nil {
		t.Fatalf("payload: %v", err)
	}
	err = writeSessionOwnerContext(context.Background(), redis, "sess-1", payload, time.Minute)
	if err == nil {
		t.Fatal("expected write error")
	}
	if len(redis.deletes) != 1 || redis.deletes[0] != SessionCacheKey("sess-1") {
		t.Fatalf("expected fail-closed delete, got %#v", redis.deletes)
	}
}

func TestRefreshOwnerContextForActiveSessionsRewritesAllActiveSessions(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 8, 3, 12, 0, 0, 0, time.UTC)
	redis := &fakeSessionRedis{}
	err := refreshOwnerContextForActiveSessions("u1", ownerSessionRefreshDeps{
		findOwners: func(userID string) ([]repository.UserOwner, error) {
			return []repository.UserOwner{{OwnerId: "o-new"}, {OwnerId: "o2"}}, nil
		},
		findSessions: func(userID string) ([]repository.Session, error) {
			return []repository.Session{
				{
					Id:          "active-1",
					UserId:      "u1",
					WarehouseId: "wh-1",
					RoleSet:     `["ADMIN"]`,
					ExpiresAt:   now.Add(10 * time.Minute),
				},
				{
					Id:          "active-2",
					UserId:      "u1",
					WarehouseId: "wh-2",
					RoleSet:     `["OPS"]`,
					ExpiresAt:   now.Add(20 * time.Minute),
				},
				{
					Id:          "expired",
					UserId:      "u1",
					WarehouseId: "wh-1",
					RoleSet:     `["ADMIN"]`,
					ExpiresAt:   now.Add(-time.Minute),
				},
			}, nil
		},
		findUser: testFindUser("reynald"),
		redis:    redis,
		now:      now,
	})
	if err != nil {
		t.Fatalf("refresh: %v", err)
	}
	if len(redis.sets) != 2 {
		t.Fatalf("expected 2 active rewrites, got %#v", redis.sets)
	}
	for _, set := range redis.sets {
		got := set.value.(map[string]interface{})
		if got["username"] != "reynald" {
			t.Fatalf("owner refresh must write DB username, got %#v", got["username"])
		}
		if !reflect.DeepEqual(got["ownerIds"], []string{"o-new", "o2"}) {
			t.Fatalf("ownerIds not refreshed: %#v", got["ownerIds"])
		}
		if set.key == SessionCacheKey("active-1") {
			if got["warehouseId"] != "wh-1" || !reflect.DeepEqual(got["roleSet"], []string{"ADMIN"}) {
				t.Fatalf("active-1 warehouse/role changed: %#v", got)
			}
		}
		if set.key == SessionCacheKey("active-2") {
			if got["warehouseId"] != "wh-2" || !reflect.DeepEqual(got["roleSet"], []string{"OPS"}) {
				t.Fatalf("active-2 warehouse/role changed: %#v", got)
			}
		}
	}
}

func TestRefreshOwnerContextDeletesCacheWhenOwnersQueryFails(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 8, 3, 12, 0, 0, 0, time.UTC)
	redis := &fakeSessionRedis{}
	err := refreshOwnerContextForActiveSessions("u1", ownerSessionRefreshDeps{
		findOwners: func(string) ([]repository.UserOwner, error) {
			return nil, errors.New("db owners down")
		},
		findSessions: func(string) ([]repository.Session, error) {
			return []repository.Session{{Id: "s1"}, {Id: "s2"}}, nil
		},
		findUser: testFindUser("reynald"),
		redis:    redis,
		now:      now,
	})
	if err == nil {
		t.Fatal("expected owners query error")
	}
	if !reflect.DeepEqual(redis.deletes, []string{SessionCacheKey("s1"), SessionCacheKey("s2")}) {
		t.Fatalf("expected fail-closed deletes for known sessions, got %#v", redis.deletes)
	}
	if len(redis.sets) != 0 {
		t.Fatalf("must not rewrite on owners failure, got %#v", redis.sets)
	}
}

func TestRefreshOwnerContextDeletesCacheWhenUserLookupFails(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 8, 3, 12, 0, 0, 0, time.UTC)
	redis := &fakeSessionRedis{}
	err := refreshOwnerContextForActiveSessions("u1", ownerSessionRefreshDeps{
		findOwners: func(string) ([]repository.UserOwner, error) {
			return []repository.UserOwner{{OwnerId: "o1"}}, nil
		},
		findSessions: func(string) ([]repository.Session, error) {
			return []repository.Session{{Id: "s1"}, {Id: "s2"}}, nil
		},
		findUser: func(string) (*repository.AuthUser, error) {
			return nil, errors.New("db user down")
		},
		redis: redis,
		now:   now,
	})
	if err == nil {
		t.Fatal("expected user lookup error")
	}
	if !reflect.DeepEqual(redis.deletes, []string{SessionCacheKey("s1"), SessionCacheKey("s2")}) {
		t.Fatalf("expected fail-closed deletes, got %#v", redis.deletes)
	}
	if len(redis.sets) != 0 {
		t.Fatalf("must not rewrite without username, got %#v", redis.sets)
	}
}

func TestRefreshOwnerContextDeletesCacheWhenUsernameEmpty(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 8, 3, 12, 0, 0, 0, time.UTC)
	redis := &fakeSessionRedis{}
	err := refreshOwnerContextForActiveSessions("u1", ownerSessionRefreshDeps{
		findOwners: func(string) ([]repository.UserOwner, error) {
			return []repository.UserOwner{{OwnerId: "o1"}}, nil
		},
		findSessions: func(string) ([]repository.Session, error) {
			return []repository.Session{{Id: "s1"}}, nil
		},
		findUser: testFindUser("  "),
		redis:    redis,
		now:      now,
	})
	if err == nil {
		t.Fatal("expected empty username error")
	}
	if !reflect.DeepEqual(redis.deletes, []string{SessionCacheKey("s1")}) {
		t.Fatalf("expected fail-closed delete, got %#v", redis.deletes)
	}
}

func TestRefreshOwnerContextDeletesCacheOnCorruptRoleSet(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 8, 3, 12, 0, 0, 0, time.UTC)
	redis := &fakeSessionRedis{}
	err := refreshOwnerContextForActiveSessions("u1", ownerSessionRefreshDeps{
		findOwners: func(string) ([]repository.UserOwner, error) {
			return []repository.UserOwner{{OwnerId: "o1"}}, nil
		},
		findSessions: func(string) ([]repository.Session, error) {
			return []repository.Session{{
				Id:          "bad-role",
				UserId:      "u1",
				WarehouseId: "wh-1",
				RoleSet:     "{bad-json",
				ExpiresAt:   now.Add(time.Hour),
			}}, nil
		},
		findUser: testFindUser("reynald"),
		redis:    redis,
		now:      now,
	})
	if err == nil {
		t.Fatal("expected corrupt role_set error")
	}
	if !reflect.DeepEqual(redis.deletes, []string{SessionCacheKey("bad-role")}) {
		t.Fatalf("expected cache delete for corrupt role_set, got %#v", redis.deletes)
	}
	if len(redis.sets) != 0 {
		t.Fatalf("must not rewrite corrupt role session, got %#v", redis.sets)
	}
}

func TestRefreshOwnerContextRemovesOwnerOnDelete(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 8, 3, 12, 0, 0, 0, time.UTC)
	redis := &fakeSessionRedis{}
	// After delete, FindByUserID returns remaining owners only.
	err := refreshOwnerContextForActiveSessions("u1", ownerSessionRefreshDeps{
		findOwners: func(string) ([]repository.UserOwner, error) {
			return []repository.UserOwner{{OwnerId: "o-keep"}}, nil
		},
		findSessions: func(string) ([]repository.Session, error) {
			return []repository.Session{{
				Id:          "s1",
				UserId:      "u1",
				WarehouseId: "wh-1",
				RoleSet:     `["ADMIN"]`,
				ExpiresAt:   now.Add(time.Hour),
			}}, nil
		},
		findUser: testFindUser("reynald"),
		redis:    redis,
		now:      now,
	})
	if err != nil {
		t.Fatalf("refresh: %v", err)
	}
	got := redis.sets[0].value.(map[string]interface{})
	if got["username"] != "reynald" {
		t.Fatalf("owner deletion refresh must keep username, got %#v", got["username"])
	}
	if !reflect.DeepEqual(got["ownerIds"], []string{"o-keep"}) {
		t.Fatalf("deleted owner should be absent, got %#v", got["ownerIds"])
	}
}

func TestRefreshOwnerContextPreservesNilOwnerIdsUnrestricted(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 8, 3, 12, 0, 0, 0, time.UTC)
	redis := &fakeSessionRedis{}
	err := refreshOwnerContextForActiveSessions("u1", ownerSessionRefreshDeps{
		findOwners: func(string) ([]repository.UserOwner, error) {
			return []repository.UserOwner{}, nil
		},
		findSessions: func(string) ([]repository.Session, error) {
			return []repository.Session{{
				Id:          "s1",
				UserId:      "u1",
				WarehouseId: "wh-1",
				RoleSet:     `["ADMIN"]`,
				ExpiresAt:   now.Add(time.Hour),
			}}, nil
		},
		findUser: testFindUser("reynald"),
		redis:    redis,
		now:      now,
	})
	if err != nil {
		t.Fatalf("refresh: %v", err)
	}
	got := redis.sets[0].value.(map[string]interface{})
	ownerIDs, _ := got["ownerIds"].([]string)
	if ownerIDs != nil {
		t.Fatalf("nil ownerIds must stay unrestricted, got %#v", got["ownerIds"])
	}
	if got["username"] != "reynald" {
		t.Fatalf("username missing: %#v", got)
	}
}

func TestLoadOwnerIDsSurfacesDBError(t *testing.T) {
	t.Parallel()

	ids, err := LoadOwnerIDs(func(string) ([]repository.UserOwner, error) {
		return nil, errors.New("db owners down")
	}, "u1")
	if err == nil || ids != nil {
		t.Fatalf("DB error must not become unrestricted nil owners without error: ids=%#v err=%v", ids, err)
	}

	ids, err = LoadOwnerIDs(func(string) ([]repository.UserOwner, error) {
		return []repository.UserOwner{}, nil
	}, "u1")
	if err != nil || ids != nil {
		t.Fatalf("empty assignment should be unrestricted nil: ids=%#v err=%v", ids, err)
	}

	ids, err = LoadOwnerIDs(func(string) ([]repository.UserOwner, error) {
		return []repository.UserOwner{{OwnerId: "o1"}}, nil
	}, "u1")
	if err != nil || !reflect.DeepEqual(ids, []string{"o1"}) {
		t.Fatalf("unexpected ids=%#v err=%v", ids, err)
	}
}

func TestClearSessionCachesUsesDeleteNotSet(t *testing.T) {
	t.Parallel()

	redis := &fakeSessionRedis{}
	err := clearSessionCaches(context.Background(), redis, []repository.Session{{Id: "s1"}, {Id: "s2"}})
	if err != nil {
		t.Fatalf("clearSessionCaches: %v", err)
	}
	if len(redis.sets) != 0 {
		t.Fatalf("must use Delete, not Set(nil): sets=%#v", redis.sets)
	}
	if !reflect.DeepEqual(redis.deletes, []string{SessionCacheKey("s1"), SessionCacheKey("s2")}) {
		t.Fatalf("unexpected deletes %#v", redis.deletes)
	}

	redis = &fakeSessionRedis{deleteErr: errors.New("delete failed")}
	err = clearSessionCaches(context.Background(), redis, []repository.Session{{Id: "s1"}})
	if err == nil {
		t.Fatal("expected delete error to surface")
	}
}

func TestRefreshOwnerContextRequiresRedis(t *testing.T) {
	t.Parallel()

	err := refreshOwnerContextForActiveSessions("u1", ownerSessionRefreshDeps{
		findOwners:   func(string) ([]repository.UserOwner, error) { return nil, nil },
		findSessions: func(string) ([]repository.Session, error) { return nil, nil },
		findUser:     testFindUser("reynald"),
		redis:        nil,
		now:          time.Now(),
	})
	if err == nil {
		t.Fatal("nil Redis must return error so Save/Delete can fail-closed invalidate DB sessions")
	}
}

func TestHealSessionOwnerCacheWithDeps(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 8, 3, 12, 0, 0, 0, time.UTC)

	t.Run("find error deletes cache", func(t *testing.T) {
		t.Parallel()
		redis := &fakeSessionRedis{}
		healSessionOwnerCacheWithDeps("s1", "u1", "reynald", "wh-1", []string{"ADMIN"}, []string{"o1"}, ownerSessionHealDeps{
			findByID: func(string) (*repository.Session, error) { return nil, errors.New("db down") },
			redis:    redis,
			now:      now,
		})
		if !reflect.DeepEqual(redis.deletes, []string{SessionCacheKey("s1")}) || len(redis.sets) != 0 {
			t.Fatalf("sets=%#v deletes=%#v", redis.sets, redis.deletes)
		}
	})

	t.Run("missing or inactive deletes cache", func(t *testing.T) {
		t.Parallel()
		redis := &fakeSessionRedis{}
		healSessionOwnerCacheWithDeps("s1", "u1", "reynald", "wh-1", []string{"ADMIN"}, []string{"o1"}, ownerSessionHealDeps{
			findByID: func(string) (*repository.Session, error) { return nil, nil },
			redis:    redis,
			now:      now,
		})
		if !reflect.DeepEqual(redis.deletes, []string{SessionCacheKey("s1")}) {
			t.Fatalf("expected delete, got %#v", redis.deletes)
		}
	})

	t.Run("empty username deletes cache", func(t *testing.T) {
		t.Parallel()
		redis := &fakeSessionRedis{}
		healSessionOwnerCacheWithDeps("s1", "u1", "  ", "wh-1", []string{"ADMIN"}, []string{"o1"}, ownerSessionHealDeps{
			findByID: func(string) (*repository.Session, error) {
				return &repository.Session{
					Id: "s1", UserId: "u1", Status: "ACTIVE", ExpiresAt: now.Add(time.Hour),
				}, nil
			},
			redis: redis,
			now:   now,
		})
		if !reflect.DeepEqual(redis.deletes, []string{SessionCacheKey("s1")}) || len(redis.sets) != 0 {
			t.Fatalf("empty username must fail-closed: sets=%#v deletes=%#v", redis.sets, redis.deletes)
		}
	})

	t.Run("eligible rewrites owners and username", func(t *testing.T) {
		t.Parallel()
		redis := &fakeSessionRedis{}
		healSessionOwnerCacheWithDeps("s1", "u1", "reynald", "wh-1", []string{"ADMIN"}, []string{"o-db"}, ownerSessionHealDeps{
			findByID: func(string) (*repository.Session, error) {
				return &repository.Session{
					Id: "s1", UserId: "u1", Status: "ACTIVE", ExpiresAt: now.Add(time.Hour),
				}, nil
			},
			redis: redis,
			now:   now,
		})
		if len(redis.sets) != 1 || len(redis.deletes) != 0 {
			t.Fatalf("sets=%#v deletes=%#v", redis.sets, redis.deletes)
		}
		got := redis.sets[0].value.(map[string]interface{})
		if got["username"] != "reynald" {
			t.Fatalf("heal must write DB username into legacy cache, got %#v", got)
		}
		if !reflect.DeepEqual(got["ownerIds"], []string{"o-db"}) || got["warehouseId"] != "wh-1" {
			t.Fatalf("unexpected payload %#v", got)
		}
	})

	t.Run("switch-context style rewrite keeps username", func(t *testing.T) {
		t.Parallel()
		redis := &fakeSessionRedis{}
		payload, err := BuildSessionCachePayload("u1", "reynald", "wh-tangerang", []string{"o1"}, []string{"ADMIN"})
		if err != nil {
			t.Fatalf("payload: %v", err)
		}
		if err := writeSessionOwnerContext(context.Background(), redis, "s1", payload, time.Hour); err != nil {
			t.Fatalf("write: %v", err)
		}
		got := redis.sets[0].value.(map[string]interface{})
		if got["username"] != "reynald" || got["warehouseId"] != "wh-tangerang" {
			t.Fatalf("switch context must retain username, got %#v", got)
		}
	})

	t.Run("DB fallback rebuilds redis with username", func(t *testing.T) {
		t.Parallel()
		redis := &fakeSessionRedis{}
		// Mirrors GetCurrentSession when Redis miss: load DB then healSessionOwnerCache.
		healSessionOwnerCacheWithDeps("s1", "u1", "reynald", "wh-1", []string{"ADMIN"}, nil, ownerSessionHealDeps{
			findByID: func(string) (*repository.Session, error) {
				return &repository.Session{
					Id: "s1", UserId: "u1", Status: "ACTIVE", ExpiresAt: now.Add(time.Hour),
				}, nil
			},
			redis: redis,
			now:   now,
		})
		if len(redis.sets) != 1 || len(redis.deletes) != 0 {
			t.Fatalf("expected redis rebuild, sets=%#v deletes=%#v", redis.sets, redis.deletes)
		}
		got := redis.sets[0].value.(map[string]interface{})
		if got["username"] != "reynald" {
			t.Fatalf("DB fallback must rebuild session.username, got %#v", got)
		}
		ownerIDs, _ := got["ownerIds"].([]string)
		if ownerIDs != nil {
			t.Fatalf("nil ownerIds must stay unrestricted on rebuild, got %#v", got["ownerIds"])
		}
	})
}

func TestLoginStyleSessionPayloadIncludesUsername(t *testing.T) {
	t.Parallel()

	payload, err := BuildSessionCachePayload("u1", "reynald", "", nil, []string{"ADMIN"})
	if err != nil {
		t.Fatalf("login payload: %v", err)
	}
	if payload["username"] != "reynald" || payload["userId"] != "u1" {
		t.Fatalf("login payload missing username: %#v", payload)
	}
	ownerIDs, _ := payload["ownerIds"].([]string)
	if ownerIDs != nil {
		t.Fatalf("login unrestricted owners must stay nil, got %#v", payload["ownerIds"])
	}
}
