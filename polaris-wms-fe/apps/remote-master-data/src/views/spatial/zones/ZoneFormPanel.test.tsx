import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SpatialOption, ZoneFormData } from '../../../types/spatial.types'
import { defaultZoneFormValues } from '../../../types/spatial.types'
import { buildZoneGroupFormOptions, ZoneFormPanel } from './ZoneFormPanel'

const { optionsState } = vi.hoisted(() => ({
  optionsState: {
    data: undefined as SpatialOption[] | undefined,
    isLoading: false,
    isPending: false,
    isError: false,
    error: null as Error | null,
  },
}))

vi.mock('../../../hooks/useZoneGroupOptions', () => ({
  useZoneGroupOptions: () => ({
    data: optionsState.data,
    isLoading: optionsState.isLoading,
    isPending: optionsState.isPending,
    isError: optionsState.isError,
    error: optionsState.error,
  }),
}))

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
}

function getZoneGroupSelect(): HTMLSelectElement {
  const label = screen.getByText('Grup Zona *')
  const select = label.parentElement?.querySelector('select')
  if (!select) throw new Error('Grup Zona select not found')
  return select as HTMLSelectElement
}

const editInitial: ZoneFormData = {
  ...defaultZoneFormValues,
  zoneGroupId: 'zg-dry',
  code: 'ZN-A01',
  name: 'Zone A',
}

describe('buildZoneGroupFormOptions', () => {
  it('maps compact options without re-sorting', () => {
    expect(buildZoneGroupFormOptions(ACTIVE_OPTIONS, 'create')).toEqual([
      { value: 'zg-dry', label: 'ZG-DRY — Dry Storage' },
      { value: 'zg-cold', label: 'ZG-COLD — Cold Storage' },
    ])
  })

  it('injects a missing current parent as inactive on edit', () => {
    const options = buildZoneGroupFormOptions(ACTIVE_OPTIONS, 'edit', {
      id: 'zg-old',
      code: 'ZG-OLD',
      name: 'Legacy Group',
    })
    expect(options[0]).toEqual({
      value: 'zg-old',
      label: 'ZG-OLD — Legacy Group (Nonaktif)',
    })
    expect(options.map((opt) => opt.value)).toEqual(['zg-old', 'zg-dry', 'zg-cold'])
  })

  it('does not inject when the current parent is already in ACTIVE options', () => {
    const options = buildZoneGroupFormOptions(ACTIVE_OPTIONS, 'edit', {
      id: 'zg-dry',
      code: 'ZG-DRY',
      name: 'Dry Storage',
    })
    expect(options.map((opt) => opt.label).join(' ')).not.toContain('Nonaktif')
    expect(options[0]).toEqual({ value: 'zg-dry', label: 'ZG-DRY — Dry Storage' })
  })
})

describe('ZoneFormPanel Zone Group options', () => {
  beforeEach(() => {
    resetOptionsState()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders returned options on create', () => {
    render(
      <ZoneFormPanel open mode="create" onClose={vi.fn()} onSubmit={vi.fn()} />
    )

    const select = getZoneGroupSelect()
    expect(select).not.toBeDisabled()
    expect(within(select).getByRole('option', { name: 'ZG-DRY — Dry Storage' })).toBeInTheDocument()
    expect(within(select).getByRole('option', { name: 'ZG-COLD — Cold Storage' })).toBeInTheDocument()
    expect(screen.queryByText('Gagal memuat Grup Zona')).not.toBeInTheDocument()
  })

  it('shows loading instead of an empty successful dropdown', () => {
    optionsState.data = undefined
    optionsState.isLoading = true
    optionsState.isPending = true

    render(
      <ZoneFormPanel open mode="create" onClose={vi.fn()} onSubmit={vi.fn()} />
    )

    const select = getZoneGroupSelect()
    expect(select).toBeDisabled()
    expect(within(select).getByRole('option', { name: 'Memuat...' })).toBeInTheDocument()
    expect(
      within(select).queryByRole('option', { name: 'ZG-DRY — Dry Storage' })
    ).not.toBeInTheDocument()
  })

  it('shows an explicit error instead of empty-success', () => {
    optionsState.data = undefined
    optionsState.isError = true
    optionsState.error = new Error('options failed')

    render(
      <ZoneFormPanel open mode="create" onClose={vi.fn()} onSubmit={vi.fn()} />
    )

    const select = getZoneGroupSelect()
    expect(select).toBeDisabled()
    expect(select).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getAllByText('Gagal memuat Grup Zona').length).toBeGreaterThan(0)
    expect(screen.queryByText('Belum ada Grup Zona aktif')).not.toBeInTheDocument()
  })

  it('injects the missing current parent with (Nonaktif) on edit', () => {
    render(
      <ZoneFormPanel
        open
        mode="edit"
        initialData={{ ...editInitial, zoneGroupId: 'zg-old' }}
        currentZoneGroup={{ id: 'zg-old', code: 'ZG-OLD', name: 'Legacy Group' }}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    )

    const select = getZoneGroupSelect()
    expect(
      within(select).getByRole('option', { name: 'ZG-OLD — Legacy Group (Nonaktif)' })
    ).toBeInTheDocument()
    expect(within(select).getByRole('option', { name: 'ZG-DRY — Dry Storage' })).toBeInTheDocument()
  })
})
