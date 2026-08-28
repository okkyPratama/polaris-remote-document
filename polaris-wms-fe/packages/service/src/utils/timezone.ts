/**
 * Timezone Utility — Resolve & manage timezone per warehouse context.
 *
 * Flow:
 * 1. Setelah login + pilih warehouse → call resolveWarehouseTimezone(warehouseId)
 * 2. Utility fetch SYS_TIMEZONE dari backend config resolve API
 * 3. Simpan timezone ke localStorage
 * 4. Semua module bisa pakai getWarehouseTimezone() dan formatTimestamp() untuk convert
 *
 * Usage:
 *   import { resolveWarehouseTimezone, getWarehouseTimezone, formatTimestamp } from '@polaris/service'
 *
 *   // Saat switch warehouse
 *   await resolveWarehouseTimezone(warehouseId)
 *
 *   // Saat display timestamp
 *   const display = formatTimestamp('2026-07-01T10:00:00Z') // → "01 Jul 2026 17:00" (WIB)
 */

import { fetcher } from '../fetcher'

const STORAGE_KEY = 'polaris_warehouse_timezone'
const DEFAULT_TIMEZONE = 'Asia/Jakarta'

export interface WarehouseTimezoneData {
  warehouseId: string
  timezone: string
  resolvedAt: string
}

/**
 * Resolve timezone dari backend config resolve API dan simpan ke localStorage.
 * Dipanggil setelah user pilih/switch warehouse.
 *
 * @param warehouseId - UUID warehouse yang aktif
 */
export async function resolveWarehouseTimezone(
  warehouseId: string,
): Promise<string> {
  try {
    const res = await fetcher.post<{ data: Record<string, unknown>[] }>(
      '/master-data/master-configs/resolve',
      { configKey: 'SYS_TIMEZONE', warehouseId }
    )

    const data = res.data?.data?.[0] || (res.data as unknown as Record<string, unknown>)
    const resolvedValue = (data?.resolvedValue as string) || (data?.configValue as string) || DEFAULT_TIMEZONE

    setWarehouseTimezone(warehouseId, resolvedValue)
    return resolvedValue
  } catch (err) {
    console.warn('[timezone] Error resolving SYS_TIMEZONE:', err)
    setWarehouseTimezone(warehouseId, DEFAULT_TIMEZONE)
    return DEFAULT_TIMEZONE
  }
}

/**
 * Set timezone ke localStorage secara manual (tanpa call API).
 * Berguna untuk testing atau saat data sudah ada.
 */
export function setWarehouseTimezone(warehouseId: string, timezone: string): void {
  const data: WarehouseTimezoneData = {
    warehouseId,
    timezone,
    resolvedAt: new Date().toISOString(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

/**
 * Ambil timezone warehouse aktif dari localStorage.
 * Fallback ke DEFAULT_TIMEZONE jika belum di-resolve.
 */
export function getWarehouseTimezone(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_TIMEZONE
    const data: WarehouseTimezoneData = JSON.parse(stored)
    return data.timezone || DEFAULT_TIMEZONE
  } catch {
    return DEFAULT_TIMEZONE
  }
}

/**
 * Ambil full data timezone dari localStorage (termasuk warehouseId dan resolvedAt).
 */
export function getWarehouseTimezoneData(): WarehouseTimezoneData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored)
  } catch {
    return null
  }
}

/**
 * Clear timezone dari localStorage (dipanggil saat logout).
 */
export function clearWarehouseTimezone(): void {
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Format ISO timestamp ke timezone warehouse.
 * Semua timestamp dari API (UTC) di-convert ke timezone warehouse saat display.
 *
 * @param isoString - Timestamp dalam format ISO/UTC dari API
 * @param options - Intl.DateTimeFormat options (override)
 * @returns Formatted string dalam timezone warehouse
 *
 * @example
 * formatTimestamp('2026-07-01T10:00:00Z')
 * // → "01 Jul 2026 17:00" (jika timezone = Asia/Jakarta, UTC+7)
 *
 * formatTimestamp('2026-07-01T10:00:00Z', { dateStyle: 'full', timeStyle: 'short' })
 * // → "Rabu, 1 Juli 2026 17.00" (full format)
 */
export function formatTimestamp(
  isoString: string | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!isoString) return '—'

  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return isoString

    const timezone = getWarehouseTimezone()

    const defaultOptions: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone,
    }

    const formatter = new Intl.DateTimeFormat('id-ID', { ...defaultOptions, ...options })
    return formatter.format(date)
  } catch {
    return isoString
  }
}

/**
 * Format ISO timestamp hanya tanggal (tanpa waktu).
 *
 * @example
 * formatDate('2026-07-01T10:00:00Z') // → "01 Jul 2026"
 */
export function formatDate(
  isoString: string | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!isoString) return '—'

  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return isoString

    const timezone = getWarehouseTimezone()

    const defaultOptions: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: timezone,
    }

    const formatter = new Intl.DateTimeFormat('id-ID', { ...defaultOptions, ...options })
    return formatter.format(date)
  } catch {
    return isoString
  }
}

/**
 * Format ISO timestamp hanya waktu (tanpa tanggal).
 *
 * @example
 * formatTime('2026-07-01T10:00:00Z') // → "17:00"
 */
export function formatTime(
  isoString: string | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!isoString) return '—'

  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return isoString

    const timezone = getWarehouseTimezone()

    const defaultOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone,
    }

    const formatter = new Intl.DateTimeFormat('id-ID', { ...defaultOptions, ...options })
    return formatter.format(date)
  } catch {
    return isoString
  }
}
