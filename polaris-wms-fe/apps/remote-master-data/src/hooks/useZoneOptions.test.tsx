import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getOptions } = vi.hoisted(() => ({
  getOptions: vi.fn(),
}))

vi.mock('../api/zone.api', () => ({
  zoneApi: {
    getOptions,
  },
}))

import { useZoneOptions } from './useZoneOptions'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

const OPTIONS = [
  { id: 'z-1', code: 'Z-DRY', name: 'Dry Zone' },
  { id: 'z-2', code: 'Z-COLD', name: 'Cold Zone' },
]

describe('useZoneOptions', () => {
  beforeEach(() => {
    getOptions.mockReset()
  })

  it('returns compact warehouse-wide options on success', async () => {
    getOptions.mockResolvedValue(OPTIONS)

    const { result } = renderHook(() => useZoneOptions(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getOptions).toHaveBeenCalledTimes(1)
    expect(getOptions).toHaveBeenCalledWith(undefined)
    expect(result.current.data).toEqual(OPTIONS)
    expect(result.current.isError).toBe(false)
  })

  it('passes zoneGroupId for parent-scoped options', async () => {
    getOptions.mockResolvedValue(OPTIONS)

    const { result } = renderHook(() => useZoneOptions('zg-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getOptions).toHaveBeenCalledWith('zg-1')
  })

  it('exposes loading while the request is in flight', () => {
    getOptions.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useZoneOptions(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading || result.current.isPending).toBe(true)
    expect(result.current.data).toBeUndefined()
    expect(result.current.isError).toBe(false)
  })

  it('exposes error when the request fails', async () => {
    getOptions.mockRejectedValue(new Error('options failed'))

    const { result } = renderHook(() => useZoneOptions(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.data).toBeUndefined()
    expect(result.current.error).toEqual(expect.objectContaining({ message: 'options failed' }))
  })
})
