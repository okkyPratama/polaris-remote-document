import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthProvider'

export function Landing() {
  const { user, selectedWarehouse } = useAuthContext()
  const navigate = useNavigate()

  const displayName = user?.name || user?.preferred_username || 'User'

  return (
    <div className="flex flex-col gap-4 animate-[fadeUp_0.22s_ease-out]">
      {/* Welcome Bar */}
      <div className="bg-[#001871] rounded-2xl px-7 py-5 flex items-center justify-between bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.06)_0%,transparent_70%)]">
        <div>
          <div className="text-[11px] text-white/50 tracking-wider uppercase font-medium mb-1">Selamat datang kembali</div>
          <div className="text-xl font-bold text-white tracking-tight mb-1.5">{displayName}</div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/75 bg-white/10 rounded-full px-2.5 py-0.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
              {selectedWarehouse?.code} — {selectedWarehouse?.name}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/75 bg-white/10 rounded-full px-2.5 py-0.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              {user?.roles?.join(', ') || '-'}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-xs text-white/50">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
          <button
            onClick={() => navigate('/select-context')}
            className="flex items-center gap-1.5 bg-white/12 border border-white/18 rounded-lg px-3.5 py-1.5 text-xs font-medium text-white/85 cursor-pointer hover:bg-white/20 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            Ganti Gudang
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard color="navy" label="SKU Aktif" value="6" unit="SKU" sub="5 aktif · 1 nonaktif" dotColor="green" />
        <KpiCard color="green" label="Penerimaan Hari Ini" value="3" unit="dokumen" sub="2 selesai · 1 diproses" dotColor="green" />
        <KpiCard color="amber" label="Putaway Tertunda" value="12" unit="task" sub="Menunggu penugasan operator" dotColor="amber" />
        <KpiCard color="red" label="Notifikasi Aktif" value="2" unit="perhatian" sub="Item mendekati kedaluwarsa" dotColor="red" />
      </div>

      {/* Two-col layout */}
      <div className="grid grid-cols-[1fr_360px] gap-3.5 items-start">
        {/* Left — Module Cards */}
        <div>
          <SectionHeader>Platform</SectionHeader>
          <div className="grid grid-cols-3 gap-2.5 mb-3">
            <ModuleCard name="Produk & SKU" stat="6 SKU terdaftar · 3 owner" tag="Aktif" tagType="active" />
            <ModuleCard name="Mitra Bisnis" stat="3 pemilik barang aktif" tag="Aktif" tagType="active" />
            <ModuleCard name="UOM & Packaging" stat="14 level hierarki" tag="Aktif" tagType="active" />
            <ModuleCard name="Spatial Setup" stat="4 zona · 240 lokasi" tag="Aktif" tagType="active" />
            <ModuleCard name="Atribut Lot" stat="3 atribut dikonfigurasi" tag="Aktif" tagType="active" />
            <ModuleCard name="Barcode Parser" stat="2 template aktif" tag="Aktif" tagType="active" />
          </div>

          <SectionHeader>Operasi</SectionHeader>
          <div className="grid grid-cols-3 gap-2.5">
            <ModuleCard name="Penerimaan" stat="3 dokumen hari ini" tag="1 sedang berjalan" tagType="active" />
            <ModuleCard name="Putaway" stat="12 task tertunda" tag="Menunggu operator" tagType="pending" />
            <ModuleCard name="Pengeluaran" stat="0 dokumen aktif" tag="Kosong" />
            <ModuleCard name="Saldo Inventori" stat="247 lot lines aktif · fill rate 74%" tag="Diperbarui tadi malam" tagType="active" className="col-span-2" />
            <ModuleCard name="Surat Jalan" stat="0 SJ aktif hari ini" tag="Kosong" />
          </div>
        </div>

        {/* Right — Notifications + Activity */}
        <div className="flex flex-col gap-3.5">
          <SectionHeader>Notifikasi</SectionHeader>
          <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <AlertItem dot="red" title="Kedaluwarsa dalam 14 hari" sub="SKU-CS-001 Lot L-240612 · Coldspace Indo" action="Lihat" />
            <AlertItem dot="amber" title="Kedaluwarsa dalam 30 hari" sub="SKU-CS-002 Lot L-240613 · Coldspace Indo" action="Lihat" />
            <AlertItem dot="blue" title="Penerimaan menunggu konfirmasi" sub="GRN-2024-0043 · 1 item perlu verifikasi berat" action="Tinjau" />
          </div>

          <SectionHeader>Aktivitas Terini</SectionHeader>
          <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <FeedItem color="green" title="Penerimaan selesai — GRN-2024-0042" detail="12 karton · Coldspace Indo · 48 kg" time="1 hrs" />
            <FeedItem color="navy" title="SKU baru didaftarkan — SKU-CS-002" detail="Nugget Ayam 500g · oleh Admin System" time="3 hrs" />
            <FeedItem color="amber" title="Expiry warning — SKU-CS-001" detail="Lot L-240612 kedaluwarsa dalam 14 hari" time="Kemarin" />
            <FeedItem color="green" title="Putaway selesai · 40 pcs SKU-HW-001" detail="→ Zona A · Rek 12 · Slot 03" time="Kemarin" />
            <FeedItem color="navy" title="Konfigurasi FEFO diterapkan" detail="Strategi stok baru untuk Coldspace Indo diperbarui" time="3 hari lalu" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-bold text-[#a9b1c6] uppercase tracking-wider mb-2.5">{children}</div>
}

function KpiCard({ color, label, value, unit, sub, dotColor }: {
  color: string; label: string; value: string; unit: string; sub: string; dotColor: string
}) {
  const borderColors: Record<string, string> = {
    navy: 'before:bg-[#001871]', green: 'before:bg-[#55bf59]', amber: 'before:bg-[#f59e0b]', red: 'before:bg-[#ef3340]',
  }
  const dotColors: Record<string, string> = {
    green: 'bg-[#55bf59]', amber: 'bg-[#f59e0b]', red: 'bg-[#ef3340]',
  }

  return (
    <div className={`relative bg-white rounded-2xl px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:rounded-t-2xl ${borderColors[color]}`}>
      <div className="text-[11px] text-[#949eb8] uppercase tracking-wider font-medium mb-1.5">{label}</div>
      <div className="text-[28px] font-bold text-[#1f2b59] tracking-tight leading-none mb-1.5">
        {value} <span className="text-[13px] font-normal text-[#a9b1c6] tracking-normal">{unit}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-[#949eb8]">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[dotColor]}`} />
        {sub}
      </div>
    </div>
  )
}

function ModuleCard({ name, stat, tag, tagType, className }: {
  name: string; stat: string; tag: string; tagType?: string; className?: string
}) {
  const tagStyles: Record<string, string> = {
    active: 'bg-[rgba(85,191,89,0.1)] text-[#55bf59]',
    pending: 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]',
    alert: 'bg-[rgba(239,51,64,0.08)] text-[#ef3340]',
  }

  return (
    <div className={`bg-white rounded-xl px-4 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] cursor-pointer border border-transparent hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:border-[rgba(0,24,113,0.12)] transition-all ${className || ''}`}>
      <div className="w-8 h-8 rounded-lg bg-[#f1f3f8] flex items-center justify-center mb-2.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#485885" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
      </div>
      <div className="text-xs font-semibold text-[#1f2b59] mb-0.5">{name}</div>
      <div className="text-[11px] text-[#949eb8] mb-2">{stat}</div>
      <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${tagStyles[tagType || ''] || 'bg-[#f1f3f8] text-[#a9b1c6]'}`}>
        {tag}
      </span>
    </div>
  )
}

function AlertItem({ dot, title, sub, action }: { dot: string; title: string; sub: string; action: string }) {
  const dotColors: Record<string, string> = { red: 'bg-[#ef3340]', amber: 'bg-[#f59e0b]', blue: 'bg-[#001871]' }

  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-[#f1f3f8] last:border-b-0 last:pb-0">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${dotColors[dot]}`} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-[#1f2b59] mb-0.5">{title}</div>
        <div className="text-[11px] text-[#949eb8]">{sub}</div>
      </div>
      <button className="border border-[#ebebeb] rounded-lg px-2.5 py-1 text-[11px] text-[#485885] cursor-pointer hover:bg-[#f1f3f8] transition-colors flex-shrink-0">
        {action}
      </button>
    </div>
  )
}

function FeedItem({ color, title, detail, time }: { color: string; title: string; detail: string; time: string }) {
  const iconBg: Record<string, string> = {
    green: 'bg-[rgba(85,191,89,0.1)]', navy: 'bg-[rgba(0,24,113,0.07)]', amber: 'bg-[rgba(245,158,11,0.1)]', red: 'bg-[rgba(239,51,64,0.07)]',
  }
  const iconStroke: Record<string, string> = {
    green: '#55bf59', navy: '#001871', amber: '#f59e0b', red: '#ef3340',
  }

  return (
    <div className="flex gap-3 py-2.5 border-b border-[#f1f3f8] last:border-b-0 last:pb-0">
      <div className={`w-[30px] h-[30px] rounded-lg flex-shrink-0 flex items-center justify-center ${iconBg[color]}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={iconStroke[color]} strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-[#1f2b59] leading-snug">{title}</div>
        <div className="text-[11px] text-[#949eb8] mt-0.5">{detail}</div>
      </div>
      <div className="text-[10px] text-[#a9b1c6] whitespace-nowrap mt-1">{time}</div>
    </div>
  )
}
