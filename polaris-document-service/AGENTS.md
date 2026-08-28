# AGENTS.md — Basic Project (Go Microservice Template)

> Internal technical documentation. Contains all conventions, coding rules, and patterns that MUST be followed when working on this project.

---

## 1. Overview

**Basic Project** is a starter template for building Golang microservices. Provides a standard project structure, configuration setup, and example implementations for CRUD + RabbitMQ.

| Attribute | Value |
|---|---|
| Module | `bitbucket.org/log-tech/basic-project` |
| Go Version | 1.23+ |
| Framework | Gin (REST) + GORM (ORM) |
| Port | 8080 (REST) |
| Database | MySQL / TiDB |
| Config Source | Environment Variables (JSON format) |

---

## 2. Architecture

### Layered Architecture

```
[HTTP Request] → api/rest/ (Controller) → usecases/ (Business Logic) → data-access/repository/ (Data Layer)
```

### Layer Responsibilities

| Layer | Folder | Responsibility |
|---|---|---|
| **Controller** | `api/rest/` | Routing, request validation, response formatting |
| **Use Cases** | `usecases/` | Business logic, orchestration, business validation |
| **Repository** | `data-access/repository/` | Database operations, NO business logic |
| **Models** | `models/` | Request/response DTOs (NOT DB entities) |
| **Config** | `config/` | Singleton config loader via JSON env vars |
| **Constants** | `constants/` | Global constants |

### Layer Rules (NON-NEGOTIABLE)

- ❌ Controller **MUST NOT** access repository directly
- ❌ Repository **MUST NOT** contain business logic
- ❌ Do NOT instantiate use cases/repos directly inside functions
- ✅ Dependency injection via `AllUseCasesImpl`
- ✅ DB entity structs live in the `repository` package, NOT in `models`

---

## 3. Project Structure

```
basic-project/
├── server.go                        # Entry point — bootstrap, graceful shutdown
├── go.mod                           # Module definition & dependencies
├── Dockerfile                       # Multi-stage Docker build
├── build.sh / build.bat             # Build scripts cross-platform
├── .air.toml                        # Hot-reload config (development)
├── start-dev.sh / start-dev.bat     # Development start script
│
├── api/                             # 🌐 API Layer
│   └── rest/
│       ├── router_controller.go     # Central route registration
│       ├── health_controller.go     # GET /health/check
│       ├── config_controller.go     # Config CRUD endpoints
│       └── ex_rmq_controller.go     # Example: RabbitMQ publish endpoint
│
├── usecases/                        # 🧠 Business Logic Layer
│   ├── all_uc.go                    # Central DI & initialization
│   ├── config_uc.go                 # Config CRUD use case
│   └── ex_rmq_uc.go                 # Example: RabbitMQ publish/consume
│
├── data-access/                     # 💾 Data Access Layer
│   └── repository/
│       ├── all_repository.go        # Repository aggregator
│       └── config_repository.go     # Config table operations
│
├── models/                          # 📦 Request/Response DTOs
│   └── config_models.go             # ConfigReq, ConfigResp
│
├── config/                          # ⚙️ Configuration loader
│   └── config.go                    # JSON env-based config (singleton)
│
├── constants/                       # 📋 Application constants
│   └── constants.go
│
├── utils/                           # 🔧 Utility functions
│
└── __build/                         # 🏗️ Build output
    ├── dev/config/system.properties
    └── release/config/system.properties
```

---

## 4. Configuration

### Pattern: JSON Environment Variables

All config is loaded from environment variables in JSON format. DB credentials are separated for secrets management.

| Variable | Required | Format | Description |
|---|---|---|---|
| `APP_NAME` | Yes | String | Service name |
| `APP_DB_USER` | Yes | String | DB username (separate, NOT inside APP_DB) |
| `APP_DB_PASSWORD` | Yes | String | DB password (separate, NOT inside APP_DB) |
| `APP_DB_NAME` | Yes | String | DB name (separate, NOT inside APP_DB) |
| `APP_DB` | Yes | JSON | DB connection (host, port, pool — NO credentials) |
| `APP_GENERAL` | Yes | JSON | General config |
| `APP_LOG` | Yes | JSON | Logging config |
| `APP_REST_SERVER` | Yes | JSON | REST server config |
| `APP_LOCAL_CACHE` | Yes | JSON | Local cache config |
| `APP_REDIS` | No | JSON | Redis connection |
| `APP_RMQ` | No | JSON | RabbitMQ connection |
| `APP_RMQ_CLIENT` | No | JSON | RMQ gRPC client |
| `APP_GRPC_SERVER` | No | JSON | gRPC server |

**Fallback key**: Each variable has a fallback with `APP_BP_*` prefix (e.g. `APP_BP_DB`).

### Config Loading (config/config.go)

```go
// Required config — panics if not found
config, _ := GetConfigJson[hdb.Config]("APP_DB", "APP_BP_DB")

// Optional config — returns nil if not found
config := GetConfigJsonOptional[hredis.Config]("APP_REDIS", "APP_BP_REDIS")

// DB credentials are separate env vars
strDbUser := getEnvRequired("APP_DB_USER", "APP_BP_DB_USER")
```

### Initialization Sequence (usecases/all_uc.go)

```
1. NewAllUseCases()        → empty struct
2. Init(ctx):
   a. Create Helper (helpergo.New)
   b. Connect DB (helper.DbClient)
   c. Init repository
   d. Init Log
   e. Init Redis (optional)
   f. Init Cache (optional)
   g. Init RabbitMQ (optional)
   h. Init gRPC Server (optional)
   i. Init REST Server
   j. Register use cases
   k. Start RMQ consumers (optional)
```

---

## 5. API Standard

### HTTP Method

| Method | Used For |
|---|---|
| `GET` | Retrieve data (by ID, list, search) |
| `POST` | Create, Update, Delete, Action |

**DO NOT use** `PUT`, `PATCH`, or `DELETE` HTTP methods.

### Endpoint Naming

| Action | Path Pattern | Method |
|---|---|---|
| Health check | `GET /health/check` | GET |
| List/Search | `GET /group/getAll` (JSON body) | GET |
| Detail by ID | `GET /group/getById?key=xxx` | GET |
| Create | `POST /group/add` | POST |
| Update | `POST /group/edit` | POST |
| Delete (soft) | `POST /group/delete` | POST |
| Custom action | `POST /group/{actionName}` | POST |

### Route Registration Pattern

```go
// router_controller.go — Central route registration
func RegisterRestController(srv *hrest.Server, allUseCases *usecases.AllUseCasesImpl) {
    health := srv.Group("/health")
    { HealthRestController(health, allUseCases) }

    config := srv.Group("/configs")
    { ConfigRestController(config, allUseCases) }

    // add new groups here
    domain := srv.Group("/domain-name")
    { DomainRestController(domain, allUseCases) }
}
```

### Response Format

**Success**:
```json
{
  "httpCode": 200,
  "externalCode": 0,
  "externalDesc": "Success",
  "data": {
    "data": [{ "key": "xxx", "value": "yyy" }],
    "paging": { "page": 1, "pageSize": 100, "count": 1, "totalItems": 1, "totalPages": 1 }
  }
}
```

**Success without data** (create/update/delete):
```json
{ "httpCode": 200, "externalCode": 0, "externalDesc": "Success", "data": null }
```

**Error**:
```json
{
  "httpCode": 400,
  "externalCode": -1,
  "externalDesc": "Failed",
  "errorMessage": ["body.key is required.", "header user-username not set."]
}
```

### HTTP Status Code

| Condition | Code | externalCode |
|---|---|---|
| Success | `200` | `0` |
| Validation / business rule failure | `400` | `-1` |
| Data not found | `404` | `-1` |
| Database error | `500` | `-100006` |

### Required Header

```
user-username: {username}
```

Validated on every endpoint that mutates data. Used for `created_by` / `updated_by` audit fields.

---

## 6. Code Patterns

### Controller Pattern

```go
// 1. Register in group
func DomainRestController(group *gin.RouterGroup, allUseCases *usecases.AllUseCasesImpl) {
    group.POST("/add", addDomain(allUseCases))
    group.POST("/edit", editDomain(allUseCases))
    group.GET("/getById", getByIdDomain(allUseCases))
}

// 2. Handler factory — returns gin.HandlerFunc
func addDomain(allUseCases *usecases.AllUseCasesImpl) gin.HandlerFunc {
    return func(c *gin.Context) {
        httpCode := http.StatusOK

        // Validate
        bodyReq, errMsg, isValid := isValidDomainRequest(c, constants.ActionAdd)
        if !isValid {
            httpCode = http.StatusBadRequest
            c.JSON(httpCode, hutils.BuildRestResponseFailure(httpCode, -1, "Failed", errMsg))
            return
        }

        // Call use case
        data, errUc := allUseCases.DomainUseCases.Save(bodyReq)
        if errUc != nil {
            c.JSON(errUc.HttpCode, hutils.BuildRestResponseFailure(
                errUc.HttpCode, errUc.ExternalCode, errUc.ExternalDescription, errUc.ErrorMessage))
            return
        }

        // Response
        c.JSON(httpCode, hutils.BuildRestResponseSuccess(nil))
    }
}
```

### Validation Pattern

```go
func isValidDomainRequest(ctx *gin.Context, actionType string) (models.DomainReq, []string, bool) {
    var errMsg []string
    valid := true

    // 1. Validate header — ALWAYS first
    username := ctx.GetHeader("user-username")
    if len(username) == 0 {
        errMsg = append(errMsg, "header user-username not set.")
    }

    // 2. Bind JSON body — if fails, return immediately
    var bodyRequest models.DomainReq
    if err := ctx.ShouldBindJSON(&bodyRequest); err != nil {
        return bodyRequest, append(errMsg, err.Error()), false
    }

    // 3. Validate per action type — collect ALL errors
    if actionType == constants.ActionAdd {
        if len(bodyRequest.Name) == 0 {
            errMsg = append(errMsg, "body.name is required.")
        }
        bodyRequest.CreatedBy = username
        bodyRequest.UpdatedBy = username
    }

    if len(errMsg) > 0 { valid = false }
    return bodyRequest, errMsg, valid
}
```

**Validation Rules**:
- Collect all errors, return them at once (batch) — DO NOT early return per field
- `ShouldBindJSON` failure → return immediately (cannot continue)
- Audit fields (`CreatedBy`, `UpdatedBy`) set from `user-username` header
- Error format: `"body.fieldName is required."` or `"header user-username not set."`

### Use Case Pattern

```go
type DomainUseCasesImpl struct {
    repo  *repository.DomainRepository
    redis *hredis.Client  // optional
}

func NewDomainUseCases(allUc *AllUseCasesImpl) *DomainUseCasesImpl {
    return &DomainUseCasesImpl{
        repo:  allUc.Repository.GetDomainRepository(),
        redis: allUc.Helper.GetRedisClient(),
    }
}

func (uc *DomainUseCasesImpl) Save(params models.DomainReq) *hmodels.UseCasesError {
    // 1. Business validation
    errMsg := uc.validateReq(params, constants.ActionAdd)
    if len(errMsg) > 0 {
        return hutils.BuildUseCasesError(errMsg, http.StatusBadRequest, -1, "Failed")
    }

    // 2. Check existing (duplicate)
    existing, err := uc.repo.FindByID(params.ID)
    if err != nil {
        return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
    }
    if existing != nil {
        return hutils.BuildUseCasesError([]string{"Duplicate data"}, http.StatusBadRequest, -1, "Failed")
    }

    // 3. Save
    err = uc.repo.Save(&entity)
    if err != nil {
        return hutils.BuildUseCasesError([]string{err.Error()}, http.StatusInternalServerError, -100006, "Database Error.")
    }
    return nil
}
```

### Repository Pattern

```go
type DomainRepository struct {
    Db *gorm.DB
}

func NewDomainRepository(dbInstance *gorm.DB) (*DomainRepository, error) {
    if dbInstance == nil {
        return nil, errors.New("failed to get database connection")
    }
    return &DomainRepository{Db: dbInstance}, nil
}

// Save — audit fields are mandatory
func (r *DomainRepository) Save(entity *Domain) error {
    if len(entity.CreatedBy) == 0 {
        return errors.New("no provide user action for save")
    }
    entity.CreatedAt = time.Now()
    entity.UpdatedBy = entity.CreatedBy
    entity.UpdatedAt = entity.CreatedAt
    return r.Db.Create(entity).Error
}

// FindByID — returns nil, nil if not found (not an error)
func (r *DomainRepository) FindByID(id string) (*Domain, error) {
    var result Domain
    if err := r.Db.Where("id = ?", id).First(&result).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, nil
        }
        return nil, err
    }
    return &result, nil
}
```

### DB Entity Pattern

```go
// DB entities live in the repository package, NOT in models
type Domain struct {
    ID        string         `gorm:"primaryKey;column:id" json:"id"`
    Name      string         `gorm:"column:name" json:"name"`
    IsActive  bool           `gorm:"column:is_active" json:"isActive"`
    CreatedBy string         `gorm:"column:created_by" json:"createdBy"`
    CreatedAt time.Time      `gorm:"column:created_at" json:"createdAt"`
    UpdatedBy string         `gorm:"column:updated_by" json:"updatedBy"`
    UpdatedAt time.Time      `gorm:"column:updated_at" json:"updatedAt"`
    DeletedBy sql.NullString `gorm:"column:deleted_by" json:"deletedBy"`
    DeletedAt sql.NullTime   `gorm:"column:deleted_at" json:"deletedAt"`
}

func (Domain) TableName() string { return "m_domain" }
```

---

## 7. Naming Convention

### File Naming

| Category | Pattern | Example |
|---|---|---|
| Controller | `{domain}_controller.go` | `config_controller.go` |
| Use case | `{domain}_uc.go` | `config_uc.go` |
| Repository | `{domain}_repository.go` | `config_repository.go` |
| Model | `{domain}_models.go` | `config_models.go` |
| Router | `router_controller.go` | Always this name |
| DI Aggregator | `all_uc.go`, `all_repository.go` | Consistent |

### Struct Naming

| Category | Pattern | Example |
|---|---|---|
| DI aggregator | `AllUseCasesImpl` | Always the same |
| Use case | `{Domain}UseCasesImpl` | `ConfigUseCasesImpl` |
| Repository | `{Domain}Repository` | `ConfigRepository` |
| Request DTO | `{Domain}Req` | `ConfigReq` |
| Response DTO | `{Domain}Resp` | `ConfigResp` |
| DB Entity | Noun (in `repository` package) | `Config` |

### Function Naming

| Category | Pattern | Example |
|---|---|---|
| Constructor | `New{StructName}` | `NewConfigUseCases()` |
| Handler factory | camelCase, returns `gin.HandlerFunc` | `addConfig()` |
| Controller registration | `{Domain}RestController` | `ConfigRestController()` |
| Validation | `isValid{Domain}Request` | `isValidConfigRequest()` |
| Init methods | `init{Component}` | `initRedis()`, `initRestServer()` |
| Converter | `to{Target}Resp` | `toConfigResp()` |
| Repository CRUD | Verbs | `Save()`, `Update()`, `FindByID()`, `FindAll()` |

### Variable Naming

| Category | Pattern | Example |
|---|---|---|
| Local var | camelCase | `httpCode`, `bodyReq`, `errMsg` |
| Boolean | prefix `is`/`has` | `isValid`, `isSet` |
| Error | `err` / `errUc` | `err`, `errUc` |
| Slice | plural or prefix `ls` | `errMsg`, `lsData` |

### Constant Naming

| Category | Pattern | Example |
|---|---|---|
| Action types | PascalCase + `Action` | `ActionAdd`, `ActionUpdate`, `ActionDelete` |
| Repository | PascalCase + `Repository` | `RepositorySortDirectionAsc` |

---

## 8. Error Handling

### Pattern Per Layer

| Layer | Return Type | Error Pattern |
|---|---|---|
| Repository | `(result, error)` | Return `nil, nil` if not found |
| Use Case | `*hmodels.UseCasesError` | Return `BuildUseCasesError(...)` |
| Controller | HTTP response | Propagate `errUc.HttpCode` directly |

### Anti-Patterns (DO NOT DO THIS)

```go
// ❌ Swallowing errors
result, _ := someFunction()

// ❌ Inconsistent HTTP code
httpCode = http.StatusBadRequest
c.JSON(http.StatusOK, hutils.BuildRestResponseFailure(httpCode, ...))

// ❌ Missing return after error response
if !isValid {
    c.JSON(400, hutils.BuildRestResponseFailure(...))
    // FORGOT RETURN — execution continues
}

// ❌ Hardcoding HTTP code from use case
if errUc != nil {
    c.JSON(500, ...) // WRONG — use errUc.HttpCode
}

// ❌ Business logic in controller
if bodyReq.Status == "ACTIVE" && bodyReq.Qty > 100 {
    // this belongs in the use case
}

// ❌ Direct repository access from controller
data, err := allUseCases.Repository.GetConfigRepository().FindByID(id)
```

---

## 9. Database

### Table Naming

- Prefix `m_` for master/config tables (e.g. `m_config`)
- Domain-appropriate prefix for new tables

### Standard Audit Fields (REQUIRED on all tables)

```sql
created_by VARCHAR(100) NOT NULL,
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_by VARCHAR(100) NOT NULL,
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
deleted_by VARCHAR(100) NULL,
deleted_at TIMESTAMP NULL
```

### Soft Delete

- Use `is_active` flag + `deleted_by` / `deleted_at`
- NEVER hard delete — always soft delete

### Query Strategy

**Primary preference: RAW Query**. Use ORM only for simple operations.

| Complexity | Approach | Example |
|---|---|---|
| Simple CRUD (single table) | ORM is acceptable | `r.Db.Where("id = ?", id).First(&result)` |
| JOIN, subquery, aggregation | **MUST use RAW Query** | `r.Db.Raw("SELECT ... JOIN ... WHERE ...", params)` |
| Complex filter / dynamic | **MUST use RAW Query** | Manual query builder with parameterized values |
| Bulk insert/update | **MUST use RAW Query** | Better performance control |

**Why RAW is preferred**:
- More transparent — you see exactly what SQL is being executed
- Easier to debug and optimize
- Avoids ORM magic that can generate inefficient queries
- Consistent across the team — everyone reads the same SQL

```go
// ✅ CORRECT — RAW query for complex operations
var results []models.ProductResp
r.Db.Raw(`
    SELECT p.id, p.name, p.sku, c.category_name
    FROM m_product p
    JOIN m_category c ON c.id = p.category_id
    WHERE p.is_active = 1 AND p.category_id = ?
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
`, categoryID, pageSize, offset).Scan(&results)

// ✅ CORRECT — ORM for simple single-table lookup
r.Db.Where("cfg_key = ?", id).First(&result)

// ✅ CORRECT — RAW even for simple queries (preferred)
r.Db.Raw("SELECT * FROM m_config WHERE cfg_key = ? AND is_active = 1", id).Scan(&result)

// ❌ WRONG — string concatenation (SQL injection)
r.Db.Raw("SELECT * FROM m_config WHERE cfg_key = '" + id + "'")

// ❌ WRONG — ORM chaining that becomes unreadable
r.Db.Joins("JOIN categories ON ...").Where("...").Preload("Details").Find(&result)
```

### SQL Safety

- **ALWAYS** use parameterized queries (`?` placeholder)
- **NEVER** use string concatenation for values
- **Whitelist** columns allowed for sort/filter:

```go
allowedColumns := map[string]string{
    "createdAt": "created_at",
    "name":      "name",
}
column, ok := allowedColumns[sortBy]
if !ok {
    column = "created_at" // safe default
}
query := fmt.Sprintf("SELECT * FROM m_product ORDER BY %s %s LIMIT ? OFFSET ?", column, direction)
r.Db.Raw(query, pageSize, offset).Scan(&results)
```

---

## 10. RabbitMQ Integration (Optional)

### Consumer Pattern

In `all_uc.go` — register consumer during init:
```go
a.RmqClient.Consumer().Consume(
    hutils.GetEnv("QUEUE_KEY_RMQ_MESSAGE", "bp.queue.basic_project"),
    true,   // auto-ack
    100,    // prefetch count
    a.RabbitMqUseCases.ExReceiveMessageMqHandler,
)
```

### Publisher Pattern

```go
func (a *AllUseCasesImpl) PublishMessage(params interface{}, exchangeKey string, routingKey string) error {
    msg, err := hutils.InterfaceToMap(params)
    if err != nil { return err }
    
    msgReq := hmodels.DelayMessageRequest{
        Exchange:   exchangeKey,
        RoutingKey: routingKey,
        Message:    msg,
        NoWait:     true,
    }
    resp, err := a.RmqClient.Publisher().PublishMessage(msgReq)
    // handle error...
}
```

### RMQ Env Vars

```bash
QUEUE_KEY_RMQ_MESSAGE=bp.queue.basic_project
EXCHANGE_KEY_RMQ_MESSAGE=bp.direct.basic_project
ROUTING_KEY_RMQ_MESSAGE=bp.route.basic_project
```

---

## 11. Adding a New Domain (Step-by-Step)

When adding a new domain (e.g. `product`), follow these steps:

### 1. Create Model (`models/product_models.go`)
```go
type ProductReq struct {
    ID        string `json:"id"`
    Name      string `json:"name"`
    CreatedBy string `json:"createdBy"`
    UpdatedBy string `json:"updatedBy"`
}

type ProductResp struct {
    ID        string    `json:"id"`
    Name      string    `json:"name"`
    CreatedAt time.Time `json:"createdAt"`
}
```

### 2. Create DB Entity + Repository (`data-access/repository/product_repository.go`)
```go
type Product struct {
    ID        string    `gorm:"primaryKey;column:id"`
    Name      string    `gorm:"column:name"`
    IsActive  bool      `gorm:"column:is_active"`
    // ... audit fields
}

func (Product) TableName() string { return "m_product" }

type ProductRepository struct { Db *gorm.DB }
// Save, Update, FindByID, FindAll...
```

### 3. Register Repository (`data-access/repository/all_repository.go`)
```go
type AllRepositoryImpl struct {
    configRepo  *ConfigRepository
    productRepo *ProductRepository  // add
}

func (all *AllRepositoryImpl) GetProductRepository() *ProductRepository {
    return all.productRepo
}
```

### 4. Create Use Case (`usecases/product_uc.go`)
```go
type ProductUseCasesImpl struct {
    repo *repository.ProductRepository
}

func NewProductUseCases(allUc *AllUseCasesImpl) *ProductUseCasesImpl {
    return &ProductUseCasesImpl{
        repo: allUc.Repository.GetProductRepository(),
    }
}
// Save, Update, Delete, GetById, Search...
```

### 5. Register Use Case (`usecases/all_uc.go`)
```go
type AllUseCasesImpl struct {
    // ...existing
    ProductUseCases *ProductUseCasesImpl  // add
}

func (a *AllUseCasesImpl) registerUseCases() {
    a.ConfigUseCases = NewConfigUseCases(a)
    a.ProductUseCases = NewProductUseCases(a)  // add
}
```

### 6. Create Controller (`api/rest/product_controller.go`)
```go
func ProductRestController(group *gin.RouterGroup, allUseCases *usecases.AllUseCasesImpl) {
    group.POST("/add", addProduct(allUseCases))
    group.POST("/edit", editProduct(allUseCases))
    group.POST("/delete", deleteProduct(allUseCases))
    group.GET("/getById", getByIdProduct(allUseCases))
}
```

### 7. Register Route (`api/rest/router_controller.go`)
```go
product := srv.Group("/products")
{ ProductRestController(product, allUseCases) }
```

---

## 12. Existing Endpoints

| Group | Method | Path | Description |
|---|---|---|---|
| Health | GET | `/health/check` | Health check (no auth) |
| Config | POST | `/configs/add` | Add config (key-value) |
| Config | POST | `/configs/edit` | Update config |
| Config | POST | `/configs/delete` | Soft-delete config |
| Config | GET | `/configs/getById?key=xxx` | Get config by key |
| RMQ | POST | `/rmq/publish` | Publish message to RabbitMQ (example) |

---

## 13. Dependencies

| Library | Module | Purpose |
|---|---|---|
| helper-go | `bitbucket.org/log-tech/helper-go` v1.1.1 | REST server, DB, Redis, Cache, Logger, gRPC |
| rmq-client | `bitbucket.org/log-tech/rmq-client` v1.0.4 | RabbitMQ consumer/publisher |
| dictionary-go | `bitbucket.org/log-tech/dictionary-go` v1.0.1 | External codes |
| gin | `github.com/gin-gonic/gin` v1.10 | HTTP framework |
| gorm | `gorm.io/gorm` v1.25 | ORM |
| amqp091 | `github.com/rabbitmq/amqp091-go` v1.10 | RabbitMQ protocol |

---

## 14. Build & Deploy

### Development (Hot-Reload)

```bash
./start-dev.sh    # Linux/Mac
start-dev.bat     # Windows
```

### Build

```bash
./build.sh linux    # Build for Linux
./build.sh mac      # Build for Mac
./build.sh windows  # Build for Windows
```

Output: `__build/release/bin/server`

### Docker

```dockerfile
FROM golang:1.23-alpine AS builder
# ... multi-stage build
EXPOSE 8080
CMD ["./start.sh"]
```

### Graceful Shutdown

Service catches `SIGTERM` / `SIGINT` then:
1. Close DB connection
2. Close Redis client
3. Close Cache
4. Stop gRPC server
5. Shutdown goroutines

---

## 15. Pre-Commit Checklist

- [ ] All errors are handled (no unexplained `_, _`)
- [ ] `user-username` header validated on all mutation endpoints
- [ ] Audit fields (`created_by`, `updated_by`) set from header
- [ ] Soft delete (never hard delete)
- [ ] Parameterized queries (no string concatenation)
- [ ] Responses use `hutils.BuildRestResponseSuccess/Failure`
- [ ] HTTP status code is consistent (same in `c.JSON` and response body)
- [ ] Business logic in use case, NOT in controller
- [ ] Return after error response in controller
- [ ] New domain registered in `all_repository.go`, `all_uc.go`, `router_controller.go`

---

## 16. Git Branch & Commit Convention

### Branch Naming

| Type | Prefix | Example |
|---|---|---|
| Feature | `ft-` | `ft-product-crud` |
| Fix | `fix-` | `fix-config-validation` |
| Core branches | No prefix | `main`, `sit`, `develop` |

### Commit Message

**Pattern**: `[Ticket Number (if any)] commit message`

**Examples**:
- `[BP-001] add product CRUD endpoints`
- `fix config validation for empty key`
- `refactor config to JSON env vars`

### Recommendations (NOT automatic)

After completing work, suggest a branch name and commit message — do NOT create branches or commits automatically. Leave that to the developer.
