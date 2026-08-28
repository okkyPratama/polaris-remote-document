import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getAuthorizedWarehouses,
  getSelectedWarehouse,
  switchWarehouseContext,
  WAREHOUSE_CHANGED_EVENT,
  type WarehouseContextItem,
} from '@polaris/service'

export function useWarehouseContextSwitch() {
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseContextItem | null>(() =>
    getSelectedWarehouse()
  )
  const [warehouses, setWarehouses] = useState<WarehouseContextItem[]>(() => getAuthorizedWarehouses())
  const [isSwitching, setIsSwitching] = useState(false)

  const syncFromStorage = useCallback(() => {
    setSelectedWarehouse(getSelectedWarehouse())
    setWarehouses(getAuthorizedWarehouses())
  }, [])

  useEffect(() => {
    syncFromStorage()
    window.addEventListener(WAREHOUSE_CHANGED_EVENT, syncFromStorage)
    window.addEventListener('storage', syncFromStorage)
    return () => {
      window.removeEventListener(WAREHOUSE_CHANGED_EVENT, syncFromStorage)
      window.removeEventListener('storage', syncFromStorage)
    }
  }, [syncFromStorage])

  const switchWarehouse = useCallback(
    async (warehouse: WarehouseContextItem) => {
      if (warehouse.id === selectedWarehouse?.id) return
      setIsSwitching(true)
      try {
        await switchWarehouseContext(warehouse)
        syncFromStorage()
      } finally {
        setIsSwitching(false)
      }
    },
    [selectedWarehouse?.id, syncFromStorage]
  )

  const options = useMemo(
    () =>
      warehouses.map((wh) => ({
        value: wh.id,
        label: `${wh.code} — ${wh.name}`,
      })),
    [warehouses]
  )

  return {
    warehouses,
    options,
    selectedWarehouse,
    switchWarehouse,
    isSwitching,
  }
}
