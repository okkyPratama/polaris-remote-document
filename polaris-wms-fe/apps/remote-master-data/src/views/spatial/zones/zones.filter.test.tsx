import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SpatialOption, Zone } from '../../../types/spatial.types'

const { optionsState, useZoneGroupsMock } = vi.hoisted(() => ({
  optionsState: {
    data: undefined as SpatialOption[] | undefined,
    isLoading: false,
    isPending: false,
    isError: false,
    error: null as Error | null,
  },
  useZoneGroupsMock: vi.fn(),
}))

const zone: Zone = {
  id: 'z-1',
  warehouseId: 'wh-1',
  zoneGroupId: 'zg-dry',
  zoneGroupCode: 'ZG-DRY',
  zoneGroupName: 'Dry Storage',
  code: 'Z-1',
  name: 'Zone 1',
  allowedActivities: ['STORAGE'],
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
}

const idleMutation = {
  mutateAsync: vi.fn(),
  isPending: false,
}

vi.mock('../../../hooks/useZoneGroupOptions', () => ({
  useZoneGroupOptions: () => ({
    data: optionsState.data,
    isLoading: optionsState.isLoading,
    isPending: optionsState.isPending,
    isError: optionsState.isError,
    error: optionsState.error,
  }),
}))

vi.mock('../../../hooks/useZoneGroups', () => ({
  useZoneGroups: (...args: unknown[]) => useZoneGroupsMock(...args),
}))

vi.mock('../../../hooks/useZones', () => ({
  useZones: () => ({
    data: { data: [zone], total: 1 },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
  }),
  useZoneDetail: () => ({
    data: zone,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCreateZone: () => idleMutation,
  useUpdateZone: () => idleMutation,
  useDeleteZone: () => idleMutation,
}))

import ZonesPage from './index'

const ACTIVE_OPTIONS: SpatialOption[] = [
  { id: 'zg-dry', code: 'ZG-DRY', name: 'Dry Storage' },
  { id: 'zg-cold', code: 'ZG-COLD', name: 'Cold Storage' },
]

function resetOptionsState() {
  optionsState.data = ACTIVE_OPTIONS
  optionsState.isLoading = false
  optionsState.isPending = false
  optionsState.isError = false
  optionsState.error = null
  useZoneGroupsMock.mockReset()
}

describe('Zones page Zone Group filter', () => {
  beforeEach(() => {
    resetOptionsState()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders all options and does not call useZoneGroups', () => {
    render(<ZonesPage canCreate canUpdate canDelete />)

    const filter = screen.getByLabelText('Filter Grup Zona')
    expect(filter).not.toBeDisabled()
    expect(within(filter).getByRole('option', { name: 'Semua Grup Zona' })).toBeInTheDocument()
    expect(within(filter).getByRole('option', { name: 'ZG-DRY — Dry Storage' })).toBeInTheDocument()
    expect(within(filter).getByRole('option', { name: 'ZG-COLD — Cold Storage' })).toBeInTheDocument()
    expect(useZoneGroupsMock).not.toHaveBeenCalled()
  })

  it('shows loading instead of an empty successful dropdown', () => {
    optionsState.data = undefined
    optionsState.isLoading = true
    optionsState.isPending = true

    render(<ZonesPage />)

    const filter = screen.getByLabelText('Filter Grup Zona')
    expect(filter).toBeDisabled()
    expect(filter).toHaveAttribute('aria-busy', 'true')
    expect(within(filter).getByRole('option', { name: 'Memuat...' })).toBeInTheDocument()
    expect(within(filter).queryByRole('option', { name: 'Semua Grup Zona' })).not.toBeInTheDocument()
  })

  it('shows an explicit error instead of empty-success', () => {
    optionsState.data = undefined
    optionsState.isError = true
    optionsState.error = new Error('options failed')

    render(<ZonesPage />)

    const filter = screen.getByLabelText('Filter Grup Zona')
    expect(filter).toBeDisabled()
    expect(filter).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getAllByText('Gagal memuat Grup Zona').length).toBeGreaterThan(0)
    expect(within(filter).queryByRole('option', { name: 'Semua Grup Zona' })).not.toBeInTheDocument()
  })

  it('allows an empty options list only after success', () => {
    optionsState.data = []

    render(<ZonesPage />)

    const filter = screen.getByLabelText('Filter Grup Zona')
    expect(filter).not.toBeDisabled()
    expect(within(filter).getByRole('option', { name: 'Semua Grup Zona' })).toBeInTheDocument()
    expect(within(filter).queryByRole('option', { name: 'Memuat...' })).not.toBeInTheDocument()
  })
})
