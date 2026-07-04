import type { Broker, BrokerTier, StockHighlight, Commission } from '../types'
import { STOCK_HIGHLIGHTS } from './stock-highlights'
import { COMMISSIONS } from './commissions'
import { CAMPAIGNS } from './campaigns'
import { EVENTS } from './events'

export { BROKERS, getAktifBroker, AKTIF_BROKER_ID } from './brokers'
export { STOCK_HIGHLIGHTS } from './stock-highlights'
export { CAMPAIGNS } from './campaigns'
export { COMMISSIONS } from './commissions'
export { EVENTS, getEnYakinEtkinlik } from './events'
export { PROJECTS, getProject } from './projects'

// ── Kademe görünürlüğü ───────────────────────────────────────────────────────
const TIER_RANK: Record<BrokerTier, number> = { silver: 0, gold: 1, platinum: 2 }

/** Bir highlight verilen kademeye görünür mü? (all / gold+ / platinum) */
export function highlightVisibleTo(h: StockHighlight, tier: BrokerTier): boolean {
  if (h.tierVisibility === 'all') return true
  if (h.tierVisibility === 'gold') return TIER_RANK[tier] >= TIER_RANK.gold
  return TIER_RANK[tier] >= TIER_RANK.platinum // 'platinum'
}

/** Broker'ın kademesine göre görünür avantajlı stoklar. */
export function visibleHighlights(tier: BrokerTier): StockHighlight[] {
  return STOCK_HIGHLIGHTS.filter((h) => highlightVisibleTo(h, tier))
}

/** Bir broker'ın aktif (henüz ödenmemiş) komisyon süreçleri. */
export function activeCommissions(brokerId: string): Commission[] {
  return COMMISSIONS.filter((c) => c.brokerId === brokerId && c.status !== 'paid')
}

/** Bir tarihte aktif kampanya sayısı (activeFrom ≤ now ≤ activeTo). */
export function activeCampaignCount(now: Date): number {
  const t = now.getTime()
  return CAMPAIGNS.filter(
    (c) => new Date(c.activeFrom).getTime() <= t && t <= new Date(c.activeTo).getTime() + 86400000,
  ).length
}

// ── Ana Sayfa "Bugün" strip sayıları (brief §5.1 — hardcode YOK) ─────────────
export interface BugunOzet {
  avantajliStok: number
  aktifKomisyon: number
  aktifKampanya: number
}

export function bugunOzet(broker: Broker, now: Date): BugunOzet {
  return {
    avantajliStok: visibleHighlights(broker.tier).length,
    aktifKomisyon: activeCommissions(broker.id).length,
    aktifKampanya: activeCampaignCount(now),
  }
}

/** En yakın etkinliğe kalan tam gün (negatifse geçmiş). */
export function etkinlikGeriSayim(eventISO: string, now: Date): number {
  const diff = new Date(eventISO).getTime() - now.getTime()
  return Math.ceil(diff / 86400000)
}
