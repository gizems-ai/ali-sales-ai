'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useTenant } from '@/lib/tenant-context'
import {
  X, Phone, Mail, Globe, Linkedin, Flame, ExternalLink,
  MapPin, Calendar, Star, CheckCircle2, AlertCircle, Pencil,
  ClipboardList, Trash2, ChevronDown, ChevronRight,
  PhoneCall, CheckCheck, PhoneOff, CalendarClock, Undo2,
} from 'lucide-react'
import { type FirmaDetay, type AirtableRecord, PIPELINE_ASAMALARI } from '@/lib/airtable'
import { type MusterilerIzin } from '@/lib/musteriler-izin'
import { TEMSILCILER } from '@/lib/temsilciler'

// ── Tipleri ────────────────────────────────────────────────────────────────

interface AktiviteLog {
  id: string
  createdTime: string
  fields: {
    'Başlık'?: string
    'Firma ID'?: string
    'Temsilci'?: string
    'Tarih'?: string
    'Arama Sonucu'?: string
    'Randevu Alındı'?: boolean
    'Not'?: string
  }
}

const ARAMA_SONUCU_SECENEKLERI = ['Ulaşıldı', 'Cevap Yok', 'Meşgul', 'Randevu Alındı', 'Geri Aranacak']
const ARAMA_SONUCU_RENK: Record<string, string> = {
  'Ulaşıldı':       'bg-green-50 text-green-700 border-green-100',
  'Cevap Yok':      'bg-gray-100 text-gray-500 border-gray-200',
  'Meşgul':         'bg-red-50 text-red-500 border-red-100',
  'Randevu Alındı': 'bg-violet-50 text-violet-600 border-violet-100',
  'Geri Aranacak':  'bg-blue-50 text-blue-600 border-blue-100',
}

interface Props {
  recordId: string | null
  izin: Exclude<MusterilerIzin, { tip: 'yok' }>
  onClose: () => void
  isAdmin?: boolean
}

type YukleDurum = 'bos' | 'yukleniyor' | 'hata'
type Pending = Partial<FirmaDetay>

interface Toast {
  mesaj: string
  hataMi?: boolean
  undoFn?: () => void
}

// ── Sabit veriler ──────────────────────────────────────────────────────────

const AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
const SEKTORLER = [
  'Üretim & Sanayi','Lojistik & Nakliyat','Sağlık Kuruluşu','Bilişim & Yazılım',
  'Profesyonel Hizmet','Finans & Sigorta','Perakende & E-ticaret',
  'İnşaat & Müteahhitlik','Toptan Ticaret & İthalat-İhracat','Gıda & İçecek',
  'Otomotiv & Yan Sanayi','Eğitim & Danışmanlık','Diğer','Turizm & Konaklama','Reklam & Medya',
]
const ILETISIM_KANALLARI = ['Telefon','Mail','WhatsApp','LinkedIn','Instagram DM']
const SAGLIK_POLICE = ['BIREYSEL GRUP','FERDI','TSS','YOK','BILINMIYOR','ÖSS','ÖSS+TSS']
const VADE_AYLARI = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık','Bilinmiyor']
const ONCELIKLER = ['Normal','Yüksek','Düşük']
const BRANŞLAR = ['Sağlık','Elementer','Acıbadem Ürünleri']

const PIPELINE_RENK: Record<string, string> = Object.fromEntries(
  PIPELINE_ASAMALARI.map(a => [a.value, a.color])
)

// ── Yardımcı fonksiyonlar ──────────────────────────────────────────────────

function formatTarih(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getDate()} ${AYLAR[d.getMonth()]} ${d.getFullYear()}`
}

function formatTarihKisa(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getDate()} ${['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][d.getMonth()]}`
}

function normTR(s: string) {
  return s.toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
}

// ── Alt bileşenler ─────────────────────────────────────────────────────────

function BransBadge({ value }: { value: string }) {
  const n = normTR(value)
  let bg = '#6B7280'; let label = value
  if (n.includes('saglik')) { bg = '#10B981'; label = 'Sağlık' }
  else if (n.includes('elem')) { bg = '#F97316'; label = 'Elementer' }
  else if (n.includes('acib')) { bg = '#A855F7'; label = 'Acıbadem' }
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-white text-[13px] font-semibold shadow-sm"
      style={{ backgroundColor: bg }}>
      {label}
    </span>
  )
}

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 7 ? '#DC2626' : score >= 4 ? '#5B47E0' : '#9CA3AF'
  const label = score >= 7 ? 'Sıcak' : score >= 4 ? 'Ilık' : 'Soğuk'
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-10 w-10 rounded-full grid place-items-center text-white text-[15px] font-black shadow-sm"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
        {score}
      </div>
      <span className="text-[13px] font-medium" style={{ color }}>{label}</span>
    </div>
  )
}

function PriorityPill({ value }: { value: string }) {
  const map: Record<string, [string,string]> = {
    'Yüksek': ['#DC2626','#FEE2E2'],
    'Orta':   ['#D97706','#FEF3C7'],
    'Normal': ['#6B7280','#F3F4F6'],
    'Düşük':  ['#6B7280','#F3F4F6'],
  }
  const [fg, bg] = map[value] ?? map['Normal']
  return (
    <span className="px-2.5 py-1 rounded-full text-[13px] font-semibold"
      style={{ color: fg, background: bg }}>
      {value === 'Yüksek' ? '↑ ' : ''}{value}
    </span>
  )
}

function CollapsibleSection({
  title, icon: Icon, defaultOpen = false, children,
}: {
  title: string; icon?: React.ElementType; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-2 text-[14px] font-semibold text-gray-700">
          {Icon && <Icon size={15} className="text-gray-500" />}
          {title}
        </div>
        {open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  )
}

function Alan({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  )
}

function CheckBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
      <CheckCircle2 size={12} /> {label}
    </span>
  )
}

// ── EF: Düzenlenebilir alan bileşeni ──────────────────────────────────────

interface EFProps {
  label: string
  fk: keyof FirmaDetay
  type?: 'text'|'email'|'tel'|'url'|'date'|'number'|'select'|'multiselect'|'textarea'|'checkbox'
  opts?: string[]
  em: boolean
  rec: AirtableRecord<FirmaDetay>
  pend: Pending
  onCh: (k: keyof FirmaDetay, v: unknown) => void
  err?: string
}

function EF({ label, fk, type = 'text', opts, em, rec, pend, onCh, err }: EFProps) {
  const raw = pend[fk] !== undefined ? pend[fk] : rec.fields[fk]
  if (!em) {
    if (type === 'checkbox') return raw ? <CheckBadge label={label} /> : null
    if (!raw && raw !== 0) return null
    if (type === 'multiselect' && Array.isArray(raw)) {
      return (
        <Alan label={label} value={
          <div className="flex flex-wrap gap-1 mt-0.5">
            {(raw as string[]).map(v => (
              <span key={v} className="px-2 py-0.5 rounded-full bg-[#EDE9FE] text-[#5B47E0] text-xs font-medium">{v}</span>
            ))}
          </div>
        } />
      )
    }
    if (type === 'date' && raw) return <Alan label={label} value={formatTarih(String(raw))} />
    return <Alan label={label} value={String(raw)} />
  }
  const strVal = raw == null ? '' : String(raw)
  const base = `mt-0.5 w-full px-2.5 py-1.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 ${
    err ? 'border-red-300 bg-red-50 focus:ring-red-300/30' : 'border-gray-200 focus:ring-[#5B47E0]/30 focus:border-[#5B47E0]'
  }`
  if (type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={Boolean(raw)} onChange={e => onCh(fk, e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-[#5B47E0]" />
        <span className="text-sm text-gray-700">{label}</span>
      </label>
    )
  }
  return (
    <div>
      <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">{label}</label>
      {type === 'select' && opts && (
        <select value={strVal} onChange={e => onCh(fk, e.target.value || null)} className={base}>
          <option value="">—</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
      {type === 'multiselect' && opts && (
        <div className="flex flex-wrap gap-2 mt-1.5">
          {opts.map(o => {
            const arr = Array.isArray(raw) ? (raw as string[]) : []
            const sel = arr.includes(o)
            return (
              <button key={o} type="button"
                onClick={() => onCh(fk, sel ? arr.filter(v => v !== o) : [...arr, o])}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors
                  ${sel ? 'bg-[#5B47E0] text-white' : 'bg-gray-100 text-gray-600 hover:bg-[#EDE9FE] hover:text-[#5B47E0]'}`}>
                {o}
              </button>
            )
          })}
        </div>
      )}
      {type === 'date' && <input type="date" value={strVal} onChange={e => onCh(fk, e.target.value || null)} className={base} />}
      {type === 'number' && <input type="number" value={strVal} onChange={e => onCh(fk, e.target.value ? Number(e.target.value) : null)} className={base} />}
      {type === 'textarea' && <textarea rows={4} value={strVal} onChange={e => onCh(fk, e.target.value || null)} className={base + ' resize-none'} />}
      {['text','email','tel','url'].includes(type) && <input type={type} value={strVal} onChange={e => onCh(fk, e.target.value || null)} className={base} />}
      {err && <p className="text-[11px] text-red-500 mt-0.5">{err}</p>}
    </div>
  )
}

// ── Hızlı Aksiyon Barı ────────────────────────────────────────────────────

interface HizliAksizonProps {
  record: AirtableRecord<FirmaDetay>
  izin: Exclude<MusterilerIzin, { tip: 'yok' }>
  onAirtableUpdate: (fields: Record<string, unknown>, sonuc?: string) => Promise<void>
  onPipelineChange: (asama: string) => Promise<void>
  disabled?: boolean
}

function HizliAksiyon({ record, izin, onAirtableUpdate, onPipelineChange, disabled }: HizliAksizonProps) {
  const f = record.fields
  const [loading, setLoading] = useState<string | null>(null)
  const [pipelineAcik, setPipelineAcik] = useState(false)
  const [sonraAraAcik, setSonraAraAcik] = useState(false)
  const [sonraAraTarih, setSonraAraTarih] = useState('')
  const dateRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (sonraAraAcik) { dateRef.current?.focus(); dateRef.current?.showPicker?.() }
  }, [sonraAraAcik])

  const today = new Date().toLocaleDateString('sv-SE')

  async function doAksiyon(key: string, fields: Record<string, unknown>, sonuc?: string) {
    if (disabled || loading) return
    setLoading(key)
    try {
      await onAirtableUpdate(fields, sonuc)
    } finally {
      setLoading(null)
    }
  }

  async function doSonraAra() {
    if (!sonraAraTarih) return
    setLoading('sonra')
    try {
      await onAirtableUpdate({ 'Sonra Ara Tarihi': sonraAraTarih })
      setSonraAraAcik(false)
      setSonraAraTarih('')
    } finally {
      setLoading(null)
    }
  }

  async function doPipeline(asama: string) {
    setPipelineAcik(false)
    setLoading('pipeline')
    try {
      await onPipelineChange(asama)
    } finally {
      setLoading(null)
    }
  }

  const PIPELINE_ICONS: Record<string, string> = {
    'Ulaşılamadı': '🔴', 'Yanıt Alındı': '🔵', 'Randevu': '🟢',
    'Teklif': '🟣', 'Müzakere': '🟠', 'Kazanıldı': '✅', 'Kaybedildi': '⚫',
  }

  const buttons = [
    {
      key: 'arandi',
      label: 'Arandı',
      emoji: '📞',
      color: '#3B82F6',
      fields: { 'Son İletişim Tarihi': today, '2026 Arandı mı': true, 'Bugün Aranacak': false },
      sonuc: 'Geri Aranacak',
    },
    {
      key: 'ulasildi',
      label: 'Ulaşıldı',
      emoji: '✓',
      color: '#10B981',
      fields: { 'Son İletişim Tarihi': today, '2026 Arandı mı': true, '2026 Ulaşıldı mı': true, 'Bugün Aranacak': false },
      sonuc: 'Ulaşıldı',
    },
    {
      key: 'ulasilamadi',
      label: 'Ulaşılamadı',
      emoji: '✗',
      color: '#DC2626',
      fields: { 'Son İletişim Tarihi': today, '2026 Arandı mı': true, 'Pipeline Aşaması': 'Ulaşılamadı', 'Bugün Aranacak': false },
      sonuc: 'Cevap Yok',
    },
    {
      key: 'sonra',
      label: 'Sonra Ara',
      emoji: '📅',
      color: '#8B5CF6',
      fields: {},
      sonuc: undefined,
    },
  ]

  return (
    <div className="rounded-2xl p-4 shadow-sm" style={{ background: 'linear-gradient(135deg, #7C2D2D 0%, #991B1B 100%)' }}>
      {/* 4 buton */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {buttons.map(b => (
          <button
            key={b.key}
            disabled={!!loading || disabled}
            onClick={() => {
              if (b.key === 'sonra') { setSonraAraAcik(v => !v); return }
              doAksiyon(b.key, b.fields, b.sonuc)
            }}
            className="flex flex-col items-center justify-center gap-1 h-[64px] rounded-xl bg-white/90 hover:bg-white
              transition-all duration-150 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === b.key ? (
              <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: b.color, borderTopColor: 'transparent' }} />
            ) : (
              <span className="text-[22px] leading-none">{b.emoji}</span>
            )}
            <span className="text-[11px] font-semibold text-gray-700">{b.label}</span>
          </button>
        ))}
      </div>

      {/* Sonra Ara date picker */}
      {sonraAraAcik && (
        <div className="flex items-center gap-2 mb-3 bg-white/20 rounded-xl p-2.5">
          <input
            ref={dateRef}
            type="date"
            value={sonraAraTarih}
            onChange={e => setSonraAraTarih(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') doSonraAra(); if (e.key === 'Escape') setSonraAraAcik(false) }}
            className="flex-1 rounded-lg border-0 bg-white px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
          <button onClick={doSonraAra}
            className="px-3 py-1.5 rounded-lg bg-white text-[12px] font-bold text-purple-700 hover:bg-purple-50 transition-colors">
            Kaydet
          </button>
          <button onClick={() => setSonraAraAcik(false)}
            className="p-1.5 rounded-lg text-white/70 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Pipeline dropdown */}
      <div className="relative">
        <button
          onClick={() => setPipelineAcik(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors"
        >
          <div>
            <span className="block text-[11px] text-white/70 font-medium uppercase tracking-wide">Pipeline Aşaması</span>
            <span className="text-[14px] font-bold text-white mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIPELINE_RENK[f['Pipeline Aşaması'] ?? ''] ?? '#9CA3AF' }} />
              {f['Pipeline Aşaması'] ?? '—'}
            </span>
          </div>
          <ChevronDown size={16} className="text-white/70 shrink-0" style={{ transform: pipelineAcik ? 'rotate(180deg)' : 'none', transition: '150ms' }} />
        </button>

        {pipelineAcik && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20">
            {PIPELINE_ASAMALARI.map(a => (
              <button key={a.value}
                onClick={() => doPipeline(a.value)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
              >
                <span className="text-base">{PIPELINE_ICONS[a.value] ?? '⚪'}</span>
                <span className="text-[13px] font-medium text-gray-800">{a.value}</span>
                {f['Pipeline Aşaması'] === a.value && <CheckCheck size={14} className="ml-auto text-green-500" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Birikimli notlar bileşeni ─────────────────────────────────────────────

function BirikimliNotlar({ metin }: { metin: string }) {
  const [acik, setAcik] = useState(false)
  const satirlar = metin.split('\n')
  const uzun = satirlar.length > 5 || metin.length > 400
  const gosterilen = acik ? metin : satirlar.slice(0, 4).join('\n')
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3.5">
      <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-2">Birikimli Görüşme Notları</p>
      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{gosterilen}{uzun && !acik && '…'}</p>
      {uzun && (
        <button onClick={() => setAcik(p => !p)} className="mt-2 text-xs text-[#5B47E0] hover:underline">
          {acik ? 'Kapat' : 'Devamını gör'}
        </button>
      )}
    </div>
  )
}

// ── Aktivite Bölümü ──────────────────────────────────────────────────────

interface AktiviteSectionProps {
  firmaId: string
  izin: Exclude<MusterilerIzin, { tip: 'yok' }>
  em: boolean
  isAdmin: boolean
  externalLogs?: AktiviteLog[]
  onNewLog?: (log: AktiviteLog) => void
}

export function AktiviteSection({ firmaId, izin, em, isAdmin, externalLogs, onNewLog }: AktiviteSectionProps) {
  const [loglar, setLoglar] = useState<AktiviteLog[]>(externalLogs ?? [])
  const [yukleniyor, setYukleniyor] = useState(!externalLogs)
  const [hata, setHata] = useState('')
  const [aramaSonucu, setAramaSonucu] = useState('')
  const [notMetni, setNotMetni] = useState('')
  const [randevuAlindi, setRandevuAlindi] = useState(false)
  const [temsilci, setTemsilci] = useState('')
  const [tarih, setTarih] = useState(new Date().toISOString().slice(0, 10))
  const [ekleniyor, setEkleniyor] = useState(false)
  const [ekleHata, setEkleHata] = useState('')

  const loadLogs = useCallback(async () => {
    setYukleniyor(true)
    setHata('')
    try {
      const res = await fetch(`/api/aktivite/firma/${firmaId}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setLoglar(data.records ?? [])
    } catch {
      setHata('Aktiviteler yüklenemedi')
    } finally {
      setYukleniyor(false)
    }
  }, [firmaId])

  useEffect(() => {
    if (!externalLogs) loadLogs()
  }, [loadLogs, externalLogs])

  // Dış log ekleme (hızlı aksiyon)
  useEffect(() => {
    if (externalLogs) setLoglar(externalLogs)
  }, [externalLogs])

  async function handleEkle() {
    if (!aramaSonucu) { setEkleHata('Arama sonucu seçin'); return }
    setEkleniyor(true)
    setEkleHata('')
    try {
      const body: Record<string, unknown> = { firmaId, aramaSonucu, not: notMetni, randevuAlindi }
      if (em && tarih) body.tarih = tarih
      if (izin.tip === 'yönetici' && temsilci) body.temsilci = temsilci
      const res = await fetch('/api/aktivite/ekle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? 'Hata') }
      const yeni: AktiviteLog = await res.json()
      setLoglar(prev => [yeni, ...prev])
      onNewLog?.(yeni)
      setAramaSonucu('')
      setNotMetni('')
      setRandevuAlindi(false)
      setTarih(new Date().toISOString().slice(0, 10))
    } catch (e) {
      setEkleHata(e instanceof Error ? e.message : 'Eklenemedi')
    } finally {
      setEkleniyor(false)
    }
  }

  async function handleSil(logId: string) {
    if (!confirm('Bu aktivite kaydı silinecek. Emin misin?')) return
    try {
      const res = await fetch(`/api/aktivite/${logId}`, { method: 'DELETE' })
      if (!res.ok) return
      setLoglar(prev => prev.filter(l => l.id !== logId))
    } catch { /* ignore */ }
  }

  return (
    <div>
      {/* Yeni aktivite ekleme */}
      <div className="rounded-xl border border-[#EDE9FE] bg-[#F5F3FF]/50 p-3 mb-3">
        <p className="text-[11px] text-[#7C3AED] font-semibold uppercase tracking-wide mb-2">Aktivite Ekle</p>
        <div className="flex gap-2 mb-2">
          <select value={aramaSonucu} onChange={e => { setAramaSonucu(e.target.value); setEkleHata('') }}
            className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#DDD6FE] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5B47E0]/30 focus:border-[#5B47E0]">
            <option value="">Arama sonucu seç…</option>
            {ARAMA_SONUCU_SECENEKLERI.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
            <input type="checkbox" checked={randevuAlindi} onChange={e => setRandevuAlindi(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#5B47E0]" />
            <span className="text-xs text-gray-600 whitespace-nowrap">Randevu</span>
          </label>
        </div>
        {em && (
          <div className="flex gap-2 mb-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Tarih</label>
              <input type="date" value={tarih} onChange={e => setTarih(e.target.value)}
                className="mt-0.5 w-full px-2.5 py-1.5 rounded-lg border border-[#DDD6FE] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5B47E0]/30" />
            </div>
            {izin.tip === 'yönetici' && (
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Temsilci</label>
                <select value={temsilci} onChange={e => setTemsilci(e.target.value)}
                  className="mt-0.5 w-full px-2.5 py-1.5 rounded-lg border border-[#DDD6FE] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5B47E0]/30">
                  <option value="">—</option>
                  {TEMSILCILER.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}
          </div>
        )}
        <textarea rows={2} value={notMetni} onChange={e => setNotMetni(e.target.value)}
          placeholder="Not (isteğe bağlı)…"
          className="w-full px-2.5 py-1.5 rounded-lg border border-[#DDD6FE] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5B47E0]/30 resize-none" />
        {ekleHata && <p className="text-[11px] text-red-500 mt-1">{ekleHata}</p>}
        <button onClick={handleEkle} disabled={!aramaSonucu || ekleniyor}
          className="mt-2 px-4 py-1.5 rounded-lg bg-[#5B47E0] text-white text-xs font-semibold hover:bg-[#4C3BC8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {ekleniyor ? 'Ekleniyor…' : 'Kaydet'}
        </button>
      </div>

      {/* Log listesi */}
      {yukleniyor && <div className="flex justify-center py-4"><div className="w-5 h-5 rounded-full border-2 border-[#5B47E0] border-t-transparent animate-spin" /></div>}
      {hata && <p className="text-xs text-red-500 py-2">{hata}</p>}
      {!yukleniyor && loglar.length === 0 && <p className="text-xs text-gray-400 py-2 text-center">Henüz aktivite kaydı yok</p>}
      {!yukleniyor && loglar.length > 0 && (
        <div className="space-y-2">
          {loglar.map(log => {
            const lf = log.fields
            const sonuc = lf['Arama Sonucu']
            const renkClass = sonuc ? (ARAMA_SONUCU_RENK[sonuc] ?? 'bg-gray-100 text-gray-500 border-gray-200') : ''
            return (
              <div key={log.id} className="flex gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:border-[#EDE9FE] transition-colors group">
                <div className="shrink-0 flex flex-col items-center gap-1 pt-0.5">
                  {lf['Tarih'] && <span className="text-[11px] font-semibold text-gray-400 leading-none whitespace-nowrap">{formatTarihKisa(lf['Tarih'])}</span>}
                  {lf['Temsilci'] && (
                    <span className="w-6 h-6 rounded-full bg-[#EDE9FE] text-[#5B47E0] text-[10px] font-bold flex items-center justify-center">
                      {lf['Temsilci'].slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {sonuc && <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${renkClass}`}>{sonuc}</span>}
                    {lf['Randevu Alındı'] && <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-700 border border-green-100">Randevu</span>}
                  </div>
                  {lf['Not'] && <p className="text-xs text-gray-600 mt-1 leading-relaxed">{lf['Not']}</p>}
                </div>
                {isAdmin && (
                  <button onClick={() => handleSil(log.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Son Görüşmeler (ilk 3) ─────────────────────────────────────────────────

function SonGorusmeler({ firmaId, isAdmin }: { firmaId: string; isAdmin: boolean }) {
  const [loglar, setLoglar] = useState<AktiviteLog[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [tumunu, setTumunu] = useState(false)

  useEffect(() => {
    fetch(`/api/aktivite/firma/${firmaId}`)
      .then(r => r.ok ? r.json() : { records: [] })
      .then(d => setLoglar(d.records ?? []))
      .finally(() => setYukleniyor(false))
  }, [firmaId])

  const gosterilen = tumunu ? loglar : loglar.slice(0, 3)

  return (
    <div>
      {yukleniyor && <div className="flex justify-center py-3"><div className="w-4 h-4 rounded-full border-2 border-[#5B47E0] border-t-transparent animate-spin" /></div>}
      {!yukleniyor && loglar.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Henüz görüşme kaydı yok</p>}
      {gosterilen.map(log => {
        const lf = log.fields
        const sonuc = lf['Arama Sonucu']
        const renkClass = sonuc ? (ARAMA_SONUCU_RENK[sonuc] ?? 'bg-gray-100 text-gray-500 border-gray-200') : ''
        return (
          <div key={log.id} className="mb-2 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              {lf['Tarih'] && <span className="text-[11px] text-gray-400">{formatTarihKisa(lf['Tarih'])}</span>}
              {sonuc && <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${renkClass}`}>{sonuc}</span>}
              {lf['Randevu Alındı'] && <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-700 border border-green-100">Randevu</span>}
              {lf['Temsilci'] && (
                <span className="ml-auto w-6 h-6 rounded-full bg-[#EDE9FE] text-[#5B47E0] text-[10px] font-bold flex items-center justify-center">
                  {lf['Temsilci'].slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            {lf['Not'] && <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{lf['Not']}</p>}
          </div>
        )
      })}
      {loglar.length > 3 && (
        <button onClick={() => setTumunu(v => !v)}
          className="text-xs text-[#5B47E0] hover:underline mt-1">
          {tumunu ? 'Daha az göster' : `${loglar.length - 3} görüşme daha →`}
        </button>
      )}
    </div>
  )
}

// ── Ana Modal bileşeni ────────────────────────────────────────────────────

export function FirmaModal({ recordId, izin, onClose, isAdmin = false }: Props) {
  const { airtable: { sistemAdi } } = useTenant()
  const [yukleDurum, setYukleDurum] = useState<YukleDurum>('bos')
  const [hataMsg, setHataMsg] = useState('')
  const [record, setRecord] = useState<AirtableRecord<FirmaDetay> | null>(null)
  const [em, setEm] = useState(false)
  const [pend, setPend] = useState<Pending>({})
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const [valErr, setValErr] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<Toast | null>(null)
  const [notInput, setNotInput] = useState('')
  const [notEkleniyor, setNotEkleniyor] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const acik = Boolean(recordId)

  function showToast(t: Toast, ms = 8000) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(t)
    toastTimer.current = setTimeout(() => setToast(null), ms)
  }

  // Kayıt yükleme
  useEffect(() => {
    if (!recordId) { setRecord(null); setYukleDurum('bos'); setEm(false); setPend({}); setNotInput(''); return }
    setYukleDurum('yukleniyor')
    setEm(false); setPend({}); setSaveErr(null); setNotInput('')
    fetch(`/api/musteriler/detail/${recordId}`)
      .then(async res => {
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? `HTTP ${res.status}`) }
        return res.json()
      })
      .then((r: AirtableRecord<FirmaDetay>) => { setRecord(r); setYukleDurum('bos') })
      .catch((e: Error) => { setHataMsg(e.message); setYukleDurum('hata') })
  }, [recordId])

  useEffect(() => {
    if (!acik) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !em) onClose() }
    document.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [acik, em, onClose])

  const onCh = useCallback((k: keyof FirmaDetay, v: unknown) => {
    setPend(p => ({ ...p, [k]: v }))
    setValErr(e => { const n = { ...e }; delete n[k as string]; return n })
  }, [])

  function validate(): boolean {
    const errors: Record<string, string> = {}
    const firmaAdi = (pend['Firma Adı'] ?? record?.fields['Firma Adı'])
    if ('Firma Adı' in pend && (!firmaAdi || String(firmaAdi).trim() === '')) {
      errors['Firma Adı'] = 'Firma adı boş olamaz'
    }
    const mail = pend['Genel Mail']
    if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(mail))) {
      errors['Genel Mail'] = 'Geçersiz e-posta'
    }
    setValErr(errors)
    return Object.keys(errors).length === 0
  }

  async function handleKaydet() {
    if (!record || !validate()) return
    if (Object.keys(pend).length === 0) { setEm(false); return }
    const prev: Pending = {}
    for (const k of Object.keys(pend)) prev[k as keyof FirmaDetay] = record.fields[k as keyof FirmaDetay] as never
    setRecord(r => r ? { ...r, fields: { ...r.fields, ...pend } } : r)
    setSaving(true); setSaveErr(null)
    try {
      const res = await fetch('/api/musteriler/update', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: record.id, fields: pend }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? `HTTP ${res.status}`) }
      setEm(false); setPend({})
      showToast({ mesaj: `${record.fields['Firma Adı'] ?? 'Firma'} güncellendi`, undoFn: async () => {
        setRecord(r => r ? { ...r, fields: { ...r.fields, ...prev } } : r)
        await fetch('/api/musteriler/update', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recordId: record.id, fields: prev }) })
      }})
    } catch (e) {
      setRecord(r => r ? { ...r, fields: { ...r.fields, ...prev } } : r)
      setSaveErr(e instanceof Error ? e.message : 'Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  // Hızlı aksiyon: Airtable update + aktivite log
  async function handleHizliAksiyon(
    fields: Record<string, unknown>,
    aramaSonucu?: string,
    opts?: { randevuAlindi?: boolean; toastMesaj?: string },
  ) {
    if (!record) return
    const firmaAdi = record.fields['Firma Adı'] ?? 'Firma'
    const prevFields: Partial<FirmaDetay> = {}
    for (const k of Object.keys(fields)) prevFields[k as keyof FirmaDetay] = record.fields[k as keyof FirmaDetay] as never

    // Optimistik update
    setRecord(r => r ? { ...r, fields: { ...r.fields, ...fields } } : r)

    const [updateRes, aktiviteRes] = await Promise.allSettled([
      fetch('/api/musteriler/update', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: record.id, fields }),
      }),
      aramaSonucu ? fetch('/api/aktivite/ekle', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firmaId: record.id,
          aramaSonucu,
          ...(opts?.randevuAlindi ? { randevuAlindi: true } : {}),
        }),
      }) : Promise.resolve(null),
    ])

    if (updateRes.status === 'rejected' || (updateRes.status === 'fulfilled' && !updateRes.value?.ok)) {
      setRecord(r => r ? { ...r, fields: { ...r.fields, ...prevFields } } : r)
      showToast({ mesaj: `${firmaAdi}: Kaydedilemedi`, hataMi: true })
      return
    }

    const prevData = updateRes.status === 'fulfilled' ? await updateRes.value.json().catch(() => ({})) : {}
    let mesaj = `${firmaAdi} · güncellendi`
    if (opts?.toastMesaj) mesaj = `${firmaAdi} · ${opts.toastMesaj}`
    else if (aramaSonucu === 'Ulaşıldı') mesaj = `${firmaAdi} · Ulaşıldı ✓`
    else if (aramaSonucu === 'Cevap Yok') mesaj = `${firmaAdi} · Ulaşılamadı`
    else if (aramaSonucu === 'Geri Aranacak') mesaj = `${firmaAdi} · Arandı kaydedildi`
    else if ('Sonra Ara Tarihi' in fields) mesaj = `${firmaAdi} · Sonra ara tarihi ayarlandı`
    else if ('Pipeline Aşaması' in fields) mesaj = `${firmaAdi} · Pipeline: ${fields['Pipeline Aşaması']}`

    showToast({
      mesaj,
      undoFn: prevData.prev ? async () => {
        setRecord(r => r ? { ...r, fields: { ...r.fields, ...prevData.prev } } : r)
        await fetch('/api/musteriler/update', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recordId: record.id, fields: prevData.prev }) })
      } : undefined,
    })

    if (aktiviteRes.status === 'rejected') {
      console.warn('Aktivite log eklenemedi')
    }
  }

  async function handlePipelineChange(asama: string) {
    const today = new Date().toLocaleDateString('sv-SE')
    // Pipeline → Arama Sonucu eşlemesi (eşleşmeyen aşamalarda aktivite logu açılmaz)
    let aramaSonucu: string | undefined
    let randevuAlindi = false
    if (asama === 'Randevu') { aramaSonucu = 'Randevu Alındı'; randevuAlindi = true }
    else if (asama === 'Teklif' || asama === 'Kazanıldı' || asama === 'Yanıt Alındı') aramaSonucu = 'Ulaşıldı'
    else if (asama === 'Ulaşılamadı' || asama === 'Kaybedildi') aramaSonucu = 'Cevap Yok'

    await handleHizliAksiyon(
      { 'Pipeline Aşaması': asama, 'Son İletişim Tarihi': today, 'Bugün Aranacak': false },
      aramaSonucu,
      { randevuAlindi, toastMesaj: `Pipeline: ${asama}` },
    )
  }

  async function handleNotEkle() {
    if (!notInput.trim() || !record) return
    setNotEkleniyor(true)
    try {
      const res = await fetch('/api/musteriler/update', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: record.id, fields: {}, notEkle: notInput }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.fields?.['Birikimli Görüşme Notları']) {
        setRecord(r => r ? { ...r, fields: { ...r.fields, 'Birikimli Görüşme Notları': data.fields['Birikimli Görüşme Notları'] } } : r)
      }
      setNotInput('')
      showToast({ mesaj: `${record.fields['Firma Adı'] ?? 'Firma'} · Not eklendi` })
    } catch {
      showToast({ mesaj: 'Not eklenemedi', hataMi: true })
    } finally {
      setNotEkleniyor(false)
    }
  }

  // Derived values
  const f = record?.fields ?? {}
  const firmaAdi = String(f['Firma Adı'] ?? '—')
  const score = f['Sıcaklık Skoru']
  const bransArr = (f['Branş'] as string[] | undefined) ?? []
  const temsilci = f['Atanan Temsilci']
  const oncelik = f['Öncelik']
  const checkboxAlanlar: Array<{ label: string; fk: keyof FirmaDetay }> = [
    { label: 'Bugün Aranacak', fk: 'Bugün Aranacak' },
    { label: '2026 Arandı', fk: '2026 Arandı mı' },
    { label: '2026 Ulaşıldı', fk: '2026 Ulaşıldı mı' },
    { label: 'Branş Onaylandı', fk: 'Branş Onaylandı' },
    { label: 'Cross-Sell İmkânı', fk: 'Cross-Sell İmkânı' },
    { label: 'Global Anlaşma', fk: 'Global Anlaşma' },
  ]
  const canWrite = izin.tip === 'yönetici' || (izin.tip === 'temsilci' && temsilci === izin.temsilci)

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-200
          ${acik ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => { if (!em) onClose() }}
      />

      {/* Panel */}
      <div className={`fixed right-0 top-0 h-full w-full max-w-lg bg-white z-50 flex flex-col
        shadow-[0_20px_25px_-5px_rgba(0,0,0,0.15)]
        transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${acik ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* ── STICKY HEADER ─────────────────────────────────────────────── */}
        {record && yukleDurum === 'bos' ? (
          <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 pt-5 pb-4 shrink-0">
            {/* Firma adı + X / Düzenle */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="text-[22px] font-bold leading-tight flex-1 min-w-0" style={{ color: '#1a1a2e' }}>
                {em ? (
                  <EF label="" fk="Firma Adı" em={em} rec={record} pend={pend} onCh={onCh} err={valErr['Firma Adı']} />
                ) : firmaAdi}
              </h2>
              <div className="flex items-center gap-1.5 shrink-0">
                {!em && (
                  <button onClick={() => { setEm(true); setPend({}); setSaveErr(null) }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5B47E0] text-white text-xs font-semibold hover:bg-[#4C3BC8] transition-colors">
                    <Pencil size={12} /> Düzenle
                  </button>
                )}
                {em && (
                  <>
                    <button onClick={() => { setEm(false); setPend({}); setValErr({}) }} disabled={saving}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                      İptal
                    </button>
                    <button onClick={handleKaydet} disabled={saving}
                      className="px-4 py-1.5 rounded-lg bg-[#5B47E0] text-white text-xs font-semibold hover:bg-[#4C3BC8] disabled:opacity-50 transition-colors">
                      {saving ? 'Kaydediliyor…' : 'Kaydet'}
                    </button>
                  </>
                )}
                <button onClick={() => { if (!em) onClose() }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Sektör + Branş badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              {f['Sektör'] && (
                <span className="px-3 py-1 rounded-full text-[13px] font-medium bg-gray-100 text-gray-700">
                  {f['Sektör']}
                </span>
              )}
              {bransArr.map(b => <BransBadge key={b} value={b} />)}
            </div>

            {/* Skor + Öncelik + Pipeline + Temsilci */}
            <div className="flex items-center flex-wrap gap-2.5">
              {score !== undefined && <ScoreCircle score={score} />}
              {oncelik && <PriorityPill value={oncelik} />}
              {f['Pipeline Aşaması'] && (
                <span className="px-2.5 py-1 rounded-full text-[12px] font-semibold text-white"
                  style={{ backgroundColor: PIPELINE_RENK[f['Pipeline Aşaması']] ?? '#9CA3AF' }}>
                  {f['Pipeline Aşaması']}
                </span>
              )}
              {temsilci && (!sistemAdi || temsilci !== sistemAdi) && (
                <div className="flex items-center gap-1.5">
                  <span className="w-7 h-7 rounded-full grid place-items-center text-[11px] font-black text-white"
                    style={{ background: 'linear-gradient(135deg, #5B47E0, #982A49)' }}>
                    {temsilci.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="text-[13px] font-medium text-gray-700">{temsilci}</span>
                </div>
              )}
            </div>

            {saveErr && (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                <p className="text-xs text-red-600">{saveErr}</p>
                <button onClick={() => setSaveErr(null)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
              </div>
            )}
          </div>
        ) : (
          /* Minimal header when loading / error */
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <p className="text-xs font-semibold text-[#5B47E0] uppercase tracking-widest">Firma Detayı</p>
            <button onClick={() => { if (!em) onClose() }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
              <X size={18} />
            </button>
          </div>
        )}

        {/* ── CONTENT ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {yukleDurum === 'yukleniyor' && (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 rounded-full border-2 border-[#5B47E0] border-t-transparent animate-spin" />
            </div>
          )}
          {yukleDurum === 'hata' && (
            <div className="p-6 text-center">
              <p className="text-sm text-red-500">{hataMsg}</p>
            </div>
          )}
          {yukleDurum === 'bos' && record && (
            <div className="px-5 py-4 space-y-4 pb-8">

              {/* ── İLETİŞİM ─────────────────────────────────────────── */}
              {(f['Genel Telefon'] || f['Genel Mail'] || f['Web Sitesi'] || f['İl / İlçe']) && !em && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-3">İletişim</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {f['Genel Telefon'] && (
                      <a href={`tel:${f['Genel Telefon']}`}
                        className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group">
                        <div className="h-8 w-8 rounded-full bg-violet-50 grid place-items-center shrink-0 group-hover:bg-violet-100 transition-colors">
                          <Phone size={14} className="text-[#5B47E0]" />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[11px] text-gray-400">Telefon</span>
                          <span className="block text-sm font-medium text-[#2563EB] truncate">{f['Genel Telefon']}</span>
                        </div>
                      </a>
                    )}
                    {f['Genel Mail'] && (
                      <a href={`mailto:${f['Genel Mail']}`}
                        className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group">
                        <div className="h-8 w-8 rounded-full bg-violet-50 grid place-items-center shrink-0 group-hover:bg-violet-100 transition-colors">
                          <Mail size={14} className="text-[#5B47E0]" />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[11px] text-gray-400">E-posta</span>
                          <span className="block text-sm font-medium text-[#2563EB] truncate">{f['Genel Mail']}</span>
                        </div>
                      </a>
                    )}
                    {f['İl / İlçe'] && (
                      <div className="flex items-center gap-2.5 p-2.5 col-span-2">
                        <MapPin size={14} className="text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-700">{f['İl / İlçe']}</span>
                      </div>
                    )}
                    {(f['Son İletişim Kanalı'] || f['Son İletişim Tarihi']) && (
                      <div className="flex items-center gap-2 col-span-2 pt-1 border-t border-gray-100">
                        <Calendar size={13} className="text-gray-400 shrink-0" />
                        <span className="text-xs text-gray-500">
                          {[f['Son İletişim Kanalı'], f['Son İletişim Tarihi'] ? formatTarih(f['Son İletişim Tarihi']) : undefined].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── HIZLI AKSİYON ─────────────────────────────────────── */}
              {!em && canWrite && (
                <HizliAksiyon
                  record={record}
                  izin={izin}
                  onAirtableUpdate={handleHizliAksiyon}
                  onPipelineChange={handlePipelineChange}
                />
              )}

              {/* ── ALİ ÖZETİ + ÖNERİLEN AÇILIŞ ──────────────────────── */}
              {!em && (f['Ali Özeti'] || f['Önerilen Açılış']) && (
                <div className={`grid gap-3 ${f['Ali Özeti'] && f['Önerilen Açılış'] ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {f['Ali Özeti'] && (
                    <div className="rounded-xl p-3.5 shadow-sm" style={{ background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)', borderLeft: '4px solid #5B47E0' }}>
                      <p className="text-[11px] font-bold text-[#5B47E0] uppercase tracking-wide mb-2">🔥 Ali Önerisi</p>
                      <p className="text-[13px] leading-relaxed text-[#374151]">{f['Ali Özeti']}</p>
                    </div>
                  )}
                  {f['Önerilen Açılış'] && (
                    <div className="rounded-xl p-3.5 shadow-sm" style={{ background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)', borderLeft: '4px solid #10B981' }}>
                      <p className="text-[11px] font-bold text-[#10B981] uppercase tracking-wide mb-2">💬 Önerilen Açılış</p>
                      <p className="text-[13px] italic leading-relaxed text-[#374151]">{f['Önerilen Açılış']}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── NOT EKLE ──────────────────────────────────────────── */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-[13px] font-bold text-gray-800 mb-3">✏️ Görüşme Notu</p>
                {f['Birikimli Görüşme Notları'] && !em && (
                  <div className="mb-3">
                    <BirikimliNotlar metin={f['Birikimli Görüşme Notları']} />
                  </div>
                )}
                {em ? (
                  <EF label="Birikimli Görüşme Notları" fk="Birikimli Görüşme Notları" type="textarea" em={false} rec={record} pend={pend} onCh={onCh} />
                ) : (
                  <>
                    <textarea rows={3} value={notInput} onChange={e => setNotInput(e.target.value)}
                      placeholder="Bugünkü görüşme notu…"
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5B47E0]/30 focus:border-[#5B47E0] resize-none transition-colors" />
                    <button onClick={handleNotEkle} disabled={!notInput.trim() || notEkleniyor}
                      className="mt-2 px-5 py-2 rounded-lg bg-[#5B47E0] text-white text-xs font-semibold hover:bg-[#4C3BC8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      {notEkleniyor ? 'Ekleniyor…' : '+ Ekle'}
                    </button>
                  </>
                )}
              </div>

              {/* ── SON GÖRÜŞMELER ─────────────────────────────────────── */}
              <CollapsibleSection title={`📋 Son Görüşmeler`} defaultOpen={true}>
                <SonGorusmeler firmaId={record.id} isAdmin={isAdmin} />
              </CollapsibleSection>

              {/* ── SİGORTA BİLGİSİ ───────────────────────────────────── */}
              <CollapsibleSection title="🏥 Sigorta Bilgisi">
                {em ? (
                  <div className="space-y-3">
                    <EF label="Branş" fk="Branş" type="multiselect" opts={BRANŞLAR} em={em} rec={record} pend={pend} onCh={onCh} />
                    <EF label="Vade Ayı Grubu" fk="Vade Ayı Grubu" type="select" opts={VADE_AYLARI} em={em} rec={record} pend={pend} onCh={onCh} />
                    <EF label="Sağlık Poliçe Türü" fk="Sağlık Poliçe Türü" type="select" opts={SAGLIK_POLICE} em={em} rec={record} pend={pend} onCh={onCh} />
                    <EF label="Sağlık Vade Tarihi" fk="Sağlık Vade Tarihi" type="date" em={em} rec={record} pend={pend} onCh={onCh} />
                    <EF label="Elementer Ürün" fk="Elementer Ürün" em={em} rec={record} pend={pend} onCh={onCh} />
                    <EF label="Elementer Vade" fk="Elementer Vade" type="date" em={em} rec={record} pend={pend} onCh={onCh} />
                    <EF label="Mevcut Aracı Kurum" fk="Mevcut Aracı Kurum" em={em} rec={record} pend={pend} onCh={onCh} />
                    <EF label="Ürün" fk="Ürün" type="select" opts={SAGLIK_POLICE} em={em} rec={record} pend={pend} onCh={onCh} />
                    <EF label="Kişi Sayısı" fk="Kişi Sayısı" type="number" em={em} rec={record} pend={pend} onCh={onCh} />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {bransArr.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wide block mb-1">Branş</span>
                        <div className="flex flex-wrap gap-1.5">{bransArr.map(b => <BransBadge key={b} value={b} />)}</div>
                      </div>
                    )}
                    <Alan label="Vade Ayı" value={f['Vade Ayı Grubu']} />
                    <Alan label="Sağlık Poliçe" value={f['Sağlık Poliçe Türü']} />
                    <Alan label="Sağlık Vade" value={f['Sağlık Vade Tarihi'] ? formatTarih(f['Sağlık Vade Tarihi']) : undefined} />
                    <Alan label="Elementer Ürün" value={f['Elementer Ürün']} />
                    <Alan label="Elementer Vade" value={f['Elementer Vade'] ? formatTarih(f['Elementer Vade']) : undefined} />
                    <Alan label="Mevcut Aracı" value={f['Mevcut Aracı Kurum']} />
                    <Alan label="Ürün" value={f['Ürün']} />
                    <Alan label="Kişi Sayısı" value={f['Kişi Sayısı']} />
                    <div className="col-span-2 flex flex-wrap gap-2 pt-1">
                      {checkboxAlanlar.filter(c => Boolean(record.fields[c.fk])).map(c => <CheckBadge key={c.fk} label={c.label} />)}
                    </div>
                  </div>
                )}
              </CollapsibleSection>

              {/* ── DURUM BİLGİSİ (edit mode) ─────────────────────────── */}
              {em && (
                <CollapsibleSection title="📊 Durum Bilgisi" defaultOpen={true}>
                  <div className="space-y-3">
                    <EF label="Öncelik" fk="Öncelik" type="select" opts={ONCELIKLER} em={em} rec={record} pend={pend} onCh={onCh} />
                    {izin.tip === 'yönetici' ? (
                      <EF label="Atanan Temsilci" fk="Atanan Temsilci" type="select" opts={[...TEMSILCILER]} em={em} rec={record} pend={pend} onCh={onCh} />
                    ) : (
                      <Alan label="Atanan Temsilci" value={f['Atanan Temsilci']} />
                    )}
                    <EF label="Sektör" fk="Sektör" type="select" opts={SEKTORLER} em={em} rec={record} pend={pend} onCh={onCh} />
                    <EF label="Sonra Ara Tarihi" fk="Sonra Ara Tarihi" type="date" em={em} rec={record} pend={pend} onCh={onCh} />
                    <EF label="Son İletişim Kanalı" fk="Son İletişim Kanalı" type="select" opts={ILETISIM_KANALLARI} em={em} rec={record} pend={pend} onCh={onCh} />
                    <EF label="Son İletişim Tarihi" fk="Son İletişim Tarihi" type="date" em={em} rec={record} pend={pend} onCh={onCh} />
                    <EF label="Son Durum 2026" fk="Son Durum 2026" em={em} rec={record} pend={pend} onCh={onCh} />
                    <EF label="Kaybedilme Nedeni" fk="Kaybedilme Nedeni" em={em} rec={record} pend={pend} onCh={onCh} />
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {checkboxAlanlar.map(c => <EF key={c.fk} label={c.label} fk={c.fk} type="checkbox" em={em} rec={record} pend={pend} onCh={onCh} />)}
                    </div>
                  </div>
                </CollapsibleSection>
              )}

              {/* Durum — view modunda tek satır */}
              {!em && (f['Durum'] || f['Öncelik'] || f['Sonra Ara Tarihi'] || f['Son Durum 2026'] || f['Kaybedilme Nedeni']) && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-3">Durum</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Alan label="Durum" value={f['Durum']} />
                    <Alan label="Öncelik" value={f['Öncelik']} />
                    <Alan label="Sonra Ara" value={f['Sonra Ara Tarihi'] ? formatTarih(f['Sonra Ara Tarihi']) : undefined} />
                    <Alan label="Son Durum 2026" value={f['Son Durum 2026']} />
                  </div>
                  {f['Kaybedilme Nedeni'] && (
                    <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-red-50 border border-red-100">
                      <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] text-red-400 font-semibold uppercase tracking-wide mb-0.5">Kaybedilme Nedeni</p>
                        <p className="text-sm text-red-700">{f['Kaybedilme Nedeni']}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── AKTİVİTE GEÇMİŞİ ──────────────────────────────────── */}
              <CollapsibleSection title="🕐 Aktivite Geçmişi" icon={ClipboardList}>
                <AktiviteSection firmaId={record.id} izin={izin} em={em} isAdmin={isAdmin} />
              </CollapsibleSection>

              {/* ── EK BİLGİ ──────────────────────────────────────────── */}
              {(f['Web Sitesi'] || f['LinkedIn URL'] || f['Adres'] || f['Google Puanı'] !== undefined || f['Veri Kaynağı']) && (
                <CollapsibleSection title="ℹ️ Ek Bilgi">
                  <div className="space-y-3">
                    {f['Web Sitesi'] && (
                      <div className="flex items-center gap-2">
                        <Globe size={13} className="text-gray-400 shrink-0" />
                        <a href={f['Web Sitesi']} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-[#2563EB] hover:underline inline-flex items-center gap-1 truncate">
                          {f['Web Sitesi'].replace(/^https?:\/\//, '')} <ExternalLink size={10} />
                        </a>
                      </div>
                    )}
                    {f['LinkedIn URL'] && (
                      <div className="flex items-center gap-2">
                        <Linkedin size={13} className="text-gray-400 shrink-0" />
                        <a href={f['LinkedIn URL']} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-[#2563EB] hover:underline inline-flex items-center gap-1">
                          LinkedIn <ExternalLink size={10} />
                        </a>
                      </div>
                    )}
                    {f['Adres'] && (
                      <div className="flex items-start gap-2">
                        <MapPin size={13} className="text-gray-400 shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{f['Adres']}</span>
                      </div>
                    )}
                    {f['Google Puanı'] !== undefined && (
                      <div className="flex items-center gap-1.5">
                        <Star size={13} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-sm text-gray-700">
                          {f['Google Puanı']}
                          {f['Google Yorum Sayısı'] !== undefined && <span className="text-gray-400 text-xs ml-1">({f['Google Yorum Sayısı']} yorum)</span>}
                        </span>
                      </div>
                    )}
                    <Alan label="Veri Kaynağı" value={f['Veri Kaynağı']} />
                    <Alan label="Kayıt Tarihi" value={f['Oluşturma Tarihi'] ? formatTarih(f['Oluşturma Tarihi']) : undefined} />
                    <Alan label="Son Not Tarihi" value={f['Son Not Tarihi'] ? formatTarih(f['Son Not Tarihi']) : undefined} />
                  </div>
                </CollapsibleSection>
              )}

              {/* ── Edit mode: İletişim formu ─────────────────────────── */}
              {em && (
                <CollapsibleSection title="📞 İletişim Bilgisi" defaultOpen={false}>
                  <div className="space-y-3">
                    <EF label="Genel Telefon" fk="Genel Telefon" type="tel" em={em} rec={record} pend={pend} onCh={onCh} />
                    <EF label="Genel Mail" fk="Genel Mail" type="email" em={em} rec={record} pend={pend} onCh={onCh} err={valErr['Genel Mail']} />
                    <EF label="Web Sitesi" fk="Web Sitesi" type="url" em={em} rec={record} pend={pend} onCh={onCh} />
                    <EF label="LinkedIn URL" fk="LinkedIn URL" type="url" em={em} rec={record} pend={pend} onCh={onCh} />
                    <EF label="İl / İlçe" fk="İl / İlçe" em={em} rec={record} pend={pend} onCh={onCh} />
                    <EF label="Adres" fk="Adres" em={em} rec={record} pend={pend} onCh={onCh} />
                  </div>
                </CollapsibleSection>
              )}

            </div>
          )}
        </div>
      </div>

      {/* ── Toast ──────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3
          px-4 py-3 rounded-2xl shadow-xl text-sm min-w-[280px]
          ${toast.hataMi ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}
        >
          <span className="truncate flex-1">{toast.mesaj}</span>
          {!toast.hataMi && toast.undoFn && (
            <button onClick={() => { toast.undoFn?.(); setToast(null) }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-medium transition-colors shrink-0">
              <Undo2 size={11} />Geri Al
            </button>
          )}
          <button onClick={() => { setToast(null); if (toastTimer.current) clearTimeout(toastTimer.current) }}
            className="text-white/60 hover:text-white transition-colors shrink-0">
            <X size={12} />
          </button>
        </div>
      )}
    </>
  )
}
