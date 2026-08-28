import { fetcher } from '@polaris/service'
import type { CompanyGroup, CompanyGroupEntity, CompanyGroupFormData } from '../types/companyGroup.types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function mapApiCompanyGroup(raw: Record<string, unknown>): CompanyGroup {
  const rawCompanies = raw.companies as Record<string, unknown>[] | undefined
  const entities: CompanyGroupEntity[] | undefined = rawCompanies?.map((c) => ({
    code: (c.code as string) || '',
    name: (c.name as string) || '',
    city: '',
    status: (c.status as string) === 'ACTIVE' ? 'AKTIF' as const : 'NONAKTIF' as const,
  }))

  return {
    id: raw.id as string,
    code: raw.code as string,
    name: raw.name as string,
    contactName: (raw.contactName as string) || '',
    contactEmail: (raw.contactEmail as string) || '',
    contactPhone: (raw.contactPhone as string) || '',
    status: (raw.status as string) === 'ACTIVE' ? 'AKTIF' : 'NONAKTIF',
    companyCount: (raw.companyCount as number) || 0,
    description: (raw.description as string) || '',
    address: (raw.address as string) || '',
    industry: (raw.industry as string) || '',
    createdAt: formatDate(raw.createdAt as string | undefined),
    createdBy: raw.createdBy as string | undefined,
    entities,
  }
}

export const companyGroupApi = {
  getAll: async (params?: {
    search?: string
    status?: 'ALL' | 'AKTIF' | 'NONAKTIF'
    page?: number
    pageSize?: number
  }): Promise<{ data: CompanyGroup[]; total: number }> => {
    const filters: { field: string; operator: string; value: unknown }[] = []

    if (params?.search) {
      filters.push({ field: 'name', operator: 'ilike', value: `%${params.search}%` })
    }
    if (params?.status && params.status !== 'ALL') {
      filters.push({ field: 'status', operator: '=', value: params.status === 'AKTIF' ? 'ACTIVE' : 'INACTIVE' })
    }

    const body = {
      filters: { and: filters },
      paging: {
        page: params?.page || 1,
        pageSize: params?.pageSize || 25,
        sortBy: 'created_at',
        sortDir: 'DESC',
      },
    }
    const res = await fetcher.post<{
      data: Record<string, unknown>[]
      paging?: { totalItems?: number; count?: number }
    }>('/master-data/company-groups/getAll', body)

    const data = (res.data?.data || []).map(mapApiCompanyGroup)
    const total = res.data?.paging?.totalItems ?? res.data?.paging?.count ?? data.length
    return { data, total }
  },

  getById: async (id: string): Promise<CompanyGroup | undefined> => {
    const body = { id }
    const res = await fetcher.post<{ data: Record<string, unknown>[] }>(
      '/master-data/company-groups/detailById',
      body
    )
    const raw = res.data?.data?.[0]
    if (!raw) return undefined
    return mapApiCompanyGroup(raw)
  },

  create: async (payload: CompanyGroupFormData): Promise<string> => {
    const mappingBody = {
      code: payload.code,
      name: payload.name,
      contactName: payload.contactName,
      contactEmail: payload.contactEmail,
      contactPhone: payload.contactPhone,
      address: payload.address,
      status: payload.status === 'AKTIF' ? 'ACTIVE' : 'INACTIVE',
    }
    const res = await fetcher.post('/master-data/company-groups/save', mappingBody)
    return res.externalDesc || ''
  },

  update: async (id: string, payload: CompanyGroupFormData): Promise<string> => {
    const mappingBody = {
      id,
      name: payload.name,
      contactName: payload.contactName,
      contactEmail: payload.contactEmail,
      contactPhone: payload.contactPhone,
      address: payload.address,
      status: payload.status === 'AKTIF' ? 'ACTIVE' : 'INACTIVE',
    }
    const res = await fetcher.post('/master-data/company-groups/edit', mappingBody)
    return res.externalDesc || ''
  },

  delete: async (id: string): Promise<string> => {
    const body = { id }
    const res = await fetcher.post('/master-data/company-groups/delete', body)
    return res.externalDesc || ''
  },

  assignCompany: async (companyGroupId: string, companyId: string): Promise<string> => {
    const body = { companyGroupId, companyId }
    const res = await fetcher.post('/master-data/company-groups/assignCompany', body)
    return res.externalDesc || ''
  },
}
