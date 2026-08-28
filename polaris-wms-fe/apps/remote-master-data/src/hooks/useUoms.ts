import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  uomCodeOptionsApi,
  type UomCodeDetail,
} from '../api/uom-code-options.api'
import { uomApi } from '../api/uom.api'
import type {
  UomCodeOption,
  UomConvertRequest,
  UomDisplayRequest,
  UomHierarchyFormData,
  UomSearchParams,
} from '../types/uom.types'

const QUERY_KEY = 'uoms'
const UOM_MASTER_CODE_TYPE = 'UOM_GROUP'

function isBlankScope(value?: string | null): boolean {
  return !value || value.trim() === ''
}

/**
 * Load active UOM packaging codes from Master Code `UOM_GROUP`.
 * Owner-specific details override globals for the same `codeId`.
 * Never falls back to hardcoded codes.
 */
export async function fetchUomCodeOptions(ownerId?: string): Promise<UomCodeOption[]> {
  const normalizedOwnerId = (ownerId ?? '').trim()

  const headers = await uomCodeOptionsApi.getAll()

  const header = headers.find(
    (code) => code.typeCode === UOM_MASTER_CODE_TYPE && code.status === 'AKTIF'
  )
  if (!header) {
    throw new Error(
      'Master Code UOM_GROUP tidak tersedia atau tidak aktif. Hubungi admin untuk mengaktifkan kode UOM.'
    )
  }

  const full = await uomCodeOptionsApi.getById(header.id)
  if (!full) {
    throw new Error(
      'Detail Master Code UOM_GROUP tidak ditemukan. Hubungi admin untuk memeriksa konfigurasi kode UOM.'
    )
  }

  const details = full.details ?? []
  const eligible = details.filter((detail) => {
    if (detail.status !== 'AKTIF') return false
    if (!isBlankScope(detail.warehouseId)) return false

    const detailOwnerId = detail.ownerId.trim()
    if (detailOwnerId === '') return true
    return normalizedOwnerId !== '' && detailOwnerId === normalizedOwnerId
  })

  const byCodeId = new Map<string, UomCodeDetail>()
  for (const detail of eligible) {
    const existing = byCodeId.get(detail.codeId)
    if (!existing) {
      byCodeId.set(detail.codeId, detail)
      continue
    }

    const existingIsOwnerSpecific = !isBlankScope(existing.ownerId)
    const incomingIsOwnerSpecific = !isBlankScope(detail.ownerId)
    // Owner-specific may override global for the same codeId.
    if (incomingIsOwnerSpecific && !existingIsOwnerSpecific) {
      byCodeId.set(detail.codeId, detail)
    }
  }

  return Array.from(byCodeId.values())
    .sort((left, right) => {
      if (left.sequence !== right.sequence) return left.sequence - right.sequence
      return left.codeId.localeCompare(right.codeId)
    })
    .map((detail) => ({
      code: detail.codeId,
      name: detail.codeName,
    }))
}

export function useUoms(params?: UomSearchParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => uomApi.getAll(params),
    enabled: options?.enabled ?? true,
  })
}

export function useUomDetail(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => uomApi.getById(id!),
    enabled: !!id,
  })
}

export function useUomCodeOptions(ownerId?: string) {
  const normalizedOwnerId = (ownerId ?? '').trim()

  return useQuery({
    queryKey: ['uom', 'code-options', normalizedOwnerId],
    queryFn: () => fetchUomCodeOptions(normalizedOwnerId),
  })
}

export function useCreateUom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UomHierarchyFormData) => uomApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useUpdateUom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UomHierarchyFormData }) =>
      uomApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

/** Soft-delete hierarchy. UI Hapus is deferred until Inventory usage guard exists. */
export function useDeleteUom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => uomApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

/** Read-only conversion helper — does not invalidate UOM list/detail cache. */
export function useConvertUom() {
  return useMutation({
    mutationFn: (payload: UomConvertRequest) => uomApi.convert(payload),
  })
}

/** Read-only display helper — does not invalidate UOM list/detail cache. */
export function useDisplayUom() {
  return useMutation({
    mutationFn: (payload: UomDisplayRequest) => uomApi.display(payload),
  })
}
