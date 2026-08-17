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
