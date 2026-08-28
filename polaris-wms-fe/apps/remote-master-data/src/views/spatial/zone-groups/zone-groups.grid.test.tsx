import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ZoneGroup } from '../../../types/spatial.types'

const { useZoneGroupsMock, useZoneGroupOptionsMock } = vi.hoisted(() => ({
  useZoneGroupsMock: vi.fn(),
  useZoneGroupOptionsMock: vi.fn(),
}))

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

const idleMutation = {
  mutateAsync: vi.fn(),
  isPending: false,
}

vi.mock('../../../hooks/useZoneGroups', () => ({
  useZoneGroups: (...args: unknown[]) => useZoneGroupsMock(...args),
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

vi.mock('../../../hooks/useZoneGroupOptions', () => ({
  useZoneGroupOptions: () => useZoneGroupOptionsMock(),
}))

import ZoneGroupsPage from './index'

describe('Zone Group grid still uses getAll', () => {
  afterEach(() => {
    cleanup()
    useZoneGroupsMock.mockReset()
    useZoneGroupOptionsMock.mockReset()
  })

  it('calls useZoneGroups with paging params and never useZoneGroupOptions', () => {
    useZoneGroupsMock.mockReturnValue({
      data: { data: [zoneGroup], total: 1 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    })

    render(<ZoneGroupsPage canCreate canUpdate canDelete />)

    expect(screen.getByRole('button', { name: /Tambah Grup Zona/i })).toBeInTheDocument()
    expect(useZoneGroupsMock).toHaveBeenCalled()
    expect(useZoneGroupsMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        page: 1,
        pageSize: 10,
      })
    )
    expect(useZoneGroupOptionsMock).not.toHaveBeenCalled()
  })
})
