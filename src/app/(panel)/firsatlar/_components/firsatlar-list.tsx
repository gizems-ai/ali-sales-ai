'use client'

import { useState } from 'react'
import { Users, TrendingUp, Zap, type LucideIcon } from 'lucide-react'
import { type AirtableRecord, type Firsat } from '@/lib/airtable'

/* ─── renk tabloları ─────────────────────────────────────────── */

const URUN_COLORS: Record<string, { bg: string; text: string }> = {
  TSS:       { bg: '#EDE9FE', text: '#5B47E0' },
  OSS:       { bg: '#DBEAFE', text: '#1D4ED8' },
  'OSS+TSS': { bg: '#F5F3FF', text: '#4338CA' },
  Isyeri:    { bg: '#CFFAFE', text: '#0E7490' },
  Yangin:    { bg: '#FEE2E2', text: '#DC2626' },
}

const SICAKLIK_COLORS: Record<string, { bg: string; text: string }> = {
  HOT:     { bg: '#FEE2E2', text: '#DC2626' },
  WARM:    { bg: '#EDE9FE', text: '#5B47E0' },
  NURTURE: { bg: '#DBEAFE', text: '#1D4ED8' },
  HOLD:    { bg: '#F3F4F6', text: '#6B7280' },
}

const SICAKLIK_ORDER: Record<string, number> = {
  HOT: 0, WARM: 1, NURTURE: 2, HOLD: 3,
}

const ASAMA_LABELS: Record<string, string> = {
  New:          'Yeni',
  Contacted:    'İletişime Geçildi',
  Qualified:    'Nitelikli',
  Proposal:     'Teklif',
  'Closed Won': 'Kazanıldı',
  'Closed Lost':'Kaybedildi',
}

/* Sinyal tipi → ikon + renk. Yeni tipler buraya eklenir, kart tasarımı değişmez. */
const SINYAL_CONFIG: Record<string, { Icon: LucideIcon; color: string }> = {
  'İşe Alım Artışı': { Icon: Users,       color: '#5B47E0' },
  'Sermaye Artırımı':{ Icon: TrendingUp,   color: '#22C55E' },
}
const SINYAL_FALLBACK = { Icon: Zap, color: '#9CA3AF' }

/* ─── yardımcı fonksiyonlar ──────────────────────────────────── */

function parseFirsatAdi(firsat_adi?: string) {
  if (!firsat_adi) return { firma: null, sinyal: null, tarih: null }
  const parts = firsat_adi.split(' — ')
  return {
    firma:  parts[0] ?? null,
    sinyal: parts[1] ?? null,
    tarih:  parts[2] ?? null,
  }
}

function isGizli(firsat_adi?: string) {
  return !firsat_adi || firsat_adi.startsWith('Gizli Firma')
}

function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function sortRecords(records: AirtableRecord<Firsat>[]) {
  return [...records].sort((a, b) => {
    const sa = SICAKLIK_ORDER[a.fields.sicaklik ?? ''] ?? 99
    const sb = SICAKLIK_ORDER[b.fields.sicaklik ?? ''] ?? 99
    if (sa !== sb) return sa - sb
    return new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
  })
}

/* ─── kart ───────────────────────────────────────────────────── */

function FirsatCard({ record }: { record: AirtableRecord<Firsat> }) {
  const f = record.fields
  const { firma, sinyal, tarih } = parseFirsatAdi(f.firsat_adi)
  const gizli = isGizli(f.firsat_adi)

  const sinyalCfg = (sinyal ? SINYAL_CONFIG[sinyal] : null) ?? SINYAL_FALLBACK
  const { Icon: SinyalIcon, color: sinyalColor } = sinyalCfg

  const urunC = URUN_COLORS[f.urun ?? ''] ?? { bg: '#F3F4F6', text: '#6B7280' }
  const sicaklikC = SICAKLIK_COLORS[f.sicaklik ?? ''] ?? { bg: '#F3F4F6', text: '#6B7280' }

  /* Başlık: çözülmüşse firma adı, değilse sinyal türü + tarih */
  const title = gizli
    ? sinyal
      ? `${sinyal}${tarih ? ` · ${tarih}` : ''}`
      : `Fırsat · ${formatDate(record.createdTime)}`
    : (firma ?? '—')

  const displayDate = !gizli && tarih ? tarih : formatDate(record.createdTime)

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        {/* sinyal ikonu */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: `${sinyalColor}18` }}
        >
          <SinyalIcon size={14} style={{ color: sinyalColor }} />
        </div>

        <div className="flex-1 min-w-0">
          {/* başlık satırı */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className={`text-sm font-semibold leading-snug ${gizli ? 'text-gray-500 italic' : 'text-gray-900'}`}>
                  {title}
                </p>
                {gizli && (
                  <span className="text-[9px] text-gray-400 border border-gray-200 rounded-full px-1.5 py-0.5 shrink-0 not-italic">
                    isim çözülüyor
                  </span>
                )}
              </div>
              {/* çözülmüş kayıtlarda sinyal tipini alt satırda göster */}
              {!gizli && sinyal && (
                <p className="text-xs text-gray-400 mt-0.5">{sinyal}</p>
              )}
            </div>

            {/* rozetler */}
            <div className="flex items-center gap-1 shrink-0">
              {f.sicaklik && (
                <span
                  className="text-[10px] font-bold rounded-full px-2 py-0.5"
                  style={{ background: sicaklikC.bg, color: sicaklikC.text }}
                >
                  {f.sicaklik}
                </span>
              )}
              {f.urun && (
                <span
                  className="text-[10px] font-semibold rounded-full px-2 py-0.5"
                  style={{ background: urunC.bg, color: urunC.text }}
                >
                  {f.urun}
                </span>
              )}
            </div>
          </div>

          {/* alt bilgi satırı */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-gray-400">{displayDate}</span>
            <span className="text-[10px] text-gray-300">·</span>
            <span className="text-[10px] text-gray-500">
              {ASAMA_LABELS[f.asama ?? ''] ?? f.asama ?? '—'}
            </span>
          </div>

          {f.notlar && (
            <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-2">
              {f.notlar}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── liste ──────────────────────────────────────────────────── */

interface Props {
  records: AirtableRecord<Firsat>[]
}

export function FirsatlarList({ records }: Props) {
  const [filterUrun, setFilterUrun] = useState('')
  const [filterSicaklik, setFilterSicaklik] = useState('')

  /* filtreleme önce, sıralama sonra */
  const filtered = sortRecords(
    records.filter(r => {
      if (filterUrun && r.fields.urun !== filterUrun) return false
      if (filterSicaklik && r.fields.sicaklik !== filterSicaklik) return false
      return true
    })
  )

  const urunler = [...new Set(records.map(r => r.fields.urun).filter(Boolean))] as string[]
  const sicakliklar = [...new Set(
    Object.keys(SICAKLIK_ORDER).filter(k => records.some(r => r.fields.sicaklik === k))
  )]

  return (
    <div className="space-y-5">
      {/* filtre şeridi */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-gray-400 font-medium">Ürün</span>
        {urunler.map(u => {
          const c = URUN_COLORS[u] ?? { bg: '#F3F4F6', text: '#6B7280' }
          const active = filterUrun === u
          return (
            <button
              key={u}
              onClick={() => setFilterUrun(active ? '' : u)}
              className="text-[11px] rounded-full px-2.5 py-1 font-medium transition-all border"
              style={
                active
                  ? { background: c.text, color: '#fff', borderColor: c.text }
                  : { background: c.bg, color: c.text, borderColor: 'transparent' }
              }
            >
              {u}
            </button>
          )
        })}

        <span className="text-[11px] text-gray-300 mx-0.5">|</span>

        <span className="text-[11px] text-gray-400 font-medium">Sıcaklık</span>
        {sicakliklar.map(s => {
          const c = SICAKLIK_COLORS[s] ?? { bg: '#F3F4F6', text: '#6B7280' }
          const active = filterSicaklik === s
          return (
            <button
              key={s}
              onClick={() => setFilterSicaklik(active ? '' : s)}
              className="text-[11px] rounded-full px-2.5 py-1 font-medium transition-all border"
              style={
                active
                  ? { background: c.text, color: '#fff', borderColor: c.text }
                  : { background: c.bg, color: c.text, borderColor: 'transparent' }
              }
            >
              {s}
            </button>
          )
        })}

        {(filterUrun || filterSicaklik) && (
          <button
            onClick={() => { setFilterUrun(''); setFilterSicaklik('') }}
            className="text-[11px] text-gray-400 hover:text-gray-600 ml-1 underline underline-offset-2"
          >
            Temizle
          </button>
        )}
      </div>

      {/* sayaç */}
      <p className="text-xs text-gray-400">{filtered.length} fırsat</p>

      {/* kartlar */}
      <div className="space-y-2">
        {filtered.map(record => (
          <FirsatCard key={record.id} record={record} />
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-gray-400">Bu kriterde fırsat yok.</p>
            <button
              onClick={() => { setFilterUrun(''); setFilterSicaklik('') }}
              className="text-xs text-[#5B47E0] hover:underline mt-1"
            >
              Filtreleri temizle
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
