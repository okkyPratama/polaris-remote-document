import { useState, useMemo, useEffect } from 'react'
import { useAuthContext } from '@/contexts/AuthProvider'
import { useNavigate } from 'react-router-dom'
import { SearchDropdown, type SearchDropdownOption } from '@polaris/ui'

/**
 * Select Context page — Dropdown Search variant (debounce 400ms)
 * Warehouse list datang dari Create Session response (disimpan di localStorage).
 */

function getAuthorizedWarehouses(): { id: string; code: string; name: string }[] {
  try {
    const stored = localStorage.getItem('authorized_warehouses')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function SelectContextSearch() {
  const { user, isAuthenticated, loading, setSelectedWarehouse, logout } = useAuthContext()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const warehouses = useMemo(() => getAuthorizedWarehouses(), [])

  const dropdownOptions: SearchDropdownOption[] = useMemo(() =>
    warehouses.map((wh) => ({
      value: wh.id,
      label: `${wh.code} — ${wh.name}`,
      description: wh.code,
    })),
    [warehouses]
  )

  // Redirect ke login jika tidak authenticated (token tidak ada / expired)
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/auth/login', { replace: true })
    }
  }, [loading, isAuthenticated, navigate])

  // Timeout: kalau setelah 8 detik user masih belum ready, force ke login
  useEffect(() => {
    if (!loading && isAuthenticated && !user?.name) {
      const timeout = setTimeout(() => {
        logout()
      }, 8000)
      return () => clearTimeout(timeout)
    }
  }, [loading, isAuthenticated, user?.name, logout])

  // Tampilkan loading kalau masih fetch session atau user belum ready
  if (loading || (isAuthenticated && !user?.name)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f1f3f8]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#001871] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[#485885]">Memuat sesi...</span>
        </div>
      </div>
    )
  }

  const displayName = user?.name || user?.preferred_username || 'User'
  const initials = displayName.split(' ').map((w: string) => w[0] || '').join('').slice(0, 2).toUpperCase()
  const selectedWh = warehouses.find((w) => w.id === selectedId)

  const handleSelect = (value: string) => {
    setSelectedId(value)
  }

  const handleEnter = async () => {
    if (!selectedWh) return
    try {
      await setSelectedWarehouse({
        id: selectedWh.id,
        code: selectedWh.code,
        name: selectedWh.name,
        company: '',
      })
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
      <div className="max-w-[520px] mx-auto px-6 pt-14 pb-10">
        <div className="text-[11px] font-bold text-[#a9b1c6] tracking-wider uppercase mb-2">Pilih Konteks Kerja</div>
        <h1 className="text-2xl font-bold text-[#001871] tracking-tight mb-1.5">Pilih Gudang</h1>
        <p className="text-[13px] text-[#485885] mb-9 leading-relaxed">
          Pilih gudang yang ingin Anda kelola. Semua operasi dan laporan akan dibatasi pada gudang yang dipilih selama sesi berlangsung.
        </p>

        {/* Empty state — user belum punya warehouse */}
        {warehouses.length === 0 && (
          <div className="text-center py-12 px-6 bg-white rounded-2xl border border-[#ebebeb]">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#a9b1c6" strokeWidth="1.5" className="mx-auto mb-4">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <h3 className="text-sm font-semibold text-[#1f2b59] mb-1">Belum ada gudang yang ditugaskan</h3>
            <p className="text-xs text-[#949eb8] leading-relaxed">
              Akun Anda belum memiliki akses ke gudang manapun.<br />
              Hubungi administrator untuk mendapatkan akses.
            </p>
          </div>
        )}

        {/* Dropdown Search — hanya tampil jika ada warehouse */}
        {warehouses.length > 0 && (
          <>
            <SearchDropdown
              label="Gudang"
              placeholder="Cari kode atau nama gudang..."
              options={dropdownOptions}
              value={selectedId || undefined}
              onChange={handleSelect}
              debounce={400}
              filterFn={(opt, q) => opt.label.toLowerCase().includes(q.toLowerCase()) || (opt.description || '').toLowerCase().includes(q.toLowerCase())}
              emptyMessage="Tidak ada gudang yang cocok"
              className="mb-6"
            />

        {/* Selected warehouse card */}
        {selectedWh && (
          <div className="bg-white border-2 border-[#001871] rounded-2xl px-5 py-5 mb-6 shadow-[0_0_0_3px_rgba(0,24,113,0.06)]">
            <div className="text-[11px] font-mono font-bold text-[#001871] tracking-wider mb-1">{selectedWh.code}</div>
            <div className="text-[15px] font-semibold text-[#1f2b59]">{selectedWh.name}</div>
          </div>
        )}

        {/* Enter button */}
        <button
          onClick={handleEnter}
          disabled={!selectedWh}
          className="w-full bg-[#001871] text-white border-none rounded-xl py-3.5 text-sm font-semibold cursor-pointer hover:bg-[#00206d] transition-colors disabled:bg-[#a9b1c6] disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z"/>
          </svg>
          {selectedWh ? `Masuk ke ${selectedWh.code} — ${selectedWh.name}` : 'Pilih gudang untuk melanjutkan'}
        </button>
          </>
        )}
      </div>
    </div>
  )
}
