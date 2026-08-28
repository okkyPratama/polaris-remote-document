# Polaris Document Service

> Service untuk manajemen template dokumen (PDF, Excel) dan label (ZPL) pada platform Polaris WMS. Template berbasis placeholder — data operasional dimasukkan saat render time. Configurable per owner/warehouse/company tanpa perubahan kode.

**Repository:** `bitbucket.org:log-tech/polaris-document-service.git`
**Database:** `polaris_document` (dedicated, tanpa prefix)

---

## Fitur

- **Template CRUD** — Buat, edit, list, dan hapus (soft delete) template dokumen & label
- **Template Assignment** — Assign template per owner, warehouse, atau company dengan resolution chain
- **Versioning** — Auto-increment version saat template content berubah
- **System Default** — Fallback template jika owner tidak punya assignment (protected dari delete)
- **Multi-format Output** — PDF (dokumen), Excel (report), ZPL (thermal label printer)
- **Barcode & QR Code** — Support Code128, Code39, EAN-13, dan QR Code
- **Repeater/Table** — Element tabel berulang dengan kolom dinamis
- **PDF Crop** — Crop PDF dari URL (manual size atau auto-crop)
- **PDF Proxy** — Proxy fetch PDF untuk bypass CORS
- **Placeholder Engine** — `{{field_path}}`, `{{field | modifier}}`, `{{#each}}`, `{{#if}}`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | Go 1.23+ |
| HTTP Framework | Gin (via helper-go/hrest) |
| ORM | GORM |
| Database | MySQL / TiDB |
| PDF Engine | go-pdf/fpdf |
| PDF Manipulation | pdfcpu |
| Barcode | boombuler/barcode |
| UUID | google/uuid v7 |
| Migration | DBmate |

---

## Project Structure

```
polaris-document-service/
├── server.go                        # Entry point, graceful shutdown
├── go.mod / go.sum                  # Module: bitbucket.org/log-tech/polaris-document-service
├── Dockerfile                       # Multi-stage build
├── .air.toml                        # Hot-reload (dev)
│
├── api/rest/
│   ├── router_controller.go        # Central route registration
│   ├── health_controller.go        # GET /health/check
│   ├── template_controller.go      # Template CRUD (save/edit/delete/detailById/getAll)
│   ├── template_assignment_controller.go  # Assignment (assign/getByScope)
│   ├── crop_controller.go          # POST /pdf/cropPdf
│   └── proxy_controller.go         # GET /pdf/proxyPdf
│
├── usecases/
│   ├── all_uc.go                   # AllUseCasesImpl + Init()
│   ├── template_uc.go             # Template CRUD + versioning + system default protection
│   ├── template_assignment_uc.go  # Assignment logic + resolution chain
│   └── crop_uc.go                 # PDF crop (CropToSize, AutoCrop)
│
├── data-access/repository/
│   ├── all_repository.go           # Repository aggregator
│   ├── template_repository.go      # m_template table (GORM)
│   ├── template_assignment_repository.go  # r_template_assignment table
│   └── query_builder.go           # Structured filter + sort builder
│
├── models/
│   ├── template_models.go         # Template Req/Resp DTOs
│   ├── template_assignment_models.go  # Assignment Req/Resp DTOs
│   └── search_models.go           # SearchRequest, FilterCondition
│
├── engine/
│   ├── models.go                   # Engine models (PageSize, Element, etc.)
│   ├── validation.go              # Template validation + snap/clamp
│   ├── merge_engine.go            # Placeholder → data substitution
│   ├── pdf_renderer.go            # fpdf PDF rendering
│   └── barcode_generator.go       # Barcode & QR code generation
│
├── config/
│   └── config.go                   # Singleton config loader (env vars)
│
├── constants/
│   └── constants.go                # Action types, module names
│
├── migrations/                     # DBmate migration files
│   ├── 20260812100001_create_m_template.sql
│   └── 20260813100001_create_r_template_assignment.sql
│
├── document-api/
│   └── bruno-collection/           # Bruno API collection
│
└── __build/                        # Build output + dev config
```

---

## API Endpoints

> Base path: `/document/api/v1/`. Semua endpoint menggunakan **POST only** (kecuali health check dan proxy).
> Header wajib: `user-username: {username}`

### Templates

| Method | Path | Deskripsi |
|--------|------|-----------|
| `POST` | `/api/v1/templates/save` | Create template baru |
| `POST` | `/api/v1/templates/edit` | Update template (version auto-increment jika content berubah) |
| `POST` | `/api/v1/templates/delete` | Soft delete (system default tidak bisa dihapus) |
| `POST` | `/api/v1/templates/detailById` | Get template detail lengkap + templateContent |
| `POST` | `/api/v1/templates/getAll` | List templates (paginated + structured filter) |

### Template Assignments

| Method | Path | Deskripsi |
|--------|------|-----------|
| `POST` | `/api/v1/template-assignments/assign` | Assign template ke scope (owner/warehouse/company) |
| `POST` | `/api/v1/template-assignments/getByScope` | Get assignments berdasarkan scope filter |

### PDF Utilities

| Method | Path | Deskripsi |
|--------|------|-----------|
| `POST` | `/api/v1/pdf/cropPdf` | Crop PDF dari URL |
| `GET` | `/api/v1/pdf/proxyPdf?url=xxx` | Proxy fetch PDF |

### Health

| Method | Path | Deskripsi |
|--------|------|-----------|
| `GET` | `/health/check` | Health check (no auth) |

---

## Database Schema

**Database:** `polaris_document` (dedicated per service, tanpa prefix)

### `m_template` — Template Master (versioned)

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `id` | VARCHAR(36) | PK | UUID v7 (app-generated) |
| `template_code` | VARCHAR(64) | UNIQUE, NOT NULL | Business code: `system_default_grn`, `grn_unilever_v2` |
| `name` | VARCHAR(128) | NOT NULL | Nama template (human-readable) |
| `template_type` | VARCHAR(32) | NOT NULL | `GRN` / `GIN` / `LPN_LABEL` / `PUTAWAY_LABEL` / `SHIPMENT_LABEL` / `INVENTORY_REPORT` |
| `output_format` | VARCHAR(8) | NOT NULL | `PDF` / `EXCEL` / `ZPL` |
| `description` | VARCHAR(256) | NULL | Deskripsi template |
| `template_content` | LONGTEXT | NOT NULL | JSON layout (array of elements dari visual editor) |
| `version` | INT | NOT NULL, DEFAULT 1 | Auto-increment saat content berubah |
| `page_settings_json` | JSON | NULL | `{sizeType, widthMm, heightMm, marginMm, orientation}` |
| `is_system_default` | BOOLEAN | NOT NULL, DEFAULT false | Platform default (protected dari delete) |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Active flag |
| `is_deleted` | BOOLEAN | NOT NULL, DEFAULT false | Soft delete |
| `created_by` | VARCHAR(128) | NOT NULL | |
| `created_at` | TIMESTAMP | NOT NULL | |
| `updated_by` | VARCHAR(128) | NOT NULL | |
| `updated_at` | TIMESTAMP | NOT NULL | |
| `deleted_by` | VARCHAR(128) | NULL | |
| `deleted_at` | TIMESTAMP | NULL | |

**Indexes:** `(template_type, is_active)`, `(template_code)` UNIQUE

### `r_template_assignment` — Template Assignment per Scope

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `id` | VARCHAR(36) | PK | UUID v7 |
| `company_id` | VARCHAR(36) | NULL | ref: md_m_company.id |
| `warehouse_id` | VARCHAR(36) | NULL | ref: md_m_warehouse.id |
| `owner_id` | VARCHAR(36) | NULL | ref: md_m_business_party.id |
| `template_type` | VARCHAR(32) | NOT NULL | Same enum as m_template |
| `template_id` | VARCHAR(36) | NOT NULL | ref: m_template.id |
| `effective_from` | DATE | NOT NULL | Tanggal mulai berlaku |
| `is_deleted` | BOOLEAN | NOT NULL, DEFAULT false | |
| `created_by` | VARCHAR(128) | NOT NULL | |
| `created_at` | TIMESTAMP | NOT NULL | |
| `updated_by` | VARCHAR(128) | NOT NULL | |
| `updated_at` | TIMESTAMP | NOT NULL | |
| `deleted_by` | VARCHAR(128) | NULL | |
| `deleted_at` | TIMESTAMP | NULL | |

**UNIQUE:** `(company_id, warehouse_id, owner_id, template_type, effective_from)`
**Indexes:** `(owner_id, template_type)`, `(warehouse_id, template_type)`, `(company_id, template_type)`, `(template_id)`
**Rule:** Minimal satu dari `company_id`, `warehouse_id`, atau `owner_id` harus terisi.

### Template Resolution Chain

```
Paling spesifik menang (first match wins):
1. Owner + Warehouse  → owner_id = X AND warehouse_id = Y
2. Owner only         → owner_id = X AND warehouse_id IS NULL AND company_id IS NULL
3. Warehouse only     → warehouse_id = Y AND owner_id IS NULL AND company_id IS NULL
4. Company only       → company_id = C AND owner_id IS NULL AND warehouse_id IS NULL
5. System default     → m_template.is_system_default = true AND template_type = Z
```

---

## Template Types

| Type | Output | Kegunaan |
|------|--------|----------|
| `GRN` | PDF | Good Receipt Note |
| `GIN` | PDF | Good Issue Note |
| `LPN_LABEL` | ZPL | Label LPN (barcode thermal) |
| `PUTAWAY_LABEL` | ZPL | Label putaway (lokasi tujuan) |
| `SHIPMENT_LABEL` | ZPL | Label pengiriman (QR + address) |
| `INVENTORY_REPORT` | EXCEL | Laporan inventori |

---

## Element Types (templateContent JSON)

| Type | Deskripsi |
|------|-----------|
| `static_text` | Teks statis (content tetap) |
| `dynamic_text` | Teks dinamis (placeholder dari data) |
| `barcode` | Barcode (code128, code39, ean13) |
| `qrcode` | QR Code |
| `image` | Gambar (URL atau base64) |
| `line` | Garis (horizontal/vertical) |
| `box` | Kotak (stroke/fill) |
| `repeater` | Tabel berulang dengan kolom dinamis |

---

## Quick Start (Development)

### Prerequisites

- Go 1.23+
- MySQL/MariaDB running di localhost
- DBmate installed (`go install github.com/amacneil/dbmate/v2@latest`)

### Setup Database

```bash
# Create database dan jalankan migration
export DATABASE_URL="mysql://root:password@127.0.0.1:3306/polaris_document"
dbmate --migrations-dir "./migrations" --no-dump-schema create
dbmate --migrations-dir "./migrations" --no-dump-schema up
```

### Run

```bash
# Clone
git clone bitbucket.org:log-tech/polaris-document-service.git
cd polaris-document-service

# Install dependencies
go mod tidy

# Edit config (sesuaikan DB credentials)
vim __build/dev/config/system.properties

# Run dengan hot-reload (Air)
./start-dev.sh    # Linux/Mac
start-dev.bat     # Windows
```

### Environment Variables

| Variable | Required | Deskripsi |
|----------|----------|-----------|
| `APP_DB_USER` | ✅ | Database username |
| `APP_DB_PASSWORD` | ✅ | Database password |
| `APP_DB_NAME` | ✅ | Database name (`polaris_document`) |
| `APP_DB` | ✅ | DB connection config (JSON) |
| `APP_GENERAL` | ✅ | General config (JSON) |
| `APP_LOG` | ✅ | Log config (JSON) |
| `APP_LOCAL_CACHE` | ✅ | Local cache config (JSON) |
| `APP_REST_SERVER` | ✅ | REST server config (JSON) — port 8080, contextPath `/document` |
| `APP_REDIS_SERVER` | ❌ | Redis config (optional) |
| `APP_GRPC_SERVER` | ❌ | gRPC server config (optional) |

Semua env var memiliki fallback `APP_DOC_*` (e.g. `APP_DOC_DB_USER`).

---

## Build & Deploy

```bash
# Build binary
./build.sh

# Docker
docker build -t polaris-document-service .

# Output di __build/release/bin/server
```

**Standard ports:** 8080 (REST)

---

## Bruno Collection

Import Bruno collection dari `document-api/bruno-collection/` untuk testing API:

```
File → Open Collection → pilih folder document-api/bruno-collection/
```

Environments: `local` (localhost:8080) dan `dev` (api-dev.polaris.titipaja.id).

---

## Related Documents

- [REQ-071 — Document & Label Template Engine](../polaris-project/projects/02-technical/03-requirement/21-REQ-071-document-label-template-engine/)
- [Backend Technical Standard](../polaris-project/projects/02-technical/02-technical-standardization/backend-technical-standard.md)
- [Database Naming Convention](../polaris-project/projects/02-technical/02-technical-standardization/database-naming-convertion.md)
