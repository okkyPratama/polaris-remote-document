export type OwnerContextMode = 'free-text' | 'none' | 'single' | 'multi'

/** Trim blanks and dedupe while preserving first-seen order. */
export function normalizeOwnerContextIds(ids: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of ids) {
    const id = raw.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    result.push(id)
  }
  return result
}

/**
 * Resolve Owner UX mode from session scope.
 * - `null` / `undefined` → free-text (unrestricted / standalone)
 * - `[]` → none (no owner access)
 * - one id → single
 * - many ids → multi
 *
 * Never coerce with `?? []` — null and [] are distinct.
 */
export function resolveOwnerContextMode(
  ownerContextIds: string[] | null | undefined
): { mode: OwnerContextMode; options: string[] } {
  if (ownerContextIds === null || ownerContextIds === undefined) {
    return { mode: 'free-text', options: [] }
  }
  const options = normalizeOwnerContextIds(ownerContextIds)
  if (options.length === 0) return { mode: 'none', options: [] }
  if (options.length === 1) return { mode: 'single', options }
  return { mode: 'multi', options }
}

/** @deprecated Prefer resolveOwnerContextMode — kept as alias for filter call sites. */
export const resolveOwnerFilterMode = resolveOwnerContextMode
