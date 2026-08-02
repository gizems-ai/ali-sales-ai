// ════════════════════════════════════════════════════════════════════════════
//  Store OS — TEMA KÖPRÜSÜ
//
//  Bileşenlere renk GÖMÜLMEZ (madde 9). Gerçek değerler `globals.css` içindeki
//  `.storeos-root` bloğunda; burada yalnız o değişkenlerin ve sınıf adlarının
//  adları var. Tek marka değişikliği = tek CSS bloğu, sıfır bileşen düzenlemesi.
// ════════════════════════════════════════════════════════════════════════════

import type { Severity } from './tipler'

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

/** Isı haritası hücresi: 0–100 → marka pembesinin opaklığı. Ayrı palet yok. */
export function isiRengi(deger: number): string {
  const o = Math.max(0, Math.min(100, deger)) / 100
  // 0 = neredeyse yüzey, 100 = tam marka. Karşıtlık için taban 0.06.
  return `rgba(229, 0, 125, ${(0.06 + o * 0.86).toFixed(3)})`
}
