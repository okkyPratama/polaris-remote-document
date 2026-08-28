// ─── Standard API response shape (mirrors polaris-wms-fe ApiResponse) ──────────

export interface ApiResponse<T = unknown> {
  httpCode: number
  externalCode: number
  externalDesc: string
  data: T | null
  errorMessage?: string[]
}

export interface ApiListResponse<T = unknown> {
  httpCode: number
  externalCode: number
  externalDesc: string
  data: {
    data: T[]
    paging: PagingResponse
  }
  errorMessage?: string[]
}

export interface PagingResponse {
  page: number
  pageSize: number
  count: number
  totalItems: number
  totalPages: number
}

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
  { label: string; badgeStyle: React.CSSProperties; defaultFormat: OutputFormat; defaultSizeType: SizeType }
> = {
  GRN: {
    label: 'GRN',
    badgeStyle: { background: 'rgba(0,24,113,0.1)', color: '#001871' },
    defaultFormat: 'PDF',
    defaultSizeType: 'a5_document',
  },
  GIN: {
    label: 'GIN',
    badgeStyle: { background: 'rgba(194,82,0,0.1)', color: '#c45200' },
    defaultFormat: 'PDF',
    defaultSizeType: 'a5_document',
  },
  LPN_LABEL: {
    label: 'Label LPN',
    badgeStyle: { background: 'rgba(30,58,138,0.1)', color: '#1e3a8a' },
    defaultFormat: 'PDF',
    defaultSizeType: 'sticker_4x8',
  },
  PUTAWAY_LABEL: {
    label: 'Label Putaway',
    badgeStyle: { background: 'rgba(22,101,52,0.1)', color: '#166534' },
    defaultFormat: 'PDF',
    defaultSizeType: 'sticker_3x10',
  },
  SHIPMENT_LABEL: {
    label: 'Label Pengiriman',
    badgeStyle: { background: 'rgba(109,40,217,0.1)', color: '#6d28d9' },
    defaultFormat: 'PDF',
    defaultSizeType: 'thermal_a6',
  },
  INVENTORY_REPORT: {
    label: 'Laporan Inventori',
    badgeStyle: { background: 'rgba(71,85,105,0.12)', color: '#475569' },
    defaultFormat: 'PDF',
    defaultSizeType: 'a5_document',
  },
}

// ─── Canvas / Page size ───────────────────────────────────────────────────────

export type Orientation = 'portrait' | 'landscape'

export type SizeType = 'thermal_a6' | 'a5_document' | 'sticker_4x8' | 'sticker_3x10'

/**
 * PageSize — field names match backend JSON tags (camelCase):
 *   widthMm, heightMm  (backend: widthMm / heightMm)
 *
 * Standard sizes match backend engine/models.go StandardSizes map:
 *   thermal_a6:   100×150mm portrait
 *   a5_document:  148×210mm portrait
 *   sticker_4x8:   40×80mm  portrait   ← NOTE: 40×80, NOT 100×60
 *   sticker_3x10: 100×30mm  landscape
 */
export interface PageSize {
  type: SizeType
  widthMm: number
  heightMm: number
  orientation: Orientation
}

/**
 * Valid margin values — backend validation only accepts 2.0, 2.5, or 3.0 mm.
 * See engine/validation.go: ValidMargins = []float64{2.0, 2.5, 3.0}
 */
export const VALID_MARGINS = [2.0, 2.5, 3.0] as const
export type ValidMargin = 2.0 | 2.5 | 3.0

export const STANDARD_SIZES: Record<SizeType, { name: string; size: PageSize; defaultMarginMm: ValidMargin }> = {
  thermal_a6: {
    name: 'Label Resi Pengiriman (100×150mm)',
    size: { type: 'thermal_a6', widthMm: 100, heightMm: 150, orientation: 'portrait' },
    defaultMarginMm: 3.0,
  },
  a5_document: {
    name: 'Dokumen/Faktur/Nota A5 (148×210mm)',
    size: { type: 'a5_document', widthMm: 148, heightMm: 210, orientation: 'portrait' },
    defaultMarginMm: 3.0,
  },
  sticker_4x8: {
    name: 'Label Barcode/SKU (40×80mm)',
    size: { type: 'sticker_4x8', widthMm: 40, heightMm: 80, orientation: 'portrait' },
    defaultMarginMm: 2.0,
  },
  sticker_3x10: {
    name: 'Label Harga Rak (100×30mm)',
    size: { type: 'sticker_3x10', widthMm: 100, heightMm: 30, orientation: 'landscape' },
    defaultMarginMm: 2.0,
  },
}

// ─── Element types ────────────────────────────────────────────────────────────

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

// Element property shapes
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

// ─── Template entity ──────────────────────────────────────────────────────────

/** Full template entity — includes WYSIWYG canvas layout */
export interface Template {
  id: string
  name: string
  /** FR-071 document type */
  template_type?: TemplateType
  /** Output format */
  output_format?: OutputFormat
  /** Optional description */
  description?: string
  /** Whether the template is active */
  is_active?: boolean
  /** Whether this is the system-default fallback */
  is_system_default?: boolean
  /** Page size — camelCase to match backend JSON tags */
  size: PageSize
  /** Margin in mm — camelCase to match backend JSON tag `marginMm` */
  marginMm: number
  elements: TemplateElement[]
  created_at: string
  updated_at: string
}

/** Lightweight list entry */
export interface TemplateSummary {
  id: string
  name: string
  template_type?: TemplateType
  output_format?: OutputFormat
  description?: string
  is_active?: boolean
  is_system_default?: boolean
  /** Page size — camelCase to match backend JSON tags */
  size: PageSize
  /** Margin in mm — camelCase to match backend JSON tag `marginMm` */
  marginMm: number
  created_at: string
  updated_at: string
}

// ─── Generate request / response ─────────────────────────────────────────────

export interface GenerateRequest {
  data: Record<string, unknown> | Record<string, unknown>[]
}

// ─── Error response (legacy single-service format) ───────────────────────────

export interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}
