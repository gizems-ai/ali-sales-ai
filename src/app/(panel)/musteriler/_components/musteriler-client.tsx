'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import type { LucideIcon } from 'lucide-react'
import {
  Search, X, Undo2,
  Flame, Clock3, AlertTriangle, CalendarDays,
  MessageSquare, TrendingUp, Download, List,
  Info, PanelRightClose, PanelRightOpen,
} from 'lucide-react'
import {
  type FirmaListeItem, type AirtableRecord,
  PIPELINE_ASAMALARI, type DashboardCounts,
} from '@/lib/airtable'
import { type MusterilerIzin } from '@/lib/musteriler-izin'
import { TEMSILCILER } from '@/lib/temsilciler'
import { type BrifingData } from '@/lib/brifing'
import { FirmaSatir, GRID } from './firma-satir'
import { FirmaModal } from './firma-modal'

// ── Kategori gruplama ──────────────────────────────────────────────────────

type Kategori = 'takip' | 'saglik' | 'elementer' | 'acibadem' | 'diger'

const _normTR = (s: string) => s.toLowerCase()
  .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
  .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')

function getKategori(f: FirmaListeItem): Kategori {
  const sonraAra = f['Sonra Ara Tarihi']
  if (sonraAra) {
    const today = new Date().toLocaleDateString('sv-SE')
    const week = new Date(); week.setDate(week.getDate() + 7)
    if (sonraAra >= today && sonraAra <= week.toLocaleDateString('sv-SE')) return 'takip'
  }
  const bransArr = f['Branş'] ?? []
  if (bransArr.some(b => _normTR(b).includes('acib'))) return 'acibadem'
  const hasSaglik = Boolean(f['Sağlık Vade Tarihi'] || f['Sağlık Poliçe Türü'])
  const hasElem   = Boolean(f['Elementer Ürün'] || f['Elementer Vade'])
  if (hasSaglik) return 'saglik'
  if (hasElem)   return 'elementer'
  return 'diger'
}

const KATEGORI_SIRA: Record<Kategori, number> = { takip: 0, saglik: 1, elementer: 2, acibadem: 3, diger: 4 }

const GRUP_CFG: Partial<Record<Kategori, { emoji: string; label: string; color: string }>> = {
  takip:     { emoji: '📞', label: 'TAKİP',     color: '#2980b9' },
  saglik:    { emoji: '🏥', label: 'SAĞLIK',    color: '#27ae60' },
  elementer: { emoji: '🔧', label: 'ELEMENTER', color: '#e67e22' },
  acibadem:  { emoji: '💎', label: 'ACİBADEM',  color: '#8e44ad' },
}

// ──────────────────────────────────────────────────────────────────────────

const C = {
  navy: '#061f3d',
  violet: '#5B38E8',
  bordo: '#982A49',
  pink: '#D978B6',
  lavender: '#F2EEFF',
  line: '#E7EAF2',
  text: '#071B3A',
  red: '#FF445F',
}

interface AksizonToast {
  mesaj: string
  undoRecordId?: string
  undoFields?: Record<string, unknown>
  hataMi?: boolean
}

interface InitialFilters {
  oncelik?: string
  bugun?: boolean
  asama?: string
  brans?: string
}

interface Props {
  izin: Exclude<MusterilerIzin, { tip: 'yok' }>
  initialRecords: AirtableRecord<FirmaListeItem>[]
  initialOffset?: string
  brifingData: BrifingData | null
  counts: DashboardCounts
  sicakKpi: number
  initialModalId?: string
  initialFilters?: InitialFilters
  isAdmin?: boolean
  isEmlak?: boolean
  isBireysel?: boolean
  displayAdMap?: Record<string, string>  // realAd → displayAd
}

type BransChip = '' | 'saglik' | 'elementer' | 'acibadem' | 'crosssell'

interface Filtreler {
  q: string
  sektor: string
  asama: string
  temsilci: string
  oncelik: string
  vade: string
  bugun: boolean
  brans: BransChip
}

interface Stats {
  total: number
  sicak: number
  bugun: number
}

const SEKTORLER = [
  'Üretim & Sanayi', 'Lojistik & Nakliyat', 'Sağlık Kuruluşu', 'Bilişim & Yazılım',
  'Profesyonel Hizmet', 'Finans & Sigorta', 'Perakende & E-ticaret',
  'İnşaat & Müteahhitlik', 'Toptan Ticaret & İthalat-İhracat', 'Gıda & İçecek',
  'Otomotiv & Yan Sanayi', 'Eğitim & Danışmanlık', 'Diğer',
  'Turizm & Konaklama', 'Reklam & Medya',
]
const VADELER = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık', 'Bilinmiyor',
]

const BOSLUK: Filtreler = {
  q: '', sektor: '', asama: '', temsilci: '', oncelik: '', vade: '', bugun: false, brans: '',
}

const BRANS_CHIPS: { key: BransChip; label: string }[] = [
  { key: '',          label: 'Hepsi' },
  { key: 'saglik',    label: 'Sağlık' },
  { key: 'elementer', label: 'Elementer' },
  { key: 'acibadem',  label: 'Acıbadem' },
  { key: 'crosssell', label: 'Cross-sell' },
]

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

function activeFilterCount(f: Filtreler) {
  return [f.sektor, f.asama, f.temsilci, f.oncelik, f.vade, f.brans].filter(Boolean).length
    + (f.bugun ? 1 : 0)
}

export function MusterilerClient({
  izin, initialRecords, initialOffset, brifingData, counts, sicakKpi, initialModalId, initialFilters, isAdmin,
  isEmlak = false, isBireysel = false, displayAdMap = {},
}: Props) {
  const [filtreler, setFiltreler] = useState<Filtreler>({
    ...BOSLUK,
    ...(initialFilters?.oncelik ? { oncelik: initialFilters.oncelik } : {}),
    ...(initialFilters?.bugun   ? { bugun: true } : {}),
    ...(initialFilters?.asama   ? { asama: initialFilters.asama }   : {}),
  })
  const [records, setRecords]     = useState(initialRecords)
  const [offset, setOffset]       = useState(initialOffset)
  const [loading, setLoading]     = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [stats, setStats]         = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [modalId, setModalId]     = useState<string | null>(initialModalId ?? null)
  const [toast, setToast]         = useState<AksizonToast | null>(null)
  const [railAcik, setRailAcik]   = useState(true)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirst    = useRef(true)

  // Topbar arama → ?modal= yönlendirmesini yakala
  useEffect(() => {
    if (initialModalId && /^rec[A-Za-z0-9]+$/.test(initialModalId)) {
      setModalId(initialModalId)
    }
  }, [initialModalId])

  // Ana Akış / dış link → URL filtre parametrelerini yakala
  useEffect(() => {
    if (!initialFilters) return
    setFiltreler(f => ({
      ...f,
      ...(initialFilters.oncelik !== undefined ? { oncelik: initialFilters.oncelik } : {}),
      ...(initialFilters.bugun   !== undefined ? { bugun:   initialFilters.bugun }   : {}),
      ...(initialFilters.asama   !== undefined ? { asama:   initialFilters.asama }   : {}),
    }))
  }, [initialFilters?.oncelik, initialFilters?.bugun, initialFilters?.asama])

  const debouncedQ = useDebounce(filtreler.q, 400)

  const buildApiUrl = useCallback(
    (path: string, f: Filtreler, appendOffset?: string) => {
      const url = new URL(path, window.location.origin)
      if (f.q.trim()) url.searchParams.set('q', f.q.trim())
      if (f.sektor) url.searchParams.set('sektor', f.sektor)
      if (f.asama) url.searchParams.set('asama', f.asama)
      if (f.temsilci && izin.tip === 'yönetici') url.searchParams.set('temsilci', f.temsilci)
      if (f.oncelik) url.searchParams.set('oncelik', f.oncelik)
      if (f.vade) url.searchParams.set('vade', f.vade)
      if (f.brans) url.searchParams.set('brans', f.brans)
      if (f.bugun) url.searchParams.set('bugun', 'true')
      if (appendOffset) url.searchParams.set('offset', appendOffset)
      return url.toString()
    },
    [izin.tip]
  )

  const fetchStats = useCallback(
    async (f: Filtreler) => {
      setStatsLoading(true)
      try {
        const res = await fetch(buildApiUrl('/api/musteriler/stats', f))
        if (res.ok) setStats(await res.json())
      } finally {
        setStatsLoading(false)
      }
    },
    [buildApiUrl]
  )

  const fetchRecords = useCallback(
    async (f: Filtreler) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(buildApiUrl('/api/musteriler/list', f))
        if (!res.ok) throw new Error()
        const data = await res.json()
        setRecords(data.records ?? [])
        setOffset(data.offset)
      } catch {
        setError('Veriler yüklenemedi')
      } finally {
        setLoading(false)
      }
    },
    [buildApiUrl]
  )

  useEffect(() => {
    if (isEmlak) return  // emlak: fixture verisi, API çağrısı yok
    fetchStats(BOSLUK)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return }
    if (isEmlak) return  // emlak: fixture verisi, API çağrısı yok
    const f = { ...filtreler, q: debouncedQ }
    fetchRecords(f)
    fetchStats(f)
  }, [debouncedQ, filtreler.sektor, filtreler.asama, filtreler.temsilci, filtreler.oncelik, filtreler.vade, filtreler.bugun, filtreler.brans]) // eslint-disable-line react-hooks/exhaustive-deps

  function showToast(t: AksizonToast, sureMs = 8000) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(t)
    toastTimer.current = setTimeout(() => setToast(null), sureMs)
  }

  async function handleUndo() {
    if (!toast?.undoRecordId || !toast?.undoFields) return
    const { undoRecordId, undoFields } = toast
    setToast(null)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    const res = await fetch('/api/musteriler/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId: undoRecordId, fields: undoFields }),
    })
    if (!res.ok) showToast({ mesaj: 'Geri alınamadı', hataMi: true }, 4000)
  }

  async function handleAksiyon(recordId: string, fields: Record<string, unknown>, firmaAdi: string) {
    const res = await fetch('/api/musteriler/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId, fields }),
    })
    const data = await res.json()
    if (!res.ok) {
      showToast({ mesaj: `${firmaAdi}: ${data.error ?? 'Kaydedilemedi'}`, hataMi: true }, 5000)
      return
    }
    let mesaj = `${firmaAdi} · güncellendi`
    if ('Pipeline Aşaması' in fields) mesaj = `${firmaAdi} · ${fields['Pipeline Aşaması']} işaretlendi`
    else if ('2026 Ulaşıldı mı' in fields) mesaj = `${firmaAdi} · Ulaşıldı işaretlendi`
    else if ('Sonra Ara Tarihi' in fields) mesaj = `${firmaAdi} · Sonra ara tarihi ayarlandı`
    else if ('2026 Arandı mı' in fields) mesaj = `${firmaAdi} · Arandı işaretlendi`
    showToast({ mesaj, undoRecordId: recordId, undoFields: data.prev })
  }

  async function handleNotEkle(recordId: string, not: string, firmaAdi: string) {
    const res = await fetch('/api/musteriler/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId, fields: {}, notEkle: not }),
    })
    if (!res.ok) {
      showToast({ mesaj: `${firmaAdi}: Not eklenemedi`, hataMi: true }, 5000)
      return
    }
    showToast({ mesaj: `${firmaAdi} · Not eklendi` }, 4000)
  }

  async function handleAjandayaEkle(recordId: string, firmaAdi: string) {
    const res = await fetch('/api/musteriler/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId, fields: { 'Bugün Aranacak': true } }),
    })
    if (!res.ok) {
      showToast({ mesaj: `${firmaAdi}: Eklenemedi`, hataMi: true }, 4000)
      return
    }
    setRecords(prev => prev.map(r =>
      r.id === recordId ? { ...r, fields: { ...r.fields, 'Bugün Aranacak': true } } : r
    ))
    showToast({ mesaj: `${firmaAdi} · Ajandaya eklendi` }, 4000)
  }

  async function loadMore() {
    if (isBireysel || !offset || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(buildApiUrl('/api/musteriler/list', { ...filtreler, q: debouncedQ }, offset))
      if (!res.ok) throw new Error()
      const data = await res.json()
      setRecords(prev => [...prev, ...(data.records ?? [])])
      setOffset(data.offset)
    } catch {
      setError('Daha fazla yüklenemedi')
    } finally {
      setLoadingMore(false)
    }
  }

  function temizle() { setFiltreler(BOSLUK) }

  const aktifFiltreSayisi = activeFilterCount(filtreler)
  const showTemsilci = izin.tip === 'yönetici'

  // Branş dağılımı hesabı
  const brans     = brifingData?.brans_dagilimi
  const branchSum = brans ? brans.saglik + brans.elementer + brans.acibadem : 0
  const saglikPct = branchSum > 0 ? Math.round((brans!.saglik / branchSum) * 100) : 0
  const elemPct   = branchSum > 0 ? Math.round((brans!.elementer / branchSum) * 100) : 0
  const acibadPct = branchSum > 0 ? 100 - saglikPct - elemPct : 0

  const vade30      = brifingData?.vade_takvimi?.vade_30?.sayi
  const firmaToplam = brifingData?.firma_toplam

  return (
    <div className="space-y-[15px]">

      {/* ── Hero (sigortan only) ───────────────────────────────────────── */}
      {!isEmlak && (
        <section
          className="relative h-[150px] rounded-[16px] overflow-hidden text-white flex items-center px-[31px] shadow-sm"
          style={{ background: `linear-gradient(105deg, ${C.navy} 0%, #251352 48%, ${C.bordo} 100%)` }}
        >
          <div className="absolute right-[-68px] top-[-120px] h-[390px] w-[390px] rounded-full border border-white/15 pointer-events-none" />
          <div className="absolute right-[74px] top-[13px] h-[240px] w-[240px] rounded-full border border-white/12 pointer-events-none" />
          <div className="absolute right-[160px] top-[63px] h-[100px] w-[100px] rounded-full border border-white/10 pointer-events-none" />

          {/* Ali avatar + text */}
          <div className="relative flex items-center gap-[28px]">
            <div className="relative shrink-0 h-[92px] w-[92px]">
              <div className="absolute inset-[-7px] rounded-full opacity-60 blur-xl"
                style={{ background: `linear-gradient(135deg, ${C.violet}, ${C.pink})` }} />
              <div className="absolute inset-0 rounded-full p-[4px]"
                style={{ background: `linear-gradient(135deg, #BCA8FF, ${C.violet}, ${C.bordo})` }}>
                <div className="h-full w-full rounded-full overflow-hidden">
                  <Image src="/ali-avatar.png" alt="Ali" width={84} height={84}
                    className="h-full w-full object-cover rounded-full" />
                </div>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-white/70 font-semibold">Portföy Özeti</div>
              <h2 className="mt-[4px] text-[20px] font-black tracking-[-.02em]">
                {firmaToplam
                  ? `${firmaToplam.toLocaleString('tr-TR')} firma portföyünde`
                  : 'Müşteri portföyünde'}
              </h2>
              <p className="mt-[6px] text-[13px] text-white/80">
                {counts.bugunAranacak > 0
                  ? `Bugün ${counts.bugunAranacak} müşteri aramanızı bekliyor.`
                  : 'Portföyünüzü yönetin.'}
              </p>
            </div>
          </div>

        </section>
      )}

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className={`grid grid-cols-1 gap-[20px] transition-all duration-300 ${railAcik ? 'xl:grid-cols-[1fr_300px]' : 'xl:grid-cols-1'}`}>

        {/* ── Main column ─────────────────────────────────────────────────── */}
        <div className="min-w-0 space-y-[15px]">

          {/* Page header — title + Dışa Aktar + Yeni Müşteri */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-[10px]">
              <h1 className="text-[23px] font-black tracking-[-.02em]" style={{ color: C.text }}>
                Müşteriler
              </h1>
              {!isEmlak && statsLoading ? (
                <span className="rounded-full bg-violet-50 px-[10px] py-[4px] text-[11px] font-bold text-violet-400">…</span>
              ) : !isEmlak && stats ? (
                <span className="rounded-full bg-violet-50 px-[10px] py-[4px] text-[11px] font-bold text-violet-700">
                  {stats.total.toLocaleString('tr-TR')} firma
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-[9px]">
              <button
                className="h-[36px] w-[36px] rounded-[10px] grid place-items-center text-white shadow-sm"
                style={{ background: isEmlak ? '#1B7A47' : C.violet }}
              >
                <List size={16} />
              </button>
              <button
                className="h-[36px] rounded-[10px] border bg-white px-[13px] text-[12px] font-bold flex items-center gap-[6px]"
                style={{ borderColor: C.line, color: C.text }}
              >
                <Download size={14} />Dışa Aktar
              </button>
              <button
                className="h-[36px] rounded-[10px] px-[16px] text-[12px] font-black text-white shadow-sm"
                style={{ background: isEmlak ? '#1B7A47' : C.bordo }}
              >
                + Yeni Müşteri
              </button>
              <button
                onClick={() => setRailAcik(v => !v)}
                title={railAcik ? 'Paneli kapat' : 'Paneli aç'}
                className="h-[36px] w-[36px] rounded-[10px] border bg-white grid place-items-center transition-colors hover:bg-slate-50"
                style={{ borderColor: C.line, color: railAcik ? (isEmlak ? '#1B7A47' : C.violet) : '#94A3B8' }}
              >
                {railAcik ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
              </button>
            </div>
          </div>

          {/* Örnek veri badge (emlak demo) */}
          {isEmlak && (
            <div className="flex items-center gap-[8px] rounded-[10px] border border-amber-200 bg-amber-50 px-[14px] py-[8px]">
              <span className="text-[12px] font-bold text-amber-700">Örnek veri</span>
              <span className="text-[12px] text-amber-600">Emlak demo — yerel fixture, Airtable bağlantısı yok.</span>
            </div>
          )}

          {/* KPI 3-grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-[12px]">
            <KpiCard
              title={isEmlak ? 'Aktif Müşteri' : 'Toplam Portföy'}
              value={isBireysel ? String(initialRecords.length) : (firmaToplam?.toLocaleString('tr-TR') ?? stats?.total?.toLocaleString('tr-TR') ?? '—')}
              sub={isEmlak ? 'Kayıtlı müşteri' : 'Aktif firma'}
              Icon={TrendingUp}
              tone="chart"
            />
            <KpiCard
              title={isEmlak ? 'İlgi Puanı Yüksek' : 'Sıcak Fırsatlar'}
              value={String(sicakKpi)}
              sub={isEmlak ? 'Skor ≥ 7 müşteri' : 'Skor ≥ 7 firma'}
              Icon={Flame}
              tone="red"
            />
            <KpiCard
              title="Yanıt Bekleyen"
              value={String(counts.yanitBekleyen)}
              sub={isEmlak ? 'Randevu bekleniyor' : 'Pipeline\'da'}
              Icon={MessageSquare}
              tone="violet"
            />
          </div>

          {/* Branş chip filtresi (sigortan only) */}
          {!isEmlak && (
            <div className="flex flex-wrap gap-[8px]">
              {BRANS_CHIPS.map(({ key, label }) => {
                const active = filtreler.brans === key
                return (
                  <button
                    key={key || 'hepsi'}
                    onClick={() => setFiltreler(p => ({ ...p, brans: key }))}
                    className="h-[32px] rounded-full px-[14px] text-[12px] font-semibold transition-colors"
                    style={active
                      ? { background: '#5B47E0', color: '#fff' }
                      : { background: '#F2EEFF', color: '#5B47E0' }
                    }
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Filter bar — directly above the table */}
          <div className="flex flex-wrap gap-[9px]">
            <div className="relative">
              <Search size={14} className="absolute left-[12px] top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={filtreler.q}
                onChange={e => setFiltreler(p => ({ ...p, q: e.target.value }))}
                placeholder="Firma adı veya sektör ara..."
                className="h-[35px] w-[220px] rounded-[11px] border bg-white pl-[34px] pr-3 text-[12px] focus:outline-none focus:ring-2 focus:ring-violet-300/30"
                style={{ borderColor: C.line }}
              />
            </div>
            <FilterPill
              label="Sektör" value={filtreler.sektor}
              onChange={v => setFiltreler(p => ({ ...p, sektor: v }))}
              options={SEKTORLER}
            />
            <FilterPill
              label="Aşama" value={filtreler.asama}
              onChange={v => setFiltreler(p => ({ ...p, asama: v }))}
              options={PIPELINE_ASAMALARI.map(a => a.value)}
            />
            {showTemsilci && (
              <FilterPill
                label={isEmlak ? 'Danışman' : 'Temsilci'} value={filtreler.temsilci}
                onChange={v => setFiltreler(p => ({ ...p, temsilci: v }))}
                options={[...TEMSILCILER]}
                optionLabels={displayAdMap}
              />
            )}
            <FilterPill
              label="Öncelik" value={filtreler.oncelik}
              onChange={v => setFiltreler(p => ({ ...p, oncelik: v }))}
              options={['Yüksek', 'Normal', 'Düşük']}
            />
            <FilterPill
              label="Vade" value={filtreler.vade}
              onChange={v => setFiltreler(p => ({ ...p, vade: v }))}
              options={VADELER}
            />
            <button
              onClick={() => setFiltreler(p => ({ ...p, bugun: !p.bugun }))}
              className="h-[35px] rounded-[11px] border px-[14px] text-[12px] font-bold transition-colors"
              style={filtreler.bugun
                ? { background: C.violet, borderColor: C.violet, color: 'white' }
                : { borderColor: C.line, background: 'white', color: '#334155' }
              }
            >
              Bugün Aranacak
            </button>
            {aktifFiltreSayisi > 0 && (
              <button
                onClick={temizle}
                className="h-[35px] inline-flex items-center gap-1.5 rounded-[11px] border border-dashed px-[12px] text-[12px] text-slate-400 hover:text-slate-600 transition-colors"
                style={{ borderColor: C.line }}
              >
                <X size={11} />Temizle
              </button>
            )}
          </div>

          {/* Table */}
          <div className="rounded-[16px] border bg-white shadow-sm" style={{ borderColor: C.line }}>
            {/* Horizontally scrollable table area */}
            <div className="overflow-x-auto">
              <div className="min-w-[960px]">
                {/* Table header */}
                <div
                  className={`grid ${GRID} items-center h-[45px] px-[15px] border-b text-[11px] font-black text-slate-500 uppercase tracking-wide`}
                  style={{ borderColor: C.line }}
                >
                  <div><input type="checkbox" className="h-4 w-4 rounded border-slate-300" /></div>
                  <div>Firma / İletişim</div>
                  <div>Sektör</div>
                  <div>Aşama</div>
                  <div>Öncelik</div>
                  <div>Son Etkileşim</div>
                  <div>Temsilci</div>
                  <div>Ali Skoru</div>
                  <div>Aksiyon</div>
                </div>

                {/* Rows */}
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: C.violet, borderTopColor: 'transparent' }} />
                  </div>
                ) : error ? (
                  <div className="py-12 text-center text-sm text-red-500">{error}</div>
                ) : records.length === 0 ? (
                  <div className="py-16 text-center">
                    {aktifFiltreSayisi > 0 ? (
                      <>
                        <p className="text-sm text-gray-400">Bu kriterde firma bulunamadı</p>
                        <button onClick={temizle} className="mt-2 text-xs hover:underline" style={{ color: C.violet }}>
                          Filtreleri temizle
                        </button>
                      </>
                    ) : izin.tip === 'temsilci' ? (
                      <>
                        <p className="text-sm font-semibold text-slate-500">Henüz size atanmış firma yok</p>
                        <p className="mt-1 text-xs text-slate-400">Portföy ataması için yöneticinizle iletişime geçin.</p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400">Portföyde henüz firma yok</p>
                    )}
                  </div>
                ) : (
                  (() => {
                    const siralanmis = [...records].sort((a, b) => {
                      const ka = KATEGORI_SIRA[getKategori(a.fields)]
                      const kb = KATEGORI_SIRA[getKategori(b.fields)]
                      if (ka !== kb) return ka - kb
                      const sa = a.fields['Pipeline Aşaması'] === 'Randevu' ? 11 : (a.fields['Sıcaklık Skoru'] ?? 0)
                      const sb = b.fields['Pipeline Aşaması'] === 'Randevu' ? 11 : (b.fields['Sıcaklık Skoru'] ?? 0)
                      return sb - sa
                    })
                    const gruplar: Array<{ kat: Kategori; items: typeof siralanmis }> = []
                    for (const r of siralanmis) {
                      const kat = getKategori(r.fields)
                      if (!gruplar.length || gruplar[gruplar.length - 1].kat !== kat) {
                        gruplar.push({ kat, items: [r] })
                      } else {
                        gruplar[gruplar.length - 1].items.push(r)
                      }
                    }
                    return gruplar.map(({ kat, items }) => (
                      <div key={kat}>
                        {GRUP_CFG[kat] && (
                          <div
                            className="flex items-center gap-[8px] px-[15px] py-[7px] border-b border-l-[5px]"
                            style={{ borderBottomColor: C.line, borderLeftColor: GRUP_CFG[kat]!.color, background: '#F8FAFC' }}
                          >
                            <span className="text-[10px] font-black uppercase tracking-[.15em]"
                              style={{ color: GRUP_CFG[kat]!.color }}>
                              {GRUP_CFG[kat]!.emoji} {GRUP_CFG[kat]!.label}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">{items.length}</span>
                          </div>
                        )}
                        {items.map(r => (
                          <FirmaSatir
                            key={r.id}
                            record={r}
                            showTemsilci={showTemsilci}
                            izin={izin}
                            onClick={() => setModalId(r.id)}
                            onAksiyon={handleAksiyon}
                            onNotEkle={handleNotEkle}
                            onAjandayaEkle={handleAjandayaEkle}
                          />
                        ))}
                      </div>
                    ))
                  })()
                )}
              </div>
            </div>

            {/* Bottom bar — outside scroll wrapper, full width */}
            <div
              className="h-[55px] flex items-center justify-between px-[18px] border-t text-[12px]"
              style={{ borderColor: C.line, color: C.text }}
            >
              <div className="text-slate-500">
                {statsLoading ? '…' : stats ? (
                  <><span className="font-semibold">{stats.total.toLocaleString('tr-TR')}</span> firma</>
                ) : null}
              </div>
              {offset && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="h-[31px] rounded-[8px] border px-[14px] text-[12px] font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
                  style={{ borderColor: C.line }}
                >
                  {loadingMore ? 'Yükleniyor…' : 'Daha fazla →'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Right rail ──────────────────────────────────────────────────── */}
        {railAcik && (
        <div className="space-y-[14px] min-w-0">

          {/* Ali Asistan card */}
          <section className="rounded-[18px] border bg-white p-[18px] shadow-sm" style={{ borderColor: C.line }}>
            <div className="flex items-center justify-between">
              <div className="text-[11px] tracking-[.17em] font-black" style={{ color: isEmlak ? '#1B7A47' : C.bordo }}>
                ALİ ASİSTANIN
              </div>
              <button
                onClick={() => setRailAcik(false)}
                className="h-[26px] w-[26px] rounded-[8px] border grid place-items-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                style={{ borderColor: C.line }}
                title="Paneli kapat"
              >
                <X size={12} />
              </button>
            </div>
            <h2 className="mt-[8px] text-[28px] font-black leading-none" style={{ color: C.text }}>Ali</h2>
            <div className="mt-[18px] flex justify-center">
              <div className="relative h-[110px] w-[110px]">
                <div className="absolute inset-[-7px] rounded-full opacity-60 blur-xl"
                  style={{ background: isEmlak ? 'linear-gradient(135deg,#2c8a52,#8c97d8)' : `linear-gradient(135deg, ${C.violet}, ${C.pink})` }} />
                <div className="absolute inset-0 rounded-full p-[4px]"
                  style={{ background: isEmlak ? 'linear-gradient(135deg,#2c8a52,#4f9f6c 44%,#8c97d8)' : `linear-gradient(135deg, #BCA8FF, ${C.violet}, ${C.bordo})` }}>
                  <div className="h-full w-full rounded-full overflow-hidden">
                    <Image src="/ali-avatar.png" alt="Ali" width={102} height={102}
                      className="h-full w-full object-cover rounded-full" />
                  </div>
                </div>
                <div className="absolute bottom-[6px] right-[5px] h-[19px] w-[19px] rounded-full border-[4px] border-white"
                  style={{ background: isEmlak ? '#2c8a52' : C.violet }} />
              </div>
            </div>
            <div className="mt-[18px] inline-flex items-center gap-[8px] rounded-full px-[12px] py-[6px] text-[13px] font-bold text-white"
              style={{ background: C.navy }}>
              <span className="h-[8px] w-[8px] rounded-full bg-emerald-400" />Çevrimiçi
            </div>
            <p className="mt-[14px] text-[13px] leading-[22px] text-slate-600">
              Portföyünle ilgili önerilerim ve uyarılarım yanında.
            </p>
            <button
              className="mt-[16px] h-[42px] w-full rounded-[12px] text-[13px] font-black text-white shadow-sm"
              style={{ background: isEmlak ? '#1B7A47' : C.bordo }}
            >
              Ali ile sohbet et →
            </button>
          </section>

          {/* Hızlı Filtreler */}
          <section className="rounded-[18px] border bg-white p-[18px] shadow-sm" style={{ borderColor: C.line }}>
            <h3 className="font-black text-[14px]" style={{ color: C.text }}>Hızlı Filtreler</h3>
            <div className="mt-[14px] grid grid-cols-2 gap-[10px]">
              {([
                { Icon: Flame,         n: sicakKpi,             label: 'Sıcak',           color: isEmlak ? '#1B7A47' : C.bordo,  onClick: () => setFiltreler(f => ({ ...f, oncelik: 'Yüksek' })) },
                { Icon: Clock3,        n: counts.bugunAranacak, label: 'Bugün aranacak',  color: isEmlak ? '#2c8a52' : C.violet, onClick: () => setFiltreler(f => ({ ...f, bugun: true })) },
                { Icon: CalendarDays,  n: vade30 ?? '—',        label: 'Vadesi yaklaşan', color: isEmlak ? '#2c8a52' : C.violet, yakinda: true as const },
                { Icon: AlertTriangle, n: counts.yenilemeriski, label: 'Riskli',          color: C.red,                          yakinda: true as const },
              ]).map(({ Icon, n, label, color, ...rest }) => {
                const yakinda = 'yakinda' in rest && rest.yakinda
                const onClick  = 'onClick'  in rest ? rest.onClick as () => void : undefined
                return (
                  <div key={label}
                    onClick={!yakinda ? onClick : undefined}
                    className={`h-[58px] rounded-[12px] border bg-slate-50/50 p-[10px] transition-colors relative
                      ${!yakinda ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default'}`}
                    style={{ borderColor: C.line }}
                  >
                    {yakinda && (
                      <span className="absolute top-[6px] right-[7px] rounded-full bg-slate-100 px-[6px] py-[1px] text-[8px] font-bold text-slate-400">
                        Yakında
                      </span>
                    )}
                    <div className="flex items-center gap-[8px]">
                      <Icon size={15} style={{ color }} />
                      <b className="text-[14px] font-black" style={{ color: C.text }}>{n}</b>
                    </div>
                    <div className="mt-[3px] text-[10px] text-slate-500">{label}</div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Branş Dağılımı (sigortan only) */}
          {!isEmlak && <section className="rounded-[18px] border bg-white p-[18px] shadow-sm" style={{ borderColor: C.line }}>
            <h3 className="font-black text-[14px]" style={{ color: C.text }}>Branş Dağılımı</h3>
            {branchSum > 0 ? (
              <div className="mt-[15px] flex items-center gap-[15px]">
                <div
                  className="relative h-[100px] w-[100px] rounded-full shrink-0"
                  style={{
                    background: `conic-gradient(${C.bordo} 0 ${saglikPct}%, ${C.violet} ${saglikPct}% ${saglikPct + elemPct}%, #B36BE3 ${saglikPct + elemPct}% 100%)`,
                  }}
                >
                  <div className="absolute inset-[20px] rounded-full bg-white grid place-items-center text-center">
                    <div>
                      <div className="text-[15px] font-black leading-none">{branchSum}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">Toplam</div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-[9px] text-[11px]">
                  {[
                    { label: 'Sağlık',    pct: saglikPct, color: C.bordo   },
                    { label: 'Elementer', pct: elemPct,   color: C.violet  },
                    { label: 'Acıbadem', pct: acibadPct, color: '#B36BE3' },
                  ].map(({ label, pct, color }) => (
                    <div key={label} className="flex items-center gap-[6px]">
                      <span className="h-[8px] w-[8px] rounded-full shrink-0" style={{ background: color }} />
                      <span className="flex-1 text-slate-600">{label}</span>
                      <b>%{pct}</b>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 py-6 text-center">
                <p className="text-xs text-slate-400">Veri yükleniyor…</p>
              </div>
            )}
          </section>}

          {/* Brand card (sigortan only) */}
          {!isEmlak && (
          <section
            className="h-[164px] rounded-[18px] p-[22px] text-white overflow-hidden relative shadow-sm"
            style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.bordo})` }}
          >
            <div className="absolute right-[-64px] bottom-[-76px] h-[210px] w-[210px] rounded-full border border-white/20 pointer-events-none" />
            <div className="text-[22px] font-black">alisales.ai</div>
            <p className="mt-[24px] text-[14px] leading-[22px] text-white/85">
              Bağımsız sigortacılığın yeni nesli.
            </p>
          </section>
          )}
        </div>
        )}
      </div>

      <FirmaModal recordId={modalId} izin={izin} onClose={() => setModalId(null)} isAdmin={isAdmin} />

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3
          px-4 py-3 rounded-2xl shadow-xl text-sm
          ${toast.hataMi ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}
        >
          <span className="truncate max-w-xs">{toast.mesaj}</span>
          {!toast.hataMi && toast.undoRecordId && toast.undoFields && (
            <button
              onClick={handleUndo}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-medium transition-colors shrink-0"
            >
              <Undo2 size={11} />Geri al
            </button>
          )}
          <button
            onClick={() => { setToast(null); if (toastTimer.current) clearTimeout(toastTimer.current) }}
            className="text-white/60 hover:text-white transition-colors shrink-0"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

function KpiCard({
  title, value, sub, Icon, tone, yakinda = false,
}: {
  title: string
  value: string
  sub: string
  Icon: LucideIcon
  tone: 'chart' | 'red' | 'violet' | 'bordo'
  yakinda?: boolean
}) {
  const iconBg    = tone === 'red' ? '#FFF0F3' : tone === 'bordo' ? '#F8E9EF' : C.lavender
  const iconColor = tone === 'red' ? C.red     : tone === 'bordo' ? C.bordo  : C.violet
  return (
    <div className="min-h-[104px] rounded-[15px] border bg-white p-[17px] shadow-sm" style={{ borderColor: C.line }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-[6px] text-[13px] font-bold" style={{ color: C.text }}>
            {title}<Info size={13} className="text-slate-400" />
          </div>
          <div
            className="mt-[10px] text-[27px] leading-none font-black tracking-[-.035em]"
            style={{ color: yakinda ? '#94A3B8' : C.text }}
          >
            {value}
          </div>
        </div>
        <div className="h-[48px] w-[48px] rounded-full grid place-items-center"
          style={{ background: iconBg, color: iconColor }}>
          <Icon size={21} />
        </div>
      </div>
      <div className="mt-[10px]">
        <span className="text-[12px] text-slate-500">{sub}</span>
      </div>
    </div>
  )
}

function FilterPill({
  label, value, onChange, options, optionLabels = {},
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  optionLabels?: Record<string, string>
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-[35px] rounded-[11px] border px-[14px] text-[12px] font-bold cursor-pointer focus:outline-none transition-colors appearance-none"
      style={value
        ? { background: C.violet, borderColor: C.violet, color: 'white' }
        : { borderColor: C.line, background: 'white', color: '#334155' }
      }
    >
      <option value="">{label}</option>
      {options.map(o => <option key={o} value={o}>{optionLabels[o] ?? o}</option>)}
    </select>
  )
}
