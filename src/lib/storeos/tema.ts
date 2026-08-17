// ════════════════════════════════════════════════════════════════════════════
//  Store OS — TEMA KÖPRÜSÜ
//
//  Bileşenlere renk GÖMÜLMEZ (madde 9). Gerçek değerler `globals.css` içindeki
//  `.storeos-root` bloğunda; burada yalnız o değişkenlerin ve sınıf adlarının
//  adları var. Tek marka değişikliği = tek CSS bloğu, sıfır bileşen düzenlemesi.
// ════════════════════════════════════════════════════════════════════════════

import type { GorevDurumu, Oncelik, Severity } from './tipler'

/** SVG `fill`/`stroke` gibi CSS sınıfının yetmediği yerler için değişken adı. */
export const DEGISKEN = {
  marka:       'var(--so-marka)',
  markaSoluk:  'var(--so-marka-soluk)',
  markaZemin:  'var(--so-marka-zemin)',
  cizgi:       'var(--so-cizgi)',
  yuzey2:      'var(--so-yuzey-2)',
  metin:       'var(--so-metin)',
  metinSoluk:  'var(--so-metin-soluk)',
  metinSilik:  'var(--so-metin-silik)',
  info:        'var(--so-info)',
  low:         'var(--so-low)',
  medium:      'var(--so-medium)',
  high:        'var(--so-high)',
  critical:    'var(--so-critical)',
} as const

export function severitySinifi(s: Severity): string {
  return `so-rozet so-sev-${s}`
}

export function severityRengi(s: Severity): string {
  return DEGISKEN[s]
}

const SEVERITY_ETIKETLERI: Record<Severity, string> = {
  info: 'Bilgi', low: 'Düşük', medium: 'Orta', high: 'Yüksek', critical: 'Kritik',
}

export function severityEtiketi(s: Severity): string {
  return SEVERITY_ETIKETLERI[s] ?? s
}

// ─── Görev durumu / öncelik ──────────────────────────────────────────────────
//
// Bu iki eşleme Gün 3'te `kartlar.tsx` içinde yerel sabitti. Gün 4'te üç ekran
// daha aynı etiketleri çizmeye başladığı için buraya alındı: durum makinesine
// yeni bir durum eklendiğinde Türkçesinin unutulacağı tek bir yer kalsın.

const GOREV_DURUM_ETIKETLERI: Record<GorevDurumu, string> = {
  yeni: 'Yeni', atandi: 'Atandı', goruldu: 'Görüldü', basladi: 'Başladı',
  beklemede: 'Beklemede', tamamlandi: 'Tamamlandı', onay_bekliyor: 'Onay bekliyor',
  reddedildi: 'Reddedildi', suresi_gecti: 'Süresi geçti', iptal: 'İptal',
}

export function gorevDurumEtiketi(d: GorevDurumu): string {
  return GOREV_DURUM_ETIKETLERI[d] ?? d
}

const ONCELIK_SINIFLARI: Record<Oncelik, string> = {
  kritik: 'so-sev-critical', yuksek: 'so-sev-high', normal: 'so-notr', dusuk: 'so-notr',
}

export function oncelikSinifi(o: Oncelik): string {
  return ONCELIK_SINIFLARI[o] ?? 'so-notr'
}

const ONCELIK_ETIKETLERI: Record<Oncelik, string> = {
  kritik: 'Kritik', yuksek: 'Yüksek', normal: 'Normal', dusuk: 'Düşük',
}

export function oncelikEtiketi(o: Oncelik): string {
  return ONCELIK_ETIKETLERI[o] ?? o
}

// ─── Roller ──────────────────────────────────────────────────────────────────
//
// Rol → Türkçe etiket. `toplayici.ts` bunu satırlara yazıyor, yan menü de
// oturumdaki kullanıcının rolünü aynı sözlükle yazıyor; iki kopya kaymaya
// açıktı, tek yer burası.

const ROL_ETIKETLERI: Record<string, string> = {
  magaza_muduru: 'Mağaza Müdürü',
  bolge_muduru:  'Bölge Müdürü',
  personel:      'Personel',
  guvenlik:      'Güvenlik',
  merkez:        'Merkez',
}

export function rolEtiketi(rol: string): string {
  return ROL_ETIKETLERI[rol] ?? rol
}

// ─── Pano düzeni (Gün 7) ─────────────────────────────────────────────────────
//
// İkon ve sınıf eşlemeleri VERİ DEĞİL, sunumdur — bu yüzden `toplayici.ts`'te
// değil burada. Bilinmeyen metrik tipi kırmızıya düşmez, nötr bir işaret alır.

const KPI_IKONLARI: Record<string, string> = {
  ziyaretci:         '👥',
  satis_tutari:      '🛒',
  kasa_bekleme_sn:   '⏱',
  donusum_orani:     '◎',
  aktif_personel:    '👤',
  kuyruk_kisi:       '👥',
  yogunluk:          '◍',
  ortalama_kalis_dk: '⏱',
  ic_sicaklik:       '🌡',
  etiket_uygunluk:   '🏷',
  kasa_acik:         '▤',
}

export function kpiIkonu(anahtar: string): string {
  return KPI_IKONLARI[anahtar] ?? '◇'
}

/**
 * Sağlık skoru → sınıf adı ve renk değişkeni. Eşikler `toplayici.ts`'teki
 * `skorSinifAdi` ile AYNI olmalı; etiket metni orada, renk burada durur.
 */
export function skorRengi(deger: number): string {
  if (deger >= 85) return DEGISKEN.low
  if (deger >= 70) return DEGISKEN.marka
  if (deger >= 50) return DEGISKEN.medium
  return DEGISKEN.critical
}

/** Dağılım/donut dilim renkleri — sabit sıra, tekrar ederse başa döner. */
export const DILIM_RENKLERI = [
  DEGISKEN.marka, DEGISKEN.low, DEGISKEN.medium, DEGISKEN.metinSilik, DEGISKEN.high,
] as const

export function dilimRengi(i: number): string {
  return DILIM_RENKLERI[i % DILIM_RENKLERI.length]
}

/**
 * Isı haritası hücresi: 0–100 → marka morunun opaklığı. Ayrı palet YOK.
 *
 * Buradaki tek gömülü renk, `--so-marka` (#6C43DC) değerinin RGB karşılığıdır.
 * CSS değişkeni kullanılamıyor çünkü opaklık hücre başına hesaplanıyor ve
 * satır içi `style` olarak veriliyor. Marka rengi değişirse burası da değişir —
 * `scripts/storeos/css-denetci.mjs` bu eşleşmeyi denetler.
 */
export const MARKA_RGB = '108, 67, 220'

export function isiRengi(deger: number): string {
  const o = Math.max(0, Math.min(100, deger)) / 100
  // 0 = neredeyse yüzey, 100 = tam marka. Karşıtlık için taban 0.06.
  return `rgba(${MARKA_RGB}, ${(0.06 + o * 0.86).toFixed(3)})`
}
