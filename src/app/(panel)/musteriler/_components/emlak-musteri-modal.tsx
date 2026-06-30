'use client'

import { useEffect } from 'react'
import { X, Phone, MessageCircle, MapPin, Flame, Clock, CheckCircle2, CalendarCheck, StickyNote, Sparkles } from 'lucide-react'
import type { FirmaListeItem, AirtableRecord } from '@/lib/airtable'

// emlak glass paleti (stok/rapor ile aynı)
const E = {
  green1: '#0E5132', green2: '#1B7A47', surface: '#EFF5EF',
  coral: '#EF6B4F', line: '#E7EAF2', text: '#071B3A', lav: '#6D5BE0', lavSoft: '#EDE9FE',
}

// Pipeline aşaması → durum rozeti
function durumMeta(asama?: string): { label: string; bg: string; fg: string; icon: typeof CheckCircle2 } {
  switch (asama) {
    case 'Ulaşılamadı': return { label: 'Ulaşılamadı', bg: '#FEE2E2', fg: '#991B1B', icon: Clock }
    case 'Randevu':     return { label: 'Randevu Alındı', bg: '#EDE9FE', fg: '#5b51a8', icon: CalendarCheck }
    case 'Kazanıldı':   return { label: 'Kazanıldı', bg: '#D1FAE5', fg: '#065F46', icon: CheckCircle2 }
    case 'Kaybedildi':  return { label: 'Kaybedildi', bg: '#F1F5F9', fg: '#64748B', icon: X }
    default:            return { label: 'Ulaşıldı', bg: '#D1FAE5', fg: '#065F46', icon: CheckCircle2 }
  }
}

// Deterministik dummy görüşme geçmişi (fixture — gerçek backend yok)
function dummyGorusmeler(r: AirtableRecord<FirmaListeItem>): { tarih: string; sonuc: string; renk: string; not: string }[] {
  const f = r.fields
  const ad = (f['Firma Adı'] ?? '').split(' ')[0]
  const seed = r.id.charCodeAt(r.id.length - 1)
  const base = [
    { tarih: '2 gün önce', sonuc: 'Ulaşıldı', renk: E.green2, not: `${ad} ile ${f['Sektör'] ?? 'daire'} ihtiyacı konuşuldu. Bütçe ve lokasyon netleşti.` },
    { tarih: '5 gün önce', sonuc: 'Cevap Yok', renk: '#94A3B8', not: 'Telefonla ulaşılamadı, WhatsApp\'tan bilgi bırakıldı.' },
    { tarih: '1 hafta önce', sonuc: 'Randevu Alındı', renk: E.lav, not: 'Örnek daire gezisi için randevu ayarlandı.' },
    { tarih: '2 hafta önce', sonuc: 'Ulaşıldı', renk: E.green2, not: 'İlk temas — ilgilendiği proje ve oda sayısı alındı.' },
  ]
  return base.slice(0, 2 + (seed % 2)) // 2-3 kayıt
}

function dummyNot(r: AirtableRecord<FirmaListeItem>): string {
  const f = r.fields
  const skor = f['Sıcaklık Skoru'] ?? 0
  const sicaklik = skor >= 7 ? 'yüksek ilgili' : skor >= 4 ? 'kararsız' : 'soğuk'
  return `Müşteri ${sicaklik}. ${f['Sektör'] ?? 'Daire'} arıyor, ${f['İl / İlçe'] ?? 'bölge'} tercih ediyor. ` +
    `Pipeline: ${f['Pipeline Aşaması'] ?? '—'}. Öncelik: ${f['Öncelik'] ?? 'Normal'}.`
}

export function EmlakMusteriModal({
  record, onClose,
}: {
  record: AirtableRecord<FirmaListeItem> | null
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  if (!record) return null
  const f = record.fields
  const ad = f['Firma Adı'] ?? 'Müşteri'
  const initials = ad.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase()
  const tel = (f['Genel Telefon'] ?? '').replace(/\s/g, '')
  const waHref = `https://wa.me/90${tel.replace(/^0/, '')}`
  const durum = durumMeta(f['Pipeline Aşaması'])
  const DurumIcon = durum.icon
  const skor = f['Sıcaklık Skoru'] ?? 0
  const gorusmeler = dummyGorusmeler(record)

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(20,30,25,.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="h-full w-full max-w-[480px] bg-white overflow-y-auto"
        style={{ boxShadow: '-20px 0 60px -20px rgba(20,40,25,.4)' }}
      >
        {/* Başlık */}
        <div className="sticky top-0 z-10 bg-white px-[20px] py-[15px] flex items-start justify-between" style={{ borderBottom: `1px solid ${E.line}` }}>
          <div className="flex items-center gap-[12px] min-w-0">
            <div className="grid place-items-center rounded-[14px] text-white shrink-0" style={{ width: 46, height: 46, background: `linear-gradient(135deg, ${E.green1}, ${E.green2})`, fontWeight: 800, fontSize: 16 }}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-[17px] font-black truncate" style={{ color: E.text }}>{ad}</p>
              <p className="text-[12px] text-slate-400 flex items-center gap-[5px]">
                <MapPin size={11} /> {f['İl / İlçe'] ?? '—'} · {f['Sektör'] ?? '—'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0"><X size={20} /></button>
        </div>

        <div className="px-[20px] py-[16px] space-y-[18px]">
          {/* Örnek veri + durum/skor */}
          <div className="flex items-center gap-[8px] flex-wrap">
            <span className="inline-flex items-center gap-[5px] rounded-full px-[10px] py-[4px] text-[12px] font-bold" style={{ background: durum.bg, color: durum.fg }}>
              <DurumIcon size={13} /> {durum.label}
            </span>
            <span className="inline-flex items-center gap-[5px] rounded-full px-[10px] py-[4px] text-[12px] font-bold" style={{ background: E.surface, color: skor >= 7 ? E.coral : E.green2 }}>
              <Flame size={13} /> {skor}/10 ilgi
            </span>
            <span className="rounded-full px-[10px] py-[4px] text-[11px] font-bold bg-amber-50 border border-amber-200 text-amber-700">Örnek veri</span>
          </div>

          {/* Hızlı aksiyon */}
          <div className="flex gap-[8px]">
            <a href={`tel:${tel}`} className="flex items-center gap-[6px] h-[38px] rounded-[11px] border px-[14px] text-[13px] font-bold transition-colors hover:bg-green-50" style={{ borderColor: E.green2, color: E.green2 }}>
              <Phone size={14} /> Ara
            </a>
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-[6px] h-[38px] rounded-[11px] px-[14px] text-[13px] font-bold text-white transition-opacity hover:opacity-90" style={{ background: '#25D366' }}>
              <MessageCircle size={14} /> WhatsApp
            </a>
            <div className="ml-auto text-right">
              <p className="text-[11px] text-slate-400">Danışman</p>
              <p className="text-[12px] font-bold" style={{ color: E.text }}>{f['Atanan Temsilci'] ?? '—'}</p>
            </div>
          </div>

          {/* Ali özeti */}
          <div className="rounded-[14px] p-[13px]" style={{ borderLeft: `3px solid ${E.lav}`, background: E.lavSoft }}>
            <p className="text-[11px] font-black uppercase tracking-wide mb-[5px] flex items-center gap-[5px]" style={{ color: E.lav }}>
              <Sparkles size={12} /> Ali Özeti
            </p>
            <p className="text-[13px] leading-[19px]" style={{ color: '#48417e' }}>{dummyNot(record)}</p>
          </div>

          {/* Birikimli notlar */}
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide mb-[8px] flex items-center gap-[5px]" style={{ color: E.green1 }}>
              <StickyNote size={12} /> Birikimli Görüşme Notları
            </p>
            <div className="rounded-[12px] p-[12px] text-[13px] leading-[19px]" style={{ background: E.surface, color: '#33433a', border: `1px solid ${E.line}` }}>
              {gorusmeler.map(g => g.not).join(' ')}
            </div>
          </div>

          {/* Görüşme geçmişi */}
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide mb-[8px]" style={{ color: E.green1 }}>Görüşme Geçmişi</p>
            <div className="space-y-[8px]">
              {gorusmeler.map((g, i) => (
                <div key={i} className="rounded-[12px] border p-[12px]" style={{ borderColor: E.line }}>
                  <div className="flex items-center justify-between mb-[4px]">
                    <span className="text-[12px] font-bold rounded-full px-[8px] py-[2px]" style={{ background: `${g.renk}1A`, color: g.renk }}>{g.sonuc}</span>
                    <span className="text-[11px] text-slate-400">{g.tarih}</span>
                  </div>
                  <p className="text-[12.5px] leading-[18px]" style={{ color: '#475a4e' }}>{g.not}</p>
                </div>
              ))}
            </div>
            <p className="mt-[8px] text-[11px] text-slate-400">Demo görünümü — kayıt/düzenleme gerçek backend bağlanınca aktif olacak.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
