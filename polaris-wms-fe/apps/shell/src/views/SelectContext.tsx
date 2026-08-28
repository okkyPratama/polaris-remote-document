import { useState } from 'react'
import { useAuthContext } from '@/contexts/AuthProvider'
import { useNavigate } from 'react-router-dom'
import type { Warehouse } from '@/contexts/AuthProvider'

/**
 * Select Context page — sesuai UI select-context.html
 * Nanti list warehouse datang dari API `/auth/session` response.
 */

const DUMMY_WAREHOUSES: (Warehouse & { city: string; capacity: string; slots: string; status: string; temps: string[] })[] = [
  { id: '1', code: 'WH-JKT-01', name: 'Gudang Jakarta Utara', company: 'Jakarta Utara, DKI Jakarta', city: 'Jakarta Utara, DKI Jakarta', capacity: '12.000 m²', slots: '1.240 slot', status: 'aktif', temps: ['Ambient', 'Chiller', 'Freezer'] },
  { id: '2', code: 'WH-SBY-01', name: 'Gudang Surabaya', company: 'Surabaya, Jawa Timur', city: 'Surabaya, Jawa Timur', capacity: '8.500 m²', slots: '860 slot', status: 'aktif', temps: ['Ambient', 'Chiller'] },
  { id: '3', code: 'WH-BDG-01', name: 'Gudang Bandung', company: 'Bandung, Jawa Barat', city: 'Bandung, Jawa Barat', capacity: '5.200 m²', slots: '520 slot', status: 'maintenance', temps: ['Ambient'] },
]

export function SelectContext() {
  const { user, setSelectedWarehouse, logout } = useAuthContext()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string | null>(DUMMY_WAREHOUSES[0]?.id || null)

  const displayName = user?.name || user?.preferred_username || 'User'
  const initials = displayName.split(' ').map((w: string) => w[0] || '').join('').slice(0, 2).toUpperCase()
  const selectedWh = DUMMY_WAREHOUSES.find((w) => w.id === selected)

  const handleEnter = async () => {
    if (!selectedWh) return
    try {
      await setSelectedWarehouse(selectedWh)
      navigate('/', { replace: true })
    } catch {
      // AuthProvider restores previous context and surfaces the error.
      // Stay on context selection so the user can retry.
    }
  }

  return (
    <div className="min-h-screen bg-[#f1f3f8]">
      {/* Top bar */}
      <div className="bg-white border-b border-[#ebebeb] px-8 h-14 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] bg-[#001871] rounded-lg flex items-center justify-center">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold text-[#001871] tracking-tight">POLARIS WMS</div>
            <div className="text-[9px] text-[#a9b1c6] tracking-wider uppercase">ASSA · Triputra Group</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-semibold text-[#1f2b59]">{displayName}</div>
            <div className="text-[10px] text-[#949eb8]">{user?.roles?.join(', ') || '-'}</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#001871] flex items-center justify-center text-white text-[11px] font-bold">{initials}</div>
          <button onClick={logout} className="border border-[#ebebeb] rounded-lg px-3 py-1.5 text-xs text-[#485885] cursor-pointer hover:bg-[#f1f3f8] transition-colors">
            Keluar
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-[760px] mx-auto px-6 pt-14 pb-10">
        <div className="text-[11px] font-bold text-[#a9b1c6] tracking-wider uppercase mb-2">Pilih Konteks Kerja</div>
        <h1 className="text-2xl font-bold text-[#001871] tracking-tight mb-1.5">Pilih Gudang</h1>
        <p className="text-[13px] text-[#485885] mb-9 leading-relaxed">
          Pilih gudang yang ingin Anda kelola. Semua operasi dan laporan akan dibatasi pada gudang yang dipilih selama sesi berlangsung.
        </p>

        {/* Warehouse grid */}
        <div className="grid grid-cols-2 gap-3.5 mb-8">
          {DUMMY_WAREHOUSES.map((wh) => {
            const isSelected = selected === wh.id
            return (
              <div
                key={wh.id}
                onClick={() => setSelected(wh.id)}
                className={`bg-white border-2 rounded-2xl px-5 py-5 cursor-pointer transition-all relative overflow-hidden ${
                  isSelected
                    ? 'border-[#001871] shadow-[0_0_0_3px_rgba(0,24,113,0.08)]'
                    : 'border-[#ebebeb] hover:border-[rgba(0,24,113,0.3)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                }`}
              >
                {/* Check circle */}
                <div className={`absolute top-3.5 right-3.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected ? 'bg-[#001871] border-[#001871]' : 'border-[#ebebeb] bg-white'
                }`}>
                  {isSelected && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </div>

                <div className="text-[11px] font-mono font-bold text-[#001871] tracking-wider mb-1">{wh.code}</div>
                <div className="text-[15px] font-semibold text-[#1f2b59] mb-1">{wh.name}</div>
                <div className="text-xs text-[#485885] mb-3.5">{wh.city}</div>

                {/* Meta */}
                <div className="flex gap-4 mb-2.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-[#949eb8] uppercase tracking-wider">Status</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 w-fit ${
                      wh.status === 'aktif' ? 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]' : 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]'
                    }`}>
                      {wh.status === 'aktif' ? '●' : '◌'} {wh.status === 'aktif' ? 'Aktif' : 'Maintenance'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-[#949eb8] uppercase tracking-wider">Kapasitas</span>
                    <span className="text-xs font-medium text-[#1f2b59]">{wh.capacity}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-[#949eb8] uppercase tracking-wider">Lokasi</span>
                    <span className="text-xs font-medium text-[#1f2b59]">{wh.slots}</span>
                  </div>
                </div>

                {/* Temp chips */}
                <div className="flex gap-1">
                  {wh.temps.map((t) => (
                    <span key={t} className={`text-[10px] px-2 py-0.5 rounded-full ${
                      t === 'Chiller' ? 'bg-[rgba(74,144,217,0.1)] text-[#4a90d9]' :
                      t === 'Freezer' ? 'bg-[rgba(0,24,113,0.08)] text-[#001871]' :
                      'bg-[#f1f3f8] text-[#485885]'
                    }`}>{t}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Enter button */}
        <button
          onClick={handleEnter}
          disabled={!selected}
          className="w-full bg-[#001871] text-white border-none rounded-xl py-3.5 text-sm font-semibold cursor-pointer hover:bg-[#00206d] transition-colors disabled:bg-[#a9b1c6] disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z"/>
          </svg>
          {selectedWh ? `Masuk ke ${selectedWh.code} — ${selectedWh.name}` : 'Pilih gudang untuk melanjutkan'}
        </button>
      </div>
    </div>
  )
}
