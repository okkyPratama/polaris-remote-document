import { z } from 'zod'

// ─── FR-071 Template Types ────────────────────────────────────────────────────

/** Template document type — Phase 1 from FR-071 */
export type TemplateType =
  | 'GRN'
  | 'GIN'
  | 'LPN_LABEL'
  | 'PUTAWAY_LABEL'
  | 'SHIPMENT_LABEL'
  | 'INVENTORY_REPORT'

/** Output format of a rendered document */
export type OutputFormat = 'PDF' | 'ZPL' | 'EXCEL'

export const TEMPLATE_TYPE_META: Record<
  TemplateType,
  { label: string; badgeClass: string; badgeStyle: React.CSSProperties; defaultFormat: OutputFormat }
> = {
  GRN: {
    label: 'GRN',
    badgeClass: 'tb-grn',
    badgeStyle: { background: 'rgba(0,24,113,0.1)', color: '#001871' },
    defaultFormat: 'PDF',
  },
  GIN: {
    label: 'GIN',
    badgeClass: 'tb-gin',
    badgeStyle: { background: 'rgba(194,82,0,0.1)', color: '#c45200' },
    defaultFormat: 'PDF',
  },
  LPN_LABEL: {
    label: 'Label LPN',
    badgeClass: 'tb-lpn',
    badgeStyle: { background: 'rgba(30,58,138,0.1)', color: '#1e3a8a' },
    defaultFormat: 'ZPL',
  },
  PUTAWAY_LABEL: {
    label: 'Label Putaway',
    badgeClass: 'tb-pta',
    badgeStyle: { background: 'rgba(22,101,52,0.1)', color: '#166534' },
    defaultFormat: 'ZPL',
  },
  SHIPMENT_LABEL: {
    label: 'Label Pengiriman',
    badgeClass: 'tb-ship',
    badgeStyle: { background: 'rgba(109,40,217,0.1)', color: '#6d28d9' },
    defaultFormat: 'ZPL',
  },
  INVENTORY_REPORT: {
    label: 'Laporan Inventori',
    badgeClass: 'tb-rpt',
    badgeStyle: { background: 'rgba(71,85,105,0.12)', color: '#475569' },
    defaultFormat: 'EXCEL',
  },
}

// ─── Page Settings (replaces old PageSize + marginMm) ─────────────────────────

export interface PageSettingsJson {
  sizeType: string
  widthMm: number
  heightMm: number
  marginMm: number
  orientation: string // 'PORTRAIT' | 'LANDSCAPE'
}

// ─── Canvas / Standard Sizes ──────────────────────────────────────────────────

export type SizeType = 'thermal_a6' | 'a5_document' | 'sticker_4x8' | 'sticker_3x10'

/**
 * Valid margin values — backend validation only accepts 2.0, 2.5, or 3.0 mm.
 */
export const VALID_MARGINS = [2.0, 2.5, 3.0] as const
export type ValidMargin = (typeof VALID_MARGINS)[number]

export const STANDARD_SIZES: Record<SizeType, { name: string; widthMm: number; heightMm: number; orientation: string; defaultMarginMm: ValidMargin }> = {
  thermal_a6: {
    name: 'Label Resi Pengiriman (100×150mm)',
    widthMm: 100,
    heightMm: 150,
    orientation: 'PORTRAIT',
    defaultMarginMm: 3.0,
  },
  a5_document: {
    name: 'Dokumen/Faktur/Nota A5 (148×210mm)',
    widthMm: 148,
    heightMm: 210,
    orientation: 'PORTRAIT',
    defaultMarginMm: 3.0,
  },
  sticker_4x8: {
    name: 'Label Barcode/SKU (40×80mm)',
    widthMm: 40,
    heightMm: 80,
    orientation: 'PORTRAIT',
    defaultMarginMm: 2.0,
  },
  sticker_3x10: {
    name: 'Label Harga Rak (100×30mm)',
    widthMm: 100,
    heightMm: 30,
    orientation: 'LANDSCAPE',
    defaultMarginMm: 2.0,
  },
}

// ─── Element types (for WYSIWYG editor — stored as JSON string in templateContent) ──

export type ElementType =
  | 'static_text'
  | 'dynamic_text'
  | 'barcode'
  | 'qrcode'
  | 'image'
  | 'line'
  | 'box'
  | 'repeater'

export type BarcodeFormat = 'code128' | 'code39' | 'ean13'
export type DataSource = 'static' | 'placeholder'
export type TextAlignment = 'left' | 'center' | 'right'
export type LineOrientation = 'horizontal' | 'vertical'

export interface StaticTextProperties {
  content: string
  font_family: string
  font_size_pt: number
  font_bold: boolean
  font_italic: boolean
  alignment: TextAlignment
}

export interface DynamicTextProperties {
  placeholder: string
  font_family: string
  font_size_pt: number
  font_bold: boolean
  font_italic: boolean
  alignment: TextAlignment
}

export interface BarcodeProperties {
  format: BarcodeFormat
  data_source: DataSource
  static_value: string
  placeholder: string
}

export interface QRCodeProperties {
  error_correction: string
  data_source: DataSource
  static_value: string
  placeholder: string
}

export interface ImageProperties {
  source_url: string
  source_type: 'url' | 'base64'
}

export interface LineProperties {
  thickness_mm: number
  orientation: LineOrientation
}

export interface BoxProperties {
  thickness_mm: number
  fill: boolean
}

export interface RepeaterColumn {
  label: string
  placeholder: string
  x_offset_mm: number
  width_mm: number
  font_family: string
  font_size_pt: number
  alignment: TextAlignment
}

export interface RepeaterProperties {
  data_key: string
  row_height_mm: number
  max_rows: number
  show_header: boolean
  show_row_lines: boolean
  columns: RepeaterColumn[]
}

export type ElementProperties =
  | StaticTextProperties
  | DynamicTextProperties
  | BarcodeProperties
  | QRCodeProperties
  | ImageProperties
  | LineProperties
  | BoxProperties
  | RepeaterProperties

export interface TemplateElement {
  id: string
  type: ElementType
  x_mm: number
  y_mm: number
  width_mm: number
  height_mm: number
  z_order: number
  properties: ElementProperties
}

// ─── Template entity (matches backend TemplateResp) ───────────────────────────

/** Full template entity — includes templateContent */
export interface Template {
  id: string
  templateCode: string
  name: string
  templateType: TemplateType
  outputFormat: OutputFormat
  description: string
  templateContent: string // JSON string (elements array for WYSIWYG) or raw HTML/ZPL
  version: number
  pageSettingsJson: PageSettingsJson | null
  isSystemDefault: boolean
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

/** Lightweight list entry (matches backend TemplateSummaryResp — no templateContent) */
export interface TemplateSummary {
  id: string
  templateCode: string
  name: string
  templateType: TemplateType
  outputFormat: OutputFormat
  description: string
  version: number
  pageSettingsJson: PageSettingsJson | null
  isSystemDefault: boolean
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

// ─── Template Save/Edit request ──────────────────────────────────────────────

export interface TemplateSaveRequest {
  id?: string // only for edit
  templateCode: string
  name: string
  templateType: TemplateType | string
  outputFormat: OutputFormat | string
  description?: string
  templateContent: string
  pageSettingsJson?: PageSettingsJson | null
  isSystemDefault?: boolean
  isActive?: boolean
}

// ─── Template Assignment ─────────────────────────────────────────────────────

export interface TemplateAssignment {
  id: string
  companyId: string
  warehouseId: string
  ownerId: string
  templateType: string
  templateId: string
  effectiveFrom: string
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

export interface TemplateAssignRequest {
  companyId?: string | null
  warehouseId?: string | null
  ownerId?: string | null
  templateType: string
  templateId: string
  effectiveFrom: string
}

export interface GetByScopeRequest {
  companyId?: string | null
  warehouseId?: string | null
  ownerId?: string | null
  templateType: string
}

// ─── Generate / Render request ───────────────────────────────────────────────

export interface GenerateRequest {
  data: Record<string, unknown> | Record<string, unknown>[]
}

export interface RenderRequest {
  templateType: string
  ownerId?: string
  outputFormat?: string
  data: Record<string, unknown>
}

export interface PreviewRequest {
  templateId?: string
  templateContent?: string
  templateType: string
  outputFormat: string
  sampleData: Record<string, unknown>
}

// ─── Crop request ────────────────────────────────────────────────────────────

export interface CropRequest {
  url: string
  targetWidthMm: number
  targetHeightMm: number
  autoCrop: boolean
  paddingMm: number
}

// ─── Search / Paging ─────────────────────────────────────────────────────────

export interface SearchRequest {
  filters: SearchFilters
  paging: SearchPaging
}

export interface SearchFilters {
  and?: FilterCondition[]
  or?: FilterCondition[]
}

export interface FilterCondition {
  field: string
  operator: string
  value: unknown
}

export interface SearchPaging {
  page: number
  pageSize: number
  sortBy?: string
  sortDir?: string
}

export interface TemplateSearchParams {
  page?: number
  pageSize?: number
  templateType?: TemplateType | null
  search?: string
}

// ─── Form validation schema ──────────────────────────────────────────────────

export const templateFormSchema = z.object({
  name: z.string().min(1, 'Nama template wajib diisi').max(128, 'Maksimal 128 karakter'),
  templateCode: z.string().min(1, 'Kode template wajib diisi').max(64, 'Maksimal 64 karakter'),
  templateType: z.string().min(1, 'Tipe wajib dipilih'),
  outputFormat: z.string().min(1, 'Format wajib dipilih'),
})

export type TemplateFormData = z.infer<typeof templateFormSchema>
