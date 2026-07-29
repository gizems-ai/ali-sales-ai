'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useT } from '@/lib/i18n/context'

const AY_FULL_KEYS = [
  'rep.monFull0','rep.monFull1','rep.monFull2','rep.monFull3','rep.monFull4','rep.monFull5',
  'rep.monFull6','rep.monFull7','rep.monFull8','rep.monFull9','rep.monFull10','rep.monFull11',
] as const

// ── Renkler — Sigorta identity: mat bordo, yeşil yok ─────────────────────────
const BORDO  = '#982A49'
const TEAL   = '#1D9E75'   // veri rengi (Sağlık branş)

const BRANS_COLORS: Record<string, string> = {
  'Sağlık': TEAL, 'Elementer': '#F59E0B',
  'Acıbadem Ürünleri': '#E62164', 'Diğer': '#A78BFA',
}
const BRANS_FALLBACKS = [TEAL, '#F59E0B', '#E62164', '#A78BFA']

const SEKTOR_COLORS: Record<string, string> = {
  'Üretim & Sanayi': '#982A49', 'Bilişim & Yazılım': '#5B38E8',
  'Hizmet': TEAL, 'Profesyonel Hizmet': TEAL,
  'İnşaat & Müteahhitlik': '#F59E0B', 'Tekstil': '#E62164',
  'Lojistik & Nakliyat': '#0EA5E9', 'Gıda & İçecek': '#EA580C',
  'Diğer': '#A78BFA',
}
const SEKTOR_FALLBACKS = ['#982A49', '#5B38E8', TEAL, '#F59E0B', '#E62164', '#0EA5E9']

// ── Conversion rate rozet — bordo palette ─────────────────────────────────────
function rateBadge(pct: number | null): { bg: string; color: string } | null {
  if (pct === null || pct === 0) return null
  if (pct >= 30) return { bg: '#DBEAFE', color: '#1D4ED8' }   // mavi (iyi)
  if (pct >= 15) return { bg: '#DBEAFE', color: '#2563EB' }   // mavi (orta-iyi)
  if (pct >= 5)  return { bg: '#FEF3C7', color: '#D97706' }   // amber
  return { bg: '#FEE2E2', color: '#DC2626' }                   // kırmızı (düşük)
}

// ── Sayı formatı ──────────────────────────────────────────────────────────────
function fmt(n: number): string { return n.toLocaleString('tr-TR') }

function pctOf(a: number, b: number): number {
  return b > 0 ? Math.round(a / b * 100) : 0
}

// 1 decimal for small values (< 10%), integer otherwise
function fmtPct(a: number, b: number): string {
  if (b === 0) return '0'
  const raw = a / b * 100
  return raw < 10 ? raw.toFixed(1).replace('.0', '') : String(Math.round(raw))
}

function trend(now: number, prev: number): { delta: number; pct: number } | null {
  if (prev === 0) return null
  const delta = now - prev
  const pct = Math.round(Math.abs(delta) / prev * 100)
  return { delta, pct }
}

// ── Tipler ────────────────────────────────────────────────────────────────────
interface TemsilciRow { ad: string; renk: string; sayi: number }
interface DagilimData {
  toplam: number
  temsilci: TemsilciRow[]
  brans: { ad: string; sayi: number }[]
  sektor: { ad: string; sayi: number }[]
}

interface EkipData {
  hafta: { start: string; end: string }
  funnel: {
    aktivite: number; ulasildi: number; yanit_alindi: number
    randevu: number; teklif: number; kazanim: number
  }
  temsilciler: { ad: string; slug: string; renk: string; aktivite: number; ulasildi: number; randevu: number }[]
  aramalar:   DagilimData
  randevular: DagilimData
  gecen_hafta: { aktivite: number; ulasildi: number; randevu: number }
  pipeline_ilerletme: { ileri_tasindi: number; yeni_randevu: number }
}

// ── Kart wrapper ──────────────────────────────────────────────────────────────
function Kart({ title, right, subtitle, children }: {
  title: string; right?: React.ReactNode; subtitle?: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-[15px] font-semibold text-gray-800">{title}</h3>
        {right && <span className="text-[12px] text-gray-400">{right}</span>}
      </div>
      {subtitle && <p className="text-[12px] text-gray-400 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  )
}

function Skeleton({ h = 'h-40' }: { h?: string }) {
  return <div className={`${h} rounded-xl bg-gray-50 animate-pulse`} />
}

// ── 1. Dönüşüm Hunisi ────────────────────────────────────────────────────────
const FUNNEL_ROWS: { key: keyof EkipData['funnel']; labelKey: string; renk: string; bg: string }[] = [
  { key: 'aktivite',     labelKey: 'rep.toplamAktivite', renk: BORDO,     bg: '#FFF3F6' },
  { key: 'ulasildi',    labelKey: 'rep.ulasildi',       renk: BORDO,     bg: '#FFF3F6' },
  { key: 'yanit_alindi',labelKey: 'rep.yanitAlindi',    renk: '#5B38E8', bg: '#F0EEFF' },
  { key: 'randevu',     labelKey: 'rep.randevu',         renk: '#E62164', bg: '#FFF0F6' },
  { key: 'teklif',      labelKey: 'rep.teklif',          renk: '#4B1FB4', bg: '#EEE9FF' },
  { key: 'kazanim',     labelKey: 'rep.kazanim',         renk: BORDO,     bg: '#FFF3F6' },
]

function DonusumHunisi({ funnel }: { funnel: EkipData['funnel'] }) {
  const tr = useT()
  const max = funnel.aktivite || 1

  return (
    <Kart title={tr('rep.donusumHunisi')} right={tr('rep.ekipToplami')}>
      <div className="space-y-2">
        {FUNNEL_ROWS.map(({ key, labelKey, renk, bg }) => {
          const sayi = funnel[key]
          const barPct = Math.min((sayi / max) * 100, 100)
          const ratePctNum = key === 'aktivite' ? null : pctOf(sayi, funnel.aktivite)
          const ratePctStr = key === 'aktivite' ? null : fmtPct(sayi, funnel.aktivite)
          const badge = key === 'aktivite' ? null : (sayi === 0 ? null : rateBadge(ratePctNum ?? 0))

          return (
            <div key={key} className="flex items-center gap-3">
              <div className="w-28 text-[12px] text-gray-600 shrink-0 text-right">{tr(labelKey)}</div>
              <div
                className="flex-1 h-7 rounded-sm overflow-hidden"
                style={{ backgroundColor: bg }}
              >
                {sayi > 0 && (
                  <div
                    className="h-full rounded-sm"
                    style={{ width: `${Math.max(barPct, 1)}%`, backgroundColor: renk }}
                  />
                )}
              </div>
              <div className="w-8 text-[14px] font-bold text-gray-800 shrink-0 text-right">
                {fmt(sayi)}
              </div>
              <div className="w-16 shrink-0 flex justify-end">
                {sayi === 0 || key === 'aktivite' ? (
                  <span className="text-[12px] text-gray-300">{key === 'aktivite' ? '' : '—'}</span>
                ) : badge ? (
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: badge.bg, color: badge.color }}
                  >
                    %{ratePctStr}
                  </span>
                ) : (
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: '#FCEBEB', color: '#A32D2D' }}
                  >
                    %{ratePctStr}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Kart>
  )
}

// ── 2. Hedef Tutturma ────────────────────────────────────────────────────────
const HEDEF_KISI = 250  // 5 gün × 50/gün
const HEDEF_EKIP = 500  // 2 kişi × 250

function HedefSutun({ label, aktivite, hedef, renk }: {
  label: string; aktivite: number; hedef: number; renk: string
}) {
  const pct = Math.min(pctOf(aktivite, hedef), 100)
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] text-gray-500">{label}</span>
      <span className="text-[28px] font-black leading-none" style={{ color: renk }}>%{pct}</span>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${renk}22` }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: renk }} />
      </div>
      <span className="text-[11px] text-gray-400">{fmt(aktivite)} / {fmt(hedef)}</span>
    </div>
  )
}

function HedefTutturma({ temsilciler }: { temsilciler: EkipData['temsilciler'] }) {
  const tr = useT()
  const ekipAktivite = temsilciler.reduce((s, t) => s + t.aktivite, 0)

  return (
    <Kart title={tr('rep.hedefTutturma')} right={tr('rep.hedefTutturmaRight')}>
      <div className="grid grid-cols-3 divide-x divide-gray-100">
        <div className="pr-6">
          <HedefSutun label={tr('rep.ekip')} aktivite={ekipAktivite} hedef={HEDEF_EKIP} renk={BORDO} />
        </div>
        {temsilciler.map((t, i) => (
          <div key={t.slug} className={i === 0 ? 'px-6' : 'pl-6'}>
            <HedefSutun label={t.ad} aktivite={t.aktivite} hedef={HEDEF_KISI} renk={t.renk} />
          </div>
        ))}
      </div>
    </Kart>
  )
}

// ── Donut bileşen ─────────────────────────────────────────────────────────────
interface DonutItem { ad: string; sayi: number; renk: string }

function MiniDonut({ title, items, toplam }: { title: string; items: DonutItem[]; toplam: number }) {
  const tr = useT()
  const filtered = items.filter(i => i.sayi > 0)
  if (!filtered.length) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[10px] text-gray-400 text-center">{title}</p>
        <div className="flex items-center justify-center h-24 text-[11px] text-gray-300">—</div>
      </div>
    )
  }
  return (
    <div>
      <p className="text-[10px] text-gray-400 text-center mb-1">{title}</p>
      <ResponsiveContainer width="100%" height={110}>
        <PieChart>
          <Pie data={filtered} dataKey="sayi" nameKey="ad" cx="50%" cy="50%" innerRadius={30} outerRadius={50}>
            {filtered.map((d, i) => <Cell key={i} fill={d.renk} />)}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E5E7EB' }}
            formatter={(v) => [fmt(v as number), tr('rep.arama')]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-1 space-y-1">
        {filtered.map(({ ad, sayi, renk }) => (
          <div key={ad} className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: renk }} />
            <span className="text-[10px] text-gray-600 flex-1 truncate">{ad}</span>
            <span className="text-[10px] text-gray-500 shrink-0">
              {fmt(sayi)} · %{pctOf(sayi, toplam)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function buildDonutItems(
  rows: { ad: string; renk?: string; sayi: number }[],
  colorMap: Record<string, string>,
  fallbacks: string[],
): DonutItem[] {
  return rows.map((r, i) => ({
    ad:   r.ad,
    sayi: r.sayi,
    renk: r.renk ?? colorMap[r.ad] ?? fallbacks[i % fallbacks.length],
  }))
}

// ── Sektör text legend ────────────────────────────────────────────────────────
function SektorLegend({ items, toplam }: { items: DonutItem[]; toplam: number }) {
  const tr = useT()
  const filtered = items.filter(i => i.sayi > 0)
  if (!filtered.length) return <p className="text-[11px] text-gray-300 pt-4">—</p>
  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-3">{tr('rep.sektor')}</p>
      <div className="space-y-2">
        {filtered.map(({ ad, sayi, renk }) => (
          <div key={ad} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: renk }} />
            <span className="text-[11px] text-gray-600 flex-1 truncate">{ad}</span>
            <span className="text-[10px] text-gray-400 shrink-0">
              {fmt(sayi)} · %{pctOf(sayi, toplam)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 3. Aramaların Dağılımı ───────────────────────────────────────────────────
function AramaDagilimi({ data }: { data: DagilimData }) {
  const tr = useT()
  const temsilciItems = buildDonutItems(data.temsilci.map(t => ({ ...t, renk: t.renk })), {}, [])
  const bransItems    = buildDonutItems(data.brans,  BRANS_COLORS,  BRANS_FALLBACKS)
  const sektorItems   = buildDonutItems(data.sektor, SEKTOR_COLORS, SEKTOR_FALLBACKS)

  return (
    <Kart title={tr('rep.aramalarinDagilimi')} right={tr('rep.aramaBuHafta').replace('{n}', fmt(data.toplam))}>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-6 divide-x divide-gray-100">
        <MiniDonut title={tr('rep.temsilci')} items={temsilciItems} toplam={data.toplam} />
        <div className="pl-6">
          <MiniDonut title={tr('rep.brans')} items={bransItems} toplam={data.toplam} />
        </div>
        <div className="pl-6 min-w-[120px]">
          <SektorLegend items={sektorItems} toplam={data.toplam} />
        </div>
      </div>
    </Kart>
  )
}

// ── 4. Randevuların Dağılımı ─────────────────────────────────────────────────
function RandevuDagilimi({ data }: { data: DagilimData }) {
  const tr = useT()
  const temsilciItems = buildDonutItems(data.temsilci.map(t => ({ ...t, renk: t.renk })), {}, [])
  const bransItems    = buildDonutItems(data.brans,  BRANS_COLORS,  BRANS_FALLBACKS)
  const sektorItems   = buildDonutItems(data.sektor, SEKTOR_COLORS, SEKTOR_FALLBACKS)
  const safeT = Math.max(data.toplam, 1)

  return (
    <Kart title={tr('rep.randevularinDagilimi')} right={tr('rep.randevuBuHafta').replace('{n}', fmt(data.toplam))}>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-6 divide-x divide-gray-100">
        <MiniDonut title={tr('rep.temsilci')} items={temsilciItems} toplam={safeT} />
        <div className="pl-6">
          <MiniDonut title={tr('rep.brans')} items={bransItems} toplam={safeT} />
        </div>
        <div className="pl-6 min-w-[120px]">
          <SektorLegend items={sektorItems} toplam={safeT} />
        </div>
      </div>
    </Kart>
  )
}

// ── 5a. Geçen Haftaya Göre ───────────────────────────────────────────────────
function TrendSatir({ label, now, prev }: { label: string; now: number; prev: number }) {
  const t = trend(now, prev)
  const artan = t ? t.delta >= 0 : null
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-[12px] text-gray-500 w-20 shrink-0">{label}</span>
      <span className="text-[20px] font-black text-gray-800">{fmt(now)}</span>
      {prev > 0 && (
        <span className="text-[11px] text-gray-400">←{fmt(prev)}</span>
      )}
      {t && (
        <span
          className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: artan ? '#DCFCE7' : '#FEE2E2',
            color: artan ? '#16A34A' : '#DC2626',
          }}
        >
          {artan ? '↑' : '↓'} %{t.pct}
        </span>
      )}
      {!t && prev === 0 && (
        <span className="ml-auto text-[11px] text-gray-300">—</span>
      )}
    </div>
  )
}

function TrendKarti({ funnel, gecen }: {
  funnel: EkipData['funnel']
  gecen: EkipData['gecen_hafta']
}) {
  const tr = useT()
  return (
    <Kart title={tr('rep.gecenHaftayaGore')}>
      <TrendSatir label={tr('rep.aktiviteLabel')}  now={funnel.aktivite} prev={gecen.aktivite} />
      <TrendSatir label={tr('rep.ulasildi')}  now={funnel.ulasildi} prev={gecen.ulasildi} />
      <TrendSatir label={tr('rep.randevu')}   now={funnel.randevu}   prev={gecen.randevu} />
    </Kart>
  )
}

// ── 5b. Pipeline İlerletme ───────────────────────────────────────────────────
function PipelineIlerletme({ data }: { data: EkipData['pipeline_ilerletme'] }) {
  const tr = useT()
  return (
    <Kart title={tr('rep.pipelineIlerletme')}>
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[32px] font-black" style={{ color: BORDO }}>
            {data.ileri_tasindi}
          </span>
          <span className="text-[13px] text-gray-600">{tr('rep.firmaIleriTasindi')}</span>
        </div>
        <p className="text-[11px] text-gray-400">
          {tr('rep.pipelineIlerletmeDesc')}
        </p>
        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <span className="text-[12px] text-gray-500">{tr('rep.buHaftaYeniRandevu')}</span>
          <span className="text-[16px] font-bold" style={{ color: BORDO }}>
            {data.yeni_randevu}
          </span>
        </div>
      </div>
    </Kart>
  )
}

// ── Tarih etiket yardımcısı ───────────────────────────────────────────────────
function haftaLabel(start: string, end: string, AY: string[]): string {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end   + 'T00:00:00')
  if (s.getMonth() === e.getMonth()) {
    return `${s.getDate()}-${e.getDate()} ${AY[e.getMonth()]}`
  }
  return `${s.getDate()} ${AY[s.getMonth()]} – ${e.getDate()} ${AY[e.getMonth()]}`
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────
export function Bolum2Ekip({
  displayAdMap,
  weekOffset,
  onWeekChange,
}: {
  displayAdMap?: Record<string, string>
  weekOffset: number
  onWeekChange: (offset: number) => void
}) {
  const tr = useT()
  const [data, setData] = useState<EkipData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setData(null)
    fetch(`/api/raporlar/ekip-haftalik${weekOffset !== 0 ? `?week=${weekOffset}` : ''}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        if (displayAdMap) {
          d.temsilciler = d.temsilciler.map((t: EkipData['temsilciler'][0]) => ({
            ...t, ad: displayAdMap[t.ad] ?? t.ad,
          }))
          const remap = (arr: TemsilciRow[]) => arr.map(t => ({
            ...t, ad: displayAdMap[t.ad] ?? t.ad,
          }))
          d.aramalar.temsilci   = remap(d.aramalar.temsilci)
          d.randevular.temsilci = remap(d.randevular.temsilci)
        }
        setData(d)
      })
      .catch(() => setError(tr('rep.ekipVerisiYuklenemedi')))
      .finally(() => setLoading(false))
  }, [weekOffset]) // eslint-disable-line react-hooks/exhaustive-deps

  const haftaBasligi = weekOffset === 0
    ? tr('rep.buHaftaLower')
    : weekOffset === -1
    ? tr('rep.gecenHafta')
    : tr('rep.haftaOnce').replace('{n}', String(Math.abs(weekOffset)))

  const AY = AY_FULL_KEYS.map(k => tr(k))
  const haftaTarih = data?.hafta ? haftaLabel(data.hafta.start, data.hafta.end, AY) : ''

  return (
    <section className="space-y-4">
      {/* Başlık + Hafta Navigasyonu */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
            {tr('rep.bolum2')}
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {haftaBasligi}{haftaTarih ? ` · ${haftaTarih}` : ''}
          </p>
        </div>

        {/* Hafta seçici — belirgin, bordo-temalı */}
        <div className="flex items-center gap-0 rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
          <button
            onClick={() => onWeekChange(weekOffset - 1)}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-2 text-[12px] font-medium text-gray-600 hover:bg-[#F5E8EA] hover:text-[#8e2433] disabled:opacity-40 transition-colors border-r border-gray-200"
          >
            ← {tr('rep.onceki')}
          </button>
          <div className="px-4 py-2 text-[12px] font-semibold text-gray-700 min-w-[120px] text-center">
            {loading
              ? <span className="inline-block w-20 h-3 bg-gray-100 animate-pulse rounded" />
              : haftaTarih || haftaBasligi}
          </div>
          <button
            onClick={() => onWeekChange(Math.min(0, weekOffset + 1))}
            disabled={loading || weekOffset >= 0}
            className="flex items-center gap-1 px-3 py-2 text-[12px] font-medium text-gray-600 hover:bg-[#F5E8EA] hover:text-[#8e2433] disabled:opacity-40 disabled:cursor-not-allowed transition-colors border-l border-gray-200"
          >
            {tr('rep.sonraki')} →
          </button>
        </div>
      </div>

      {/* Hata */}
      {!loading && error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* 1. Dönüşüm Hunisi */}
      {loading ? <Skeleton h="h-56" /> : data ? <DonusumHunisi funnel={data.funnel} /> : null}

      {/* 2. Hedef Tutturma */}
      {loading ? <Skeleton h="h-32" /> : data ? <HedefTutturma temsilciler={data.temsilciler} /> : null}

      {/* 3. Aramaların Dağılımı */}
      {loading ? <Skeleton h="h-52" /> : data ? <AramaDagilimi data={data.aramalar} /> : null}

      {/* 4. Randevuların Dağılımı */}
      {loading ? <Skeleton h="h-52" /> : data ? <RandevuDagilimi data={data.randevular} /> : null}

      {/* 5. Trend + Pipeline — yan yana */}
      {loading ? <Skeleton h="h-40" /> : data ? (
        <div className="grid grid-cols-2 gap-4">
          <TrendKarti   funnel={data.funnel} gecen={data.gecen_hafta} />
          <PipelineIlerletme data={data.pipeline_ilerletme} />
        </div>
      ) : null}
    </section>
  )
}
