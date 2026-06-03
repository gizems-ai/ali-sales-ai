'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTenant } from '@/lib/tenant-context'
import {
  X, Phone, Mail, Globe, Linkedin, Flame, ExternalLink,
  MapPin, Calendar, Star, CheckCircle2, AlertCircle, Pencil,
  ClipboardList, Trash2,
} from 'lucide-react'
import { type FirmaDetay, type AirtableRecord } from '@/lib/airtable'
import { type MusterilerIzin } from '@/lib/musteriler-izin'
import { TEMSILCILER } from '@/lib/temsilciler'

// ── Aktivite Log tipleri ───────────────────────────────────────────────────

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
  'Randevu Alındı': 'bg-[#EDE9FE] text-[#5B47E0] border-[#DDD6FE]',
  'Geri Aranacak':  'bg-[#F2EEFF] text-[#7C5CFC] border-[#DDD6FE]',
}

// ── Tipler ────────────────────────────────────────────────────────────────

interface Props {
  recordId: string | null
  izin: Exclude<MusterilerIzin, { tip: 'yok' }>
  onClose: () => void
  isAdmin?: boolean
}

type YukleDurum = 'bos' | 'yukleniyor' | 'hata'
type Pending = Partial<FirmaDetay>

// ── Sabit veriler ──────────────────────────────────────────────────────────

const AYLAR =['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
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
// TEMSILCILER → lib/temsilciler.ts'ten import edildi
// ── Yardımcı fonksiyonlar ──────────────────────────────────────────────────

function formatTarih(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getDate()} ${AYLAR[d.getMonth()]} ${d.getFullYear()}`
}

// ── Alt bileşenler (görüntüleme) ───────────────────────────────────────────

function Alan({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '' || value === false) return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  )
}

function GrupBaslik({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold text-[#5B47E0] uppercase tracking-widest mb-3">{children}</h3>
}

function CheckBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
      <CheckCircle2 size={12} /> {label}
    </span>
  )
}

// ── Düzenlenebilir alan bileşeni ───────────────────────────────────────────

interface EFProps {
  label: string
  fk: keyof FirmaDetay
  type?: 'text' | 'email' | 'tel' | 'url' | 'date' | 'number' | 'select' | 'multiselect' | 'textarea' | 'checkbox'
  opts?: string[]
  em: boolean   // editMode
  rec: AirtableRecord<FirmaDetay>
  pend: Pending
  onCh: (k: keyof FirmaDetay, v: unknown) => void
  err?: string
}

function EF({ label, fk, type = 'text', opts, em, rec, pend, onCh, err }: EFProps) {
  const raw = pend[fk] !== undefined ? pend[fk] : rec.fields[fk]

  // Görüntüleme modu
  if (!em) {
    if (type === 'checkbox') {
      return raw ? <CheckBadge label={label} /> : null
    }
    if (raw === null || raw === undefined || raw === '' || raw === false) return null
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

  // Düzenleme modu
  const strVal = raw === null || raw === undefined ? '' : String(raw)
  const base = `mt-0.5 w-full px-2.5 py-1.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 ${
    err
      ? 'border-red-300 bg-red-50 focus:ring-red-300/30'
      : 'border-gray-200 focus:ring-[#5B47E0]/30 focus:border-[#5B47E0]'
  }`

  if (type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(raw)}
          onChange={e => onCh(fk, e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-[#5B47E0] focus:ring-[#5B47E0]"
        />
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
                  ${sel ? 'bg-[#5B47E0] text-white' : 'bg-gray-100 text-gray-600 hover:bg-[#EDE9FE] hover:text-[#5B47E0]'}`}
              >
                {o}
              </button>
            )
          })}
        </div>
      )}
      {type === 'date' && (
        <input type="date" value={strVal} onChange={e => onCh(fk, e.target.value || null)} className={base} />
      )}
      {type === 'number' && (
        <input type="number" value={strVal}
          onChange={e => onCh(fk, e.target.value ? Number(e.target.value) : null)} className={base} />
      )}
      {type === 'textarea' && (
        <textarea rows={4} value={strVal}
          onChange={e => onCh(fk, e.target.value || null)} className={base + ' resize-none'} />
      )}
      {['text','email','tel','url'].includes(type) && (
        <input type={type} value={strVal}
          onChange={e => onCh(fk, e.target.value || null)} className={base} />
      )}
      {err && <p className="text-[11px] text-red-500 mt-0.5">{err}</p>}
    </div>
  )
}

// ── İçerik bileşeni ───────────────────────────────────────────────────────

interface IcerikProps {
  record: AirtableRecord<FirmaDetay>
  pend: Pending
  em: boolean
  izin: Exclude<MusterilerIzin, { tip: 'yok' }>
  isAdmin: boolean
  onCh: (k: keyof FirmaDetay, v: unknown) => void
  valErr: Record<string, string>
  notInput: string
  setNotInput: (v: string) => void
  notEkleniyor: boolean
  onNotEkle: () => void
}

function FirmaDetayIcerik({
  record, pend, em, izin, isAdmin, onCh, valErr, notInput, setNotInput, notEkleniyor, onNotEkle,
}: IcerikProps) {
  const { airtable: { sistemAdi } } = useTenant()
  const f = record.fields
  const eff = (k: keyof FirmaDetay) => (pend[k] !== undefined ? pend[k] : f[k])

  const firmaAdi = String(eff('Firma Adı') ?? '—')
  const score = eff('Sıcaklık Skoru') as number | undefined
  const scoreColor = score !== undefined && score >= 7 ? 'text-red-500'
    : score !== undefined && score >= 4 ? 'text-violet-500' : 'text-gray-400'
  const checkboxAlanlar: Array<{ label: string; fk: keyof FirmaDetay }> = [
    { label: 'Bugün Aranacak', fk: 'Bugün Aranacak' },
    { label: '2026 Arandı', fk: '2026 Arandı mı' },
    { label: '2026 Ulaşıldı', fk: '2026 Ulaşıldı mı' },
    { label: 'Branş Onaylandı', fk: 'Branş Onaylandı' },
    { label: 'Cross-Sell İmkânı', fk: 'Cross-Sell İmkânı' },
    { label: 'Global Anlaşma', fk: 'Global Anlaşma' },
  ]

  const birikimliNot = eff('Birikimli Görüşme Notları') as string | undefined

  return (
    <div className="px-6 py-5 space-y-7 pb-8">
      {/* ── Başlık ── */}
      <div>
        {em ? (
          <EF label="Firma Adı" fk="Firma Adı" em={em} rec={record} pend={pend} onCh={onCh} err={valErr['Firma Adı']}
            type="text" />
        ) : (
          <h2 className="text-xl font-bold text-gray-900 leading-snug"
            style={{ overflowWrap: 'break-word', wordBreak: 'normal' }}>
            {firmaAdi}
          </h2>
        )}
        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
          {!em && (
            <>
              {f['Sektör'] && (
                <span className="px-2.5 py-1 rounded-full bg-[#EDE9FE] text-[#5B47E0] text-xs font-medium">{f['Sektör']}</span>
              )}
              {f['Atanan Temsilci'] && (!sistemAdi || f['Atanan Temsilci'] !== sistemAdi) && (
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#EDE9FE] text-[#5B47E0] text-xs font-bold">
                  {f['Atanan Temsilci'].slice(0, 2).toUpperCase()}
                </span>
              )}
              {score !== undefined && (
                <span className={`inline-flex items-center gap-1 text-sm font-semibold ${scoreColor}`}>
                  <Flame size={14} />{score}
                </span>
              )}
              {f['Öncelik'] === 'Yüksek' && (
                <span className="px-2 py-0.5 rounded-full bg-[#EDE9FE] text-[#5B47E0] text-xs font-medium">↑ Yüksek</span>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── İletişim ── */}
      <section>
        <GrupBaslik>İletişim</GrupBaslik>
        <div className="space-y-3">
          {em ? (
            <>
              <EF label="Genel Telefon" fk="Genel Telefon" type="tel" em={em} rec={record} pend={pend} onCh={onCh} />
              <EF label="Genel Mail" fk="Genel Mail" type="email" em={em} rec={record} pend={pend} onCh={onCh} err={valErr['Genel Mail']} />
              <EF label="Web Sitesi" fk="Web Sitesi" type="url" em={em} rec={record} pend={pend} onCh={onCh} />
              <EF label="LinkedIn URL" fk="LinkedIn URL" type="url" em={em} rec={record} pend={pend} onCh={onCh} />
              <EF label="İl / İlçe" fk="İl / İlçe" em={em} rec={record} pend={pend} onCh={onCh} />
              <EF label="Adres" fk="Adres" em={em} rec={record} pend={pend} onCh={onCh} />
              <EF label="Son İletişim Kanalı" fk="Son İletişim Kanalı" type="select" opts={ILETISIM_KANALLARI} em={em} rec={record} pend={pend} onCh={onCh} />
              <EF label="Son İletişim Tarihi" fk="Son İletişim Tarihi" type="date" em={em} rec={record} pend={pend} onCh={onCh} />
            </>
          ) : (
            <>
              {f['Genel Telefon'] && (
                <div className="flex items-center gap-2">
                  <Phone size={13} className="text-gray-400 shrink-0" />
                  <a href={`tel:${f['Genel Telefon']}`} className="text-sm text-[#5B47E0] hover:underline">{f['Genel Telefon']}</a>
                </div>
              )}
              {f['Genel Mail'] && (
                <div className="flex items-center gap-2">
                  <Mail size={13} className="text-gray-400 shrink-0" />
                  <a href={`mailto:${f['Genel Mail']}`} className="text-sm text-[#5B47E0] hover:underline truncate">{f['Genel Mail']}</a>
                </div>
              )}
              {f['Web Sitesi'] && (
                <div className="flex items-center gap-2">
                  <Globe size={13} className="text-gray-400 shrink-0" />
                  <a href={f['Web Sitesi']} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-[#5B47E0] hover:underline truncate inline-flex items-center gap-1">
                    {f['Web Sitesi'].replace(/^https?:\/\//, '')} <ExternalLink size={10} />
                  </a>
                </div>
              )}
              {f['LinkedIn URL'] && (
                <div className="flex items-center gap-2">
                  <Linkedin size={13} className="text-gray-400 shrink-0" />
                  <a href={f['LinkedIn URL']} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-[#5B47E0] hover:underline inline-flex items-center gap-1">
                    LinkedIn <ExternalLink size={10} />
                  </a>
                </div>
              )}
              {(f['İl / İlçe'] || f['Adres']) && (
                <div className="flex items-start gap-2">
                  <MapPin size={13} className="text-gray-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">{[f['İl / İlçe'], f['Adres']].filter(Boolean).join(' — ')}</span>
                </div>
              )}
              {(f['Son İletişim Kanalı'] || f['Son İletişim Tarihi']) && (
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700">
                    {[f['Son İletişim Kanalı'], f['Son İletişim Tarihi'] ? formatTarih(f['Son İletişim Tarihi']) : undefined].filter(Boolean).join(' · ')}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── Sigorta ── */}
      <section>
        <GrupBaslik>Sigorta</GrupBaslik>
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
      </section>

      {/* ── Durum ── */}
      <section>
        <GrupBaslik>Durum</GrupBaslik>
        <div className="space-y-3">
          {em ? (
            <>
              <EF label="Öncelik" fk="Öncelik" type="select" opts={ONCELIKLER} em={em} rec={record} pend={pend} onCh={onCh} />
              {/* Atanan Temsilci: sadece yönetici */}
              {izin.tip === 'yönetici' ? (
                <EF label="Atanan Temsilci" fk="Atanan Temsilci" type="select" opts={[...TEMSILCILER]} em={em} rec={record} pend={pend} onCh={onCh} />
              ) : (
                <Alan label="Atanan Temsilci" value={f['Atanan Temsilci']} />
              )}
              <EF label="Sektör" fk="Sektör" type="select" opts={SEKTORLER} em={em} rec={record} pend={pend} onCh={onCh} />
              <Alan label="Durum" value={f['Durum']} />
              <EF label="Sonra Ara Tarihi" fk="Sonra Ara Tarihi" type="date" em={em} rec={record} pend={pend} onCh={onCh} />
              <EF label="Son Durum 2026" fk="Son Durum 2026" em={em} rec={record} pend={pend} onCh={onCh} />
              <EF label="Kaybedilme Nedeni" fk="Kaybedilme Nedeni" em={em} rec={record} pend={pend} onCh={onCh} />
              {/* Checkboxlar */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {checkboxAlanlar.map(c => (
                  <EF key={c.fk} label={c.label} fk={c.fk} type="checkbox" em={em} rec={record} pend={pend} onCh={onCh} />
                ))}
              </div>
            </>
          ) : (
            <>
              <Alan label="Sektör" value={f['Sektör']} />
              <Alan label="Durum" value={f['Durum']} />
              <Alan label="Öncelik" value={f['Öncelik']} />
              <Alan label="Sonra Ara Tarihi" value={f['Sonra Ara Tarihi'] ? formatTarih(f['Sonra Ara Tarihi']) : undefined} />
              {(() => {
                const aktif = checkboxAlanlar.filter(c => Boolean(eff(c.fk)))
                return aktif.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {aktif.map(c => <CheckBadge key={c.fk} label={c.label} />)}
                  </div>
                ) : null
              })()}
            </>
          )}
        </div>
      </section>

      {/* ── Notlar ── */}
      <section>
        <GrupBaslik>Notlar</GrupBaslik>
        <div className="space-y-3">
          {/* Ali Özeti */}
          {em ? (
            <EF label="Ali Özeti" fk="Ali Özeti" type="textarea" em={em} rec={record} pend={pend} onCh={onCh} />
          ) : (
            f['Ali Özeti'] && (
              <div className="rounded-xl bg-[#F5F3FF] border border-[#DDD6FE] p-4">
                <p className="text-[11px] text-[#7C3AED] font-semibold uppercase tracking-wide mb-2">Ali Özeti</p>
                <p className="text-sm text-[#4C1D95] whitespace-pre-wrap leading-relaxed">{f['Ali Özeti']}</p>
              </div>
            )
          )}

          {/* Birikimli Görüşme Notları — görüntüleme */}
          {birikimliNot && <BirikimliNotlar metin={birikimliNot} />}

          {/* Append alanı — her zaman görünür */}
          <div className="rounded-xl border border-[#EDE9FE] bg-[#F5F3FF]/50 p-3">
            <p className="text-[11px] text-[#7C3AED] font-semibold uppercase tracking-wide mb-2">Görüşme Notu Ekle</p>
            <textarea
              rows={3}
              value={notInput}
              onChange={e => setNotInput(e.target.value)}
              placeholder="Bugünkü görüşme notu…"
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#DDD6FE] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5B47E0]/30 focus:border-[#5B47E0] resize-none"
            />
            <button
              onClick={onNotEkle}
              disabled={!notInput.trim() || notEkleniyor}
              className="mt-2 px-4 py-1.5 rounded-lg bg-[#5B47E0] text-white text-xs font-semibold
                hover:bg-[#4C3BC8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {notEkleniyor ? 'Ekleniyor…' : 'Ekle'}
            </button>
          </div>

          {/* Diğer notlar */}
          {!em && f['Son Durum 2026'] && <Alan label="Son Durum 2026" value={f['Son Durum 2026']} />}
          {!em && f['Kaybedilme Nedeni'] && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
              <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] text-red-400 font-semibold uppercase tracking-wide mb-0.5">Kaybedilme Nedeni</p>
                <p className="text-sm text-red-700">{f['Kaybedilme Nedeni']}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Ek Bilgi (salt-okunur) ── */}
      {!em && (f['Google Puanı'] !== undefined || f['Veri Kaynağı'] || f['Oluşturma Tarihi'] || f['Son Not Tarihi']) && (
        <section>
          <GrupBaslik>Ek Bilgi</GrupBaslik>
          <div className="space-y-3">
            {f['Google Puanı'] !== undefined && (
              <div className="flex items-center gap-1.5">
                <Star size={13} className="text-yellow-400 fill-yellow-400" />
                <span className="text-sm text-gray-700">
                  {f['Google Puanı']}
                  {f['Google Yorum Sayısı'] !== undefined && (
                    <span className="text-gray-400 text-xs ml-1">({f['Google Yorum Sayısı']} yorum)</span>
                  )}
                </span>
              </div>
            )}
            <Alan label="Veri Kaynağı" value={f['Veri Kaynağı']} />
            <Alan label="Kayıt Tarihi" value={f['Oluşturma Tarihi'] ? formatTarih(f['Oluşturma Tarihi']) : undefined} />
            <Alan label="Son Not Tarihi" value={f['Son Not Tarihi'] ? formatTarih(f['Son Not Tarihi']) : undefined} />
          </div>
        </section>
      )}

      {/* ── Aktivite Geçmişi ── */}
      <AktiviteSection firmaId={record.id} izin={izin} em={em} isAdmin={isAdmin} />
    </div>
  )
}

// ── Aktivite bölümü ───────────────────────────────────────────────────────

interface AktiviteSectionProps {
  firmaId: string
  izin: Exclude<MusterilerIzin, { tip: 'yok' }>
  em: boolean
  isAdmin: boolean
}

function AktiviteSection({ firmaId, izin, em, isAdmin }: AktiviteSectionProps) {
  const [loglar, setLoglar]           = useState<AktiviteLog[]>([])
  const [yukleniyor, setYukleniyor]   = useState(false)
  const [hata, setHata]               = useState('')

  // Form state
  const [aramaSonucu, setAramaSonucu] = useState('')
  const [notMetni, setNotMetni]       = useState('')
  const [randevuAlindi, setRandevuAlindi] = useState(false)
  const [temsilci, setTemsilci]       = useState('')
  const [tarih, setTarih]             = useState(new Date().toISOString().slice(0, 10))
  const [ekleniyor, setEkleniyor]     = useState(false)
  const [ekleHata, setEkleHata]       = useState('')

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

  useEffect(() => { loadLogs() }, [loadLogs])

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

  const AYLAR = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara']
  function formatTarihKisa(iso: string) {
    const d = new Date(iso + 'T00:00:00')
    return `${d.getDate()} ${AYLAR[d.getMonth()]}`
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <ClipboardList size={13} className="text-[#5B47E0]" />
        <h3 className="text-xs font-semibold text-[#5B47E0] uppercase tracking-widest">Aktivite Geçmişi</h3>
      </div>

      {/* Yeni aktivite ekleme formu */}
      <div className="rounded-xl border border-[#EDE9FE] bg-[#F5F3FF]/50 p-3 mb-4">
        <p className="text-[11px] text-[#7C3AED] font-semibold uppercase tracking-wide mb-2">Aktivite Ekle</p>

        {/* Arama Sonucu + Randevu Alındı */}
        <div className="flex gap-2 mb-2">
          <select
            value={aramaSonucu}
            onChange={e => { setAramaSonucu(e.target.value); setEkleHata('') }}
            className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#DDD6FE] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5B47E0]/30 focus:border-[#5B47E0]"
          >
            <option value="">Arama sonucu seç…</option>
            {ARAMA_SONUCU_SECENEKLERI.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={randevuAlindi}
              onChange={e => setRandevuAlindi(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#5B47E0] focus:ring-[#5B47E0]"
            />
            <span className="text-xs text-gray-600 whitespace-nowrap">Randevu</span>
          </label>
        </div>

        {/* Detaylı form (düzenleme modunda) */}
        {em && (
          <div className="flex gap-2 mb-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Tarih</label>
              <input
                type="date"
                value={tarih}
                onChange={e => setTarih(e.target.value)}
                className="mt-0.5 w-full px-2.5 py-1.5 rounded-lg border border-[#DDD6FE] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5B47E0]/30 focus:border-[#5B47E0]"
              />
            </div>
            {izin.tip === 'yönetici' && (
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Temsilci</label>
                <select
                  value={temsilci}
                  onChange={e => setTemsilci(e.target.value)}
                  className="mt-0.5 w-full px-2.5 py-1.5 rounded-lg border border-[#DDD6FE] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5B47E0]/30 focus:border-[#5B47E0]"
                >
                  <option value="">—</option>
                  {TEMSILCILER.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Not */}
        <textarea
          rows={2}
          value={notMetni}
          onChange={e => setNotMetni(e.target.value)}
          placeholder="Not (isteğe bağlı)…"
          className="w-full px-2.5 py-1.5 rounded-lg border border-[#DDD6FE] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5B47E0]/30 focus:border-[#5B47E0] resize-none"
        />

        {ekleHata && <p className="text-[11px] text-red-500 mt-1">{ekleHata}</p>}

        <button
          onClick={handleEkle}
          disabled={!aramaSonucu || ekleniyor}
          className="mt-2 px-4 py-1.5 rounded-lg bg-[#5B47E0] text-white text-xs font-semibold
            hover:bg-[#4C3BC8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {ekleniyor ? 'Ekleniyor…' : 'Kaydet'}
        </button>
      </div>

      {/* Log listesi */}
      {yukleniyor && (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 rounded-full border-2 border-[#5B47E0] border-t-transparent animate-spin" />
        </div>
      )}
      {hata && <p className="text-xs text-red-500 py-2">{hata}</p>}
      {!yukleniyor && !hata && loglar.length === 0 && (
        <p className="text-xs text-gray-400 py-2 text-center">Henüz aktivite kaydı yok</p>
      )}
      {!yukleniyor && loglar.length > 0 && (
        <div className="space-y-2">
          {loglar.map(log => {
            const f = log.fields
            const sonuc = f['Arama Sonucu']
            const renkClass = sonuc ? (ARAMA_SONUCU_RENK[sonuc] ?? 'bg-gray-100 text-gray-500 border-gray-200') : ''
            return (
              <div key={log.id} className="flex gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:border-[#EDE9FE] transition-colors group">
                {/* Sol: tarih + temsilci */}
                <div className="shrink-0 flex flex-col items-center gap-1 pt-0.5">
                  {f['Tarih'] && (
                    <span className="text-[11px] font-semibold text-gray-400 leading-none whitespace-nowrap">
                      {formatTarihKisa(f['Tarih'])}
                    </span>
                  )}
                  {f['Temsilci'] && (
                    <span className="w-6 h-6 rounded-full bg-[#EDE9FE] text-[#5B47E0] text-[10px] font-bold flex items-center justify-center">
                      {f['Temsilci'].slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Sağ: içerik */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {sonuc && (
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${renkClass}`}>
                        {sonuc}
                      </span>
                    )}
                    {f['Randevu Alındı'] && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-700 border border-green-100">
                        Randevu
                      </span>
                    )}
                  </div>
                  {f['Not'] && (
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">{f['Not']}</p>
                  )}
                </div>

                {/* Admin sil butonu */}
                {isAdmin && (
                  <button
                    onClick={() => handleSil(log.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all"
                    title="Sil"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ── Birikimli notlar bileşeni ──────────────────────────────────────────────

function BirikimliNotlar({ metin }: { metin: string }) {
  const [acik, setAcik] = useState(false)
  const satirlar = metin.split('\n')
  const uzun = satirlar.length > 5 || metin.length > 400
  const gosterilen = acik ? metin : satirlar.slice(0, 4).join('\n')

  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
      <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-2">Birikimli Görüşme Notları</p>
      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
        {gosterilen}{uzun && !acik && '…'}
      </p>
      {uzun && (
        <button onClick={() => setAcik(p => !p)} className="mt-2 text-xs text-[#5B47E0] hover:underline">
          {acik ? 'Kapat' : 'Devamını gör'}
        </button>
      )}
    </div>
  )
}

// ── Ana modal bileşeni ─────────────────────────────────────────────────────

export function FirmaModal({ recordId, izin, onClose, isAdmin = false }: Props) {
  const [yukleDurum, setYukleDurum] = useState<YukleDurum>('bos')
  const [hataMsg, setHataMsg] = useState('')
  const [record, setRecord] = useState<AirtableRecord<FirmaDetay> | null>(null)

  // Düzenleme
  const [em, setEm] = useState(false)
  const [pend, setPend] = useState<Pending>({})
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const [valErr, setValErr] = useState<Record<string, string>>({})
  const [undoInfo, setUndoInfo] = useState<{ prev: Pending; firmAdi: string } | null>(null)

  // Not ekleme
  const [notInput, setNotInput] = useState('')
  const [notEkleniyor, setNotEkleniyor] = useState(false)

  const acik = Boolean(recordId)

  // Kayıt yükleme
  useEffect(() => {
    if (!recordId) {
      setRecord(null)
      setYukleDurum('bos')
      setEm(false)
      setPend({})
      setSaveErr(null)
      setUndoInfo(null)
      setNotInput('')
      return
    }
    setYukleDurum('yukleniyor')
    setEm(false)
    setPend({})
    setSaveErr(null)
    setUndoInfo(null)
    setNotInput('')

    fetch(`/api/musteriler/detail/${recordId}`)
      .then(async res => {
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? `HTTP ${res.status}`) }
        return res.json()
      })
      .then((r: AirtableRecord<FirmaDetay>) => { setRecord(r); setYukleDurum('bos') })
      .catch((e: Error) => { setHataMsg(e.message); setYukleDurum('hata') })
  }, [recordId])

  // ESC + scroll lock
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

  // Validasyon (client-side önkontrol)
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

    // Undo için önceki değerleri sakla
    const prev: Pending = {}
    for (const k of Object.keys(pend)) {
      prev[k as keyof FirmaDetay] = record.fields[k as keyof FirmaDetay] as never
    }
    const firmAdi = record.fields['Firma Adı'] ?? '—'

    // Optimistic update
    setRecord(r => r ? { ...r, fields: { ...r.fields, ...pend } } : r)
    setSaving(true)
    setSaveErr(null)

    try {
      const res = await fetch('/api/musteriler/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: record.id, fields: pend }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? `HTTP ${res.status}`)
      }
      setEm(false)
      setPend({})
      setUndoInfo({ prev, firmAdi })
      setTimeout(() => setUndoInfo(null), 6000)
    } catch (e) {
      // Optimistic'i geri al
      setRecord(r => r ? { ...r, fields: { ...r.fields, ...prev } } : r)
      setSaveErr(e instanceof Error ? e.message : 'Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  async function handleUndo() {
    if (!undoInfo || !record) return
    const { prev, firmAdi } = undoInfo
    setUndoInfo(null)
    setRecord(r => r ? { ...r, fields: { ...r.fields, ...prev } } : r)
    await fetch('/api/musteriler/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId: record.id, fields: prev }),
    })
    console.log(`Geri alındı: ${firmAdi}`)
  }

  async function handleNotEkle() {
    if (!notInput.trim() || !record) return
    setNotEkleniyor(true)
    try {
      const res = await fetch('/api/musteriler/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: record.id, fields: {}, notEkle: notInput }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.fields?.['Birikimli Görüşme Notları']) {
        setRecord(r => r ? {
          ...r,
          fields: { ...r.fields, 'Birikimli Görüşme Notları': data.fields['Birikimli Görüşme Notları'] },
        } : r)
      }
      setNotInput('')
    } catch {
      setSaveErr('Not eklenemedi, tekrar dene')
    } finally {
      setNotEkleniyor(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-200
          ${acik ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => { if (!em) onClose() }}
      />

      {/* Panel */}
      <div className={`fixed right-0 top-0 h-full w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col
        transition-transform duration-200 ease-out ${acik ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          {em ? (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-xs font-semibold text-[#5B47E0] uppercase tracking-widest shrink-0">Düzenleniyor</span>
              <span className="text-sm text-gray-500 truncate">{record?.fields['Firma Adı'] ?? ''}</span>
            </div>
          ) : (
            <p className="text-xs font-semibold text-[#5B47E0] uppercase tracking-widest">Firma Detayı</p>
          )}
          <div className="flex items-center gap-2 shrink-0">
            {!em && record && (
              <button
                onClick={() => { setEm(true); setPend({}); setSaveErr(null) }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5B47E0] text-white text-xs font-semibold hover:bg-[#4C3BC8] transition-colors"
              >
                <Pencil size={12} /> Düzenle
              </button>
            )}
            {em && (
              <>
                <button
                  onClick={() => { setEm(false); setPend({}); setValErr({}) }}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleKaydet}
                  disabled={saving}
                  className="px-4 py-1.5 rounded-lg bg-[#5B47E0] text-white text-xs font-semibold hover:bg-[#4C3BC8] disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Kaydediliyor…' : 'Kaydet'}
                </button>
              </>
            )}
            <button
              onClick={() => { if (!em) onClose() }}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Save error */}
        {saveErr && (
          <div className="px-6 py-2.5 bg-red-50 border-b border-red-100 flex items-center justify-between">
            <p className="text-xs text-red-600">{saveErr}</p>
            <button onClick={() => setSaveErr(null)} className="text-red-400 hover:text-red-600">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Content */}
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
            <FirmaDetayIcerik
              record={record} pend={pend} em={em} izin={izin} isAdmin={isAdmin}
              onCh={onCh} valErr={valErr}
              notInput={notInput} setNotInput={setNotInput}
              notEkleniyor={notEkleniyor} onNotEkle={handleNotEkle}
            />
          )}
        </div>
      </div>

      {/* Undo toast */}
      {undoInfo && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60]
          flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-900 text-white text-sm shadow-xl">
          <span className="truncate max-w-[200px]">{undoInfo.firmAdi} güncellendi</span>
          <button
            onClick={handleUndo}
            className="px-2.5 py-1 rounded-md bg-white/20 hover:bg-white/30 text-xs font-semibold transition-colors shrink-0"
          >
            Geri al
          </button>
          <button onClick={() => setUndoInfo(null)} className="text-white/60 hover:text-white shrink-0">
            <X size={14} />
          </button>
        </div>
      )}
    </>
  )
}
