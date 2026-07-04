// ════════════════════════════════════════════════════════════════════════════
//  Broker OS — basit runtime store (brief §4: "fixture'ı besleyen basit
//  JSON-backed store"). Faz 1'de bellek-içi; tohum fixture'lardan yüklenir.
//  Admin CRUD, QR onboarding ve RSVP bunu besler.
//
//  ⚠️ KALICILIK: Faz 1 bellek-içidir → serverless soğuk başlangıçta / farklı
//  lambda'da sıfırlanır. Faz 2'de DB/JSON dosyasına taşınır; şema types.ts'e
//  birebir uyar, ekstra soyutlama gerekmez.
// ════════════════════════════════════════════════════════════════════════════
import type {
  Broker,
  StockHighlight,
  Campaign,
  Commission,
  CommissionStatus,
} from './types'
import { BROKERS } from './fixtures/brokers'
import { STOCK_HIGHLIGHTS } from './fixtures/stock-highlights'
import { CAMPAIGNS } from './fixtures/campaigns'
import { COMMISSIONS } from './fixtures/commissions'

interface BrokerStore {
  brokers: Broker[]
  highlights: StockHighlight[]
  campaigns: Campaign[]
  commissions: Commission[]
  rsvps: Set<string> // `${eventId}:${brokerId}`
}

// SarpNet finans entegrasyonu Faz 1'de CANLI DEĞİL (brief §5.4). Faz 2'de true
// olunca in_finance → payment_scheduled → paid geçişlerini besleyecek.
export const SARPNET_LIVE = false

// Komisyon süreç hattı (brief §5.4) — sıra sabit.
export const COMMISSION_FLOW: CommissionStatus[] = [
  'sale',
  'deposit_received',
  'earned',
  'in_finance',
  'payment_scheduled',
  'paid',
]

// globalThis'e sabitle → Next dev'de HMR/istekler arası tekil kalsın.
const g = globalThis as unknown as { __brokerStore?: BrokerStore }

function init(): BrokerStore {
  return {
    brokers: [...BROKERS],
    highlights: [...STOCK_HIGHLIGHTS],
    campaigns: CAMPAIGNS.map((c) => ({ ...c })),
    commissions: COMMISSIONS.map((c) => ({ ...c, history: [...c.history] })),
    rsvps: new Set(),
  }
}

export function store(): BrokerStore {
  if (!g.__brokerStore) g.__brokerStore = init()
  return g.__brokerStore
}

// ── Broker (QR onboarding) ───────────────────────────────────────────────────
export function addBroker(input: {
  name: string
  agency: string
  phone: string
}): Broker {
  const b: Broker = {
    id: `brk_${Date.now().toString(36)}`,
    name: input.name.trim(),
    agency: input.agency.trim(),
    phone: input.phone.trim(),
    tier: 'silver', // yeni kayıt daima Silver başlar (brief §5.7)
    periodSales: 0,
  }
  store().brokers.push(b)
  return b
}

export function listBrokers(): Broker[] {
  return store().brokers
}

// ── StockHighlight CRUD (Admin Broker Yönetimi) ─────────────────────────────
export function listHighlights(): StockHighlight[] {
  return store().highlights
}

export function getHighlight(id: string): StockHighlight | undefined {
  return store().highlights.find((h) => h.id === id)
}

/** Var olanı id ile değiştirir, yoksa ekler. */
export function upsertHighlight(h: StockHighlight): void {
  const hs = store().highlights
  const i = hs.findIndex((x) => x.id === h.id)
  if (i >= 0) hs[i] = h
  else hs.push(h)
}

export function deleteHighlight(id: string): void {
  const s = store()
  s.highlights = s.highlights.filter((h) => h.id !== id)
}

export function newHighlightId(): string {
  return `sh_${Date.now().toString(36)}`
}

// ── Etkinlik RSVP ────────────────────────────────────────────────────────────
export function addRSVP(eventId: string, brokerId: string): void {
  store().rsvps.add(`${eventId}:${brokerId}`)
}

export function hasRSVP(eventId: string, brokerId: string): boolean {
  return store().rsvps.has(`${eventId}:${brokerId}`)
}

/** Bir etkinliğe RSVP yapan broker'lar (admin görünümü). */
export function rsvpBrokers(eventId: string): Broker[] {
  const s = store()
  return s.brokers.filter((b) => s.rsvps.has(`${eventId}:${b.id}`))
}

// ── Kampanya CRUD (Admin, Sprint 2) ─────────────────────────────────────────
export function listCampaigns(): Campaign[] {
  return store().campaigns
}
export function getCampaign(id: string): Campaign | undefined {
  return store().campaigns.find((c) => c.id === id)
}
export function upsertCampaign(c: Campaign): void {
  const cs = store().campaigns
  const i = cs.findIndex((x) => x.id === c.id)
  if (i >= 0) cs[i] = c
  else cs.push(c)
}
export function deleteCampaign(id: string): void {
  const s = store()
  s.campaigns = s.campaigns.filter((c) => c.id !== id)
}
export function newCampaignId(): string {
  return `cmp_${Date.now().toString(36)}`
}

// ── Komisyon durum güncelleme (Admin, Sprint 2) ─────────────────────────────
export function listCommissions(): Commission[] {
  return store().commissions
}
export function commissionsByBroker(brokerId: string): Commission[] {
  return store().commissions.filter((c) => c.brokerId === brokerId)
}

/**
 * Komisyon durumunu ilerletir; her değişiklik history'ye yazılır (SarpNet Faz 2
 * izi). isoDate parametresi yoksa çağıran runtime tarihini geçmelidir.
 */
export function updateCommissionStatus(
  id: string,
  status: CommissionStatus,
  isoDate: string,
  expectedPaymentDate?: string,
): void {
  const c = store().commissions.find((x) => x.id === id)
  if (!c) return
  c.status = status
  if (expectedPaymentDate !== undefined) {
    c.expectedPaymentDate = expectedPaymentDate || undefined
  }
  c.history.push({ status, at: isoDate, by: 'admin' })
}

// ── Davet kodu (brief §5.7: admin'in ürettiği tek kod, fixture'da) ───────────
export const INVITE_CODE = 'LAGOON2026'
