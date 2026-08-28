# FR-071: Document & Label Template Engine (Custom + ZPL)
| Kolom | Nilai |
|---|---|
| **Document Version** | 1.3 |
| **Status** | APPROVED |
| **Date** | 2026-07-29 |
| **Module** | Platform |
| **Sub-module** | Reporting & Documents |
| **Decomposition #** | 71 |
| **RICE Score** | 43.2 (Critical) |
| **Phase** | Phase 1 |
| **Pointer** | polaris-product-decomposition.md #71 |

---

## Definisi

Document & Label Template Engine menyediakan sistem pembuatan dokumen dan label yang dikembangkan secara custom oleh tim internal (bukan Carbone CE — keputusan 2026-07-29, lihat §Riwayat Versi). Engine menerima template berbasis placeholder dan data operasional, lalu menghasilkan output PDF, Excel, atau ZPL sesuai tipe dokumen.

Template bersifat configuration-driven: setiap owner dapat memiliki varian dokumen dan label mereka sendiri tanpa perubahan kode. Owner A memiliki format GRN bermerek, Owner B memiliki field berbeda pada LPN label, operator warehouse memiliki label pengiriman standar — semuanya dikelola via konfigurasi admin. Tipe template Phase 1: GRN, GIN, LPN Label, Putaway Label, Shipment Label, Inventory Report.

> **Keputusan Engine (2026-07-29):** Tim memutuskan untuk mengembangkan document engine secara custom, bukan menggunakan Carbone CE. Alasan: kontrol penuh atas rendering pipeline, tidak ada dependency pada LibreOffice headless container, lebih mudah diintegrasikan ke dalam stack Golang/Node yang sudah ada. Assignee: Agus Stiyo.

---

## Perilaku Utama

- Custom document engine untuk pembuatan dokumen (PDF, Excel) dan label (ZPL)
- Template berbasis placeholder — data operasional dimasukkan ke template saat render time
- Dapat dikonfigurasi per owner — setiap owner dapat memiliki varian template sendiri
- Template ZPL untuk label (LPN label, putaway label, shipment label), dapat dikonfigurasi per owner/SKU
- Tipe template Phase 1: GRN, GIN, LPN Label, Putaway Label, Shipment Label, Inventory Report
- Penetapan template bersifat konfigurasi — admin memilih template mana yang digunakan owner
- Versioning template — versi sebelumnya dipertahankan untuk regenerasi dokumen historis
- Data binding: placeholder template dipetakan ke field data operasional secara otomatis

---

## Kriteria Penerimaan

| # | Scenario | Given | When | Then |
|---|---|---|---|---|
| AC-71.1 | GRN document generation | Receipt is completed for Owner A | GRN document is requested | System renders GRN using Owner A's configured template with receipt data populated |
| AC-71.2 | PDF output | GRN template configured for Owner A | Document is generated | Output is a valid PDF with all data fields correctly populated |
| AC-71.3 | ZPL label generation | LPN is created during receipt | LPN label print is triggered | ZPL output generated using configured label template; sent to thermal printer |
| AC-71.4 | Per-owner template assignment | Owner A has template-v1, Owner B has template-v2 for GRN | GRN generated for each owner | Each owner's GRN uses their assigned template variant |
| AC-71.5 | Admin template upload | Admin designs new shipment label | Admin uploads template and assigns to Owner C | Owner C's shipment labels now use the new template |
| AC-71.6 | No code change for new variant | New owner onboarded with unique GRN format requirements | Admin uploads custom template and assigns | Owner's documents render with custom format without deployment |
| AC-71.7 | Template versioning | Admin uploads new version of Owner A's GRN template | Historical GRN is regenerated | Historical document uses the template version active at original generation time |
| AC-71.8 | Multiple output formats | Inventory Report template configured | User requests report in Excel format | Report rendered as Excel file with correct data and formatting |

---

## Technical Notes (Updated 2026-07-29)

- **Engine:** Custom-built — tidak menggunakan Carbone CE atau LibreOffice headless
- **Assignee:** Agus Stiyo
- **Service:** `polaris-document-svc`
- **API:** `POST /api/v1/documents/render` → PDF/Excel binary; `POST /api/v1/labels/render` → ZPL string
- **Template registry:** versioned templates stored per owner
- **Exit criteria:** `/api/v1/documents/render` returns valid PDF for GRN template; `/api/v1/labels/render` returns ZPL for LPN label

---

## Template Preview Mode

Admin harus bisa melihat hasil render template **sebelum** di-publish ke produksi. Preview mode menyediakan environment sandbox untuk testing template dengan data sample.

### Layout: Split View

```
┌──────────────────────────────────────────────────────────────────┐
│  Preview Template                          [Download] [Print] [×] │
├───────────────────────┬──────────────────────────────────────────┤
│  Data JSON  455/10000 │  ┌─────────────────────────────────────┐ │
│                       │  │  PT. TOKO JAYA MAKMUR               │ │
│  {                    │  │  ─────────────────────               │ │
│   "owner_name":       │  │  Pengirim:                          │ │
│     "Toko Jaya...",   │  │    Toko Jaya Makmur                 │ │
│   "receipt_number":   │  │    Jl. Mangga Dua Raya No. 45       │ │
│     "RCV-20260801..", │  │                                     │ │
│   "lines": [          │  │  Penerima:                          │ │
│    {"sku_code":..}    │  │    Budi Santoso                     │ │
│   ]                   │  │    Jl. Sudirman No. 123             │ │
│  }                    │  │                                     │ │
│                       │  │  |||||||||||||||||||||||             │ │
│                       │  │  JNE0123456789012                   │ │
│                       │  │                                     │ │
│                       │  │  Isi: Sepatu Sneakers (1 pasang)    │ │
│                       │  │  Berat: 1.2 kg  Layanan: REG        │ │
│                       │  └─────────────────────────────────────┘ │
│                       │           [─] [+] [⊡]  1 of 1   [🔍]    │
└───────────────────────┴──────────────────────────────────────────┘
```

### Perilaku Preview

| Aspek | Behavior |
|---|---|
| **Data JSON (kiri)** | Editable text area — admin bisa ubah sample data dan lihat hasilnya di kanan. System menyediakan default sample data per template type. Max 10.000 characters. |
| **Rendered Output (kanan)** | Live-rendered document. Untuk PDF: embedded PDF viewer. Untuk ZPL: simulated label preview (rendered to image). Untuk Excel: table preview. |
| **Live render** | Setiap perubahan pada JSON (debounced 500ms) men-trigger re-render di panel kanan. Tidak perlu klik "Refresh". |
| **Barcode/QR rendering** | Placeholder `{{field \| barcode128}}` dan `{{field \| qr}}` di-render sebagai actual barcode/QR image di preview. Engine harus support Code128 dan QR Code generation. |
| **Multi-page** | Untuk dokumen panjang (PDF), page navigation: `1 of N` dengan tombol prev/next. |
| **Actions** | Download: save rendered output sebagai file (PDF/ZPL/XLSX). Print: send to browser print dialog. Close: kembali ke template editor. |
| **Error handling** | Jika JSON malformed → tampilkan error indicator di panel kiri. Jika placeholder tidak ditemukan di JSON → render sebagai `{{missing_field}}` dengan highlight merah. |

### API Endpoint (Preview)

```
POST /api/v1/documents/preview
```

**Request:**
```json
{
  "template_id": "string (or null for unsaved template)",
  "template_content": "string (raw source — for unsaved/edited template)",
  "template_type": "GRN | GIN | LPN_LABEL | ...",
  "output_format": "PDF | ZPL | EXCEL",
  "sample_data": { ... JSON object matching placeholder catalogue ... }
}
```

**Response:** Binary (PDF/image) or text (ZPL rendered) — same as render endpoint but without persisting anything.

### Default Sample Data

System menyediakan **pre-built sample data** per template type sehingga admin tidak perlu menulis JSON dari scratch:

| Template Type | Sample Data Includes |
|---|---|
| GRN | receipt_number, date, owner, warehouse, supplier, 3 line items with SKU/qty/lot/weight |
| GIN | issue_number, SO number, consignee, address, carrier, 2 line items |
| LPN Label | lpn_number, sku_code, qty, lot, expiry, weight, location, trace_id |
| Putaway Label | lpn_number, suggested_location, zone, sku, qty |
| Shipment Label | so_number, consignee, address, carrier, service_type, package_seq |
| Inventory Report | period, warehouse, owner, 5 balance rows |

Admin bisa mulai dari sample data default lalu modifikasi sesuai kebutuhan testing.

---

## Visual Template Editor (WYSIWYG)

Template editor adalah **drag-and-drop visual canvas** — bukan text editor. Admin men-design label/document dengan menyusun elemen visual pada canvas yang merepresentasikan ukuran fisik output (mm/px).

### Layout: 3-Panel

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Kembali ke Template    Nama: [Label Resi JNE]  100×150mm  Margin:3mm│
│                                                     [Preview] [Simpan]  │
├──────────┬──────────────────────────────────────┬───────────────────────┤
│ Elemen   │         CANVAS (drag-drop)           │ Properties            │
│          │                                      │                       │
│ T Teks   │  ┌─────────────────────────────┐     │ Select an element to  │
│   Statis │  │ PT. TOKO JAYA MAKMUR        │     │ edit its properties.  │
│          │  ├─────────────────────────────┤     │                       │
│ D Teks   │  │ Pengirim:                   │     │ When selected:        │
│   Dinamis│  │ {{nama_pengirim}}           │     │ - Position (x,y mm)   │
│          │  │ {{alamat_pengirim}}         │     │ - Size (w×h mm)       │
│ ||| Bar- │  ├─────────────────────────────┤     │ - Font size           │
│     code │  │ Penerima:                   │     │ - Font weight         │
│          │  │ {{nama_penerima}}           │     │ - Alignment           │
│ ▣ QR Code│  │ {{alamat_penerima}}         │     │ - Border              │
│          │  │ {{telp_penerima}}           │     │ - Placeholder binding │
│ 🖼 Gambar│  ├─────────────────────────────┤     │ - Barcode type        │
│          │  │  ║│║║│║║│║║│║║│║║│║║│       │     │                       │
│ ── Garis │  │  {{nomor_resi}}             │     │                       │
│          │  ├─────────────────────────────┤     │                       │
│ □ Kotak  │  │ Isi: {{isi_paket}}          │     │                       │
│          │  │ Berat: {{berat}}  Layanan:  │     │                       │
│          │  │                  {{layanan}} │     │                       │
│          │  └─────────────────────────────┘     │                       │
└──────────┴──────────────────────────────────────┴───────────────────────┘
```

### Element Palette (Left Panel)

| Element | Icon | Description | Placeholder Support |
|---|---|---|---|
| **Teks Statis** | T | Fixed text (label, header, company name) | No — content typed directly |
| **Teks Dinamis** | D | Placeholder text from data binding | Yes — `{{field_path}}` |
| **Barcode** | ║│║ | Code128 barcode from placeholder value | Yes — bound to one field |
| **QR Code** | ▣ | QR code from placeholder value | Yes — bound to one field |
| **Gambar** | 🖼 | Static image (logo, stamp) — uploaded file | No |
| **Garis** | ── | Horizontal/vertical line separator | No |
| **Kotak** | □ | Rectangle/box container (border only or filled) | No |

### Canvas Behavior

- Canvas represents actual physical output size (e.g., 100×150mm for shipping label, A4 for GRN)
- Grid snap (optional, configurable: 1mm / 2mm / 5mm)
- Elements are drag-and-drop positionable
- Resize handles on selected element
- Dynamic text elements (blue highlight) show placeholder name in edit mode; show rendered value in preview mode
- Multi-select with Shift+click for alignment tools
- Undo/Redo (Ctrl+Z / Ctrl+Y)

### Properties Panel (Right Panel)

When an element is selected, shows editable properties:

| Property | Applies To | Description |
|---|---|---|
| Position X, Y | All | mm from top-left corner |
| Width, Height | All | Element dimensions in mm |
| Font Family | Text, Dynamic | Roboto / Monospace |
| Font Size | Text, Dynamic | pt (6–72) |
| Font Weight | Text, Dynamic | Normal / Bold |
| Text Align | Text, Dynamic | Left / Center / Right |
| Border | All | None / Solid / Dashed + thickness |
| Background | Kotak | Transparent / White / Light gray |
| Placeholder | Dynamic, Barcode, QR | Field path from binding catalogue (dropdown) |
| Barcode Type | Barcode | Code128 / EAN-13 / Code39 |
| QR Size | QR Code | Module size in mm |
| Image Source | Gambar | Uploaded file reference |
| Line Direction | Garis | Horizontal / Vertical |
| Line Thickness | Garis | pt (0.5–3) |

### Template Storage Format

Visual editor saves template as **JSON layout** (not HTML/ZPL directly):

```json
{
  "canvas": { "width_mm": 100, "height_mm": 150, "margin_mm": 3 },
  "elements": [
    { "type": "static_text", "x": 5, "y": 5, "w": 90, "h": 10, "content": "PT. TOKO JAYA MAKMUR", "font_size": 14, "font_weight": "bold", "align": "center" },
    { "type": "dynamic_text", "x": 5, "y": 20, "w": 90, "h": 8, "placeholder": "{{nama_pengirim}}", "font_size": 12, "font_weight": "bold" },
    { "type": "barcode", "x": 15, "y": 80, "w": 70, "h": 25, "placeholder": "{{nomor_resi}}", "barcode_type": "CODE128" },
    { "type": "qr_code", "x": 75, "y": 5, "w": 20, "h": 20, "placeholder": "{{trace_id}}", "module_size": 2 }
  ]
}
```

Engine converts this JSON layout to:
- **ZPL** for thermal label printers
- **HTML/CSS** for PDF rendering (via wkhtmltopdf or similar)
- **XLSX XML** for Excel reports

### Dimensions per Template Type

| Template Type | Default Canvas Size | Output |
|---|---|---|
| LPN Label | 100 × 60 mm | ZPL |
| Putaway Label | 100 × 40 mm | ZPL |
| Shipment Label | 100 × 150 mm | ZPL |
| GRN | A4 (210 × 297 mm) | PDF |
| GIN | A4 (210 × 297 mm) | PDF |
| Inventory Report | A4 Landscape (297 × 210 mm) | PDF / Excel |

---

## Placeholder Syntax

Template menggunakan sintaks `{{field_path}}` — double curly braces. Semua placeholder case-sensitive.

```
{{field_path}}           — simple field substitution
{{field_path | fmt}}     — field with format modifier
{{#each items}}...{{/each}}  — loop over array (for line items)
{{#if condition}}...{{/if}}  — conditional block
```

**Format modifiers:**
| Modifier | Applies To | Example |
|---|---|---|
| `date:DD-MM-YYYY` | date fields | `{{receipt.date \| date:DD-MM-YYYY}}` |
| `number:2` | numeric (2 decimal places) | `{{line.qty \| number:2}}` |
| `upper` | string | `{{owner.name \| upper}}` |
| `qr` | any string → QR code image | `{{receipt.trace_id \| qr}}` |
| `barcode128` | any string → Code128 image | `{{lpn.lpn_number \| barcode128}}` |

---

## Field Binding Catalogue

All Polaris data fields available as template variables. Organized by document context.

### Common Fields (available in all templates)

| Placeholder | Type | Description |
|---|---|---|
| `{{warehouse.name}}` | string | Warehouse name |
| `{{warehouse.code}}` | string | Warehouse code |
| `{{warehouse.address}}` | string | Warehouse full address |
| `{{entity.name}}` | string | Company / entity name |
| `{{owner.name}}` | string | Owner of goods name |
| `{{owner.code}}` | string | Owner code |
| `{{generated_at}}` | datetime | Document generation timestamp |
| `{{generated_by}}` | string | User who triggered generation |
| `{{page_number}}` | integer | Current page (multi-page PDF) |
| `{{total_pages}}` | integer | Total pages |

### GRN (Goods Receipt Note) — context: `receipt`

| Placeholder | Type | Description |
|---|---|---|
| `{{receipt.plan_number}}` | string | Inbound Plan number (FR-075) |
| `{{receipt.receipt_number}}` | string | System receipt number |
| `{{receipt.trace_id}}` | string | TraceID of this receipt |
| `{{receipt.date}}` | date | Receipt date |
| `{{receipt.supplier.name}}` | string | Supplier name (nullable) |
| `{{receipt.supplier.code}}` | string | Supplier code (nullable) |
| `{{receipt.rcv_mode}}` | string | TWO_STEP or DIRECT |
| `{{receipt.operator}}` | string | Operator name |
| `{{receipt.location.code}}` | string | Destination location code |
| `{{receipt.location.zone}}` | string | Destination zone name |
| `{{#each receipt.lines}}` | array | Loop over receipt line items |
| `{{line.sku_code}}` | string | SKU code |
| `{{line.sku_name}}` | string | SKU name |
| `{{line.qty}}` | decimal | Quantity received (in base UOM) |
| `{{line.uom}}` | string | UOM display name |
| `{{line.lot_number}}` | string | Lot number |
| `{{line.expiry_date}}` | date | Expiry date (nullable) |
| `{{line.lpn_number}}` | string | LPN number assigned |
| `{{line.weight_kg}}` | decimal | Captured weight in kg (nullable) |
| `{{/each}}` | — | End loop |
| `{{receipt.total_lines}}` | integer | Total line count |
| `{{receipt.total_qty_ea}}` | decimal | Total quantity in EA |

### GIN (Goods Issue Note) — context: `issue`

| Placeholder | Type | Description |
|---|---|---|
| `{{issue.shipping_order_number}}` | string | SO number |
| `{{issue.issue_number}}` | string | System issue number |
| `{{issue.trace_id}}` | string | TraceID of this issue |
| `{{issue.date}}` | date | Issue date |
| `{{issue.consignee.name}}` | string | Consignee name |
| `{{issue.consignee.address}}` | string | Consignee delivery address |
| `{{issue.operator}}` | string | Operator name |
| `{{#each issue.lines}}` | array | Loop over issue line items |
| `{{line.sku_code}}` | string | SKU code |
| `{{line.sku_name}}` | string | SKU name |
| `{{line.qty}}` | decimal | Quantity issued |
| `{{line.uom}}` | string | UOM display name |
| `{{line.lot_number}}` | string | Lot number |
| `{{line.expiry_date}}` | date | Expiry date (nullable) |
| `{{line.lpn_number}}` | string | LPN number |
| `{{/each}}` | — | End loop |
| `{{issue.total_lines}}` | integer | Total line count |
| `{{issue.total_qty_ea}}` | decimal | Total quantity in EA |
| `{{issue.total_weight_kg}}` | decimal | Total weight (nullable) |

### LPN Label (ZPL) — context: `lpn`

| Placeholder | Type | Description |
|---|---|---|
| `{{lpn.lpn_number}}` | string | LPN identifier |
| `{{lpn.lpn_number \| barcode128}}` | image | LPN as Code128 barcode |
| `{{lpn.sku_code}}` | string | SKU code |
| `{{lpn.sku_name}}` | string | SKU name |
| `{{lpn.lot_number}}` | string | Lot number |
| `{{lpn.expiry_date}}` | date | Expiry date (nullable) |
| `{{lpn.qty}}` | decimal | Quantity on LPN |
| `{{lpn.uom}}` | string | UOM display name |
| `{{lpn.weight_kg}}` | decimal | Weight (nullable) |
| `{{lpn.location.code}}` | string | Current location code |
| `{{lpn.owner.name}}` | string | Owner name |
| `{{lpn.trace_id \| qr}}` | image | TraceID as QR code |

### Putaway Label (ZPL) — context: `putaway`

| Placeholder | Type | Description |
|---|---|---|
| `{{putaway.lpn_number}}` | string | LPN identifier |
| `{{putaway.suggested_location}}` | string | Suggested location code |
| `{{putaway.zone}}` | string | Target zone name |
| `{{putaway.sku_code}}` | string | SKU code |
| `{{putaway.qty}}` | decimal | Quantity |
| `{{putaway.operator}}` | string | Operator name |
| `{{putaway.task_id}}` | string | Putaway task ID |

### Shipment Label (ZPL) — context: `shipment`

| Placeholder | Type | Description |
|---|---|---|
| `{{shipment.shipping_order_number}}` | string | SO number |
| `{{shipment.so_number \| barcode128}}` | image | SO number as barcode |
| `{{shipment.consignee.name}}` | string | Consignee name |
| `{{shipment.consignee.address}}` | string | Delivery address |
| `{{shipment.carrier.name}}` | string | Carrier name (nullable) |
| `{{shipment.service_type}}` | string | Carrier service type (nullable) |
| `{{shipment.lpn_number}}` | string | LPN on this shipment |
| `{{shipment.package_seq}}` | string | e.g. "3 of 12" |
| `{{shipment.owner.name}}` | string | Owner name |

### Inventory Report (PDF/Excel) — context: `report`

| Placeholder | Type | Description |
|---|---|---|
| `{{report.generated_at}}` | datetime | Report timestamp |
| `{{report.period_from}}` | date | Report period start |
| `{{report.period_to}}` | date | Report period end |
| `{{report.warehouse.name}}` | string | Warehouse name |
| `{{report.owner.name}}` | string | Owner name |
| `{{#each report.rows}}` | array | Loop over balance rows |
| `{{row.sku_code}}` | string | SKU code |
| `{{row.sku_name}}` | string | SKU name |
| `{{row.lot_number}}` | string | Lot number |
| `{{row.location_code}}` | string | Location code |
| `{{row.qty_on_hand}}` | decimal | Stock on hand |
| `{{row.qty_available}}` | decimal | Stock available |
| `{{row.expiry_date}}` | date | Expiry date (nullable) |
| `{{row.weight_kg}}` | decimal | Total weight (nullable) |
| `{{/each}}` | — | End loop |
| `{{report.total_skus}}` | integer | Total distinct SKUs |
| `{{report.total_qty_ea}}` | decimal | Grand total EA |

---

## Data Model

Stored in `polaris_master` database (Document Service, prefix `doc_`).

```sql
doc_m_template
├── id                  VARCHAR(36)       PK, UUID
├── template_code       VARCHAR(64)       NOT NULL  -- e.g. 'GRN_DEFAULT', 'GRN_OWNER_A_V2'
├── template_type       VARCHAR(32)       NOT NULL
│                       -- 'GRN' | 'GIN' | 'LPN_LABEL' | 'PUTAWAY_LABEL'
│                       --  | 'SHIPMENT_LABEL' | 'INVENTORY_REPORT'
├── output_format       VARCHAR(8)        NOT NULL  -- 'PDF' | 'EXCEL' | 'ZPL'
├── description         VARCHAR(256)      NULL
├── template_content    LONGTEXT          NOT NULL  -- template source (HTML for PDF, ZPL raw for labels, XLSX XML for Excel)
├── version             INT               NOT NULL DEFAULT 1
├── is_system_default   BOOLEAN           NOT NULL DEFAULT false  -- true = platform default, admin cannot delete
├── is_active           BOOLEAN           NOT NULL DEFAULT true
├── is_deleted          BOOLEAN           NOT NULL DEFAULT false
├── created_by          VARCHAR(128)      NOT NULL
├── created_at          TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP
├── updated_by          VARCHAR(128)      NOT NULL
└── updated_at          TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

-- Owner assignment: which template is active for a given owner + type combination
doc_r_owner_template
├── id                  VARCHAR(36)       PK, UUID
├── owner_id            VARCHAR(36)       NOT NULL, FK → md_m_business_party.id
├── template_type       VARCHAR(32)       NOT NULL  -- same enum as doc_m_template.template_type
├── template_id         VARCHAR(36)       NOT NULL, FK → doc_m_template.id
├── effective_from      DATE              NOT NULL DEFAULT CURRENT_DATE
├── created_by          VARCHAR(128)      NOT NULL
└── created_at          TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP
```

**Constraints:**
- `UNIQUE KEY uk_owner_type_effective (owner_id, template_type, effective_from)` — one assignment per owner+type per date; new assignment supersedes old
- `is_system_default = true` templates cannot be deleted (only deactivated by Polaris team)
- If no owner-specific assignment exists, system uses the `is_system_default = true` template for that type
- `template_content` stores the raw source; rendered output is not persisted (generated on demand)
- Template history: previous versions of a template are retained by keeping old rows — new upload creates new row with `version + 1`; historical document regeneration resolves template by `created_at` ≤ original document date

**Indexes:**
```sql
INDEX idx_template_type_active   (template_type, is_active)
INDEX idx_owner_template_owner   (owner_id, template_type)
```

---

## Referensi

- Product Brief: [Section 5 — Platform Capabilities](../../01-product-brief/polaris-product-brief.md)
- Product Decomposition: [Feature #71 (RICE 43.2, Critical)](../../02-product-decomposition/polaris-product-decomposition.md)
- Technical Brief: [Reporting & Document Architecture](../../03-product-technical-brief/polaris-technical-brief-pm.md)
- ADR-001: [Modularity and Configuration Architecture](../../../02-technical/01-technical-decision-principle/adr-001-modularity-and-configuration-architecture.md)

---

## Version History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-06-19 | — | Initial version — Carbone CE + LibreOffice headless |
| 1.1 | 2026-07-29 | Hendro (PM) | Engine decision changed: Carbone CE ditinggalkan, engine dikembangkan custom internal. Assignee: Agus Stiyo. |
| 1.2 | 2026-08-01 | Sarah (PM) | **Added Placeholder Syntax** — `{{field_path}}` double curly braces syntax; format modifiers (date, number, upper, qr, barcode128); loop and conditional blocks. **Added Field Binding Catalogue** — complete placeholder reference for all 6 template types: GRN, GIN, LPN Label, Putaway Label, Shipment Label, Inventory Report. **Added Data Model** — `doc_m_template` and `doc_r_owner_template` tables; versioning strategy for historical regeneration; system default fallback logic. |
| 1.3 | 2026-08-02 | Ivy (Designer) | **Added §Template Preview Mode** — split-view spec: JSON sample data (editable, live) + rendered output (PDF viewer / ZPL image / Excel table). Barcode/QR live rendering. Multi-page nav. Preview API endpoint. Default sample data per template type. Error handling for malformed JSON and missing placeholders. **Added §Visual Template Editor (WYSIWYG)** — drag-and-drop canvas editor with element palette (Static Text, Dynamic Text, Barcode, QR Code, Image, Line, Box), properties panel, JSON layout storage format, ZPL/HTML/XLSX conversion, canvas dimensions per template type. |
