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
  cizgi:       'var(--so-cizgi)',
  yuzey2:      'var(--so-yuzey-2)',
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
