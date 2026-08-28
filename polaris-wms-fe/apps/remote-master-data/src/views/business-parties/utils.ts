import type { BusinessPartyRole, BusinessPartyStatus } from '../../types/businessParty.types'

// Re-export from shared utility (timezone-aware)
export { formatTimestamp } from '@polaris/service'

export const ROLE_LABEL: Record<BusinessPartyRole, string> = {
  OWNER: 'Owner',
  SUPPLIER: 'Pemasok',
  CONSIGNEE: 'Penerima',
  COURIER: 'Ekspedisi',
}

export const ROLE_BADGE_CLASS: Record<BusinessPartyRole, string> = {
  OWNER: 'bg-[rgba(0,24,113,0.1)] text-[#001871]',
  SUPPLIER: 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]',
  CONSIGNEE: 'bg-[rgba(233,123,46,0.1)] text-[#e97b2e]',
  COURIER: 'bg-[rgba(74,144,217,0.1)] text-[#4a90d9]',
}

export function statusLabel(status: BusinessPartyStatus): string {
  return status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'
}

export function statusBadgeClass(status: BusinessPartyStatus): string {
  return status === 'ACTIVE'
    ? 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]'
    : 'bg-[rgba(169,177,198,0.15)] text-[#a9b1c6]'
}
