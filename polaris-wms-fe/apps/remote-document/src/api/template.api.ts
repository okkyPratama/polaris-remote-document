import { fetcher } from '@polaris/service'
import type {
  Template,
  TemplateSummary,
  TemplateSaveRequest,
  TemplateSearchParams,
  SearchRequest,
  TemplateAssignment,
  TemplateAssignRequest,
  GetByScopeRequest,
  GenerateRequest,
  CropRequest,
  PreviewRequest,
} from '../types/template.types'

// ─── Default headers for document service ─────────────────────────────────────
// Backend requires `user-username` on all endpoints.
// In production this comes from auth. In dev standalone we fallback to 'system'.
const DEFAULT_HEADERS = {
  'user-username': localStorage.getItem('polaris_username') || 'system',
}

// Document host: absolute origin in deployed builds (env-dev/prod), empty in local dev.
//   - Local dev (empty): fetcher calls stay relative → fetcher adds `/api/v1`, Vite proxy adds `/document`.
//     Blob calls emit `/api/v1/...` → Vite proxy adds `/document`.
//   - Deployed (set): both styles emit absolute `<host>/document/api/v1/...`.
//     Absolute URLs make the shared fetcher ignore its own `baseURL='/api/v1'` (no path doubling),
//     and put `/document` BEFORE `/api/v1` exactly as the backend expects.
const DOC_HOST = (import.meta.env.VITE_DOCUMENT_API_URL as string | undefined)?.replace(/\/$/, '') || ''

// Path for fetcher.* calls (getAll, save, edit, delete, detailById, assignments).
const apiUrl = (path: string): string => (DOC_HOST ? `${DOC_HOST}/document/api/v1${path}` : path)

// Path for native fetch() blob calls (generate, preview, proxyPdf, cropPdf).
const blobUrl = (path: string): string => (DOC_HOST ? `${DOC_HOST}/document/api/v1${path}` : `/api/v1${path}`)


// ─── Template API ─────────────────────────────────────────────────────────────
// Backend: polaris-document-service on /document/api/v1/...
// Fetcher calls send `/…` (fetcher adds `/api/v1`), proxy/ingress adds `/document`.
// Blob fetch calls send `/api/v1/…`, proxy/ingress adds `/document`.

export const templateApi = {
  /**
   * List all templates — POST /templates/getAll
   * Response: { data: { data: TemplateSummary[], paging: {...} } }
   */
  getAll: async (params?: TemplateSearchParams): Promise<{ data: TemplateSummary[]; total: number }> => {
    const filters: SearchRequest['filters'] = {}

    // Build filter conditions if needed
    if (params?.templateType) {
      filters.and = [{ field: 'templateType', operator: '=', value: params.templateType }]
    }
    if (params?.search) {
      const searchConditions = filters.and || []
      searchConditions.push({ field: 'name', operator: 'like', value: params.search })
      filters.and = searchConditions
    }

    const body: Partial<SearchRequest> = {
      paging: {
        page: params?.page || 1,
        pageSize: params?.pageSize || 25,
      },
      filters,
    }

    const res = await fetcher.post<{
      data: TemplateSummary[]
      paging: { totalItems: number; count: number; page: number; pageSize: number; totalPages: number }
    }>(apiUrl('/templates/getAll'), body, { headers: DEFAULT_HEADERS })

    const data = res.data?.data || []
    const total = res.data?.paging?.totalItems || res.data?.paging?.count || data.length

    return { data, total }
  },

  /**
   * Get template by ID — POST /templates/detailById
   * Response: { data: { data: [Template], paging: {...} } }
   */
  getById: async (id: string): Promise<Template> => {
    const res = await fetcher.post<{ data: Template[] }>(
      apiUrl('/templates/detailById'),
      { id },
      { headers: DEFAULT_HEADERS }
    )
    const raw = res.data?.data?.[0]
    if (!raw) throw new Error('Template tidak ditemukan')
    return raw
  },

  /**
   * Create new template — POST /templates/save
   * Now returns the saved template data (including id) from backend.
   */
  save: async (payload: TemplateSaveRequest): Promise<Template> => {
    const res = await fetcher.post<{ data: Template[] }>(apiUrl('/templates/save'), payload, { headers: DEFAULT_HEADERS })
    const saved = res.data?.data?.[0]
    if (!saved) throw new Error('Template saved but response missing data')
    return saved
  },

  /**
   * Update existing template — POST /templates/edit
   */
  edit: async (payload: TemplateSaveRequest & { id: string }): Promise<string> => {
    const res = await fetcher.post(apiUrl('/templates/edit'), payload, { headers: DEFAULT_HEADERS })
    return res.externalDesc || ''
  },

  /**
   * Delete template — POST /templates/delete
   */
  remove: async (id: string): Promise<string> => {
    const res = await fetcher.post(apiUrl('/templates/delete'), { id }, { headers: DEFAULT_HEADERS })
    return res.externalDesc || ''
  },

  /**
   * Generate PDF — POST /templates/generate
   * Uses direct fetch for blob response.
   */
  generate: async (templateId: string, request: GenerateRequest): Promise<Blob> => {
    const res = await fetch(blobUrl('/templates/generate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'user-username': DEFAULT_HEADERS['user-username'] },
      body: JSON.stringify({ templateId, data: request.data }),
    })
    if (!res.ok) throw new Error(`Generate failed: ${res.status}`)
    return res.blob()
  },

  /**
   * Preview (sandbox render) — POST /documents/preview
   */
  preview: async (request: PreviewRequest): Promise<Blob> => {
    const res = await fetch(blobUrl('/documents/preview'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    if (!res.ok) throw new Error(`Preview failed: ${res.status}`)
    return res.blob()
  },

  /**
   * Proxy a remote PDF — GET /pdf/proxyPdf?url=...
   */
  proxyPdf: async (url: string): Promise<Blob> => {
    const res = await fetch(blobUrl(`/pdf/proxyPdf?url=${encodeURIComponent(url)}`))
    if (!res.ok) throw new Error(`Proxy PDF failed: ${res.status}`)
    return res.blob()
  },

  /**
   * Crop PDF — POST /pdf/cropPdf
   */
  cropPdf: async (req: CropRequest): Promise<Blob> => {
    const res = await fetch(blobUrl('/pdf/cropPdf'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    if (!res.ok) throw new Error(`Crop PDF failed: ${res.status}`)
    return res.blob()
  },
}

// ─── Template Assignment API ──────────────────────────────────────────────────

export const templateAssignmentApi = {
  /**
   * Assign template — POST /template-assignments/assign
   */
  assign: async (payload: TemplateAssignRequest): Promise<string> => {
    const res = await fetcher.post(apiUrl('/template-assignments/assign'), payload, { headers: DEFAULT_HEADERS })
    return res.externalDesc || ''
  },

  /**
   * Get assignments by scope — POST /template-assignments/getByScope
   */
  getByScope: async (payload: GetByScopeRequest): Promise<TemplateAssignment[]> => {
    const res = await fetcher.post<{ data: TemplateAssignment[] }>(
      apiUrl('/template-assignments/getByScope'),
      payload,
      { headers: DEFAULT_HEADERS }
    )
    return res.data?.data || (res.data as unknown as TemplateAssignment[]) || []
  },

  /**
   * Get assignments by template ID — POST /template-assignments/getByTemplateId
   */
  getByTemplateId: async (templateId: string): Promise<TemplateAssignment[]> => {
    const res = await fetcher.post<{ data: TemplateAssignment[] }>(
      apiUrl('/template-assignments/getByTemplateId'),
      { id: templateId },
      { headers: DEFAULT_HEADERS }
    )
    return res.data?.data || (res.data as unknown as TemplateAssignment[]) || []
  },
}
