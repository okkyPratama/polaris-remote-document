export type TransportMode = 'ROAD' | 'SEA' | 'AIR' | 'RAIL'

export type CarrierServiceTypeStatus = 'ACTIVE' | 'INACTIVE'

export interface CarrierServiceType {
  id: string
  businessPartyId: string
  /** Carrier name (denormalized from backend or resolved) */
  carrierName: string
  /** Carrier code */
  carrierCode: string
  serviceCode: string
  serviceName: string
  transportMode: TransportMode | null
  transitTimeMinDays: number | null
  transitTimeMaxDays: number | null
  slaDays: number | null
  notes: string
  status: CarrierServiceTypeStatus
  createdBy?: string
  createdAt: string
  updatedBy?: string
  updatedAt?: string
}

export interface CarrierServiceTypeFormData {
  businessPartyId: string
  serviceCode: string
  serviceName: string
  transportMode: TransportMode | ''
  transitTimeMinDays: string
  transitTimeMaxDays: string
  slaDays: string
  notes: string
}

export interface CarrierServiceTypeSearchParams {
  search?: string
  carrierId?: string
  status?: 'ALL' | CarrierServiceTypeStatus
  page?: number
  pageSize?: number
}
