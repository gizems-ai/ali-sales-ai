'use client'

import { useState, useRef, useEffect } from 'react'
import { useTenant } from '@/lib/tenant-context'
import {
  Flame, Phone, Mail,
  PhoneCall, PhoneOff, CalendarClock, CalendarCheck, CalendarX,
  MessageSquare, MoreHorizontal, Check, X as XIcon, Send,
} from 'lucide-react'
import { type FirmaListeItem, type AirtableRecord, PIPELINE_ASAMALARI } from '@/lib/airtable'
import { type MusterilerIzin } from '@/lib/musteriler-izin'

interface Props {
  record: AirtableRecord<FirmaListeItem>
  showTemsilci?: boolean
  izin?: Exclude<MusterilerIzin, { tip: 'yok' }>
  onClick?: () => void
  onAksiyon?: (recordId: string, fields: Record<string, unknown>, firmaAdi: string) => void
  onNotEkle?: (recordId: string, not: string, firmaAdi: string) => void
  onAjandadanCikar?: (recordId: string, firmaAdi: string) => void
  onAjandayaEkle?: (recordId: string, firmaAdi: string) => void
}

const C = {
  violet: '#5B38E8', bordo: '#982A49', pink: '#D978B6',
  line: '#E7EAF2', text: '#071B3A', lavender: '#F2EEFF',
  red: '#FF445F',
}

const BRANS_RENK = {
  saglik:    '#27ae60',
  elementer: '#e67e22',
  acibadem:  '#8e44ad',
  takip:     '#2980b9',
} as const

function normTR(s: string) {
  return s.toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
}

function getBransRenk(f: import('@/lib/airtable').FirmaListeItem): string {
  // 1. Takip: Sonra Ara Tarihi bu hafta
  const sonraAra = f['Sonra Ara Tarihi']
  if (sonraAra) {
    const today = new Date().toLocaleDateString('sv-SE')
    const week  = new Date(); week.setDate(week.getDate() + 7)
    if (sonraAra >= today && sonraAra <= week.toLocaleDateString('sv-SE')) return BRANS_RENK.takip
  }
  // 2. Acıbadem: Branş içeriyor (diğerlerinden önce)
  const bransArr = f['Branş'] ?? []
  if (bransArr.some(b => normTR(b).includes('acib'))) return BRANS_RENK.acibadem
  // 3+4+5. Sağlık / Cross-sell / Elementer
  const hasSaglik = Boolean(f['Sağlık Vade Tarihi'] || f['Sağlık Poliçe Türü'])
  const hasElem   = Boolean(f['Elementer Ürün'] || f['Elementer Vade'])
  if (hasSaglik) return BRANS_RENK.saglik  // cross-sell → Sağlık öncelikli
  if (hasElem)   return BRANS_RENK.elementer
  return C.line
}

const PIPELINE_COLOR: Record<string, string> = Object.fromEntries(
  PIPELINE_ASAMALARI.map(a => [a.value, a.color])
)

function formatSonEtkilesim(dateStr?: string): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000)
    if (diff === 0) return 'Bugün'
    if (diff === 1) return 'Dün'
    if (diff < 7) return `${diff} gün önce`
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
  } catch {
    return dateStr
  }
}

function ScoreRing({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score * 10))
  const color = score >= 7 ? C.bordo : score >= 4 ? C.violet : '#94A3B8'
  const label = score >= 7 ? 'Sıcak' : score >= 4 ? 'Orta' : 'Soğuk'
  return (
    <div className="flex items-center gap-[6px]">
      <div
        className="relative h-[36px] w-[36px] rounded-full grid place-items-center text-[11px] font-black"
        style={{ background: `conic-gradient(${color} 0 ${pct}%, #EEF1F7 ${pct}% 100%)` }}
      >
        <div className="absolute inset-[4px] rounded-full bg-white" />
        <span className="relative" style={{ color }}>{score}</span>
      </div>
      <span className="text-[10px] font-bold text-slate-500">{label}</span>
    </div>
  )
}

function PipelinePill({ asama }: { asama: string }) {
  const color = PIPELINE_COLOR[asama] ?? '#9CA3AF'
  return (
    <span
      className="inline-flex items-center px-[9px] py-[4px] rounded-[7px] text-[11px] font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {asama}
    </span>
  )
}

function PriorityPill({ value }: { value: string }) {
  const map: Record<string, [string, string]> = {
    'Yüksek': ['#B91C1C', '#FEE2E2'],
    'Orta':   [C.violet, C.lavender],
    'Normal': ['#6B7280', '#F3F4F6'],
    'Düşük':  ['#6B7280', '#F3F4F6'],
  }
  const [fg, bg] = map[value] ?? map['Normal']
  return (
    <span className="inline-flex items-center px-[9px] py-[4px] rounded-[7px] text-[11px] font-bold" style={{ color: fg, background: bg }}>
      {value}
    </span>
  )
}

function AkBtn({
  icon: Icon, label, onClick, danger = false,
}: { icon: React.ElementType; label: string; onClick: (e: React.MouseEvent) => void; danger?: boolean }) {
  return (
    <button
      title={label}
      onClick={e => { e.stopPropagation(); onClick(e) }}
      className={`h-[31px] w-[31px] rounded-[10px] border grid place-items-center transition-colors
        ${danger
          ? 'border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50'
          : 'border-gray-200 text-gray-400 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50'
        }`}
      style={{ borderColor: C.line }}
    >
      <Icon size={14} />
    </button>
  )
}

const LINK_BTN = 'h-[31px] w-[31px] rounded-[10px] border grid place-items-center transition-colors text-gray-400 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50'
const DEAD_BTN = 'h-[31px] w-[31px] rounded-[10px] border grid place-items-center opacity-30 cursor-not-allowed'

function PhoneBtn({ tel }: { tel?: string }) {
  if (!tel) return (
    <span className={DEAD_BTN} style={{ borderColor: C.line }} title="Telefon yok">
      <PhoneCall size={14} className="text-gray-400" />
    </span>
  )
  return (
    <a href={`tel:${tel}`} title={`Ara: ${tel}`} onClick={e => e.stopPropagation()}
      className={LINK_BTN} style={{ borderColor: C.line }}>
      <PhoneCall size={14} />
    </a>
  )
}

function WaBtn({ tel }: { tel?: string }) {
  if (!tel) return (
    <span className={DEAD_BTN} style={{ borderColor: C.line }} title="Telefon yok">
      <MessageSquare size={14} className="text-gray-400" />
    </span>
  )
  const digits = tel.replace(/\D/g, '')
  const wa = digits.startsWith('90') ? digits : digits.startsWith('0') ? '90' + digits.slice(1) : '90' + digits
  return (
    <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"
      title="WhatsApp" onClick={e => e.stopPropagation()}
      className={LINK_BTN} style={{ borderColor: C.line }}>
      <MessageSquare size={14} />
    </a>
  )
}

// Tablo grid sütunları — header ile eşleşmeli
const GRID = 'grid-cols-[40px_minmax(220px,1fr)_100px_105px_90px_105px_105px_90px_minmax(140px,auto)]'

export function FirmaSatir({
  record, showTemsilci = true, izin, onClick, onAksiyon, onNotEkle,
  onAjandadanCikar, onAjandayaEkle,
}: Props) {
  const { airtable: { sistemAdi }, temsilciler } = useTenant()
  const f = record.fields
  const firmaAdi  = f['Firma Adı'] ?? '—'
  const sektor    = f['Sektör']
  const il        = f['İl / İlçe']
  const tel       = f['Genel Telefon']
  const mail      = f['Genel Mail']
  const score     = f['Sıcaklık Skoru']
  const asama     = f['Pipeline Aşaması']
  const temsilciRaw = f['Atanan Temsilci']
  // displayAd override: emlak demoda Rüya→Hülya, Sude→Ahmet
  const temsilci  = temsilciRaw
    ? (temsilciler.find(t => t.ad === temsilciRaw)?.displayAd ?? temsilciRaw)
    : undefined
  const oncelik   = f['Öncelik']
  const bugun     = f['Bugün Aranacak']
  const sonTarih  = f['Son İletişim Tarihi']
  const aliOzeti  = f['Ali Özeti']
  const vadeAyi   = f['Vade Ayı Grubu']

  const [mobileMenu, setMobileMenu] = useState(false)
  const [sonraAraAcik, setSonraAra] = useState(false)
  const [notAcik, setNotAcik]       = useState(false)
  const [notInput, setNotInput]     = useState('')
  const [sonraAraTarih, setSAT]     = useState('')

  const dateRef = useRef<HTMLInputElement>(null)
  const notRef  = useRef<HTMLInputElement>(null)

  const inputAcik = sonraAraAcik || notAcik

  useEffect(() => { if (notAcik) notRef.current?.focus() }, [notAcik])
  useEffect(() => {
    if (sonraAraAcik) { dateRef.current?.focus(); dateRef.current?.showPicker?.() }
  }, [sonraAraAcik])

  const canWrite = Boolean(onAksiyon) && (
    !izin ||
    izin.tip === 'yönetici' ||
    (izin.tip === 'temsilci' && temsilciRaw === izin.temsilci)
  )

  const today = new Date().toLocaleDateString('sv-SE')

  // Aktivite logu (fire-and-forget) — PATCH ile paralel gider
  function logAktivite(aramaSonucu: string) {
    fetch('/api/aktivite/ekle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firmaId: record.id, aramaSonucu }),
    }).catch(console.warn)
  }

  function doArandi()     { if (!canWrite) return; onAksiyon!(record.id, { 'Son İletişim Tarihi': today, '2026 Arandı mı': true, 'Bugün Aranacak': false }, firmaAdi); logAktivite('Geri Aranacak'); setMobileMenu(false) }
  function doUlasildi()   { if (!canWrite) return; onAksiyon!(record.id, { 'Son İletişim Tarihi': today, '2026 Arandı mı': true, '2026 Ulaşıldı mı': true, 'Bugün Aranacak': false }, firmaAdi); logAktivite('Ulaşıldı'); setMobileMenu(false) }
  function doUlasilamadi(){ if (!canWrite) return; onAksiyon!(record.id, { 'Son İletişim Tarihi': today, '2026 Arandı mı': true, 'Pipeline Aşaması': 'Ulaşılamadı', 'Bugün Aranacak': false }, firmaAdi); logAktivite('Cevap Yok'); setMobileMenu(false) }
  function doSonraAra()   { if (!sonraAraTarih || !canWrite) { setSonraAra(false); return }; onAksiyon!(record.id, { 'Sonra Ara Tarihi': sonraAraTarih }, firmaAdi); setSonraAra(false); setSAT('') }
  function doNot()        { const t = notInput.trim(); if (t && onNotEkle) onNotEkle(record.id, t, firmaAdi); setNotAcik(false); setNotInput('') }

  const temsilciInitials = temsilci ? temsilci.slice(0, 2).toUpperCase() : '—'
  // showTemsilci guard için gerçek isimle karşılaştır
  const isSystemRecord = sistemAdi && temsilciRaw === sistemAdi
  const bransRenk = getBransRenk(f)

  const AYLAR: Record<string, number> = { 'Ocak':0,'Şubat':1,'Mart':2,'Nisan':3,'Mayıs':4,'Haziran':5,'Temmuz':6,'Ağustos':7,'Eylül':8,'Ekim':9,'Kasım':10,'Aralık':11 }
  const vadeRozet = (() => {
    if (!vadeAyi || vadeAyi === 'Bilinmiyor') return null
    const vadeIdx = AYLAR[vadeAyi]
    if (vadeIdx === undefined) return null
    const simdi = new Date()
    const diff = (vadeIdx - simdi.getMonth() + 12) % 12
    const label = vadeAyi.slice(0, 3)
    if (diff === 0)  return { label, bg: '#FEE2E2', fg: '#DC2626' }
    if (diff === 1)  return { label, bg: '#FFEDD5', fg: '#F97316' }
    return { label, bg: '#D1FAE5', fg: '#10B981' }
  })()

  return (
    <div
      className="border-b last:border-b-0 border-l-[5px] group"
      style={{ borderBottomColor: '#DDE1ED', borderLeftColor: bransRenk }}
    >
      {/* Ana tablo satırı */}
      <div
        className={`grid ${GRID} items-center min-h-[78px] px-[15px] text-[12px] hover:bg-violet-50/30 transition-colors cursor-pointer`}
        onClick={() => { if (!inputAcik) onClick?.() }}
      >
        {/* Checkbox */}
        <div onClick={e => e.stopPropagation()}>
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 cursor-pointer" />
        </div>

        {/* Firma / İletişim */}
        <div className="pr-3">
          <div className="flex items-center gap-[7px] flex-wrap">
            <span className="font-bold text-[13px] uppercase leading-tight" style={{ color: C.text }}>
              {firmaAdi}
            </span>
            {bugun && (
              <span className="rounded-full bg-red-50 px-[6px] py-[2px] text-[9px] font-semibold text-red-500 uppercase tracking-wide">
                Bugün
              </span>
            )}
            {vadeRozet && (
              <span className="rounded-[8px] px-[8px] py-[4px] text-[11px] font-semibold" style={{ background: vadeRozet.bg, color: vadeRozet.fg }}>
                {vadeRozet.label}
              </span>
            )}
            {(f['Branş'] ?? []).map(b => {
              const n = normTR(b)
              let bg: string, fg: string
              if (n.includes('saglik'))    { bg = '#D1FAE5'; fg = '#10B981' }
              else if (n.includes('elem')) { bg = '#FED7AA'; fg = '#F97316' }
              else if (n.includes('acib')) { bg = '#E9D5FF'; fg = '#9333EA' }
              else return null
              return (
                <span key={b} className="rounded-[8px] px-[8px] py-[4px] text-[11px] font-semibold"
                  style={{ background: bg, color: fg }}>
                  {b.slice(0, 3)}
                </span>
              )
            })}
          </div>
          {(tel || mail) && (
            <div className="flex items-center gap-3 mt-1">
              {tel && (
                <a href={`tel:${tel}`} onClick={e => e.stopPropagation()}
                  className="inline-flex items-center gap-[5px] text-[10px] text-slate-400 hover:text-violet-600 transition-colors">
                  <Phone size={9} />{tel}
                </a>
              )}
              {mail && (
                <a href={`mailto:${mail}`} onClick={e => e.stopPropagation()}
                  className="inline-flex items-center gap-[5px] text-[10px] text-slate-400 hover:text-violet-600 transition-colors truncate max-w-[160px]">
                  <Mail size={9} />{mail}
                </a>
              )}
            </div>
          )}
          {il && <p className="text-[10px] text-slate-400 mt-0.5">{il}</p>}
        </div>

        {/* Sektör */}
        <div className="text-[12px] text-slate-600 truncate pr-2">{sektor ?? '—'}</div>

        {/* Aşama */}
        <div>{asama ? <PipelinePill asama={asama} /> : <span className="text-slate-400">—</span>}</div>

        {/* Öncelik */}
        <div>{oncelik ? <PriorityPill value={oncelik} /> : <span className="text-slate-400">—</span>}</div>

        {/* Son Etkileşim */}
        <div className="text-[12px] font-semibold text-slate-600">{formatSonEtkilesim(sonTarih)}</div>

        {/* Temsilci */}
        <div>
          {showTemsilci && temsilci && !isSystemRecord ? (
            <div className="flex items-center gap-[7px]">
              <span className="h-[23px] w-[23px] rounded-full grid place-items-center text-[10px] font-black text-white shrink-0"
                style={{ background: `linear-gradient(135deg, ${C.bordo}, ${C.violet})` }}>
                {temsilciInitials}
              </span>
              <span className="text-[11px] font-semibold text-slate-700 truncate">{temsilci}</span>
            </div>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </div>

        {/* Ali Skoru */}
        <div>
          {score !== undefined ? <ScoreRing score={score} /> : <span className="text-slate-400">—</span>}
        </div>

        {/* Aksiyon butonları */}
        <div className="flex items-center gap-[4px]" onClick={e => e.stopPropagation()}>
          {canWrite ? (
            <>
              <div className="hidden sm:flex items-center gap-[4px]">
                <PhoneBtn tel={tel} />
                <WaBtn tel={tel} />
                <button
                  title="Sonra Ara"
                  onClick={e => { e.stopPropagation(); setSonraAra(v => !v); setNotAcik(false) }}
                  className="h-[31px] w-[31px] rounded-[10px] border grid place-items-center transition-colors text-slate-400 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50"
                  style={{ borderColor: C.line }}
                >
                  <CalendarClock size={14} />
                </button>
                <button
                  title="Not ekle"
                  onClick={e => { e.stopPropagation(); setNotAcik(v => !v); setSonraAra(false) }}
                  className="h-[31px] w-[31px] rounded-[10px] border grid place-items-center transition-colors text-slate-400 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50"
                  style={{ borderColor: C.line }}
                >
                  <MessageSquare size={14} />
                </button>

                {onAjandayaEkle && !bugun && (
                  <button
                    title="Ajandaya ekle"
                    onClick={e => { e.stopPropagation(); onAjandayaEkle(record.id, firmaAdi) }}
                    className="h-[31px] w-[31px] rounded-[10px] border border-emerald-200 grid place-items-center transition-colors bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-300"
                  >
                    <CalendarCheck size={14} />
                  </button>
                )}
                {onAjandadanCikar && bugun && (
                  <button
                    title="Ajandadan çıkar"
                    onClick={e => { e.stopPropagation(); onAjandadanCikar(record.id, firmaAdi) }}
                    className="h-[31px] w-[31px] rounded-[10px] border border-rose-200 grid place-items-center transition-colors bg-rose-50 text-rose-500 hover:bg-rose-100 hover:border-rose-300"
                  >
                    <CalendarX size={14} />
                  </button>
                )}
              </div>
              <div className="sm:hidden">
                <button onClick={() => setMobileMenu(v => !v)}
                  className="h-[31px] w-[31px] rounded-[10px] border grid place-items-center text-gray-400"
                  style={{ borderColor: C.line }}>
                  <MoreHorizontal size={14} />
                </button>
                {mobileMenu && (
                  <div className="flex items-center gap-[5px] mt-1 bg-white border border-gray-200 rounded-xl shadow-lg px-2 py-1.5 absolute right-4 z-10">
                    <AkBtn icon={Phone}         label="Arandı"      onClick={() => doArandi()} />
                    <AkBtn icon={PhoneCall}     label="Ulaşıldı"    onClick={() => doUlasildi()} />
                    <AkBtn icon={PhoneOff}      label="Ulaşılamadı" onClick={() => doUlasilamadi()} danger />
                    <AkBtn icon={CalendarClock} label="Sonra Ara"   onClick={() => { setSonraAra(true); setMobileMenu(false) }} />
                    <AkBtn icon={MessageSquare} label="Not"         onClick={() => { setNotAcik(true); setMobileMenu(false) }} />
                    {onAjandayaEkle && !bugun && (
                      <AkBtn icon={CalendarCheck} label="Ajandaya Ekle" onClick={() => { onAjandayaEkle(record.id, firmaAdi); setMobileMenu(false) }} />
                    )}
                    {onAjandadanCikar && bugun && (
                      <AkBtn icon={CalendarX} label="Ajandadan Çıkar" onClick={() => { onAjandadanCikar(record.id, firmaAdi); setMobileMenu(false) }} danger />
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </div>
      </div>

      {/* Sonra Ara: inline tarih seçici */}
      {sonraAraAcik && (
        <div className="flex items-center gap-1.5 px-[55px] pb-2" onClick={e => e.stopPropagation()}>
          <input
            ref={dateRef}
            type="date"
            value={sonraAraTarih}
            onChange={e => setSAT(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') doSonraAra(); if (e.key === 'Escape') { setSonraAra(false); setSAT('') } }}
            className="text-xs border border-violet-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-300/30 text-gray-700"
          />
          <button onClick={doSonraAra} className="p-1.5 rounded-lg text-white" style={{ background: C.violet }}>
            <Check size={11} />
          </button>
          <button onClick={e => { e.stopPropagation(); setSonraAra(false); setSAT('') }} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <XIcon size={11} />
          </button>
        </div>
      )}

      {/* Not ekle: inline input */}
      {notAcik && (
        <div className="flex items-center gap-1.5 px-[55px] pb-2" onClick={e => e.stopPropagation()}>
          <input
            ref={notRef}
            type="text"
            value={notInput}
            onChange={e => setNotInput(e.target.value)}
            placeholder="Kısa not…"
            maxLength={500}
            onKeyDown={e => { if (e.key === 'Enter') doNot(); if (e.key === 'Escape') { setNotAcik(false); setNotInput('') } }}
            className="flex-1 text-xs border border-violet-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-300/30 text-gray-700 min-w-0 max-w-sm"
          />
          <button onClick={e => { e.stopPropagation(); doNot() }} className="p-1.5 rounded-lg text-white" style={{ background: C.violet }}>
            <Send size={11} />
          </button>
          <button onClick={e => { e.stopPropagation(); setNotAcik(false); setNotInput('') }} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <XIcon size={11} />
          </button>
        </div>
      )}

      {/* Ali özeti şeridi */}
      {aliOzeti && (
        <div className="mx-[55px] mb-[10px] h-[27px] rounded-[9px] bg-slate-50 flex items-center px-[13px] text-[11px]"
          style={{ border: `1px solid ${C.line}` }}>
          <Flame size={13} className="mr-[7px] shrink-0" style={{ color: C.red }} />
          <b className="mr-[6px] shrink-0" style={{ color: C.bordo }}>Ali:</b>
          <span className="text-slate-500 flex-1 truncate">{aliOzeti}</span>
        </div>
      )}
    </div>
  )
}

// Tablo grid sütunları export — header'da kullanılır
export { GRID }
