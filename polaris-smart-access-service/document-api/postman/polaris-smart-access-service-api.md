# Polaris Smart Access Service — API Documentation

> **Base URL:** `http://localhost:8081/api/v1`
> **Version:** 1.0.0
> **Protocol:** REST (POST, some GET)
> **Content-Type:** `application/json`

---

## General Information

### Required Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |
| `user-username` | Yes (mutation) | Username for audit trail (`created_by` / `updated_by`) |
| `Authorization` | Yes (auth endpoints) | `Bearer <keycloak_access_token>` |
| `X-Session-Token` | Yes (session endpoints) | Session token from login |

### Response Format

**Success (with data):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": {
    "data": [...],
    "paging": { "page": 1, "pageSize": 25, "count": 5, "totalItems": 50, "totalPages": 2 }
  }
}
```

**Success (no data — create/update/delete):**
```json
{ "code": 200, "status": "OK", "externalCode": 0, "externalDesc": "Success", "errors": null, "content": null }
```

**Error:**
```json
{
  "code": 400,
  "status": "Bad Request",
  "externalCode": -1,
  "externalDesc": "Failed",
  "errors": ["body.code is required.", "header user-username not set."],
  "content": null
}
```

### Error Codes

| httpCode | externalCode | Meaning |
|----------|--------------|---------|
| 200 | 0 | Success |
| 400 | -1 | Validation / business rule failure |
| 401 | -1 | Unauthorized (invalid/expired token) |
| 403 | -1 | Forbidden (e.g. system role modification) |
| 404 | -1 | Data not found |
| 500 | -100002 | Database error |

### Auth Flow

1. **Get Keycloak Token** → `POST {{keycloak_url}}/realms/{{realm}}/protocol/openid-connect/token` (form-urlencoded)
2. **Login (Create Session)** → `POST {{base_url}}/auth/session` with `Authorization: Bearer <access_token>`
3. Use returned `sessionToken` for subsequent RBAC calls via `X-Session-Token` header

---

## 1. Health Check

### `GET /health/check`

Check if service is running.

**Headers:** None required

**Response (200):**
```
Server is healthy.
```

---

## 2. Auth & Session

### `POST /auth/session` — Login (Create Session)

Create a new Polaris session using Keycloak access token.

**Headers:**
| Header | Value |
|--------|-------|
| `Authorization` | `Bearer {{access_token}}` |
| `Content-Type` | `application/json` |

**Request Body:** `{}`

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": {
    "data": [
      {
        "userId": "018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
        "username": "rini.oktaviani",
        "sessionToken": "sess_abc123def456...",
        "createdAt": "2026-07-16T11:46:30+07:00",
        "expiresAt": "2026-07-16T13:46:30+07:00"
      }
    ]
  }
}
```

**Error (401):**
```json
{
  "code": 401,
  "status": "Unauthorized",
  "externalCode": -1,
  "externalDesc": "Failed",
  "errors": ["Invalid or expired token."],
  "content": null
}
```

---

### `POST /auth/logout` — Logout

End current session.

**Headers:**
| Header | Value |
|--------|-------|
| `X-Session-Token` | `{{session_token}}` |
| `user-username` | `{{username}}` |
| `Content-Type` | `application/json` |

**Request Body:** `{}`

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": null
}
```

---

### `POST /sessions/current` — Get Current Session

Get current active session details.

**Headers:**
| Header | Value |
|--------|-------|
| `X-Session-Token` | `{{session_token}}` |
| `user-username` | `{{username}}` |
| `Content-Type` | `application/json` |

**Request Body:** `{}`

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": {
    "data": [
      {
        "userId": "018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
        "username": "rini.oktaviani",
        "email": "rini@example.com",
        "warehouseId": "warehouse-001",
        "warehouseCode": "WH-DNG",
        "ownerContextId": "owner-001",
        "sessionToken": "sess_abc123def456...",
        "createdAt": "2026-07-16T11:46:30+07:00",
        "expiresAt": "2026-07-16T13:46:30+07:00"
      }
    ]
  }
}
```

---

### `POST /sessions/switchContext` — Switch Context

Switch active warehouse/owner context for the session.

**Headers:**
| Header | Value |
|--------|-------|
| `X-Session-Token` | `{{session_token}}` |
| `user-username` | `{{username}}` |
| `Content-Type` | `application/json` |

**Request:**
```json
{
  "warehouseId": "warehouse-001",
  "ownerContextId": "owner-001"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| warehouseId | string | No | Warehouse UUID to switch to |
| ownerContextId | string | No | Owner UUID to switch to |

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": null
}
```

---

## 3. RBAC — Role Management

All endpoints under `/admin/roles`

### `POST /admin/roles/save` — Create Role

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{
  "code": "OPERATOR_INBOUND_DNG",
  "name": "Operator Inbound Danmogot",
  "description": "Operator khusus inbound di warehouse Danmogot",
  "scopes": [
    { "companyId": "company-001", "warehouseId": "warehouse-001" }
  ],
  "permissionIds": []
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| code | string | Yes | Unique role code (max 32) |
| name | string | Yes | Display name (max 128) |
| description | string | No | Description |
| scopes | array | No | Scope restrictions |
| permissionIds | array | No | Initial permission IDs to assign |

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": {
    "data": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "code": "OPERATOR_INBOUND_DNG",
        "name": "Operator Inbound Danmogot",
        "description": "Operator khusus inbound di warehouse Danmogot",
        "isSystem": false,
        "isActive": true,
        "createdBy": "rini.oktaviani",
        "createdAt": "2026-07-16T11:46:30+07:00",
        "updatedBy": "rini.oktaviani",
        "updatedAt": "2026-07-16T11:46:30+07:00"
      }
    ]
  }
}
```

**Error (400) — Duplicate Code:**
```json
{
  "code": 400,
  "status": "Bad Request",
  "externalCode": -1,
  "externalDesc": "Failed",
  "errors": ["Duplicate data for code: OPERATOR_INBOUND_DNG"],
  "content": null
}
```

---

### `POST /admin/roles/getAll` — Get All Roles (Search)

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{
  "filters": {},
  "paging": {
    "page": 1,
    "pageSize": 25,
    "sortBy": "created_at",
    "sortDirection": "desc"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| filters | object | No | Filter conditions |
| paging.page | int | No | Page number (default: 1) |
| paging.pageSize | int | No | Items per page (default: 25, max: 100) |
| paging.sortBy | string | No | Sort field |
| paging.sortDirection | string | No | `asc` or `desc` |

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": {
    "data": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "code": "OPERATOR_INBOUND_DNG",
        "name": "Operator Inbound Danmogot",
        "description": "Operator khusus inbound",
        "isSystem": false,
        "isActive": true,
        "createdBy": "rini.oktaviani",
        "createdAt": "2026-07-16T11:46:30+07:00",
        "updatedBy": "rini.oktaviani",
        "updatedAt": "2026-07-16T11:46:30+07:00"
      }
    ],
    "paging": {
      "page": 1,
      "pageSize": 25,
      "count": 2,
      "totalPages": 1,
      "totalItems": 2
    }
  }
}
```

---

### `POST /admin/roles/detailById` — Get Role Detail

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{ "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }
```

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": {
    "data": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "code": "OPERATOR_INBOUND_DNG",
        "name": "Operator Inbound Danmogot",
        "description": "Operator khusus inbound",
        "isSystem": false,
        "isActive": true,
        "createdBy": "rini.oktaviani",
        "createdAt": "2026-07-16T11:46:30+07:00",
        "updatedBy": "rini.oktaviani",
        "updatedAt": "2026-07-16T11:46:30+07:00"
      }
    ]
  }
}
```

---

### `POST /admin/roles/edit` — Edit Role

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "code": "OPERATOR_INBOUND_DNG",
  "name": "Operator Inbound Danmogot (Updated)",
  "description": "Updated description",
  "scopes": [
    { "companyId": "company-001", "warehouseId": "warehouse-001" },
    { "companyId": "company-001", "warehouseId": "warehouse-002" }
  ],
  "permissionIds": []
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Role UUID |
| code | string | Yes | Unique role code |
| name | string | Yes | Display name |
| description | string | No | Description |
| scopes | array | No | Scope restrictions |
| permissionIds | array | No | Permission IDs to assign |

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": {
    "data": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "code": "OPERATOR_INBOUND_DNG",
        "name": "Operator Inbound Danmogot (Updated)",
        "description": "Updated description",
        "isActive": true,
        "updatedBy": "rini.oktaviani",
        "updatedAt": "2026-07-16T12:00:00+07:00"
      }
    ]
  }
}
```

**Error (403) — System Role:**
```json
{
  "code": 403,
  "status": "Forbidden",
  "externalCode": -1,
  "externalDesc": "Failed",
  "errors": ["System role cannot be modified."],
  "content": null
}
```

---

### `POST /admin/roles/delete` — Delete Role

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{ "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }
```

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": null
}
```

**Error (403) — System Role:**
```json
{
  "code": 403,
  "status": "Forbidden",
  "externalCode": -1,
  "externalDesc": "Failed",
  "errors": ["System role cannot be deleted."],
  "content": null
}
```

---

## 4. RBAC — Permission Management

All endpoints under `/admin/permissions`

### `POST /admin/permissions/save` — Create Permission

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{
  "key": "receipt:create",
  "resource": "receipt",
  "action": "create",
  "description": "Buat receipt baru",
  "module": "inbound"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| key | string | Yes | Unique permission key (e.g. `resource:action`) |
| resource | string | Yes | Resource name (e.g. `receipt`, `user`) |
| action | string | Yes | Action (e.g. `create`, `view`, `delete`) |
| description | string | No | Description |
| module | string | No | Module grouping (e.g. `inbound`, `outbound`) |

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": null
}
```

---

### `POST /admin/permissions/getAll` — Get All Permissions

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{
  "filters": {},
  "paging": {
    "page": 1,
    "pageSize": 25,
    "sortBy": "resource",
    "sortDirection": "asc"
  }
}
```

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": {
    "data": [
      {
        "id": "p1a2b3c4-d5e6-7890-abcd-ef1234567890",
        "key": "receipt:create",
        "resource": "receipt",
        "action": "create",
        "description": "Buat receipt baru",
        "module": "inbound",
        "isActive": true,
        "createdBy": "rini.oktaviani",
        "createdAt": "2026-07-16T11:46:30+07:00"
      }
    ],
    "paging": {
      "page": 1,
      "pageSize": 25,
      "count": 1,
      "totalPages": 1,
      "totalItems": 1
    }
  }
}
```

---

### `POST /admin/permissions/detailById` — Get Permission Detail

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{ "id": "p1a2b3c4-d5e6-7890-abcd-ef1234567890" }
```

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": {
    "data": [
      {
        "id": "p1a2b3c4-d5e6-7890-abcd-ef1234567890",
        "key": "receipt:create",
        "resource": "receipt",
        "action": "create",
        "description": "Buat receipt baru",
        "module": "inbound",
        "isActive": true,
        "createdBy": "rini.oktaviani",
        "createdAt": "2026-07-16T11:46:30+07:00",
        "updatedBy": "",
        "updatedAt": "0001-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### `POST /admin/permissions/edit` — Edit Permission

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{
  "id": "p1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "key": "receipt:create",
  "resource": "receipt",
  "action": "create",
  "description": "Buat receipt baru (updated)",
  "module": "inbound"
}
```

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": null
}
```

---

### `POST /admin/permissions/delete` — Delete Permission

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{ "id": "p1a2b3c4-d5e6-7890-abcd-ef1234567890" }
```

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": null
}
```

---

## 5. RBAC — Role-Permission Mapping

All endpoints under `/admin/role-permissions`

### `POST /admin/role-permissions/save` — Assign Permission to Role

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{
  "roleId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "permissionId": "p1a2b3c4-d5e6-7890-abcd-ef1234567890"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| roleId | string | Yes | Role UUID |
| permissionId | string | Yes | Permission UUID |

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": null
}
```

---

### `POST /admin/role-permissions/getAll` — Get All Role-Permissions

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{
  "filters": {
    "roleId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  },
  "paging": {
    "page": 1,
    "pageSize": 25,
    "sortBy": "created_at",
    "sortDirection": "desc"
  }
}
```

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": {
    "data": [
      {
        "id": "rp1a2b3c4-d5e6-7890-abcd-ef1234567890",
        "roleId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "roleCode": "OPERATOR_INBOUND_DNG",
        "permissionId": "p1a2b3c4-d5e6-7890-abcd-ef1234567890",
        "permissionKey": "receipt:create",
        "isActive": true,
        "createdBy": "rini.oktaviani",
        "createdAt": "2026-07-16T11:46:30+07:00"
      }
    ],
    "paging": {
      "page": 1,
      "pageSize": 25,
      "count": 1,
      "totalPages": 1,
      "totalItems": 1
    }
  }
}
```

---

### `POST /admin/role-permissions/detailById` — Get Role-Permission Detail

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{ "id": "rp1a2b3c4-d5e6-7890-abcd-ef1234567890" }
```

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": {
    "data": [
      {
        "id": "rp1a2b3c4-d5e6-7890-abcd-ef1234567890",
        "roleId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "roleCode": "OPERATOR_INBOUND_DNG",
        "permissionId": "p1a2b3c4-d5e6-7890-abcd-ef1234567890",
        "permissionKey": "receipt:create",
        "isActive": true,
        "createdBy": "rini.oktaviani",
        "createdAt": "2026-07-16T11:46:30+07:00",
        "updatedBy": "",
        "updatedAt": "0001-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### `POST /admin/role-permissions/edit` — Edit Role-Permission

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{
  "id": "rp1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "roleId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "permissionId": "p1a2b3c4-d5e6-7890-abcd-ef1234567890"
}
```

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": null
}
```

---

### `POST /admin/role-permissions/delete` — Delete Role-Permission

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{ "id": "rp1a2b3c4-d5e6-7890-abcd-ef1234567890" }
```

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": null
}
```

---

## 6. RBAC — User-Role Assignment

All endpoints under `/admin/user-roles`

### `POST /admin/user-roles/save` — Assign Role(s) to User

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{
  "userId": "018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
  "roleIds": ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | string | Yes | User UUID |
| roleIds | array | Yes | Array of role UUIDs |

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": null
}
```

---

### `POST /admin/user-roles/search` — Search User-Roles

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{
  "filters": {
    "userId": "018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b"
  },
  "paging": {
    "page": 1,
    "pageSize": 25,
    "sortBy": "created_at",
    "sortDirection": "desc"
  }
}
```

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": {
    "data": [
      {
        "id": "ur1a2b3c4-d5e6-7890-abcd-ef1234567890",
        "userId": "018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
        "roleId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "roleCode": "OPERATOR_INBOUND_DNG",
        "roleName": "Operator Inbound Danmogot",
        "isActive": true,
        "createdBy": "rini.oktaviani",
        "createdAt": "2026-07-16T11:46:30+07:00"
      }
    ],
    "paging": {
      "page": 1,
      "pageSize": 25,
      "count": 1,
      "totalPages": 1,
      "totalItems": 1
    }
  }
}
```

---

### `POST /admin/user-roles/detailById` — Get User-Role Detail

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{ "id": "ur1a2b3c4-d5e6-7890-abcd-ef1234567890" }
```

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": {
    "data": [
      {
        "id": "ur1a2b3c4-d5e6-7890-abcd-ef1234567890",
        "userId": "018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
        "roleId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "roleCode": "OPERATOR_INBOUND_DNG",
        "roleName": "Operator Inbound Danmogot",
        "isActive": true,
        "createdBy": "rini.oktaviani",
        "createdAt": "2026-07-16T11:46:30+07:00",
        "updatedBy": "",
        "updatedAt": "0001-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### `POST /admin/user-roles/delete` — Unassign Role(s) from User

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{
  "userId": "018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
  "roleIds": ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"]
}
```

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": null
}
```

---

## 7. RBAC — User-Permission (Direct)

All endpoints under `/admin/user-permissions`

### `POST /admin/user-permissions/save` — Assign Direct Permission(s) to User

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{
  "userId": "018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
  "permissionIds": ["p1a2b3c4-d5e6-7890-abcd-ef1234567890"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | string | Yes | User UUID |
| permissionIds | array | Yes | Array of permission UUIDs |

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": null
}
```

---

### `POST /admin/user-permissions/getAll` — Get All User-Permissions

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{
  "filters": {
    "userId": "018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b"
  },
  "paging": {
    "page": 1,
    "pageSize": 25,
    "sortBy": "created_at",
    "sortDirection": "desc"
  }
}
```

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": {
    "data": [
      {
        "id": "up1a2b3c4-d5e6-7890-abcd-ef1234567890",
        "userId": "018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
        "permissionId": "p1a2b3c4-d5e6-7890-abcd-ef1234567890",
        "permissionKey": "receipt:create",
        "isActive": true,
        "createdBy": "rini.oktaviani",
        "createdAt": "2026-07-16T11:46:30+07:00"
      }
    ],
    "paging": {
      "page": 1,
      "pageSize": 25,
      "count": 1,
      "totalPages": 1,
      "totalItems": 1
    }
  }
}
```

---

### `POST /admin/user-permissions/delete` — Delete Direct Permission from User

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{
  "userId": "018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
  "permissionIds": ["p1a2b3c4-d5e6-7890-abcd-ef1234567890"]
}
```

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": null
}
```

---

## 8. Multi-Level Access — User-Warehouse

All endpoints under `/admin/user-warehouses`

### `POST /admin/user-warehouses/save` — Assign Warehouse(s) to User

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{
  "userId": "018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
  "warehouseIds": [
    {
      "warehouseId": "warehouse-001",
      "warehouseCode": "WH-DNG",
      "warehouseName": "Warehouse Danmogot"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | string | Yes | User UUID |
| warehouseIds | array | Yes | Array of warehouse objects |
| warehouseIds[].warehouseId | string | Yes | Warehouse UUID |
| warehouseIds[].warehouseCode | string | Yes | Warehouse code |
| warehouseIds[].warehouseName | string | Yes | Warehouse name |

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": null
}
```

---

### `POST /admin/user-warehouses/getAll` — Get User-Warehouses

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{ "userId": "018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b" }
```

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": {
    "data": [
      {
        "id": "uw1a2b3c4-d5e6-7890-abcd-ef1234567890",
        "userId": "018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
        "warehouseId": "warehouse-001",
        "warehouseCode": "WH-DNG",
        "warehouseName": "Warehouse Danmogot",
        "isActive": true,
        "createdBy": "rini.oktaviani",
        "createdAt": "2026-07-16T11:46:30+07:00"
      }
    ]
  }
}
```

---

### `POST /admin/user-warehouses/detailById` — Get User-Warehouse Detail

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{ "id": "uw1a2b3c4-d5e6-7890-abcd-ef1234567890" }
```

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": {
    "data": [
      {
        "id": "uw1a2b3c4-d5e6-7890-abcd-ef1234567890",
        "userId": "018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
        "warehouseId": "warehouse-001",
        "warehouseCode": "WH-DNG",
        "warehouseName": "Warehouse Danmogot",
        "isActive": true,
        "createdBy": "rini.oktaviani",
        "createdAt": "2026-07-16T11:46:30+07:00"
      }
    ]
  }
}
```

---

### `POST /admin/user-warehouses/delete` — Remove Warehouse(s) from User

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{
  "userId": "018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
  "warehouseIds": ["warehouse-001"]
}
```

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": null
}
```

---

## 9. Data Isolation — User-Owner

All endpoints under `/admin/user-owners`

### `POST /admin/user-owners/save` — Assign Owner to User

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{
  "userId": "018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
  "ownerId": "owner-001",
  "ownerCode": "OWN-DNG",
  "ownerName": "Owner Danmogot"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userId | string | Yes | User UUID |
| ownerId | string | Yes | Owner UUID |
| ownerCode | string | Yes | Owner code |
| ownerName | string | Yes | Owner name |

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": null
}
```

---

### `POST /admin/user-owners/getAll` — Get User-Owners

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{ "userId": "018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b" }
```

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": {
    "data": [
      {
        "id": "uo1a2b3c4-d5e6-7890-abcd-ef1234567890",
        "userId": "018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
        "ownerId": "owner-001",
        "ownerCode": "OWN-DNG",
        "ownerName": "Owner Danmogot",
        "isActive": true,
        "createdBy": "rini.oktaviani",
        "createdAt": "2026-07-16T11:46:30+07:00"
      }
    ]
  }
}
```

---

### `POST /admin/user-owners/delete` — Remove Owner from User

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{ "id": "uo1a2b3c4-d5e6-7890-abcd-ef1234567890" }
```

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": null
}
```

---

## 10. User Provisioning (REQ-014)

All endpoints under `/admin/users`

### `POST /admin/users/save` — Create User

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{
  "username": "johndoe",
  "email": "johndoe@example.com",
  "displayName": "John Doe",
  "password": "P@ssw0rd123",
  "sendResetEmail": false,
  "roleIds": ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"],
  "scopes": [
    { "scopeType": "WAREHOUSE", "warehouseId": "warehouse-001" },
    { "scopeType": "OWNER", "ownerId": "owner-001" }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | Unique username |
| email | string | Yes | Email address |
| displayName | string | No | Display name |
| password | string | Conditional | Required if `sendResetEmail` is false |
| sendResetEmail | bool | No | Send password reset email instead (default: false) |
| roleIds | array | No | Array of role UUIDs to assign |
| scopes | array | No | Initial scopes (warehouse/owner) |

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": {
    "data": [
      {
        "id": "u1a2b3c4-d5e6-7890-abcd-ef1234567890",
        "username": "johndoe",
        "email": "johndoe@example.com",
        "displayName": "John Doe",
        "status": "ACTIVE",
        "createdBy": "rini.oktaviani",
        "createdAt": "2026-07-16T11:46:30+07:00"
      }
    ]
  }
}
```

---

### `POST /admin/users/detailById` — Get User Detail

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{ "id": "u1a2b3c4-d5e6-7890-abcd-ef1234567890" }
```

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": {
    "data": [
      {
        "id": "u1a2b3c4-d5e6-7890-abcd-ef1234567890",
        "username": "johndoe",
        "email": "johndoe@example.com",
        "displayName": "John Doe",
        "firstName": "John",
        "lastName": "Doe",
        "status": "ACTIVE",
        "roles": [
          {
            "roleId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "roleCode": "OPERATOR_INBOUND_DNG",
            "roleName": "Operator Inbound Danmogot"
          }
        ],
        "warehouses": [
          {
            "warehouseId": "warehouse-001",
            "warehouseCode": "WH-DNG",
            "warehouseName": "Warehouse Danmogot"
          }
        ],
        "scopes": [
          {
            "scopeType": "WAREHOUSE",
            "scopeValue": "warehouse-001"
          }
        ],
        "createdBy": "rini.oktaviani",
        "createdAt": "2026-07-16T11:46:30+07:00"
      }
    ]
  }
}
```

---

### `POST /admin/users/edit` — Edit User

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{
  "id": "u1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "email": "johndoe.updated@example.com",
  "displayName": "John Doe Updated",
  "firstName": "John",
  "lastName": "Doe Updated",
  "status": "ACTIVE"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | User UUID |
| email | string | No | Email address |
| displayName | string | No | Display name |
| firstName | string | No | First name |
| lastName | string | No | Last name |
| status | string | No | `ACTIVE` or `INACTIVE` |

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": null
}
```

---

### `POST /admin/users/getAll` — Get All Users (Search)

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{
  "filters": {},
  "paging": {
    "page": 1,
    "pageSize": 25,
    "sortBy": "created_at",
    "sortDirection": "desc"
  }
}
```

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": {
    "data": [
      {
        "id": "u1a2b3c4-d5e6-7890-abcd-ef1234567890",
        "username": "johndoe",
        "email": "johndoe@example.com",
        "displayName": "John Doe",
        "status": "ACTIVE",
        "createdBy": "rini.oktaviani",
        "createdAt": "2026-07-16T11:46:30+07:00"
      }
    ],
    "paging": {
      "page": 1,
      "pageSize": 25,
      "count": 1,
      "totalPages": 1,
      "totalItems": 1
    }
  }
}
```

---

### `POST /admin/users/deactivate` — Deactivate User

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{ "id": "u1a2b3c4-d5e6-7890-abcd-ef1234567890" }
```

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": null
}
```

---

### `POST /admin/users/reactivate` — Reactivate User

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{ "id": "u1a2b3c4-d5e6-7890-abcd-ef1234567890" }
```

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": null
}
```

---

### `POST /admin/users/resetPassword` — Reset Password

**Headers:** `user-username`, `Content-Type: application/json`

**Request:**
```json
{
  "id": "u1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "password": "NewP@ssw0rd456"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | User UUID |
| password | string | Yes | New password |

**Response (200):**
```json
{
  "code": 200,
  "status": "OK",
  "externalCode": 0,
  "externalDesc": "Success",
  "errors": null,
  "content": null
}
```

---

## Endpoint Summary

| # | Method | Path | Description |
|---|--------|------|-------------|
| 1 | GET | `/health/check` | Health check |
| 2 | POST | `/auth/session` | Login (create session) |
| 3 | POST | `/auth/logout` | Logout |
| 4 | POST | `/sessions/current` | Get current session |
| 5 | POST | `/sessions/switchContext` | Switch warehouse/owner context |
| 6 | POST | `/admin/roles/save` | Create role |
| 7 | POST | `/admin/roles/getAll` | List/search roles |
| 8 | POST | `/admin/roles/detailById` | Get role detail |
| 9 | POST | `/admin/roles/edit` | Update role |
| 10 | POST | `/admin/roles/delete` | Delete role |
| 11 | POST | `/admin/permissions/save` | Create permission |
| 12 | POST | `/admin/permissions/getAll` | List/search permissions |
| 13 | POST | `/admin/permissions/detailById` | Get permission detail |
| 14 | POST | `/admin/permissions/edit` | Update permission |
| 15 | POST | `/admin/permissions/delete` | Delete permission |
| 16 | POST | `/admin/role-permissions/save` | Assign permission to role |
| 17 | POST | `/admin/role-permissions/getAll` | List role-permissions |
| 18 | POST | `/admin/role-permissions/detailById` | Get role-permission detail |
| 19 | POST | `/admin/role-permissions/edit` | Edit role-permission |
| 20 | POST | `/admin/role-permissions/delete` | Delete role-permission |
| 21 | POST | `/admin/user-roles/save` | Assign role(s) to user |
| 22 | POST | `/admin/user-roles/search` | Search user-roles |
| 23 | POST | `/admin/user-roles/detailById` | Get user-role detail |
| 24 | POST | `/admin/user-roles/delete` | Unassign role(s) from user |
| 25 | POST | `/admin/user-permissions/save` | Assign direct permission(s) to user |
| 26 | POST | `/admin/user-permissions/getAll` | List user-permissions |
| 27 | POST | `/admin/user-permissions/delete` | Delete direct permission from user |
| 28 | POST | `/admin/user-warehouses/save` | Assign warehouse(s) to user |
| 29 | POST | `/admin/user-warehouses/getAll` | Get user-warehouses |
| 30 | POST | `/admin/user-warehouses/detailById` | Get user-warehouse detail |
| 31 | POST | `/admin/user-warehouses/delete` | Remove warehouse(s) from user |
| 32 | POST | `/admin/user-owners/save` | Assign owner to user |
| 33 | POST | `/admin/user-owners/getAll` | Get user-owners |
| 34 | POST | `/admin/user-owners/delete` | Remove owner from user |
| 35 | POST | `/admin/users/save` | Create user |
| 36 | POST | `/admin/users/detailById` | Get user detail |
| 37 | POST | `/admin/users/edit` | Edit user |
| 38 | POST | `/admin/users/getAll` | List/search users |
| 39 | POST | `/admin/users/deactivate` | Deactivate user |
| 40 | POST | `/admin/users/reactivate` | Reactivate user |
| 41 | POST | `/admin/users/resetPassword` | Reset user password |