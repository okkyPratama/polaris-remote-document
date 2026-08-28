/**
 * Reusable client-side validation utilities for the Label Template Builder.
 *
 * Each validator returns `null` if valid, or an error message string if invalid.
 *
 * Validates: Requirements 1.6, 2.6, 3.2, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4
 */

// --- Template Name Validation (Requirement 1.6) ---

/**
 * Validate template name: must be 1-100 characters.
 * Returns null if valid, error message if invalid.
 */
export function validateTemplateName(name: string): string | null {
  if (!name || name.length === 0) {
    return 'Template name is required';
  }
  if (name.length > 100) {
    return `Template name must be 1-100 characters (currently ${name.length})`;
  }
  return null;
}

// --- Placeholder Name Validation (Requirements 4.2, 4.3) ---

const PLACEHOLDER_REGEX = /^[a-z0-9_]{1,50}$/;

/**
 * Validate placeholder name: must match pattern [a-z0-9_]{1,50}.
 * Returns null if valid, error message if invalid.
 */
export function validatePlaceholderName(name: string): string | null {
  if (!name) {
    return 'Placeholder name is required';
  }
  if (!PLACEHOLDER_REGEX.test(name)) {
    return 'Must be 1-50 chars: lowercase letters, digits, and underscore only';
  }
  return null;
}

// --- Static Text Length Validation (Requirement 4.1) ---

/**
 * Validate static text content: max 500 characters.
 * Returns null if valid, error message if invalid.
 */
export function validateStaticTextLength(text: string): string | null {
  if (text.length > 500) {
    return `Max 500 characters (currently ${text.length})`;
  }
  return null;
}

// --- Font Size Validation (Requirement 4.4) ---

/**
 * Validate font size: must be between 4 and 72 (inclusive).
 * Returns null if valid, error message if invalid.
 */
export function validateFontSize(size: number): string | null {
  if (isNaN(size) || size < 4 || size > 72) {
    return 'Font size must be 4–72 pt';
  }
  return null;
}

// --- Margin Validation (Requirement 2.6) ---

const VALID_MARGINS = [2.0, 2.5, 3.0];

/**
 * Validate margin value: must be one of {2.0, 2.5, 3.0} mm.
 * Returns null if valid, error message if invalid.
 */
export function validateMargin(margin: number): string | null {
  if (isNaN(margin) || !VALID_MARGINS.includes(margin)) {
    return 'Margin must be 2.0, 2.5, or 3.0 mm';
  }
  return null;
}

// --- Re-export coordinate snapping and boundary clamping (Requirements 3.2, 3.5, 3.6) ---

export {
  snapToGrid,
  clampPosition,
  getPrintArea,
  enforceMinimumSize,
  getMinimumSize,
} from '@/utils/canvasUtils';
