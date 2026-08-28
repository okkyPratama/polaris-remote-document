import { useQuery } from '@tanstack/react-query'
import { zoneGroupApi } from '../api/zone-group.api'

/** Nested under `zone-groups` so grid CRUD invalidation also refreshes options. */
export const ZONE_GROUP_OPTIONS_QUERY_KEY = ['zone-groups', 'options'] as const

export function useZoneGroupOptions() {
  return useQuery({
    queryKey: ZONE_GROUP_OPTIONS_QUERY_KEY,
    queryFn: () => zoneGroupApi.getOptions(),
  })
}
