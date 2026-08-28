import { useRef, useCallback } from 'react'

/**
 * Hook for request cancellation using AbortController.
 * Per §8.5: request lama wajib di-cancel saat request baru di-trigger.
 *
 * Usage:
 * ```tsx
 * const { getSignal, cancelPrevious } = useCancellable()
 *
 * const fetchData = async () => {
 *   cancelPrevious() // Cancel any in-flight request
 *   const signal = getSignal()
 *   const data = await api.getAll({ signal })
 * }
 * ```
 */
export function useCancellable() {
  const controllerRef = useRef<AbortController | null>(null)

  const cancelPrevious = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort()
    }
  }, [])

  const getSignal = useCallback((): AbortSignal => {
    // Cancel previous before creating new
    cancelPrevious()
    controllerRef.current = new AbortController()
    return controllerRef.current.signal
  }, [cancelPrevious])

  return { getSignal, cancelPrevious }
}
