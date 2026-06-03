'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Image from 'next/image'
import type { LucideIcon } from 'lucide-react'
import {
  DndContext, DragOverlay,
  MouseSensor, TouchSensor,
  useSensor, useSensors,
  useDroppable, useDraggable,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import {
  Flame, Sparkles, BarChart3, AlertTriangle, CalendarDays,
  FileText, MessageSquare, X, Undo2,
  PanelRightClose, PanelRightOpen, Filter, Grid2X2, List,
  CheckCircle2,
} from 'lucide-react'
import { PIPELINE_ASAMALARI, type AirtableRecord, type FirmaKart } from '@/lib/airtable'
import { type MusterilerIzin } from '@/lib/musteriler-izin'
import { TEMSILCI_RENK, TEMSILCI_RENK_FALLBACK } from '@/lib/temsilciler'
import { FirmaModal } from '../../musteriler/_components/firma-modal'
import { useRouter } from 'next/navigation'

/* ─── Renkler ─────────────────────────────────────────────────────── */
const C = {
  navy:    '#061f3d',
  violet:  '#5B38E8',
  bordo:   '#982A49',
  pink:    '#D978B6',
  lavender:'#F2EEFF',
  line:    '#E7EAF2',
  text:    '#071B3A',
  red:     '#FF445F',
  green:   '#1BA56A',
  gray:    '#8B93A3',
  magenta: '#E62164',
}

/* Stage ek metadata (renk + tint mockup ile uyumlu) */
const STAGE_META: Record<string, { tint: string; colColor: string; colColor2: string; no: number }> = {
  'Ulaşılamadı':  { tint: '#FFF3F6', colColor: C.bordo,   colColor2: C.bordo,   no: 1 },
  'Yanıt Alındı': { tint: '#F0EEFF', colColor: C.violet,  colColor2: C.violet,  no: 2 },
  'Randevu':      { tint: '#FFF0F6', colColor: C.magenta, colColor2: C.magenta, no: 3 },
  'Teklif':       { tint: '#EEE9FF', colColor: '#4B1FB4', colColor2: '#8425A8', no: 4 },
  'Müzakere':     { tint: '#F5EEFF', colColor: '#9333EA', colColor2: '#7C3AED', no: 5 },
  'Kazanıldı':    { tint: '#EDFBF4', colColor: C.green,   colColor2: '#0E8F59', no: 6 },
  'Kaybedildi':   { tint: '#F4F5F8', colColor: C.gray,    colColor2: C.gray,    no: 7 },
}

/* ─── Tipler ──────────────────────────────────────────────────────── */
interface ColState {
  records: AirtableRecord<FirmaKart>[]
  offset?: string
  loadingMore?: boolean
}

interface UndoItem {
  key: number
  record: AirtableRecord<FirmaKart>
  fromAsama: string
  toAsama: string
  timeoutId: ReturnType<typeof setTimeout>
}

export interface InitialColumn {
  value: string
  label: string
  color: string
  muted?: boolean
  records: AirtableRecord<FirmaKart>[]
  offset?: string
}

/* ─── Kart içeriği ────────────────────────────────────────────────── */
function CardContent({
  record, asama = '', overlay = false,
}: { record: AirtableRecord<FirmaKart>; asama?: string; overlay?: boolean }) {
  const f = record.fields
  const isYuksek  = f['Öncelik'] === 'Yüksek'
  const temsilci  = f['Atanan Temsilci']
  const branslar  = f['Branş'] ?? []
  const skor      = f['Sıcaklık Skoru']
  const isKazandi = asama === 'Kazanıldı'

  const temRenk = TEMSILCI_RENK[temsilci ?? ''] ?? TEMSILCI_RENK_FALLBACK

  const tagColors: Record<string, [string, string]> = {
    'Sağlık':    [C.violet, C.lavender],
    'Elementer': ['#1A56DB', '#EBF5FF'],
    'Acıbadem':  [C.bordo,  '#FFF3F6'],
  }

  return (
    <div className={`rounded-[10px] border bg-white p-[10px] shadow-sm min-h-[80px] transition-shadow
      ${isYuksek ? '' : 'border-[#E7EAF2]'}
      ${overlay ? 'shadow-2xl rotate-1 scale-105' : 'hover:shadow-md'}`}
      style={isYuksek ? { borderColor: C.violet } : {}}
    >
      {/* Başlık */}
      <div className="flex items-start justify-between gap-[8px]">
        <h4 className="text-[11px] leading-[15px] font-black uppercase" style={{ color: C.text }}>
          {f['Firma Adı'] ?? 'İsimsiz'}
        </h4>
        {isKazandi ? (
          <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
        ) : skor != null && skor >= 7 ? (
          <span className="rounded-full bg-red-50 px-[7px] py-[3px] text-[9px] font-black text-red-500 shrink-0 whitespace-nowrap">
            🔥 {skor}
          </span>
        ) : isYuksek ? (
          <span className="rounded-[5px] px-[6px] py-[2px] text-[9px] font-black shrink-0"
            style={{ background: C.lavender, color: C.violet }}>↑ YÜKSEK</span>
        ) : null}
      </div>

      {/* Rozet etiketler */}
      <div className="mt-[7px] flex flex-wrap gap-[4px]">
        {f['Sektör'] && (
          <span className="rounded-[5px] px-[7px] py-[3px] text-[10px] font-bold bg-slate-100 text-slate-500">
            {f['Sektör']}
          </span>
        )}
        {branslar.map(b => {
          const [fg, bg] = tagColors[b] ?? [C.violet, C.lavender]
          return (
            <span key={b} className="rounded-[5px] px-[7px] py-[3px] text-[10px] font-bold"
              style={{ background: bg, color: fg }}>
              {b}
            </span>
          )
        })}
        {f['Vade Ayı Grubu'] && (
          <span className="rounded-[5px] px-[7px] py-[3px] text-[10px] font-bold bg-blue-50 text-blue-600">
            {f['Vade Ayı Grubu']}
          </span>
        )}
      </div>

      {/* Temsilci */}
      {temsilci && temsilci !== 'SIGORTAN BIZ' && (
        <div className="mt-[8px] flex items-center gap-[5px]">
          <span className="h-[16px] w-[16px] rounded-full grid place-items-center text-[8px] font-black text-white"
            style={{ background: temRenk }}>
            {temsilci[0]}
          </span>
          <span className="text-[10px] text-slate-500">{temsilci}</span>
        </div>
      )}

      {/* Teklif aşamasında progress bar */}
      {asama === 'Teklif' && asama && (
        <div className="mt-[8px] h-[4px] rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full w-[70%] rounded-full"
            style={{ background: `linear-gradient(90deg, ${C.violet}, ${C.bordo})` }} />
        </div>
      )}
    </div>
  )
}

/* ─── Draggable kart ──────────────────────────────────────────────── */
function DraggableCard({
  record, asama, onClick,
}: { record: AirtableRecord<FirmaKart>; asama: string; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: record.id })
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      onClick={onClick}
      className={`cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? 'opacity-30' : ''}`}>
      <CardContent record={record} asama={asama} />
    </div>
  )
}

/* ─── Stage özet kartı ────────────────────────────────────────────── */
function StageSummary({ asama, label, color, count, no, tint }: {
  asama: string; label: string; color: string
  count: number | null; no: number; tint: string
}) {
  return (
    <div className="h-[72px] rounded-[13px] border px-[13px] flex items-center gap-[12px]"
      style={{ borderColor: `${color}30`, background: `linear-gradient(135deg, ${tint}, #fff)` }}>
      <div className="h-[34px] w-[34px] rounded-[9px] text-white grid place-items-center text-[16px] font-black shadow-sm shrink-0"
        style={{ background: color }}>
        {no}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-black truncate" style={{ color: C.text }}>{label}</div>
        <div className="mt-[3px] text-[20px] font-black leading-none" style={{ color }}>
          {count == null ? '—' : count}
        </div>
      </div>
    </div>
  )
}

/* ─── Droppable kolon ─────────────────────────────────────────────── */
function DroppableColumn({
  asama, label, color, muted, colState, count, onLoadMore, onCardClick,
}: {
  asama: string; label: string; color: string; muted?: boolean
  colState: ColState; count: number | null
  onLoadMore: (asama: string) => void
  onCardClick: (recordId: string) => void
}) {
  const { isOver, setNodeRef } = useDroppable({ id: asama })
  const meta = STAGE_META[asama] ?? { tint: '#F5F3FF', colColor: color, colColor2: color, no: 1 }

  return (
    <div className="flex flex-col h-full"
      style={{ width: 'clamp(248px, 80vw, 268px)', scrollSnapAlign: 'start', opacity: muted ? 0.55 : 1 }}>
      {/* Kolon başlığı */}
      <div className="h-[52px] rounded-t-[12px] px-[12px] text-white flex items-center justify-between shrink-0"
        style={{ background: `linear-gradient(105deg, ${meta.colColor}, ${meta.colColor2})` }}>
        <div>
          <div className="text-[12px] font-black leading-tight">
            {meta.no}. {label}
            <span className="opacity-75 ml-1">({count == null ? '…' : count})</span>
          </div>
        </div>
      </div>

      {/* Kart alanı */}
      <div ref={setNodeRef}
        className="flex-1 rounded-b-[12px] flex flex-col overflow-hidden transition-colors"
        style={{ background: isOver ? '#EDE9FE' : meta.tint, minHeight: 0 }}>
        <div className="flex-1 overflow-y-auto space-y-[7px] p-[8px]">
          {colState.records.length === 0 && (
            <p className="text-[11px] text-slate-400 text-center pt-6">Bu aşamada firma yok</p>
          )}
          {colState.records.map(r => (
            <DraggableCard key={r.id} record={r} asama={asama} onClick={() => onCardClick(r.id)} />
          ))}
          {colState.offset && (
            <button onClick={() => onLoadMore(asama)} disabled={colState.loadingMore}
              className="w-full text-[11px] text-slate-500 hover:text-slate-700 py-2 rounded-[9px] border border-dashed hover:border-slate-300 transition-colors disabled:opacity-50"
              style={{ borderColor: C.line }}>
              {colState.loadingMore ? 'Yükleniyor…' : 'Daha fazla göster'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Smart öneri kartı (stub) ────────────────────────────────────── */
function SmartCard({ Icon, title, body, cta, color }: {
  Icon: LucideIcon; title: string; body: string; cta: string; color: string
}) {
  return (
    <div className="rounded-[13px] border bg-white p-[15px] flex gap-[13px]" style={{ borderColor: C.line }}>
      <div className="h-[40px] w-[40px] rounded-[12px] grid place-items-center shrink-0"
        style={{ background: `${color}15`, color }}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-black" style={{ color }}>{title}</div>
        <div className="mt-[5px] text-[11px] text-slate-500 leading-[16px]">{body}</div>
        <button className="mt-[9px] float-right rounded-[8px] bg-slate-50 px-[10px] py-[5px] text-[10px] font-black text-slate-600">
          {cta}
        </button>
      </div>
    </div>
  )
}

/* ─── Ana board ───────────────────────────────────────────────────── */
export function KanbanBoard({
  initialColumns,
  izin,
  initialModalId,
  isAdmin,
}: {
  initialColumns: InitialColumn[]
  izin?: Exclude<MusterilerIzin, { tip: 'yok' }>
  initialModalId?: string
  isAdmin?: boolean
}) {
  const [cols, setCols] = useState<Record<string, ColState>>(() => {
    const map: Record<string, ColState> = {}
    for (const c of initialColumns) map[c.value] = { records: c.records, offset: c.offset }
    return map
  })

  const [counts, setCounts] = useState<Record<string, number | null>>(() => {
    const map: Record<string, number | null> = {}
    for (const c of initialColumns) map[c.value] = null
    return map
  })

  const [activeRecord, setActiveRecord] = useState<AirtableRecord<FirmaKart> | null>(null)
  const [undo, setUndo]     = useState<UndoItem | null>(null)
  const [error, setError]   = useState<string | null>(null)
  const [railAcik, setRailAcik] = useState(true)
  const [modalId, setModalId]   = useState<string | null>(initialModalId ?? null)
  const [filterAcik, setFilterAcik] = useState(false)
  const [kFilter, setKFilter] = useState({ temsilci: '', sicaklik: '', brans: '' })
  const filterBtnRef = useRef<HTMLDivElement>(null)
  const undoKeyRef = useRef(0)
  const router = useRouter()

  // Dışarı tıklama → popover kapat
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (filterAcik && !filterBtnRef.current?.contains(e.target as Node)) setFilterAcik(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [filterAcik])

  // Ekrandaki kartlardan benzersiz temsilciler
  const temsilciler = useMemo(() => {
    const set = new Set<string>()
    for (const col of initialColumns) {
      for (const r of col.records) {
        const t = r.fields['Atanan Temsilci']
        if (t && t !== 'SIGORTAN BIZ') set.add(t)
      }
    }
    return [...set].sort()
  }, [initialColumns])

  const BRANSLAR = ['Sağlık', 'Elementer', 'Acıbadem']

  // Client-side filter uygula (cols state'ini değiştirmez)
  const filteredCols = useMemo(() => {
    const result: Record<string, ColState> = {}
    for (const [asama, col] of Object.entries(cols)) {
      let records = col.records
      if (kFilter.temsilci) records = records.filter(r => r.fields['Atanan Temsilci'] === kFilter.temsilci)
      if (kFilter.sicaklik === 'sicak') records = records.filter(r => (r.fields['Sıcaklık Skoru'] ?? 0) >= 7)
      else if (kFilter.sicaklik === 'soguk') records = records.filter(r => (r.fields['Sıcaklık Skoru'] ?? 0) < 4)
      if (kFilter.brans) records = records.filter(r => (r.fields['Branş'] ?? []).includes(kFilter.brans))
      result[asama] = { ...col, records }
    }
    return result
  }, [cols, kFilter])

  const aktifFilterSayisi = [kFilter.temsilci, kFilter.sicaklik, kFilter.brans].filter(Boolean).length

  useEffect(() => {
    if (initialModalId && /^rec[A-Za-z0-9]+$/.test(initialModalId)) setModalId(initialModalId)
  }, [initialModalId])

  function openModal(id: string) {
    setModalId(id)
    router.replace(`/satis-sureci?modal=${id}`, { scroll: false })
  }
  function closeModal() {
    setModalId(null)
    router.replace('/satis-sureci', { scroll: false })
  }

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor,  { activationConstraint: { delay: 250, tolerance: 8 } }),
  )

  /* count fetch */
  useEffect(() => {
    for (const { value } of PIPELINE_ASAMALARI) {
      fetch(`/api/kanban/count?asama=${encodeURIComponent(value)}`)
        .then(r => r.json())
        .then(d => { if (typeof d.count === 'number') setCounts(prev => ({ ...prev, [value]: d.count })) })
        .catch(() => {})
    }
  }, [])

  /* load more */
  const handleLoadMore = useCallback(async (asama: string) => {
    const col = cols[asama]
    if (!col?.offset || col.loadingMore) return
    setCols(prev => ({ ...prev, [asama]: { ...prev[asama], loadingMore: true } }))
    try {
      const res = await fetch(`/api/kanban/more?asama=${encodeURIComponent(asama)}&offset=${encodeURIComponent(col.offset!)}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCols(prev => ({
        ...prev,
        [asama]: { records: [...prev[asama].records, ...data.records], offset: data.offset, loadingMore: false },
      }))
    } catch {
      setCols(prev => ({ ...prev, [asama]: { ...prev[asama], loadingMore: false } }))
    }
  }, [cols])

  /* drag */
  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string
    for (const col of Object.values(cols)) {
      const rec = col.records.find(r => r.id === id)
      if (rec) { setActiveRecord(rec); return }
    }
  }

  function moveRecord(recordId: string, toAsama: string) {
    let found: { record: AirtableRecord<FirmaKart>; fromAsama: string } | null = null
    setCols(prev => {
      let fromAsama: string | null = null
      let rec: AirtableRecord<FirmaKart> | null = null
      for (const [asama, col] of Object.entries(prev)) {
        const idx = col.records.findIndex(r => r.id === recordId)
        if (idx !== -1) { fromAsama = asama; rec = col.records[idx]; break }
      }
      if (!fromAsama || !rec || fromAsama === toAsama) return prev
      found = { record: rec, fromAsama }
      return {
        ...prev,
        [fromAsama]: { ...prev[fromAsama], records: prev[fromAsama].records.filter(r => r.id !== recordId) },
        [toAsama]:   { ...prev[toAsama],   records: [rec, ...prev[toAsama].records] },
      }
    })
    return found
  }

  function revertRecord(record: AirtableRecord<FirmaKart>, fromAsama: string, toAsama: string) {
    setCols(prev => ({
      ...prev,
      [toAsama]:   { ...prev[toAsama],   records: prev[toAsama].records.filter(r => r.id !== record.id) },
      [fromAsama]: { ...prev[fromAsama], records: [record, ...prev[fromAsama].records] },
    }))
  }

  function adjustCount(fromAsama: string, toAsama: string, dir: 1 | -1) {
    setCounts(prev => {
      const next = { ...prev }
      if (next[fromAsama] != null) next[fromAsama] = next[fromAsama]! - dir
      if (next[toAsama]   != null) next[toAsama]   = next[toAsama]!   + dir
      return next
    })
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveRecord(null)
    const { active, over } = event
    if (!over) return
    const recordId = active.id as string
    const toAsama  = over.id  as string
    const result = moveRecord(recordId, toAsama)
    if (!result) return
    const { record, fromAsama } = result
    adjustCount(fromAsama, toAsama, 1)
    if (undo) clearTimeout(undo.timeoutId)
    const key = ++undoKeyRef.current
    const timeoutId = setTimeout(() => setUndo(u => u?.key === key ? null : u), 6000)
    setUndo({ key, record, fromAsama, toAsama, timeoutId })
    try {
      const res = await fetch('/api/kanban/move', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId, asama: toAsama }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
    } catch {
      revertRecord(record, fromAsama, toAsama)
      adjustCount(toAsama, fromAsama, 1)
      if (undo?.key === key) { clearTimeout(timeoutId); setUndo(null) }
      setError('Kaydedilemedi, tekrar dene.')
      setTimeout(() => setError(null), 4000)
    }
  }

  async function handleUndo() {
    if (!undo) return
    const { record, fromAsama, toAsama, timeoutId } = undo
    clearTimeout(timeoutId)
    setUndo(null)
    revertRecord(record, fromAsama, toAsama)
    adjustCount(toAsama, fromAsama, 1)
    try {
      const res = await fetch('/api/kanban/move', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: record.id, asama: fromAsama }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setError('Geri alma başarısız. Sayfayı yenile.')
      setTimeout(() => setError(null), 5000)
    }
  }

  /* Performans donut: counts'tan hesapla */
  const countValues = PIPELINE_ASAMALARI.map(a => counts[a.value] ?? 0)
  const totalCount  = countValues.reduce((s, n) => s + n, 0)
  const donutStages = PIPELINE_ASAMALARI.slice(0, 4).map((a, i) => ({
    label: a.label,
    pct:   totalCount > 0 ? Math.round((countValues[i] / totalCount) * 100) : 0,
    color: STAGE_META[a.value]?.colColor ?? a.color,
  }))
  let donutAccum = 0
  const donutGradParts = donutStages.map(s => {
    const part = `${s.color} ${donutAccum}% ${donutAccum + s.pct}%`
    donutAccum += s.pct
    return part
  })
  if (donutAccum < 100) donutGradParts.push(`#E7EAF2 ${donutAccum}% 100%`)
  const donutGrad = `conic-gradient(${donutGradParts.join(', ')})`

  const undoFirma = undo?.record.fields['Firma Adı'] ?? 'Firma'
  const undoTo    = PIPELINE_ASAMALARI.find(a => a.value === undo?.toAsama)?.label ?? ''

  /* ─── render ──────────────────────────────────────────────────── */
  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* ── Outer: full-height flex row (main + rail) ──────────────── */}
      <div className="-mx-4 -my-4 sm:-mx-6 sm:-my-6 flex overflow-hidden bg-[#F7F8FC]"
          style={{ height: 'calc(100vh - 73px)' }}>

          {/* ── Sol / Ana kolon ───────────────────────────────────────── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

            {/* Sayfa başlığı */}
            <div className="shrink-0 px-5 sm:px-6 pt-4 pb-0">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-[14px]">
                <div>
                  <div className="flex items-center gap-[8px]">
                    <h1 className="text-[22px] font-black tracking-[-.02em]" style={{ color: C.text }}>
                      Satış Süreci
                    </h1>
                    <span className="rounded-full bg-emerald-50 px-[8px] py-[4px] text-[11px] font-bold text-emerald-700">
                      ● Canlı
                    </span>
                  </div>
                  <p className="mt-[4px] text-[12px] font-medium text-slate-400">
                    Pipeline · Kartları sürükleyerek aşamalar arasında taşıyabilirsiniz
                  </p>
                </div>
                <div className="flex items-center gap-[8px]">
                  <button className="h-[36px] w-[36px] rounded-[10px] border grid place-items-center"
                    style={{ borderColor: C.line, background: C.lavender, color: C.violet }}>
                    <List size={15} />
                  </button>
                  <button className="h-[36px] w-[36px] rounded-[10px] border bg-white grid place-items-center"
                    style={{ borderColor: C.line, color: '#94A3B8' }}>
                    <Grid2X2 size={15} />
                  </button>
                  <div ref={filterBtnRef} className="relative">
                    <button
                      onClick={() => setFilterAcik(v => !v)}
                      className="h-[36px] rounded-[10px] border bg-white px-[13px] text-[12px] font-bold flex items-center gap-[6px] transition-colors hover:bg-violet-50"
                      style={{ borderColor: filterAcik ? C.violet : C.line, color: filterAcik ? C.violet : C.text }}
                    >
                      <Filter size={13} />
                      Filtrele
                      {aktifFilterSayisi > 0 && (
                        <span className="ml-0.5 h-[16px] min-w-[16px] rounded-full text-[9px] font-black text-white grid place-items-center px-1"
                          style={{ background: C.violet }}>
                          {aktifFilterSayisi}
                        </span>
                      )}
                    </button>

                    {filterAcik && (
                      <div className="absolute right-0 top-[calc(100%+6px)] w-[220px] rounded-[14px] border bg-white shadow-lg z-30 p-[14px] space-y-[14px]"
                        style={{ borderColor: '#DDE1ED' }}>

                        {/* Temsilci */}
                        {temsilciler.length > 0 && (
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-[7px]">Temsilci</p>
                            <div className="space-y-[4px]">
                              {['', ...temsilciler].map(t => (
                                <button key={t || '__tumu'} onClick={() => setKFilter(f => ({ ...f, temsilci: t }))}
                                  className="w-full text-left text-[12px] px-[9px] py-[5px] rounded-[8px] font-medium transition-colors"
                                  style={{
                                    background: kFilter.temsilci === t ? C.lavender : 'transparent',
                                    color:      kFilter.temsilci === t ? C.violet : '#475569',
                                  }}>
                                  {t || 'Tümü'}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Sıcaklık */}
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-[7px]">Sıcaklık</p>
                          <div className="space-y-[4px]">
                            {[['', 'Tümü'], ['sicak', '🔥 Sıcak (skor ≥ 7)'], ['soguk', '❄️ Soğuk (skor < 4)']].map(([v, l]) => (
                              <button key={v || '__tumu'} onClick={() => setKFilter(f => ({ ...f, sicaklik: v }))}
                                className="w-full text-left text-[12px] px-[9px] py-[5px] rounded-[8px] font-medium transition-colors"
                                style={{
                                  background: kFilter.sicaklik === v ? C.lavender : 'transparent',
                                  color:      kFilter.sicaklik === v ? C.violet : '#475569',
                                }}>
                                {l}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Branş */}
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-[7px]">Branş</p>
                          <div className="space-y-[4px]">
                            {['', ...BRANSLAR].map(b => (
                              <button key={b || '__tumu'} onClick={() => setKFilter(f => ({ ...f, brans: b }))}
                                className="w-full text-left text-[12px] px-[9px] py-[5px] rounded-[8px] font-medium transition-colors"
                                style={{
                                  background: kFilter.brans === b ? C.lavender : 'transparent',
                                  color:      kFilter.brans === b ? C.violet : '#475569',
                                }}>
                                {b || 'Tümü'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Temizle */}
                        {aktifFilterSayisi > 0 && (
                          <button onClick={() => { setKFilter({ temsilci: '', sicaklik: '', brans: '' }); setFilterAcik(false) }}
                            className="w-full text-[11px] font-bold text-slate-400 hover:text-red-500 pt-[6px] border-t transition-colors"
                            style={{ borderColor: C.line }}>
                            Filtreleri temizle
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <button className="h-[36px] rounded-[10px] px-[16px] text-[12px] font-black text-white shadow-sm"
                    style={{ background: C.bordo }}>
                    + Yeni Fırsat
                  </button>
                  <button
                    onClick={() => setRailAcik(v => !v)}
                    title={railAcik ? 'Paneli kapat' : 'Paneli aç'}
                    className="h-[36px] w-[36px] rounded-[10px] border bg-white grid place-items-center transition-colors hover:bg-slate-50"
                    style={{ borderColor: C.line, color: railAcik ? C.violet : '#94A3B8' }}
                  >
                    {railAcik ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
                  </button>
                </div>
              </div>

              {/* Stage özet kartları */}
              <div className="grid grid-cols-4 xl:grid-cols-7 gap-[10px] mb-[14px]">
                {PIPELINE_ASAMALARI.map(col => {
                  const meta = STAGE_META[col.value] ?? { tint: '#F5F3FF', colColor: col.color, no: 1 }
                  return (
                    <StageSummary
                      key={col.value}
                      asama={col.value}
                      label={col.label}
                      color={meta.colColor}
                      count={counts[col.value]}
                      no={meta.no}
                      tint={meta.tint}
                    />
                  )
                })}
              </div>
            </div>

            {/* Kanban scroll area */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden min-w-0"
              style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
              <div className="flex gap-[10px] h-full px-5 sm:px-6 pb-4" style={{ minWidth: 'max-content' }}>
                {PIPELINE_ASAMALARI.map(col => (
                  <DroppableColumn
                    key={col.value}
                    asama={col.value}
                    label={col.label}
                    color={col.color}
                    muted={col.muted}
                    colState={filteredCols[col.value] ?? { records: [] }}
                    count={counts[col.value] ?? null}
                    onLoadMore={handleLoadMore}
                    onCardClick={izin ? openModal : () => {}}
                  />
                ))}
              </div>
            </div>

          </div>{/* Sol kolon */}

          {/* ── Sağ rail — tam yükseklik ──────────────────────────────── */}
          {railAcik && (
            <div className="w-[284px] shrink-0 border-l bg-white overflow-y-auto h-full"
              style={{ borderColor: C.line }}>
              <div className="p-[16px] space-y-[12px]">

                  {/* Ali Asistan */}
                  <section className="rounded-[16px] border bg-white p-[16px] shadow-sm" style={{ borderColor: C.line }}>
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] tracking-[.17em] font-black" style={{ color: C.bordo }}>
                        ALİ ASİSTAN
                      </div>
                      <button onClick={() => setRailAcik(false)}
                        className="h-[24px] w-[24px] rounded-[7px] border grid place-items-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                        style={{ borderColor: C.line }}>
                        <X size={11} />
                      </button>
                    </div>
                    <div className="mt-[12px] flex items-center gap-[14px]">
                      <div className="relative shrink-0 h-[72px] w-[72px]">
                        <div className="absolute inset-[-5px] rounded-full opacity-50 blur-lg"
                          style={{ background: `linear-gradient(135deg, ${C.violet}, ${C.pink})` }} />
                        <div className="absolute inset-0 rounded-full p-[3px]"
                          style={{ background: `linear-gradient(135deg, #BCA8FF, ${C.violet}, ${C.bordo})` }}>
                          <div className="h-full w-full rounded-full overflow-hidden">
                            <Image src="/ali-avatar.png" alt="Ali" width={66} height={66}
                              className="h-full w-full object-cover rounded-full" />
                          </div>
                        </div>
                        <div className="absolute bottom-[3px] right-[2px] h-[14px] w-[14px] rounded-full border-[3px] border-white"
                          style={{ background: C.violet }} />
                      </div>
                      <div>
                        <div className="text-[12px] font-black leading-[17px]" style={{ color: C.text }}>
                          Pipeline'ınızda<br />aktif takip var.
                        </div>
                        <button className="mt-[10px] h-[32px] rounded-[9px] px-[13px] text-[11px] font-black text-white"
                          style={{ background: C.bordo }}>
                          Önerileri gör →
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* Performans */}
                  <section className="rounded-[16px] border bg-white p-[16px] shadow-sm" style={{ borderColor: C.line }}>
                    <div className="flex items-center justify-between mb-[12px]">
                      <h3 className="font-black text-[13px]" style={{ color: C.text }}>Pipeline Dağılımı</h3>
                    </div>
                    <div className="flex items-center gap-[14px]">
                      <div className="relative h-[90px] w-[90px] rounded-full shrink-0"
                        style={{ background: donutGrad }}>
                        <div className="absolute inset-[18px] rounded-full bg-white grid place-items-center text-center">
                          <div>
                            <div className="text-[14px] font-black leading-none">{totalCount || '—'}</div>
                            <div className="text-[8px] text-slate-400 mt-0.5">Toplam</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 space-y-[7px] text-[10px]">
                        {donutStages.map(s => (
                          <div key={s.label} className="flex items-center gap-[5px]">
                            <span className="h-[7px] w-[7px] rounded-full shrink-0" style={{ background: s.color }} />
                            <span className="flex-1 text-slate-500 truncate">{s.label}</span>
                            <b className="tabular-nums">%{s.pct}</b>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  {/* Akıllı öneriler */}
                  <section className="rounded-[16px] border bg-white p-[16px] shadow-sm" style={{ borderColor: C.line }}>
                    <div className="flex items-center gap-[6px] mb-[12px]">
                      <Sparkles size={13} style={{ color: C.violet }} />
                      <h3 className="font-black text-[13px]" style={{ color: C.text }}>Akıllı Öneriler</h3>
                      <span className="rounded-full bg-violet-50 px-[7px] py-[2px] text-[9px] font-bold text-violet-700 ml-auto">
                        Yakında
                      </span>
                    </div>
                    <div className="space-y-[8px]">
                      {[
                        { Icon: Flame,          title: 'Yüksek potansiyel',   body: 'Teklif aşamasındaki firmalara odaklanın.',      cta: 'Görüntüle', color: C.red    },
                        { Icon: AlertTriangle,  title: 'Yenileme riski',      body: 'Süresi yaklaşan poliçeler için iletişim kurun.', cta: 'İncele',    color: C.red },
                        { Icon: CalendarDays,   title: 'Randevu hazırlığı',   body: 'Yaklaşan randevular için öneri alın.',           cta: 'Planla',    color: C.violet },
                        { Icon: BarChart3,      title: 'Cross-sell fırsatı',  body: 'Elementer teklifi uygun firmalar var.',          cta: 'Teklif',    color: C.violet },
                      ].map(s => (
                        <SmartCard key={s.title} {...s} />
                      ))}
                    </div>
                  </section>

                  {/* Günlük özet */}
                  <section className="rounded-[16px] border bg-white p-[16px] shadow-sm" style={{ borderColor: C.line }}>
                    <h3 className="font-black text-[13px] mb-[12px]" style={{ color: C.text }}>Günlük Özet</h3>
                    <div className="space-y-[12px]">
                      {[
                        { Icon: FileText,    text: 'Yeni teklifler',    sub: 'Bugün oluşturulan', color: C.violet },
                        { Icon: MessageSquare, text: 'Yanıt bekleyen', sub: 'Pipeline\'da aktif',  color: C.violet },
                        { Icon: CalendarDays,text: 'Randevular',       sub: 'Bu hafta planlı',    color: C.violet },
                        { Icon: AlertTriangle, text: 'Riskli fırsatlar', sub: 'Müzakere bekleyen', color: C.red },
                      ].map(({ Icon, text, sub, color }) => (
                        <div key={text} className="flex gap-[10px] items-center">
                          <div className="h-[30px] w-[30px] rounded-[9px] grid place-items-center shrink-0"
                            style={{ background: `${color}12`, color }}>
                            <Icon size={14} />
                          </div>
                          <div>
                            <div className="text-[11px] font-black" style={{ color: C.text }}>{text}</div>
                            <div className="text-[10px] text-slate-400">{sub}</div>
                          </div>
                          <span className="ml-auto text-[10px] font-bold rounded-full bg-slate-100 px-[7px] py-[2px] text-slate-400">
                            —
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Brand */}
                  <section className="h-[120px] rounded-[16px] p-[18px] text-white overflow-hidden relative shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.bordo})` }}>
                    <div className="absolute right-[-40px] bottom-[-50px] h-[150px] w-[150px] rounded-full border border-white/20 pointer-events-none" />
                    <div className="text-[18px] font-black">alisales.ai</div>
                    <p className="mt-[12px] text-[12px] leading-[18px] text-white/80">
                      Bağımsız sigortacılığın yeni nesli.
                    </p>
                  </section>

                </div>
            </div>
          )}{/* sağ rail */}

        </div>{/* outer flex row */}

        <DragOverlay dropAnimation={null}>
          {activeRecord && (
            <div style={{ width: 248 }}>
              <CardContent record={activeRecord} overlay />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Undo toast */}
      {undo && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white text-sm px-4 py-3 rounded-2xl shadow-2xl max-w-sm w-full mx-4">
          <span className="flex-1 truncate text-xs">
            <span className="font-semibold">{undoFirma}</span>
            <span className="text-gray-400"> → {undoTo}</span>
          </span>
          <button onClick={handleUndo}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-medium transition-colors shrink-0">
            <Undo2 size={11} />Geri al
          </button>
          <button onClick={() => { clearTimeout(undo.timeoutId); setUndo(null) }}
            className="text-white/60 hover:text-white text-xs shrink-0 transition-colors">
            <X size={12} />
          </button>
        </div>
      )}

      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-xs px-4 py-3 rounded-2xl shadow-2xl">
          {error}
        </div>
      )}

      {modalId && izin && (
        <FirmaModal recordId={modalId} izin={izin} onClose={closeModal} isAdmin={isAdmin} />
      )}
    </>
  )
}
