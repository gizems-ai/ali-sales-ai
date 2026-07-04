// ════════════════════════════════════════════════════════════════════════════
//  Broker OS — Stok reader (BAĞIMSIZ). Tek stok kaynağı `src/data/babacan-stok.ts`
//  (507 daire). stok-adapter.ts'in TÜRETME mantığına bağımlı DEĞİLDİR ve onu
//  import ETMEZ (o dosya paralel oturumda commit'siz değişiyor). Yalnızca ham
//  veriyi okur, broker UI'ının ihtiyaç duyduğu düz `BrokerUnit` şekline map'ler.
// ════════════════════════════════════════════════════════════════════════════
import { BABACAN_STOK } from '@/data/babacan-stok'

export type BrokerProje = 'Central' | 'Lagoon' | 'Port Royal' | 'Premium'

// Broker UI'ının gördüğü sade ünite. RawUnit/AdaptedUnit'e referans vermez.
export interface BrokerUnit {
  id: string // "A-93" — StockHighlight.unitRef bununla eşleşir
  proje: BrokerProje
  blok: string
  kat: string
  daireNo: number
  tip: string
  brutM2: number
  fiyatUSD: number
  fiyatTL: number
  durum: string
  usdM2: number
}

function toBrokerUnit(u: (typeof BABACAN_STOK)[number]): BrokerUnit {
  return {
    id: u.id,
    proje: u.proje as BrokerProje,
    blok: u.blok,
    kat: String(u.kat),
    daireNo: u.daireNo,
    tip: u.tip,
    brutM2: u.brutM2,
    fiyatUSD: u.fiyatUSD,
    fiyatTL: u.fiyatTL,
    durum: u.durum,
    usdM2: u.usdM2,
  }
}

// id → BrokerUnit index'i. Modül yükünde bir kez kurulur (507 kayıt).
const UNIT_BY_ID: ReadonlyMap<string, BrokerUnit> = new Map(
  BABACAN_STOK.map((u) => [u.id, toBrokerUnit(u)]),
)

/** Tek ünite (StockHighlight.unitRef → ünite). Bulunamazsa null. */
export function getUnit(unitRef: string): BrokerUnit | null {
  return UNIT_BY_ID.get(unitRef) ?? null
}

/** Tüm üniteler (507). "Tüm stokları gör" liste görünümü için. */
export function listUnits(): BrokerUnit[] {
  return Array.from(UNIT_BY_ID.values())
}

/** Belirli bir projenin üniteleri. */
export function unitsByProject(proje: BrokerProje): BrokerUnit[] {
  return listUnits().filter((u) => u.proje === proje)
}

export const UNIT_COUNT = UNIT_BY_ID.size

// ── Biçimlendirme yardımcıları ───────────────────────────────────────────────

const TL = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
})
const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export function formatTRY(v: number): string {
  return TL.format(v)
}
export function formatUSD(v: number): string {
  return USD.format(v)
}

/** "Lagoon · A-93 · 3+1" gibi kısa etiket. */
export function unitLabel(u: BrokerUnit): string {
  return `${u.proje} · ${u.id} · ${u.tip}`
}
