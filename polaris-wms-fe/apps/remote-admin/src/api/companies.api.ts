import { fetcher } from '@polaris/service'
import type { Company, CompanyWarehouse, CompanyFormData } from '../types/company.types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function mapApiCompany(raw: Record<string, unknown>): Company {
  // Map warehouses array jika ada (dari detail endpoint)
  const rawWarehouses = raw.warehouses as Record<string, unknown>[] | undefined
  const warehouses: CompanyWarehouse[] | undefined = rawWarehouses?.map((w) => ({
    code: w.code as string,
    name: w.name as string,
    city: (w.city as string) || '',
    status: (w.status as string) === 'ACTIVE' ? 'AKTIF' : 'NONAKTIF',
  }))

  return {
    id: raw.id as string,
    code: raw.code as string,
    name: raw.name as string,
    companyGroupId: (raw.CompanyGroupID as string) || (raw.companyGroupId as string) || undefined,
    companyGroupCode: (raw.CompanyGroupCode as string) || (raw.companyGroupCode as string) || '',
    companyGroupName: (raw.CompanyGroupName as string) || (raw.companyGroupName as string) || '',
    contactName: (raw.contactName as string) || '',
    contactEmail: (raw.contactEmail as string) || '',
    contactPhone: (raw.contactPhone as string) || '',
    address: (raw.address as string) || '',
    city: (raw.city as string) || '',
    province: (raw.province as string) || '',
    npwp: (raw.npwp as string) || (raw.taxId as string) || '',
    warehouseCount: (raw.warehouseCount as number) || 0,
    warehouses,
    status: (raw.status as string) === 'ACTIVE' ? 'AKTIF' : 'NONAKTIF',
    createdAt: formatDate(raw.createdAt as string | undefined),
    createdBy: raw.createdBy as string | undefined,
  }
}

export const companiesApi = {
  getById: async (id: string): Promise<Company> => {
    const body = { id }
    const res = await fetcher.post<{ data: Record<string, unknown>[] }>(
      '/master-data/companies/detailById',
      body
    )
    const raw = res.data?.data?.[0]
    if (!raw) throw new Error('Company not found')
    return mapApiCompany(raw)
  },

  getAll: async (params?: {
    search?: string
    status?: 'ALL' | 'AKTIF' | 'NONAKTIF'
    page?: number
    pageSize?: number
    companyGroupIdNull?: boolean
  }): Promise<{ data: Company[]; total: number }> => {
    const filters: { field: string; operator: string; value: unknown }[] = []

    if (params?.search) {
      filters.push({ field: 'name', operator: 'ilike', value: `%${params.search}%` })
    }
    if (params?.status && params.status !== 'ALL') {
      filters.push({ field: 'status', operator: '=', value: params.status === 'AKTIF' ? 'ACTIVE' : 'INACTIVE' })
    }
    if (params?.companyGroupIdNull) {
      filters.push({ field: 'CompanyGroupID', operator: 'isnull', value: '' })
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
    }>('/master-data/companies/getAll', body)

    const data = (res.data?.data || []).map(mapApiCompany)
    const total = res.data?.paging?.totalItems ?? res.data?.paging?.count ?? data.length
    return { data, total }
  },

  create: async (payload: CompanyFormData): Promise<string> => {
    const mappingBody = {
      code: payload.code,
      name: payload.name,
      companyGroupId: payload.companyGroupId,
      contactName: payload.contactName,
      contactEmail: payload.email,
      contactPhone: payload.phone,
      address: payload.address,
      status: payload.status === 'AKTIF' ? 'ACTIVE' : 'INACTIVE',
    }
    const res = await fetcher.post('/master-data/companies/save', mappingBody)
    return res.externalDesc || ''
  },

  update: async (id: string, payload: CompanyFormData): Promise<string> => {
    const mappingBody = {
      id,
      name: payload.name,
      contactName: payload.contactName,
      contactEmail: payload.email,
      contactPhone: payload.phone,
      address: payload.address,
      status: payload.status === 'AKTIF' ? 'ACTIVE' : 'INACTIVE',
    }
    const res = await fetcher.post('/master-data/companies/edit', mappingBody)
    return res.externalDesc || ''
  },

  delete: async (id: string): Promise<string> => {
    const body = { id }
    const res = await fetcher.post('/master-data/companies/delete', body)
    return res.externalDesc || ''
  },

  assignWarehouse: async (companyId: string, warehouseId: string): Promise<string> => {
    const body = { companyId, warehouseId }
    const res = await fetcher.post('/master-data/companies/assignWarehouse', body)
    return res.externalDesc || ''
  },
}
