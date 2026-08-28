import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  LocationBulkItem,
  SpatialOption,
} from '../../../types/spatial.types'
import { LocationBulkCreatePanel } from './LocationBulkCreatePanel'

const zone = vi.hoisted(() => {
  const activeZone: SpatialOption = {
    id: 'z-1',
    code: 'Z-1',
    name: 'Zone 1',
  }
  return activeZone
})

vi.mock('../../../hooks/useZoneOptions', () => ({
  useZoneOptions: () => ({
    data: [zone],
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
  }),
}))

const BATCH_MESSAGE = 'Bulk location creation failed validation. No records were created.'
const ROW_ERROR_MESSAGE = 'code already exists in warehouse.'

function bulkFailure(index = 0, code = 'LOC-1') {
  return {
    httpCode: 400,
    status: 400,
    message: 'Failed',
    errorMessage: [BATCH_MESSAGE],
    data: {
      data: [
        {
          createdCount: 0,
          errors: [{ index, code, messages: [ROW_ERROR_MESSAGE] }],
        },
      ],
    },
  }
}

async function fillRow(
  user: ReturnType<typeof userEvent.setup>,
  row: HTMLElement,
  code: string
) {
  const zoneSelect = within(row).getByRole('combobox', { name: /Zona/i })
  await user.selectOptions(zoneSelect, 'z-1')

  const codeInput = within(row).getByPlaceholderText('LOC-A01-01')
  await user.clear(codeInput)
  await user.type(codeInput, code)
}

async function seedBackendRowError(
  onSubmit: (items: LocationBulkItem[]) => Promise<void>
) {
  const user = userEvent.setup()
  render(
    <LocationBulkCreatePanel open onClose={vi.fn()} onSubmit={onSubmit} />
  )

  const firstRow = screen.getByText('Baris 1').closest('div.border') as HTMLElement
  await fillRow(user, firstRow, 'LOC-1')

  await user.click(screen.getByRole('button', { name: /Tambah baris/i }))
  const secondRow = screen.getByText('Baris 2').closest('div.border') as HTMLElement
  await fillRow(user, secondRow, 'LOC-2')

  await user.click(screen.getByRole('button', { name: /Pratinjau/i }))
  await user.click(screen.getByRole('button', { name: /Kirim 2 Lokasi/i }))

  expect(await screen.findByText(BATCH_MESSAGE)).toBeInTheDocument()
  expect(screen.getByText(/Backend error \(index 0/)).toBeInTheDocument()
  expect(screen.getByText(ROW_ERROR_MESSAGE)).toBeInTheDocument()

  return user
}

describe('LocationBulkCreatePanel stale backend row errors', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('clears backend row errors when a row field is edited, keeps batch message', async () => {
    const onSubmit = vi.fn().mockRejectedValue(bulkFailure())
    const user = await seedBackendRowError(onSubmit)

    const firstRow = screen.getByText('Baris 1').closest('div.border') as HTMLElement
    const codeInput = within(firstRow).getByPlaceholderText('LOC-A01-01')
    await user.type(codeInput, 'A')

    expect(screen.queryByText(/Backend error \(index/)).not.toBeInTheDocument()
    expect(screen.queryByText(ROW_ERROR_MESSAGE)).not.toBeInTheDocument()
    expect(screen.getByText(BATCH_MESSAGE)).toBeInTheDocument()
  })

  it('clears backend row errors when a row is added, keeps batch message', async () => {
    const onSubmit = vi.fn().mockRejectedValue(bulkFailure())
    const user = await seedBackendRowError(onSubmit)

    await user.click(screen.getByRole('button', { name: /Tambah baris/i }))

    expect(screen.getByText('Baris 3')).toBeInTheDocument()
    expect(screen.queryByText(/Backend error \(index/)).not.toBeInTheDocument()
    expect(screen.queryByText(ROW_ERROR_MESSAGE)).not.toBeInTheDocument()
    expect(screen.getByText(BATCH_MESSAGE)).toBeInTheDocument()
  })

  it('clears all backend row errors when a row is removed, keeps batch message', async () => {
    const onSubmit = vi.fn().mockRejectedValue(bulkFailure())
    const user = await seedBackendRowError(onSubmit)

    const secondRow = screen.getByText('Baris 2').closest('div.border') as HTMLElement
    await user.click(within(secondRow).getByRole('button', { name: /Hapus/i }))

    expect(screen.queryByText('Baris 2')).not.toBeInTheDocument()
    expect(screen.queryByText(/Backend error \(index/)).not.toBeInTheDocument()
    expect(screen.queryByText(ROW_ERROR_MESSAGE)).not.toBeInTheDocument()
    expect(screen.getByText(BATCH_MESSAGE)).toBeInTheDocument()
  })
})
