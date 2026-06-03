import { getBrifing } from '@/lib/brifing'
import { getDashboardCounts } from '@/lib/airtable'
import { getKullanicıProfili, izolasyonBelirle, getTenantConfig } from '@/lib/yetki'
import { type TenantConfig } from '@/lib/tenants'
import { redirect } from 'next/navigation'
import {
  Clock3, Heart, Bell, Gift,
  MessageCircle, TrendingUp,
  Users, ClipboardList, CalendarClock, AlertTriangle, Lightbulb,
  Building2, Flame, Wallet, PhoneCall, CalendarDays,
  ArrowRight, FileText, UserPlus, Upload,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

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

function fmt(n: number | undefined) {
  return n?.toLocaleString('tr-TR') ?? '—'
}

// ── KPI Card ──────────────────────────────────────────────────────
function KpiCard({
  icon: Icon, tone, label, value, sub, yakinda = false,
}: {
  icon: React.ElementType
  tone: 'chart' | 'red' | 'violet' | 'bordo'
  label: string; value?: string | number; sub?: string; yakinda?: boolean
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
            Yakında
          </span>
        )}
      </div>
    </div>
  )
}

// ── Insight / Suggestion Card ────────────────────────────────────
function InsightCard({
  icon: Icon, count, label, description, yakinda = false, href, hrefYakinda = false,
}: {
  icon: React.ElementType; count?: number; label: string; description: string
  yakinda?: boolean; href?: string; hrefYakinda?: boolean
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
            Yakında
          </span>
        </div>
      ) : (
        <p className="mt-3 text-[28px] leading-none font-black" style={{ color: C.text }}>
          {fmt(count)}
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
          Detayları gör →
        </Link>
      )}
      {!yakinda && hrefYakinda && (
        <span
          title="Filtreli görünüm geliyor"
          className="mt-3 inline-flex items-center h-[30px] rounded-[8px] border bg-white px-[11px] text-[12px] font-bold self-start opacity-40 cursor-not-allowed pointer-events-none"
          style={{ borderColor: C.line, color: '#94A3B8' }}
        >
          Detayları gör →
        </span>
      )}
    </div>
  )
}

// ── Donut Chart ──────────────────────────────────────────────────
function DonutChart({
  saglik, elementer, acibadem, toplam,
}: {
  saglik: number; elementer: number; acibadem: number; toplam: number
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
        Portföy Dağılımı
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
              <div className="text-[22px] font-black" style={{ color: C.text }}>{fmt(toplam)}</div>
              <div className="text-[13px] leading-tight text-slate-500">Toplam<br />firma</div>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-[11px]">
          {[
            { label: 'Sağlık',    val: saglik,   pct: s, color: C.bordo   },
            { label: 'Elementer', val: elementer, pct: e, color: C.violet  },
            { label: 'Acıbadem',  val: acibadem,  pct: a, color: '#C95B92' },
          ].map(({ label, val, pct, color }) => (
            <div key={label} className="grid grid-cols-[1fr_58px_42px] items-center text-[13px]">
              <div className="flex items-center gap-[10px]">
                <span className="h-[9px] w-[9px] rounded-full shrink-0" style={{ background: color }} />
                <span className="font-semibold text-slate-700">{label}</span>
              </div>
              <div className="text-right font-black" style={{ color: C.text }}>{fmt(val)}</div>
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
  label, sayi, hot, temsilciSayilari, showTemsilci,
}: {
  label: string; sayi: number; hot: number
  temsilciSayilari?: { ad: string; sayi: number }[]
  showTemsilci: boolean
}) {
  return (
    <div className="py-[13px] border-b last:border-0" style={{ borderColor: C.line }}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-slate-600">{label}</span>
        <div className="flex items-center gap-[10px]">
          <b className="text-[13px] font-black" style={{ color: C.text }}>{fmt(sayi)}</b>
          <span className="rounded-full bg-violet-600 px-[10px] py-[4px] text-[11px] font-bold text-white">
            {hot} sıcak
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
  icon: Icon, label, count, iconColor,
}: {
  icon: React.ElementType; label: string; count: number; iconColor: string
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
        {fmt(count)}
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
  href, icon: Icon, label, count, countColor, yakinda = false, noLink = false,
}: {
  href: string; icon: React.ElementType; label: string
  count?: number; countColor?: string; yakinda?: boolean; noLink?: boolean
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
        <span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">Yakında</span>
      ) : count !== undefined ? (
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: noLink ? '#94A3B8' : (countColor ?? C.violet) }}
        >
          {fmt(count)}
        </span>
      ) : (
        <ArrowRight size={13} className="text-gray-300" />
      )}
    </div>
  )
  return isDisabled ? <div title={yakinda ? 'Yakında' : 'Filtre desteği geliyor'}>{inner}</div> : <Link href={href}>{inner}</Link>
}

// ══════════════════════════════════════════════════════════════════
//  SAYFA
// ══════════════════════════════════════════════════════════════════
export default async function DashboardPage() {
  const profil = await getKullanicıProfili()
  if (!profil) redirect('/login')

  const cfg = getTenantConfig(profil)
  const izolasyon = izolasyonBelirle(profil)
  const temsilciFilter = izolasyon.tip === 'temsilci' ? izolasyon.ad : undefined
  const showTeam = izolasyon.tip !== 'temsilci'

  const [d, counts] = await Promise.all([
    getBrifing(cfg),
    getDashboardCounts(temsilciFilter, cfg),
  ])

  // Portföy KPI — izolasyonlu
  let portfoyToplam: number
  let portfoySub: string | undefined
  if (!d) {
    portfoyToplam = 0
  } else if (showTeam) {
    portfoyToplam = d.firma_toplam
    portfoySub = cfg.temsilciler
      .map(t => `${t.ad}: ${fmt(d.temsilci[t.slug]?.toplam_portfoy ?? 0)}`)
      .join(' · ')
  } else {
    const t = temsilciFilter
      ? cfg.temsilciler.find(x => x.ad === temsilciFilter)
      : null
    portfoyToplam = t ? (d.temsilci[t.slug]?.toplam_portfoy ?? 0) : d.firma_toplam
  }

  // Sıcak KPI — izolasyonlu
  let sicakKpi = 0
  if (d) {
    if (!showTeam && temsilciFilter) {
      const t = cfg.temsilciler.find(x => x.ad === temsilciFilter)
      sicakKpi = t ? (d.temsilci[t.slug]?.hot ?? d.sicak_firsatlar) : d.sicak_firsatlar
    } else {
      sicakKpi = d.sicak_firsatlar
    }
  }

  // Sıcak firma listesi — izolasyonlu
  const sicakListesi = d?.sicak_dokunulmayan ?? []
  const filtrelenmis = temsilciFilter
    ? sicakListesi.filter(item => {
        const a = item.temsilci?.toLowerCase().replace(/ü/g, 'u') ?? ''
        return a === temsilciFilter.toLowerCase().replace(/ü/g, 'u')
      })
    : sicakListesi

  const oneriKalemSayisi = 3
  const uyariKalemSayisi = 2

  const heroStats: Array<{ n: string; l: string; Icon: React.ElementType }> = [
    { n: oneriKalemSayisi.toString(), l: 'Öneri',  Icon: MessageCircle },
    { n: uyariKalemSayisi.toString(), l: 'Uyarı',  Icon: Bell          },
    { n: fmt(sicakKpi),               l: 'Fırsat', Icon: TrendingUp     },
  ]

  const kisaYollar: Array<{ Icon: React.ElementType; label: string }> = [
    { Icon: FileText,      label: 'Yeni Teklif Oluştur'  },
    { Icon: UserPlus,      label: 'Müşteri Ekle'          },
    { Icon: Upload,        label: 'Belge Yükle'           },
    { Icon: Bell,          label: 'Hatırlatma Oluştur'   },
    { Icon: ClipboardList, label: 'Rapor Oluştur'         },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-5" style={{ color: C.text }}>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section
        className="relative h-[150px] rounded-[16px] overflow-hidden text-white flex items-center justify-between px-[22px] shadow-sm"
        style={{ background: `linear-gradient(105deg, ${C.navy} 0%, #092A4E 47%, ${C.violet} 100%)` }}
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
            style={{ boxShadow: '0 0 0 4px rgba(188,168,255,0.5), 0 0 0 8px rgba(91,56,232,0.2)' }}
            priority
          />
          <div>
            <h2 className="text-[19px] font-black tracking-[-0.01em]">
              Ali bugün senin için çalıştı.
            </h2>
            <p className="mt-[5px] text-[15px] text-white/90">
              Kaçırmaman gereken{' '}
              <span className="font-black">{fmt(sicakKpi)}</span> kritik gelişme var.
            </p>
            <button
              disabled
              className="mt-[14px] h-[34px] rounded-[10px] border border-white/25 bg-white/5 px-[18px] text-[13px] font-bold cursor-not-allowed"
            >
              💬 Ali ile sohbet et
            </button>
          </div>
        </div>

        {/* SAĞ: 3 istatistik */}
        <div className="relative flex items-center gap-[34px] pr-[26px] shrink-0">
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

      {/* ── 2-KOLON LAYOUT ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_288px] gap-5">

        {/* ── SOL KOLON ──────────────────────────────────────── */}
        <div className="space-y-5 min-w-0">

          {/* KPI 4'lü Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-[14px]">
            <KpiCard icon={Building2}     tone="chart"  label="Toplam Portföy"  value={fmt(portfoyToplam)} sub={portfoySub} />
            <KpiCard icon={Flame}         tone="red"    label="Sıcak Fırsatlar" value={fmt(sicakKpi)}       sub="Skor ≥ 7 firma" />
            <KpiCard icon={MessageCircle} tone="violet" label="Yanıt Bekleyen"  value={fmt(counts.yanitBekleyen)} sub="Pipeline: Yanıt Alındı" />
            <KpiCard icon={Wallet}        tone="bordo"  label="Bu Ay Komisyon"  yakinda />
          </div>

          {/* Ali Öneriyor + Uyarılar */}
          <div id="ali-oneriyor" className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-[14px]">

            <section className="rounded-[15px] border bg-white p-[18px] shadow-sm" style={{ borderColor: C.line }}>
              <div className="mb-[15px] flex items-center gap-[8px]">
                <Lightbulb size={19} style={{ color: C.violet }} />
                <h3 className="text-[17px] font-black" style={{ color: C.text }}>Ali Öneriyor</h3>
                <span
                  className="ml-[8px] rounded-full px-[11px] py-[4px] text-[11px] font-bold"
                  style={{ background: C.lavender, color: C.violet }}
                >
                  {oneriKalemSayisi} yeni öneri
                </span>
              </div>
              <div className="grid grid-cols-2 gap-[13px]">
                <InsightCard
                  icon={Clock3}
                  count={counts.yenilemeriski}
                  label="Yenileme Riski"
                  description="30 gün içinde vadesi dolan, skor < 5"
                  hrefYakinda
                />
                <InsightCard
                  icon={Heart}
                  count={counts.crossSellUygun}
                  label="Çapraz Satış"
                  description="Cross-sell fırsatı işaretlenmiş"
                  hrefYakinda
                />
                <InsightCard
                  icon={Bell}
                  count={counts.teklifSessiz}
                  label="Teklif Sessiz"
                  description="14+ gün iletişim yok, Teklif aşaması"
                  href="/satis-sureci"
                />
                <InsightCard
                  icon={Gift}
                  label="Sezonsal Kampanya"
                  description="Allianz & diğer kampanya önerileri"
                  yakinda
                />
              </div>
            </section>

            <section className="rounded-[15px] border bg-white p-[18px] shadow-sm" style={{ borderColor: C.line }}>
              <div className="mb-[15px] flex items-center justify-between">
                <div className="flex items-center gap-[8px]">
                  <AlertTriangle size={19} className="text-red-500" />
                  <h3 className="text-[17px] font-black" style={{ color: C.text }}>Ali Uyarılar</h3>
                </div>
                <span
                  className="rounded-full px-[11px] py-[4px] text-[11px] font-bold"
                  style={{ background: '#FFF0F3', color: '#FF445F' }}
                >
                  {uyariKalemSayisi} uyarı
                </span>
              </div>
              <InsightRow
                icon={Users}
                label={`${fmt(counts.sessizlesenler)} firma 30+ gün sessiz`}
                count={counts.sessizlesenler}
                iconColor="#FF445F"
              />
              <InsightRow
                icon={CalendarClock}
                label={`${fmt(counts.yenilemeriski)} firma yenileme riskinde`}
                count={counts.yenilemeriski}
                iconColor="#DC2626"
              />
              <div
                className="flex items-center gap-[13px] py-[13px]"
                style={{ borderTop: `1px solid ${C.line}` }}
              >
                <div className="h-[42px] w-[42px] rounded-full bg-gray-50 grid place-items-center shrink-0">
                  <ClipboardList size={18} className="text-gray-400" />
                </div>
                <p className="flex-1 text-[13px] font-black text-gray-400">Eksik belge takibi</p>
                <span className="rounded-full bg-gray-100 px-[10px] py-[4px] text-[11px] font-medium text-gray-400">
                  Yakında
                </span>
              </div>
            </section>
          </div>

          {/* Portföy + Vade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
            <DonutChart
              saglik={d?.brans_dagilimi.saglik ?? 0}
              elementer={d?.brans_dagilimi.elementer ?? 0}
              acibadem={d?.brans_dagilimi.acibadem ?? 0}
              toplam={d?.firma_toplam ?? 0}
            />
            <div className="rounded-[15px] border bg-white p-[18px] shadow-sm" style={{ borderColor: C.line }}>
              <p className="font-black text-[15px] mb-[16px]" style={{ color: C.text }}>
                Yaklaşan Yenilemeler
              </p>
              {d ? (
                <>
                  <VadeRow label={`Bu ay (${d.vade_takvimi.bu_ay.ay})`} sayi={d.vade_takvimi.bu_ay.sayi} hot={d.vade_takvimi.bu_ay.hot} temsilciSayilari={showTeam ? vadeSayilari(d.vade_takvimi.bu_ay, cfg) : undefined} showTemsilci={showTeam} />
                  <VadeRow label="30 gün içinde" sayi={d.vade_takvimi.vade_30.sayi} hot={d.vade_takvimi.vade_30.hot} temsilciSayilari={showTeam ? vadeSayilari(d.vade_takvimi.vade_30, cfg) : undefined} showTemsilci={showTeam} />
                  <VadeRow label="60 gün içinde" sayi={d.vade_takvimi.vade_60.sayi} hot={d.vade_takvimi.vade_60.hot} temsilciSayilari={showTeam ? vadeSayilari(d.vade_takvimi.vade_60, cfg) : undefined} showTemsilci={showTeam} />
                  <VadeRow label="90 gün içinde" sayi={d.vade_takvimi.vade_90.sayi} hot={d.vade_takvimi.vade_90.hot} temsilciSayilari={showTeam ? vadeSayilari(d.vade_takvimi.vade_90, cfg) : undefined} showTemsilci={showTeam} />
                </>
              ) : (
                <p className="text-[13px] text-gray-400 py-6 text-center">Veri alınamadı</p>
              )}
            </div>
          </div>

          {/* Sıcak Fırsatlar */}
          {filtrelenmis.length > 0 && (
            <div className="rounded-[15px] border bg-white p-[18px] shadow-sm" style={{ borderColor: C.line }}>
              <div className="flex items-center justify-between mb-[15px]">
                <p className="font-black text-[15px]" style={{ color: C.text }}>Sıcak Fırsatlar</p>
                <Link href="/musteriler" className="text-[13px] font-bold" style={{ color: C.bordo }}>
                  Tümünü gör →
                </Link>
              </div>
              {filtrelenmis.slice(0, 8).map((item, i) => (
                <SicakFirmaRow key={i} firma={item.firma} skor={item.skor} temsilci={item.temsilci} />
              ))}
            </div>
          )}

          {/* Son Aktiviteler */}
          <div className="rounded-[15px] border bg-white p-[18px] shadow-sm" style={{ borderColor: C.line }}>
            <p className="font-black text-[15px] mb-[14px]" style={{ color: C.text }}>Son Aktiviteler</p>
            <p className="text-[13px] text-slate-500 py-4 text-center">Henüz aktivite yok</p>
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
              ALİ ASİSTANIN
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
                Çevrimiçi
              </div>
            </div>
            <p className="mt-[16px] text-[14px] leading-[22px] text-slate-600">
              {d
                ? `${fmt(sicakKpi)} sıcak fırsat ve ${fmt(counts.sessizlesenler)} sessizleşen firma tespit ettim.`
                : 'Portföy analizi bekleniyor.'}
            </p>
            <button
              disabled
              className="mt-[18px] h-[42px] w-full rounded-[12px] text-[14px] font-black text-white cursor-not-allowed opacity-80"
              style={{ background: C.bordo }}
            >
              Ali ile sohbet et →
            </button>
          </section>

          {/* Hızlı Filtreler */}
          <section
            className="rounded-[18px] border bg-white p-[18px] shadow-sm"
            style={{ borderColor: C.line }}
          >
            <p className="font-black text-[15px] mb-[17px]" style={{ color: C.text }}>Hızlı Filtreler</p>
            <div className="space-y-[10px]">
              <HizliYolCard href="/musteriler?oncelik=Y%C3%BCksek" icon={Flame}         label="Sıcak Firmalar"  count={sicakKpi}                    countColor="#FF445F" />
              <HizliYolCard href="/musteriler?bugun=true"          icon={PhoneCall}     label="Bugün Aranacak"  count={counts.bugunAranacak}         countColor={C.violet} />
              <HizliYolCard href="/musteriler"                     icon={CalendarDays}  label="Vadesi Yaklaşan" count={d?.vade_takvimi.vade_30.sayi} countColor={C.violet} noLink />
              <HizliYolCard href="/musteriler"                     icon={AlertTriangle} label="Riskli Firmalar" count={counts.yenilemeriski}         countColor="#DC2626"  noLink />
            </div>
          </section>

          {/* Kısa Yollar */}
          <section
            className="rounded-[18px] border bg-white p-[18px] shadow-sm"
            style={{ borderColor: C.line }}
          >
            <p className="font-black text-[15px] mb-[17px]" style={{ color: C.text }}>Kısa Yollar</p>
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
                Bağımsız sigortacılığın yeni nesli.
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
