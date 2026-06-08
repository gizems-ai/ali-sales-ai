'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { FileText, ExternalLink, Phone, CalendarCheck } from 'lucide-react'
import { type MusterilerIzin } from '@/lib/musteriler-izin'
import { type TemsilciAktivite } from '@/app/api/raporlar/bugun-aktivite/route'
import { RaporModal } from './rapor-modal'

// ── Renk paleti — sadece mor tonları ──────────────────────────────────────
const C_PRIMARY   = '#5B47E0'
const C_MID       = '#7C6CE0'
const C_LIGHT     = '#9D8CE0'
const C_PALE      = '#C4BBEF'

const BRANS_COLORS = [C_PRIMARY, C_LIGHT, C_PALE]

// ── Tip tanımları ─────────────────────────────────────────────────────────
interface PipelineItem { asama: string; sayi: number }
interface VadeItem     { ay: string;   sayi: number }
interface BransItem    { ad: string;   sayi: number }
interface TemsilciItem { temsilci: string; toplam: number; sicak: number }

interface GrafikData {
  pipeline:  PipelineItem[]
  vade:      VadeItem[]
  brans:     BransItem[]
  temsilci?: TemsilciItem[]
}

interface ArsivRecord {
  id: string
  fields: {
    Başlık?: string
    Tarih?: string
    Tip?: string
    Kullanıcı?: string
  }
}

// ── Türkçe ay etiketi kısaltması ──────────────────────────────────────────
const AY_KISA: Record<string, string> = {
  Ocak:'Oca', Şubat:'Şub', Mart:'Mar', Nisan:'Nis', Mayıs:'May', Haziran:'Haz',
  Temmuz:'Tem', Ağustos:'Ağu', Eylül:'Eyl', Ekim:'Eki', Kasım:'Kas', Aralık:'Ara',
}

// Bugünün ayından önceki aylar → soluk renk
const BUGUN_AY = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
  [(new Date()).getMonth()]

function vadeColor(ay: string) {
  const simdi = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'].indexOf(BUGUN_AY)
  const hedef = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'].indexOf(ay)
  return hedef < simdi ? C_PALE : C_PRIMARY
}

// ── Yükleniyor placeholder ────────────────────────────────────────────────
function GrafikSkeleton() {
  return (
    <div className="h-40 rounded-xl border border-gray-100 bg-gray-50 animate-pulse" />
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────
function GrafikKart({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  )
}

// ── Ana bileşen ───────────────────────────────────────────────────────────
const DURUM_CFG: Record<string, { label: string; renk: string; ikon: string }> = {
  'Ulaşıldı':      { label: 'Ulaşıldı',      renk: '#10B981', ikon: '✓' },
  'Cevap Yok':     { label: 'Cevap Yok',     renk: '#F59E0B', ikon: '○' },
  'Geri Aranacak': { label: 'Geri Aranacak', renk: '#6B7280', ikon: '↻' },
}

const TR_GUN = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi']
const TR_AY  = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']

function formatTarih(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getDate()} ${TR_AY[d.getMonth()]} ${d.getFullYear()} ${TR_GUN[d.getDay()]}`
}

const HEDEF = 50

function BugunAktiviteKart({ t, tarih }: { t: TemsilciAktivite; tarih: string }) {
  const bos = t.toplam === 0
  const hedefPct = Math.min(t.toplam / HEDEF * 100, 100)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-3">
      {/* Header */}
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
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Bugün</span>
      </div>

      {/* Tarih */}
      <div className="text-[10px] text-gray-400">{formatTarih(tarih)}</div>

      {/* Toplam */}
      <div className="flex items-baseline gap-1">
        <span className="text-[32px] font-black leading-none" style={{ color: bos ? '#D1D5DB' : C_PRIMARY }}>
          {t.toplam}
        </span>
        <span className="text-xs text-gray-400">aktivite</span>
      </div>

      {bos ? (
        <p className="text-[11px] text-gray-400 italic">Henüz aktivite kaydı yok</p>
      ) : (
        <>
          {/* Metrik 1: ulaşıldı + % */}
          <div className="flex items-center gap-2">
            <Phone size={12} className="shrink-0" style={{ color: C_PRIMARY }} />
            <span className="text-[12px] font-bold" style={{ color: C_PRIMARY }}>
              {t.kirilim['Ulaşıldı'] ?? 0} ulaşıldı
            </span>
            {t.ulasma_yuzde !== null && (
              <span className="ml-auto text-[11px] font-bold" style={{ color: C_PRIMARY }}>
                %{t.ulasma_yuzde} ulaşma
              </span>
            )}
          </div>

          {/* Metrik 2: randevu + dönüşüm % */}
          <div className="flex items-center gap-2">
            <CalendarCheck size={12} className="text-[#10B981] shrink-0" />
            <span className="text-[12px] font-bold text-[#10B981]">
              {t.randevu} randevu
            </span>
            {t.donusum_yuzde !== null && (
              <span className="ml-auto text-[11px] font-bold text-[#10B981]">
                %{t.donusum_yuzde} dönüşüm
              </span>
            )}
          </div>

          {/* Hedef bar */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] text-gray-400">
              <span>Hedef</span>
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
              <span className="text-[10px] text-[#10B981] font-medium">✓ Hedefe ulaşıldı</span>
            )}
          </div>

          {/* 3 stat kutu */}
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded-lg px-2 py-1.5 text-center" style={{ backgroundColor: '#D1FAE5' }}>
              <p className="text-[11px] font-bold" style={{ color: '#10B981' }}>{t.kirilim['Ulaşıldı'] ?? 0}</p>
              <p className="text-[9px]" style={{ color: '#10B981' }}>Ulaşıldı</p>
            </div>
            <div className="rounded-lg px-2 py-1.5 text-center" style={{ backgroundColor: '#FEF3C7' }}>
              <p className="text-[11px] font-bold" style={{ color: '#F59E0B' }}>{t.kirilim['Cevap Yok'] ?? 0}</p>
              <p className="text-[9px]" style={{ color: '#F59E0B' }}>Cevap Yok</p>
            </div>
            <div className="rounded-lg px-2 py-1.5 text-center" style={{ backgroundColor: '#DBEAFE' }}>
              <p className="text-[11px] font-bold" style={{ color: '#3B82F6' }}>{t.kirilim['Geri Aranacak'] ?? 0}</p>
              <p className="text-[9px]" style={{ color: '#3B82F6' }}>Geri Ara</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function RaporlarClient({ izin }: { izin: Exclude<MusterilerIzin, { tip: 'yok' }> }) {
  const [grafik, setGrafik] = useState<GrafikData | null>(null)
  const [grafikLoading, setGrafikLoading] = useState(true)
  const [grafikError, setGrafikError] = useState<string | null>(null)

  const [bugunAktivite, setBugunAktivite] = useState<{ tarih: string; temsilciler: TemsilciAktivite[] } | null>(null)
  const [bugunLoading, setBugunLoading] = useState(true)

  const [arsiv, setArsiv] = useState<ArsivRecord[]>([])
  const [arsivLoading, setArsivLoading] = useState(true)
  const [arsivError, setArsivError] = useState<string | null>(null)

  const [modalId, setModalId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    fetch('/api/raporlar/bugun-aktivite')
      .then(r => r.json())
      .then(d => { if (!d.error) setBugunAktivite({ tarih: d.tarih, temsilciler: d.temsilciler ?? [] }) })
      .catch(() => {})
      .finally(() => setBugunLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/raporlar/grafik')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setGrafikError('Grafikler yüklenemedi'); return }
        setGrafik(d)
      })
      .catch(() => setGrafikError('Grafikler yüklenemedi'))
      .finally(() => setGrafikLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/raporlar/arsiv')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setArsivError('Arşiv yüklenemedi'); return }
        setArsiv(d.records ?? [])
      })
      .catch(() => setArsivError('Arşiv yüklenemedi'))
      .finally(() => setArsivLoading(false))
  }, [])

  const showTemsilci = izin.tip === 'yönetici'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-lg font-semibold text-gray-900">Raporlar</h1>

      {/* ── Bugün Aktivite ────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Bugün Aktivite
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
              <BugunAktiviteKart key={t.slug} t={t} tarih={bugunAktivite.tarih} />
            ))}
          </div>
        ) : null}
      </section>

      {/* ── Canlı Grafikler ───────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Canlı Görünüm</h2>

        {grafikError && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-500">
            {grafikError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* a) Temsilci karşılaştırma — SADECE YÖNETİCİ */}
          {showTemsilci && (
            <GrafikKart title="Rüya vs Sude">
              {grafikLoading || !mounted ? <GrafikSkeleton /> : !grafik?.temsilci?.length ? (
                <p className="text-xs text-gray-400 py-10 text-center">Veri yok</p>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={grafik.temsilci} barCategoryGap="35%">
                    <XAxis dataKey="temsilci" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
                      formatter={(v, name) => [v, name === 'toplam' ? 'Toplam Firma' : 'Sıcak']}
                    />
                    <Bar dataKey="toplam" name="toplam" fill={C_PALE}  radius={[4,4,0,0]} />
                    <Bar dataKey="sicak"  name="sicak"  fill={C_PRIMARY} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </GrafikKart>
          )}

          {/* b) Pipeline dağılımı */}
          <GrafikKart title="Pipeline Aşamaları">
            {grafikLoading || !mounted ? <GrafikSkeleton /> : !grafik?.pipeline?.length ? (
              <p className="text-xs text-gray-400 py-10 text-center">Veri yok</p>
            ) : (
              <ResponsiveContainer width="100%" height={showTemsilci ? 160 : 220}>
                <BarChart
                  data={grafik.pipeline.filter(p => p.sayi > 0)}
                  layout="vertical"
                  margin={{ left: 80, right: 20 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="asama" type="category"
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={false} tickLine={false} width={76}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
                    formatter={(v) => [v, 'Firma']}
                  />
                  <Bar dataKey="sayi" fill={C_PRIMARY} radius={[0,4,4,0]}>
                    {grafik.pipeline.map(p => (
                      <Cell
                        key={p.asama}
                        fill={p.asama === 'Kazanıldı' ? '#22C55E' : p.asama === 'Kaybedildi' ? C_PALE : C_PRIMARY}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </GrafikKart>

          {/* c) Vade takvimi */}
          <GrafikKart title="Vade Takvimi (Ay)">
            {grafikLoading || !mounted ? <GrafikSkeleton /> : !grafik?.vade?.length ? (
              <p className="text-xs text-gray-400 py-10 text-center">Veri yok</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={grafik.vade.map(v => ({ ...v, ay: AY_KISA[v.ay] ?? v.ay, _ay: v.ay }))}>
                  <XAxis dataKey="ay" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
                    formatter={(v) => [v, 'Firma']}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?._ay ?? ''}
                  />
                  <Bar dataKey="sayi" radius={[4,4,0,0]}>
                    {grafik.vade.map(v => (
                      <Cell key={v.ay} fill={vadeColor(v.ay)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </GrafikKart>

          {/* d) Branş dağılımı */}
          <GrafikKart title="Branş Dağılımı">
            {grafikLoading || !mounted ? <GrafikSkeleton /> : !grafik?.brans?.length ? (
              <p className="text-xs text-gray-400 py-10 text-center">Veri yok</p>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={grafik.brans}
                        dataKey="sayi"
                        nameKey="ad"
                        cx="50%" cy="50%"
                        innerRadius={42} outerRadius={68}
                      >
                        {grafik.brans.map((_, i) => (
                          <Cell key={i} fill={BRANS_COLORS[i % BRANS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
                        formatter={(v) => [v, 'Firma']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 shrink-0">
                  {grafik.brans.map((b, i) => (
                    <div key={b.ad} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: BRANS_COLORS[i % BRANS_COLORS.length] }} />
                      <span className="text-xs text-gray-600">{b.ad}</span>
                      <span className="text-xs font-medium text-gray-800 ml-1">{b.sayi}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GrafikKart>

        </div>
      </section>

      {/* ── Arşiv ─────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Rapor Arşivi</h2>

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {arsivLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 rounded-full border-2 border-[#5B47E0] border-t-transparent animate-spin" />
            </div>
          ) : arsivError ? (
            <div className="py-12 text-center text-sm text-red-500">{arsivError}</div>
          ) : arsiv.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-400">Henüz rapor yok</p>
            </div>
          ) : (
            arsiv.map((r, i) => (
              <button
                key={r.id}
                onClick={() => setModalId(r.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#F5F3FF] transition-colors group ${
                  i > 0 ? 'border-t border-gray-100' : ''
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-[#EDE9FE] flex items-center justify-center shrink-0">
                  <FileText size={13} className="text-[#5B47E0]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{r.fields.Başlık ?? '—'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {r.fields.Tarih ?? ''}{r.fields.Kullanıcı ? ` · ${r.fields.Kullanıcı === 'R眉ya' ? 'Rüya' : r.fields.Kullanıcı}` : ''}
                    {r.fields.Tip ? ` · ${r.fields.Tip}` : ''}
                  </p>
                </div>
                <ExternalLink size={13} className="text-gray-300 group-hover:text-[#5B47E0] shrink-0 transition-colors" />
              </button>
            ))
          )}
        </div>
      </section>

      <RaporModal recordId={modalId} onClose={() => setModalId(null)} />
    </div>
  )
}
