import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { templatesApi } from '@/api/templateApi'
import type { Template } from '@/types/template'

// ─── Query key factory ────────────────────────────────────────────────────────

export const templateKeys = {
  all: ['templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  details: () => [...templateKeys.all, 'detail'] as const,
  detail: (id: string) => [...templateKeys.details(), id] as const,
}

// ─── Query hooks ──────────────────────────────────────────────────────────────

/** Fetch all templates — POST /api/v1/templates/getAll */
export function useTemplates() {
  return useQuery({
    queryKey: templateKeys.lists(),
    queryFn: () => templatesApi.list(),
    staleTime: 5 * 60 * 1000,
  })
}

/** Fetch a single template by ID — POST /api/v1/templates/detailById */
export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: templateKeys.detail(id ?? ''),
    queryFn: () => templatesApi.getById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

/** Create a new template — POST /api/v1/templates/add */
export function useCreateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<Template, 'id' | 'created_at' | 'updated_at'>) =>
      templatesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() })
    },
  })
}

/** Update an existing template — POST /api/v1/templates/edit */
export function useUpdateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: Omit<Template, 'id' | 'created_at' | 'updated_at'>
    }) => templatesApi.update(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() })
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(id) })
    },
  })
}

/** Delete a template — POST /api/v1/templates/delete */
export function useDeleteTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => templatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() })
    },
  })
}
