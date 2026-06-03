'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useTenant } from '@/lib/tenant-context'
import {
  LayoutDashboard, Users, Flame, RefreshCw, Calendar,
  BarChart3, Lightbulb, Bell, Briefcase, UserCheck,
  Wallet, Settings2, MessageSquare, BookOpen, Users2, KanbanSquare,
} from 'lucide-react'

const C = {
  violet: '#5B38E8', bordo: '#982A49', pink: '#D978B6', line: '#E7EAF2', navy: '#061f3d',
}

const ROL_ETIKETI: Record<string, string> = {
  admin: 'Admin', yönetici: 'Yönetici',
  satış_temsilcisi: 'Satış Temsilcisi', operasyon_temsilcisi: 'Operasyon Tem.',
}

const activeItemStyle = {
  background: `linear-gradient(105deg, ${C.bordo} 0%, ${C.violet} 100%)`,
  boxShadow: '0 12px 26px rgba(91,56,232,.22)',
}

interface NavItem { href: string; label: string; icon: React.ElementType; moduleKey?: string }
interface StubItem { label: string; icon: React.ElementType; moduleKey?: string }

const mainNav: NavItem[] = [
  { href: '/',             label: 'Ana Akış',         icon: LayoutDashboard, moduleKey: 'dashboard' },
  { href: '/ajanda',       label: 'Ajanda',           icon: Calendar,        moduleKey: 'ajanda' },
  { href: '/firsatlar',    label: 'Satış Fırsatları', icon: Flame,           moduleKey: 'firsatlar' },
  { href: '/musteriler',   label: 'Müşteriler',        icon: Users,           moduleKey: 'musteriler' },
  { href: '/satis-sureci', label: 'Satış Süreci',     icon: KanbanSquare,    moduleKey: 'satis_sureci' },
]

const stubNav: StubItem[] = [
  { label: 'Yenilemeler',       icon: RefreshCw,  moduleKey: 'yenilemeler' },
  { label: 'Portföy',           icon: Briefcase,  moduleKey: 'portfoy' },
  { label: 'Temsilciler',       icon: UserCheck },
  { label: 'Komisyon',          icon: Wallet,     moduleKey: 'komisyonlar' },
  { label: 'Operasyon Merkezi', icon: Settings2 },
]

const raporNav: NavItem[] = [
  { href: '/raporlar', label: 'Raporlar', icon: BarChart3, moduleKey: 'raporlar' },
]

const aliNav: NavItem[] = [
  { href: '/ali-onerileri', label: 'Ali Önerileri', icon: Lightbulb, moduleKey: 'ali_asistan' },
  { href: '/ali-uyarilar',  label: 'Ali Uyarıları',  icon: Bell,      moduleKey: 'ali_asistan' },
]

const aliStubNav: StubItem[] = [
  { label: 'Ali ile Sohbet', icon: MessageSquare, moduleKey: 'ali_asistan' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const cfg = useTenant()
  const mods = cfg.modules as unknown as Record<string, boolean>

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)
  const moduleOn = (key?: string) => !key || mods[key] !== false

  const meta = (user?.publicMetadata ?? {}) as Record<string, unknown>
  const rolKey = typeof meta.rol === 'string' ? meta.rol
    : typeof meta.temsilci === 'string' ? 'satış_temsilcisi' : ''
  const rolEtiketi = ROL_ETIKETI[rolKey] ?? 'Kullanıcı'
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Kullanıcı'
  const initials = ((user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')).toUpperCase() || '?'

  // Logo: cfg.branding.logo örn. "alisales.ai" → ["alisales", ".ai"]
  const logoDotIdx = cfg.branding.logo.lastIndexOf('.')
  const logoBase   = cfg.branding.logo.slice(0, logoDotIdx)
  const logoSuffix = cfg.branding.logo.slice(logoDotIdx) // ".ai"

  // raporlar / ali section'larının en az bir görünür öğesi var mı?
  const showRapor = raporNav.some(n => moduleOn(n.moduleKey))
  const showAli   = [...aliNav, ...aliStubNav].some(n => moduleOn(n.moduleKey))

  return (
    <aside
      className="hidden lg:flex flex-col w-[244px] min-h-screen shrink-0 bg-white"
      style={{ borderRight: `1px solid ${C.line}` }}
    >
      {/* Logo */}
      <div className="px-5 pt-5 pb-2">
        <div className="leading-none">
          <div className="text-[22px] font-[900] tracking-[-0.045em]" style={{ color: C.navy }}>
            {logoBase}<span style={{ color: C.bordo }}>{logoSuffix}</span>
          </div>
          <div
            className="mt-[2px] h-[3px] rounded-full"
            style={{
              marginLeft: `${logoBase.length * 12}px`,
              width: '28px',
              background: `linear-gradient(90deg, ${C.violet}, ${C.pink})`,
            }}
          />
        </div>
        <p className="text-[12px] font-medium text-slate-400 mt-2">CRM Paneli</p>
      </div>

      <nav className="flex-1 px-[14px] pt-[16px] overflow-y-auto">

        {/* Ana nav */}
        <div className="space-y-[7px]">
          {mainNav.filter(n => moduleOn(n.moduleKey)).map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href}
                className={`h-[44px] flex items-center gap-[13px] rounded-[12px] px-[14px] text-[15px] font-semibold transition-colors ${active ? 'text-white' : 'text-slate-600 hover:bg-gray-50'}`}
                style={active ? activeItemStyle : {}}>
                <Icon size={18} strokeWidth={2.05} />
                <span className="flex-1">{label}</span>
              </Link>
            )
          })}

          {stubNav.filter(n => moduleOn(n.moduleKey)).map(({ label, icon: Icon }) => (
            <div key={label}
              className="h-[44px] flex items-center gap-[13px] rounded-[12px] px-[14px] text-[15px] font-semibold text-slate-400 cursor-default">
              <Icon size={18} strokeWidth={2.05} />
              <span className="flex-1">{label}</span>
            </div>
          ))}
        </div>

        {showRapor && (
          <>
            <div className="my-[16px] h-px" style={{ backgroundColor: C.line }} />
            <div className="space-y-[7px]">
              {raporNav.filter(n => moduleOn(n.moduleKey)).map(({ href, label, icon: Icon }) => {
                const active = isActive(href)
                return (
                  <Link key={href} href={href}
                    className={`h-[44px] flex items-center gap-[13px] rounded-[12px] px-[14px] text-[15px] font-semibold transition-colors ${active ? 'text-white' : 'text-slate-600 hover:bg-gray-50'}`}
                    style={active ? activeItemStyle : {}}>
                    <Icon size={18} strokeWidth={2.05} />
                    <span className="flex-1">{label}</span>
                  </Link>
                )
              })}
            </div>
          </>
        )}

        {showAli && (
          <>
            <div className="my-[16px] h-px" style={{ backgroundColor: C.line }} />
            <p className="px-[8px] mb-[10px] text-[11px] font-black tracking-[.24em] text-slate-400">ALİ</p>
            <div className="space-y-[7px]">
              {aliNav.filter(n => moduleOn(n.moduleKey)).map(({ href, label, icon: Icon }) => {
                const active = isActive(href)
                return (
                  <Link key={href} href={href}
                    className={`h-[44px] flex items-center gap-[13px] rounded-[12px] px-[14px] text-[15px] font-semibold transition-colors ${active ? 'text-white' : 'text-slate-600 hover:bg-gray-50'}`}
                    style={active ? activeItemStyle : {}}>
                    <Icon size={18} strokeWidth={2.05} />
                    <span className="flex-1">{label}</span>
                  </Link>
                )
              })}
              {aliStubNav.filter(n => moduleOn(n.moduleKey)).map(({ label, icon: Icon }) => (
                <div key={label}
                  className="h-[44px] flex items-center gap-[13px] rounded-[12px] px-[14px] text-[15px] font-semibold text-slate-400 cursor-default">
                  <Icon size={18} strokeWidth={2.05} />
                  <span className="flex-1">{label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="my-[16px] h-px" style={{ backgroundColor: C.line }} />
        <p className="px-[8px] mb-[10px] text-[11px] font-black tracking-[.18em] text-slate-400">EĞİTİM & TOPLULUK</p>
        <div className="space-y-[7px]">
          {[
            { label: 'Eğitim & İpuçları', icon: BookOpen },
            { label: 'Topluluk',          icon: Users2 },
          ].map(({ label, icon: Icon }) => (
            <div key={label}
              className="h-[44px] flex items-center gap-[13px] rounded-[12px] px-[14px] text-[15px] font-semibold text-slate-400 cursor-default">
              <Icon size={18} strokeWidth={2.05} />
              <span className="flex-1">{label}</span>
            </div>
          ))}
        </div>

      </nav>

      {/* Kullanıcı kartı */}
      <div className="px-[14px] pb-[16px] mt-3">
        <div className="rounded-[15px] border bg-white p-[13px] shadow-sm" style={{ borderColor: C.line }}>
          <div className="flex items-center gap-[11px]">
            {user?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.imageUrl} alt={displayName} className="h-[39px] w-[39px] rounded-full object-cover shrink-0" />
            ) : (
              <div className="h-[39px] w-[39px] rounded-full grid place-items-center text-white text-[14px] font-black shrink-0"
                style={{ background: `linear-gradient(135deg, ${C.bordo}, ${C.violet})` }}>
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-black text-gray-900 truncate leading-tight">{displayName}</p>
              <p className="text-[12px] text-slate-500 truncate leading-tight">{rolEtiketi}</p>
            </div>
            <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
          </div>
          <div className="mt-[10px] h-[7px] rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full w-0 rounded-full" style={{ background: `linear-gradient(90deg, ${C.bordo}, ${C.violet})` }} />
          </div>
        </div>
      </div>
    </aside>
  )
}
