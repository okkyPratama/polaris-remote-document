import type {
  ElementType,
  ElementProperties,
  TemplateElement,
} from '@/types/template';

/**
 * Snap a coordinate value to the nearest 0.5mm increment.
 * snap(x) = Math.round(x * 2) / 2
 */
export function snapToGrid(value: number): number {
  return Math.round(value * 2) / 2;
}

/**
 * Minimum element dimensions by type (in mm).
 */
export interface MinimumSize {
  width: number;
  height: number;
}

const MINIMUM_SIZES: Record<string, MinimumSize> = {
  barcode: { width: 20, height: 8 },
  qrcode: { width: 10, height: 10 },
};

const DEFAULT_MINIMUM_SIZE: MinimumSize = { width: 2, height: 2 };

/**
 * Get the minimum size for a given element type.
 */
export function getMinimumSize(type: ElementType): MinimumSize {
  return MINIMUM_SIZES[type] ?? DEFAULT_MINIMUM_SIZE;
}

/**
 * Enforce minimum size for an element based on its type.
 * Returns clamped width and height.
 */
export function enforceMinimumSize(
  type: ElementType,
  width: number,
  height: number
): { width: number; height: number } {
  const min = getMinimumSize(type);
  return {
    width: Math.max(width, min.width),
    height: Math.max(height, min.height),
  };
}

/**
 * Clamp an element's position so it stays entirely within the print area.
 *
 * Print area dimensions:
 *   maxWidth  = size.width_mm  - 2 * margin_mm
 *   maxHeight = size.height_mm - 2 * margin_mm
 *
 * Clamped position:
 *   x in [0, maxWidth  - element.width]
 *   y in [0, maxHeight - element.height]
 */
export function clampPosition(
  x: number,
  y: number,
  elementWidth: number,
  elementHeight: number,
  printAreaWidth: number,
  printAreaHeight: number
): { x: number; y: number } {
  const clampedX = Math.max(0, Math.min(x, printAreaWidth - elementWidth));
  const clampedY = Math.max(0, Math.min(y, printAreaHeight - elementHeight));
  return { x: clampedX, y: clampedY };
}

/**
 * Calculate the print area dimensions given a page size and margin.
 */
export function getPrintArea(
  pageWidthMm: number,
  pageHeightMm: number,
  marginMm: number
): { width: number; height: number } {
  return {
    width: pageWidthMm - 2 * marginMm,
    height: pageHeightMm - 2 * marginMm,
  };
}

/**
 * Get the next z-order value (max of all elements + 1).
 * Returns 1 if there are no elements.
 */
export function getNextZOrder(elements: TemplateElement[]): number {
  if (elements.length === 0) return 1;
  return Math.max(...elements.map((el) => el.z_order)) + 1;
}


/**
 * Default dimensions (width_mm, height_mm) for each element type when first placed.
 */
const DEFAULT_DIMENSIONS: Record<ElementType, { width: number; height: number }> = {
  static_text: { width: 40, height: 8 },
  dynamic_text: { width: 40, height: 8 },
  barcode: { width: 40, height: 15 },
  qrcode: { width: 20, height: 20 },
  image: { width: 30, height: 20 },
  line: { width: 30, height: 2 },
  box: { width: 30, height: 20 },
  repeater: { width: 100, height: 66 },
};

/**
 * Default properties for each element type.
 */
function getDefaultProperties(type: ElementType): ElementProperties {
  switch (type) {
    case 'static_text':
      return {
        content: 'Text',
        font_family: 'Arial',
        font_size_pt: 12,
        font_bold: false,
        font_italic: false,
        alignment: 'left' as const,
      };
    case 'dynamic_text':
      return {
        placeholder: 'field_name',
        font_family: 'Arial',
        font_size_pt: 12,
        font_bold: false,
        font_italic: false,
        alignment: 'left' as const,
      };
    case 'barcode':
      return {
        format: 'code128' as const,
        data_source: 'static' as const,
        static_value: '1234567890',
        placeholder: '',
      };
    case 'qrcode':
      return {
        error_correction: 'M',
        data_source: 'static' as const,
        static_value: 'https://example.com',
        placeholder: '',
      };
    case 'image':
      return {
        source_url: '',
        source_type: 'url' as const,
      };
    case 'line':
      return {
        thickness_mm: 0.5,
        orientation: 'horizontal' as const,
      };
    case 'box':
      return {
        thickness_mm: 0.5,
        fill: false,
      };
    case 'repeater':
      return {
        data_key: 'items',
        row_height_mm: 6,
        max_rows: 10,
        show_header: true,
        show_row_lines: true,
        columns: [
          { label: 'No', placeholder: '_index', x_offset_mm: 0, width_mm: 10, font_family: 'Arial', font_size_pt: 7, alignment: 'center' as const },
          { label: 'Item', placeholder: 'item_name', x_offset_mm: 10, width_mm: 60, font_family: 'Arial', font_size_pt: 7, alignment: 'left' as const },
          { label: 'Qty', placeholder: 'qty', x_offset_mm: 70, width_mm: 20, font_family: 'Arial', font_size_pt: 7, alignment: 'center' as const },
        ],
      };
  }
}

/**
 * Generate a simple UUID v4 for element IDs.
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Create a new element with default dimensions and properties for a given type.
 * Position (xMm, yMm) is relative to the print area origin.
 * Note: snapping, clamping, and z-order are applied by the reducer (ADD_ELEMENT action).
 */
export function createDefaultElement(type: ElementType, xMm: number, yMm: number): TemplateElement {
  const dims = DEFAULT_DIMENSIONS[type];
  return {
    id: generateId(),
    type,
    x_mm: xMm,
    y_mm: yMm,
    width_mm: dims.width,
    height_mm: dims.height,
    z_order: 0, // will be set by reducer
    properties: getDefaultProperties(type),
  };
}
