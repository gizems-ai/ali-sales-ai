// ════════════════════════════════════════════════════════════════════════════
//  Store OS — PANO VERİ SÖZLEŞMESİ
//
//  Ekranın gördüğü TEK tip budur. Bileşenler aptaldır: veriyi prop olarak alır,
//  kendi isteğini atmaz, depo tanımaz. Böylece seed→gerçek geçişi tek dosyada
//  (`toplayici.ts`) olur, on beş bileşende değil.
//
//  ── DEPO-BAĞIMSIZLIK KURALI ────────────────────────────────────────────────
//  Hiçbir ekran bellek deposuna özgü davranışa yaslanmaz:
//   · Sıralama burada AÇIKÇA yapılır — deponun döndürdüğü sıraya güvenilmez.
//   · Anlık tutarlılık VARSAYILMAZ — POST edilen olay bir sonraki ankette
//     görünmeyebilir (Airtable'da görünmeyecektir). Ekran bunu "hata" saymaz.
//   · Her liste `bos` durumunu taşır; "veri yok" bir hata değil, bir durumdur.
//
//  ── DÜRÜSTLÜK KURALI (madde 11) ────────────────────────────────────────────
//  `veriTipi` her taşıyıcıda ayrı ayrı vardır ve VERİDEN gelir (Airtable
//  'Veri Tipi' alanı). Panel bunu uydurmaz. 'demo' olan her sayı ekranda
//  "örnek veri" etiketiyle görünür.
// ════════════════════════════════════════════════════════════════════════════

import type {
  GorevDurumu, KameraDurumu, MagazaDurumu, Oncelik, Severity, VeriTipi,
} from '../tipler'

/** İki katmanlı anket: canlı 2 sn, yavaş 30 sn. 'tam' ilk yüklemede. */
export const KATMANLAR = ['canli', 'yavas', 'tam'] as const
export type Katman = (typeof KATMANLAR)[number]

export function katmanMi(x: unknown): x is Katman {
  return typeof x === 'string' && (KATMANLAR as readonly string[]).includes(x)
}

// ─── Parçalar ────────────────────────────────────────────────────────────────

export interface MagazaOzeti {
  kod: string
  ad: string
  sehir: string
  bolge: string
  durum: MagazaDurumu
  acilis: string
  kapanis: string
  kasaAcik: number | null
  kasaToplam: number
  veriTipi: VeriTipi
}

export interface KpiKarti {
  /** Metrik tipi — React key ve test kancası. */
  anahtar: string
  etiket: string
  deger: number
  /** 'kisi' · 'TL' · 'sn' · 'yuzde' · 'dk' · 'adet' · 'C' */
  birim: string
  veriTipi: VeriTipi
  /** Kartın altında görünen tek satırlık bağlam. Yoksa gösterilmez. */
  alt?: string

  // ── Gün 7 · düzen referansı ────────────────────────────────────────────────
  /**
   * Ekranda nereye düşer: üst satırdaki büyük kart mı, "Anlık Durum"
   * listesindeki satır mı. Ayrımı `toplayici.ts` yapar; bileşen filtreler.
   */
  yerlesim: 'kart' | 'durum'
  /**
   * Dünkü değer. `null` = karşılaştırma verisi TAŞINMIYOR — kart o zaman
   * "vs dün" satırını hiç çizmez. Uydurulmuş bir 0 gösterilmez.
   */
  onceki: number | null
  /** Mini trend çizgisi. Son nokta `deger`e eşittir. `null` = çizgi yok. */
  trend: number[] | null
  /**
   * Bu metrikte ARTIŞ mı iyidir? Kasa bekleme süresinde azalış iyidir; delta
   * yeşil/turuncu kararı buradan verilir, işaretin yönünden değil.
   */
  iyiYon: 'artis' | 'azalis'
}

/**
 * Mağaza sağlık skoru — KAHRAMAN ÖĞE.
 *
 * Türetilmiş bir ölçüdür, seed'den gelmez: açık alarmların ağırlığı ve görev
 * yükünden hesaplanır (formül `toplayici.ts` içinde, tek yerde). Bu yüzden
 * canlı katmanda taşınır ve demo zinciri işlerken ekranda gerçekten oynar.
 */
export interface SaglikSkoru {
  /** 0–100. */
  deger: number
  /** 'Çok iyi' · 'İyi' · 'Dikkat' · 'Kritik' */
  sinif: string
  /** Skoru en çok düşüren tek etken — kartın altındaki bir satırlık gerekçe. */
  gerekce: string
  veriTipi: VeriTipi
}

export interface AlarmSatiri {
  olayId: string
  olayTipi: string
  baslik: string
  severity: Severity
  /** Olayın gerçekleştiği an (ISO). Ekran biçimlendirir. */
  olustu: string
  kameraAdi: string | null
  /** Kural eşleşti mi — eşleşmediyse ekranda "kural yok" rozeti. */
  gorevUretti: boolean
  veriTipi: VeriTipi
}

export interface GorevSatiri {
  gorevNo: string
  baslik: string
  durum: GorevDurumu
  oncelik: Oncelik
  atananAd: string | null
  atananRol: string
  sonTeslim: string
  /** Sunucuda hesaplanır — istemci saatine göre değil, tek doğru kaynak. */
  gecikti: boolean
  veriTipi: VeriTipi
}

export interface GorevOzeti {
  acik: number
  gecikmis: number
  tamamlandi: number
}

export interface SeriNoktasi {
  etiket: string
  birincil: number
  ikincil: number | null
}

export interface Seri {
  baslik: string
  birincilAd: string
  ikincilAd: string | null
  birim: string
  noktalar: SeriNoktasi[]
  veriTipi: VeriTipi
}

export interface Izgara {
  baslik: string
  satir: number
  sutun: number
  /** satir*sutun uzunluğunda, 0–100. */
  hucreler: number[]
  veriTipi: VeriTipi
}

export interface DagilimDilimi {
  etiket: string
  deger: number
}

export interface Dagilim {
  baslik: string
  birim: string
  dilimler: DagilimDilimi[]
  veriTipi: VeriTipi
}

export interface KameraSatiri {
  kameraId: string
  ad: string
  bolgeAdi: string
  durum: KameraDurumu
  yetenekler: string[]
}

export interface PersonelSatiri {
  kullaniciId: string
  adSoyad: string
  rol: string
  /** Bu kişiye açık görev sayısı. */
  acikGorev: number
}

// ─── Bileşik ─────────────────────────────────────────────────────────────────

/**
 * Panonun TEK veri nesnesi.
 *
 * Katman alanları: `canli` istekte yalnız alarmlar/görevler dolar, yavaş
 * alanlar `null` gelir. `null` = "bu istekte taşınmadı", `[]` = "veri yok".
 * Ayrım önemli: istemci null gelen alanı ELİNDEKİYLE korur, boş gelen alanı
 * boş gösterir.
 */
export interface DashboardVerisi {
  /** Sunucunun ürettiği an (ISO). Ekrandaki "son güncelleme" bundan gelir. */
  uretildi: string
  katman: Katman
  magazaKodu: string

  // canlı katman
  alarmlar: AlarmSatiri[] | null
  gorevler: GorevSatiri[] | null
  gorevOzeti: GorevOzeti | null
  /** Alarm + görev yükünden türetilir; canlı katmanda taşınır. */
  saglikSkoru: SaglikSkoru | null

  // yavaş katman
  magaza: MagazaOzeti | null
  kpiler: KpiKarti[] | null
  kuyrukSerisi: Seri | null
  satisSerisi: Seri | null
  yogunlukIzgarasi: Izgara | null
  rafDoluluk: Dagilim | null
  personelDagilimi: Dagilim | null
  kameralar: KameraSatiri[] | null
  personel: PersonelSatiri[] | null

  /** Panodaki verinin genel tipi. Herhangi biri 'demo' ise 'demo'. */
  veriTipi: VeriTipi
  /**
   * Bu katmanda gösterilecek hiçbir kayıt yok. Boş-durum ekranını tetikler.
   * "Henüz olay gelmedi" bir hata değildir — demo ilk açıldığında normaldir.
   */
  bos: boolean
}

/** Hata yanıtı — ekran bunu ayrı bir durum olarak çizer, boş listeyle karıştırmaz. */
export interface PanoHatasi {
  hata: string
  /** Tekrar denemek anlamlı mı (ağ/5xx) yoksa kalıcı mı (yetki). */
  tekrarDenenebilir: boolean
}
