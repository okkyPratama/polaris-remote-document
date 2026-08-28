import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UomHierarchy } from '../../types/uom.types'

const {
  hierarchy,
  createMutateAsync,
  updateMutateAsync,
  createPending,
  updatePending,
} = vi.hoisted(() => {
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
      {
        id: 'ip-1',
        uomCode: 'IP',
        displayName: 'Inner Pack',
        level: 2,
        conversionFactorToEa: 12,
        conversionFactorToParent: 12,
        parentUomCode: 'EA',
        status: 'ACTIVE',
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
    createPending: { value: false },
    updatePending: { value: false },
  }
})

vi.mock('../../hooks/useUoms', () => ({
  useUoms: () => ({
    data: { data: [hierarchy], total: 1 },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
  }),
  useUomDetail: (id: string | undefined) => ({
    data: id === hierarchy.id ? hierarchy : undefined,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCreateUom: () => ({
    mutateAsync: createMutateAsync,
    isPending: createPending.value,
  }),
  useUpdateUom: () => ({
    mutateAsync: updateMutateAsync,
    isPending: updatePending.value,
  }),
  useUomCodeOptions: () => ({
    data: [
      { code: 'EA', name: 'Each' },
      { code: 'IP', name: 'Inner Pack' },
      { code: 'CT', name: 'Carton' },
    ],
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
import { toast } from '@polaris/ui'

describe('UomPage create/edit wiring', () => {
  beforeEach(() => {
    createMutateAsync.mockReset()
    updateMutateAsync.mockReset()
    createPending.value = false
    updatePending.value = false
    createMutateAsync.mockResolvedValue('created')
    updateMutateAsync.mockResolvedValue('updated')
    vi.mocked(toast.success).mockReset()
    vi.mocked(toast.error).mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('hides Tambah Hierarki when canCreate is false', () => {
    render(<UomPage canCreate={false} canUpdate canDelete />)
    expect(screen.queryByRole('button', { name: 'Tambah Hierarki' })).not.toBeInTheDocument()
  })

  it('hides Edit when canUpdate is false', async () => {
    const user = userEvent.setup()
    render(<UomPage canCreate canUpdate={false} canDelete />)

    await user.click(screen.getByText('SKU-001'))
    expect(screen.getByText('Hierarki Kemasan')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('does not show Hapus even when canDelete is true (delete deferred)', async () => {
    const user = userEvent.setup()
    render(<UomPage canCreate canUpdate canDelete />)

    await user.click(screen.getByText('SKU-001'))
    expect(screen.getByText('Hierarki Kemasan')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hapus' })).not.toBeInTheDocument()
  })

  it('keeps create form open when create mutation fails', async () => {
    const user = userEvent.setup()
    createMutateAsync.mockRejectedValue({
      errorMessage: ['Owner + SKU already exists'],
      message: 'Conflict',
    })

    render(<UomPage canCreate canUpdate canDelete />)

    await user.click(screen.getByRole('button', { name: 'Tambah Hierarki' }))
    expect(screen.getByText('Tambah Hierarki UOM')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('ID Owner'), 'owner-a')
    await user.type(screen.getByPlaceholderText('cth. SKU-001'), 'SKU-NEW')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(createMutateAsync).toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Error', 'Owner + SKU already exists')
    expect(screen.getByText('Tambah Hierarki UOM')).toBeInTheDocument()
  })

  it('closes create form after successful create', async () => {
    const user = userEvent.setup()

    render(<UomPage canCreate canUpdate canDelete />)

    await user.click(screen.getByRole('button', { name: 'Tambah Hierarki' }))
    await user.type(screen.getByPlaceholderText('ID Owner'), 'owner-a')
    await user.type(screen.getByPlaceholderText('cth. SKU-001'), 'SKU-NEW')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(createMutateAsync).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalled()
    expect(screen.queryByText('Tambah Hierarki UOM')).not.toBeInTheDocument()
  })

  it('updates the selected id and returns to detail after successful edit', async () => {
    const user = userEvent.setup()

    render(<UomPage canCreate canUpdate canDelete />)

    await user.click(screen.getByText('SKU-001'))
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByText('Edit Hierarki UOM')).toBeInTheDocument()

    const displayNameInputs = screen.getAllByPlaceholderText('cth. Each')
    await user.clear(displayNameInputs[0])
    await user.type(displayNameInputs[0], 'Each Updated')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(updateMutateAsync).toHaveBeenCalledWith({
      id: 'uom-1',
      data: expect.objectContaining({
        ownerId: 'owner-a',
        skuCode: 'SKU-001',
      }),
    })
    expect(toast.success).toHaveBeenCalled()
    expect(screen.queryByText('Edit Hierarki UOM')).not.toBeInTheDocument()
    expect(screen.getByText('Hierarki Kemasan')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })
})
