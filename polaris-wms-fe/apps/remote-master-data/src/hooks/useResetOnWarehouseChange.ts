import { useEffect, useRef } from 'react'
import { useWarehouseContextSwitch } from './useWarehouseContextSwitch'

/** Run callback when active warehouse changes (after switchContext). Skips initial mount. */
export function useResetOnWarehouseChange(onReset: () => void) {
  const { selectedWarehouse } = useWarehouseContextSwitch()
  const previousIdRef = useRef<string | undefined>(selectedWarehouse?.id)

  useEffect(() => {
    const currentId = selectedWarehouse?.id
    if (!currentId) return
    if (previousIdRef.current && previousIdRef.current !== currentId) {
      onReset()
    }
    previousIdRef.current = currentId
  }, [selectedWarehouse?.id, onReset])
}
