// ════════════════════════════════════════════════════════════════════════════
//  Store OS — şema tek kaynağı.
//  docs/gratis/airtable-storeos-kurulum.md ve scripts/storeos/seed.ts
//  BU DOSYAYA göre yazılmıştır. Alan adı değişecekse önce burası değişir.
//
//  ALAN ADI KURALI: ASCII. Türkçe okunur ama aksansız (ı/ş/ğ/ç/ö/ü yok).
//  Gerekçe: filterByFormula string'leri URL-encode edilirken aksanlı alan
//  adları mevcut panelde tekrarlayan kaçış hatalarına yol açtı. Yeni base'de
//  bu sınıf hatayı baştan kapatıyoruz.
// ════════════════════════════════════════════════════════════════════════════

// ─── Tablo adları ────────────────────────────────────────────────────────────

export const TABLO = {
  magazalar:    'Magazalar',
  kameralar:    'Kameralar',
  kullanicilar: 'Kullanicilar',
  olaylar:      'Olaylar',
  kurallar:     'Kurallar',
  gorevler:     'Gorevler',
  bildirimler:  'Bildirimler',
  denetim:      'DenetimKaydi',
  metrikler:    'Metrikler',
} as const

export type TabloAdi = (typeof TABLO)[keyof typeof TABLO]

// ─── Enum'lar ────────────────────────────────────────────────────────────────

export const ROLLER = ['magaza_muduru', 'bolge_muduru', 'personel', 'guvenlik', 'merkez'] as const
export type Rol = (typeof ROLLER)[number]

export const SEVERITY = ['info', 'low', 'medium', 'high', 'critical'] as const
export type Severity = (typeof SEVERITY)[number]

export const MAGAZA_DURUMU = ['online', 'warning', 'offline'] as const
export type MagazaDurumu = (typeof MAGAZA_DURUMU)[number]

export const KAMERA_DURUMU = ['online', 'degraded', 'offline'] as const
export type KameraDurumu = (typeof KAMERA_DURUMU)[number]

/** Görev durum makinesi. Geçiş tablosu gorev-makinesi.ts'te (Gün 3). */
export const GOREV_DURUMLARI = [
  'yeni', 'atandi', 'goruldu', 'basladi', 'beklemede', 'tamamlandi',
  'onay_bekliyor', 'reddedildi', 'suresi_gecti', 'iptal',
] as const
export type GorevDurumu = (typeof GOREV_DURUMLARI)[number]

export const ONCELIK = ['dusuk', 'normal', 'yuksek', 'kritik'] as const
export type Oncelik = (typeof ONCELIK)[number]

export const KANAL = ['whatsapp', 'panel', 'konsol'] as const
export type Kanal = (typeof KANAL)[number]

export const BILDIRIM_DURUMU = ['kuyrukta', 'gonderildi', 'teslim', 'okundu', 'yanitlandi', 'hata'] as const
export type BildirimDurumu = (typeof BILDIRIM_DURUMU)[number]

export const METRIK_KAYNAGI = ['camera', 'pos', 'erp', 'sensor', 'manual'] as const
export type MetrikKaynagi = (typeof METRIK_KAYNAGI)[number]

/** DÜRÜSTLÜK KURALI (madde 11): her metriğin gerçek mi seed mi olduğu veriden okunur. */
export const VERI_TIPI = ['gercek', 'demo'] as const
export type VeriTipi = (typeof VERI_TIPI)[number]

export const AKTOR_TIPI = ['kullanici', 'system', 'partner'] as const
export type AktorTipi = (typeof AKTOR_TIPI)[number]

// ─── Alan adları + kayıt tipleri ─────────────────────────────────────────────
//
// TASARIM KARARI — linked record YOK.
// Her ilişki stabil metin anahtarıyla kurulur (Magaza Kodu, Olay ID, Gorev No).
// Gerekçe: linked record yazmak için önce hedefin Airtable record id'sini
// okumak gerekir; bu her yazmayı 2 isteğe çıkarır. Base başına ~5 istek/sn
// bütçemiz ve madde 13'teki gecikme kriterleri buna müsait değil.
// Bedeli: Airtable UI'da tıklanabilir ilişki yok. Demo için kabul edilebilir.

export interface Magaza {
  'Kod': string                    // birincil alan, örn. '0178'
  'Ad': string
  'Bolge': string
  'Sehir': string
  'Adres'?: string
  'Acilis Saati': string           // 'HH:mm'
  'Kapanis Saati': string
  'Durum': MagazaDurumu
  'Kasa Toplam': number            // "kasalar acik/toplam" kartı icin
  'Aktif': boolean
}

export interface Kamera {
  'Kamera ID': string              // birincil, örn. '0178-giris'
  'Magaza Kodu': string
  'Ad': string
  'Bolge Adi': string              // Giris / Kasa Alani / Kozmetik Reyon / Depo
  'Durum': KameraDurumu
  'Demo Video': string             // '/storeos/demo/giris.mp4'
  'Yetenekler': string             // virgülle ayrık: 'kisi_sayimi,kuyruk,raf'
  'Sira': number
}

export interface Kullanici {
  'Kullanici ID': string           // birincil, örn. 'u-mudur-0178'
  'Ad Soyad': string
  'Rol': Rol
  'Magaza Kodu': string
  'Telefon': string                // E.164, örn. '+905XXXXXXXXX'
  'Clerk User ID'?: string
  'Aktif': boolean
  'WA Oturum Acildi'?: string      // ISO — 24 saatlik pencerenin başlangıcı
}

/** Airtable'daki Olaylar satırı. Kanonik VisionEvent → bu satıra Gün 2'de eşlenir. */
export interface OlayKaydi {
  'Olay ID': string                // birincil + IDEMPOTENCY ANAHTARI
  'Magaza Kodu': string
  'Kamera ID'?: string
  'Olay Tipi': string              // 'queue.threshold_exceeded' vb.
  'Olustu': string                 // ISO 8601 — olayın gerçekleştiği an
  'Alindi': string                 // ISO 8601 — bizim kabul ettiğimiz an
  'Severity': Severity
  'Guven': number                  // 0-1
  'Metadata JSON': string
  'Snapshot URL'?: string
  'Klip URL'?: string
  'Kaynak Adapter': string         // 'generic' | 'ornek-vendor'
  'Islendi': boolean
  'Eslesen Kural'?: string
  'Veri Tipi': VeriTipi
}

export interface Kural {
  'Kural Adi': string              // birincil
  'Olay Tipi': string
  'Kosullar JSON': string          // [{alan, operator, deger}] — hepsi AND
  'Severity': Severity
  'Gorev Basligi': string          // şablon: '{magaza} kasa kuyrugu {deger} kisi'
  'Gorev Aciklamasi': string
  'Hedef Rol': Rol
  'Oncelik': Oncelik
  'SLA Dakika': number
  'Eskalasyon Dakika': number
  'Eskalasyon Rolu': Rol
  'Bildirim Kanali': Kanal
  'Kanit Gerekli': boolean
  'Sira': number                   // eşleşme sırası — küçük olan önce
  'Aktif': boolean
}

export interface Gorev {
  'Gorev No': string               // birincil, örn. 'G-000042'
  'Baslik': string
  'Aciklama': string
  'Magaza Kodu': string
  'Kaynak Olay ID'?: string
  'Kural'?: string
  'Gerekce': string                // hangi kural + hangi koşullar sağlandı
  'Atanan Kullanici ID'?: string
  'Atanan Rol': Rol
  'Oncelik': Oncelik
  'Durum': GorevDurumu
  'Olusturuldu': string            // ISO
  'Son Teslim': string             // ISO
  'Goruldu'?: string
  'Baslandi'?: string
  'Tamamlandi'?: string
  'Kanit Gerekli': boolean
  'Kanit URL'?: string
  'Veri Tipi': VeriTipi
}

export interface Bildirim {
  'Bildirim ID': string            // birincil
  'Gorev No'?: string
  'Olay ID'?: string
  'Kanal': Kanal
  'Alici Kullanici ID': string
  'Alici Telefon': string
  /**
   * Mesajın GERÇEKTEN gittiği numara. Demo telefon kilidi açıkken
   * 'Alici Telefon'dan farklıdır (bkz. kanal/telefon-kilidi.ts).
   * Gelen yanıtın numara kapısı bu alanla karşılaştırır — kilit açıkken
   * yanıt demo telefonundan gelir, görevin sahibinin numarasından değil.
   */
  'Gonderilen Telefon'?: string
  'Template'?: string              // oturum penceresinde boş (serbest mesaj)
  'Govde': string
  'Gonderim Zamani': string        // ISO
  'Durum': BildirimDurumu
  'Saglayici Mesaj ID'?: string    // 360Dialog message id — inbound eşleşmesi
  'Yanit'?: string                 // 'kabul' | 'devret' | 'ertele'
  'Yanit Zamani'?: string
  'Hata'?: string
}

/**
 * APPEND-ONLY. Bu tablo için kodda YALNIZ create yolu vardır.
 * denetim.ts içinde update/delete fonksiyonu yazılmayacak (madde 3, kabul kriteri 5).
 */
export interface DenetimSatiri {
  'Kayit ID': string               // birincil
  'Zaman': string                  // ISO
  'Aktor': string                  // Clerk user id | 'system' | 'partner:<ad>'
  'Aktor Tipi': AktorTipi
  'Aksiyon': string                // 'olay.kabul' · 'gorev.durum' · 'bildirim.gonder'
  'Entity Tipi': string            // 'olay' | 'gorev' | 'bildirim' | 'kural'
  'Entity ID': string
  'Oncesi JSON'?: string
  'Sonrasi JSON'?: string
  'IP'?: string
  'Kaynak': string                 // 'api' | 'panel' | 'n8n' | 'cron' | 'seed'
}

export interface Metrik {
  'Kayit ID': string               // birincil
  'Magaza Kodu': string
  'Metrik Tipi': string            // METRIK_TIPLERI'nden
  'Deger': number
  'Birim': string                  // 'kisi' | 'TL' | 'sn' | 'yuzde' | 'adet' | 'C'
  'Zaman': string                  // ISO
  'Kaynak': MetrikKaynagi
  'Veri Tipi': VeriTipi            // ← madde 11'in taşıyıcısı
  'Detay JSON'?: string            // saatlik seri / ısı haritası grid'i
}

/** Dashboard'un beklediği metrik tipleri — seed ve gerçek besleme aynı listeyi kullanır. */
export const METRIK_TIPLERI = [
  'ziyaretci',
  'satis_tutari',
  'kasa_bekleme_sn',
  'donusum_orani',
  'aktif_personel',
  'kuyruk_kisi',
  'yogunluk',
  'ortalama_kalis_dk',
  'ic_sicaklik',
  'etiket_uygunluk',
  'raf_doluluk',
  'kasa_acik',
  'kuyruk_saatlik',      // Detay JSON: [{saat, birincil, ikincil}]
  'yogunluk_grid',       // Detay JSON: {satir, sutun, hucreler:number[]}
  // Şekiller demo-metrikler.ts'te tanımlı (SaatlikNokta/IzgaraDetay/DagilimDetay).
  // Alan adları GENELDİR (birincil/ikincil, etiket/deger): grafik bileşenleri
  // metriğin ne olduğunu bilmeden çizebilsin diye.
  'satis_saatlik',
  'personel_dagilimi',   // Detay JSON: [{etiket, deger}]
] as const
export type MetrikTipi = (typeof METRIK_TIPLERI)[number]
