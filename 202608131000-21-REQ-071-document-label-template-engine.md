# Requirement Document — Document & Label Template Engine

## Metadata

| Field | Value |
|-------|-------|
| Document ID | REQ-071 |
| Title | Document & Label Template Engine (Custom + ZPL) |
| Version | 1.0 |
| Date | 2026-08-13 |
| Author | Sri Dwipa Anjasmara |
| Status | Draft |
| Related FR | FR-071 v1.3 |

> 📄 **Custom document engine** untuk pembuatan dokumen (PDF, Excel) dan label (ZPL). Template berbasis placeholder — data operasional dimasukkan ke template saat render time. Configurable per owner tanpa perubahan kode.

> 🔗 **DEPENDENSI:** polaris-document-service (service baru). Database: `polaris_document` (dedicated — tanpa prefix). Data binding dari inventory-service, inbound-service, outbound-service.

---

## 1. Service & Module Mapping

### Backend Service(s)

| # | Service | Responsibility |
|---|---------|---------------|
| 1 | polaris-document-service | Template registry, render engine (PDF/Excel/ZPL), preview, versioning |
| 2 | polaris-master-data-service | Template assignment resolution (company/warehouse/owner lookup) |
| 3 | polaris-inbound-service | Trigger GRN generation saat receipt complete |
| 4 | polaris-outbound-service | Trigger GIN/shipment label saat issue complete |
| 5 | polaris-inventory-service | Supply data context (balance, LPN, lot) untuk report/label |

### Frontend Module(s)

| # | Module (dalam polaris-wms-fe) | Responsibility |
|---|-------------------------------|---------------|
| 1 | remote-document | Template editor (WYSIWYG), preview, assignment UI |
| 2 | remotes/operations | Trigger print label (LPN, putaway, shipment) dari workflow screens |

---

## 2. Requirement Goals

### Key Behaviors

- [ ] Custom document engine — tidak menggunakan Carbone CE atau LibreOffice headless
- [ ] Template berbasis **placeholder** (`{{field_path}}`) — data operasional dimasukkan saat render
- [ ] Output format: **PDF** (dokumen), **Excel** (report), **ZPL** (thermal label printer)
- [ ] Configurable **per owner, per warehouse, dan/atau per company** — setiap level bisa punya varian template sendiri
- [ ] **Resolution chain:** Owner+Warehouse → Owner → Warehouse → Company → System Default (paling spesifik menang)
- [ ] **Template types Phase 1:** GRN, GIN, LPN Label, Putaway Label, Shipment Label, Inventory Report
- [ ] **Versioning** — versi lama dipertahankan; regenerasi historis menggunakan template versi pada saat dokumen asli di-generate
- [ ] **System default** fallback — jika owner tidak punya template assignment, pakai system default
- [ ] **Visual editor (WYSIWYG)** — drag-and-drop canvas untuk design label/dokumen
- [ ] **Preview mode** — admin bisa render template dengan sample data sebelum publish
- [ ] **Barcode/QR rendering** — support Code128, EAN-13, Code39, QR Code
- [ ] **Loop & conditional** — `{{#each items}}...{{/each}}`, `{{#if condition}}...{{/if}}`
- [ ] Template disimpan sebagai **JSON layout** — engine convert ke ZPL/HTML/XLSX saat render

### Placeholder Syntax

```
{{field_path}}                    — simple field substitution
{{field_path | format_modifier}}  — field with format modifier
{{#each items}}...{{/each}}       — loop over array
{{#if condition}}...{{/if}}       — conditional block
```

**Format modifiers:** `date:DD-MM-YYYY`, `number:2`, `upper`, `qr`, `barcode128`

---

## 3. Acceptance Criteria

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| AC-71.1 | GRN PDF generation | Receipt completed untuk Owner A | GRN requested | PDF ter-render dengan template Owner A, data receipt populated |
| AC-71.2 | ZPL label generation | LPN created saat receipt | LPN label print triggered | ZPL output generated, sent ke thermal printer |
| AC-71.3 | Per-owner template | Owner A = template-v1, Owner B = template-v2 | GRN generated | Masing-masing owner pakai template yang di-assign |
| AC-71.4 | System default fallback | Owner C tidak punya assignment | GRN generated | Sistem pakai template `is_system_default = true` |
| AC-71.5 | Template upload | Admin upload template baru, assign ke Owner C | Owner C generate document | Document pakai template baru — tanpa deploy |
| AC-71.6 | Template versioning | Admin upload versi baru template Owner A | Historical GRN di-regenerate | Gunakan template versi yang aktif saat dokumen asli dibuat |
| AC-71.7 | Preview mode | Admin edit template | Klik Preview dengan sample data | Rendered output tampil di panel kanan (PDF viewer / ZPL image) |
| AC-71.8 | Excel output | Inventory Report template configured | User request Excel | Report ter-render sebagai file XLSX |
| AC-71.9 | Barcode rendering | Template punya `{{lpn.lpn_number | barcode128}}` | Label di-render | Code128 barcode ter-generate di output |
| AC-71.10 | Missing placeholder | Template punya `{{field_xyz}}` tapi data tidak ada | Render triggered | Output tampilkan `{{field_xyz}}` dengan highlight merah (preview) atau kosong (production) |
| AC-71.11 | Loop rendering | GRN template punya `{{#each receipt.lines}}` | Receipt 5 line items | 5 baris ter-render di dokumen |
| AC-71.12 | Visual editor save | Admin design label via WYSIWYG canvas | Simpan | Template tersimpan sebagai JSON layout di `doc_m_template.template_content` |

---

## 4. Design — ERD / Table

> Database: `polaris_document` (dedicated per service), tanpa prefix (database dedicated). Owned by polaris-document-service.

```
┌────────────────────────────────┐       ┌─────────────────────────────┐
│ m_template                     │       │ r_template_assignment       │
├────────────────────────────────┤       ├─────────────────────────────┤
│ id (PK, UUID)                  │◄──────│ template_id (FK)            │
│ template_code (UNIQUE)         │       │ id (PK, UUID)               │
│ template_type                  │       │ company_id (FK, NULL)       │
│ output_format                  │       │ warehouse_id (FK, NULL)     │
│ description                    │       │ owner_id (FK, NULL)         │
│ template_content (LONGTEXT)    │       │ template_type               │
│ version                        │       │ effective_from              │
│ is_system_default              │       └─────────────────────────────┘
│ is_active                      │
└────────────────────────────────┘
```

### Table Detail

**`m_template`** — template master (versioned)

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `id` | VARCHAR(36) | PK, NOT NULL | UUID v7 |
| `template_code` | VARCHAR(64) | UNIQUE, NOT NULL | Business code: `system_default_grn`, `grn_unilever_v2` |
| `name` | VARCHAR(128) | NOT NULL | Nama template (human-readable): "GRN Default", "LPN Label Coldspace" |
| `template_type` | VARCHAR(32) | NOT NULL | `GRN` / `GIN` / `LPN_LABEL` / `PUTAWAY_LABEL` / `SHIPMENT_LABEL` / `INVENTORY_REPORT` |
| `output_format` | VARCHAR(8) | NOT NULL | `PDF` / `EXCEL` / `ZPL` |
| `description` | VARCHAR(256) | NULL | Deskripsi template |
| `template_content` | LONGTEXT | NOT NULL | Template source: JSON layout (dari visual editor) / HTML (PDF) / ZPL raw (label) |
| `page_settings_json` | JSON | NULL | Page/canvas properties (hanya untuk PDF & ZPL — NULL untuk Excel). Struktur: `{ "sizeType", "widthMm", "heightMm", "marginMm", "orientation" }` |
| `version` | INT | NOT NULL, DEFAULT 1 | Versi template — increment setiap upload baru |
| `is_system_default` | BOOLEAN | NOT NULL, DEFAULT false | true = platform default (tidak bisa dihapus admin) |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Active flag |
| `is_deleted` | BOOLEAN | NOT NULL, DEFAULT false | Soft delete |
| `created_by` | VARCHAR(128) | NOT NULL | |
| `created_at` | TIMESTAMP | NOT NULL | |
| `updated_by` | VARCHAR(128) | NOT NULL | |
| `updated_at` | TIMESTAMP | NOT NULL | |
| `deleted_by` | VARCHAR(128) | NULL | |
| `deleted_at` | TIMESTAMP | NULL | |

> **Index:** `(template_type, is_active)`, `(template_code)`

### `page_settings_json` Structure

```json
{
  "sizeType": "A4",
  "widthMm": 210,
  "heightMm": 297,
  "marginMm": 10,
  "orientation": "PORTRAIT"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sizeType` | string | Preset: `A4` / `A5` / `LETTER` / `LABEL_100x60` / `LABEL_100x40` / `LABEL_100x150` / `CUSTOM` |
| `widthMm` | number | Lebar canvas (mm) — auto-set dari preset, manual jika CUSTOM |
| `heightMm` | number | Tinggi canvas (mm) — auto-set dari preset, manual jika CUSTOM |
| `marginMm` | number | Margin seragam semua sisi (mm). Default: 10 untuk PDF, 3 untuk ZPL |
| `orientation` | string | `PORTRAIT` / `LANDSCAPE` — swap width↔height saat render |

**Applicability per format:**
- **PDF** → wajib terisi (page size menentukan output)
- **ZPL** → wajib terisi (label size fisik)
- **Excel** → `page_settings_json = NULL` (tidak relevan)

**`r_template_assignment`** — template assignment (per owner / warehouse / company)

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `id` | VARCHAR(36) | PK, NOT NULL | UUID v7 |
| `company_id` | VARCHAR(36) | NULL | UUID ref: md_m_company.id — NULL jika bukan assignment per company |
| `warehouse_id` | VARCHAR(36) | NULL | UUID ref: md_m_warehouse.id — NULL jika bukan assignment per warehouse |
| `owner_id` | VARCHAR(36) | NULL | UUID ref: md_m_business_party.id — NULL jika bukan assignment per owner |
| `template_type` | VARCHAR(32) | NOT NULL | Same enum as m_template |
| `template_id` | VARCHAR(36) | NOT NULL | UUID ref: m_template.id |
| `effective_from` | DATE | NOT NULL, DEFAULT CURRENT_DATE | Tanggal mulai berlaku |
| `is_deleted` | BOOLEAN | NOT NULL, DEFAULT false | |
| `created_by` | VARCHAR(128) | NOT NULL | |
| `created_at` | TIMESTAMP | NOT NULL | |
| `updated_by` | VARCHAR(128) | NOT NULL | |
| `updated_at` | TIMESTAMP | NOT NULL | |
| `deleted_by` | VARCHAR(128) | NULL | |
| `deleted_at` | TIMESTAMP | NULL | |

> **UNIQUE:** `(company_id, warehouse_id, owner_id, template_type, effective_from)` — satu assignment per scope combination+type per tanggal
> **Index:** `(owner_id, template_type)`, `(warehouse_id, template_type)`, `(company_id, template_type)`
> **Rule:** Minimal satu dari `company_id`, `warehouse_id`, atau `owner_id` harus terisi. Kombinasi composite diizinkan (e.g. owner + warehouse).

### Template Resolution Logic

```
Resolution chain (paling spesifik menang):
1. Owner + Warehouse: WHERE owner_id = X AND warehouse_id = Y AND template_type = Z
2. Owner only:        WHERE owner_id = X AND warehouse_id IS NULL AND company_id IS NULL AND template_type = Z
3. Warehouse only:    WHERE warehouse_id = Y AND owner_id IS NULL AND company_id IS NULL AND template_type = Z
4. Company only:      WHERE company_id = C AND owner_id IS NULL AND warehouse_id IS NULL AND template_type = Z
5. System default:    WHERE is_system_default = true AND template_type = Z

First match wins (stop evaluasi).
Setiap level: ORDER BY effective_from DESC LIMIT 1
```

### Historical Regeneration Logic

```
Untuk regenerate dokumen yang dibuat pada tanggal T:
1. Query r_template_assignment dengan resolution chain (owner+warehouse → owner → warehouse → company)
   WHERE effective_from <= T, ORDER BY effective_from DESC LIMIT 1
2. Resolve ke template version yang berlaku pada tanggal T
```

---

## 5. API Contract

> Base path: `/document/api/v1/`. Service: polaris-document-service. Semua endpoint POST only.

### 5.1 Document Render (Production)

```
POST /document/api/v1/documents/render
```

**Request Body:**
```json
{
  "templateType": "GRN",
  "ownerId": "018f...",
  "outputFormat": "PDF",
  "data": {
    "receipt": {
      "receipt_number": "RCV-20260813-000001",
      "date": "2026-08-13",
      "lines": [...]
    }
  }
}
```

**Response:** Binary file (PDF/XLSX) atau text (ZPL string)

### 5.2 Label Render (ZPL)

```
POST /document/api/v1/labels/render
```

**Request Body:**
```json
{
  "templateType": "LPN_LABEL",
  "ownerId": "018f...",
  "data": {
    "lpn": {
      "lpn_number": "LPN20260813000042",
      "sku_code": "SKU-001",
      "qty": 50.0000
    }
  }
}
```

**Response:** ZPL string (text/plain)

### 5.3 Preview (Sandbox — tidak persist)

```
POST /document/api/v1/documents/preview
```

**Request Body:**
```json
{
  "templateId": "018f...",
  "templateContent": "...(raw JSON layout, untuk unsaved template)...",
  "templateType": "GRN",
  "outputFormat": "PDF",
  "sampleData": { ... }
}
```

**Response:** Binary (rendered preview) — tidak disimpan

### 5.4 Template CRUD

```
POST /document/api/v1/templates/getAll
POST /document/api/v1/templates/save
POST /document/api/v1/templates/edit
POST /document/api/v1/templates/detailById
POST /document/api/v1/templates/delete
```

**Required permission:** `template:view` / `template:create` / `template:edit` / `template:delete`

### 5.5 Template Assignment

```
POST /document/api/v1/template-assignments/assign
POST /document/api/v1/template-assignments/getByScope
```

**Assign request:**
```json
{
  "companyId": null,
  "warehouseId": null,
  "ownerId": "018f...",
  "templateType": "GRN",
  "templateId": "018f...",
  "effectiveFrom": "2026-08-13"
}
```

---

## 6. UI Contract

### 6.1 Template List (remote-document — `templates.html`)

| Elemen | Behavior |
|--------|----------|
| Location | Menu "Template Dokumen" di sidebar (section Konfigurasi) |
| Page title | "Template Dokumen & Label" + subtitle "Kelola template untuk GRN, GIN, label, dan laporan — tetapkan per owner" |
| Type filter tabs | Semua, GRN, GIN, Label LPN, Label Putaway, Label Pengiriman, Laporan Inventori (tab active = filter) |
| Search | Input "Cari nama atau kode template..." |
| Table columns | Template (name + code), Tipe (badge warna per type), Format (badge), Versi (badge mono), Ditugaskan Ke (badge owner), Status (dot aktif/nonaktif) |
| Create | Button "Unggah Template" → modal upload form |
| Detail panel | Klik row → 40% panel: code, name, badges, info (tipe, format, versi, default, created, modified), owner assignment list, template source preview (code block gelap), version history, actions (Duplikat, Nonaktifkan) |
| Layout | Master-detail: table full-width saat panel tertutup, split saat detail terbuka |

### 6.2 Upload Template (Modal)

| Elemen | Behavior |
|--------|----------|
| Trigger | Button "Unggah Template" di page header |
| Fields | Nama Template*, Tipe Template* (dropdown), Format Keluaran* (PDF/ZPL/Excel), Deskripsi, Sumber Template* (code editor textarea), Tugaskan ke Owner (dropdown, default = "Default Sistem") |
| Code editor | Textarea dengan hint placeholder yang tersedia (`{{receipt.*}}`, `{{owner.*}}`, `{{warehouse.*}}`, `{{line.*}}`, `{{lpn.*}}`) + link "Lihat katalog lengkap" |
| Actions | Batal, Preview, Simpan Template |

### 6.3 Detail Panel — Owner Assignment

| Elemen | Behavior |
|--------|----------|
| Section | "Penugasan Owner" di detail panel |
| List | Nama owner + "Sejak: tanggal" |
| Note | Italic text: "Template ini dipakai untuk semua owner yang belum memiliki template [type] khusus" (untuk system default) |
| Action | Button "+ Tugaskan ke Owner" |

### 6.4 Detail Panel — Template Source Preview

| Elemen | Behavior |
|--------|----------|
| Section | "Sumber Template (Preview)" |
| Display | Dark-themed code block (monospace) — truncated, scrollable |
| Actions | "Edit Sumber" button, "Preview dengan Data Contoh" button |

### 6.5 Detail Panel — Version History

| Elemen | Behavior |
|--------|----------|
| Section | "Riwayat Versi" |
| List | Badge versi (v1, v2, v3) + tanggal + catatan perubahan |

### 6.6 Preview Mode (Modal — Split View)

| Elemen | Behavior |
|--------|----------|
| Trigger | "Preview dengan Data Contoh" button dari detail panel, atau "Preview" button di upload modal |
| Layout | Full-screen overlay, split: Data JSON (kiri, editable textarea) + Rendered Output (kanan, PDF viewer / ZPL image) |
| Live render | Debounced 500ms setelah JSON edit → re-render otomatis |
| Page nav | "Halaman: X dari N" untuk multi-page PDF |
| Actions | Unduh, Cetak, Close (×) |

### 6.7 Visual Editor (WYSIWYG — Phase 1.5/optional)

| Elemen | Behavior |
|--------|----------|
| Layout | 3-panel: Element Palette (kiri) + Canvas (tengah) + Properties (kanan) |
| Canvas | Drag-drop, grid snap, actual physical size (mm) |
| Elements | Static Text, Dynamic Text, Barcode, QR Code, Image, Line, Box |
| Properties | Position, size, font, alignment, placeholder binding, barcode type |
| Save | JSON layout ke `m_template.template_content` |

---

## 7. Task List

### Backend Tasks (polaris-document-service)

- [ ] Migration: `m_template`, `r_template_assignment` (database `polaris_document`)
- [ ] Repository layer: template CRUD, template assignment CRUD
- [ ] Render engine: JSON layout → PDF (via HTML/wkhtmltopdf)
- [ ] Render engine: JSON layout → ZPL (thermal label format)
- [ ] Render engine: JSON layout → Excel (XLSX XML)
- [ ] Placeholder resolver: parse `{{field_path}}`, `{{field | modifier}}`, `{{#each}}`, `{{#if}}`
- [ ] Barcode generator: Code128, EAN-13, Code39
- [ ] QR Code generator
- [ ] Template resolution logic: owner assignment → system default fallback
- [ ] Historical regeneration: resolve template version by date
- [ ] Preview endpoint: render tanpa persist
- [ ] Sample data provider: default sample per template type
- [ ] Versioning: new upload = new version, retain old
- [ ] System default protection: is_system_default = true tidak bisa dihapus
- [ ] Unit test: placeholder parsing, resolution chain, render output validation
- [ ] Integration test: end-to-end render GRN + LPN label

### Frontend Tasks (remote-document)

- [ ] Template list page (CRUD)
- [ ] Visual editor: canvas, element palette, properties panel
- [ ] Visual editor: drag-drop, resize, grid snap
- [ ] Visual editor: element types (static text, dynamic text, barcode, QR, image, line, box)
- [ ] Preview mode: split view, live render, JSON editor
- [ ] Template assignment page (owner/warehouse/company scope)
- [ ] Template type filter
- [ ] API service: `templates.api.ts`, `templateAssignments.api.ts`
- [ ] React Query hooks
- [ ] Unit test

### DevOps / Other

- [ ] Database provisioning: `polaris_document` (dedicated DB — tanpa prefix)
- [ ] Seed system default templates (6 types: GRN, GIN, LPN Label, Putaway Label, Shipment Label, Inventory Report)
- [ ] ZPL printer integration testing (Zebra compatible)
- [ ] Performance test: concurrent render requests
- [ ] Deploy ke dev environment
- [ ] QA testing (semua AC-71.x)

---

## Notes / Open Questions

- [ ] PDF render engine: wkhtmltopdf, Chromium headless, atau Go-native (gofpdf)?
- [ ] ZPL testing: apakah perlu emulator/simulator untuk dev yang tidak punya thermal printer?
- [ ] Template file size limit? (LONGTEXT bisa sangat besar jika ada embedded image)
- [ ] Multi-page document (GRN panjang): page break strategy?
- [ ] Concurrent render: apakah perlu queue (RabbitMQ) untuk render berat, atau synchronous cukup?
- [ ] Label batch print: 10 LPN sekaligus — satu request atau 10 request?

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-08-13 | Sri Dwipa Anjasmara | Initial requirement document dari FR-071 v1.3 |
