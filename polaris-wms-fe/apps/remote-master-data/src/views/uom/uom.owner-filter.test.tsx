import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UomHierarchy, UomSearchParams } from '../../types/uom.types'
import {
  normalizeOwnerContextIds,
  resolveOwnerFilterMode,
} from './index'

const { hierarchy, useUomsMock } = vi.hoisted(() => {
  const hierarchy: UomHierarchy = {
    id: 'uom-1',
    ownerId: 'owner-a',
    skuCode: 'SKU-001',
    status: 'ACTIVE',
    levels: [
      {
        id: 'ea-1',
        uomCode: 'EA',
        displayName: 'Each',
        level: 1,
        conversionFactorToEa: 1,
        conversionFactorToParent: null,
        parentUomCode: null,
        status: 'ACTIVE',
      },
    ],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    updatedBy: 'admin',
  }

  return {
    hierarchy,
    useUomsMock: vi.fn(
      (_params?: UomSearchParams, _options?: { enabled?: boolean }) => ({
        data: { data: [hierarchy], total: 1 },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isFetching: false,
      })
    ),
  }
})

vi.mock('../../hooks/useUoms', () => ({
  useUoms: (...args: unknown[]) => useUomsMock(...(args as [UomSearchParams?, { enabled?: boolean }?])),
  useUomDetail: () => ({
    data: undefined,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCreateUom: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpdateUom: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUomCodeOptions: () => ({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
  }),
}))

vi.mock('@polaris/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@polaris/ui')>()
  return {
    ...actual,
    toast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }
})

import UomPage from './index'

function latestUomsCall() {
  expect(useUomsMock).toHaveBeenCalled()
  const [params, options] = useUomsMock.mock.calls.at(-1) as [
    UomSearchParams | undefined,
    { enabled?: boolean } | undefined,
  ]
  return { params, options }
}

describe('normalizeOwnerContextIds / resolveOwnerFilterMode', () => {
  it('trims and dedupes while preserving order', () => {
    expect(normalizeOwnerContextIds(['  a ', 'b', 'a', '', '  b  ', 'c'])).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('keeps null and undefined as free-text (never coerces to [])', () => {
    expect(resolveOwnerFilterMode(null)).toEqual({ mode: 'free-text', options: [] })
    expect(resolveOwnerFilterMode(undefined)).toEqual({ mode: 'free-text', options: [] })
    expect(resolveOwnerFilterMode([])).toEqual({ mode: 'none', options: [] })
    expect(resolveOwnerFilterMode(['owner-a'])).toEqual({
      mode: 'single',
      options: ['owner-a'],
    })
    expect(resolveOwnerFilterMode(['owner-a', ' owner-b '])).toEqual({
      mode: 'multi',
      options: ['owner-a', 'owner-b'],
    })
  })
})

describe('UomPage Owner list filter', () => {
  beforeEach(() => {
    useUomsMock.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it('auto-selects and disables dropdown for a single Owner', () => {
    render(<UomPage ownerContextIds={['owner-a']} canCreate canUpdate />)

    const select = screen.getByLabelText('Filter Owner') as HTMLSelectElement
    expect(select).toBeDisabled()
    expect(select.value).toBe('owner-a')
    expect(screen.queryByRole('option', { name: 'Semua Owner' })).not.toBeInTheDocument()

    const { params, options } = latestUomsCall()
    expect(params?.ownerId).toBe('owner-a')
    expect(options?.enabled).toBe(true)
  })

  it('shows Semua Owner plus only session Owner IDs for multiple Owners', () => {
    render(
      <UomPage
        ownerContextIds={['owner-a', 'owner-b', ' owner-a ']}
        canCreate
        canUpdate
      />
    )

    const select = screen.getByLabelText('Filter Owner') as HTMLSelectElement
    expect(select).not.toBeDisabled()
    expect(select.value).toBe('')

    const optionLabels = within(select)
      .getAllByRole('option')
      .map((opt) => opt.textContent)
    expect(optionLabels).toEqual(['Semua Owner', 'owner-a', 'owner-b'])
    expect(optionLabels).not.toContain('owner-outside')

    const { params, options } = latestUomsCall()
    expect(params?.ownerId).toBe('')
    expect(options?.enabled).toBe(true)
  })

  it('shows empty state and disables query when ownerContextIds is []', () => {
    render(<UomPage ownerContextIds={[]} canCreate canUpdate />)

    expect(screen.getAllByText('User belum memiliki akses Owner.').length).toBeGreaterThan(0)
    expect(screen.queryByLabelText('Filter Owner')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Filter Owner ID')).not.toBeInTheDocument()
    expect(screen.queryByText('SKU-001')).not.toBeInTheDocument()

    const { options } = latestUomsCall()
    expect(options?.enabled).toBe(false)
  })

  it('falls back to free-text filter when ownerContextIds is null', () => {
    render(<UomPage ownerContextIds={null} canCreate canUpdate />)

    expect(screen.getByLabelText('Filter Owner ID')).toBeInTheDocument()
    expect(screen.queryByLabelText('Filter Owner')).not.toBeInTheDocument()

    const { params, options } = latestUomsCall()
    expect(params?.ownerId).toBe('')
    expect(options?.enabled).toBe(true)
  })

  it('falls back to free-text filter when ownerContextIds is undefined', () => {
    render(<UomPage canCreate canUpdate />)

    expect(screen.getByLabelText('Filter Owner ID')).toBeInTheDocument()
    expect(screen.queryByLabelText('Filter Owner')).not.toBeInTheDocument()

    const { options } = latestUomsCall()
    expect(options?.enabled).toBe(true)
  })

  it('resets pagination to page 1 when Owner selection changes', async () => {
    const user = userEvent.setup()
    useUomsMock.mockImplementation(() => ({
      data: { data: [hierarchy], total: 50 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    }))

    render(
      <UomPage ownerContextIds={['owner-a', 'owner-b']} canCreate canUpdate />
    )

    // Navigate to page 2 (total 50 / pageSize 10 → 5 pages)
    await user.click(screen.getByRole('button', { name: '2' }))
    expect(latestUomsCall().params?.page).toBe(2)

    useUomsMock.mockClear()
    await user.selectOptions(screen.getByLabelText('Filter Owner'), 'owner-b')

    const { params, options } = latestUomsCall()
    expect(params?.ownerId).toBe('owner-b')
    expect(params?.page).toBe(1)
    expect(options?.enabled).toBe(true)
  })
})
