/**
 * Reusable client-side validation utilities for the Label Template Builder.
 * Each validator returns `null` if valid, or an error message string if invalid.
 */

// --- Template Name Validation ---

export function validateTemplateName(name: string): string | null {
  if (!name || name.length === 0) {
    return 'Template name is required'
  }
  if (name.length > 100) {
    return `Template name must be 1-100 characters (currently ${name.length})`
  }
  return null
}

// --- Placeholder Name Validation ---

const PLACEHOLDER_REGEX = /^[a-z0-9_]{1,50}$/

export function validatePlaceholderName(name: string): string | null {
  if (!name) {
    return 'Placeholder name is required'
  }
  if (!PLACEHOLDER_REGEX.test(name)) {
    return 'Must be 1-50 chars: lowercase letters, digits, and underscore only'
  }
  return null
}

// --- Static Text Length Validation ---

export function validateStaticTextLength(text: string): string | null {
  if (text.length > 500) {
    return `Max 500 characters (currently ${text.length})`
  }
  return null
}

// --- Font Size Validation ---

export function validateFontSize(size: number): string | null {
  if (isNaN(size) || size < 4 || size > 72) {
    return 'Font size must be 4-72 pt'
  }
  return null
}

// --- Margin Validation ---

const VALID_MARGINS_LIST = [2.0, 2.5, 3.0]

export function validateMargin(margin: number): string | null {
  if (isNaN(margin) || !VALID_MARGINS_LIST.includes(margin)) {
    return 'Margin must be 2.0, 2.5, or 3.0 mm'
  }
  return null
}

// --- Re-export canvas utilities ---

export { snapToGrid, clampPosition, getPrintArea, enforceMinimumSize } from './canvasUtils'
