# WIP Context — FR-071 Document & Label Template Engine

> Copy-paste seluruh file ini ke session baru agar context tidak hilang.

---

## 1. Workspace & Struktur

- **Root workspace:** `c:\Users\OkkyPratama\repo\fe-microfrontend-integration`
- **Backend:** `polaris-document-service/` — Go microservice (Gin + GORM), port 8080, context path `/document`
- **Frontend:** `polaris-wms-fe/apps/remote-document/` — React + Vite + Module Federation, port 5010
- **UI Library:** `polaris-wms-fe/packages/polaris-ui/` — shared components (termasuk `SingleSelect`)
- **Service Library:** `polaris-wms-fe/packages/service/` — shared fetcher (axios wrapper, base URL `/api/v1`)
- **Database:** MySQL lokal, DB name `polaris_document_revamp`
- **Requirement Doc:** `202608131000-21-REQ-071-document-label-template-engine.md`

---

## 2. Cara Menjalankan

```powershell
# Backend (Go)
cd polaris-document-service
powershell -File start-dev.ps1
# → listening on port 8080, routes registered under /document/api/v1/...

# Frontend (Vite)
cd polaris-wms-fe/apps/remote-document
pnpm dev
# → listening on port 5010, proxy configured to backend
```

---

## 3. Yang Sudah Selesai (Session Ini)

### Task: Ganti hardcoded dropdown → dynamic searchable dropdown + insert assignment ke DB

**Status: SELESAI & TESTED**

#### Files yang dibuat/diubah:

| File | Status | Deskripsi |
|------|--------|-----------|
| `polaris-wms-fe/apps/remote-document/src/api/master-data.api.ts` | BARU | API service memanggil master-data-service: `getCompanyOptions()`, `getWarehouseOptions()`, `getOwnerOptions()` |
| `polaris-wms-fe/apps/remote-document/src/hooks/useMasterData.ts` | BARU | React Query hooks (`useCompanyOptions`, `useWarehouseOptions`, `useOwnerOptions`) + loader functions untuk `SingleSelect` |
| `polaris-wms-fe/apps/remote-document/src/components/editor/UploadTemplateModal.tsx` | MODIFIED | Hapus `OWNER_OPTIONS`, `WAREHOUSE_OPTIONS`, `COMPANY_OPTIONS` hardcoded. Ganti 3 `<select>` → `SingleSelect` dari `@polaris/ui`. Tambah logic `templateAssignmentApi.assign()` setelah save berhasil |
| `polaris-wms-fe/apps/remote-document/src/api/template.api.ts` | MODIFIED | `templateApi.save()` sekarang return `Template` object (termasuk ID) — bukan string |
| `polaris-wms-fe/apps/remote-document/vite.config.ts` | MODIFIED | Tambah proxy: `/api/v1/master-data` → `http://10.193.1.228:30081` |
| `polaris-document-service/api/rest/template_controller.go` | MODIFIED | `saveTemplate` handler sekarang return `ResponseContent{Data: []interface{}{result}}` agar frontend dapat ID |

#### Test Results:

- ✅ Template save via proxy localhost:5010 → backend return template dengan ID
- ✅ Template assignment (owner + warehouse) → insert DB berhasil
- ✅ Template assignment (owner + company) → insert DB berhasil
- ✅ `getByScope` query → data terkonfirmasi persisted di DB
- ⚠️ Master data proxy → butuh session token valid (expired saat test terminal, akan work di browser setelah login)

---

## 4. Arsitektur & Pattern yang Penting

### Backend (Go)

- **Layered:** Controller (`api/rest/`) → UseCase (`usecases/`) → Repository (`data-access/repository/`)
- **Response format:** `hutils.BuildRestResponseSuccess(&hmodels.ResponseContent{Data: []interface{}{...}})`
- **Error format:** `hutils.BuildRestResponseFailure(httpCode, externalCode, desc, []string{...})`
- **DB entity** hidup di package `repository`, bukan di `models`
- **models/** hanya untuk Request/Response DTO

### Frontend (React)

- **Fetcher:** `import { fetcher } from '@polaris/service'` — base URL `/api/v1`, return type `ApiResponse<T> = { httpCode, externalCode, externalDesc, data: T | null }`
- **SingleSelect component:** `import { SingleSelect } from '@polaris/ui'` — props: `loadOptions: (query: string) => Promise<SingleSelectOption[]>`, `value`, `onChange`, `placeholder`, `emptyMessage`, `debounce`
- **SingleSelectOption:** `{ value: string; label: string; description?: string }`
- **Vite proxy** di `vite.config.ts` rewrite paths:
  - `/api/v1/templates/*` → `localhost:8080/document/api/v1/templates/*`
  - `/api/v1/template-assignments/*` → `localhost:8080/document/api/v1/template-assignments/*`
  - `/api/v1/master-data/*` → `http://10.193.1.228:30081/api/v1/master-data/*`

### Master Data API Endpoints (external service di `10.193.1.228:30081`)

```
POST /api/v1/master-data/companies/options        body: {}
POST /api/v1/master-data/warehouses/options       body: {}
POST /api/v1/master-data/business-parties/options body: {"partyRole": "OWNER"}
```

Headers wajib: `user-username`, `appname: polaris`, `appversion: 1.0.0`, `X-session-token: <token>`

Response format: `{ httpCode: 200, data: { data: [{ id, code, name }] } }`

---

## 5. Database Schema (relevan)

### `m_template`

| Column | Type | Key |
|--------|------|-----|
| id | VARCHAR(36) | PK, UUID v7 |
| template_code | VARCHAR(64) | UNIQUE |
| name | VARCHAR(128) | |
| template_type | VARCHAR(32) | GRN/GIN/LPN_LABEL/PUTAWAY_LABEL/SHIPMENT_LABEL/INVENTORY_REPORT |
| output_format | VARCHAR(8) | PDF/ZPL/EXCEL |
| template_content | LONGTEXT | JSON elements array |
| page_settings_json | JSON | {sizeType, widthMm, heightMm, marginMm, orientation} |
| version | INT | auto-increment per template |
| is_system_default | BOOLEAN | |
| is_active | BOOLEAN | |

### `r_template_assignment`

| Column | Type | Key |
|--------|------|-----|
| id | VARCHAR(36) | PK, UUID v7 |
| company_id | VARCHAR(36) | NULL OK |
| warehouse_id | VARCHAR(36) | NULL OK |
| owner_id | VARCHAR(36) | NULL OK |
| template_type | VARCHAR(32) | |
| template_id | VARCHAR(36) | FK → m_template.id |
| effective_from | DATE | |

**Rule:** Minimal satu dari company_id/warehouse_id/owner_id harus terisi.

**Resolution chain (paling spesifik menang):**
1. Owner + Warehouse
2. Owner only
3. Warehouse only
4. Company only
5. System default (`is_system_default = true`)

---

## 6. Potensi Task Lanjutan

- [ ] Handle clear/reset pada SingleSelect (menghapus pilihan kembali ke "Default Sistem")
- [ ] Wire up "Tugaskan ke Owner" button di `TemplateDetailPanel.tsx` (saat ini belum punya onClick)
- [ ] Handle token refresh / re-auth untuk master-data API yang 401
- [ ] Full browser test (login → buka modal → pilih owner/warehouse/company → save → verifikasi DB)
- [ ] Tambah assignment CRUD di halaman detail template (edit/delete assignment)
- [ ] Visual editor (WYSIWYG) — canvas drag-drop untuk design template

---

## 7. Key File Paths (untuk di-reference)

```
# Backend
polaris-document-service/api/rest/template_controller.go
polaris-document-service/api/rest/template_assignment_controller.go
polaris-document-service/api/rest/router_controller.go
polaris-document-service/usecases/template_uc.go
polaris-document-service/usecases/template_assignment_uc.go
polaris-document-service/data-access/repository/template_repository.go
polaris-document-service/data-access/repository/template_assignment_repository.go
polaris-document-service/models/template_models.go
polaris-document-service/start-dev.ps1

# Frontend
polaris-wms-fe/apps/remote-document/src/api/template.api.ts
polaris-wms-fe/apps/remote-document/src/api/master-data.api.ts
polaris-wms-fe/apps/remote-document/src/hooks/useTemplates.ts
polaris-wms-fe/apps/remote-document/src/hooks/useMasterData.ts
polaris-wms-fe/apps/remote-document/src/components/editor/UploadTemplateModal.tsx
polaris-wms-fe/apps/remote-document/src/types/template.types.ts
polaris-wms-fe/apps/remote-document/src/views/templates/index.tsx
polaris-wms-fe/apps/remote-document/vite.config.ts
polaris-wms-fe/packages/polaris-ui/src/components/atoms/single-select/single-select.tsx
polaris-wms-fe/packages/service/src/fetcher.ts
polaris-wms-fe/packages/service/src/config.ts

# Docs
202608131000-21-REQ-071-document-label-template-engine.md
FR-071-document-label-template-engine.md
polaris-document-service/AGENTS.md
```
