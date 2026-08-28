import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { templateApi, templateAssignmentApi } from '../api/template.api'
import type { TemplateSaveRequest, TemplateSearchParams } from '../types/template.types'

const QUERY_KEY = 'templates'
const ASSIGNMENT_QUERY_KEY = 'template-assignments'

export function useTemplates(params?: TemplateSearchParams) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => templateApi.getAll(params),
  })
}

export function useTemplateDetail(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => templateApi.getById(id!),
    enabled: !!id,
  })
}

export function useSaveTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: TemplateSaveRequest) => templateApi.save(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useEditTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: TemplateSaveRequest & { id: string }) => templateApi.edit(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => templateApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}


/**
 * Fetch all template assignments for a given template ID.
 * Enabled only when templateId is provided.
 */
export function useTemplateAssignments(templateId: string | undefined) {
  return useQuery({
    queryKey: [ASSIGNMENT_QUERY_KEY, templateId],
    queryFn: () => templateAssignmentApi.getByTemplateId(templateId!),
    enabled: !!templateId,
  })
}

/**
 * Fetch assignments for all templates in a batch (for the list view).
 * Returns a map of templateId → assignments[].
 */
export function useAllTemplateAssignments(templateIds: string[]) {
  return useQuery({
    queryKey: [ASSIGNMENT_QUERY_KEY, 'batch', templateIds],
    queryFn: async () => {
      const results = await Promise.all(
        templateIds.map(async (id) => {
          const assignments = await templateAssignmentApi.getByTemplateId(id)
          return { id, assignments }
        })
      )
      const map: Record<string, Awaited<ReturnType<typeof templateAssignmentApi.getByTemplateId>>> = {}
      for (const r of results) {
        map[r.id] = r.assignments
      }
      return map
    },
    enabled: templateIds.length > 0,
  })
}
