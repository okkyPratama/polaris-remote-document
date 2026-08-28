import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  UomCodeOption,
  UomHierarchyFormData,
  UomLevelFormData,
} from '../../types/uom.types'
import { defaultEaLevel } from '../../types/uom.types'
import {
  buildLevelOptions,
  previewFactorToParent,
  syncLevelParents,
  UomFormPanel,
} from './UomFormPanel'

const OWNER_A = 'owner-a'
const OWNER_B = 'owner-b'

const optionsByOwner = vi.hoisted(() => {
  const ownerA: UomCodeOption[] = [
    { code: 'EA', name: 'Each' },
    { code: 'IP', name: 'Inner Pack' },
    { code: 'CT', name: 'Carton' },
    { code: 'CS', name: 'Case' },
    { code: 'PL', name: 'Pallet' },
  ]
  const ownerB: UomCodeOption[] = [
    { code: 'EA', name: 'Each' },
    { code: 'IP', name: 'Inner Pack B' },
  ]
  return { ownerA, ownerB }
})

vi.mock('../../hooks/useUoms', () => ({
  useUomCodeOptions: (ownerId?: string) => {
    const normalized = (ownerId ?? '').trim()
    const data =
      normalized === OWNER_B ? optionsByOwner.ownerB : optionsByOwner.ownerA
    return {
      data,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    }
  },
}))

function baseHierarchy(overrides?: Partial<UomHierarchyFormData>): UomHierarchyFormData {
  return {
    ownerId: OWNER_A,
    skuCode: 'SKU-001',
    status: 'ACTIVE',
    levels: [
      { ...defaultEaLevel, id: 'ea-1' },
      {
        id: 'ip-1',
        uomCode: 'IP',
        displayName: 'Inner Pack',
        level: 2,
        conversionFactorToEa: 12,
        parentUomCode: 'EA',
        status: 'ACTIVE',
      },
      {
        id: 'ct-1',
        uomCode: 'CT',
        displayName: 'Carton',
        level: 3,
        conversionFactorToEa: 72,
        parentUomCode: 'IP',
        status: 'ACTIVE',
      },
    ],
    ...overrides,
  }
}

function getLevelRows() {
  return screen.queryAllByTestId(/uom-level-row-/)
}

function getSelectByLabel(container: HTMLElement, label: string): HTMLSelectElement {
  const labelEl = within(container).getByText(label)
  const select = labelEl.parentElement?.querySelector('select')
  if (!select) throw new Error(`Select not found for label ${label}`)
  return select as HTMLSelectElement
}

function getInputByLabel(container: HTMLElement, label: string): HTMLInputElement {
  const labelEl = within(container).getByText(label)
  const input = labelEl.parentElement?.querySelector('input')
  if (!input) throw new Error(`Input not found for label ${label}`)
  return input as HTMLInputElement
}

describe('previewFactorToParent', () => {
  it('returns em dash for blank, zero, equal, or smaller child factors', () => {
    expect(previewFactorToParent('', 1)).toBe('—')
    expect(previewFactorToParent('   ', 1)).toBe('—')
    expect(previewFactorToParent(0, 1)).toBe('—')
    expect(previewFactorToParent(1, 1)).toBe('—')
    expect(previewFactorToParent(6, 12)).toBe('—')
  })

  it('returns quotient when child is greater and divisible by parent', () => {
    expect(previewFactorToParent(12, 1)).toBe('12')
    expect(previewFactorToParent(72, 12)).toBe('6')
  })
})

describe('UomFormPanel dynamic hierarchy', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('adds a level and prefills display name from selected Master Code', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <UomFormPanel
        open
        mode="create"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    )

    await user.type(screen.getByPlaceholderText('ID Owner'), OWNER_A)
    await user.click(screen.getByRole('button', { name: 'Tambah Level' }))

    expect(getLevelRows()).toHaveLength(1)

    const row = getLevelRows()[0]
    const codeSelect = getSelectByLabel(row, 'Kode UOM *')
    await user.selectOptions(codeSelect, 'IP')

    expect(getInputByLabel(getLevelRows()[0], 'Nama tampilan *')).toHaveValue('Inner Pack')
  })

  it('removes a middle level and rewires the next parent', async () => {
    const user = userEvent.setup()

    render(
      <UomFormPanel
        open
        mode="edit"
        initialData={baseHierarchy()}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    )

    expect(getLevelRows()).toHaveLength(2)
    expect(getInputByLabel(getLevelRows()[1], 'Parent UOM')).toHaveValue('IP')

    await user.click(within(getLevelRows()[0]).getByRole('button', { name: 'Hapus' }))

    expect(getLevelRows()).toHaveLength(1)
    const remaining = getLevelRows()[0]
    expect(getSelectByLabel(remaining, 'Kode UOM *')).toHaveValue('CT')
    expect(getInputByLabel(remaining, 'Parent UOM')).toHaveValue('EA')
    expect(getSelectByLabel(remaining, 'Level *')).toHaveValue('3')
  })

  it('moves a level to a free slot and rewires the parent chain', async () => {
    const user = userEvent.setup()

    render(
      <UomFormPanel
        open
        mode="edit"
        initialData={baseHierarchy()}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    )

    const ipRowBefore = getLevelRows().find(
      (row) => getSelectByLabel(row, 'Kode UOM *').value === 'IP'
    )
    expect(ipRowBefore).toBeTruthy()

    await user.selectOptions(getSelectByLabel(ipRowBefore!, 'Level *'), '4')

    const rows = getLevelRows()
    const ctRow = rows.find((row) => getSelectByLabel(row, 'Kode UOM *').value === 'CT')
    const ipRow = rows.find((row) => getSelectByLabel(row, 'Kode UOM *').value === 'IP')

    expect(getSelectByLabel(ctRow!, 'Level *')).toHaveValue('3')
    expect(getInputByLabel(ctRow!, 'Parent UOM')).toHaveValue('EA')
    expect(getSelectByLabel(ipRow!, 'Level *')).toHaveValue('4')
    expect(getInputByLabel(ipRow!, 'Parent UOM')).toHaveValue('CT')
  })

  it('does not offer a level that another row already uses', async () => {
    render(
      <UomFormPanel
        open
        mode="edit"
        initialData={baseHierarchy()}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    )

    const ipRow = getLevelRows().find(
      (row) => getSelectByLabel(row, 'Kode UOM *').value === 'IP'
    )!
    const levelValues = Array.from(getSelectByLabel(ipRow, 'Level *').options).map(
      (option) => option.value
    )

    // CT holds level 3, so only IP's own level and the free ones are selectable.
    expect(levelValues).toEqual(['2', '4', '5'])
  })

  it('marks unsupported codes after Owner change and blocks submit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <UomFormPanel
        open
        mode="create"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    )

    await user.type(screen.getByPlaceholderText('ID Owner'), OWNER_A)
    await user.type(screen.getByPlaceholderText('cth. SKU-001'), 'SKU-001')
    await user.click(screen.getByRole('button', { name: 'Tambah Level' }))

    const row = getLevelRows()[0]
    await user.selectOptions(getSelectByLabel(row, 'Kode UOM *'), 'CT')
    await user.type(getInputByLabel(row, 'Faktor ke EA *'), '12')

    const ownerInput = screen.getByPlaceholderText('ID Owner')
    await user.clear(ownerInput)
    await user.type(ownerInput, OWNER_B)

    expect(
      screen.getByText('Kode UOM CT tidak tersedia untuk Owner ini')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows em dash for blank factor preview', async () => {
    const user = userEvent.setup()

    render(
      <UomFormPanel
        open
        mode="create"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    )

    await user.type(screen.getByPlaceholderText('ID Owner'), OWNER_A)
    await user.click(screen.getByRole('button', { name: 'Tambah Level' }))

    const row = getLevelRows()[0]
    await user.selectOptions(getSelectByLabel(row, 'Kode UOM *'), 'IP')

    expect(getInputByLabel(row, 'Faktor ke parent')).toHaveValue('—')
  })

  it('disables add when hierarchy already has five levels', async () => {
    render(
      <UomFormPanel
        open
        mode="edit"
        initialData={baseHierarchy({
          levels: [
            { ...defaultEaLevel, id: 'ea' },
            {
              id: 'ip',
              uomCode: 'IP',
              displayName: 'Inner Pack',
              level: 2,
              conversionFactorToEa: 12,
              parentUomCode: 'EA',
              status: 'ACTIVE',
            },
            {
              id: 'ct',
              uomCode: 'CT',
              displayName: 'Carton',
              level: 3,
              conversionFactorToEa: 72,
              parentUomCode: 'IP',
              status: 'ACTIVE',
            },
            {
              id: 'cs',
              uomCode: 'CS',
              displayName: 'Case',
              level: 4,
              conversionFactorToEa: 144,
              parentUomCode: 'CT',
              status: 'ACTIVE',
            },
            {
              id: 'pl',
              uomCode: 'PL',
              displayName: 'Pallet',
              level: 5,
              conversionFactorToEa: 1440,
              parentUomCode: 'CS',
              status: 'ACTIVE',
            },
          ],
        })}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    )

    expect(screen.getByText('5/5 level')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tambah Level' })).toBeDisabled()
  })

  it('clears display name when placeholder UOM is selected', async () => {
    const user = userEvent.setup()

    render(
      <UomFormPanel
        open
        mode="edit"
        initialData={baseHierarchy({
          levels: [
            { ...defaultEaLevel, id: 'ea' },
            {
              id: 'ip',
              uomCode: 'IP',
              displayName: 'Inner Pack',
              level: 2,
              conversionFactorToEa: 12,
              parentUomCode: 'EA',
              status: 'ACTIVE',
            },
          ],
        })}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    )

    const row = getLevelRows()[0]
    expect(getInputByLabel(row, 'Nama tampilan *')).toHaveValue('Inner Pack')

    await user.selectOptions(getSelectByLabel(row, 'Kode UOM *'), '')
    expect(getInputByLabel(getLevelRows()[0], 'Nama tampilan *')).toHaveValue('')
  })

  it('keeps level rows mounted when editing a lower level, so scroll and focus hold', async () => {
    const user = userEvent.setup()

    render(
      <UomFormPanel
        open
        mode="edit"
        initialData={baseHierarchy()}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    )

    const [ipRowBefore, ctRowBefore] = getLevelRows()
    const ctSelectBefore = getSelectByLabel(ctRowBefore, 'Kode UOM *')

    await user.selectOptions(ctSelectBefore, 'CS')

    const [ipRowAfter, ctRowAfter] = getLevelRows()
    expect(ipRowAfter).toBe(ipRowBefore)
    expect(ctRowAfter).toBe(ctRowBefore)
    expect(getSelectByLabel(ctRowAfter, 'Kode UOM *')).toBe(ctSelectBefore)
    expect(ctSelectBefore).toHaveValue('CS')
    expect(getInputByLabel(ctRowAfter, 'Nama tampilan *')).toHaveValue('Case')
    expect(getInputByLabel(ctRowAfter, 'Parent UOM')).toHaveValue('IP')
  })

  it('keeps rows mounted when moving a level number', async () => {
    const user = userEvent.setup()

    render(
      <UomFormPanel
        open
        mode="edit"
        initialData={baseHierarchy()}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    )

    const rowsBefore = getLevelRows()
    const ipRow = rowsBefore.find(
      (row) => getSelectByLabel(row, 'Kode UOM *').value === 'IP'
    )!

    await user.selectOptions(getSelectByLabel(ipRow, 'Level *'), '4')

    expect(getLevelRows()).toEqual(rowsBefore)
  })

  it('offers every free level when no other row competes', () => {
    const levels: UomLevelFormData[] = [
      { ...defaultEaLevel, id: 'ea' },
      {
        id: 'ip',
        uomCode: 'IP',
        displayName: 'Inner Pack',
        level: 2,
        conversionFactorToEa: 12,
        parentUomCode: 'EA',
        status: 'ACTIVE',
      },
    ]

    expect(buildLevelOptions(levels, 1).map((option) => option.value)).toEqual([
      '2',
      '3',
      '4',
      '5',
    ])
  })

  it('keeps level gaps when syncing parents after removal', () => {
    const synced = syncLevelParents([
      { ...defaultEaLevel, id: 'ea' },
      {
        id: 'ct',
        uomCode: 'CT',
        displayName: 'Carton',
        level: 3,
        conversionFactorToEa: 72,
        parentUomCode: 'IP',
        status: 'ACTIVE',
      },
    ])

    expect(synced.map((level) => level.level)).toEqual([1, 3])
    expect(synced[1].parentUomCode).toBe('EA')
  })
})
