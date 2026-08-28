import type { ElementType, TemplateElement, ElementProperties } from '../types/template.types'

export function snapToGrid(value: number): number {
  return Math.round(value * 2) / 2
}

const MINIMUM_SIZES: Record<string, { width: number; height: number }> = {
  barcode: { width: 20, height: 8 },
  qrcode: { width: 10, height: 10 },
}

const DEFAULT_MINIMUM_SIZE = { width: 2, height: 2 }

export function enforceMinimumSize(type: ElementType, width: number, height: number) {
  const min = MINIMUM_SIZES[type] ?? DEFAULT_MINIMUM_SIZE
  return { width: Math.max(width, min.width), height: Math.max(height, min.height) }
}

export function clampPosition(x: number, y: number, elementWidth: number, elementHeight: number, printAreaWidth: number, printAreaHeight: number) {
  return {
    x: Math.max(0, Math.min(x, printAreaWidth - elementWidth)),
    y: Math.max(0, Math.min(y, printAreaHeight - elementHeight)),
  }
}

export function getPrintArea(pageWidthMm: number, pageHeightMm: number, marginMm: number) {
  return { width: pageWidthMm - 2 * marginMm, height: pageHeightMm - 2 * marginMm }
}

export function getNextZOrder(elements: TemplateElement[]): number {
  if (elements.length === 0) return 1
  return Math.max(...elements.map((el) => el.z_order)) + 1
}

const DEFAULT_DIMENSIONS: Record<ElementType, { width: number; height: number }> = {
  static_text: { width: 40, height: 8 },
  dynamic_text: { width: 40, height: 8 },
  barcode: { width: 40, height: 15 },
  qrcode: { width: 20, height: 20 },
  image: { width: 30, height: 20 },
  line: { width: 30, height: 2 },
  box: { width: 30, height: 20 },
  repeater: { width: 100, height: 66 },
}

function getDefaultProperties(type: ElementType): ElementProperties {
  switch (type) {
    case 'static_text':
      return { content: 'Text', font_family: 'Arial', font_size_pt: 12, font_bold: false, font_italic: false, alignment: 'left' }
    case 'dynamic_text':
      return { placeholder: 'field_name', font_family: 'Arial', font_size_pt: 12, font_bold: false, font_italic: false, alignment: 'left' }
    case 'barcode':
      return { format: 'code128', data_source: 'static', static_value: '1234567890', placeholder: '' }
    case 'qrcode':
      return { error_correction: 'M', data_source: 'static', static_value: 'https://example.com', placeholder: '' }
    case 'image':
      return { source_url: '', source_type: 'url' }
    case 'line':
      return { thickness_mm: 0.5, orientation: 'horizontal' }
    case 'box':
      return { thickness_mm: 0.5, fill: false }
    case 'repeater':
      return {
        data_key: 'items', row_height_mm: 6, max_rows: 10, show_header: true, show_row_lines: true,
        columns: [
          { label: 'No', placeholder: '_index', x_offset_mm: 0, width_mm: 10, font_family: 'Arial', font_size_pt: 7, alignment: 'center' },
          { label: 'Item', placeholder: 'item_name', x_offset_mm: 10, width_mm: 60, font_family: 'Arial', font_size_pt: 7, alignment: 'left' },
          { label: 'Qty', placeholder: 'qty', x_offset_mm: 70, width_mm: 20, font_family: 'Arial', font_size_pt: 7, alignment: 'center' },
        ],
      }
  }
}

export function createDefaultElement(type: ElementType, xMm: number, yMm: number): TemplateElement {
  const dims = DEFAULT_DIMENSIONS[type]
  return {
    id: crypto.randomUUID(),
    type,
    x_mm: xMm,
    y_mm: yMm,
    width_mm: dims.width,
    height_mm: dims.height,
    z_order: 0,
    properties: getDefaultProperties(type),
  }
}
