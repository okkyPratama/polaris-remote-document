import type { ReactNode } from 'react'
import { toast } from '@polaris/ui'
import { useWarehouseContextSwitch } from '../../../hooks/useWarehouseContextSwitch'

interface SpatialWarehouseContextCardProps {
  trailing?: ReactNode
}

const SELECT_CLASS =
  'border border-[#ebebeb] rounded-lg py-[6px] pl-[11px] pr-8 text-[13px] font-medium text-[#1f2b59] bg-white appearance-none bg-[url(\'data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2712%27%20height=%2712%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23485885%27%20stroke-width=%272%27%3E%3Cpath%20d=%27M6%209l6%206%206-6%27/%3E%3C/svg%3E\')] bg-no-repeat bg-[right_10px_center] cursor-pointer focus:outline-none focus:border-[#001871] focus:shadow-[0_0_0_3px_rgba(0,24,113,0.08)] disabled:opacity-60 disabled:cursor-not-allowed min-w-[220px] max-w-full'

export function SpatialWarehouseContextCard({ trailing }: SpatialWarehouseContextCardProps) {
  const { options, selectedWarehouse, switchWarehouse, isSwitching, warehouses } =
    useWarehouseContextSwitch()

  if (warehouses.length === 0) return null

  return (
    <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-2.5 flex-wrap shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-[11px] font-bold text-[#a9b1c6] uppercase tracking-[0.08em] whitespace-nowrap">
          Gudang
        </span>
        <select
          aria-label="Gudang aktif"
          className={SELECT_CLASS}
          value={selectedWarehouse?.id ?? ''}
          disabled={isSwitching || options.length <= 1}
          aria-busy={isSwitching || undefined}
          onChange={async (e) => {
            const next = warehouses.find((wh) => wh.id === e.target.value)
            if (!next) return
            try {
              await switchWarehouse(next)
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Gagal mengganti gudang'
              toast.error('Gagal ganti gudang', message)
            }
          }}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {trailing ? <div className="ml-auto flex items-center gap-2">{trailing}</div> : null}
    </div>
  )
}
