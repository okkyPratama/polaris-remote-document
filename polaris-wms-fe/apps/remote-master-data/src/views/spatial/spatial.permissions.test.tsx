import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Location, Zone, ZoneGroup } from '../../types/spatial.types'

const {
  zoneGroup,
  zone,
  location,
  blockedLocation,
  locationDetailState,
} = vi.hoisted(() => {
  const zoneGroup: ZoneGroup = {
    id: 'zg-1',
    warehouseId: 'wh-1',
    code: 'ZG-1',
    name: 'Group 1',
    temperatureMin: null,
    temperatureMax: null,
    handlingRulesJson: null,
    defaultPutawayMode: 'EMPTY_FIRST',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
  }

  const zone: Zone = {
    id: 'z-1',
    warehouseId: 'wh-1',
    zoneGroupId: 'zg-1',
    zoneGroupCode: 'ZG-1',
    zoneGroupName: 'Group 1',
    code: 'Z-1',
    name: 'Zone 1',
    allowedActivities: ['STORAGE'],
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
  }

  const location: Location = {
    id: 'loc-1',
    warehouseId: 'wh-1',
    zoneId: 'z-1',
    zoneCode: 'Z-1',
    zoneName: 'Zone 1',
    code: 'LOC-1',
    name: 'Location 1',
    locationType: 'STORAGE',
    sequence: 1,
    maxLpnCount: 10,
    maxWeightKg: 100,
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
  }

  const blockedLocation: Location = {
    ...location,
    id: 'loc-blocked',
    code: 'LOC-BLOCKED',
    status: 'BLOCKED',
  }

  return {
    zoneGroup,
    zone,
    location,
    blockedLocation,
    locationDetailState: {
      data: undefined as Location | undefined,
    },
  }
})

const idleMutation = {
  mutateAsync: vi.fn(),
  isPending: false,
}

vi.mock('../../hooks/useZoneGroups', () => ({
  useZoneGroups: () => ({
    data: { data: [zoneGroup], total: 1 },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
  }),
  useZoneGroupDetail: () => ({
    data: zoneGroup,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCreateZoneGroup: () => idleMutation,
  useUpdateZoneGroup: () => idleMutation,
  useDeleteZoneGroup: () => idleMutation,
}))

vi.mock('../../hooks/useZoneGroupOptions', () => ({
  useZoneGroupOptions: () => ({
    data: [{ id: zoneGroup.id, code: zoneGroup.code, name: zoneGroup.name }],
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
  }),
}))

vi.mock('../../hooks/useZones', () => ({
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

vi.mock('../../hooks/useZoneOptions', () => ({
  useZoneOptions: () => ({
    data: [{ id: zone.id, code: zone.code, name: zone.name }],
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
  }),
}))

vi.mock('../../hooks/useLocations', () => ({
  useLocations: () => ({
    data: { data: [location, blockedLocation], total: 2 },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
  }),
  useLocationDetail: (id?: string) => ({
    data: id ? locationDetailState.data : undefined,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCreateLocation: () => idleMutation,
  useUpdateLocation: () => idleMutation,
  useDeleteLocation: () => idleMutation,
  useBulkCreateLocations: () => idleMutation,
}))

import ZoneGroupsPage from './zone-groups'
import ZonesPage from './zones'
import LocationsPage from './locations'
import { LocationDetailPanel } from './locations/LocationDetailPanel'
import { ZoneDetailPanel } from './zones/ZoneDetailPanel'
import { ZoneGroupDetailPanel } from './zone-groups/ZoneGroupDetailPanel'

describe('spatial permission rendering', () => {
  beforeEach(() => {
    locationDetailState.data = location
  })

  afterEach(() => {
    cleanup()
  })

  describe('Zone Groups page', () => {
    it('hides Add when canCreate=false', () => {
      render(<ZoneGroupsPage canCreate={false} canUpdate canDelete />)
      expect(screen.queryByRole('button', { name: /Tambah Grup Zona/i })).not.toBeInTheDocument()
    })

    it('shows Add when canCreate=true', () => {
      render(<ZoneGroupsPage canCreate canUpdate canDelete />)
      expect(screen.getByRole('button', { name: /Tambah Grup Zona/i })).toBeInTheDocument()
    })

    it('hides Edit/Delete in detail when callbacks are omitted', () => {
      render(
        <ZoneGroupDetailPanel
          open
          data={zoneGroup}
          isLoading={false}
          onRetry={vi.fn()}
          onClose={vi.fn()}
        />
      )
      expect(screen.queryByRole('button', { name: /^Edit$/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^Hapus$/i })).not.toBeInTheDocument()
    })

    it('shows Edit/Delete when canUpdate/canDelete callbacks are provided', () => {
      render(
        <ZoneGroupDetailPanel
          open
          data={zoneGroup}
          isLoading={false}
          onRetry={vi.fn()}
          onClose={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      )
      expect(screen.getByRole('button', { name: /^Edit$/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^Hapus$/i })).toBeInTheDocument()
    })

    it('shows Edit but not Delete when only canUpdate is set on the page', async () => {
      const user = userEvent.setup()
      render(<ZoneGroupsPage canCreate canUpdate canDelete={false} />)
      await user.click(screen.getByText('ZG-1'))
      expect(screen.getByRole('button', { name: /^Edit$/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^Hapus$/i })).not.toBeInTheDocument()
    })
  })

  describe('Zones page', () => {
    it('hides Add when canCreate=false', () => {
      render(<ZonesPage canCreate={false} canUpdate canDelete />)
      expect(screen.queryByRole('button', { name: /Tambah Zona$/i })).not.toBeInTheDocument()
    })

    it('shows Add when canCreate=true', () => {
      render(<ZonesPage canCreate canUpdate canDelete />)
      expect(screen.getByRole('button', { name: /Tambah Zona$/i })).toBeInTheDocument()
    })

    it('shows Edit/Delete only when callbacks are provided', () => {
      const { rerender } = render(
        <ZoneDetailPanel open data={zone} isLoading={false} onRetry={vi.fn()} onClose={vi.fn()} />
      )
      expect(screen.queryByRole('button', { name: /^Edit$/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^Hapus$/i })).not.toBeInTheDocument()

      rerender(
        <ZoneDetailPanel
          open
          data={zone}
          isLoading={false}
          onRetry={vi.fn()}
          onClose={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      )
      expect(screen.getByRole('button', { name: /^Edit$/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^Hapus$/i })).toBeInTheDocument()
    })
  })

  describe('Locations page', () => {
    it('hides Add and Bulk when canCreate=false', () => {
      render(<LocationsPage canCreate={false} canUpdate canDelete />)
      expect(screen.queryByRole('button', { name: /Tambah Lokasi/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Buat Massal/i })).not.toBeInTheDocument()
    })

    it('shows Add and Bulk when canCreate=true', () => {
      render(<LocationsPage canCreate canUpdate canDelete />)
      expect(screen.getByRole('button', { name: /Tambah Lokasi/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Buat Massal/i })).toBeInTheDocument()
    })

    it('never displays Delete on Location detail', () => {
      render(
        <LocationDetailPanel
          open
          data={location}
          isLoading={false}
          onRetry={vi.fn()}
          onClose={vi.fn()}
          onEdit={vi.fn()}
        />
      )
      expect(screen.getByRole('button', { name: /^Edit$/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^Hapus$/i })).not.toBeInTheDocument()
      expect(screen.queryByText(/Delete/i)).not.toBeInTheDocument()
    })

    it('hides Edit for BLOCKED locations even when onEdit is provided', () => {
      render(
        <LocationDetailPanel
          open
          data={blockedLocation}
          isLoading={false}
          onRetry={vi.fn()}
          onClose={vi.fn()}
          onEdit={vi.fn()}
        />
      )
      expect(screen.queryByRole('button', { name: /^Edit$/i })).not.toBeInTheDocument()
      expect(screen.getByText(/Lokasi ini diblokir/i)).toBeInTheDocument()
    })

    it('does not render utilization fields', () => {
      render(
        <LocationDetailPanel
          open
          data={location}
          isLoading={false}
          onRetry={vi.fn()}
          onClose={vi.fn()}
          onEdit={vi.fn()}
        />
      )
      expect(screen.queryByText(/utilization/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/current LPN/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/remaining capacity/i)).not.toBeInTheDocument()
      expect(screen.getByText('Max LPN')).toBeInTheDocument()
      expect(screen.getByText('Max berat')).toBeInTheDocument()
    })

    it('keeps edit closed for BLOCKED rows from the list', async () => {
      const user = userEvent.setup()
      locationDetailState.data = blockedLocation
      render(<LocationsPage canCreate canUpdate canDelete />)

      await user.click(screen.getByText('LOC-BLOCKED'))
      expect(screen.getByText(/Lokasi ini diblokir/i)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^Edit$/i })).not.toBeInTheDocument()
    })
  })
})
