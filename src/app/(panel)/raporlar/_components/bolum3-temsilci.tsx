'use client'

import { useEffect, useState } from 'react'
import { type TemsilciAktivite } from '@/app/api/raporlar/bugun-aktivite/route'

// ── Rate eşiği ────────────────────────────────────────────────────────────────
function rateBadgeStyle(pct: number): { bg: string; color: string } {
  if (pct >= 30) return { bg: '#DBEAFE', color: '#1D4ED8' }   // mavi
  if (pct >= 15) return { bg: '#DBEAFE', color: '#2563EB' }   // mavi (orta)
  if (pct >= 5)  return { bg: '#FEF3C7', color: '#D97706' }   // amber
  return { bg: '#FEE2E2', color: '#DC2626' }                   // kırmızı
}

// ── Trend delta rozet ─────────────────────────────────────────────────────────
function TrendBadge({ now, prev }: { now: number; prev: number }) {
  if (prev === 0) return null
  const delta = now - prev
  const artan = delta >= 0
  return (
    <span
      className="text-[12px] font-bold px-2.5 py-0.5 rounded-full"
      style={{
        backgroundColor: artan ? '#DCFCE7' : '#FEE2E2',
        color: artan ? '#16A34A' : '#DC2626',
      }}
    >
      {artan ? '↗' : '↘'} {artan ? '+' : ''}{delta}
    </span>
  )
}

// ── Temsilci kartı ─────────────────────────────────────────────────────────────
function TemsilciKart({
  t,
  aktiviteGecen,
  weekStart,
  tarih,
  displayAd,
}: {
  t: TemsilciAktivite
  aktiviteGecen: number
  weekStart: string
  tarih: string
  displayAd: string
}) {
  const HEDEF = 250
  const bos = t.toplam === 0
  const hedefPct = Math.min((t.toplam / HEDEF) * 100, 100)

  const ulasmaRate = t.ulasma_yuzde ?? 0
  const randevuRate = t.donusum_yuzde ?? 0

  const ulasmaStyle  = rateBadgeStyle(ulasmaRate)
  const randevuStyle = rateBadgeStyle(randevuRate)

  const renk = bos ? '#D1D5DB' : t.renk

  const TR_AY = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
  const s = new Date(weekStart + 'T00:00:00')
  const e = new Date(tarih     + 'T00:00:00')
  const hafta =
    s.getMonth() === e.getMonth()
      ? `${s.getDate()}-${e.getDate()} ${TR_AY[e.getMonth()]}`
      : `${s.getDate()} ${TR_AY[s.getMonth()]} – ${e.getDate()} ${TR_AY[e.getMonth()]}`

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 flex flex-col gap-4">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span
            className="w-11 h-11 rounded-full flex items-center justify-center text-[15px] font-black text-white shrink-0"
            style={{ backgroundColor: renk }}
          >
            {displayAd.charAt(0)}
          </span>
          <div>
            <p className="text-[16px] font-bold text-gray-900 leading-none">{displayAd}</p>
            <p className="text-[12px] text-gray-400 mt-0.5">Satış temsilcisi · {hafta}</p>
          </div>
        </div>
        <TrendBadge now={t.toplam} prev={aktiviteGecen} />
      </div>

      {/* ── Ana metrikler: Randevu + Satış ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4 flex flex-col gap-1 min-h-[96px]" style={{ backgroundColor: '#F5E8EA' }}>
          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#8e2433' }}>Randevu</span>
          <span className="text-[48px] font-black leading-none" style={{ color: bos ? '#D1D5DB' : '#8e2433' }}>
            {t.randevu}
          </span>
          <span className="text-[11px] font-semibold h-4" style={{ color: '#8e2433' }}>
            {randevuRate > 0 ? `%${randevuRate} dönüşüm` : ''}
          </span>
        </div>
        <div className="rounded-xl p-4 flex flex-col gap-1 min-h-[96px]" style={{ backgroundColor: '#DCFCE7' }}>
          <span className="text-[10px] font-bold uppercase tracking-wide text-[#15803D]">Satış</span>
          <span className="text-[48px] font-black leading-none" style={{ color: bos ? '#D1D5DB' : '#15803D' }}>
            {t.kazanim ?? 0}
          </span>
          <span className="text-[11px] font-semibold h-4 text-[#15803D]">
            {(t.kazanim ?? 0) > 0 ? 'kazanım' : ''}
          </span>
        </div>
      </div>

      {/* ── Aktivite özeti ── */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[44px] font-black leading-none" style={{ color: bos ? '#D1D5DB' : renk }}>
            {t.toplam}
          </span>
          <span className="text-[12px] text-gray-500">aktivite</span>
          {ulasmaRate > 0 && (
            <span
              className="ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={ulasmaStyle}
            >
              %{ulasmaRate} ulaşma
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center justify-between text-[10px] text-gray-400 w-28">
            <span>Hedef {HEDEF}</span>
            <span>{Math.min(t.toplam, HEDEF)}/{HEDEF}</span>
          </div>
          <div className="h-1.5 w-28 rounded-full overflow-hidden" style={{ backgroundColor: bos ? '#F3F4F6' : `${renk}25` }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${hedefPct}%`, backgroundColor: renk }}
            />
          </div>
        </div>
      </div>

      {/* ── Kırılım kutuları ── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg px-2 py-2.5 text-center bg-[#D1FAE5]">
          <p className="text-[18px] font-black text-[#059669]">{t.kirilim['Ulaşıldı'] ?? 0}</p>
          <p className="text-[10px] text-[#059669] mt-0.5">Ulaşıldı</p>
        </div>
        <div className="rounded-lg px-2 py-2.5 text-center bg-[#FEF3C7]">
          <p className="text-[18px] font-black text-[#D97706]">{t.kirilim['Cevap Yok'] ?? 0}</p>
          <p className="text-[10px] text-[#D97706] mt-0.5">Cevap Yok</p>
        </div>
        <div className="rounded-lg px-2 py-2.5 text-center bg-[#DBEAFE]">
          <p className="text-[18px] font-black text-[#2563EB]">{t.kirilim['Geri Aranacak'] ?? 0}</p>
          <p className="text-[10px] text-[#2563EB] mt-0.5">Geri Ara</p>
        </div>
      </div>
    </div>
  )
}

// ── Ekip endpoint'inden sadece temsilci trend verisi ──────────────────────────
interface EkipTemsilci {
  ad: string; slug: string; aktivite_gecen: number
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────
export function Bolum3Temsilci({
  displayAdMap = {},
  weekOffset = 0,
}: {
  displayAdMap?: Record<string, string>
  weekOffset?: number
}) {
  const [bugunData, setBugunData] = useState<{
    tarih: string; weekStart: string; temsilciler: TemsilciAktivite[]
  } | null>(null)
  const [gecenMap, setGecenMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setBugunData(null)
    const qs = weekOffset !== 0 ? `?week=${weekOffset}` : ''
    Promise.all([
      fetch(`/api/raporlar/bugun-aktivite${qs}`, { cache: 'no-store' }).then(r => r.json()),
      fetch(`/api/raporlar/ekip-haftalik${qs}`).then(r => r.json()),
    ]).then(([bugun, ekip]) => {
      if (!bugun.error) {
        setBugunData({
          tarih:       bugun.tarih,
          weekStart:   bugun.weekStart ?? bugun.tarih,
          temsilciler: bugun.temsilciler ?? [],
        })
      }
      if (!ekip.error && ekip.temsilciler) {
        const map: Record<string, number> = {}
        for (const t of ekip.temsilciler as EkipTemsilci[]) {
          map[t.ad] = t.aktivite_gecen
        }
        setGecenMap(map)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [weekOffset]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
          Bölüm 3 — Temsilci Performansı
        </h2>
        <p className="text-[11px] text-gray-400 mt-0.5">Bireysel kırılım</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map(i => (
            <div key={i} className="h-72 rounded-xl bg-gray-50 animate-pulse" />
          ))}
        </div>
      ) : bugunData && bugunData.temsilciler.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bugunData.temsilciler.map(t => (
            <TemsilciKart
              key={t.slug}
              t={t}
              aktiviteGecen={gecenMap[t.ad] ?? 0}
              weekStart={bugunData.weekStart}
              tarih={bugunData.tarih}
              displayAd={displayAdMap[t.ad] ?? t.ad}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
