// ════════════════════════════════════════════════════════════════════════════
//  Stok Adapter — RawUnit[] → AdaptedUnit[] (grup · defects · emsal türetme)
//  Faz 1.5: %100 kural tabanlı, deterministik, SAF fonksiyon (test edilebilir).
//  Eşikler adlandırılmış/ayarlanabilir sabitler — motorun kararı şeffaf kalsın.
//  Doğrulama: 507 gerçek daire → grup A26·B188·C181·D112, defects zemin93·
//  büyük_m2 28·pahalı5, emsal altında179·emsalde190·üstünde138 (stok-adapter.test).
// ════════════════════════════════════════════════════════════════════════════

// ── Tipler (§3) ─────────────────────────────────────────────────────────────
export type Proje = 'Central' | 'Lagoon' | 'Port Royal' | 'Premium'
export type StockGroup = 'A' | 'B' | 'C' | 'D'
export type Emsal = 'altinda' | 'emsalde' | 'ustunde'
export type Defect = 'zemin' | 'buyuk_m2' | 'pahali' | 'kuzey'

export interface RawUnit {
  id: string
  proje: Proje
  blok: string
  kat: string | number
  daireNo: number
  tip: string
  brutM2: number
  fiyatUSD: number
  fiyatTL: number
  durum: string
  usdM2: number
  hakanSegment: string
  hakanKanal: string
}

export interface AdaptedUnit extends RawUnit {
  grup: StockGroup
  defects: Defect[]
  emsal: Emsal
  katInt: number | null
  stokYasiGun: number | null   // Excel'de YOK → null (Faz 2). Güven /3 tetikler.
  kanalDoygun: boolean         // Faz 1.5 varsayılan false
  satilabilir: boolean
}

// ── Ayarlanabilir eşikler (§4) — Gizem değiştirebilsin diye tek yerde ─────────
export const ESIK = {
  BUYUK_M2: 180,      // brutM2 ≥ 180 → buyuk_m2 defect
  PAHALI_KAT: 1.25,   // usdM2 > med × 1.25 → pahali defect
  EMSAL_ALT: 0.95,    // usdM2 < med × 0.95 → altinda
  EMSAL_UST: 1.05,    // usdM2 ≤ med × 1.05 → emsalde, üstü → ustunde
  A_M2_MAX: 90,       // A grubu üst m² sınırı
} as const

// Satılabilir durumlar (§4). Motor yalnız bunları önerir.
export const SATILABILIR_DURUMLAR = new Set(['BOŞ', 'SATIŞA AÇIK', 'FİYAT LİSTESİ / STOK'])

// ── Kur (§7) — TL = USD × KUR. Fiyat gösteriminin TEK kaynağı. USD otorite ─────
// (Hakan USD ile çalışır). Repo Excel'i TEMIZ_50TL → 50. İki Excel'in TL farkı
// (Satis_Modeli ~47,3) bu sabitle çözülür; net kur belli olunca tek satır güncellenir.
// TODO(Gizem): Satis_Modeli otorite ise KUR = 47.3 yap. Bloklamıyor (Faz 2 §10).
export const KUR = 50

// A / B grubu tip kümeleri
const A_TIPLER = new Set(['1+0', '1+1'])
const B_TIPLER = new Set(['2+1', '3+1', '3.5+1'])

// ── Kat parse: "14.Kat"→14 · "ZEMİN KAT"/"2.BODRUM KAT"/"BAZA"→-1 · 20→20 ─────
export function katParse(kat: string | number): number | null {
  if (typeof kat === 'number') return Math.trunc(kat)
  const s = kat.toLocaleUpperCase('tr-TR')
  if (/ZEM|BODRUM|BAZA/.test(s)) return -1
  const m = s.match(/\d+/)
  return m ? parseInt(m[0], 10) : null
}

// ── Medyan (proje bazlı USD/m², satılabilir daireler üzerinden) ───────────────
export function medyan(vals: number[]): number {
  if (vals.length === 0) return 0
  const s = [...vals].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

export function isSatilabilir(durum: string): boolean {
  return SATILABILIR_DURUMLAR.has(durum.trim())
}

// Proje → satılabilir dairelerin USD/m² medyanı
export function projeMedyanlari(units: RawUnit[]): Record<string, number> {
  const grup: Record<string, number[]> = {}
  for (const u of units) {
    if (!isSatilabilir(u.durum)) continue
    ;(grup[u.proje] ??= []).push(u.usdM2)
  }
  const med: Record<string, number> = {}
  for (const p of Object.keys(grup)) med[p] = medyan(grup[p])
  return med
}

// ── defects türetme ───────────────────────────────────────────────────────────
export function tureDefects(u: RawUnit, med: number, katInt: number | null): Defect[] {
  const d: Defect[] = []
  if (katInt !== null && katInt <= 0) d.push('zemin')
  if (u.brutM2 >= ESIK.BUYUK_M2) d.push('buyuk_m2')
  if (u.usdM2 > med * ESIK.PAHALI_KAT) d.push('pahali')
  // 'kuzey' ÜRETİLEMEZ — Excel'de cephe kolonu yok. Cephe verisi gelince eklenecek (Faz 2).
  return d
}

// ── emsal türetme ─────────────────────────────────────────────────────────────
export function tureEmsal(usdM2: number, med: number): Emsal {
  if (usdM2 < med * ESIK.EMSAL_ALT) return 'altinda'
  if (usdM2 <= med * ESIK.EMSAL_UST) return 'emsalde'
  return 'ustunde'
}

// ── grup türetme (ilk eşleşen kazanır) ────────────────────────────────────────
export function tureGrup(u: RawUnit, defects: Defect[], med: number, katInt: number | null): StockGroup {
  if (defects.length > 0) return 'D'
  const kat = katInt ?? -1
  if (A_TIPLER.has(u.tip) && kat >= 1 && u.brutM2 < ESIK.A_M2_MAX && u.usdM2 <= med) return 'A'
  if (B_TIPLER.has(u.tip) && u.brutM2 >= 90 && u.brutM2 < 180 && kat >= 1) return 'B'
  return 'C'
}

// ── Tek daire türetme (med dışarıdan verilir) ─────────────────────────────────
export function deriveUnit(u: RawUnit, med: number): AdaptedUnit {
  const katInt = katParse(u.kat)
  const defects = tureDefects(u, med, katInt)
  return {
    ...u,
    katInt,
    defects,
    emsal: tureEmsal(u.usdM2, med),
    grup: tureGrup(u, defects, med, katInt),
    stokYasiGun: null,
    kanalDoygun: false,
    satilabilir: isSatilabilir(u.durum),
  }
}

// ── Tüm listeyi adapt et (proje medyanlarını runtime hesaplar) ────────────────
export function adaptStok(units: RawUnit[]): AdaptedUnit[] {
  const med = projeMedyanlari(units)
  return units.map(u => deriveUnit(u, med[u.proje] ?? medyan(units.filter(x => x.proje === u.proje).map(x => x.usdM2))))
}

export const PROJELER: Proje[] = ['Central', 'Lagoon', 'Port Royal', 'Premium']
