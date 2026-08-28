import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LocationFormData, SpatialOption } from '../../../types/spatial.types'
import { defaultLocationFormValues } from '../../../types/spatial.types'
import { buildZoneFormOptions, LocationFormPanel } from './LocationFormPanel'

const { optionsState } = vi.hoisted(() => ({
  optionsState: {
    data: undefined as SpatialOption[] | undefined,
    isLoading: false,
    isPending: false,
    isError: false,
    error: null as Error | null,
  },
}))

vi.mock('../../../hooks/useZoneOptions', () => ({
  useZoneOptions: () => ({
    data: optionsState.data,
    isLoading: optionsState.isLoading,
    isPending: optionsState.isPending,
    isError: optionsState.isError,
    error: optionsState.error,
  }),
}))

const ACTIVE_OPTIONS: SpatialOption[] = [
  { id: 'z-dry', code: 'Z-DRY', name: 'Dry Zone' },
  { id: 'z-cold', code: 'Z-COLD', name: 'Cold Zone' },
]

function resetOptionsState() {
  optionsState.data = ACTIVE_OPTIONS
  optionsState.isLoading = false
  optionsState.isPending = false
  optionsState.isError = false
  optionsState.error = null
}

function getZoneSelect(): HTMLSelectElement {
  const label = screen.getByText('Zona *')
  const select = label.parentElement?.querySelector('select')
  if (!select) throw new Error('Zona select not found')
  return select as HTMLSelectElement
}

const editInitial: LocationFormData = {
  ...defaultLocationFormValues,
  zoneId: 'z-dry',
  code: 'LOC-A01',
  name: 'Location A',
}

describe('buildZoneFormOptions', () => {
  it('maps compact options without re-sorting', () => {
    expect(buildZoneFormOptions(ACTIVE_OPTIONS, 'create')).toEqual([
      { value: 'z-dry', label: 'Z-DRY — Dry Zone' },
      { value: 'z-cold', label: 'Z-COLD — Cold Zone' },
    ])
  })

  it('injects a missing current parent as inactive on edit', () => {
    const options = buildZoneFormOptions(ACTIVE_OPTIONS, 'edit', {
      id: 'z-old',
      code: 'Z-OLD',
      name: 'Legacy Zone',
    })
    expect(options[0]).toEqual({
      value: 'z-old',
      label: 'Z-OLD — Legacy Zone (Nonaktif)',
    })
    expect(options.map((opt) => opt.value)).toEqual(['z-old', 'z-dry', 'z-cold'])
  })

  it('does not inject when the current parent is already in ACTIVE options', () => {
    const options = buildZoneFormOptions(ACTIVE_OPTIONS, 'edit', {
      id: 'z-dry',
      code: 'Z-DRY',
      name: 'Dry Zone',
    })
    expect(options.map((opt) => opt.label).join(' ')).not.toContain('Nonaktif')
    expect(options[0]).toEqual({ value: 'z-dry', label: 'Z-DRY — Dry Zone' })
  })
})

describe('LocationFormPanel Zone options', () => {
  beforeEach(() => {
    resetOptionsState()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders returned options on create', () => {
    render(
      <LocationFormPanel open mode="create" onClose={vi.fn()} onSubmit={vi.fn()} />
    )

    const select = getZoneSelect()
    expect(select).not.toBeDisabled()
    expect(within(select).getByRole('option', { name: 'Z-DRY — Dry Zone' })).toBeInTheDocument()
    expect(within(select).getByRole('option', { name: 'Z-COLD — Cold Zone' })).toBeInTheDocument()
    expect(screen.queryByText('Gagal memuat Zona')).not.toBeInTheDocument()
  })

  it('shows loading instead of an empty successful dropdown', () => {
    optionsState.data = undefined
    optionsState.isLoading = true
    optionsState.isPending = true

    render(
      <LocationFormPanel open mode="create" onClose={vi.fn()} onSubmit={vi.fn()} />
    )

    const select = getZoneSelect()
    expect(select).toBeDisabled()
    expect(within(select).getByRole('option', { name: 'Memuat...' })).toBeInTheDocument()
    expect(
      within(select).queryByRole('option', { name: 'Z-DRY — Dry Zone' })
    ).not.toBeInTheDocument()
  })

  it('shows an explicit error instead of empty-success', () => {
    optionsState.data = undefined
    optionsState.isError = true
    optionsState.error = new Error('options failed')

    render(
      <LocationFormPanel open mode="create" onClose={vi.fn()} onSubmit={vi.fn()} />
    )

    const select = getZoneSelect()
    expect(select).toBeDisabled()
    expect(select).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getAllByText('Gagal memuat Zona').length).toBeGreaterThan(0)
    expect(screen.queryByText('Belum ada Zona aktif')).not.toBeInTheDocument()
  })

  it('injects the missing current parent with (Nonaktif) on edit', () => {
    render(
      <LocationFormPanel
        open
        mode="edit"
        initialData={{ ...editInitial, zoneId: 'z-old' }}
        currentZone={{ id: 'z-old', code: 'Z-OLD', name: 'Legacy Zone' }}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    )

    const select = getZoneSelect()
    expect(
      within(select).getByRole('option', { name: 'Z-OLD — Legacy Zone (Nonaktif)' })
    ).toBeInTheDocument()
    expect(within(select).getByRole('option', { name: 'Z-DRY — Dry Zone' })).toBeInTheDocument()
  })
})
