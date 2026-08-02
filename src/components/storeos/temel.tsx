// ════════════════════════════════════════════════════════════════════════════
//  Store OS — temel görsel parçalar (kart, rozet, durum ekranları).
//
//  Hepsi APTAL: veriyi prop olarak alır, fetch etmez, depo tanımaz, state
//  tutmaz. Renk gömülü değil — `.storeos-root` sınıfları + `tema.ts`.
// ════════════════════════════════════════════════════════════════════════════

import type { ReactNode } from 'react'
import type { VeriTipi } from '@/lib/storeos/tipler'

// ─── Örnek veri etiketi ──────────────────────────────────────────────────────

/**
 * DÜRÜSTLÜK KURALI (madde 11). `veriTipi === 'demo'` olan HER sayı bunu taşır.
 * Bileşen kendi karar vermez — veriden gelen alanı yansıtır. 'gercek' geldiğinde
 * hiçbir şey çizmez, yani gerçek veriye geçiş kod değişikliği gerektirmez.
 */
export function OrnekVeri({ veriTipi }: { veriTipi: VeriTipi }) {
  if (veriTipi !== 'demo') return null
  return <span className="so-ornek" title="Bu değer demo (seed) verisidir, gerçek ölçüm değildir.">örnek veri</span>
}

// ─── Kart ────────────────────────────────────────────────────────────────────

export function Kart({
  baslik, sag, children, className = '',
}: {
  baslik?: string
  sag?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`so-kart ${className}`.trim()}>
      {baslik && (
        <h2 className="so-kart-baslik">
          {baslik}
          {sag && <span className="so-sag">{sag}</span>}
        </h2>
      )}
      {children}
    </section>
  )
}

// ─── Durum ekranları ─────────────────────────────────────────────────────────
//
// Boş ve hata durumları BAŞTAN var (Yol B madde 6). "Veri yok" bir hata
// değildir: demo ilk açıldığında olay listesi boştur ve bu normaldir.

export function BosDurum({ baslik, metin }: { baslik: string; metin: string }) {
  return (
    <div className="so-durum">
      <div className="so-durum-baslik">{baslik}</div>
      <p className="so-durum-metin">{metin}</p>
    </div>
  )
}

export function HataDurumu({
  metin, tekrarDene,
}: {
  metin: string
  /** Verilirse "Tekrar dene" düğmesi çizilir. Kalıcı hatalarda verilmez. */
  tekrarDene?: () => void
}) {
  return (
    <div className="so-durum so-durum-hata">
      <div className="so-durum-baslik">Veri alınamadı</div>
      <p className="so-durum-metin">{metin}</p>
      {tekrarDene && (
        <button type="button" className="so-dugme" onClick={tekrarDene}>Tekrar dene</button>
      )}
    </div>
  )
}

/**
 * Yükleniyor iskeleti. Spinner değil: ekranın son hali yer tutar, veri gelince
 * yerleşim zıplamaz. Anket 2 sn'de bir döndüğü için zıplama fark edilir olurdu.
 */
export function Iskelet({ yukseklik = 16, genislik = '100%' }: { yukseklik?: number; genislik?: string }) {
  return <div className="so-iskelet" style={{ height: yukseklik, width: genislik }} />
}

export function IskeletListe({ adet = 4 }: { adet?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: adet }, (_, i) => <Iskelet key={i} yukseklik={34} />)}
    </div>
  )
}

// ─── Biçimlendiriciler ───────────────────────────────────────────────────────
//
// Locale 'tr-TR' SABİT. Varsayılan locale sunucu ile istemcide farklı olursa
// React hydration uyuşmazlığı verir; sayı biçimi jüri ekranında da tutarlı olur.

const SAYI = new Intl.NumberFormat('tr-TR')
const ONDALIK = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export function sayiYaz(n: number): string {
  return Number.isInteger(n) ? SAYI.format(n) : ONDALIK.format(n)
}

const BIRIM_SONEKI: Record<string, string> = {
  kisi: '', TL: '₺', sn: 'sn', yuzde: '%', adet: '', dk: 'dk', C: '°C',
}

export function birimYaz(birim: string): string {
  return BIRIM_SONEKI[birim] ?? birim
}

/** ISO → 'HH:mm'. Mağaza saati +03:00 sabit — sunucu UTC'de koşsa da kaymasın. */
export function saatYaz(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return '—'
  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul',
  }).format(t)
}

export function tarihSaatYaz(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return '—'
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  }).format(t)
}

/** "3 dk önce". Sunucunun `uretildi` anına göre — istemci saatine göre değil. */
export function gecenSure(iso: string, simdiMs: number): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return '—'
  const sn = Math.max(0, Math.round((simdiMs - t) / 1000))
  if (sn < 60) return 'az önce'
  const dk = Math.round(sn / 60)
  if (dk < 60) return `${dk} dk önce`
  const sa = Math.round(dk / 60)
  return sa < 24 ? `${sa} sa önce` : tarihSaatYaz(iso)
}
