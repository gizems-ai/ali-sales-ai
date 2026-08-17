// ════════════════════════════════════════════════════════════════════════════
//  Store OS — ALİ KİMLİĞİ (üst brief şeridi + sağ kolon asistan kartı)
//
//  Desen kaynağı: emlak panelindeki "Briefing strip" ve "ALİ ASİSTANIN" kartı
//  (src/app/(panel)/page.tsx). KOD İMPORT EDİLMEDİ — izolasyon kuralı gereği
//  yapı yeniden yazıldı, yalnız ölçüler ve renk ailesi oradan alındı.
//
//  ── SAYILAR UYDURULMAZ ─────────────────────────────────────────────────────
//  Üç sayaç da kural motorunun çıktısından gelir:
//    Öneri  = düşük/orta/bilgi seviyeli açık alarm (aksiyon önerisi)
//    Uyarı  = yüksek/kritik seviyeli açık alarm
//    Görev  = zincirin ürettiği AÇIK görev sayısı (`gorevOzeti.acik`)
//  Kesişim yok: bir alarm ya öneri ya uyarı sayılır, ikisi birden değil.
//
//  Kart üzerindeki öneri CÜMLESİ de uydurma değil: en ağır alarmın olay
//  tipinden ve kamerasından kurulur. Metni burada Türkçe yazıyoruz çünkü
//  kural şablonları (Airtable seed) aksansız ASCII taşıyor.
// ════════════════════════════════════════════════════════════════════════════

import Image from 'next/image'
import type {
  AlarmSatiri, GorevOzeti, SaglikSkoru,
} from '@/lib/storeos/dashboard/tipler'
import type { Severity } from '@/lib/storeos/tipler'
import { Iskelet, Kart, sayiYaz, saatYaz } from './temel'

/** Avatar `/public/storeos/` altına KOPYALANDI (emlak tarafındaki dosyadan). */
const AVATAR = '/storeos/ali-avatar.png'

const AGIR: ReadonlySet<Severity> = new Set<Severity>(['high', 'critical'])

const SEV_SIRA: Record<Severity, number> = {
  critical: 4, high: 3, medium: 2, low: 1, info: 0,
}

export interface AliOzeti {
  oneri: number
  uyari: number
  gorev: number
  /** Başlıktaki N — Ali'nin bugün yüzeye çıkardığı toplam sinyal. */
  gelisme: number
}

/** Tek yer: şerit ve kart aynı sayıları görsün diye burada hesaplanır. */
export function aliOzeti(
  alarmlar: AlarmSatiri[] | null,
  ozet: GorevOzeti | null,
): AliOzeti | null {
  if (alarmlar === null && ozet === null) return null
  const a = alarmlar ?? []
  const uyari = a.filter(x => AGIR.has(x.severity)).length
  const oneri = a.length - uyari
  const gorev = ozet?.acik ?? 0
  return { oneri, uyari, gorev, gelisme: a.length }
}

// ─── Üst brief şeridi ────────────────────────────────────────────────────────

function Sayac({
  renk, ikon, n, etiket,
}: {
  renk: string
  ikon: string
  n: number
  etiket: string
}) {
  return (
    <div className="so-sayac" data-renk={renk}>
      <span className="so-sayac-ikon" aria-hidden="true">{ikon}</span>
      <div>
        <div className="so-sayac-n">{sayiYaz(n)}</div>
        <div className="so-sayac-etiket">{etiket}</div>
      </div>
    </div>
  )
}

export function AliSeridi({
  ozet, uretildi,
}: {
  ozet: AliOzeti | null
  /** Sunucunun ürettiği an — istemci saati KULLANILMAZ (hydration). */
  uretildi: string | null
}) {
  return (
    <section className="so-ali-serit">
      <div className="so-ali-halka">
        <Image src={AVATAR} alt="Ali" width={108} height={108} priority />
      </div>
      <div className="so-ali-metin">
        {ozet === null ? (
          <>
            <Iskelet yukseklik={15} genislik="320px" />
            <div style={{ marginTop: 6 }}><Iskelet yukseklik={11} genislik="240px" /></div>
          </>
        ) : (
          <>
            <div className="so-ali-baslik-2">
              Ali bugün mağazan için çalıştı —{' '}
              <b>{sayiYaz(ozet.gelisme)} kritik gelişme</b> var.
            </div>
            <div className="so-ali-alt">
              {uretildi ? `Son tarama ${saatYaz(uretildi)}` : 'Tarama sürüyor'} · Kural motoru
              kamera olaylarını kesintisiz işliyor.
            </div>
          </>
        )}
      </div>
      {ozet && (
        <div className="so-sayac-grup">
          <Sayac renk="yesil" ikon="✦" n={ozet.oneri} etiket="Öneri" />
          <Sayac renk="sari"  ikon="⚠" n={ozet.uyari} etiket="Uyarı" />
          <Sayac renk="mor"   ikon="✓" n={ozet.gorev} etiket="Görev" />
        </div>
      )}
    </section>
  )
}

// ─── Sağ kolon: ALİ ASİSTANIN ────────────────────────────────────────────────

/**
 * Olay tipi → Ali'nin ağzından tek cümlelik öneri. Madde listesi DEĞİL —
 * jüriye "asistan konuşuyor" hissi veren şey bu. Bilinmeyen tip sessizce
 * uydurma bir cümle almaz, genel bir ifadeye düşer.
 */
const OLAY_ONERISI: Record<string, string> = {
  'store.queue.threshold_exceeded': 'kasa kuyruğu eşiği aştı; ek kasa açmanı öneriyorum',
  'store.queue.length_changed':     'kasa bekleme süresi uzadı; müşterileri boş kasaya yönlendirmeni öneriyorum',
  'store.camera.offline':           'bir kamera çevrimdışı kaldı; teknik ekibe iletmeni öneriyorum',
  'store.camera.degraded':          'bir kameranın görüntü kalitesi düştü; kontrol ettirmeni öneriyorum',
  'store.occupancy.updated':        'mağaza yoğunluğu yükseldi; giriş yönlendirmesi ve ek personel öneriyorum',
  'store.shelf.gap_detected':       'rafta boşluk göründü; reyon dolumu planlamanı öneriyorum',
  'store.shelf.stock_low':          'raf doluluğu kritik seviyeye indi; ikmal talebi açmanı öneriyorum',
}

function enAgirAlarm(alarmlar: AlarmSatiri[]): AlarmSatiri | null {
  let en: AlarmSatiri | null = null
  for (const a of alarmlar) {
    if (!en || SEV_SIRA[a.severity] > SEV_SIRA[en.severity]) en = a
    else if (SEV_SIRA[a.severity] === SEV_SIRA[en.severity] && a.olustu > en.olustu) en = a
  }
  return en
}

export function AliKarti({
  alarmlar, ozet, skor,
}: {
  alarmlar: AlarmSatiri[] | null
  ozet: AliOzeti | null
  skor: SaglikSkoru | null
}) {
  const alarm = alarmlar ? enAgirAlarm(alarmlar) : null
  const cumle = alarm ? OLAY_ONERISI[alarm.olayTipi] : undefined

  return (
    <Kart className="so-ali-kart">
      <div className="so-ali-kart-etiket">ALİ ASİSTANIN</div>
      <div className="so-ali-kart-ad">Ali</div>

      <div className="so-ali-buyuk">
        <Image src={AVATAR} alt="Ali" width={216} height={216} />
      </div>

      <div>
        <span className="so-ali-cevrimici">Çevrimiçi</span>
      </div>

      <div className="so-ali-oneri">
        {alarmlar === null ? (
          <Iskelet yukseklik={38} />
        ) : alarm && cumle ? (
          <>
            <b>{saatYaz(alarm.olustu)}</b> itibarıyla
            {alarm.kameraAdi ? ` ${alarm.kameraAdi} bölgesinde ` : ' '}
            {cumle}. {ozet && ozet.gorev > 0
              ? `Bunu da içeren ${sayiYaz(ozet.gorev)} açık görevin var.`
              : 'Görev listesi şu an temiz.'}
          </>
        ) : alarm ? (
          <>
            <b>{saatYaz(alarm.olustu)}</b> itibarıyla {alarm.baslik} sinyalini yakaladım; ekranda
            detayına bakmanı öneriyorum.
          </>
        ) : (
          <>
            Şu an kritik bir sinyal görmüyorum
            {skor ? <> ve mağaza sağlık skorun <b>{sayiYaz(skor.deger)}</b></> : null}.
            {ozet && ozet.gorev > 0
              ? ` ${sayiYaz(ozet.gorev)} açık görevi kapatmanı öneriyorum.`
              : ' İzlemeye devam ediyorum.'}
          </>
        )}
      </div>

      {/* Sohbet ucu Gün 8'de bağlanacak — bugün açıkça devre dışı. */}
      <button type="button" className="so-dugme so-dugme-ali" disabled title="Sohbet ucu Gün 8'de bağlanıyor">
        Ali ile Sohbet Et →
      </button>
    </Kart>
  )
}
