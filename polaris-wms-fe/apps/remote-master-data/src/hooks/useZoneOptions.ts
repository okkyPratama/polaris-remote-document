import { useQuery } from '@tanstack/react-query'
import { zoneApi } from '../api/zone.api'

/** Nested under `zones` so grid CRUD invalidation also refreshes options. */
export const ZONE_OPTIONS_QUERY_KEY = ['zones', 'options'] as const

export function useZoneOptions(zoneGroupId?: string) {
  const scopedId = zoneGroupId?.trim() || undefined
  return useQuery({
    queryKey: [...ZONE_OPTIONS_QUERY_KEY, scopedId ?? 'warehouse'] as const,
    queryFn: () => zoneApi.getOptions(scopedId),
  })
}
