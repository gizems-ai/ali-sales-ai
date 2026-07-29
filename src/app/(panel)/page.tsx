import { getBrifing } from '@/lib/brifing'
import { getDashboardCounts } from '@/lib/airtable'
import { getKullanicıProfili, izolasyonBelirle, getTenantConfigFromRequest } from '@/lib/yetki'
import { type TenantConfig } from '@/lib/tenants'
import { redirect } from 'next/navigation'
import { getSegment } from '@/lib/emlak-segment'
import { resolveDisplayAd } from '@/lib/emlak-display'
import { BIREYSEL_MUSTERILER, BUGUNUN_HAMLELERI } from '@/lib/emlak-fixtures'
import {
  Clock3, Heart, Bell, Gift,
  MessageCircle, TrendingUp,
  Users, ClipboardList, CalendarClock, AlertTriangle, Lightbulb,
  Building2, Flame, Wallet, PhoneCall, CalendarDays,
  ArrowRight, FileText, UserPlus, Upload,
  Home, MapPin,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { MoveCard } from '@/components/emlak/move-card'
import { StatTile } from '@/components/emlak/stat-tile'
import { AliChatLauncher } from '@/components/ali-chat/ali-chat-launcher'
import { getServerT } from '@/lib/i18n/server'

export const revalidate = 300

const C = {
  navy:     '#061f3d',
  violet:   '#5B38E8',
  bordo:    '#982A49',
  pink:     '#D978B6',
  line:     '#E7EAF2',
  text:     '#071B3A',
  lavender: '#F2EEFF',
}

const E = {
  green1:   '#0E5132',
  green2:   '#1B7A47',
  green3:   '#2E9D5E',
  surface:  '#EFF5EF',
  lavender: '#F2EEFF',
  coral:    '#EF6B4F',
  text:     '#071B3A',
  line:     '#E7EAF2',
}

// InsightTile — emlak için ikon tile bileşeni
function InsightTile({
  icon: Icon, label, description, count, href,
}: {
  icon: React.ElementType; label: string; description: string
  count?: number; href?: string
}) {
  const inner = (
    <div
      className="rounded-[18px] border bg-white p-[14px] flex items-start gap-[12px] hover:shadow-md transition-shadow"
      style={{ borderColor: E.line }}
    >
      <div
        className="h-[38px] w-[38px] rounded-full grid place-items-center shrink-0 text-white"
        style={{ background: `linear-gradient(135deg, ${E.green2}, ${E.green3})` }}
      >
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-black" style={{ color: E.text }}>{label}</p>
        <p className="text-[11px] text-slate-400 mt-[2px] leading-snug">{description}</p>
      </div>
      {count !== undefined && (
        <span
          className="shrink-0 h-[22px] min-w-[22px] rounded-full px-[7px] grid place-items-center text-[11px] font-bold text-white"
          style={{ background: E.green2 }}
        >
          {count}
        </span>
      )}
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : <div>{inner}</div>
}

function fmt(n: number | undefined, locale = 'tr-TR') {
  return n?.toLocaleString(locale) ?? '—'
}

// ── KPI Card ──────────────────────────────────────────────────────
function KpiCard({
  icon: Icon, tone, label, value, sub, yakinda = false, t,
}: {
  icon: React.ElementType
  tone: 'chart' | 'red' | 'violet' | 'bordo'
  label: string; value?: string | number; sub?: string; yakinda?: boolean
  t: (key: string) => string
}) {
  const iconBg = tone === 'red' ? '#FFF0F3' : tone === 'bordo' ? '#F8E9EF' : C.lavender
  const iconFg = tone === 'red' ? '#FF445F' : tone === 'bordo' ? C.bordo : C.violet
  return (
    <div
      className="h-[126px] rounded-[15px] border bg-white p-[18px] shadow-sm flex flex-col"
      style={{ borderColor: C.line }}
    >
      <div className="flex justify-between items-start flex-1">
        <div>
          <p className="text-[13px] font-bold text-slate-700">{label}</p>
          <p
            className="mt-[13px] text-[29px] leading-none font-black tracking-[-0.035em]"
            style={{ color: yakinda ? '#D1D5DB' : C.text }}
          >
            {yakinda ? '—' : (value ?? '—')}
          </p>
        </div>
        <div
          className="h-[50px] w-[50px] rounded-full grid place-items-center shrink-0"
          style={{ background: iconBg, color: iconFg }}
        >
          <Icon size={22} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-slate-500">{!yakinda ? (sub ?? '') : ''}</span>
        {yakinda && (
          <span className="rounded-[7px] bg-gray-100 px-[8px] py-[4px] text-[11px] font-bold text-gray-400">
            {t('dash.comingSoon')}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Insight / Suggestion Card ────────────────────────────────────
function InsightCard({
  icon: Icon, count, label, description, yakinda = false, href, hrefYakinda = false, t, locale = 'tr-TR',
}: {
  icon: React.ElementType; count?: number; label: string; description: string
  yakinda?: boolean; href?: string; hrefYakinda?: boolean
  t: (key: string) => string; locale?: string
}) {
  return (
    <div
      className="min-h-[147px] rounded-[13px] border bg-gradient-to-b from-white to-violet-50/50 p-[15px] flex flex-col"
      style={{ borderColor: C.line }}
    >
      <div
        className="h-[38px] w-[38px] rounded-full grid place-items-center text-white shrink-0"
        style={{ background: `linear-gradient(135deg, ${C.violet}, ${C.bordo})` }}
      >
        <Icon size={20} />
      </div>
      {yakinda ? (
        <div className="flex items-center gap-2 mt-3">
          <p className="text-[28px] leading-none font-black text-gray-200">—</p>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-medium text-gray-400">
            {t('dash.comingSoon')}
          </span>
        </div>
      ) : (
        <p className="mt-3 text-[28px] leading-none font-black" style={{ color: C.text }}>
          {fmt(count, locale)}
        </p>
      )}
      <p className="mt-[9px] text-[13px] leading-[17px] font-black" style={{ color: C.text }}>
        {label}
      </p>
      <p className="mt-[8px] text-[13px] text-slate-500 flex-1 leading-snug">{description}</p>
      {!yakinda && href && !hrefYakinda && (
        <Link
          href={href}
          className="mt-3 inline-flex items-center h-[30px] rounded-[8px] border bg-white px-[11px] text-[12px] font-bold self-start"
          style={{ borderColor: C.line, color: C.violet }}
        >
          {t('dash.viewDetails')} →
        </Link>
      )}
      {!yakinda && hrefYakinda && (
        <span
          title={t('dash.filteredViewComing')}
          className="mt-3 inline-flex items-center h-[30px] rounded-[8px] border bg-white px-[11px] text-[12px] font-bold self-start opacity-40 cursor-not-allowed pointer-events-none"
          style={{ borderColor: C.line, color: '#94A3B8' }}
        >
          {t('dash.viewDetails')} →
        </span>
      )}
    </div>
  )
}

// ── Donut Chart ──────────────────────────────────────────────────
function DonutChart({
  saglik, elementer, acibadem, toplam, t, locale = 'tr-TR',
}: {
  saglik: number; elementer: number; acibadem: number; toplam: number
  t: (key: string) => string; locale?: string
}) {
  // Yüzdeler branş toplamı üzerinden hesaplanır (firma_toplam değil)
  // böylece acıbadem dilimi gerçek oranını yansıtır
  const branchSum = saglik + elementer + acibadem
  const tot = branchSum > 0 ? branchSum : 1
  const s = Math.round((saglik / tot) * 100)
  const e = Math.round((elementer / tot) * 100)
  const a = 100 - s - e  // kalan = acıbadem, conic gradient 100%'e tamamlanır
  return (
    <div
      className="rounded-[15px] border bg-white p-[18px] shadow-sm flex flex-col"
      style={{ borderColor: C.line }}
    >
      <p className="font-black text-[15px] mb-[17px]" style={{ color: C.text }}>
        {t('dash.portfolioDistribution')}
      </p>
      <div className="flex items-center gap-[22px] flex-1">
        <div className="relative shrink-0 w-[152px] h-[152px]">
          <div
            className="w-[152px] h-[152px] rounded-full"
            style={{
              background: `conic-gradient(
                ${C.bordo} 0% ${s}%,
                #C95B92 ${s}% ${s + e}%,
                ${C.violet} ${s + e}% 100%
              )`,
            }}
          />
          <div className="absolute inset-[30px] rounded-full bg-white grid place-items-center text-center">
            <div>
              <div className="text-[22px] font-black" style={{ color: C.text }}>{fmt(toplam, locale)}</div>
              <div className="text-[13px] leading-tight text-slate-500">{t('dash.total')}<br />{t('dash.company')}</div>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-[11px]">
          {[
            { label: t('dash.branchHealth'),   val: saglik,   pct: s, color: C.bordo   },
            { label: t('dash.branchGeneral'),  val: elementer, pct: e, color: C.violet  },
            { label: t('dash.branchAcibadem'), val: acibadem,  pct: a, color: '#C95B92' },
          ].map(({ label, val, pct, color }) => (
            <div key={label} className="grid grid-cols-[1fr_58px_42px] items-center text-[13px]">
              <div className="flex items-center gap-[10px]">
                <span className="h-[9px] w-[9px] rounded-full shrink-0" style={{ background: color }} />
                <span className="font-semibold text-slate-700">{label}</span>
              </div>
              <div className="text-right font-black" style={{ color: C.text }}>{fmt(val, locale)}</div>
              <div className="text-right text-slate-500">%{pct}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Vade Row ─────────────────────────────────────────────────────
function VadeRow({
  label, sayi, hot, temsilciSayilari, showTemsilci, t, locale = 'tr-TR',
}: {
  label: string; sayi: number; hot: number
  temsilciSayilari?: { ad: string; sayi: number }[]
  showTemsilci: boolean
  t: (key: string) => string; locale?: string
}) {
  return (
    <div className="py-[13px] border-b last:border-0" style={{ borderColor: C.line }}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-slate-600">{label}</span>
        <div className="flex items-center gap-[10px]">
          <b className="text-[13px] font-black" style={{ color: C.text }}>{fmt(sayi, locale)}</b>
          <span className="rounded-full bg-violet-600 px-[10px] py-[4px] text-[11px] font-bold text-white">
            {hot} {t('dash.hot')}
          </span>
        </div>
      </div>
      {showTemsilci && temsilciSayilari && temsilciSayilari.length > 0 && (
        <p className="text-[11px] text-slate-400 mt-[3px]">
          {temsilciSayilari.map(t => `${t.ad}: ${t.sayi}`).join(' · ')}
        </p>
      )}
    </div>
  )
}

function vadeSayilari(
  period: Record<string, unknown>,
  cfg: TenantConfig,
): { ad: string; sayi: number }[] {
  return cfg.temsilciler.map(t => ({
    ad: t.ad,
    sayi: (period[t.slug] as number) ?? 0,
  }))
}

// ── Insight Row (uyarı listesi) ───────────────────────────────────
function InsightRow({
  icon: Icon, label, count, iconColor, locale = 'tr-TR',
}: {
  icon: React.ElementType; label: string; count: number; iconColor: string; locale?: string
}) {
  return (
    <div className="flex items-center gap-[13px] py-[13px] border-b last:border-0" style={{ borderColor: C.line }}>
      <div
        className="h-[42px] w-[42px] rounded-full grid place-items-center shrink-0"
        style={{ background: '#FFF5F7', color: iconColor }}
      >
        <Icon size={18} />
      </div>
      <p className="flex-1 text-[13px] font-black" style={{ color: C.text }}>{label}</p>
      <span
        className="shrink-0 rounded-full px-[10px] py-[4px] text-[11px] font-bold text-white"
        style={{ backgroundColor: iconColor }}
      >
        {fmt(count, locale)}
      </span>
    </div>
  )
}

// ── Sıcak Firma Row ──────────────────────────────────────────────
function SicakFirmaRow({ firma, skor, temsilci }: { firma: string; skor: number; temsilci: string }) {
  return (
    <div
      className="grid grid-cols-[30px_1fr_auto] items-center gap-[7px] py-[9px] border-b last:border-0 text-[13px]"
      style={{ borderColor: C.line }}
    >
      <span className="h-[25px] w-[25px] rounded-full bg-emerald-500 grid place-items-center text-[11px] font-black text-white shrink-0">
        {skor}
      </span>
      <span className="font-semibold truncate" style={{ color: C.text }}>{firma}</span>
      <span className="text-slate-400 text-xs shrink-0">{temsilci}</span>
    </div>
  )
}

// ── Hızlı Yol Kartı ──────────────────────────────────────────────
function HizliYolCard({
  href, icon: Icon, label, count, countColor, yakinda = false, noLink = false, t, locale = 'tr-TR',
}: {
  href: string; icon: React.ElementType; label: string
  count?: number; countColor?: string; yakinda?: boolean; noLink?: boolean
  t: (key: string) => string; locale?: string
}) {
  const isDisabled = yakinda || noLink
  const inner = (
    <div
      className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3 transition-colors
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-violet-50 hover:border-violet-200'}`}
      style={{ borderColor: C.line }}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: isDisabled ? '#F3F4F6' : C.lavender }}
      >
        <Icon size={15} style={{ color: isDisabled ? '#9CA3AF' : C.violet }} />
      </span>
      <span className={`flex-1 text-sm font-medium ${isDisabled ? 'text-gray-400' : 'text-gray-700'}`}>
        {label}
      </span>
      {yakinda ? (
        <span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{t('dash.comingSoon')}</span>
      ) : count !== undefined ? (
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: noLink ? '#94A3B8' : (countColor ?? C.violet) }}
        >
          {fmt(count, locale)}
        </span>
      ) : (
        <ArrowRight size={13} className="text-gray-300" />
      )}
    </div>
  )
  return isDisabled ? <div title={yakinda ? t('dash.comingSoon') : t('dash.filterSupportComing')}>{inner}</div> : <Link href={href}>{inner}</Link>
}

// ══════════════════════════════════════════════════════════════════
//  EMLAK GLASS DASHBOARD
// ══════════════════════════════════════════════════════════════════

const GLASS_STYLE = {
  background: 'rgba(255,255,255,.55)',
  backdropFilter: 'blur(22px) saturate(160%)',
  WebkitBackdropFilter: 'blur(22px) saturate(160%)',
  border: '1px solid rgba(255,255,255,.72)',
  borderRadius: 24,
  boxShadow: '0 2px 6px rgba(40,60,45,.05),0 22px 46px -26px rgba(40,70,50,.30)',
} as const

const EMLAK_GRAD = 'linear-gradient(135deg,#2c8a52,#4f9f6c 44%,#8c97d8)'
const GLASS_LINE = 'rgba(120,140,125,.16)'

// Emlak token shorthands
const ET = {
  ink:    '#1c2a22',
  body:   '#57655b',
  muted:  '#8b988f',
  green:  '#248a47',
  greenD: '#1a6b37',
  greenT: 'rgba(146,214,170,.26)',
  hot:    '#d9572a',
  hotT:   '#fde7df',
  warn:   '#b07d1e',
  warnT:  '#fbf1cf',
  blue:   '#4f68c0',
  blueT:  '#e7ecfb',
  lav:    '#7d52c0',
  lavT:   '#f0e7fb',
}

function EmlakGlass({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ ...GLASS_STYLE, ...style }}>{children}</div>
}

// KPI Card (emlak glass version)
function EKpiCard({
  label, num, sub, iconPath, iconBg, iconStroke,
}: {
  label: string; num: string; sub?: string
  iconPath: string; iconBg: string; iconStroke: string
}) {
  return (
    <EmlakGlass style={{ padding: '18px 18px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: ET.body }}>{label}</span>
        <span style={{
          width: 36, height: 36, borderRadius: 11, display: 'grid', placeItems: 'center', flexShrink: 0,
          background: iconBg,
        }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            style={{ width: 18, height: 18, stroke: iconStroke }}
            dangerouslySetInnerHTML={{ __html: iconPath }}
          />
        </span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 14, lineHeight: 1, color: ET.ink }}>
        {num}
      </div>
      {sub && <div style={{ fontSize: 11.5, fontWeight: 600, color: ET.muted, marginTop: 7 }}>{sub}</div>}
    </EmlakGlass>
  )
}

// Briefing count pill
function BriefCnt({
  variant, icon, n, label,
}: { variant: 'sug' | 'warn' | 'opp'; icon: string; n: number; label: string }) {
  const styles = {
    sug:  { bg: 'linear-gradient(135deg,#aef0c2,#86e6a6)', color: '#14622f' },
    warn: { bg: 'linear-gradient(135deg,#fbf0a6,#f6e57e)', color: '#7c6611' },
    opp:  { bg: 'linear-gradient(135deg,#d8cdf4,#c2b2ec)', color: '#4b3a86' },
  }[variant]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
      borderRadius: 14, background: styles.bg, color: styles.color,
    }}>
      <span style={{
        width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center',
        flexShrink: 0, background: 'rgba(255,255,255,.55)',
      }}>
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          style={{ width: 15, height: 15, stroke: styles.color }}
          dangerouslySetInnerHTML={{ __html: icon }}
        />
      </span>
      <div>
        <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1 }}>{n}</div>
        <div style={{ fontSize: 10.5, fontWeight: 700, marginTop: 2, opacity: 0.85 }}>{label}</div>
      </div>
    </div>
  )
}

// Deal card (glass version replaces MoveCard in this layout)
function EmlakDealCard({ item, t }: { item: import('@/lib/emlak-fixtures').HamleItem; t: (key: string) => string }) {
  const telHref = `tel:${item.tel}`
  const waHref  = `https://wa.me/90${item.tel.replace(/^0/, '').replace(/\s/g, '')}`

  const stageStyle = item.asama === 'Teklif'
    ? { bg: ET.hotT, color: ET.hot }
    : item.asama === 'Randevu'
    ? { bg: ET.blueT, color: ET.blue }
    : { bg: ET.greenT, color: ET.greenD }

  const dotColor = item.sicaklik === 'hot' ? ET.hot : item.sicaklik === 'warm' ? ET.warn : ET.muted

  return (
    <div className="emlak-deal-row" style={{ padding: '18px 22px', borderTop: `1px solid ${GLASS_LINE}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0, display: 'block' }} />
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', flexShrink: 0, color: ET.ink }}>{item.ad}</span>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: ET.muted }}>· {item.tip} · {item.il}</span>
        <span style={{
          marginLeft: 'auto', fontSize: 11.5, fontWeight: 700,
          padding: '5px 12px', borderRadius: 999, flexShrink: 0,
          background: stageStyle.bg, color: stageStyle.color,
        }}>{item.asama}</span>
      </div>

      <div style={{
        display: 'flex', gap: 10, marginTop: 12,
        background: 'rgba(255,255,255,.45)',
        border: '1px solid rgba(255,255,255,.72)',
        borderRadius: 13, padding: '12px 14px',
      }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: ET.greenD, flexShrink: 0 }}>Ali</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: ET.body, lineHeight: 1.5 }}>{item.aliGerekce}</span>
      </div>

      <div style={{ display: 'flex', gap: 9, marginTop: 13 }}>
        <a href={telHref} style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700,
          padding: '9px 15px', borderRadius: 11, cursor: 'pointer',
          border: '1px solid rgba(255,255,255,.72)', background: 'rgba(255,255,255,.55)',
          color: ET.ink, textDecoration: 'none',
        }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            style={{ width: 15, height: 15, stroke: ET.green }}>
            <path d="M5 4h3l2 5-2 1a11 11 0 0 0 5 5l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>
          </svg>
          {t('dash.call')}
        </a>
        <a href={waHref} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700,
          padding: '9px 15px', borderRadius: 11, cursor: 'pointer',
          background: ET.green, border: `1px solid ${ET.green}`, color: '#fff', textDecoration: 'none',
        }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            style={{ width: 15, height: 15, stroke: '#fff' }}>
            <path d="M4 19l1.4-4A8 8 0 1 1 9 18.6z"/>
          </svg>
          WhatsApp
        </a>
        <button style={{
          marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 13, fontWeight: 700, padding: '9px 15px', borderRadius: 11, cursor: 'pointer',
          border: '1px solid rgba(255,255,255,.72)', background: 'rgba(255,255,255,.55)',
          color: ET.muted, fontFamily: 'inherit',
        }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            style={{ width: 15, height: 15, stroke: ET.muted }}>
            <circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>
          </svg>
          {t('dash.postpone')}
        </button>
      </div>
    </div>
  )
}

// Quick filter row
function EmlakFilter({
  variant, iconPath, label, sub, count,
}: { variant: 'hot' | 'appt' | 'wait' | 'new'; iconPath: string; label: string; sub: string; count: number }) {
  const s = {
    hot:  { fic: 'linear-gradient(135deg,#fbcdb9,#f3a98c)', stroke: '#a8421d', fn: { bg: ET.hotT, color: ET.hot } },
    appt: { fic: 'linear-gradient(135deg,#bccaf2,#92a6e6)', stroke: '#36479a', fn: { bg: ET.blueT, color: ET.blue } },
    wait: { fic: 'linear-gradient(135deg,#fbf0a6,#f6e57e)', stroke: '#7c6611', fn: { bg: ET.warnT, color: ET.warn } },
    new:  { fic: 'linear-gradient(135deg,#aef0c2,#86e6a6)', stroke: '#14622f', fn: { bg: ET.greenT, color: ET.greenD } },
  }[variant]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
      cursor: 'pointer', borderTop: `1px solid ${GLASS_LINE}`,
    }}>
      <span style={{
        width: 36, height: 36, borderRadius: 11, display: 'grid', placeItems: 'center', flexShrink: 0,
        background: s.fic,
      }}>
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          style={{ width: 17, height: 17, stroke: s.stroke }}
          dangerouslySetInnerHTML={{ __html: iconPath }}
        />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: ET.ink }}>{label}</div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: ET.muted, marginTop: 1 }}>{sub}</div>
      </div>
      <span style={{
        marginLeft: 'auto', fontSize: 12.5, fontWeight: 800, minWidth: 30, height: 30,
        padding: '0 9px', borderRadius: 10, display: 'grid', placeItems: 'center',
        background: s.fn.bg, color: s.fn.color,
      }}>{count}</span>
    </div>
  )
}

async function EmlakDashboard({ sicakKpi, yanitBekleyen, portfoyToplam }: {
  sicakKpi: number
  yanitBekleyen: number
  portfoyToplam: number
}) {
  const { t } = await getServerT()
  const hamleleri = BUGUNUN_HAMLELERI
  const oneriSayisi = hamleleri.filter(h => h.sicaklik === 'hot').length
  const uyariSayisi = hamleleri.filter(h => h.sicaklik === 'cold').length

  return (
    <div style={{ padding: '8px 32px 48px', maxWidth: 1480, width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 332px', gap: 22, alignItems: 'start' }}>

        {/* ── MAIN COLUMN ── */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Briefing strip */}
          <EmlakGlass style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 18, position: 'relative', overflow: 'hidden' }}>
            {/* accent bar */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, background: EMLAK_GRAD }} />

            {/* Ali avatar */}
            <div style={{
              width: 60, height: 60, flexShrink: 0, borderRadius: '50%',
              background: 'linear-gradient(135deg,#2c8a52,#4f9f6c 44%,#8c97d8)',
              padding: 3,
            }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#fff' }}>
                <Image src="/ali-avatar.png" alt="Ali" width={54} height={54} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>

            {/* Text */}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em', color: ET.ink }}>
                {t('dash.emlakBriefPrefix')}{' '}
                <b style={{ color: ET.greenD }}>{t('dash.emlakBriefCritical').replace('{n}', String(hamleleri.length))}</b>{t('dash.emlakBriefSuffix')}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: ET.body, marginTop: 3 }}>
                {t('dash.morningScanComplete')}
              </div>
            </div>

            {/* Counters */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexShrink: 0 }}>
              <BriefCnt variant="sug"
                icon='<path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3z"/>'
                n={oneriSayisi} label={t('dash.suggestionLabel')} />
              <BriefCnt variant="warn"
                icon='<path d="M12 4 3 19h18z"/><path d="M12 10v4M12 17h.01"/>'
                n={uyariSayisi} label={t('dash.warningLabel')} />
              <BriefCnt variant="opp"
                icon='<path d="M4 16l5-5 4 3 6-7"/><path d="M19 7v4h-4"/>'
                n={sicakKpi} label={t('dash.opportunityLabel')} />
            </div>
          </EmlakGlass>

          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            <EKpiCard
              label={t('dash.activePortfolio')}
              num={String(portfoyToplam)}
              sub={t('dash.addedThisWeek')}
              iconBg="linear-gradient(135deg,#aef0c2,#86e6a6)"
              iconStroke="#14622f"
              iconPath='<path d="M4 20h16M6 20V7l6-3 6 3v13"/><path d="M10 11h4M10 15h4"/>'
            />
            <EKpiCard
              label={t('dash.hotLead')}
              num={String(sicakKpi)}
              sub={t('dash.scoreGte8Customers')}
              iconBg="linear-gradient(135deg,#fbcdb9,#f3a98c)"
              iconStroke="#a8421d"
              iconPath='<path d="M12 3c1 3-2 4-2 7a3 3 0 0 0 6 .3c.8 1 1 2 1 3a5 5 0 1 1-10 0c0-4 3-5 5-10.3z"/>'
            />
            <EKpiCard
              label={t('dash.awaitingResponse')}
              num={String(yanitBekleyen)}
              sub={t('dash.apptOfferResponse')}
              iconBg="linear-gradient(135deg,#bccaf2,#92a6e6)"
              iconStroke="#36479a"
              iconPath='<path d="M4 5h16v11H9l-4 3v-3H4z"/><path d="M8 10h8M8 13h5"/>'
            />
            <EKpiCard
              label={t('dash.thisMonthGain')}
              num={t('dash.thisMonthGainValue')}
              sub={t('dash.pct12VsLastMonth')}
              iconBg="linear-gradient(135deg,#fbf0a6,#f6e57e)"
              iconStroke="#7c6611"
              iconPath='<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>'
            />
          </div>

          {/* Bugünün Hamleleri panel */}
          <EmlakGlass style={{ overflow: 'hidden' }}>
            {/* Panel header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 13,
              padding: '18px 22px',
              borderBottom: `1px solid ${GLASS_LINE}`,
            }}>
              <span style={{
                width: 40, height: 40, borderRadius: 12, background: EMLAK_GRAD,
                display: 'grid', placeItems: 'center', flexShrink: 0,
                boxShadow: '0 8px 16px -9px rgba(40,120,70,.55)',
              }}>
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  style={{ width: 19, height: 19, stroke: '#fff' }}>
                  <path d="M4 20h16M6 20V7l6-3 6 3v13"/>
                </svg>
              </span>
              <div>
                <div style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: '-0.01em', color: ET.ink }}>
                  {t('dash.todaysMoves')}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: ET.muted, marginTop: 1 }}>
                  {t('dash.aliPrioritizedActions')}
                </div>
              </div>
              <span style={{
                marginLeft: 4, fontSize: 11.5, fontWeight: 700, color: '#14622f',
                background: 'linear-gradient(135deg,#aef0c2,#86e6a6)',
                padding: '6px 12px', borderRadius: 999,
              }}>
                {t('dash.movesCount').replace('{n}', String(hamleleri.length))}
              </span>
              <Link href="/satis-sureci" style={{
                marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: ET.greenD,
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
                {t('dash.salesProcess')}
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ width: 15, height: 15, stroke: ET.greenD }}>
                  <path d="M5 12h14M13 6l6 6-6 6"/>
                </svg>
              </Link>
            </div>

            {/* Deal rows */}
            {hamleleri.map(item => (
              <EmlakDealCard key={item.id} item={item} t={t} />
            ))}
          </EmlakGlass>

        </div>

        {/* ── RIGHT RAIL ── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 18 }}>

          {/* Ali assistant card */}
          <EmlakGlass style={{ padding: '22px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: ET.greenD }}>
              {t('dash.aliYourAssistant')}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4, lineHeight: 1, color: ET.ink }}>
              Ali
            </div>
            {/* Portrait */}
            <div style={{
              width: 102, height: 102, margin: '18px auto 0', borderRadius: '50%',
              background: 'linear-gradient(135deg,#2c8a52,#4f9f6c 44%,#8c97d8)',
              padding: 4,
            }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
                <Image src="/ali-avatar.png" alt="Ali" width={94} height={94} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              </div>
            </div>
            {/* Status */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700,
              marginTop: 16, background: '#18241c', color: '#fff',
              padding: '7px 16px', borderRadius: 999,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4fdc7a', boxShadow: '0 0 0 3px rgba(79,220,122,.25)', display: 'block' }} />
              {t('dash.online')}
            </div>
            {/* Message */}
            <div style={{ fontSize: 13.5, fontWeight: 600, color: ET.body, lineHeight: 1.5, marginTop: 16 }}>
              {t('dash.aliMessageEmlak')}
            </div>
            {/* CTA — Ali Sohbet drawer'ını açar */}
            <AliChatLauncher />
          </EmlakGlass>

          {/* Quick filters card */}
          <EmlakGlass style={{ overflow: 'hidden' }}>
            {/* Card header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '16px 18px 13px' }}>
              <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em', color: ET.ink }}>{t('dash.quickFilters')}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 700, color: ET.muted }}>{t('dash.leadPool')}</span>
            </div>
            <EmlakFilter variant="hot"
              iconPath='<path d="M12 3c1 3-2 4-2 7a3 3 0 0 0 6 .3c.8 1 1 2 1 3a5 5 0 1 1-10 0c0-4 3-5 5-10.3z"/>'
              label={t('dash.hotLeads')} sub={t('dash.scoreGte8')} count={sicakKpi} />
            <EmlakFilter variant="appt"
              iconPath='<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>'
              label={t('dash.appointments')} sub={t('dash.next7Days')} count={6} />
            <EmlakFilter variant="wait"
              iconPath='<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>'
              label={t('dash.awaitingResponse')} sub={t('dash.offerSent')} count={yanitBekleyen} />
            <EmlakFilter variant="new"
              iconPath='<path d="M12 5v14M5 12h14"/>'
              label={t('dash.newLeads')} sub={t('dash.last24Hours')} count={11} />
          </EmlakGlass>

        </aside>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
//  SAYFA
// ══════════════════════════════════════════════════════════════════
export default async function DashboardPage() {
  const [profil, cfg, segment] = await Promise.all([
    getKullanicıProfili(),
    getTenantConfigFromRequest(),
    getSegment(),
  ])
  if (!profil) redirect('/login')
  if (!cfg) redirect('/login')

  const { t, locale } = await getServerT()

  const isEmlak = cfg.id === 'emlak_demo'
  const isBireysel = isEmlak && segment === 'bireysel'

  // Emlak tenant: return immediately with fixture data, skip all Airtable calls
  if (isEmlak) {
    const sicakKpiEmlak = BIREYSEL_MUSTERILER.filter(r => (r.fields['Sıcaklık Skoru'] ?? 0) >= 7).length || 4
    return (
      <EmlakDashboard
        sicakKpi={sicakKpiEmlak}
        yanitBekleyen={3}
        portfoyToplam={isBireysel ? BIREYSEL_MUSTERILER.length : BUGUNUN_HAMLELERI.length + 18}
      />
    )
  }

  const izolasyon = izolasyonBelirle(profil)
  const temsilciFilter = izolasyon.tip === 'temsilci' ? izolasyon.ad : undefined
  const showTeam = izolasyon.tip !== 'temsilci'

  // Bireysel segmentte fixture'dan gelen sayılar kullanılır
  const bireyselCounts = isBireysel ? {
    sessizlesenler: 1, crossSellUygun: 2, yenilemeriski: 0,
    teklifSessiz: 1, bugunAranacak: 3, yanitBekleyen: 2,
  } : null

  const [d, counts] = await Promise.all([
    isBireysel ? Promise.resolve(null) : getBrifing(cfg),
    isBireysel ? Promise.resolve(bireyselCounts!) : getDashboardCounts(temsilciFilter, cfg),
  ])

  // Portföy KPI — izolasyonlu
  let portfoyToplam: number
  let portfoySub: string | undefined
  if (isBireysel) {
    portfoyToplam = BIREYSEL_MUSTERILER.length
    portfoySub = t('dash.sampleCustomerData')
  } else if (!d) {
    portfoyToplam = 0
  } else if (showTeam) {
    portfoyToplam = d.firma_toplam
    portfoySub = cfg.temsilciler
      .map(t => `${t.displayAd ?? t.ad}: ${fmt(d.temsilci[t.slug]?.toplam_portfoy ?? 0)}`)
      .join(' · ')
  } else {
    const t = temsilciFilter
      ? cfg.temsilciler.find(x => x.ad === temsilciFilter)
      : null
    portfoyToplam = t ? (d.temsilci[t.slug]?.toplam_portfoy ?? 0) : d.firma_toplam
  }

  // Sıcak KPI — izolasyonlu
  let sicakKpi = 0
  if (isBireysel) {
    sicakKpi = BIREYSEL_MUSTERILER.filter(r => (r.fields['Sıcaklık Skoru'] ?? 0) >= 7).length
  } else if (d) {
    if (!showTeam && temsilciFilter) {
      const t = cfg.temsilciler.find(x => x.ad === temsilciFilter)
      sicakKpi = t ? (d.temsilci[t.slug]?.hot ?? d.sicak_firsatlar) : d.sicak_firsatlar
    } else {
      sicakKpi = d.sicak_firsatlar
    }
  }

  // Sıcak firma listesi — izolasyonlu
  const sicakListesi = isBireysel
    ? BIREYSEL_MUSTERILER
        .filter(r => (r.fields['Sıcaklık Skoru'] ?? 0) >= 7)
        .map(r => ({
          firma: r.fields['Firma Adı'] ?? '—',
          skor: r.fields['Sıcaklık Skoru'] ?? 0,
          temsilci: resolveDisplayAd(cfg.temsilciler, r.fields['Atanan Temsilci'] ?? ''),
        }))
    : (d?.sicak_dokunulmayan ?? []).map(item => ({
        ...item,
        temsilci: resolveDisplayAd(cfg.temsilciler, item.temsilci ?? ''),
      }))

  const filtrelenmis = !isBireysel && temsilciFilter
    ? sicakListesi.filter(item => {
        const a = item.temsilci?.toLowerCase().replace(/ü/g, 'u').replace(/ı/g, 'i') ?? ''
        const b = resolveDisplayAd(cfg.temsilciler, temsilciFilter).toLowerCase().replace(/ü/g, 'u').replace(/ı/g, 'i')
        return a === b
      })
    : sicakListesi

  const oneriKalemSayisi = isEmlak ? BUGUNUN_HAMLELERI.filter(h => h.sicaklik === 'hot').length : 3
  const uyariKalemSayisi = isEmlak ? BUGUNUN_HAMLELERI.filter(h => h.sicaklik === 'cold').length : 2

  const heroStats: Array<{ n: string; l: string; Icon: React.ElementType }> = [
    { n: oneriKalemSayisi.toString(), l: t('dash.suggestionLabel'),  Icon: MessageCircle },
    { n: uyariKalemSayisi.toString(), l: t('dash.warningLabel'),     Icon: Bell          },
    { n: fmt(sicakKpi, locale),       l: t('dash.opportunityLabel'), Icon: TrendingUp     },
  ]

  const kisaYollar: Array<{ Icon: React.ElementType; label: string }> = [
    { Icon: FileText,      label: t('dash.createNewOffer')  },
    { Icon: UserPlus,      label: t('dash.addCustomer')     },
    { Icon: Upload,        label: t('dash.uploadDocument')  },
    { Icon: Bell,          label: t('dash.createReminder')  },
    { Icon: ClipboardList, label: t('dash.createReport')    },
  ]

  const heroBg = isEmlak
    ? `linear-gradient(105deg, ${E.green1} 0%, ${E.green2} 55%, ${E.green3} 100%)`
    : `linear-gradient(105deg, ${C.navy} 0%, #092A4E 47%, ${C.violet} 100%)`

  const heroAvatarShadow = isEmlak
    ? '0 0 0 4px rgba(46,157,94,0.45), 0 0 0 8px rgba(27,122,71,0.2)'
    : '0 0 0 4px rgba(188,168,255,0.5), 0 0 0 8px rgba(91,56,232,0.2)'

  return (
    <div className="max-w-7xl mx-auto space-y-5" style={{ color: isEmlak ? E.text : C.text }}>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section
        className="relative h-[150px] rounded-[22px] overflow-hidden text-white flex items-center justify-between px-[22px] shadow-sm"
        style={{ background: heroBg }}
      >
        {/* Dekoratif halkalar */}
        <div className="absolute right-[-68px] top-[-120px] h-[390px] w-[390px] rounded-full border border-white/15 pointer-events-none" />
        <div className="absolute right-[74px] top-[13px] h-[240px] w-[240px] rounded-full border border-white/12 pointer-events-none" />
        <div className="absolute right-[160px] top-[63px] h-[100px] w-[100px] rounded-full border border-white/10 pointer-events-none" />

        {/* SOL: avatar + metin */}
        <div className="relative flex items-center gap-[28px]">
          <Image
            src="/ali-avatar.png"
            alt="Ali"
            width={110}
            height={110}
            className="rounded-full object-cover shrink-0"
            style={{ boxShadow: heroAvatarShadow }}
            priority
          />
          <div>
            <h2 className="text-[19px] font-black tracking-[-0.01em]">
              {t('dash.aliWorkedTitle')}
            </h2>
            <p className="mt-[5px] text-[15px] text-white/90">
              {t('dash.dontMissPrefix')}{' '}
              <span className="font-black">{isEmlak ? BUGUNUN_HAMLELERI.length : fmt(sicakKpi, locale)}</span>{t('dash.dontMissSuffix')}
            </p>
            <button
              disabled
              className="mt-[14px] h-[34px] rounded-[10px] border border-white/25 bg-white/5 px-[18px] text-[13px] font-bold cursor-not-allowed"
            >
              💬 {t('dash.chatWithAli')}
            </button>
          </div>
        </div>

        {/* SAĞ: 3 istatistik */}
        <div className="relative flex items-center gap-[34px] pr-[26px] shrink-0 max-sm:hidden">
          {heroStats.map(({ n, l, Icon }, i) => (
            <div
              key={l}
              className={`flex items-center gap-[12px] ${i > 0 ? 'border-l border-white/18 pl-[30px]' : ''}`}
            >
              <Icon size={22} className="text-pink-300" />
              <div>
                <div className="text-[26px] font-black leading-none">{n}</div>
                <div className="mt-[4px] text-[13px] text-white/85">{l}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Örnek veri banner (bireysel segment) ──────────── */}
      {isBireysel && (
        <div className="flex items-center gap-[10px] rounded-[12px] border border-amber-200 bg-amber-50 px-[16px] py-[10px]">
          <span className="text-[13px] font-bold text-amber-700">{t('dash.sampleData')}</span>
          <span className="text-[12px] text-amber-600 flex-1">
            {t('dash.sampleDataDesc')}
          </span>
        </div>
      )}

      {/* ── 2-KOLON LAYOUT ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_288px] gap-5">

        {/* ── SOL KOLON ──────────────────────────────────────── */}
        <div className="space-y-5 min-w-0">

          {/* KPI 4'lü Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-[14px]">
            <KpiCard icon={Building2}     tone="chart"  label={isEmlak ? t('dash.activeCustomers') : t('dash.totalPortfolio')}   value={fmt(portfoyToplam, locale)} sub={portfoySub} t={t} />
            <KpiCard icon={Flame}         tone="red"    label={isEmlak ? t('dash.highInterestScore') : t('dash.hotOpportunities')} value={fmt(sicakKpi, locale)} sub={isEmlak ? t('dash.scoreGte7Customers') : t('dash.scoreGte7Companies')} t={t} />
            <KpiCard icon={MessageCircle} tone="violet" label={t('dash.awaitingResponse')}   value={fmt(counts.yanitBekleyen, locale)} sub={isEmlak ? t('dash.awaitingAppointment') : t('dash.pipelineResponseReceived')} t={t} />
            <KpiCard icon={Wallet}        tone="bordo"  label={isEmlak ? t('dash.thisMonthGain') : t('dash.thisMonthCommission')}    yakinda t={t} />
          </div>

          {/* ── PANEL: Bugünün Hamleleri (emlak-only) ──────────── */}
          {isEmlak && (
            <section>
              <div className="flex items-center justify-between mb-[14px]">
                <div className="flex items-center gap-[10px]">
                  <div
                    className="h-[34px] w-[34px] rounded-full grid place-items-center"
                    style={{ background: `linear-gradient(135deg, ${E.green1}, ${E.green2})` }}
                  >
                    <Home size={16} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-[17px] font-black" style={{ color: E.text }}>{t('dash.panelHeading')}</h2>
                    <p className="text-[11px] text-slate-400">{t('dash.todaysMoves')}</p>
                  </div>
                  <span
                    className="ml-[6px] rounded-full px-[10px] py-[3px] text-[11px] font-bold"
                    style={{ background: E.surface, color: E.green2 }}
                  >
                    {t('dash.movesCount').replace('{n}', String(BUGUNUN_HAMLELERI.length))}
                  </span>
                </div>
                <Link
                  href="/satis-sureci"
                  className="text-[12px] font-bold"
                  style={{ color: E.green2 }}
                >
                  {t('dash.salesProcess')} →
                </Link>
              </div>
              <div className="space-y-[10px]">
                {BUGUNUN_HAMLELERI.map(item => (
                  <MoveCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}

          {/* ── Emlak: Ali Öneriyor + Uyarılar (tile versiyonu) ─── */}
          {isEmlak && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px]">
              <section className="rounded-[22px] border bg-white p-[18px] shadow-sm" style={{ borderColor: E.line }}>
                <div className="flex items-center gap-[8px] mb-[14px]">
                  <Lightbulb size={18} style={{ color: E.green2 }} />
                  <h3 className="text-[16px] font-black" style={{ color: E.text }}>{t('dash.aliSuggests')}</h3>
                  <span className="ml-auto rounded-full px-[10px] py-[3px] text-[11px] font-bold" style={{ background: E.surface, color: E.green2 }}>
                    {t('dash.suggestionsCount').replace('{n}', String(oneriKalemSayisi))}
                  </span>
                </div>
                <div className="space-y-[8px]">
                  <InsightTile icon={Home}       label={t('dash.stockUpdate')}       description={t('dash.stockUpdateDesc')}  count={2} href="/stok" />
                  <InsightTile icon={MapPin}      label={t('dash.regionalOpportunity')}        description={t('dash.regionalOpportunityDesc')} count={1} />
                  <InsightTile icon={TrendingUp}  label={t('dash.priceRevision')}  description={t('dash.priceRevisionDesc')} count={3} />
                </div>
              </section>
              <section className="rounded-[22px] border bg-white p-[18px] shadow-sm" style={{ borderColor: E.line }}>
                <div className="flex items-center gap-[8px] mb-[14px]">
                  <AlertTriangle size={18} style={{ color: E.coral }} />
                  <h3 className="text-[16px] font-black" style={{ color: E.text }}>{t('dash.aliWarnings')}</h3>
                  <span className="ml-auto rounded-full px-[10px] py-[3px] text-[11px] font-bold" style={{ background: '#FFF0EC', color: E.coral }}>
                    {t('dash.warningsCount').replace('{n}', String(uyariKalemSayisi))}
                  </span>
                </div>
                <div className="space-y-[8px]">
                  <InsightTile icon={CalendarClock} label={t('dash.customersAwaiting').replace('{n}', fmt(counts.yanitBekleyen, locale))} description={t('dash.customersAwaitingDesc')}  count={counts.yanitBekleyen} />
                  <InsightTile icon={Users}          label={t('dash.coldCustomers')}                                      description={t('dash.coldCustomersDesc')} count={uyariKalemSayisi} />
                </div>
              </section>
            </div>
          )}

          {/* Ali Öneriyor + Uyarılar (sigorta) */}
          {!isEmlak && <div id="ali-oneriyor" className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-[14px]">

            <section className="rounded-[15px] border bg-white p-[18px] shadow-sm" style={{ borderColor: C.line }}>
              <div className="mb-[15px] flex items-center gap-[8px]">
                <Lightbulb size={19} style={{ color: C.violet }} />
                <h3 className="text-[17px] font-black" style={{ color: C.text }}>{t('dash.aliSuggests')}</h3>
                <span
                  className="ml-[8px] rounded-full px-[11px] py-[4px] text-[11px] font-bold"
                  style={{ background: C.lavender, color: C.violet }}
                >
                  {t('dash.newSuggestionsCount').replace('{n}', String(oneriKalemSayisi))}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-[13px]">
                <InsightCard
                  icon={Clock3}
                  count={counts.yenilemeriski}
                  label={t('dash.renewalRisk')}
                  description={t('dash.renewalRiskDesc')}
                  hrefYakinda
                  t={t} locale={locale}
                />
                <InsightCard
                  icon={Heart}
                  count={counts.crossSellUygun}
                  label={t('dash.crossSell')}
                  description={t('dash.crossSellDesc')}
                  hrefYakinda
                  t={t} locale={locale}
                />
                <InsightCard
                  icon={Bell}
                  count={counts.teklifSessiz}
                  label={t('dash.offerSilent')}
                  description={t('dash.offerSilentDesc')}
                  href="/satis-sureci"
                  t={t} locale={locale}
                />
                <InsightCard
                  icon={Gift}
                  label={t('dash.seasonalCampaign')}
                  description={t('dash.seasonalCampaignDesc')}
                  yakinda
                  t={t} locale={locale}
                />
              </div>
            </section>

            <section className="rounded-[15px] border bg-white p-[18px] shadow-sm" style={{ borderColor: C.line }}>
              <div className="mb-[15px] flex items-center justify-between">
                <div className="flex items-center gap-[8px]">
                  <AlertTriangle size={19} className="text-red-500" />
                  <h3 className="text-[17px] font-black" style={{ color: C.text }}>{t('dash.aliWarnings')}</h3>
                </div>
                <span
                  className="rounded-full px-[11px] py-[4px] text-[11px] font-bold"
                  style={{ background: '#FFF0F3', color: '#FF445F' }}
                >
                  {t('dash.warningsCount').replace('{n}', String(uyariKalemSayisi))}
                </span>
              </div>
              <InsightRow
                icon={Users}
                label={t('dash.companiesSilent30').replace('{n}', fmt(counts.sessizlesenler, locale))}
                count={counts.sessizlesenler}
                iconColor="#FF445F"
                locale={locale}
              />
              <InsightRow
                icon={CalendarClock}
                label={t('dash.companiesRenewalRisk').replace('{n}', fmt(counts.yenilemeriski, locale))}
                count={counts.yenilemeriski}
                iconColor="#DC2626"
                locale={locale}
              />
              <div
                className="flex items-center gap-[13px] py-[13px]"
                style={{ borderTop: `1px solid ${C.line}` }}
              >
                <div className="h-[42px] w-[42px] rounded-full bg-gray-50 grid place-items-center shrink-0">
                  <ClipboardList size={18} className="text-gray-400" />
                </div>
                <p className="flex-1 text-[13px] font-black text-gray-400">{t('dash.missingDocTracking')}</p>
                <span className="rounded-full bg-gray-100 px-[10px] py-[4px] text-[11px] font-medium text-gray-400">
                  {t('dash.comingSoon')}
                </span>
              </div>
            </section>
          </div>}

          {/* Portföy + Vade (sigorta-özel) */}
          {cfg.modules.portfoy && <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
            <DonutChart
              saglik={d?.brans_dagilimi.saglik ?? 0}
              elementer={d?.brans_dagilimi.elementer ?? 0}
              acibadem={d?.brans_dagilimi.acibadem ?? 0}
              toplam={d?.firma_toplam ?? 0}
              t={t} locale={locale}
            />
            <div className="rounded-[15px] border bg-white p-[18px] shadow-sm" style={{ borderColor: C.line }}>
              <p className="font-black text-[15px] mb-[16px]" style={{ color: C.text }}>
                {t('dash.upcomingRenewals')}
              </p>
              {d ? (
                <>
                  <VadeRow label={`${t('dash.thisMonth')} (${d.vade_takvimi.bu_ay.ay})`} sayi={d.vade_takvimi.bu_ay.sayi} hot={d.vade_takvimi.bu_ay.hot} temsilciSayilari={showTeam ? vadeSayilari(d.vade_takvimi.bu_ay, cfg) : undefined} showTemsilci={showTeam} t={t} locale={locale} />
                  <VadeRow label={t('dash.within30Days')} sayi={d.vade_takvimi.vade_30.sayi} hot={d.vade_takvimi.vade_30.hot} temsilciSayilari={showTeam ? vadeSayilari(d.vade_takvimi.vade_30, cfg) : undefined} showTemsilci={showTeam} t={t} locale={locale} />
                  <VadeRow label={t('dash.within60Days')} sayi={d.vade_takvimi.vade_60.sayi} hot={d.vade_takvimi.vade_60.hot} temsilciSayilari={showTeam ? vadeSayilari(d.vade_takvimi.vade_60, cfg) : undefined} showTemsilci={showTeam} t={t} locale={locale} />
                  <VadeRow label={t('dash.within90Days')} sayi={d.vade_takvimi.vade_90.sayi} hot={d.vade_takvimi.vade_90.hot} temsilciSayilari={showTeam ? vadeSayilari(d.vade_takvimi.vade_90, cfg) : undefined} showTemsilci={showTeam} t={t} locale={locale} />
                </>
              ) : (
                <p className="text-[13px] text-gray-400 py-6 text-center">{t('dash.dataUnavailable')}</p>
              )}
            </div>
          </div>}

          {/* Sıcak Fırsatlar */}
          {filtrelenmis.length > 0 && (
            <div className="rounded-[15px] border bg-white p-[18px] shadow-sm" style={{ borderColor: C.line }}>
              <div className="flex items-center justify-between mb-[15px]">
                <p className="font-black text-[15px]" style={{ color: C.text }}>{t('dash.hotOpportunities')}</p>
                <Link href="/musteriler" className="text-[13px] font-bold" style={{ color: C.bordo }}>
                  {t('dash.viewAll')} →
                </Link>
              </div>
              {filtrelenmis.slice(0, 8).map((item, i) => (
                <SicakFirmaRow key={i} firma={item.firma} skor={item.skor} temsilci={item.temsilci} />
              ))}
            </div>
          )}

          {/* Son Aktiviteler */}
          <div className="rounded-[15px] border bg-white p-[18px] shadow-sm" style={{ borderColor: C.line }}>
            <p className="font-black text-[15px] mb-[14px]" style={{ color: C.text }}>{t('dash.recentActivities')}</p>
            <p className="text-[13px] text-slate-500 py-4 text-center">{t('dash.noActivityYet')}</p>
          </div>

        </div>

        {/* ── SAĞ RAIL ────────────────────────────────────────── */}
        <div className="space-y-[15px]">

          {/* Ali Asistan Kartı */}
          <section
            className="rounded-[18px] border bg-white p-[18px] shadow-sm"
            style={{ borderColor: C.line }}
          >
            <div className="text-[11px] tracking-[.17em] font-black" style={{ color: C.bordo }}>
              {t('dash.aliYourAssistantCaps')}
            </div>
            <h2 className="mt-[8px] text-[30px] font-black leading-none" style={{ color: C.text }}>Ali</h2>
            <div className="mt-[18px] flex justify-center">
              <div className="relative">
                <div
                  className="absolute inset-[-8px] rounded-full blur-xl opacity-40 pointer-events-none"
                  style={{ background: `linear-gradient(135deg, ${C.violet}, ${C.pink})` }}
                />
                <Image
                  src="/ali-avatar.png"
                  alt="Ali"
                  width={126}
                  height={126}
                  className="relative z-10 rounded-full object-cover"
                  style={{
                    boxShadow: `0 0 0 4px rgba(91,56,232,0.2), 0 0 0 8px rgba(91,56,232,0.08)`,
                  }}
                />
              </div>
            </div>
            <div className="mt-[18px]">
              <div
                className="inline-flex items-center gap-[8px] rounded-full px-[12px] py-[6px] text-[13px] font-bold text-white"
                style={{ background: C.navy }}
              >
                <span className="h-[8px] w-[8px] rounded-full bg-emerald-400" />
                {t('dash.online')}
              </div>
            </div>
            <p className="mt-[16px] text-[14px] leading-[22px] text-slate-600">
              {d
                ? t('dash.aliDetected').replace('{hot}', fmt(sicakKpi, locale)).replace('{silent}', fmt(counts.sessizlesenler, locale))
                : t('dash.portfolioAnalysisPending')}
            </p>
            <button
              disabled
              className="mt-[18px] h-[42px] w-full rounded-[12px] text-[14px] font-black text-white cursor-not-allowed opacity-80"
              style={{ background: C.bordo }}
            >
              {t('dash.chatWithAli')} →
            </button>
          </section>

          {/* Hızlı Filtreler */}
          <section
            className="rounded-[18px] border bg-white p-[18px] shadow-sm"
            style={{ borderColor: C.line }}
          >
            <p className="font-black text-[15px] mb-[17px]" style={{ color: C.text }}>{t('dash.quickFilters')}</p>
            <div className="space-y-[10px]">
              <HizliYolCard href="/musteriler?oncelik=Y%C3%BCksek" icon={Flame}         label={t('dash.hotCompanies')}  count={sicakKpi}                    countColor="#FF445F" t={t} locale={locale} />
              <HizliYolCard href="/musteriler?bugun=true"          icon={PhoneCall}     label={t('dash.toCallToday')}  count={counts.bugunAranacak}         countColor={C.violet} t={t} locale={locale} />
              <HizliYolCard href="/musteriler"                     icon={CalendarDays}  label={t('dash.dueSoon')} count={d?.vade_takvimi.vade_30.sayi} countColor={C.violet} noLink t={t} locale={locale} />
              <HizliYolCard href="/musteriler"                     icon={AlertTriangle} label={t('dash.riskyCompanies')} count={counts.yenilemeriski}         countColor="#DC2626"  noLink t={t} locale={locale} />
            </div>
          </section>

          {/* Kısa Yollar */}
          <section
            className="rounded-[18px] border bg-white p-[18px] shadow-sm"
            style={{ borderColor: C.line }}
          >
            <p className="font-black text-[15px] mb-[17px]" style={{ color: C.text }}>{t('dash.shortcuts')}</p>
            <div className="space-y-[17px]">
              {kisaYollar.map(({ Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-[12px] text-[14px] text-slate-500 cursor-not-allowed opacity-60"
                >
                  <Icon size={18} />
                  {label}
                </div>
              ))}
            </div>
          </section>

          {/* sigortan.ai marka kartı */}
          <section
            className="h-[164px] rounded-[18px] p-[22px] text-white overflow-hidden relative"
            style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.bordo})` }}
          >
            <div className="absolute right-[-64px] bottom-[-76px] h-[210px] w-[210px] rounded-full border border-white/18 pointer-events-none" />
            <div className="relative">
              <div className="text-[22px] font-[900] tracking-[-0.045em] leading-none text-white">
                alisales<span style={{ color: C.pink }}>.ai</span>
              </div>
              <div
                className="mt-[2px] h-[3px] rounded-full"
                style={{
                  marginLeft: '108px',
                  width: '26px',
                  background: 'rgba(255,255,255,0.45)',
                }}
              />
              <p className="mt-[24px] text-[15px] leading-[22px] text-white/90">
                {t('dash.brandTagline')}
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
