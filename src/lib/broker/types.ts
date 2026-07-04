// ════════════════════════════════════════════════════════════════════════════
//  Broker OS — Veri modeli (CC Brief §3). Fixture-first; tek gerçek veri
//  bağlantısı stok tarafında `src/data/babacan-stok.ts` (unitRef → RawUnit.id).
//  KURAL: hiçbir ekranda üretilmiş skor/yüzde yok. Kural/AI çıktısı yalnızca
//  küratörlük dili olarak yüzeye çıkar (whyAdvantaged, fitAudience). whyToday
//  gerçek, admin-girişli bilgidir; boşsa satır render edilmez, ASLA otomatik üretilmez.
// ════════════════════════════════════════════════════════════════════════════

export type BrokerTier = 'silver' | 'gold' | 'platinum'

export interface Broker {
  id: string
  clerkUserId?: string
  name: string
  agency: string
  phone: string
  tier: BrokerTier
  periodSales: number // kademe ilerlemesi için
}

export type StockFilter =
  | 'vatandaslik'
  | 'yatirim'
  | 'aile'
  | 'premium'
  | 'ofis'
  | 'otel'

export type StockBadge = 'hot' | 'premium' | null
export type TierVisibility = 'all' | 'gold' | 'platinum'

export interface StockHighlight {
  id: string
  unitRef: string // babacan-stok.ts içindeki ünite id'si (örn. "A-93")
  badge: StockBadge
  whyAdvantaged: string[] // max 3 madde, editoryal dil
  whyToday?: string // OPSİYONEL — admin girer. Boşsa satır render edilmez. ASLA otomatik üretilmez.
  fitAudience: string // "Kime uygun: …"
  filters: StockFilter[]
  tierVisibility: TierVisibility
  activeFrom: string
  activeTo: string
}

export interface Campaign {
  id: string
  kind: string // "Varlık rotasyonu" gibi eyebrow etiketi
  title: string
  body: string
  fitAudience: string
  readyMessage: string // WhatsApp'a kopyalanacak, broker ağzından yazılmış metin — admin düzenler
  activeFrom: string
  activeTo: string
}

export type CommissionStatus =
  | 'sale'
  | 'deposit_received'
  | 'earned'
  | 'in_finance'
  | 'payment_scheduled'
  | 'paid'

export interface CommissionHistoryEntry {
  status: CommissionStatus
  at: string
  by: string
}

export interface Commission {
  id: string
  brokerId: string
  unitLabel: string // "Lagoon 14C · 3+1"
  saleDate: string
  customerInitials: string
  amountTRY: number
  status: CommissionStatus
  expectedPaymentDate?: string
  history: CommissionHistoryEntry[] // SarpNet Faz 2 için hazır iz
}

export interface PartnerEvent {
  id: string
  title: string
  date: string // ISO — geri sayım bundan türer
  timeLabel: string // "14:00"
  venue: string
  capacityNote: string
  rsvpOpen: boolean
  eyebrow: string
  body: string
}

// ── Proje Merkezi (brief §5.3) ───────────────────────────────────────────────
// Not: brief §3 çekirdek modeline ek. Materyaller auth arkasında
// (public/broker-materials/…); decks auth-bypass kalıbı burada KULLANILMAZ.

export type ProjectMaterialKind =
  | 'video'
  | 'sunum'
  | 'brosur'
  | 'fiyat'
  | 'odeme'
  | 'sss'
  | 'whatsapp'
  | 'indir'

export interface ProjectMaterial {
  kind: ProjectMaterialKind
  label: string
  href?: string // yoksa "yakında" (disabled)
}

export type ProjectThumb = 'lagoon' | 'central' | 'port'

export interface BrokerProject {
  slug: string
  name: string
  tagline: string // thumb üstü küçük etiket ("Lansman Projesi")
  summary: string // "Beylikdüzü · 1.240 ünite · teslim 2027"
  thumb: ProjectThumb
  full: boolean // Lagoon=tam grid, diğerleri kısaltılmış
  materials: ProjectMaterial[]
}

export const TIER_LABEL: Record<BrokerTier, string> = {
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
}
