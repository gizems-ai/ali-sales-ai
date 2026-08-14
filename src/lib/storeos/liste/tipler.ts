// ════════════════════════════════════════════════════════════════════════════
//  Store OS — LİSTE EKRANLARI VERİ SÖZLEŞMESİ (Alarmlar · Görevler · Denetim)
//
//  Pano'nun (`dashboard/tipler.ts`) YERİNE GEÇMEZ, YANINDA DURUR. Pano bir
//  özettir: her listeden ilk 20-25 satır, filtre yok. Bu ekranlar detaydır:
//  filtre var, satır başına çok daha fazla alan var, zincirin halkaları
//  (olay → kural → görev → denetim) birbirine bağlı.
//
//  Ayrı dosya olmasının sebebi: panonun sözleşmesi ÇALIŞIYOR ve jüri demosunun
//  ana ekranı o. Detay ekranları için oraya alan eklemek, çalışan ekranı her
//  seferinde riske atmak demek.
//
//  ── PANO'DAN DEVRALINAN KURALLAR (aynen geçerli) ───────────────────────────
//  · Bileşenler APTAL — veriyi prop alır, kendi isteğini atmaz, depo tanımaz.
//  · Sıralama TOPLAYICIDA açıkça yapılır; deponun döndürdüğü sıraya güvenilmez.
//  · `bos` bir durumdur, hata değildir.
//  · DÜRÜSTLÜK (madde 11): `veriTipi` VERİDEN gelir, panel uydurmaz.
//
//  ── BU DOSYAYA ÖZGÜ KURAL: SESSİZ KIRPMA YOK ───────────────────────────────
//  Depodan çekilen ham satır sayısının bir TAVANI var (aşağıda). Tavana
//  dayanıldığında ekran bunu SÖYLER (`tavanaUlasildi`). Gerekçe: "listede 200
//  kayıt var" ile "en yeni 200 kaydı görüyorsun, gerisi taranmadı" farklı
//  cümlelerdir ve jüriye ikincisini söylemek zorundayız.
// ════════════════════════════════════════════════════════════════════════════

import type {
  AktorTipi, GorevDurumu, Oncelik, Severity, VeriTipi,
} from '../tipler'

// ─── Görünümler ──────────────────────────────────────────────────────────────

export const GORUNUMLER = ['alarmlar', 'gorevler', 'denetim'] as const
export type Gorunum = (typeof GORUNUMLER)[number]

export function gorunumMu(x: unknown): x is Gorunum {
  return typeof x === 'string' && (GORUNUMLER as readonly string[]).includes(x)
}

/**
 * Depodan çekilen HAM satır tavanı (filtreden ÖNCE).
 *
 * Airtable sayfalaması (offset zinciri) henüz yazılmadı; tek sayfa 100 kayıt
 * döndürür ve zincir her sayfa için bir istek demek. Bu tavanlar, base başına
 * ~5 istek/sn bütçesinde tek ekran açılışının kaç istek edeceğini sabitliyor.
 *
 * Tavan aşıldığında ekran sessiz kalmaz — `tavanaUlasildi` ile söyler.
 */
export const TAVAN: Record<Gorunum, number> = {
  alarmlar: 200,
  gorevler: 200,
  denetim: 300,
}

// ─── Filtre ──────────────────────────────────────────────────────────────────

/**
 * Görev süzgeçleri DURUM DEĞİL, DURUM GRUBUDUR.
 * On adet durumun her birini ayrı düğme yapmak jüri ekranında gürültü; asıl
 * soru "kaç iş açık, kaçı gecikti". Grup → durum eşlemesi `toplayici.ts`'te,
 * `NIHAI_DURUMLAR` üzerinden — burada elle durum listesi TUTULMUYOR ki durum
 * makinesi değişince iki yer birden kaymasın.
 */
export const GOREV_SUZGECLERI = ['hepsi', 'acik', 'gecikmis', 'tamamlandi'] as const
export type GorevSuzgeci = (typeof GOREV_SUZGECLERI)[number]

export function gorevSuzgeciMi(x: unknown): x is GorevSuzgeci {
  return typeof x === 'string' && (GOREV_SUZGECLERI as readonly string[]).includes(x)
}

export const SEVERITY_SUZGECLERI = ['hepsi', 'info', 'low', 'medium', 'high', 'critical'] as const
export type SeveritySuzgeci = (typeof SEVERITY_SUZGECLERI)[number]

export function severitySuzgeciMi(x: unknown): x is SeveritySuzgeci {
  return typeof x === 'string' && (SEVERITY_SUZGECLERI as readonly string[]).includes(x)
}

export interface ListeFiltresi {
  /** Yalnız `alarmlar`. */
  severity: SeveritySuzgeci
  /** Yalnız `gorevler`. */
  durum: GorevSuzgeci
  /**
   * Tek bir kaydın izini sürme. Ekranlar arası derin bağlantının taşıyıcısı:
   * alarm satırındaki görev no'ya tıklayınca `/storeos/gorevler?entity=G-000042`,
   * görev satırındaki "denetim izi"ne tıklayınca `/storeos/denetim?entity=…`.
   * Denetim deposunda bu, arayüzdeki `entityId` filtresine DOĞRUDAN gider.
   */
  entity: string | null
  /** Serbest metin. Küçük harfe indirilip satırın arama metninde aranır. */
  q: string | null
}

export const BOS_FILTRE: ListeFiltresi = {
  severity: 'hepsi', durum: 'hepsi', entity: null, q: null,
}

/** Serbest metin tavanı — 120 karakterlik bir arama sorgusu kullanıcıdan gelmez. */
export const Q_TAVANI = 120

/**
 * Ham sorgu → normalize filtre. TEK ÇÖZÜMLEME YOLU: hem `/api/storeos/liste`
 * hem de sayfa sunucu bileşeni bunu çağırır, yoksa derin bağlantıyla açılan
 * ekran ile ilk anket isteği farklı filtreyi görebilir.
 *
 * GEÇERSİZ DEĞER = HATA DEĞİL, VARSAYILANA DÜŞME. Bu parametreler URL'de
 * taşınıyor; jüri demosunda birinin elle URL düzenlemesi ekranı kırmamalı.
 * (Görünüm adı bunun istisnası — orada tahmin yürütemeyiz, uç nokta 400 döner.)
 *
 * @param oku tek bir parametreyi döndüren okuyucu (URLSearchParams.get uyumlu)
 */
export function filtreCoz(oku: (ad: string) => string | null | undefined): ListeFiltresi {
  const severity = oku('severity')
  const durum = oku('durum')
  return {
    severity: severitySuzgeciMi(severity) ? severity : 'hepsi',
    durum: gorevSuzgeciMi(durum) ? durum : 'hepsi',
    entity: oku('entity')?.trim() || null,
    q: oku('q')?.trim().slice(0, Q_TAVANI) || null,
  }
}

// ─── Satır tipleri ───────────────────────────────────────────────────────────

/** Olay metadata'sı ekranda ham JSON olarak değil, ad-değer çifti olarak çizilir. */
export interface MetadataCifti {
  anahtar: string
  deger: string
}

/**
 * Alarm detayı — panonun `AlarmSatiri`'nın genişletilmiş hali.
 * Panodaki alanların ADLARI birebir korunur; ekstra alanlar eklenir. Aynı isim
 * iki farklı şey anlatmasın diye bilinçli.
 */
export interface AlarmDetayi {
  olayId: string
  olayTipi: string
  baslik: string
  severity: Severity
  olustu: string
  /** Bizim kabul ettiğimiz an. `olustu` ile arasındaki fark = uçtan uca gecikme. */
  alindi: string
  kameraId: string | null
  kameraAdi: string | null
  /** 0–1. Ekran yüzdeye çevirir. */
  guven: number
  kaynakAdapter: string
  islendi: boolean
  /** Eşleşen kuralın adı. Yoksa bu olay tipi için tanımlı kural yok demektir. */
  eslesenKural: string | null
  /**
   * Bu olaydan doğan görevin numarası — ZİNCİRİN GÖRÜNÜR HALKASI.
   * `null` iki farklı şey olabilir: kural eşleşmedi (o zaman `eslesenKural` da
   * null), ya da kural eşleşti ama görev tavanın dışında kaldı. Ekran ikisini
   * `eslesenKural`'a bakarak ayırır.
   */
  gorevNo: string | null
  metadata: MetadataCifti[]
  snapshotUrl: string | null
  veriTipi: VeriTipi
}

export interface GorevDetayi {
  gorevNo: string
  baslik: string
  aciklama: string
  durum: GorevDurumu
  oncelik: Oncelik
  atananAd: string | null
  atananRol: string
  olusturuldu: string
  sonTeslim: string
  goruldu: string | null
  baslandi: string | null
  tamamlandi: string | null
  /** Sunucuda hesaplanır — istemci saatine göre DEĞİL (pano ile aynı kural). */
  gecikti: boolean
  /**
   * Son teslime kalan dakika; negatif = gecikme dakikası.
   * Nihai durumdaki görevde `null` — biten işin geri sayımı anlamsız.
   */
  kalanDk: number | null
  kural: string | null
  /** Hangi koşullar sağlandığı için bu görev doğdu — kararın gerekçesi. */
  gerekce: string
  kaynakOlayId: string | null
  kanitGerekli: boolean
  kanitUrl: string | null
  veriTipi: VeriTipi
}

export interface DenetimGorunumu {
  kayitId: string
  zaman: string
  aktor: string
  aktorTipi: AktorTipi
  aksiyon: string
  aksiyonEtiketi: string
  entityTipi: string
  entityId: string
  kaynak: string
  /**
   * `Sonrasi JSON`'dan üretilmiş tek satırlık insan-okur özet. Ham JSON ekrana
   * basılmaz: 8k'lık bir gövde tabloyu kullanılamaz hale getirir.
   */
  ozet: string | null
}

// ─── Filtre seçenekleri ──────────────────────────────────────────────────────

/**
 * Süzgeç düğmelerinin yanındaki sayılar. HAM kümeden (filtre uygulanmadan)
 * sayılır — aksi halde 'kritik'i seçince diğer düğmeler 0 görünür ve kullanıcı
 * geri dönemeyeceğini sanır.
 */
export interface SecenekSayaci {
  deger: string
  etiket: string
  adet: number
}

// ─── Bileşik yanıt ───────────────────────────────────────────────────────────

interface ListeOrtak {
  /** Sunucunun ürettiği an (ISO). "şu kadar önce" hesapları bundan. */
  uretildi: string
  magazaKodu: string
  /** Uygulanan filtre — sunucu normalize eder, ekran bunu geri yansıtır. */
  filtre: ListeFiltresi
  /** Filtreden SONRA kalan satır sayısı (`satirlar.length` ile aynı). */
  toplam: number
  /** Depodan çekilen HAM satır sayısı (filtreden önce). */
  tarandi: number
  /** `tarandi` tavana dayandı — daha eski kayıtlar HİÇ taranmadı. */
  tavanaUlasildi: boolean
  /** Bu görünümün tavanı — ekran "en yeni N kayıt" diye yazabilsin. */
  tavan: number
  secenekler: SecenekSayaci[]
  veriTipi: VeriTipi
  /** Filtre sonrası hiç satır yok. Hata değil, durum. */
  bos: boolean
}

/**
 * Ayırt edici alan `gorunum`. TypeScript daraltması bunun üzerinden çalışır:
 * `if (v.gorunum === 'alarmlar')` içinde `v.satirlar` `AlarmDetayi[]`'dır.
 * Böylece ekran bileşeni yanlış satır tipini çizemez — derleme hatası verir.
 */
export type ListeVerisi =
  | (ListeOrtak & { gorunum: 'alarmlar'; satirlar: AlarmDetayi[] })
  | (ListeOrtak & { gorunum: 'gorevler'; satirlar: GorevDetayi[] })
  | (ListeOrtak & { gorunum: 'denetim'; satirlar: DenetimGorunumu[] })

/** Hata yanıtı — panonunkiyle AYNI şekil, istemci tarafı tek mantıkla işlesin. */
export interface ListeHatasi {
  hata: string
  tekrarDenenebilir: boolean
}
