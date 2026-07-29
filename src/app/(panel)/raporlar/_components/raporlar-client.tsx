'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LabelList,
} from 'recharts'
import { FileText, ExternalLink, Phone, CalendarCheck } from 'lucide-react'
import { type MusterilerIzin } from '@/lib/musteriler-izin'
import { type TemsilciAktivite } from '@/app/api/raporlar/bugun-aktivite/route'
import { useT } from '@/lib/i18n/context'
import { RaporModal } from './rapor-modal'
import { Bolum2Ekip } from './bolum2-ekip'
import { Bolum3Temsilci } from './bolum3-temsilci'

const AY_FULL_KEYS = [
  'rep.monFull0','rep.monFull1','rep.monFull2','rep.monFull3','rep.monFull4','rep.monFull5',
  'rep.monFull6','rep.monFull7','rep.monFull8','rep.monFull9','rep.monFull10','rep.monFull11',
] as const
const AY_SHORT_KEYS = [
  'rep.monShort0','rep.monShort1','rep.monShort2','rep.monShort3','rep.monShort4','rep.monShort5',
  'rep.monShort6','rep.monShort7','rep.monShort8','rep.monShort9','rep.monShort10','rep.monShort11',
] as const

// ── Bu Hafta Aktivite — mevcut mor palette korunuyor ─────────────────────────
const C_PRIMARY = '#5B47E0'

// ── Bölüm 1 renk paleti ───────────────────────────────────────────────────────
const BORDO        = '#8e2433'
const PALE_BORDO   = '#E5C8CE'

const TEAL = '#1D9E75'  // Sağlık veri rengi

const BRANS_COLORS: Record<string, string> = {
  'Sağlık':           TEAL,
  'Elementer':        '#F59E0B',
  'Acıbadem Ürünleri':'#E62164',
  'Diğer':            '#A78BFA',
}
const BRANS_FALLBACKS = [TEAL, '#F59E0B', '#E62164', '#A78BFA', '#5B38E8']

const SEKTOR_COLORS: Record<string, string> = {
  'Üretim & Sanayi':                    '#982A49',
  'Üretim':                             '#982A49',
  'Bilişim & Yazılım':                  '#5B38E8',
  'Bilişim':                            '#5B38E8',
  'Hizmet':                             TEAL,
  'Profesyonel Hizmet':                 TEAL,
  'İnşaat & Müteahhitlik':              '#F59E0B',
  'İnşaat':                             '#F59E0B',
  'Tekstil':                            '#E62164',
  'Lojistik & Nakliyat':               '#0EA5E9',
  'Gıda & İçecek':                     '#EA580C',
  'Otomotiv & Yan Sanayi':             '#4B1FB4',
  'Eğitim & Danışmanlık':              '#9333EA',
  'Finans & Sigorta':                   '#0284C7',
  'Sağlık Kuruluşu':                   '#059669',
  'Turizm & Konaklama':                '#E62164',
  'Perakende & E-ticaret':             '#FB923C',
  'Toptan Ticaret & İthalat-İhracat':  '#0284C7',
  'Reklam & Medya':                     '#A78BFA',
  'Diğer':                             '#A78BFA',
}
const SEKTOR_FALLBACKS = ['#982A49', '#5B38E8', TEAL, '#F59E0B', '#E62164', '#0EA5E9', '#EA580C', '#9333EA']

// Kanban board ile aynı renkler
const PIPELINE_RENK: Record<string, string> = {
  'Bilinmiyor':   '#C4B5FD',
  'Ulaşılamadı':  '#982A49',
  'Yanıt Alındı': '#5B38E8',
  'Randevu':      '#E62164',
  'Teklif':       '#4B1FB4',
  'Müzakere':     '#9333EA',
  'Kazanıldı':    '#982A49',
  'Kaybedildi':   '#FDA4AF',
}
const PIPELINE_BG: Record<string, string> = {
  'Bilinmiyor':   '#F5F3FF',
  'Ulaşılamadı':  '#FFF3F6',
  'Yanıt Alındı': '#F0EEFF',
  'Randevu':      '#FFF0F6',
  'Teklif':       '#EEE9FF',
  'Müzakere':     '#F5EEFF',
  'Kazanıldı':    '#FFF3F6',
  'Kaybedildi':   '#FFF1F2',
}
const PIPELINE_LABEL: Record<string, string> = {
  'Kazanıldı': 'rep.satisKazanim',
}

// ── Türkçe ay ─────────────────────────────────────────────────────────────────
const TR_AY = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
const TR_GUN = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi']
const BUGUN_AY_IDX = (new Date()).getMonth()

function isGecmisAy(ay: string): boolean {
  return TR_AY.indexOf(ay) < BUGUN_AY_IDX
}

// ── Sayı formatı ──────────────────────────────────────────────────────────────
function fmt(n: number): string {
  return n.toLocaleString('tr-TR')
}

// ── Hafta aralığı başlık ──────────────────────────────────────────────────────
function getWeekLabel(AY: string[]): string {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const mon = new Date(now)
  mon.setDate(now.getDate() + diffToMonday)
  if (mon.getMonth() === now.getMonth()) {
    return `${mon.getDate()}-${now.getDate()} ${AY[now.getMonth()]} ${now.getFullYear()}`
  }
  return `${mon.getDate()} ${AY[mon.getMonth()]} – ${now.getDate()} ${AY[now.getMonth()]} ${now.getFullYear()}`
}

// ── Tip tanımları ─────────────────────────────────────────────────────────────
interface PipelineItem { asama: string; sayi: number }
interface VadeItem     { ay: string; sayi: number }
interface BransItem    { ad: string; sayi: number }
interface SektorItem   { ad: string; sayi: number }
interface SicaklikData { hot: number; warm: number; cold: number }
interface TemsilciItem { temsilci: string; toplam: number; sicak: number }

interface GrafikData {
  toplam?:   number
  pipeline:  PipelineItem[]
  vade:      VadeItem[]
  brans:     BransItem[]
  sektor?:   SektorItem[]
  sicaklik?: SicaklikData
  temsilci?: TemsilciItem[]
}

interface ArsivRecord {
  id: string
  fields: { Başlık?: string; Tarih?: string; Tip?: string; Kullanıcı?: string }
}

// ── Formatlar ─────────────────────────────────────────────────────────────────
function formatHafta(weekStart: string, today: string, AY: string[]): string {
  const s = new Date(weekStart + 'T00:00:00')
  const e = new Date(today   + 'T00:00:00')
  if (weekStart === today) return `${s.getDate()} ${AY[s.getMonth()]} ${s.getFullYear()}`
  if (s.getMonth() === e.getMonth()) {
    return `${s.getDate()}-${e.getDate()} ${AY[s.getMonth()]} ${s.getFullYear()}`
  }
  return `${s.getDate()} ${AY[s.getMonth()]} - ${e.getDate()} ${AY[e.getMonth()]} ${e.getFullYear()}`
}

function formatTarih(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getDate()} ${TR_AY[d.getMonth()]} ${d.getFullYear()} ${TR_GUN[d.getDay()]}`
}
void formatTarih // suppress unused warning — used externally if needed

// ── Yükleniyor ────────────────────────────────────────────────────────────────
function Skeleton({ h = 'h-40' }: { h?: string }) {
  return <div className={`${h} rounded-xl bg-gray-50 animate-pulse`} />
}

// ── Kart wrapper ──────────────────────────────────────────────────────────────
function Kart({
  title, right, subtitle, children,
}: {
  title: string
  right?: React.ReactNode
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-[15px] font-semibold text-gray-800">{title}</h3>
        {right && <span className="text-[12px] text-gray-400">{right}</span>}
      </div>
      {subtitle && <p className="text-[12px] text-gray-400 mb-3">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  )
}

// ── Donut Legend ──────────────────────────────────────────────────────────────
function DonutLegend({ items }: { items: { label: string; sayi: number; renk: string; pct: number }[] }) {
  return (
    <div className="mt-2 space-y-1.5">
      {items.map(({ label, sayi, renk, pct }) => (
        <div key={label} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: renk }} />
          <span className="text-[11px] text-gray-700 flex-1">{label}</span>
          <span className="text-[11px] text-gray-500">{fmt(sayi)} · %{pct}</span>
        </div>
      ))}
    </div>
  )
}

// ── a) Branş Dağılımı ────────────────────────────────────────────────────────
function BransDonut({ data, loading }: { data: BransItem[]; loading: boolean }) {
  const tr = useT()
  if (loading || !data.length) return <Kart title={tr('rep.bransDagilimi')}><Skeleton /></Kart>
  const total = data.reduce((s, d) => s + d.sayi, 0)
  const items = data.map((d, i) => ({
    label: d.ad,
    sayi: d.sayi,
    renk: BRANS_COLORS[d.ad] ?? BRANS_FALLBACKS[i % BRANS_FALLBACKS.length],
    pct: total > 0 ? Math.round(d.sayi / total * 100) : 0,
  }))
  return (
    <Kart title={tr('rep.bransDagilimi')}>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie data={data} dataKey="sayi" nameKey="ad" cx="50%" cy="50%" innerRadius={44} outerRadius={72}>
            {data.map((d, i) => (
              <Cell key={i} fill={BRANS_COLORS[d.ad] ?? BRANS_FALLBACKS[i % BRANS_FALLBACKS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
            formatter={(v) => [fmt(v as number), tr('rep.firma')]}
          />
        </PieChart>
      </ResponsiveContainer>
      <DonutLegend items={items} />
    </Kart>
  )
}

// ── b) Sektör Dağılımı ───────────────────────────────────────────────────────
function SektorDonut({ data, loading }: { data?: SektorItem[]; loading: boolean }) {
  const tr = useT()
  if (loading || !data?.length) return <Kart title={tr('rep.sektorDagilimi')}><Skeleton /></Kart>
  const total = data.reduce((s, d) => s + d.sayi, 0)
  const items = data.map((d, i) => ({
    label: d.ad,
    sayi: d.sayi,
    renk: SEKTOR_COLORS[d.ad] ?? SEKTOR_FALLBACKS[i % SEKTOR_FALLBACKS.length],
    pct: total > 0 ? Math.round(d.sayi / total * 100) : 0,
  }))
  return (
    <Kart title={tr('rep.sektorDagilimi')}>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie data={data} dataKey="sayi" nameKey="ad" cx="50%" cy="50%" innerRadius={44} outerRadius={72}>
            {data.map((d, i) => (
              <Cell key={i} fill={SEKTOR_COLORS[d.ad] ?? SEKTOR_FALLBACKS[i % SEKTOR_FALLBACKS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
            formatter={(v) => [fmt(v as number), tr('rep.firma')]}
          />
        </PieChart>
      </ResponsiveContainer>
      <DonutLegend items={items} />
    </Kart>
  )
}

// ── c) Vade Takvimi ──────────────────────────────────────────────────────────
function VadeBar({ data, loading }: { data: VadeItem[]; loading: boolean }) {
  const tr = useT()
  if (loading || !data.length) {
    return (
      <Kart title={tr('rep.vadeTakvimi')} right={tr('rep.vadeSubtitle')}>
        <Skeleton />
      </Kart>
    )
  }
  const AY_KISA: Record<string, string> = {}
  TR_AY.forEach((m, i) => { AY_KISA[m] = tr(AY_SHORT_KEYS[i]) })
  const mapped = data.map(v => ({ ...v, ay: AY_KISA[v.ay] ?? v.ay, _ay: v.ay }))
  return (
    <Kart title={tr('rep.vadeTakvimi')} right={tr('rep.vadeSubtitle')}>
      <ResponsiveContainer width="100%" height={170}>
        <BarChart data={mapped} margin={{ top: 18, right: 4, left: 4, bottom: 0 }}>
          <XAxis
            dataKey="ay"
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
            formatter={(v) => [fmt(v as number), tr('rep.firma')]}
            labelFormatter={(_, payload) => payload?.[0]?.payload?._ay ?? ''}
          />
          <Bar dataKey="sayi" radius={[3, 3, 0, 0]}>
            <LabelList
              dataKey="sayi"
              position="top"
              style={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 500 }}
            />
            {mapped.map((v) => (
              <Cell key={v._ay} fill={isGecmisAy(v._ay) ? PALE_BORDO : BORDO} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Kart>
  )
}

// ── d) Pipeline Aşaması ──────────────────────────────────────────────────────
function PipelineRow({
  asama, sayi, pct,
}: {
  asama: string; sayi: number; pct: number
}) {
  const tr = useT()
  const renk = PIPELINE_RENK[asama] ?? '#9CA3AF'
  const bg   = PIPELINE_BG[asama]   ?? '#F3F4F6'
  const label = PIPELINE_LABEL[asama] ? tr(PIPELINE_LABEL[asama]) : asama
  const showPct = pct >= 2

  return (
    <div className="flex items-center gap-3 py-[5px]">
      <div className="w-28 text-[11px] text-gray-600 shrink-0 text-right leading-none">{label}</div>
      <div
        className="flex-1 relative h-[18px] rounded-sm overflow-hidden"
        style={{ backgroundColor: bg }}
      >
        {sayi > 0 && (
          <div
            className="h-full rounded-sm"
            style={{ width: `${Math.max(pct, 0.5)}%`, backgroundColor: renk }}
          />
        )}
      </div>
      <div className="w-[72px] flex items-center justify-end gap-1 shrink-0">
        <span className="text-[12px] font-semibold text-gray-700">{fmt(sayi)}</span>
        {showPct && (
          <span className="text-[11px] text-gray-400">%{pct}</span>
        )}
      </div>
    </div>
  )
}

function PipelineKart({ data, toplam, loading }: { data: PipelineItem[]; toplam?: number; loading: boolean }) {
  const tr = useT()
  if (loading || !data.length) {
    return <Kart title={tr('rep.pipelineAsamasi')}><Skeleton /></Kart>
  }
  const total = data.reduce((s, d) => s + d.sayi, 0)
  return (
    <Kart
      title={tr('rep.pipelineAsamasi')}
      right={toplam ? tr('rep.aktifFirma').replace('{n}', fmt(toplam)) : undefined}
    >
      <div className="space-y-0">
        {data.map(({ asama, sayi }) => (
          <PipelineRow
            key={asama}
            asama={asama}
            sayi={sayi}
            pct={total > 0 ? Math.round(sayi / total * 100) : 0}
          />
        ))}
      </div>
    </Kart>
  )
}

// ── e) Sıcaklık Skoru ────────────────────────────────────────────────────────
function SicaklikKart({ data, toplam, loading }: { data?: SicaklikData; toplam?: number; loading: boolean }) {
  const tr = useT()
  if (loading || !data) return <Kart title={tr('rep.sicaklikSkoru')} subtitle={tr('rep.portfoyDagilimi')}><Skeleton h="h-20" /></Kart>
  const total = toplam ?? (data.hot + data.warm + data.cold)
  const tiers = [
    { key: 'hot',  label: 'HOT',  count: data.hot,  renk: '#8e2433', barBg: '#F5E8EA' },
    { key: 'warm', label: 'WARM', count: data.warm, renk: '#D97706', barBg: '#FEF3C7' },
    { key: 'cold', label: 'COLD', count: data.cold, renk: '#5B38E8', barBg: '#F0EEFF' },
  ]
  return (
    <Kart title={tr('rep.sicaklikSkoru')} subtitle={tr('rep.portfoyDagilimi')}>
      <div className="grid grid-cols-3 divide-x divide-gray-100">
        {tiers.map(({ key, label, count, renk, barBg }) => {
          const pct = total > 0 ? Math.round(count / total * 100) : 0
          return (
            <div key={key} className="px-4 first:pl-0 last:pr-0 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: renk }} />
                  <span className="text-[11px] font-bold tracking-wide" style={{ color: renk }}>{label}</span>
                </div>
                <span className="text-[14px] font-black text-gray-800">{fmt(count)}</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: barBg }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: renk }}
                />
              </div>
              <span className="text-[11px] text-gray-400">%{pct}</span>
            </div>
          )
        })}
      </div>
    </Kart>
  )
}

// ── Raporlar Hero Banner ──────────────────────────────────────────────────────
function RaporlarHero({ weekLabel }: { weekLabel: string }) {
  const tr = useT()
  return (
    <section
      className="relative h-[150px] rounded-[16px] overflow-hidden text-white flex items-center px-[31px] shadow-sm"
      style={{ background: 'linear-gradient(105deg, #0a2c4e 0%, #1a1240 48%, #982A49 100%)' }}
    >
      {/* Dekoratif halkalar */}
      <div className="absolute right-[-68px] top-[-120px] h-[390px] w-[390px] rounded-full border border-white/15 pointer-events-none" />
      <div className="absolute right-[74px] top-[13px] h-[240px] w-[240px] rounded-full border border-white/12 pointer-events-none" />
      <div className="absolute right-[160px] top-[63px] h-[100px] w-[100px] rounded-full border border-white/10 pointer-events-none" />

      <div className="relative flex items-center gap-[28px]">
        <div className="relative shrink-0 h-[92px] w-[92px]">
          <div
            className="absolute inset-[-7px] rounded-full opacity-60 blur-xl"
            style={{ background: 'linear-gradient(135deg, #5B38E8, #D978B6)' }}
          />
          <div
            className="absolute inset-0 rounded-full p-[4px]"
            style={{ background: 'linear-gradient(135deg, #BCA8FF, #5B38E8, #982A49)' }}
          >
            <div className="h-full w-full rounded-full overflow-hidden">
              <Image src="/ali-avatar.png" alt="Ali" width={84} height={84}
                className="h-full w-full object-cover rounded-full" />
            </div>
          </div>
        </div>
        <div>
          <div className="text-[11px] text-white/70 font-semibold uppercase tracking-[.12em]">
            📊 {tr('rep.haftalikRaporlar')}
          </div>
          <h2 className="mt-[4px] text-[20px] font-black tracking-[-.02em]">
            {weekLabel}
          </h2>
          <p className="mt-[6px] text-[13px] text-white/80">
            {tr('rep.heroSubtitle')}
          </p>
        </div>
      </div>
    </section>
  )
}

// ── Bu Hafta Aktivite Kart (mevcut, değişmedi) ────────────────────────────────
const HEDEF = 50

function BugunAktiviteKart({ t, weekStart, tarih }: { t: TemsilciAktivite; weekStart: string; tarih: string }) {
  const tr = useT()
  const AY = AY_FULL_KEYS.map(k => tr(k))
  const bos = t.toplam === 0
  const hedefPct = Math.min(t.toplam / HEDEF * 100, 100)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
            style={{ backgroundColor: bos ? '#D1D5DB' : t.renk }}
          >
            {t.ad.charAt(0)}
          </span>
          <span className="text-sm font-semibold text-gray-800">{t.ad}</span>
        </div>
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{tr('rep.buHafta')}</span>
      </div>

      <div className="text-[10px] text-gray-400">{formatHafta(weekStart, tarih, AY)}</div>

      <div className="flex items-baseline gap-1">
        <span className="text-[32px] font-black leading-none" style={{ color: bos ? '#D1D5DB' : C_PRIMARY }}>
          {t.toplam}
        </span>
        <span className="text-xs text-gray-400">{tr('rep.aktivite')}</span>
      </div>

      {bos ? (
        <p className="text-[11px] text-gray-400 italic">{tr('rep.henuzAktiviteYok')}</p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Phone size={12} className="shrink-0" style={{ color: C_PRIMARY }} />
            <span className="text-[12px] font-bold" style={{ color: C_PRIMARY }}>
              {tr('rep.ulasildiCount').replace('{n}', String(t.kirilim['Ulaşıldı'] ?? 0))}
            </span>
            {t.ulasma_yuzde !== null && (
              <span className="ml-auto text-[11px] font-bold" style={{ color: C_PRIMARY }}>
                {tr('rep.ulasmaPct').replace('{n}', String(t.ulasma_yuzde))}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <CalendarCheck size={12} className="text-[#10B981] shrink-0" />
            <span className="text-[12px] font-bold text-[#10B981]">
              {tr('rep.randevuCount').replace('{n}', String(t.randevu))}
            </span>
            {t.donusum_yuzde !== null && (
              <span className="ml-auto text-[11px] font-bold text-[#10B981]">
                {tr('rep.donusumPct').replace('{n}', String(t.donusum_yuzde))}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] text-gray-400">
              <span>{tr('rep.hedef')}</span>
              <span>{Math.min(t.toplam, HEDEF)}/{HEDEF}</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${hedefPct}%`,
                  backgroundColor: t.toplam >= HEDEF ? '#10B981' : C_PRIMARY,
                }}
              />
            </div>
            {t.toplam >= HEDEF && (
              <span className="text-[10px] text-[#10B981] font-medium">✓ {tr('rep.hedefeUlasildi')}</span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded-lg px-2 py-1.5 text-center bg-[#D1FAE5]">
              <p className="text-[11px] font-bold text-[#10B981]">{t.kirilim['Ulaşıldı'] ?? 0}</p>
              <p className="text-[9px] text-[#10B981]">{tr('rep.ulasildi')}</p>
            </div>
            <div className="rounded-lg px-2 py-1.5 text-center bg-[#FEF3C7]">
              <p className="text-[11px] font-bold text-[#F59E0B]">{t.kirilim['Cevap Yok'] ?? 0}</p>
              <p className="text-[9px] text-[#F59E0B]">{tr('rep.cevapYok')}</p>
            </div>
            <div className="rounded-lg px-2 py-1.5 text-center bg-[#DBEAFE]">
              <p className="text-[11px] font-bold text-[#3B82F6]">{t.kirilim['Geri Aranacak'] ?? 0}</p>
              <p className="text-[9px] text-[#3B82F6]">{tr('rep.geriAra')}</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Ana Bileşen ───────────────────────────────────────────────────────────────
export function RaporlarClient({
  izin,
  isBireysel = false,
  displayAdMap = {},
}: {
  izin: Exclude<MusterilerIzin, { tip: 'yok' }>
  isBireysel?: boolean
  displayAdMap?: Record<string, string>
}) {
  const tr = useT()
  const [grafik, setGrafik] = useState<GrafikData | null>(null)
  const [grafikLoading, setGrafikLoading] = useState(!isBireysel)
  const [grafikError, setGrafikError] = useState<string | null>(null)

  const [bugunAktivite, setBugunAktivite] = useState<{
    tarih: string; weekStart: string; temsilciler: TemsilciAktivite[]
  } | null>(null)
  const [bugunLoading, setBugunLoading] = useState(!isBireysel)

  const [arsiv, setArsiv] = useState<ArsivRecord[]>([])
  const [arsivLoading, setArsivLoading] = useState(!isBireysel)
  const [arsivError, setArsivError] = useState<string | null>(null)

  const [weekOffset, setWeekOffset] = useState(0)
  const [modalId, setModalId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (isBireysel) return
    fetch('/api/raporlar/grafik')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setGrafikError(tr('rep.grafikYuklenemedi')); return }
        const mapped = { ...d }
        if (mapped.temsilci) {
          mapped.temsilci = mapped.temsilci.map((item: TemsilciItem) => ({
            ...item,
            temsilci: displayAdMap[item.temsilci] ?? item.temsilci,
          }))
        }
        setGrafik(mapped)
      })
      .catch(() => setGrafikError(tr('rep.grafikYuklenemedi')))
      .finally(() => setGrafikLoading(false))
  }, [isBireysel]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isBireysel) return
    fetch('/api/raporlar/bugun-aktivite', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (!d.error) {
          const temsilcilerMapped = (d.temsilciler ?? []).map((t: TemsilciAktivite) => ({
            ...t,
            ad: displayAdMap[t.ad] ?? t.ad,
          }))
          setBugunAktivite({ tarih: d.tarih, weekStart: d.weekStart ?? d.tarih, temsilciler: temsilcilerMapped })
        }
      })
      .catch(() => {})
      .finally(() => setBugunLoading(false))
  }, [isBireysel]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isBireysel) return
    fetch('/api/raporlar/arsiv')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setArsivError(tr('rep.arsivYuklenemedi')); return }
        setArsiv(d.records ?? [])
      })
      .catch(() => setArsivError(tr('rep.arsivYuklenemedi')))
      .finally(() => setArsivLoading(false))
  }, [isBireysel]) // eslint-disable-line react-hooks/exhaustive-deps

  const weekLabel = mounted ? getWeekLabel(AY_FULL_KEYS.map(k => tr(k))) : ''

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* ── Hero Banner (yönetici) / Bireysel başlık ────────────────── */}
      {!isBireysel
        ? mounted && <RaporlarHero weekLabel={weekLabel || tr('rep.buHafta')} />
        : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900">{tr('rep.title')}</h1>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-[11px] py-[5px] text-[11px] font-bold text-amber-700">
                {tr('rep.ornekVeri')}
              </span>
            </div>
            <div className="rounded-[12px] border border-amber-200 bg-amber-50 px-[16px] py-[12px] text-[13px] text-amber-700">
              {tr('rep.bireyselNotice')}
            </div>
          </div>
        )
      }


      {/* ════════════════════════════════════════════════════════════ */}
      {/* BÖLÜM 1 — GENEL DAĞILIMLAR                                 */}
      {/* ════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div>
          <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
            {tr('rep.bolum1')}
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {tr('rep.totalPortfoy')}
            {grafik?.toplam ? ` · ${tr('rep.firmaCount').replace('{n}', fmt(grafik.toplam))}` : ''}
          </p>
        </div>

        {grafikError && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-500">
            {grafikError}
          </div>
        )}

        {/* a + b: Branş + Sektör donut — 2 sütun */}
        {mounted && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BransDonut data={grafik?.brans ?? []} loading={grafikLoading} />
            <SektorDonut data={grafik?.sektor} loading={grafikLoading} />
          </div>
        )}

        {/* c: Vade takvimi — tam genişlik */}
        {mounted && (
          <VadeBar data={grafik?.vade ?? []} loading={grafikLoading} />
        )}

        {/* d: Pipeline aşaması — tam genişlik */}
        {mounted && (
          <PipelineKart
            data={grafik?.pipeline ?? []}
            toplam={grafik?.toplam}
            loading={grafikLoading}
          />
        )}

        {/* e: Sıcaklık skoru — tam genişlik */}
        {mounted && (
          <SicaklikKart
            data={grafik?.sicaklik}
            toplam={grafik?.toplam}
            loading={grafikLoading}
          />
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* BÖLÜM 2 — EKİP PERFORMANSI (yalnızca yönetici)             */}
      {/* ════════════════════════════════════════════════════════════ */}
      {!isBireysel && izin.tip === 'yönetici' && (
        <Bolum2Ekip displayAdMap={displayAdMap} weekOffset={weekOffset} onWeekChange={setWeekOffset} />
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* BÖLÜM 3 — TEMSİLCİ PERFORMANSI (yönetici)                 */}
      {/* ════════════════════════════════════════════════════════════ */}
      {!isBireysel && izin.tip === 'yönetici' && (
        <Bolum3Temsilci displayAdMap={displayAdMap} weekOffset={weekOffset} />
      )}

      {/* ── Bu Hafta Aktivite (temsilci görünümü) ────────────────── */}
      {izin.tip !== 'yönetici' && (
        <section className="space-y-3">
          <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
            {tr('rep.buHaftaAktivite')}
          </h2>
          {bugunLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[0, 1].map(i => (
                <div key={i} className="h-[120px] rounded-xl border border-gray-100 bg-gray-50 animate-pulse" />
              ))}
            </div>
          ) : bugunAktivite && bugunAktivite.temsilciler.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {bugunAktivite.temsilciler.map(t => (
                <BugunAktiviteKart key={t.slug} t={t} weekStart={bugunAktivite.weekStart} tarih={bugunAktivite.tarih} />
              ))}
            </div>
          ) : null}
        </section>
      )}

      {/* ── Rapor Arşivi ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
          {tr('rep.raporArsivi')}
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {arsivLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 rounded-full border-2 border-[#5B47E0] border-t-transparent animate-spin" />
            </div>
          ) : arsivError ? (
            <div className="py-12 text-center text-sm text-red-500">{arsivError}</div>
          ) : arsiv.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-400">{tr('rep.henuzRaporYok')}</p>
            </div>
          ) : (
            arsiv.map((r, i) => (
              <button
                key={r.id}
                onClick={() => setModalId(r.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#F5E8EA] transition-colors group ${
                  i > 0 ? 'border-t border-gray-100' : ''
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-[#F5E8EA] flex items-center justify-center shrink-0">
                  <FileText size={13} style={{ color: BORDO }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{r.fields.Başlık ?? '—'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {r.fields.Tarih ?? ''}
                    {r.fields.Kullanıcı ? ` · ${r.fields.Kullanıcı === 'R眉ya' ? 'Rüya' : r.fields.Kullanıcı}` : ''}
                    {r.fields.Tip ? ` · ${r.fields.Tip}` : ''}
                  </p>
                </div>
                <ExternalLink size={13} className="text-gray-300 group-hover:text-[#8e2433] shrink-0 transition-colors" />
              </button>
            ))
          )}
        </div>
      </section>

      <RaporModal recordId={modalId} onClose={() => setModalId(null)} />
    </div>
  )
}
