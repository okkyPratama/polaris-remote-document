import { fetcher } from '@polaris/service'

export interface UomCodeDetail {
  codeId: string
  codeName: string
  sequence: number
  ownerId: string
  warehouseId: string
  status: 'AKTIF' | 'NONAKTIF'
}

export interface UomCodeHeader {
  id: string
  typeCode: string
  status: 'AKTIF' | 'NONAKTIF'
  details?: UomCodeDetail[]
}

function mapDetail(raw: Record<string, unknown>): UomCodeDetail {
  return {
    codeId: (raw.codeId as string) || '',
    codeName: (raw.codeName as string) || '',
    sequence: (raw.sequence as number) || 0,
    ownerId: (raw.ownerId as string) || '',
    warehouseId: (raw.warehouseId as string) || '',
    status: raw.status === 'ACTIVE' ? 'AKTIF' : 'NONAKTIF',
  }
}

function mapHeader(raw: Record<string, unknown>): UomCodeHeader {
  const details = raw.details as Record<string, unknown>[] | undefined
  return {
    id: raw.id as string,
    typeCode: (raw.typeCode as string) || '',
    status: raw.status === 'ACTIVE' ? 'AKTIF' : 'NONAKTIF',
    details: details?.map(mapDetail),
  }
}

export const uomCodeOptionsApi = {
  getAll: async (): Promise<UomCodeHeader[]> => {
    const res = await fetcher.post<{ data: Record<string, unknown>[] }>(
      '/master-data/codes/getAll',
      {
        filters: {
          and: [
            { field: 'typeCode', operator: 'ilike', value: '%UOM_GROUP%' },
            { field: 'status', operator: '=', value: 'ACTIVE' },
          ],
        },
        paging: { page: 1, pageSize: 50, sortBy: 'typeCode', sortDir: 'ASC' },
      }
    )
    return (res.data?.data || []).map(mapHeader)
  },

  getById: async (id: string): Promise<UomCodeHeader | undefined> => {
    const res = await fetcher.post<{ data: Record<string, unknown>[] }>(
      '/master-data/codes/detailById',
      { id }
    )
    const raw = res.data?.data?.[0]
    return raw ? mapHeader(raw) : undefined
  },
}
