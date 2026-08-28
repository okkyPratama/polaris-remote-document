import {
  LOCATION_TYPES,
  PUTAWAY_MODES,
  isValidZoneActivity,
  type LocationStatus,
  type LocationType,
  type PutawayMode,
  type SpatialOption,
  type SpatialStatus,
  type ZoneActivity,
} from '../types/spatial.types'

function displayValue(value: unknown): string {
  return typeof value === 'string' ? value : String(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

/** Strict compact option mapper. Extra fields are dropped; malformed items throw. */
export function mapSpatialOption(raw: unknown): SpatialOption {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`Invalid Spatial option received from API: ${displayValue(raw)}`)
  }

  const obj = raw as Record<string, unknown>
  if (
    !isNonEmptyString(obj.id) ||
    !isNonEmptyString(obj.code) ||
    !isNonEmptyString(obj.name)
  ) {
    throw new Error(`Invalid Spatial option received from API: ${displayValue(raw)}`)
  }

  return { id: obj.id, code: obj.code, name: obj.name }
}

/** Map an options array in backend order. Does not re-sort. */
export function mapSpatialOptions(raw: unknown): SpatialOption[] {
  if (!Array.isArray(raw)) {
    throw new Error(`Invalid Spatial options received from API: ${displayValue(raw)}`)
  }
  return raw.map(mapSpatialOption)
}

export function parseSpatialStatus(
  value: unknown,
  entity: 'Zone Group' | 'Zone'
): SpatialStatus {
  if (value === 'ACTIVE' || value === 'INACTIVE') return value

  throw new Error(
    `Invalid ${entity} status received from API: ${displayValue(value)}`
  )
}

export function parsePutawayMode(value: unknown): PutawayMode {
  if (
    typeof value === 'string' &&
    (PUTAWAY_MODES as string[]).includes(value)
  ) {
    return value as PutawayMode
  }

  throw new Error(
    `Invalid Zone Group putaway mode received from API: ${displayValue(value)}`
  )
}

export function parseZoneActivities(value: unknown): ZoneActivity[] {
  if (!Array.isArray(value)) {
    throw new Error(
      `Invalid Zone activities received from API: ${displayValue(value)}`
    )
  }

  for (const activity of value) {
    if (!isValidZoneActivity(activity)) {
      throw new Error(
        `Invalid Zone activity received from API: ${displayValue(activity)}`
      )
    }
  }

  return [...value] as ZoneActivity[]
}

export function parseLocationStatus(value: unknown): LocationStatus {
  if (
    value === 'ACTIVE' ||
    value === 'INACTIVE' ||
    value === 'BLOCKED'
  ) {
    return value
  }

  throw new Error(
    `Invalid Location status received from API: ${displayValue(value)}`
  )
}

export function parseLocationType(value: unknown): LocationType {
  if (
    typeof value === 'string' &&
    (LOCATION_TYPES as string[]).includes(value)
  ) {
    return value as LocationType
  }

  throw new Error(
    `Invalid Location type received from API: ${displayValue(value)}`
  )
}
