import axios from 'axios'
import { toast } from 'sonner'
import type { Template, TemplateSummary, GenerateRequest } from '@/types/template'
import type { SearchRequest } from '@/types/search'

// ─── Default header ───────────────────────────────────────────────────────────
// Backend requires `user-username` header on write operations.
// Hardcoded sementara karena belum ada auth layer di frontend ini.
const DEFAULT_USERNAME = 'system'

// ─── Polaris response envelope ────────────────────────────────────────────────

export interface PolarisResponse<T> {
  httpCode: number
  externalCode: number
  externalDesc: string
  data: T | null
  errorMessage?: string[]
}

export interface PolarisListData<T> {
  data: T[]
  paging: {
    page: number
    pageSize: number
    count: number
    totalItems: number
    totalPages: number
  }
}

// ─── Axios instance ───────────────────────────────────────────────────────────
// Vite proxy forwards:
//   /api/v1/...  → http://localhost:8082/document/api/v1/...
//   /api/pdf/... → http://localhost:8082/document/api/v1/pdf/...

const apiClient = axios.create({
  baseURL: '/',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

// ─── Request interceptor ──────────────────────────────────────────────────────

apiClient.interceptors.request.use((config) => {
  config.headers['X-Request-Id'] = crypto.randomUUID()
  config.headers['X-Platform'] = 'web'
  return config
})

// ─── Response interceptor ─────────────────────────────────────────────────────

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (!err.response) {
      toast.error('Koneksi Gagal', {
        description: 'Tidak dapat terhubung ke server. Periksa koneksi Anda.',
        duration: Infinity,
      })
      return Promise.reject({ message: 'Tidak dapat terhubung ke server.' })
    }

    const status: number = err.response?.status
    if (status === 400) {
      // 400 errors are handled per-call — don't show global toast
      // (caller will extract errorMessage[])
    } else if (status === 403) {
      toast.error('Akses Ditolak', {
        description: 'Anda tidak memiliki izin untuk melakukan aksi ini.',
        duration: Infinity,
      })
    } else if (status === 404) {
      // 404 handled per-call
    } else if (status >= 500) {
      toast.error('Kesalahan Server', {
        description: 'Terjadi kesalahan pada server. Silakan coba lagi nanti.',
        duration: Infinity,
      })
    }

    return Promise.reject(err)
  }
)

// ─── Helper: unwrap Polaris envelope ──────────────────────────────────────────

function unwrap<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'httpCode' in raw) {
    const resp = raw as PolarisResponse<T>
    return resp.data as T
  }
  return raw as T
}

function unwrapList<T>(raw: unknown): { items: T[]; paging: PolarisListData<T>['paging'] | null } {
  if (raw && typeof raw === 'object' && 'httpCode' in raw) {
    const resp = raw as PolarisResponse<PolarisListData<T>>
    const inner = resp.data
    if (inner && 'data' in inner) {
      return { items: inner.data ?? [], paging: inner.paging ?? null }
    }
    // fallback — data is the array directly
    if (Array.isArray(inner)) return { items: inner as T[], paging: null }
  }
  if (Array.isArray(raw)) return { items: raw as T[], paging: null }
  return { items: [], paging: null }
}

// ─── Template API ─────────────────────────────────────────────────────────────
//
// Backend routes (prefix: /document/api/v1/templates → proxied as /api/v1/templates):
//   POST /add          — create template
//   POST /edit         — update template
//   POST /delete       — delete template
//   POST /detailById   — get one by id
//   POST /getAll       — paginated list
//   POST /generate     — generate PDF (returns binary)
//
// Backend routes (prefix: /document/api/v1/pdf → proxied as /api/pdf):
//   GET  /proxyPdf?url=... — proxy a remote PDF
//   POST /cropPdf          — crop a PDF

export const templatesApi = {
  /**
   * List all templates — POST /api/v1/templates/getAll
   * Supports optional search / paging via SearchRequest.
   * Backend returns TemplateSummaryResp with camelCase date fields.
   */
  list: async (searchReq?: Partial<SearchRequest>): Promise<TemplateSummary[]> => {
    const body: Partial<SearchRequest> = searchReq ?? {}
    const res = await apiClient.post('/api/v1/templates/getAll', body)
    const { items } = unwrapList<BackendTemplateSummaryResp>(res.data)
    return items.map(normalizeTemplateSummaryResp)
  },

  /**
   * Get template by ID — POST /api/v1/templates/detailById
   * Body: { id: string }
   * Response: { data: { data: [ TemplateResp ], paging: {...} } }
   *
   * Backend wraps single detail inside same paging envelope as getAll.
   * We extract data[0] and normalize field names.
   */
  getById: async (id: string): Promise<Template> => {
    const res = await apiClient.post('/api/v1/templates/detailById', { id })
    const { items } = unwrapList<BackendTemplateResp>(res.data)
    const raw = items[0]
    if (!raw) throw new Error('Template tidak ditemukan')
    return normalizeTemplateResp(raw)
  },

  /**
   * Create new template — POST /api/v1/templates/add
   * Requires header: user-username
   * Body: TemplateReq (without id — backend generates it)
   */
  create: async (
    payload: Omit<Template, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Template> => {
    const body = toBackendTemplateReq(payload)
    const res = await apiClient.post('/api/v1/templates/add', body, {
      headers: { 'user-username': DEFAULT_USERNAME },
    })
    return unwrap<Template>(res.data)
  },

  /**
   * Update existing template — POST /api/v1/templates/edit
   * Requires header: user-username
   * Body: TemplateReq (with id)
   */
  update: async (
    id: string,
    payload: Omit<Template, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Template> => {
    const body = { id, ...toBackendTemplateReq(payload) }
    const res = await apiClient.post('/api/v1/templates/edit', body, {
      headers: { 'user-username': DEFAULT_USERNAME },
    })
    return unwrap<Template>(res.data)
  },

  /**
   * Delete template — POST /api/v1/templates/delete
   * Requires header: user-username
   * Body: { id: string }
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.post(
      '/api/v1/templates/delete',
      { id },
      { headers: { 'user-username': DEFAULT_USERNAME } }
    )
  },

  /**
   * Generate PDF — POST /api/v1/templates/generate
   * Body: { templateId, data }  — returns binary PDF blob
   */
  generate: async (templateId: string, request: GenerateRequest): Promise<Blob> => {
    const res = await apiClient.post(
      '/api/v1/templates/generate',
      { templateId, data: request.data },
      { responseType: 'blob' }
    )
    return res.data as Blob
  },

  /**
   * Proxy a remote PDF — GET /api/pdf/proxyPdf?url=...
   * Returns binary PDF blob.
   */
  proxyPdf: async (url: string): Promise<Blob> => {
    const res = await apiClient.get('/api/pdf/proxyPdf', {
      params: { url },
      responseType: 'blob',
    })
    return res.data as Blob
  },

  /**
   * Crop PDF — POST /api/pdf/cropPdf
   * Body: CropReq (camelCase — matches backend JSON tags)
   * Returns binary PDF blob.
   */
  cropPdf: async (req: CropRequest): Promise<Blob> => {
    const res = await apiClient.post('/api/pdf/cropPdf', req, {
      responseType: 'blob',
    })
    return res.data as Blob
  },
}

export default templatesApi

// ─── Types ────────────────────────────────────────────────────────────────────

/** Maps frontend Template shape → backend TemplateReq JSON shape */
function toBackendTemplateReq(t: Omit<Template, 'id' | 'created_at' | 'updated_at'>) {
  return {
    name: t.name,
    // Backend PageSize uses camelCase: widthMm, heightMm
    size: t.size
      ? {
          type: t.size.type,
          widthMm: t.size.widthMm,
          heightMm: t.size.heightMm,
          orientation: t.size.orientation,
        }
      : undefined,
    marginMm: t.marginMm,
    // Backend stores elements as JSON RawMessage — send as already-serialized array
    elements: Array.isArray(t.elements) ? t.elements : [],
  }
}

/** Request body for crop endpoint — camelCase to match backend CropReq JSON tags */
export interface CropRequest {
  url: string
  targetWidthMm: number
  targetHeightMm: number
  autoCrop: boolean
  paddingMm: number
}

// ─── Backend response shapes ──────────────────────────────────────────────────
// Backend returns camelCase date fields (createdAt, updatedAt) and
// elements as a JSON-parsed array (not a string).
// We normalize them to the frontend Template/TemplateSummary shape.

interface BackendPageSize {
  type: string
  widthMm: number
  heightMm: number
  orientation: string
}

interface BackendTemplateSummaryResp {
  id: string
  name: string
  size: BackendPageSize
  marginMm: number
  createdBy?: string
  createdAt?: string  // ISO string from backend
  updatedBy?: string
  updatedAt?: string  // ISO string from backend
}

interface BackendTemplateResp extends BackendTemplateSummaryResp {
  // elements is already a parsed JSON array when received from axios (Content-Type: application/json)
  elements?: unknown[]
}

function normalizeTemplateSummaryResp(raw: BackendTemplateSummaryResp): TemplateSummary {
  return {
    id: raw.id,
    name: raw.name,
    size: {
      type: raw.size?.type as import('@/types/template').SizeType,
      widthMm: raw.size?.widthMm ?? 0,
      heightMm: raw.size?.heightMm ?? 0,
      orientation: (raw.size?.orientation ?? 'portrait') as import('@/types/template').Orientation,
    },
    marginMm: raw.marginMm ?? 3,
    // Normalize createdAt → created_at for frontend date display
    created_at: raw.createdAt ?? raw.updatedAt ?? '',
    updated_at: raw.updatedAt ?? raw.createdAt ?? '',
  }
}

function normalizeTemplateResp(raw: BackendTemplateResp): import('@/types/template').Template {
  return {
    id: raw.id,
    name: raw.name,
    size: {
      type: raw.size?.type as import('@/types/template').SizeType,
      widthMm: raw.size?.widthMm ?? 0,
      heightMm: raw.size?.heightMm ?? 0,
      orientation: (raw.size?.orientation ?? 'portrait') as import('@/types/template').Orientation,
    },
    marginMm: raw.marginMm ?? 3,
    // elements arrives as parsed JSON array from axios — cast to TemplateElement[]
    elements: (Array.isArray(raw.elements) ? raw.elements : []) as import('@/types/template').TemplateElement[],
    created_at: raw.createdAt ?? '',
    updated_at: raw.updatedAt ?? '',
  }
}
