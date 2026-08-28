import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getOptions } = vi.hoisted(() => ({
  getOptions: vi.fn(),
}))

vi.mock('../api/zone-group.api', () => ({
  zoneGroupApi: {
    getOptions,
  },
}))

import { useZoneGroupOptions } from './useZoneGroupOptions'

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
  { id: 'zg-1', code: 'ZG-DRY', name: 'Dry Storage' },
  { id: 'zg-2', code: 'ZG-COLD', name: 'Cold Storage' },
]

describe('useZoneGroupOptions', () => {
  beforeEach(() => {
    getOptions.mockReset()
  })

  it('returns compact options on success', async () => {
    getOptions.mockResolvedValue(OPTIONS)

    const { result } = renderHook(() => useZoneGroupOptions(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getOptions).toHaveBeenCalledTimes(1)
    expect(result.current.data).toEqual(OPTIONS)
    expect(result.current.isError).toBe(false)
  })

  it('exposes loading while the request is in flight', () => {
    getOptions.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useZoneGroupOptions(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading || result.current.isPending).toBe(true)
    expect(result.current.data).toBeUndefined()
    expect(result.current.isError).toBe(false)
  })

  it('exposes error when the request fails', async () => {
    getOptions.mockRejectedValue(new Error('options failed'))

    const { result } = renderHook(() => useZoneGroupOptions(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.data).toBeUndefined()
    expect(result.current.error).toEqual(expect.objectContaining({ message: 'options failed' }))
  })
})
