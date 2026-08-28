import { gatewayHeaders } from '../config'
import { queryClient } from '../query'
import { resolveWarehouseTimezone } from './timezone'

export interface WarehouseContextItem {
  id: string
  code: string
  name: string
  company?: string
}

export const WAREHOUSE_CHANGED_EVENT = 'polaris:warehouse-changed'

const STORAGE_KEYS = {
  TOKEN: 'token',
  SELECTED_WAREHOUSE: 'selected_warehouse',
  AUTHORIZED_WAREHOUSES: 'authorized_warehouses',
} as const

function getSessionApiBase(): string {
  const base = import.meta.env?.VITE_API_BASE_URL ?? import.meta.env?.VITE_API_URL ?? ''
  if (!base) return '/api/v1'
  return base.endsWith('/api/v1') ? base : `${base.replace(/\/$/, '')}/api/v1`
}

export function getAuthorizedWarehouses(): WarehouseContextItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTHORIZED_WAREHOUSES)
    return raw ? (JSON.parse(raw) as WarehouseContextItem[]) : []
  } catch {
    return []
  }
}

export function getSelectedWarehouse(): WarehouseContextItem | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SELECTED_WAREHOUSE)
    return raw ? (JSON.parse(raw) as WarehouseContextItem) : null
  } catch {
    return null
  }
}

async function postSwitchContext(sessionToken: string, warehouseId: string): Promise<void> {
  const response = await fetch(`${getSessionApiBase()}/sessions/switchContext`, {
    method: 'POST',
    headers: {
      ...gatewayHeaders,
      'X-Session-Token': sessionToken,
      'Content-Type': 'application/json',
      'user-username': localStorage.getItem('polaris_username') || '',
    },
    body: JSON.stringify({ warehouseId }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const message =
      (errorData as { externalDesc?: string })?.externalDesc ||
      'Gagal mengganti konteks warehouse'
    throw new Error(message)
  }
}

function dispatchWarehouseChanged(warehouse: WarehouseContextItem): void {
  window.dispatchEvent(new CustomEvent(WAREHOUSE_CHANGED_EVENT, { detail: warehouse }))
}

/** Switch active warehouse session — same contract as shell AuthProvider.setSelectedWarehouse. */
export async function switchWarehouseContext(warehouse: WarehouseContextItem): Promise<void> {
  const previousStored = localStorage.getItem(STORAGE_KEYS.SELECTED_WAREHOUSE)
  const stored: WarehouseContextItem = {
    id: warehouse.id,
    code: warehouse.code,
    name: warehouse.name,
    company: warehouse.company ?? '',
  }

  queryClient.clear()
  localStorage.setItem(STORAGE_KEYS.SELECTED_WAREHOUSE, JSON.stringify(stored))

  const token = localStorage.getItem(STORAGE_KEYS.TOKEN)
  if (!token) {
    dispatchWarehouseChanged(stored)
    return
  }

  try {
    await postSwitchContext(token, warehouse.id)
    await resolveWarehouseTimezone(warehouse.id)
    dispatchWarehouseChanged(stored)
  } catch (err) {
    queryClient.clear()
    if (previousStored) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_WAREHOUSE, previousStored)
    } else {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_WAREHOUSE)
    }
    throw err
  }
}
