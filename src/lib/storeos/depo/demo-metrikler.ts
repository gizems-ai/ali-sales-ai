// ════════════════════════════════════════════════════════════════════════════
//  Store OS — DEMO METRİKLERİ (tek kaynak)
//
//  Bellek deposu da, Airtable seed'i de BURADAN okur. Gün 2'de kurallarda
//  yaşanan ayrışmanın (seed bir şey yazıyor, bellek başka şey biliyor)
//  metriklerde tekrarlanmaması için tek fonksiyon.
//
//  KURALLAR
//   · `Math.random` YOK — repo kuralı. Tüm değerler FNV-1a tohumundan türer;
//     aynı (magazaKodu, gun) girdisi HER ZAMAN aynı sayıları verir. Prova
//     tekrarlanabilir olsun diye.
//   · Üretilen her kaydın `Veri Tipi` alanı 'demo'dur (madde 11). Panelde
//     "örnek veri" etiketi bu alandan doğar, ayrı bir bayraktan değil.
// ════════════════════════════════════════════════════════════════════════════

import type { Metrik } from '../tipler'

// ─── Deterministik sayı üreteci (FNV-1a) ─────────────────────────────────────

export function tohum(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** [alt, ust] aralığında deterministik tam sayı. */
export function sec(anahtar: string, alt: number, ust: number): number {
  return alt + (tohum(anahtar) % (ust - alt + 1))
}

/** [alt, ust] aralığında deterministik ondalık (2 basamak). */
export function secOndalik(anahtar: string, alt: number, ust: number): number {
  const t = tohum(anahtar)
  return Math.round((alt + ((t % 10000) / 10000) * (ust - alt)) * 100) / 100
}

// ─── Detay JSON şekilleri ────────────────────────────────────────────────────
// Panel bu şekilleri okur; alan adları burada sabittir.

export interface SaatlikNokta { saat: string; birincil: number; ikincil: number }
export interface IzgaraDetay { satir: number; sutun: number; hucreler: number[] }
export interface DagilimDetay { etiket: string; deger: number }

/**
 * Skaler KPI'ların kart detayı: dünkü değer (karşılaştırma) + gün içi mini
 * trend. Şema DEĞİŞMEDİ — `Detay JSON` alanı zaten vardı, seri metrikleri
 * için kullanılıyordu; skaler metrikler de artık dolduruyor.
 *
 * Trendin son noktası HER ZAMAN `Deger` alanına eşittir: kartın büyük sayısı
 * ile çizginin bittiği yer birbirini tutmazsa jüri haklı olarak sorar.
 */
export interface KpiDetay { onceki: number; trend: number[] }

const TREND_NOKTA = 8

/** Ölçünün doğasını korur: tam sayı metrik (kişi, adet) ondalığa düşmez. */
function yuvarla(v: number, tamsayi: boolean): number {
  return tamsayi ? Math.round(v) : Math.round(v * 100) / 100
}

/**
 * `oynaklik`: değerin yüzde kaçı kadar salınacağı. Kişi sayısı gibi oynak
 * metrikler yüksek, sıcaklık gibi durağanlar düşük alır — hepsi aynı genlikte
 * zıplarsa ekran sahte görünür.
 */
function kpiDetay(tip: string, gun: string, deger: number, oynaklik: number): KpiDetay {
  const tam = Number.isInteger(deger)
  const salinim = (anahtar: string) => (sec(anahtar, 0, 2000) / 1000) - 1   // -1 … +1
  const trend = Array.from({ length: TREND_NOKTA }, (_, i) =>
    i === TREND_NOKTA - 1
      ? yuvarla(deger, tam)
      : yuvarla(deger * (1 + (salinim(`trend-${tip}-${gun}-${i}`) * oynaklik) / 100), tam))
  return {
    onceki: yuvarla(deger * (1 + (salinim(`onceki-${tip}-${gun}`) * oynaklik) / 100), tam),
    trend,
  }
}

export const REYONLAR = ['Kozmetik', 'Kisisel Bakim', 'Parfum', 'Sac Bakim', 'Temizlik'] as const

export interface DemoMetrikGirdi {
  magazaKodu: string
  /** 'YYYY-MM-DD'. Aynı gün = aynı sayılar. */
  gun: string
  /** Kayıtların 'Zaman' alanı (ISO). Demo "şu an"ı. */
  zaman: string
  acilisSaati?: number
  kapanisSaati?: number
}

export function varsayilanMetrikler(g: DemoMetrikGirdi): Metrik[] {
  const { magazaKodu: M, gun: GUN, zaman } = g
  const acilis = g.acilisSaati ?? 10
  const kapanis = g.kapanisSaati ?? 22

  const yap = (
    tip: string, deger: number, birim: string,
    kaynak: Metrik['Kaynak'], detay?: unknown,
  ): Metrik => ({
    'Kayit ID': `m-${M}-${tip}-${GUN}`,
    'Magaza Kodu': M,
    'Metrik Tipi': tip,
    'Deger': deger,
    'Birim': birim,
    'Zaman': zaman,
    'Kaynak': kaynak,
    'Veri Tipi': 'demo',
    ...(detay ? { 'Detay JSON': JSON.stringify(detay) } : {}),
  })

  const saatler = Array.from({ length: kapanis - acilis }, (_, i) => acilis + i)
  const ss = (s: number) => `${String(s).padStart(2, '0')}:00`

  const kuyrukSaatlik: SaatlikNokta[] = saatler.map(s => ({
    saat: ss(s),
    birincil: sec(`kuyruk-ort-${GUN}-${s}`, 45, 210),   // ortalama bekleme sn
    ikincil: sec(`kuyruk-max-${GUN}-${s}`, 180, 420),   // maksimum bekleme sn
  }))

  const satisSaatlik: SaatlikNokta[] = saatler.map(s => ({
    saat: ss(s),
    birincil: sec(`satis-b-${GUN}-${s}`, 3200, 14800),  // bugün
    ikincil: sec(`satis-d-${GUN}-${s}`, 3000, 13900),   // dün
  }))

  /** 12x8 yoğunluk ızgarası — SVG ile çizilir, statik görsel değil. */
  const yogunlukGrid: IzgaraDetay = {
    satir: 8,
    sutun: 12,
    hucreler: Array.from({ length: 96 }, (_, i) => sec(`grid-${GUN}-${i}`, 0, 100)),
  }

  const rafDoluluk: DagilimDetay[] = REYONLAR.map(r => ({
    etiket: r,
    deger: sec(`raf-${GUN}-${r}`, 22, 96),
  }))

  const personelDagilimi: DagilimDetay[] = [
    { etiket: 'Kasa', deger: 3 },
    { etiket: 'Reyon', deger: 4 },
    { etiket: 'Depo', deger: 1 },
    { etiket: 'Guvenlik', deger: 1 },
  ]

  /** Skaler KPI: (tip, değer, birim, kaynak, oynaklık%). Detay JSON otomatik. */
  const kpi = (
    tip: string, deger: number, birim: string, kaynak: Metrik['Kaynak'], oynaklik: number,
  ): Metrik => yap(tip, deger, birim, kaynak, kpiDetay(tip, GUN, deger, oynaklik))

  return [
    kpi('ziyaretci',         sec(`ziyaretci-${GUN}`, 1150, 1980),   'kisi',  'camera', 14),
    kpi('satis_tutari',      sec(`satis-${GUN}`, 68000, 142000),    'TL',    'pos',    16),
    kpi('kasa_bekleme_sn',   sec(`bekleme-${GUN}`, 95, 260),        'sn',    'camera', 22),
    kpi('donusum_orani',     secOndalik(`donusum-${GUN}`, 18, 34),  'yuzde', 'pos',    11),
    kpi('aktif_personel',    9,                                     'adet',  'manual',  9),
    kpi('kuyruk_kisi',       7,                                     'kisi',  'camera', 30),
    kpi('yogunluk',          sec(`yogunluk-${GUN}`, 55, 92),        'yuzde', 'camera', 18),
    kpi('ortalama_kalis_dk', sec(`kalis-${GUN}`, 9, 24),            'dk',    'camera', 12),
    kpi('ic_sicaklik',       secOndalik(`sicaklik-${GUN}`, 21, 26), 'C',     'sensor',  3),
    kpi('etiket_uygunluk',   sec(`etiket-${GUN}`, 88, 99),          'yuzde', 'manual',  4),
    kpi('kasa_acik',         5,                                     'adet',  'pos',    12),
    yap('kuyruk_saatlik',    0, 'sn',    'camera', kuyrukSaatlik),
    yap('satis_saatlik',     0, 'TL',    'pos',    satisSaatlik),
    yap('yogunluk_grid',     0, 'yuzde', 'camera', yogunlukGrid),
    yap('raf_doluluk',       0, 'yuzde', 'camera', rafDoluluk),
    yap('personel_dagilimi', 0, 'adet',  'manual', personelDagilimi),
  ]
}

// ════════════════════════════════════════════════════════════════════════════
//  MODÜL EKRANLARI — KAPSAM GÖSTERİSİ SEED'İ (18 Ağu 2026)
//
//  Neden burada: on bir yeni modül ekranı yazıldı ve hepsi SALT OKUNUR. Her
//  birinin verisi ayrı bir dosyada dursaydı "tek kaynak" kuralı ilk günde
//  kırılırdı. Ekranların okuduğu her sayı bu dosyadan, aynı FNV-1a tohumundan
//  türer: aynı gün = aynı ekran, prova tekrarlanabilir.
//
//  ── SINIR ─────────────────────────────────────────────────────────────────
//  Bu bölüm DEPOYA YAZMAZ. `varsayilanMetrikler` panonun metrik kayıtlarını
//  üretir ve Airtable'a gider; buradaki fonksiyonlar yalnızca sunucu
//  bileşenlerinin okuduğu saf veridir. Sebep: zincire (olay → kural → görev →
//  bildirim) dokunmamak. Yeni ekranlar tek bir Airtable isteği bile atmaz,
//  dolayısıyla 5 istek/sn tavanına yeni yük binmez.
//
//  ── DÜRÜSTLÜK ─────────────────────────────────────────────────────────────
//  Buradan beslenen her ekran `veriTipi='demo'` taşır: üstte tek bant, başlıkta
//  "örnek veri" noktası. Tek istisna yok.
// ════════════════════════════════════════════════════════════════════════════

/** Şablonun KPI şeridine verdiği hafif şekil — `KpiKarti`ya sunumda çevrilir. */
export interface ModulKpi {
  anahtar: string
  etiket: string
  deger: number
  birim: string
  onceki: number
  trend: number[]
  iyiYon: 'artis' | 'azalis'
}

/** Grafik verisi. Sunum katmanı bunu `Seri`ye çevirir (bkz. modul-sablonu). */
export interface ModulSeri {
  baslik: string
  birincilAd: string
  ikincilAd: string | null
  birim: string
  noktalar: SaatlikNokta[]
}

/** Tabloların satırı: hücreler zaten biçimlenmiş metin. */
export interface ModulSatir {
  anahtar: string
  hucreler: string[]
  /** Rozet sınıfı için ipucu: 'iyi' | 'dikkat' | 'kritik' | undefined. */
  vurgu?: 'iyi' | 'dikkat' | 'kritik'
}

function mKpi(
  gun: string, anahtar: string, etiket: string, deger: number, birim: string,
  oynaklik: number, iyiYon: 'artis' | 'azalis' = 'artis',
): ModulKpi {
  const d = kpiDetay(anahtar, gun, deger, oynaklik)
  return { anahtar, etiket, deger, birim, onceki: d.onceki, trend: d.trend, iyiYon }
}

/** Deterministik 'HH:MM'. Saat aralığı verilir, dakika tohumdan gelir. */
function saatDamgasi(anahtar: string, altSaat: number, ustSaat: number): string {
  const dk = sec(anahtar, altSaat * 60, ustSaat * 60)
  return `${String(Math.floor(dk / 60)).padStart(2, '0')}:${String(dk % 60).padStart(2, '0')}`
}

const SAATLER = Array.from({ length: 12 }, (_, i) => `${String(10 + i).padStart(2, '0')}:00`)

// ─── 1 · Canlı İzleme ────────────────────────────────────────────────────────

export interface KameraKaydi {
  id: string
  ad: string
  bolge: string
  durum: 'online' | 'degraded' | 'offline'
  cozunurluk: string
  fps: number
  sonBaglanti: string
  sonOlay: string
  /** Şema çiziminde sahneyi çeşitlendiren indeks (0–5). */
  varyant: number
  /** Karede çizilecek anonim kuyruk uzunluğu. */
  kuyruk: number
}

export interface KameraOlayi {
  saat: string
  kameraAdi: string
  metin: string
  seviye: 'bilgi' | 'dikkat' | 'kritik'
}

const KAMERA_TANIMLARI: Array<[string, string, string]> = [
  ['giris',   'Giriş Kamerası',     'Giriş & Turnike'],
  ['kasa',    'Kasa Alanı',         'Kasa Hattı'],
  ['kozmetik','Kozmetik Reyonu',    'Kozmetik'],
  ['cilt',    'Cilt Bakım Reyonu',  'Cilt Bakım'],
  ['depo',    'Depo Girişi',        'Depo & Sevkiyat'],
  ['koridor', 'Orta Koridor',       'Koridor'],
]

export function kameraModulu(gun: string): {
  kameralar: KameraKaydi[]
  olaylar: KameraOlayi[]
  kpiler: ModulKpi[]
} {
  const kameralar: KameraKaydi[] = KAMERA_TANIMLARI.map(([kod, ad, bolge], i) => ({
    id: `0178-${kod}`,
    ad,
    bolge,
    durum: 'online',
    cozunurluk: i % 3 === 0 ? '1080p' : '720p',
    fps: i % 2 === 0 ? 25 : 15,
    sonBaglanti: saatDamgasi(`kam-bag-${gun}-${kod}`, 6, 9),
    sonOlay: saatDamgasi(`kam-olay-${gun}-${kod}`, 10, 21),
    varyant: i,
    kuyruk: kod === 'kasa' ? sec(`kam-kuyruk-${gun}`, 4, 8) : 0,
  }))

  const OLAY_METINLERI: Array<[string, KameraOlayi['seviye']]> = [
    ['Bölgede yoğunluk eşiği aşıldı — anonim sayım', 'dikkat'],
    ['Kuyruk uzunluğu 5 kişiyi geçti', 'kritik'],
    ['Raf boşluğu tespit edildi', 'dikkat'],
    ['Doluluk normale döndü', 'bilgi'],
    ['Sevkiyat kapısı hareketi', 'bilgi'],
    ['Koridorda geçiş yoğunluğu arttı', 'bilgi'],
    ['Kasa önü bekleme süresi düştü', 'bilgi'],
    ['Bölge sayımı güncellendi', 'bilgi'],
  ]

  const olaylar: KameraOlayi[] = Array.from({ length: 10 }, (_, i) => {
    const k = kameralar[sec(`kam-ol-k-${gun}-${i}`, 0, kameralar.length - 1)]
    const [metin, seviye] = OLAY_METINLERI[sec(`kam-ol-m-${gun}-${i}`, 0, OLAY_METINLERI.length - 1)]
    return { saat: saatDamgasi(`kam-ol-s-${gun}-${i}`, 10, 21), kameraAdi: k.ad, metin, seviye }
  }).sort((a, b) => (a.saat < b.saat ? 1 : -1))

  return {
    kameralar,
    olaylar,
    kpiler: [
      mKpi(gun, 'kamera_online', 'Çevrimiçi kamera', 6, 'adet', 4),
      mKpi(gun, 'kamera_offline', 'Çevrimdışı', 0, 'adet', 0, 'azalis'),
      mKpi(gun, 'kamera_olay', 'Bugünkü kamera olayı', sec(`kam-olay-n-${gun}`, 34, 78), 'adet', 18),
      mKpi(gun, 'kamera_kapsam', 'Bölge kapsaması', sec(`kam-kapsam-${gun}`, 86, 97), 'yuzde', 5),
    ],
  }
}

// ─── 3 · Kasa & Kuyruk ───────────────────────────────────────────────────────

export interface KasaKaydi {
  ad: string
  durum: 'acik' | 'kapali' | 'mola'
  kasiyer: string
  bekleyen: number
  ortSure: number
  islemSaat: number
}

export function kasaModulu(gun: string): {
  kpiler: ModulKpi[]
  kasalar: KasaKaydi[]
  seri: ModulSeri
  esikSn: number
  oneri: { baslik: string; metin: string; gerekce: string }
} {
  const KASIYERLER = ['Elif A.', 'Burak T.', 'Selin K.', 'Mert Y.', 'Deniz Ö.', '—']
  const kasalar: KasaKaydi[] = Array.from({ length: 6 }, (_, i) => {
    const acik = i < 4
    return {
      ad: `Kasa ${i + 1}`,
      durum: acik ? 'acik' : i === 4 ? 'mola' : 'kapali',
      kasiyer: acik || i === 4 ? KASIYERLER[i] : '—',
      bekleyen: acik ? sec(`kasa-bek-${gun}-${i}`, 0, 7) : 0,
      ortSure: acik ? sec(`kasa-sure-${gun}-${i}`, 62, 245) : 0,
      islemSaat: acik ? sec(`kasa-islem-${gun}-${i}`, 18, 42) : 0,
    }
  })

  const ortalama = Math.round(
    kasalar.filter(k => k.durum === 'acik').reduce((t, k) => t + k.ortSure, 0) /
    Math.max(1, kasalar.filter(k => k.durum === 'acik').length))
  const tepe = Math.max(...kasalar.map(k => k.ortSure))

  return {
    kpiler: [
      mKpi(gun, 'kasa_ort_bekleme', 'Ortalama bekleme', ortalama, 'sn', 20, 'azalis'),
      mKpi(gun, 'kasa_tepe_bekleme', 'Tepe bekleme', tepe, 'sn', 24, 'azalis'),
      mKpi(gun, 'kasa_acik_adet', 'Açık kasa', 4, 'adet', 12),
      mKpi(gun, 'kasa_sla_ihlal', 'SLA ihlali', sec(`kasa-sla-${gun}`, 1, 6), 'adet', 30, 'azalis'),
    ],
    kasalar,
    seri: {
      baslik: 'Saat bazlı kuyruk',
      birincilAd: 'Ortalama bekleme',
      ikincilAd: 'Tepe bekleme',
      birim: 'sn',
      noktalar: SAATLER.map(s => ({
        saat: s,
        birincil: sec(`kk-ort-${gun}-${s}`, 45, 210),
        ikincil: sec(`kk-max-${gun}-${s}`, 180, 420),
      })),
    },
    esikSn: 180,
    oneri: {
      baslik: '17:00–19:00 arası 5. kasayı açın',
      metin: 'Bekleme süresi 18:00 bandında eşiği (3:00) aşıyor. Bir kasa daha açıldığında ortalama beklemenin 2:10 seviyesine inmesi bekleniyor.',
      gerekce: 'Kural: kuyruk esigi · store.queue.threshold_exceeded · 180 sn · son 3 gün tekrarı 3/3',
    },
  }
}

// ─── 4 · Raf & Stok ──────────────────────────────────────────────────────────

export interface RafKaydi {
  reyon: string
  doluluk: number
  bosYuz: number
  sonDolum: string
  sorumlu: string
}

export function rafModulu(gun: string): {
  kpiler: ModulKpi[]
  raflar: RafKaydi[]
  planogram: Array<{ ad: string; uyum: number; not: string }>
  dagilim: DagilimDetay[]
} {
  const SORUMLULAR = ['Selin K.', 'Mert Y.', 'Deniz Ö.', 'Burak T.', 'Elif A.']
  const raflar: RafKaydi[] = REYONLAR.map((r, i) => ({
    reyon: r,
    doluluk: sec(`rafm-dol-${gun}-${r}`, 34, 97),
    bosYuz: sec(`rafm-bos-${gun}-${r}`, 0, 22),
    sonDolum: saatDamgasi(`rafm-dolum-${gun}-${r}`, 8, 16),
    sorumlu: SORUMLULAR[i % SORUMLULAR.length],
  }))
  const ortalama = Math.round(raflar.reduce((t, r) => t + r.doluluk, 0) / raflar.length)

  return {
    kpiler: [
      mKpi(gun, 'raf_doluluk', 'Raf bulunurluğu', ortalama, 'yuzde', 8),
      mKpi(gun, 'raf_kritik', 'Kritik ürün', sec(`rafm-kritik-${gun}`, 4, 17), 'adet', 26, 'azalis'),
      mKpi(gun, 'raf_tukenme', 'Tahmini tükenme', sec(`rafm-tuk-${gun}`, 2, 9), 'adet', 22, 'azalis'),
      mKpi(gun, 'raf_kontrol', 'Son kontrolden bu yana', sec(`rafm-kont-${gun}`, 18, 95), 'dk', 30, 'azalis'),
    ],
    raflar,
    planogram: REYONLAR.map(r => ({
      ad: r,
      uyum: sec(`rafm-plan-${gun}-${r}`, 71, 99),
      not: sec(`rafm-plan-${gun}-${r}`, 71, 99) >= 90 ? 'Uyumlu' : 'Teşhir sırası kaymış',
    })),
    dagilim: REYONLAR.map(r => ({ etiket: r, deger: sec(`rafm-dol-${gun}-${r}`, 34, 97) })),
  }
}

// ─── 5 · Mağaza Analizleri ───────────────────────────────────────────────────

export function analizModulu(gun: string): {
  kpiler: ModulKpi[]
  ziyaretciBugunDun: ModulSeri
  ziyaretciGecenHafta: ModulSeri
  huni: DagilimDetay[]
  kalisSuresi: DagilimDetay[]
  izgara: IzgaraDetay
} {
  const bugun = SAATLER.map(s => sec(`an-b-${gun}-${s}`, 42, 210))
  return {
    kpiler: [
      mKpi(gun, 'an_ziyaretci', 'Ziyaretçi', sec(`an-z-${gun}`, 1150, 1980), 'kisi', 14),
      mKpi(gun, 'an_donusum', 'Dönüşüm oranı', secOndalik(`an-d-${gun}`, 18, 34), 'yuzde', 11),
      mKpi(gun, 'an_sepet', 'Ortalama sepet', sec(`an-s-${gun}`, 118, 265), 'TL', 12),
      mKpi(gun, 'an_kalis', 'Ortalama kalış', sec(`an-k-${gun}`, 9, 24), 'dk', 12),
    ],
    ziyaretciBugunDun: {
      baslik: 'Ziyaretçi eğrisi — bugün / dün',
      birincilAd: 'Bugün', ikincilAd: 'Dün', birim: 'kisi',
      noktalar: SAATLER.map((s, i) => ({
        saat: s, birincil: bugun[i], ikincil: sec(`an-dun-${gun}-${s}`, 38, 195),
      })),
    },
    ziyaretciGecenHafta: {
      baslik: 'Ziyaretçi eğrisi — bugün / geçen hafta aynı gün',
      birincilAd: 'Bugün', ikincilAd: 'Geçen hafta', birim: 'kisi',
      noktalar: SAATLER.map((s, i) => ({
        saat: s, birincil: bugun[i], ikincil: sec(`an-gh-${gun}-${s}`, 30, 188),
      })),
    },
    huni: [
      { etiket: 'Mağazaya giriş', deger: sec(`an-h1-${gun}`, 1150, 1980) },
      { etiket: 'Reyon ziyareti', deger: sec(`an-h2-${gun}`, 780, 1140) },
      { etiket: 'Kasaya yönelme', deger: sec(`an-h3-${gun}`, 410, 760) },
      { etiket: 'Satışa dönen', deger: sec(`an-h4-${gun}`, 260, 400) },
    ],
    kalisSuresi: [
      { etiket: 'Kozmetik', deger: sec(`an-kal-${gun}-koz`, 6, 19) },
      { etiket: 'Cilt Bakım', deger: sec(`an-kal-${gun}-cil`, 5, 16) },
      { etiket: 'Parfüm', deger: sec(`an-kal-${gun}-par`, 3, 12) },
      { etiket: 'Saç Bakım', deger: sec(`an-kal-${gun}-sac`, 3, 11) },
      { etiket: 'Kasa hattı', deger: sec(`an-kal-${gun}-kas`, 2, 7) },
    ],
    izgara: {
      satir: 8, sutun: 12,
      hucreler: Array.from({ length: 96 }, (_, i) => sec(`an-grid-${gun}-${i}`, 0, 100)),
    },
  }
}

// ─── 6 · Personel ────────────────────────────────────────────────────────────

export interface PersonelKaydi {
  ad: string
  rol: string
  bolge: string
  vardiya: string
  acikGorev: number
  tamamlanma: number
}

export function personelModulu(gun: string): {
  kpiler: ModulKpi[]
  kisiler: PersonelKaydi[]
  dagilim: DagilimDetay[]
  oneri: { baslik: string; metin: string }
} {
  const TANIM: Array<[string, string, string, string]> = [
    ['Ayşe Demir',   'Mağaza Müdürü', 'Yönetim',    '09:00 – 18:00'],
    ['Elif Aksoy',   'Kasiyer',       'Kasa Hattı', '10:00 – 19:00'],
    ['Burak Tunç',   'Kasiyer',       'Kasa Hattı', '13:00 – 22:00'],
    ['Selin Kaya',   'Reyon Görevlisi', 'Kozmetik', '10:00 – 19:00'],
    ['Mert Yıldız',  'Reyon Görevlisi', 'Cilt Bakım', '10:00 – 19:00'],
    ['Deniz Öztürk', 'Reyon Görevlisi', 'Parfüm',   '13:00 – 22:00'],
    ['Kaan Arslan',  'Depo Sorumlusu', 'Depo',      '08:00 – 17:00'],
    ['Ece Şahin',    'Güvenlik',      'Giriş',      '10:00 – 22:00'],
    ['Onur Çelik',   'Reyon Görevlisi', 'Saç Bakım', '13:00 – 22:00'],
  ]
  const kisiler: PersonelKaydi[] = TANIM.map(([ad, rol, bolge, vardiya], i) => ({
    ad, rol, bolge, vardiya,
    acikGorev: sec(`per-g-${gun}-${i}`, 0, 4),
    tamamlanma: sec(`per-t-${gun}-${i}`, 62, 100),
  }))
  const ortTamam = Math.round(kisiler.reduce((t, k) => t + k.tamamlanma, 0) / kisiler.length)

  return {
    kpiler: [
      mKpi(gun, 'per_vardiya', 'Vardiyada', kisiler.length, 'kisi', 8),
      mKpi(gun, 'per_aktif', 'Şu an aktif', sec(`per-akt-${gun}`, 5, 9), 'kisi', 14),
      mKpi(gun, 'per_tamam', 'Görev tamamlama', ortTamam, 'yuzde', 9),
      mKpi(gun, 'per_yanit', 'Ortalama yanıt', sec(`per-yan-${gun}`, 3, 14), 'dk', 22, 'azalis'),
    ],
    kisiler,
    dagilim: [
      { etiket: 'Kasa', deger: 2 },
      { etiket: 'Reyon', deger: 4 },
      { etiket: 'Depo', deger: 1 },
      { etiket: 'Güvenlik', deger: 1 },
      { etiket: 'Yönetim', deger: 1 },
    ],
    oneri: {
      baslik: 'Akşam bandı için bir kişi daha',
      metin: 'Ziyaretçi eğrisi 17:00–19:00 arası tepe yapıyor; kasa hattında o saatte iki kişi var. Vardiya planında bir reyon görevlisini 18:00–20:00 arasında kasaya kaydırmak beklemeyi kısaltır.',
    },
  }
}

// ─── 7 · Raporlar ────────────────────────────────────────────────────────────

export function raporModulu(gun: string): {
  gunluk: Array<{ etiket: string; deger: string; not: string }>
  haftalik: ModulSatir[]
  zamanlanmis: Array<{ ad: string; siklik: string; alici: string; durum: string }>
} {
  const GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
  return {
    gunluk: [
      { etiket: 'Ziyaretçi', deger: `${sec(`rap-z-${gun}`, 1150, 1980)}`, not: 'kamera sayımı' },
      { etiket: 'Dönüşüm oranı', deger: `%${secOndalik(`rap-d-${gun}`, 18, 34)}`, not: 'POS eşleşmesi' },
      { etiket: 'Ortalama bekleme', deger: `${Math.floor(sec(`rap-b-${gun}`, 95, 260) / 60)}:${String(sec(`rap-b-${gun}`, 95, 260) % 60).padStart(2, '0')} dk`, not: 'kasa hattı' },
      { etiket: 'Raf bulunurluğu', deger: `%${sec(`rap-r-${gun}`, 74, 96)}`, not: 'reyon taraması' },
      { etiket: 'Açılan görev', deger: `${sec(`rap-g-${gun}`, 6, 21)}`, not: 'kural motoru' },
      { etiket: 'Kapanan görev', deger: `${sec(`rap-k-${gun}`, 4, 19)}`, not: 'personel' },
    ],
    haftalik: GUNLER.map((g, i) => ({
      anahtar: g,
      hucreler: [
        g,
        `${sec(`rap-h-z-${gun}-${i}`, 980, 2200)}`,
        `%${sec(`rap-h-d-${gun}-${i}`, 17, 33)}`,
        `${sec(`rap-h-g-${gun}-${i}`, 4, 22)}`,
        `%${sec(`rap-h-s-${gun}-${i}`, 66, 98)}`,
      ],
    })),
    zamanlanmis: [
      { ad: 'Günlük mağaza karnesi', siklik: 'Her gün 22:30', alici: 'Mağaza müdürü', durum: 'Faz 2' },
      { ad: 'Haftalık bölge özeti', siklik: 'Pazartesi 08:00', alici: 'Bölge müdürü', durum: 'Faz 2' },
      { ad: 'Aylık kapsam raporu', siklik: 'Ayın 1\'i 09:00', alici: 'Merkez', durum: 'Faz 2' },
    ],
  }
}

// ─── 8 · İSG & Güvenlik ──────────────────────────────────────────────────────

export interface IsgKaydi {
  no: string
  saat: string
  tip: string
  bolge: string
  seviye: 'bilgi' | 'dikkat' | 'kritik'
  durum: string
  aciklama: string
}

export function isgModulu(gun: string): {
  kpiler: ModulKpi[]
  kayitlar: IsgKaydi[]
  dagilim: DagilimDetay[]
} {
  const TIPLER: Array<[string, string, IsgKaydi['seviye'], string]> = [
    ['Islak zemin', 'Kozmetik', 'kritik', 'Zeminde sıvı tespit edildi; uyarı levhası ve temizlik görevi açıldı.'],
    ['Acil çıkış engeli', 'Koridor', 'kritik', 'Acil çıkış önünde palet tespit edildi.'],
    ['Yangın tüpü kontrolü', 'Depo', 'dikkat', 'Periyodik kontrol tarihi yaklaşıyor.'],
    ['Kapı açık kaldı', 'Depo & Sevkiyat', 'dikkat', 'Sevkiyat kapısı 12 dakika açık kaldı.'],
    ['Şüpheli hareket', 'Parfüm', 'dikkat', 'Reyon önünde uzun süreli duraklama; anonim sayım.'],
    ['Kask/önlük eksiği', 'Depo', 'bilgi', 'Depo girişinde ekipman kontrolü hatırlatması.'],
  ]
  const kayitlar: IsgKaydi[] = TIPLER.map(([tip, bolge, seviye, aciklama], i) => ({
    no: `ISG-${String(100 + i).padStart(4, '0')}`,
    saat: saatDamgasi(`isg-s-${gun}-${i}`, 10, 21),
    tip, bolge, seviye, aciklama,
    durum: i < 2 ? 'Açık' : i < 4 ? 'İşlemde' : 'Kapandı',
  })).sort((a, b) => (a.saat < b.saat ? 1 : -1))

  return {
    kpiler: [
      mKpi(gun, 'isg_acik', 'Açık kayıt', 2, 'adet', 24, 'azalis'),
      mKpi(gun, 'isg_bugun', 'Bugünkü olay', kayitlar.length, 'adet', 20, 'azalis'),
      mKpi(gun, 'isg_kapanma', 'Ortalama kapanma', sec(`isg-kap-${gun}`, 12, 58), 'dk', 20, 'azalis'),
      mKpi(gun, 'isg_gun', 'Kazasız gün', sec(`isg-gun-${gun}`, 41, 180), 'adet', 3),
    ],
    kayitlar,
    dagilim: [
      { etiket: 'Kritik', deger: kayitlar.filter(k => k.seviye === 'kritik').length },
      { etiket: 'Dikkat', deger: kayitlar.filter(k => k.seviye === 'dikkat').length },
      { etiket: 'Bilgi', deger: kayitlar.filter(k => k.seviye === 'bilgi').length },
    ],
  }
}

// ─── 9 · Bakım & Arıza ───────────────────────────────────────────────────────

export interface VarlikKaydi {
  ad: string
  tur: string
  konum: string
  durum: 'calisiyor' | 'uyari' | 'ariza'
  sonBakim: string
  garanti: string
}

export function bakimModulu(gun: string): {
  kpiler: ModulKpi[]
  varliklar: VarlikKaydi[]
  arizalar: Array<{ no: string; varlik: string; acilis: string; sla: string; durum: string; kalanDk: number }>
  takvim: Array<{ tarih: string; is: string; sorumlu: string }>
} {
  const TANIM: Array<[string, string, string, VarlikKaydi['durum']]> = [
    ['CAM-01 Giriş',     'Kamera', 'Giriş & Turnike', 'calisiyor'],
    ['CAM-02 Kasa',      'Kamera', 'Kasa Hattı',      'calisiyor'],
    ['CAM-03 Kozmetik',  'Kamera', 'Kozmetik',        'calisiyor'],
    ['NVR-01',           'Kayıt cihazı', 'Ofis',      'uyari'],
    ['SW-01',            'Switch', 'Ofis',            'calisiyor'],
    ['POS-02',           'Kasa terminali', 'Kasa 2',  'ariza'],
    ['HVAC-01',          'İklimlendirme', 'Satış alanı', 'calisiyor'],
    ['AYD-Koridor',      'Aydınlatma', 'Koridor',     'uyari'],
  ]
  const varliklar: VarlikKaydi[] = TANIM.map(([ad, tur, konum, durum], i) => ({
    ad, tur, konum, durum,
    sonBakim: `${sec(`bak-g-${gun}-${i}`, 3, 28)} gün önce`,
    garanti: `${sec(`bak-gar-${gun}-${i}`, 2, 26)} ay`,
  }))

  return {
    kpiler: [
      mKpi(gun, 'bak_acik', 'Açık arıza', 2, 'adet', 25, 'azalis'),
      mKpi(gun, 'bak_sla', 'SLA içinde kapanan', sec(`bak-sla-${gun}`, 78, 98), 'yuzde', 8),
      mKpi(gun, 'bak_sure', 'Ortalama çözüm', sec(`bak-sure-${gun}`, 3, 19), 'dk', 22, 'azalis'),
      mKpi(gun, 'bak_varlik', 'İzlenen varlık', varliklar.length, 'adet', 5),
    ],
    varliklar,
    arizalar: [
      { no: 'ARZ-0042', varlik: 'POS-02', acilis: saatDamgasi(`bak-a1-${gun}`, 10, 14), sla: '4 saat', durum: 'İşlemde', kalanDk: sec(`bak-k1-${gun}`, 20, 140) },
      { no: 'ARZ-0043', varlik: 'AYD-Koridor', acilis: saatDamgasi(`bak-a2-${gun}`, 14, 18), sla: '24 saat', durum: 'Açık', kalanDk: sec(`bak-k2-${gun}`, 300, 900) },
      { no: 'ARZ-0041', varlik: 'NVR-01', acilis: saatDamgasi(`bak-a3-${gun}`, 8, 11), sla: '8 saat', durum: 'Kapandı', kalanDk: 0 },
    ],
    takvim: [
      { tarih: 'Bu hafta', is: 'NVR disk sağlığı kontrolü', sorumlu: 'Teknik ekip' },
      { tarih: 'Gelecek hafta', is: 'Kamera lens temizliği (6 kamera)', sorumlu: 'Mağaza personeli' },
      { tarih: 'Bu ay', is: 'HVAC filtre değişimi', sorumlu: 'Dış servis' },
      { tarih: 'Bu ay', is: 'POS terminal firmware güncellemesi', sorumlu: 'Merkez BT' },
    ],
  }
}

// ─── 10 · Kampanyalar ────────────────────────────────────────────────────────

export function kampanyaModulu(gun: string): {
  kpiler: ModulKpi[]
  kampanyalar: Array<{ ad: string; donem: string; alan: string; durum: string; etki: number }>
  kontrolListesi: Array<{ madde: string; tamam: boolean; sorumlu: string }>
  trafik: DagilimDetay[]
  magazalar: Array<{ ad: string; uygulama: number; not: string }>
} {
  return {
    kpiler: [
      mKpi(gun, 'kam_aktif', 'Aktif kampanya', 4, 'adet', 10),
      mKpi(gun, 'kam_uygulama', 'Teşhir uygunluğu', sec(`kam-u-${gun}`, 72, 97), 'yuzde', 8),
      mKpi(gun, 'kam_etki', 'Kampanya alanı trafiği', sec(`kam-e-${gun}`, 12, 38), 'yuzde', 16),
      mKpi(gun, 'kam_sepet', 'Kampanyalı sepet payı', sec(`kam-s-${gun}`, 19, 41), 'yuzde', 12),
    ],
    kampanyalar: [
      { ad: '2 Al 1 Öde — Cilt Bakım', donem: '12–25 Ağustos', alan: 'Giriş standı', durum: 'Yayında', etki: sec(`kam-1-${gun}`, 14, 42) },
      { ad: 'Parfüm Yaz İndirimi', donem: '01–31 Ağustos', alan: 'Parfüm reyonu', durum: 'Yayında', etki: sec(`kam-2-${gun}`, 8, 27) },
      { ad: 'Saç Bakım Seti', donem: '15–29 Ağustos', alan: 'Orta koridor', durum: 'Yayında', etki: sec(`kam-3-${gun}`, 5, 22) },
      { ad: 'Okula Dönüş', donem: '25 Ağu – 15 Eyl', alan: 'Kasa önü', durum: 'Hazırlıkta', etki: 0 },
    ],
    kontrolListesi: [
      { madde: 'Giriş standı kurulumu', tamam: true, sorumlu: 'Selin K.' },
      { madde: 'Fiyat etiketleri güncellendi', tamam: true, sorumlu: 'Mert Y.' },
      { madde: 'Raf üstü afiş asıldı', tamam: true, sorumlu: 'Deniz Ö.' },
      { madde: 'Kasa önü teşhir tamam', tamam: false, sorumlu: 'Elif A.' },
      { madde: 'Personel bilgilendirmesi', tamam: false, sorumlu: 'Ayşe D.' },
    ],
    trafik: [
      { etiket: 'Kampanya öncesi', deger: sec(`kam-t1-${gun}`, 120, 240) },
      { etiket: 'Kampanya sonrası', deger: sec(`kam-t2-${gun}`, 220, 380) },
    ],
    magazalar: [
      { ad: 'Mağaza 0178 (bu mağaza)', uygulama: sec(`kam-m1-${gun}`, 82, 98), not: 'Canlı ölçüm' },
      { ad: 'Diğer mağazalar', uygulama: 0, not: 'Çok mağazalı kurulum pilotta' },
    ],
  }
}

// ─── 11 · Operasyon ──────────────────────────────────────────────────────────

export function operasyonModulu(gun: string): {
  kpiler: ModulKpi[]
  kontrolListesi: Array<{ saat: string; madde: string; tamam: boolean; sorumlu: string }>
  denetim: DagilimDetay[]
  acikAksiyonlar: ModulSatir[]
} {
  const skor = sec(`op-skor-${gun}`, 74, 96)
  return {
    kpiler: [
      mKpi(gun, 'op_skor', 'Standart denetim skoru', skor, 'yuzde', 6),
      mKpi(gun, 'op_liste', 'Kontrol listesi tamamlanma', sec(`op-liste-${gun}`, 60, 100), 'yuzde', 12),
      mKpi(gun, 'op_aksiyon', 'Açık aksiyon', sec(`op-aks-${gun}`, 2, 9), 'adet', 24, 'azalis'),
      mKpi(gun, 'op_vardiya', 'Vardiya devri', 3, 'adet', 5),
    ],
    kontrolListesi: [
      { saat: '09:30', madde: 'Açılış — kasa sayımı ve kasa açılışı', tamam: true, sorumlu: 'Ayşe D.' },
      { saat: '09:45', madde: 'Reyon önü temizlik kontrolü', tamam: true, sorumlu: 'Selin K.' },
      { saat: '10:00', madde: 'Kamera ve NVR bağlantı kontrolü', tamam: true, sorumlu: 'Kaan A.' },
      { saat: '13:00', madde: 'Öğle vardiya devri', tamam: true, sorumlu: 'Ayşe D.' },
      { saat: '16:00', madde: 'Raf dolum turu', tamam: false, sorumlu: 'Mert Y.' },
      { saat: '21:30', madde: 'Kapanış — kasa mutabakatı', tamam: false, sorumlu: 'Burak T.' },
    ],
    denetim: [
      { etiket: 'Temizlik & düzen', deger: sec(`op-d1-${gun}`, 70, 100) },
      { etiket: 'Teşhir & planogram', deger: sec(`op-d2-${gun}`, 65, 99) },
      { etiket: 'Kasa süreçleri', deger: sec(`op-d3-${gun}`, 72, 100) },
      { etiket: 'İSG uygunluğu', deger: sec(`op-d4-${gun}`, 68, 99) },
    ],
    acikAksiyonlar: [
      { anahtar: 'a1', hucreler: ['Raf dolum turu tamamlanmadı', 'Mert Y.', 'Bugün 18:00'], vurgu: 'dikkat' },
      { anahtar: 'a2', hucreler: ['Kasa önü kampanya teşhiri eksik', 'Elif A.', 'Bugün 20:00'], vurgu: 'dikkat' },
      { anahtar: 'a3', hucreler: ['Depo giriş kapısı kontrolü', 'Kaan A.', 'Yarın 09:00'] },
    ],
  }
}

// ─── 12 · Ayarlar ────────────────────────────────────────────────────────────

export function ayarlarModulu(): {
  roller: Array<{ rol: string; kisi: number; yetki: string }>
  bildirimKurallari: Array<{ olay: string; kanal: string; alici: string; kademe: string }>
  entegrasyonlar: Array<{ ad: string; durum: 'canli' | 'pilot'; not: string }>
  esikler: Array<{ ad: string; deger: string; kaynak: string }>
} {
  return {
    roller: [
      { rol: 'Merkez', kisi: 2, yetki: 'Tüm mağazalar · yönetim uçları' },
      { rol: 'Bölge Müdürü', kisi: 1, yetki: 'Bölgedeki mağazalar · rapor' },
      { rol: 'Mağaza Müdürü', kisi: 1, yetki: 'Kendi mağazası · görev atama' },
      { rol: 'Vardiya Sorumlusu', kisi: 2, yetki: 'Görev durumu değiştirme' },
      { rol: 'Kasiyer', kisi: 2, yetki: 'Kendi görevleri' },
      { rol: 'Reyon Görevlisi', kisi: 4, yetki: 'Kendi görevleri' },
      { rol: 'Depo Sorumlusu', kisi: 1, yetki: 'Stok görevleri' },
      { rol: 'Güvenlik', kisi: 1, yetki: 'İSG & güvenlik görevleri' },
      { rol: 'Teknik Servis', kisi: 1, yetki: 'Arıza kayıtları' },
      { rol: 'Salt Okunur', kisi: 1, yetki: 'Yalnız görüntüleme' },
    ],
    bildirimKurallari: [
      { olay: 'store.queue.threshold_exceeded', kanal: 'WhatsApp', alici: 'Vardiya sorumlusu', kademe: '1. kademe · anında' },
      { olay: 'store.camera.offline', kanal: 'WhatsApp', alici: 'Mağaza müdürü', kademe: '1. kademe · anında' },
      { olay: 'store.shelf.stock_low', kanal: 'WhatsApp', alici: 'Reyon görevlisi', kademe: '1. kademe · anında' },
      { olay: 'SLA aşımı', kanal: 'WhatsApp', alici: 'Mağaza müdürü', kademe: '2. kademe · +15 dk' },
      { olay: 'SLA aşımı (tekrar)', kanal: 'WhatsApp', alici: 'Bölge müdürü', kademe: '3. kademe · +45 dk' },
    ],
    entegrasyonlar: [
      { ad: 'Airtable (veri deposu)', durum: 'canli', not: 'Olay, görev, denetim kaydı ve metrikler' },
      { ad: 'WhatsApp Business (360dialog)', durum: 'canli', not: 'Görev bildirimi ve buton yanıtı' },
      { ad: 'Vision / kamera analitiği', durum: 'pilot', not: 'Olay sözleşmesi hazır; vendor adaptörü bekliyor' },
      { ad: 'POS', durum: 'pilot', not: 'Satış ve sepet verisi için sözleşme hazır' },
      { ad: 'ERP / stok', durum: 'pilot', not: 'Raf–stok eşleşmesi için sözleşme hazır' },
    ],
    esikler: [
      { ad: 'Kuyruk bekleme eşiği', deger: '180 sn', kaynak: 'Kural tablosu' },
      { ad: 'Raf doluluk alt sınırı', deger: '%40', kaynak: 'Kural tablosu' },
      { ad: 'Görev SLA (kritik)', deger: '15 dk', kaynak: 'Kural tablosu' },
      { ad: 'Görev SLA (normal)', deger: '60 dk', kaynak: 'Kural tablosu' },
      { ad: 'Bildirim kanalı', deger: 'WhatsApp', kaynak: 'STOREOS_KANAL' },
      { ad: 'Demo telefon kilidi', deger: 'Açık', kaynak: 'STOREOS_DEMO_TELEFON' },
    ],
  }
}

// ─── 2 · Ali Asistan — hazır senaryolar ──────────────────────────────────────
//
// Doğal dil sorgusu YOK; bu ekran altı hazır soruyu yanıtlar ve bunu ekranda
// açıkça yazar. Yanıt gövdesi seed'dir AMA sayılar gerçektir: `{alarm}`,
// `{gorev}` ve `{uyari}` yer tutucuları render anında kural motorunun
// çıktısıyla doldurulur (bkz. `ali-sohbet.tsx`). Uydurulmuş bir "3 açık alarm"
// cümlesi jüri panoya baktığında yalanlanır — bu yüzden yer tutucu.

export interface AliCevabi {
  durum: string
  neden: string
  etki: string
  oneri: string
  aksiyonlar: string[]
}

export interface AliSenaryosu {
  soru: string
  cevap: AliCevabi
}

export const ALI_SENARYOLARI: AliSenaryosu[] = [
  {
    soru: 'Bugün mağazadaki en büyük sorun ne?',
    cevap: {
      durum: 'Şu an {alarm} açık alarm ve {gorev} açık görev var; bunların {uyari} tanesi yüksek/kritik seviyede.',
      neden: 'Alarmların çoğu kasa hattından geliyor: 17:00–19:00 bandında bekleme süresi 180 sn eşiğini üç gündür aşıyor.',
      etki: 'Tepe saatte kasa önünde ortalama 2 kişilik kalıcı kuyruk oluşuyor; dönüşüm oranı aynı saatte gün ortalamasının altına düşüyor.',
      oneri: '17:00 itibarıyla 5. kasayı açın ve reyon görevlilerinden birini kasaya kaydırın.',
      aksiyonlar: ['Görev Oluştur', 'Rapor Al'],
    },
  },
  {
    soru: 'Kuyruk neden arttı?',
    cevap: {
      durum: 'Kasa hattında ortalama bekleme gün ortalamasının üzerinde; açık kasa sayısı 4.',
      neden: 'Ziyaretçi eğrisi 17:00–19:00 arasında tepe yapıyor, kasa kapasitesi ise gün boyu sabit kalıyor. Aynı bantta bir kasa mola durumunda.',
      etki: 'Bekleme süresi eşiği aştığı her 10 dakikada kural motoru yeni bir görev üretiyor; bu da SLA yükünü artırıyor.',
      oneri: 'Mola planını tepe bandın dışına alın ve tepe saatte bir kasa daha açın.',
      aksiyonlar: ['Görev Oluştur', 'Kasa Planını Aç'],
    },
  },
  {
    soru: 'Hangi reyonlarda stok riski var?',
    cevap: {
      durum: 'Raf taramasında bulunurluk ortalamanın altında olan reyonlar var; kritik ürün sayısı bugün arttı.',
      neden: 'Sabah dolum turu sonrası ikinci tur yapılmadı; kampanyalı ürünlerde tüketim hızı normalin üzerinde.',
      etki: 'Kampanya alanındaki boş yüzler doğrudan kampanya etkisini düşürüyor.',
      oneri: '16:00 dolum turunu kampanyalı reyonlardan başlatın; kritik ürünler için ikmal talebi açın.',
      aksiyonlar: ['Görev Oluştur', 'Raf Ekranını Aç'],
    },
  },
  {
    soru: 'Saat 17\'de kaç kasa açmalıyız?',
    cevap: {
      durum: '17:00 bandında beklenen ziyaretçi yoğunluğu gün tepesine yakın.',
      neden: 'Son üç günün aynı saat verisinde 4 açık kasa ile bekleme 180 sn eşiğini aştı; 5 kasa ile eşiğin altında kaldı.',
      etki: 'Bir kasa daha açmak tepe beklemeyi tahminen 45–60 sn kısaltır.',
      oneri: '17:00–19:00 arası 5 kasa açık tutun. 19:00 sonrası 4 kasaya dönebilirsiniz.',
      aksiyonlar: ['Görev Oluştur', 'Rapor Al'],
    },
  },
  {
    soru: 'Dün ile bugünü karşılaştır',
    cevap: {
      durum: 'Ziyaretçi ve dönüşüm kartlarındaki "vs dün" satırları panoda canlı duruyor.',
      neden: 'Gün içi eğri dünle aynı şekli izliyor; fark öğleden sonra bandında yoğunlaşıyor.',
      etki: 'Kasa hattındaki yük dünkünden farklı bir saatte tepe yapıyor; vardiya planı bunu henüz takip etmiyor.',
      oneri: 'Vardiya planını gün içi eğriye göre kaydırın; analiz ekranındaki bugün/dün grafiğini vardiya toplantısında kullanın.',
      aksiyonlar: ['Analiz Ekranını Aç', 'Rapor Al'],
    },
  },
  {
    soru: 'Gün sonu özetini hazırla',
    cevap: {
      durum: 'Bugün {alarm} alarm işlendi, {gorev} görev açık kaldı.',
      neden: 'Kural motoru gün boyunca kuyruk, raf ve kamera olaylarını işledi; her adım denetim defterine yazıldı.',
      etki: 'Kapanmayan görevler yarının açılış listesine taşınır.',
      oneri: 'Kapanış öncesi açık görevleri gözden geçirin; gün sonu karnesini mağaza müdürüne iletin.',
      aksiyonlar: ['Rapor Al', 'Görev Ekranını Aç'],
    },
  },
]
