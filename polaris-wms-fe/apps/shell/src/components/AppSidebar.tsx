import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthProvider'
import { PERMISSION_BUSINESS_PARTY_VIEW } from '@polaris/config'
import {
  LogOut,
  ChevronDown,
  Users,
  Warehouse,
  Building2,
  Settings,
  Package,
  UsersRound,
  List,
  Barcode,
  ClipboardList,
  ArrowDownToLine,
  Truck,
  PackageOpen,
  BarChart3,
  Scale,
  ArrowLeftRight,
  FileText,
  Box,
  Search,
  Eye,
  History,
  ShieldCheck,
  Clock,
  Calculator,
  LayoutGrid,
  Lock,
  Radio,
  Ruler,
  SquareSplitHorizontal,
} from 'lucide-react'

// ═══════════════════════════════════════════════════════
// Navigation Menu — sesuai polaris-navigation-menu.md
// Permission key format: "resource:action" (dari API /sessions/current)
// ═══════════════════════════════════════════════════════

interface NavChild {
  title: string
  path?: string
  icon?: React.ElementType
  permission?: string
  children?: NavChild[]
  /** Parent-only group header (no navigation) — e.g. Spatial Setup */
  groupHeader?: boolean
}

interface NavGroup {
  title: string
  icon: React.ElementType
  children: NavChild[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Auth & Keamanan',
    icon: Lock,
    children: [
      { title: 'Pengguna', path: '/users', icon: Users, permission: 'user:view' },
      { title: 'Peran & Izin', path: '/roles', icon: Lock, permission: 'role:view' },
    ],
  },
  {
    title: 'Konfigurasi',
    icon: Settings,
    children: [
      { title: 'Gudang', path: '/warehouses', icon: Warehouse, permission: 'warehouse:view' },
      { title: 'Grup Perusahaan', path: '/company-groups', icon: UsersRound, permission: 'company_group:view' },
      { title: 'Perusahaan', path: '/companies', icon: Building2, permission: 'company:view' },
      { title: 'Konfigurasi Sistem', path: '/settings', icon: Radio, permission: 'config:view' },
      { title: 'Kode Sistem', path: '/codes', icon: Radio, permission: 'code:view' },
      { title: 'Template Dokumen', path: '/documents/templates', icon: FileText, permission: 'document:view' },
    ],
  },
  {
    title: 'Master Data',
    icon: Package,
    children: [
      { title: 'Produk & SKU', path: '/products', icon: Package, permission: 'product:view' },
      {
        title: 'Mitra Bisnis',
        path: '/business-parties',
        icon: UsersRound,
        children: [
          { title: 'Tipe Layanan', path: '/business-parties/carrier-service-types', permission: PERMISSION_BUSINESS_PARTY_VIEW },
        ],
      },
      { title: 'UOM & Packaging', path: '/uom', icon: Ruler, permission: 'uom:view' },
      { title: 'Atribut Lot', path: '/lot-attributes', icon: List, permission: 'lot-attribute:view' },
      { title: 'Barcode Parser', path: '/barcode-config', icon: Barcode, permission: 'barcode:view' },
      {
        title: 'Spatial Setup',
        icon: SquareSplitHorizontal,
        groupHeader: true,
        children: [
          { title: 'Kelompok Zona', path: '/zone-groups', permission: 'zone-group:view' },
          { title: 'Zona', path: '/zones', permission: 'zone:view' },
          { title: 'Lokasi', path: '/locations', permission: 'location:view' },
        ],
      },
    ],
  },
  {
    title: 'Operasi Inbound',
    icon: ArrowDownToLine,
    children: [
      { title: 'Penerimaan', path: '/receipt', icon: ClipboardList, permission: 'receipt:view' },
      { title: 'Putaway', path: '/putaway', icon: Box, permission: 'putaway:view' },
    ],
  },
  {
    title: 'Operasi Outbound',
    icon: Truck,
    children: [
      { title: 'Surat Jalan', path: '/outbound', icon: FileText, permission: 'outbound:view' },
      { title: 'Pengeluaran', path: '/issue', icon: PackageOpen, permission: 'issue:view' },
    ],
  },
  {
    title: 'Inventori',
    icon: Box,
    children: [
      { title: 'Saldo', path: '/inventory', icon: Eye, permission: 'inventory:view' },
      { title: 'Histori', path: '/inventory/history', icon: History, permission: 'inventory-history:view' },
      { title: 'Mutasi', path: '/movement', icon: ArrowLeftRight, permission: 'movement:view' },
      { title: 'Penyesuaian', path: '/adjustments', icon: Scale, permission: 'adjustment:view' },
      { title: 'Transfer', path: '/transfer', icon: ArrowLeftRight, permission: 'transfer:view' },
      { title: 'LPN', path: '/lpn', icon: Box, permission: 'lpn:view' },
      { title: 'Timbang', path: '/weight-tally', icon: Scale, permission: 'weight-tally:view' },
    ],
  },
  {
    title: 'Keterlacakan',
    icon: Search,
    children: [
      { title: 'Telusur Mundur', path: '/trace/backward', icon: Search, permission: 'trace-backward:view' },
      { title: 'Telusur Maju', path: '/trace/forward', icon: Search, permission: 'trace-forward:view' },
      { title: 'Log Audit', path: '/audit-log', icon: FileText, permission: 'audit-log:view' },
    ],
  },
  {
    title: 'Tata Kelola',
    icon: ShieldCheck,
    children: [
      { title: 'Penahanan', path: '/holds', icon: ShieldCheck, permission: 'hold:view' },
      { title: 'Antrian Persetujuan', path: '/approvals', icon: Clock, permission: 'approval:view' },
    ],
  },
  {
    title: 'Perhitungan',
    icon: Calculator,
    children: [
      { title: 'Cycle Count', path: '/cycle-count', icon: Calculator, permission: 'cycle-count:view' },
      { title: 'Stock Opname', path: '/opname', icon: ClipboardList, permission: 'opname:view' },
    ],
  },
  {
    title: 'Laporan',
    icon: BarChart3,
    children: [
      { title: 'Dasbor', path: '/dashboard', icon: BarChart3, permission: 'dashboard:view' },
      { title: 'Ekspor', path: '/reports/export', icon: FileText, permission: 'report:view' },
    ],
  },
]

// ═══════════════════════════════════════════════════════
// Permission filter — filter nav berdasarkan user permissions
// Format key: "resource:view" (match dengan API /sessions/current)
// ═══════════════════════════════════════════════════════

function useVisibleNavGroups(): NavGroup[] {
  const { hasPermission, loading } = useAuthContext()

  // Wait for session load — empty permissions after load must hide gated menus
  // (do not fall back to localStorage; that can show stale/forged menus).
  if (loading) {
    return []
  }

  return NAV_GROUPS
    .map((group) => {
      const visibleChildren = group.children
        .map((child) => {
          if (!child.children) return child
          // Filter sub-children (level 3: Pelanggan, Pemasok, etc.)
          const visibleSubs = child.children.filter(
            (sub) => !sub.permission || hasPermission(sub.permission)
          )
          if (visibleSubs.length === 0) return null
          return { ...child, children: visibleSubs }
        })
        .filter((child): child is NavChild => {
          if (!child) return false
          if (child.groupHeader && child.children?.length) return true
          return !child.permission || hasPermission(child.permission)
        })

      // Group hilang kalau semua children tidak visible
      if (visibleChildren.length === 0) return null
      return { ...group, children: visibleChildren }
    })
    .filter((g): g is NavGroup => g !== null)
}

// ═══════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════

function NavSpatialSubItem({ item }: { item: NavChild }) {
  const location = useLocation()
  const path = item.path ?? ''
  const isActive = path
    ? location.pathname === path || location.pathname.startsWith(path + '/')
    : false

  if (!path) return null

  return (
    <Link
      to={path}
      className={`relative block pl-7 pr-2.5 py-[5px] rounded-md text-[12px] mb-0.5 transition-all select-none ${
        isActive
          ? 'bg-[rgba(0,24,113,0.08)] text-[#001871] font-semibold'
          : 'text-[#a9b1c6] hover:bg-[#f1f3f8] hover:text-[#485885]'
      }`}
    >
      <span
        className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full ${
          isActive ? 'bg-[#001871] opacity-100' : 'bg-current opacity-40'
        }`}
        aria-hidden
      />
      {item.title}
    </Link>
  )
}

function NavSubItem({ item }: { item: NavChild }) {
  const location = useLocation()
  const path = item.path ?? ''
  const isActive = path
    ? location.pathname === path || location.pathname.startsWith(path + '/')
    : false

  return (
    <Link
      to={path}
      className={`block px-2.5 py-[5px] rounded-md text-[11px] mb-0.5 transition-all select-none ${
        isActive
          ? 'bg-[#001871] text-white font-medium'
          : 'text-[#485885] hover:bg-[#f1f3f8]'
      }`}
    >
      {item.title}
    </Link>
  )
}

function NavItem({ item }: { item: NavChild; level?: number }) {
  const location = useLocation()
  const navigate = useNavigate()
  const hasChildren = item.children && item.children.length > 0
  const path = item.path ?? ''
  const isChildActive = hasChildren
    ? item.children!.some((c) => {
        const childPath = c.path ?? ''
        return childPath && (location.pathname === childPath || location.pathname.startsWith(childPath + '/'))
      })
    : false
  const isActive = path
    ? location.pathname === path || location.pathname.startsWith(path + '/')
    : false
  const [isExpanded, setIsExpanded] = useState(isChildActive || isActive)

  const Icon = item.icon

  if (hasChildren && item.groupHeader) {
    return (
      <div className="mb-0.5">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-full flex items-center justify-between px-2.5 py-[6px] rounded-md text-[12px] transition-all select-none cursor-pointer ${
            isChildActive ? 'text-[#485885] font-medium' : 'text-[#485885] hover:bg-[#f1f3f8]'
          }`}
        >
          <span className="flex items-center gap-2 min-w-0">
            {Icon && <Icon className="w-3 h-3 flex-shrink-0" strokeWidth={2} />}
            <span>{item.title}</span>
          </span>
          <ChevronDown
            className={`w-2.5 h-2.5 text-[#a9b1c6] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            strokeWidth={2}
          />
        </button>
        {isExpanded && (
          <div className="pl-2 mt-0.5">
            {item.children!.map((child) => (
              <NavSpatialSubItem key={child.path} item={child} />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (hasChildren) {
    return (
      <div className="mb-0.5">
        <div
          className={`w-full flex items-center justify-between px-2.5 py-[6px] rounded-md text-[12px] transition-all select-none ${
            isChildActive || isActive ? 'bg-[#f1f3f8] text-[#001871] font-medium' : 'text-[#485885] hover:bg-[#f1f3f8]'
          }`}
        >
          <button
            type="button"
            onClick={() => navigate(path)}
            className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer text-left"
          >
            {Icon && <Icon className="w-3 h-3 flex-shrink-0" strokeWidth={2} />}
            <span>{item.title}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="cursor-pointer p-1 -m-1"
            aria-label={`Toggle ${item.title}`}
          >
            <ChevronDown className={`w-2.5 h-2.5 text-[#a9b1c6] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} strokeWidth={2} />
          </button>
        </div>
        {isExpanded && (
          <div className="ml-4 pl-2.5 border-l border-[#f1f3f8] mt-0.5">
            {item.children!.map((child) => (
              <NavSubItem key={child.path} item={child} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      to={path}
      className={`flex items-center gap-2 px-2.5 py-[6px] rounded-md text-[12px] mb-0.5 transition-all select-none ${
        isActive
          ? 'bg-[#001871] text-white font-medium'
          : 'text-[#485885] hover:bg-[#f1f3f8]'
      }`}
    >
      {Icon && <Icon className="w-3 h-3 flex-shrink-0" strokeWidth={2} />}
      {item.title}
    </Link>
  )
}

function NavGroupItem({ group }: { group: NavGroup }) {
  const location = useLocation()
  const isChildActive = group.children.some((c) => {
    const childPath = c.path ?? ''
    if (childPath && (location.pathname === childPath || location.pathname.startsWith(childPath + '/'))) {
      return true
    }
    if (c.children) {
      return c.children.some((sub) => {
        const subPath = sub.path ?? ''
        return subPath && (location.pathname === subPath || location.pathname.startsWith(subPath + '/'))
      })
    }
    return false
  })
  const [isExpanded, setIsExpanded] = useState(isChildActive)

  const Icon = group.icon

  return (
    <div className="mb-0.5">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-2.5 py-[7px] rounded-lg text-[13px] cursor-pointer transition-all select-none ${
          isChildActive ? 'bg-[#f1f3f8] text-[#001871] font-medium' : 'text-[#485885] hover:bg-[#f1f3f8]'
        }`}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
          <span>{group.title}</span>
        </div>
        <ChevronDown className={`w-3 h-3 text-[#a9b1c6] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} strokeWidth={2} />
      </button>
      {isExpanded && (
        <div className="ml-3 pl-3 border-l border-[#f1f3f8] mt-0.5">
          {group.children.map((child) => (
            <NavItem key={child.path} item={child} level={1} />
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// Main Sidebar
// ═══════════════════════════════════════════════════════

export function AppSidebar() {
  const location = useLocation()
  const { user, selectedWarehouse, logout } = useAuthContext()
  const visibleNavGroups = useVisibleNavGroups()

  const initials = (user?.name || user?.preferred_username || '?')
    .split(' ')
    .map((w: string) => w[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <aside className="w-[236px] h-screen bg-white border-r border-[#ebebeb] flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-[18px] py-4 border-b border-[#f1f3f8] flex items-center gap-[9px]">
        <div className="w-[26px] h-[26px] bg-[#001871] rounded-md flex items-center justify-center flex-shrink-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-[#001871] tracking-tight leading-none">POLARIS</div>
          <div className="text-[9px] text-[#949eb8] tracking-wider uppercase">WMS</div>
        </div>
      </div>

      {/* Gudang Aktif */}
      {selectedWarehouse && (
        <div className="px-[18px] py-3 border-b border-[#f1f3f8] bg-[#fafbfd]">
          <div className="text-[9px] text-[#a9b1c6] uppercase tracking-wider font-semibold mb-1">Gudang Aktif</div>
          <div className="text-xs font-bold text-[#001871] font-mono">{selectedWarehouse.code}</div>
          <div className="text-[11px] text-[#485885] mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
            {selectedWarehouse.name}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2.5 overflow-y-auto">
        {/* Dashboard — standalone */}
        <Link
          to="/"
          className={`flex items-center gap-2 px-2.5 py-[7px] rounded-lg text-[13px] mb-2 transition-all select-none ${
            location.pathname === '/'
              ? 'bg-[#001871] text-white font-medium'
              : 'text-[#485885] hover:bg-[#f1f3f8]'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
          Beranda
        </Link>

        {/* Menu Groups */}
        {visibleNavGroups.map((group) => (
          <NavGroupItem key={group.title} group={group} />
        ))}
      </nav>

      {/* User Footer */}
      <div className="px-[18px] py-3 border-t border-[#f1f3f8] flex items-center gap-2.5">
        <div className="w-[30px] h-[30px] rounded-full bg-[#001871] text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-[#1f2b59] whitespace-nowrap overflow-hidden text-ellipsis">
            {user?.name || user?.preferred_username || 'User'}
          </div>
          <div className="text-[10px] text-[#949eb8] whitespace-nowrap overflow-hidden text-ellipsis">{user?.roles?.join(', ') || '-'}</div>
        </div>
        <button
          onClick={logout}
          className="cursor-pointer text-[#a9b1c6] hover:text-[#ef3340] flex-shrink-0 p-1 transition-colors"
          title="Logout"
        >
          <LogOut className="w-[15px] h-[15px]" strokeWidth={2} />
        </button>
      </div>
    </aside>
  )
}
