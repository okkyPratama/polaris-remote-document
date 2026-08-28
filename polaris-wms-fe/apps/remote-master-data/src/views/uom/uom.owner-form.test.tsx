import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  UomCodeOption,
  UomHierarchyFormData,
} from '../../types/uom.types'
import { defaultEaLevel } from '../../types/uom.types'
import { UomFormPanel } from './UomFormPanel'
import UomPage from './index'

const OWNER_A = 'owner-a'
const OWNER_B = 'owner-b'
const OWNER_OUTSIDE = 'owner-outside'

const optionsByOwner = vi.hoisted(() => {
  const ownerA: UomCodeOption[] = [
    { code: 'EA', name: 'Each' },
    { code: 'IP', name: 'Inner Pack' },
    { code: 'CT', name: 'Carton' },
  ]
  const ownerB: UomCodeOption[] = [
    { code: 'EA', name: 'Each' },
    { code: 'IP', name: 'Inner Pack B' },
  ]
  return { ownerA, ownerB }
})

const {
  hierarchy,
  createMutateAsync,
  updateMutateAsync,
  useUomsMock,
} = vi.hoisted(() => {
  const hierarchy = {
    id: 'uom-1',
    ownerId: 'owner-a',
    skuCode: 'SKU-001',
    status: 'ACTIVE' as const,
    levels: [
      {
        id: 'ea-1',
        uomCode: 'EA',
        displayName: 'Each',
        level: 1,
        conversionFactorToEa: 1,
        conversionFactorToParent: null,
        parentUomCode: null,
        status: 'ACTIVE' as const,
      },
      {
        id: 'ip-1',
        uomCode: 'IP',
        displayName: 'Inner Pack',
        level: 2,
        conversionFactorToEa: 12,
        conversionFactorToParent: 12,
        parentUomCode: 'EA',
        status: 'ACTIVE' as const,
      },
    ],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    updatedBy: 'admin',
  }

  return {
    hierarchy,
    createMutateAsync: vi.fn(),
    updateMutateAsync: vi.fn(),
    useUomsMock: vi.fn(() => ({
      data: { data: [hierarchy], total: 1 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    })),
  }
})

vi.mock('../../hooks/useUoms', () => ({
  useUoms: useUomsMock,
  useUomDetail: (id: string | undefined) => ({
    data: id === hierarchy.id ? hierarchy : undefined,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCreateUom: () => ({
    mutateAsync: createMutateAsync,
    isPending: false,
  }),
  useUpdateUom: () => ({
    mutateAsync: updateMutateAsync,
    isPending: false,
  }),
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

function getLevelRows() {
  return screen.queryAllByTestId(/uom-level-row-/)
}

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
    ],
    ...overrides,
  }
}

describe('UomFormPanel Owner create/edit', () => {
  afterEach(() => {
    cleanup()
    createMutateAsync.mockReset()
    updateMutateAsync.mockReset()
    vi.clearAllMocks()
  })

  it('auto-selects single Owner into form state and includes it in create payload', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <UomFormPanel
        open
        mode="create"
        ownerContextIds={[OWNER_A]}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    )

    const ownerInput = getInputByLabel(document.body, 'Owner ID *')
    expect(ownerInput).toBeDisabled()
    expect(ownerInput).toHaveValue(OWNER_A)

    await user.type(screen.getByPlaceholderText('cth. SKU-001'), 'SKU-NEW')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: OWNER_A,
        skuCode: 'SKU-NEW',
      })
    )
  })

  it('offers only session Owners for multi create and requires a specific choice', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <UomFormPanel
        open
        mode="create"
        ownerContextIds={[OWNER_A, OWNER_B, ` ${OWNER_A} `]}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    )

    const ownerSelect = screen.getByLabelText('Owner ID') as HTMLSelectElement
    const optionLabels = Array.from(ownerSelect.options).map((opt) => opt.textContent)
    expect(optionLabels).toEqual(['Pilih Owner', OWNER_A, OWNER_B])
    expect(optionLabels).not.toContain(OWNER_OUTSIDE)
    expect(optionLabels).not.toContain('Semua Owner')
    expect(ownerSelect.value).toBe('')

    await user.type(screen.getByPlaceholderText('cth. SKU-001'), 'SKU-NEW')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(onSubmit).not.toHaveBeenCalled()

    await user.selectOptions(ownerSelect, OWNER_B)
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: OWNER_B,
        skuCode: 'SKU-NEW',
      })
    )
  })

  it('falls back to free-text Owner for null and undefined', () => {
    const { rerender } = render(
      <UomFormPanel open mode="create" ownerContextIds={null} onClose={vi.fn()} onSubmit={vi.fn()} />
    )
    expect(screen.getByPlaceholderText('ID Owner')).toBeInTheDocument()

    rerender(
      <UomFormPanel open mode="create" onClose={vi.fn()} onSubmit={vi.fn()} />
    )
    expect(screen.getByPlaceholderText('ID Owner')).toBeInTheDocument()
  })

  it('keeps edit Owner read-only from initialData, not session options', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <UomFormPanel
        open
        mode="edit"
        ownerContextIds={[OWNER_B]}
        initialData={baseHierarchy({ ownerId: OWNER_A })}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    )

    const ownerInput = getInputByLabel(document.body, 'Owner ID *')
    expect(ownerInput).toBeDisabled()
    expect(ownerInput).toHaveValue(OWNER_A)
    expect(screen.queryByLabelText('Owner ID')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: OWNER_A,
        skuCode: 'SKU-001',
      })
    )
  })

  it('reloads UOM options and blocks unsupported codes when create Owner changes', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <UomFormPanel
        open
        mode="create"
        ownerContextIds={[OWNER_A, OWNER_B]}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    )

    await user.selectOptions(screen.getByLabelText('Owner ID'), OWNER_A)
    await user.type(screen.getByPlaceholderText('cth. SKU-001'), 'SKU-001')
    await user.click(screen.getByRole('button', { name: 'Tambah Level' }))

    const row = getLevelRows()[0]
    await user.selectOptions(getSelectByLabel(row, 'Kode UOM *'), 'CT')
    await user.type(getInputByLabel(row, 'Faktor ke EA *'), '12')

    expect(screen.getByPlaceholderText('cth. SKU-001')).toHaveValue('SKU-001')
    expect(getSelectByLabel(getLevelRows()[0], 'Kode UOM *')).toHaveValue('CT')

    await user.selectOptions(screen.getByLabelText('Owner ID'), OWNER_B)

    expect(screen.getByPlaceholderText('cth. SKU-001')).toHaveValue('SKU-001')
    expect(getSelectByLabel(getLevelRows()[0], 'Kode UOM *')).toHaveValue('CT')
    expect(
      screen.getByText('Kode UOM CT tidak tersedia untuk Owner ini')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('blocks create submit when ownerContextIds is []', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <UomFormPanel
        open
        mode="create"
        ownerContextIds={[]}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    )

    expect(screen.getByText('User belum memiliki akses Owner.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('UomPage create gate for empty Owner access', () => {
  afterEach(() => {
    cleanup()
    useUomsMock.mockClear()
  })

  it('disables Tambah Hierarki and does not open create when ownerContextIds is []', async () => {
    const user = userEvent.setup()

    render(<UomPage ownerContextIds={[]} canCreate canUpdate />)

    const addButton = screen.getByRole('button', { name: 'Tambah Hierarki' })
    expect(addButton).toBeDisabled()
    expect(screen.getAllByText('User belum memiliki akses Owner.').length).toBeGreaterThan(0)

    await user.click(addButton)
    expect(screen.queryByText('Tambah Hierarki UOM')).not.toBeInTheDocument()
  })
})
