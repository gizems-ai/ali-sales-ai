'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useTenant } from '@/lib/tenant-context'
import type { TenantConfig } from '@/lib/tenants'
import {
  LayoutDashboard, Users, Flame, RefreshCw, Calendar,
  BarChart3, Lightbulb, Bell, Briefcase, UserCheck,
  Wallet, Settings2, MessageSquare, BookOpen, Users2, KanbanSquare,
  Building2,
} from 'lucide-react'
import { SegmentSwitch } from './segment-switch'
import { useT } from '@/lib/i18n/context'
import { SECTION_SLUG } from '@/lib/ali-zeka'
import { SECTION_SLUG as KAMPANYA_SLUG } from '@/lib/kampanya'
import { SECTION_SLUG as GELISIM_SLUG } from '@/lib/gelisim'

// ── Sigortan colours ──────────────────────────────────────────────
const C = {
  violet: '#5B38E8', bordo: '#982A49', pink: '#D978B6', line: '#E7EAF2', navy: '#061f3d',
}

const ROL_ETIKETI_KEY: Record<string, string> = {
  admin: 'role.admin', yönetici: 'role.yonetici',
  satış_temsilcisi: 'role.satisTemsilcisi', operasyon_temsilcisi: 'role.operasyonTemsilcisi',
}

const activeItemStyle = {
  background: `linear-gradient(105deg, ${C.bordo} 0%, ${C.violet} 100%)`,
  boxShadow: '0 12px 26px rgba(91,56,232,.22)',
}

interface NavItem { href: string; labelKey: string; icon: React.ElementType; moduleKey?: string }
interface StubItem { labelKey: string; icon: React.ElementType; moduleKey?: string }

const mainNav: NavItem[] = [
  { href: '/',             labelKey: 'nav.dashboard',   icon: LayoutDashboard, moduleKey: 'dashboard' },
  { href: '/ajanda',       labelKey: 'nav.ajanda',      icon: Calendar,        moduleKey: 'ajanda' },
  { href: '/firsatlar',    labelKey: 'nav.firsatlar',   icon: Flame,           moduleKey: 'firsatlar' },
  { href: '/musteriler',   labelKey: 'nav.musteriler',  icon: Users,           moduleKey: 'musteriler' },
  { href: '/satis-sureci', labelKey: 'nav.satisSureci', icon: KanbanSquare,    moduleKey: 'satis_sureci' },
  { href: '/stok',         labelKey: 'nav.stok',        icon: Building2,       moduleKey: 'stok' },
  { href: '/temsilciler',  labelKey: 'nav.temsilciler', icon: UserCheck,       moduleKey: 'stok' },
]

const stubNav: StubItem[] = [
  { labelKey: 'nav.yenilemeler',      icon: RefreshCw,  moduleKey: 'yenilemeler' },
  { labelKey: 'nav.portfoy',          icon: Briefcase,  moduleKey: 'portfoy' },
  { labelKey: 'nav.komisyon',         icon: Wallet,     moduleKey: 'komisyonlar' },
  { labelKey: 'nav.operasyonMerkezi', icon: Settings2 },
]

const raporNav: NavItem[] = [
  { href: '/raporlar', labelKey: 'nav.raporlar', icon: BarChart3, moduleKey: 'raporlar' },
]

const aliNav: NavItem[] = [
  { href: '/ali-onerileri', labelKey: 'nav.aliOnerileri',  icon: Lightbulb, moduleKey: 'ali_asistan' },
  { href: '/ali-uyarilar',  labelKey: 'nav.aliUyarilari',  icon: Bell,      moduleKey: 'ali_asistan' },
]

const aliStubNav: StubItem[] = [
  { labelKey: 'nav.aliSohbet', icon: MessageSquare, moduleKey: 'ali_asistan' },
]

// ── Emlak segment switch (glass style) ────────────────────────────
function EmlakSegmentSwitch() {
  const [segment, setSegment] = useState<'kurumsal' | 'bireysel'>('kurumsal')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const t = useT()

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)emlak_segment=([^;]*)/)
    if (match?.[1] === 'bireysel') setSegment('bireysel')
  }, [])

  async function switchTo(next: 'kurumsal' | 'bireysel') {
    if (next === segment || isPending) return
    await fetch('/api/emlak-segment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segment: next }),
    })
    setSegment(next)
    startTransition(() => router.refresh())
  }

  return (
    <div style={{
      display: 'flex', gap: 4,
      background: 'rgba(255,255,255,.6)',
      border: '1px solid rgba(255,255,255,.72)',
      borderRadius: 13, padding: 4,
    }}>
      {(['kurumsal', 'bireysel'] as const).map(s => (
        <button
          key={s}
          disabled={isPending}
          onClick={() => switchTo(s)}
          style={{
            flex: 1, border: 0, fontFamily: 'inherit',
            fontSize: 13, fontWeight: 700, cursor: isPending ? 'wait' : 'pointer',
            padding: '8px 0', borderRadius: 9, transition: '.15s',
            ...(segment === s
              ? { background: '#1c2a22', color: '#fff', boxShadow: '0 8px 16px -10px rgba(20,40,25,.6)' }
              : { background: 'transparent', color: '#57655b' }),
          }}
        >
          {s === 'kurumsal' ? t('segment.kurumsal') : t('segment.bireysel')}
        </button>
      ))}
    </div>
  )
}

// ── Emlak SVG paths ───────────────────────────────────────────────
const EMLAK_NAV_PATHS: Record<string, string> = {
  grid:     '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  flame:    '<path d="M12 3c1 3-2 4-2 7a3 3 0 0 0 6 .3c.8 1 1 2 1 3a5 5 0 1 1-10 0c0-4 3-5 5-10.3z"/>',
  users:    '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20v-1a4.5 4.5 0 0 1 4.5-4.5h2A4.5 4.5 0 0 1 14.5 19v1"/><path d="M16 5.2a3.2 3.2 0 0 1 0 6M20.5 20v-1a3.4 3.4 0 0 0-2.6-3.3"/>',
  columns:  '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="9.5" y="4" width="5" height="16" rx="1.5"/><rect x="16" y="4" width="5" height="16" rx="1.5"/>',
  building: '<path d="M4 20h16M6 20V6a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v14M15 9h3a1 1 0 0 1 1 1v10"/><path d="M9 8h3M9 12h3M9 16h3"/>',
  badge:    '<circle cx="12" cy="8" r="3.4"/><path d="M6 21v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1"/>',
  chart:    '<path d="M4 20h16"/><path d="M7 16V9M12 16V5M17 16v-4"/>',
  sliders:  '<path d="M4 8h10M18 8h2M4 16h2M10 16h10"/><circle cx="16" cy="8" r="2"/><circle cx="8" cy="16" r="2"/>',
  book:     '<path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 0-2 2z"/><path d="M5 4v16"/>',
  sparkle:  '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 14.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  star:     '<path d="M12 3.5l2.6 5.3 5.9.8-4.3 4.1 1 5.8L12 16.8 6.8 19.5l1-5.8L3.5 9.6l5.9-.8z"/>',
  target:   '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.2"/><circle cx="12" cy="12" r="1"/>',
  play:     '<path d="M8 5.2v13.6a.6.6 0 0 0 .9.52l10.5-6.8a.6.6 0 0 0 0-1.04L8.9 4.68A.6.6 0 0 0 8 5.2z"/>',
  chat:     '<path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4V6a1 1 0 0 1 1-1z"/>',
  cap:      '<path d="M3 9l9-4 9 4-9 4-9-4z"/><path d="M7 11.4V16c0 1.1 2.2 2 5 2s5-.9 5-2v-4.6"/>',
  broker:   '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5.5A2 2 0 0 1 10 3.5h4a2 2 0 0 1 2 2V7"/><path d="M3 12h18"/>',
}

function EmlakIcon({ id }: { id: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 19, height: 19, stroke: 'currentColor', flexShrink: 0, opacity: 0.85 }}
      dangerouslySetInnerHTML={{ __html: EMLAK_NAV_PATHS[id] ?? '' }}
    />
  )
}

// ── Emlak Sidebar ─────────────────────────────────────────────────
interface EmlakNavLink {
  href?: string
  labelKey: string
  iconId: string
  active?: boolean
  muted?: boolean
  lavender?: boolean   // Ali kimlikli (lavanta aksan) nav öğesi
  star?: boolean       // ⭐ vurgulu öğe (Satış Kütüphanesi)
}

// GELİŞİM grubu — Satış Kütüphanesi açılış; çoğu öğe stub (yakında).
// Not: Ali Satış Zekâsı ayrı bir ANA bölümdür (EMLAK_NAV) — buraya derin link konmaz (çift kapı olmasın).
const EMLAK_GELISIM_NAV: EmlakNavLink[] = [
  { href: GELISIM_SLUG, labelKey: 'nav.satisKutuphanesi', iconId: 'star', lavender: true, star: true },
  { labelKey: 'nav.aiKocum',              iconId: 'sparkle',  muted: true },
  { labelKey: 'nav.gunlukChallenge',      iconId: 'target',   muted: true },
  { labelKey: 'nav.rolYap',               iconId: 'play',     muted: true },
  { labelKey: 'nav.oyunKitabi',           iconId: 'book',     muted: true },
  { labelKey: 'nav.hikayeKutuphanesi',    iconId: 'book',     muted: true },
  { labelKey: 'nav.personaKutuphanesi',   iconId: 'badge',    muted: true },
  { labelKey: 'nav.projeAkademisi',       iconId: 'cap',      muted: true },
  { labelKey: 'nav.itirazMerkezi',        iconId: 'chat',     muted: true },
  { labelKey: 'nav.whatsappKutuphanesi',  iconId: 'chat',     muted: true },
  { href: '/raporlar', labelKey: 'nav.raporlar', iconId: 'chart' },
]

const EMLAK_NAV: EmlakNavLink[] = [
  { href: '/',             labelKey: 'nav.dashboard',      iconId: 'grid' },
  { href: '/firsatlar',    labelKey: 'nav.firsatlar',      iconId: 'flame' },
  { href: '/musteriler',   labelKey: 'nav.musteriler',     iconId: 'users' },
  { href: '/satis-sureci', labelKey: 'nav.satisSureci',    iconId: 'columns' },
  { href: '/stok',         labelKey: 'nav.stok',           iconId: 'building' },
  { href: SECTION_SLUG,    labelKey: 'nav.aliSatisZekasi', iconId: 'sparkle', lavender: true },
  { href: KAMPANYA_SLUG,   labelKey: 'nav.kampanyaMotoru', iconId: 'target',  lavender: true },
  { href: '/temsilciler',  labelKey: 'nav.temsilciler',    iconId: 'badge' },
  { href: '/broker-yonetimi', labelKey: 'nav.brokerYonetimi', iconId: 'broker' },
  { labelKey: 'nav.operasyonMerkezi', iconId: 'sliders', muted: true },
]

// Ali bölümü için lavanta gradyanı (yeşil GRAD'in lavanta ikizi)
const LAV_GRAD = 'linear-gradient(135deg,#6D5BE0,#8c97d8)'

const EMLAK_RAPOR_NAV: EmlakNavLink[] = [
  { labelKey: 'nav.egitimIpuclari', iconId: 'book', muted: true },
  { href: '/raporlar', labelKey: 'nav.raporlar', iconId: 'chart' },
]

const GRAD = 'linear-gradient(135deg,#2c8a52,#4f9f6c 44%,#8c97d8)'
const SHADOW = '0 2px 6px rgba(40,60,45,.05),0 22px 46px -26px rgba(40,70,50,.30)'

function EmlakSidebar({ pathname, displayName, initials, rolEtiketi }: {
  pathname: string
  displayName: string
  initials: string
  rolEtiketi: string
}) {
  const t = useT()
  const isActive = (href?: string) => {
    if (!href) return false
    return href === '/' ? pathname === '/' : pathname.startsWith(href)
  }

  return (
    <aside style={{
      margin: '16px 0 16px 16px',
      height: 'calc(100vh - 32px)',
      background: 'rgba(255,255,255,.62)',
      backdropFilter: 'blur(24px) saturate(165%)',
      WebkitBackdropFilter: 'blur(24px) saturate(165%)',
      border: '1px solid rgba(255,255,255,.72)',
      borderRadius: 26,
      boxShadow: SHADOW,
      display: 'flex',
      flexDirection: 'column',
      padding: '22px 16px',
      position: 'sticky',
      top: 16,
      overflowY: 'auto',
    }}>
      {/* Brand */}
      <div style={{ padding: '4px 8px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 18.5, fontWeight: 800, letterSpacing: '-0.02em', color: '#1c2a22', whiteSpace: 'nowrap', display: 'flex', alignItems: 'baseline' }}>
          Babacan
          <span style={{ color: '#8c97d8', fontWeight: 700, margin: '0 6px' }}>×</span>
          Sales<span style={{ color: '#6D5BE0' }}>AI</span>
          <span style={{ color: '#8c97d8', fontSize: 12, marginLeft: 3, alignSelf: 'flex-start', lineHeight: 1 }}>✦</span>
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#8b988f', letterSpacing: '0.02em' }}>
          {t('sidebar.salesIntelPanel')}
        </div>
      </div>

      {/* Segment switch — uses shared SegmentSwitch (glass-styled override below) */}
      <div style={{ margin: '20px 4px 22px' }}>
        <EmlakSegmentSwitch />
      </div>

      {/* Main nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {EMLAK_NAV.map(item => {
          const active = isActive(item.href)
          const muted = item.muted && !active

          if (item.href && !item.muted) {
            const idleColor = item.lavender ? '#6D5BE0' : '#57655b'
            return (
              <Link
                key={item.labelKey}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 13px',
                  borderRadius: 13,
                  textDecoration: 'none',
                  color: active ? '#fff' : idleColor,
                  fontWeight: active ? 700 : 600,
                  fontSize: 14,
                  transition: '.16s',
                  ...(active ? {
                    background: item.lavender ? LAV_GRAD : GRAD,
                    boxShadow: item.lavender
                      ? '0 12px 22px -10px rgba(91,71,224,.55)'
                      : '0 12px 22px -10px rgba(40,120,70,.55)',
                  } : item.lavender ? {
                    background: 'rgba(237,233,254,.55)',
                  } : {}),
                }}
              >
                <EmlakIcon id={item.iconId} />
                {t(item.labelKey)}
              </Link>
            )
          }

          return (
            <div
              key={item.labelKey}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 13px',
                borderRadius: 13,
                color: muted ? '#8b988f' : '#57655b',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'default',
              }}
            >
              <EmlakIcon id={item.iconId} />
              {t(item.labelKey)}
            </div>
          )
        })}
      </nav>

      {/* GELİŞİM grup başlığı (Space Mono, UPPERCASE) */}
      <div style={{
        fontFamily: 'var(--font-space-mono), ui-monospace, monospace',
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '.12em',
        textTransform: 'uppercase',
        color: '#8b988f',
        padding: '0 12px',
        margin: '22px 0 8px',
      }}>
        {t('group.gelisim')}
      </div>

      {/* GELİŞİM nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {EMLAK_GELISIM_NAV.map(item => {
          const active = isActive(item.href)
          const idleColor = item.lavender ? '#6D5BE0' : '#57655b'

          if (item.href && !item.muted) {
            return (
              <Link
                key={item.labelKey}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 13px',
                  borderRadius: 13,
                  textDecoration: 'none',
                  color: active ? '#fff' : idleColor,
                  fontWeight: active ? 700 : 600,
                  fontSize: 14,
                  transition: '.16s',
                  ...(active ? {
                    background: item.lavender ? LAV_GRAD : GRAD,
                    boxShadow: item.lavender
                      ? '0 12px 22px -10px rgba(91,71,224,.55)'
                      : '0 12px 22px -10px rgba(40,120,70,.55)',
                  } : item.lavender ? {
                    background: 'rgba(237,233,254,.55)',
                  } : {}),
                }}
              >
                <EmlakIcon id={item.iconId} />
                <span style={{ flex: 1 }}>{t(item.labelKey)}</span>
                {item.star && <span aria-hidden style={{ fontSize: 12 }}>⭐</span>}
              </Link>
            )
          }

          return (
            <div
              key={item.labelKey}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 13px',
                borderRadius: 13,
                color: '#8b988f',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'default',
              }}
            >
              <EmlakIcon id={item.iconId} />
              {t(item.labelKey)}
            </div>
          )
        })}
      </nav>

      {/* Education & Community label */}
      <div style={{
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: '.12em',
        textTransform: 'uppercase',
        color: '#8b988f',
        padding: '0 12px',
        margin: '22px 0 8px',
      }}>
        {t('group.eduCommunity')}
      </div>

      {/* Rapor nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {EMLAK_RAPOR_NAV.map(item => {
          const active = isActive(item.href)
          if (item.href && !item.muted) {
            return (
              <Link
                key={item.labelKey}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 13px',
                  borderRadius: 13,
                  textDecoration: 'none',
                  color: active ? '#fff' : '#57655b',
                  fontWeight: active ? 700 : 600,
                  fontSize: 14,
                  transition: '.16s',
                  ...(active ? {
                    background: GRAD,
                    boxShadow: '0 12px 22px -10px rgba(40,120,70,.55)',
                  } : {}),
                }}
              >
                <EmlakIcon id={item.iconId} />
                {t(item.labelKey)}
              </Link>
            )
          }
          return (
            <div
              key={item.labelKey}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 13px',
                borderRadius: 13,
                color: '#8b988f',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'default',
              }}
            >
              <EmlakIcon id={item.iconId} />
              {t(item.labelKey)}
            </div>
          )
        })}
      </nav>

      {/* User card */}
      <div style={{
        marginTop: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: 11,
        border: '1px solid rgba(255,255,255,.72)',
        borderRadius: 15,
        background: 'rgba(255,255,255,.65)',
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 11,
          background: GRAD,
          display: 'grid',
          placeItems: 'center',
          color: '#fff',
          fontWeight: 800,
          fontSize: 14,
          flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {displayName}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#8b988f' }}>
            {rolEtiketi}
          </div>
        </div>
        <span style={{
          marginLeft: 'auto',
          width: 9,
          height: 9,
          borderRadius: '50%',
          background: '#36b35a',
          boxShadow: '0 0 0 3px rgba(54,179,90,.22)',
          flexShrink: 0,
          display: 'block',
        }} />
      </div>
    </aside>
  )
}

// ── Main Sidebar export ───────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const cfg = useTenant()
  const t = useT()
  const mods = cfg.modules as unknown as Record<string, boolean>

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)
  const moduleOn = (key?: string) => !key || mods[key] !== false

  const meta = (user?.publicMetadata ?? {}) as Record<string, unknown>
  const rolKey = typeof meta.rol === 'string' ? meta.rol
    : typeof meta.temsilci === 'string' ? 'satış_temsilcisi' : ''
  const rolEtiketi = t(ROL_ETIKETI_KEY[rolKey] ?? 'common.user')
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || t('common.user')
  const initials = ((user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')).toUpperCase() || '?'

  const isEmlak = cfg.id === 'emlak_demo'

  if (isEmlak) {
    return (
      <EmlakSidebar
        pathname={pathname}
        displayName={displayName}
        initials={initials}
        rolEtiketi={rolEtiketi}
      />
    )
  }

  // ── Sigortan / default sidebar ────────────────────────────────
  const logoDotIdx = cfg.branding.logo.lastIndexOf('.')
  const logoBase   = cfg.branding.logo.slice(0, logoDotIdx)
  const logoSuffix = cfg.branding.logo.slice(logoDotIdx)

  const showRapor = raporNav.some(n => moduleOn(n.moduleKey))
  const showAli   = [...aliNav, ...aliStubNav].some(n => moduleOn(n.moduleKey))

  return (
    <aside
      className="hidden lg:flex flex-col w-[244px] min-h-screen shrink-0 bg-white"
      style={{ borderRight: `1px solid ${C.line}` }}
    >
      {/* Logo */}
      <div className="px-5 pt-5 pb-2">
        {cfg.branding.logoImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cfg.branding.logoImage}
            alt={cfg.branding.logo}
            className="w-full h-auto object-contain"
          />
        ) : (
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
        )}
        <p className="text-[12px] font-medium text-slate-400 mt-2">CRM Paneli</p>
      </div>

      {/* Segment switch — sadece emlak tenantında */}
      {mods.segmentSwitch && <SegmentSwitch />}

      <nav className="flex-1 px-[14px] pt-[16px] overflow-y-auto">

        {/* Ana nav */}
        <div className="space-y-[7px]">
          {mainNav.filter(n => moduleOn(n.moduleKey)).map(({ href, labelKey, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href}
                className={`h-[44px] flex items-center gap-[13px] rounded-[12px] px-[14px] text-[15px] font-semibold transition-colors ${active ? 'text-white' : 'text-slate-600 hover:bg-gray-50'}`}
                style={active ? activeItemStyle : {}}>
                <Icon size={18} strokeWidth={2.05} />
                <span className="flex-1">{t(labelKey)}</span>
              </Link>
            )
          })}

          {stubNav.filter(n => moduleOn(n.moduleKey)).map(({ labelKey, icon: Icon }) => (
            <div key={labelKey}
              className="h-[44px] flex items-center gap-[13px] rounded-[12px] px-[14px] text-[15px] font-semibold text-slate-400 cursor-default">
              <Icon size={18} strokeWidth={2.05} />
              <span className="flex-1">{t(labelKey)}</span>
            </div>
          ))}
        </div>

        {showRapor && (
          <>
            <div className="my-[16px] h-px" style={{ backgroundColor: C.line }} />
            <div className="space-y-[7px]">
              {raporNav.filter(n => moduleOn(n.moduleKey)).map(({ href, labelKey, icon: Icon }) => {
                const active = isActive(href)
                return (
                  <Link key={href} href={href}
                    className={`h-[44px] flex items-center gap-[13px] rounded-[12px] px-[14px] text-[15px] font-semibold transition-colors ${active ? 'text-white' : 'text-slate-600 hover:bg-gray-50'}`}
                    style={active ? activeItemStyle : {}}>
                    <Icon size={18} strokeWidth={2.05} />
                    <span className="flex-1">{t(labelKey)}</span>
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
              {aliNav.filter(n => moduleOn(n.moduleKey)).map(({ href, labelKey, icon: Icon }) => {
                const active = isActive(href)
                return (
                  <Link key={href} href={href}
                    className={`h-[44px] flex items-center gap-[13px] rounded-[12px] px-[14px] text-[15px] font-semibold transition-colors ${active ? 'text-white' : 'text-slate-600 hover:bg-gray-50'}`}
                    style={active ? activeItemStyle : {}}>
                    <Icon size={18} strokeWidth={2.05} />
                    <span className="flex-1">{t(labelKey)}</span>
                  </Link>
                )
              })}
              {aliStubNav.filter(n => moduleOn(n.moduleKey)).map(({ labelKey, icon: Icon }) => (
                <div key={labelKey}
                  className="h-[44px] flex items-center gap-[13px] rounded-[12px] px-[14px] text-[15px] font-semibold text-slate-400 cursor-default">
                  <Icon size={18} strokeWidth={2.05} />
                  <span className="flex-1">{t(labelKey)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="my-[16px] h-px" style={{ backgroundColor: C.line }} />
        <p className="px-[8px] mb-[10px] text-[11px] font-black tracking-[.18em] text-slate-400">{t('group.eduCommunity')}</p>
        <div className="space-y-[7px]">
          {[
            { labelKey: 'nav.egitimIpuclari', icon: BookOpen },
            { labelKey: 'nav.topluluk',       icon: Users2 },
          ].map(({ labelKey, icon: Icon }) => (
            <div key={labelKey}
              className="h-[44px] flex items-center gap-[13px] rounded-[12px] px-[14px] text-[15px] font-semibold text-slate-400 cursor-default">
              <Icon size={18} strokeWidth={2.05} />
              <span className="flex-1">{t(labelKey)}</span>
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
