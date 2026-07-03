// ════════════════════════════════════════════════════════════════════════════
//  Stok Sinyal — grup/emsal/durum → StokSinyal (Envanter ısı sinyalleri)
//  Faz 1.5: %100 KURAL TABANLI, DETERMİNİSTİK, SAF. Math.random YASAK — aynı
//  daire her render aynı sinyali üretir (id-seed). Sinyaller gerçek stokla
//  ÇELİŞMEZ: A grubu asla "Yavaş", D grubu asla "Hızlı" görünmez (§4 invariant).
//
//  ⚠ FAZ 2 (§10): görüntülenme/talep GERÇEK portal (sahibinden/emlakjet) +
//     CRM lead verisinden gelecek; tahmini satış gerçek stok yaşıyla kalibre
//     olacak. Şu an "Örnek / doğrulanmamış veri — mutabakat gerekir".
// ════════════════════════════════════════════════════════════════════════════
import type { StockGroup, Emsal } from './stok-adapter'

// ── Determinizm (§3): id string'inden stabil seed — Math.random DEĞİL ─────────
export function seed(s: string): number {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}
// [lo,hi] kapalı aralıkta, id+salt'a bağlı DETERMİNİSTİK değer
export function pick(id: string, lo: number, hi: number, salt = ''): number {
  return lo + (seed(id + salt) % (hi - lo + 1))
}

// ── Tipler ────────────────────────────────────────────────────────────────────
export type Isi = 'Hızlı' | 'Ortalama' | 'Yavaş/Risk'
export type UiDurum = 'Müsait' | 'Diğer'

export interface StokSinyal {
  aktifTalep: number
  goruntulenme: number        // /hafta
  tahminiSatisHafta: number
  sonGosterimGun: number
  isi: Isi
  riskli: boolean
  uiDurum: UiDurum
}

export interface SinyalGirdi {
  id: string
  grup: StockGroup
  emsal: Emsal
  durum: string
}

// ── Ayarlanabilir grup tabanları (§4) — Gizem değiştirebilsin diye tek yerde ──
export const SINYAL_TABAN: {
  talep: Record<StockGroup, [number, number]>
  goruntulenme: Record<StockGroup, [number, number]>
  satisHafta: Record<StockGroup, [number, number]>
  sonGosterim: [number, number]
} = {
  talep:        { A: [4, 8], B: [2, 5], C: [1, 4], D: [0, 2] },
  goruntulenme: { A: [20, 34], B: [15, 28], C: [12, 22], D: [10, 18] },
  satisHafta:   { A: [3, 5], B: [4, 7], C: [5, 8], D: [8, 13] },
  sonGosterim:  [5, 38],
}

// Envanter "Müsait" kümesi — Kampanya Motoru SATILABILIR_DURUMLAR ile aynı küme.
const SINYAL_MUSAIT = new Set(['BOŞ', 'SATIŞA AÇIK', 'FİYAT LİSTESİ / STOK'])

// ── Tek daire sinyal türetme (deterministik) ──────────────────────────────────
export function tureSinyal(g: SinyalGirdi): StokSinyal {
  const { id, grup, emsal, durum } = g

  // aktifTalep — grup tabanı + emsal ayarı (altında talep artar, üstünde azalır)
  const [tl, th] = SINYAL_TABAN.talep[grup]
  let aktifTalep = pick(id, tl, th, 't')
  if (emsal === 'altinda') aktifTalep = Math.min(8, aktifTalep + 1)
  if (emsal === 'ustunde') aktifTalep = Math.max(0, aktifTalep - 1)

  // goruntulenme/hafta
  const [gl, gh] = SINYAL_TABAN.goruntulenme[grup]
  const goruntulenme = pick(id, gl, gh, 'g')

  // tahminiSatisHafta — emsal üstü fiyat daha yavaş erir (+1)
  const [sl, sh] = SINYAL_TABAN.satisHafta[grup]
  let tahminiSatisHafta = pick(id, sl, sh, 's')
  if (emsal === 'ustunde') tahminiSatisHafta += 1

  const sonGosterimGun = pick(id, SINYAL_TABAN.sonGosterim[0], SINYAL_TABAN.sonGosterim[1], 'x')

  // ısı — tahmini satış haftasından türer. ≤4 Hızlı · 5–7 Ortalama · ≥8 Yavaş/Risk
  const isi: Isi = tahminiSatisHafta <= 4 ? 'Hızlı' : tahminiSatisHafta <= 7 ? 'Ortalama' : 'Yavaş/Risk'
  // riskli — yalnız D grubu + gerçekten yavaş (≥9 hafta). Kartta Ali önerisini tetikler (§6).
  const riskli = grup === 'D' && tahminiSatisHafta >= 9
  const uiDurum: UiDurum = SINYAL_MUSAIT.has(durum.trim()) ? 'Müsait' : 'Diğer'

  return { aktifTalep, goruntulenme, tahminiSatisHafta, sonGosterimGun, isi, riskli, uiDurum }
}

// "~5 hafta" biçimi — kart gösterimi için
export function haftaEtiket(hafta: number): string {
  return `~${hafta} hafta`
}
