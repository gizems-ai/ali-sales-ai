// ════════════════════════════════════════════════════════════════════════════
//  Kampanya Store — Kampanya Motoru (iç) ↔ Broker OS (dış) ORTAK KAYNAK
//  Tek kampanya gerçeği: kampanya kaydı burada; stok bağı GERÇEK (adapter'dan 507).
//  Faz 1.5: session-level in-memory (Faz 2 → Airtable/n8n kalıcı store, §11).
//  Bu dosya CLIENT-SAFE'tir (next/cache import ETMEZ). Mutasyon server action'ları
//  ayrı dosyada: kampanya-actions.ts ('use server').
// ════════════════════════════════════════════════════════════════════════════

import { adaptStok, type AdaptedUnit, type Proje, type StockGroup } from './stok-adapter'
import { BABACAN_STOK } from '@/data/babacan-stok'
import type { Segment, Lever } from './kampanya'

// ── Proje → İlçe TEK MAP (§8) — iki modül aynı ilçeyi buradan gösterir ────────
// İç panel otoritedir. (babacan-stok'ta ilçe kolonu yok → tek sabit burada.)
export const PROJE_ILCE: Record<Proje, string> = {
  Central: 'Beylikdüzü',
  Lagoon: '5. Levent',
  'Port Royal': 'Sefaköy',
  Premium: 'Esenyurt',
}
export const ilceFor = (proje: Proje): string => PROJE_ILCE[proje]

// ── Tipler (§3) ─────────────────────────────────────────────────────────────
export type KampanyaAudience = 'internal' | 'broker' | 'both'
export type KampanyaStatus = 'suggested' | 'approved' | 'published'

export interface KampanyaKaydi {
  id: string
  baslik: string                  // "2 Günde Komisyon" · "Altınını Getir"
  segment: Segment[]
  audience: KampanyaAudience      // broker'a açık mı
  kaldirac: Lever[]
  teklifOzeti: string             // broker'a görünen kısa teklif
  mesaj: string                   // hazır WhatsApp paylaşım metni
  hedefStok: {                    // stok bağı — GERÇEK
    proje?: Proje
    gruplar?: StockGroup[]
    ids?: string[]                // açık liste (öncelikli)
  }
  status: KampanyaStatus
  brokerYayin: boolean            // Broker OS'ta görünür mü
  yayinTarihi?: string
}

// ── Tek stok kaynağı: adapter'dan 507 (memoize) ───────────────────────────────
let _stok: AdaptedUnit[] | null = null
export function getStokListesi(): AdaptedUnit[] {
  if (!_stok) _stok = adaptStok(BABACAN_STOK)
  return _stok
}

// ── Kampanya → GERÇEK stok çözümleme (§4) ─────────────────────────────────────
export function kampanyaStoklari(k: KampanyaKaydi): AdaptedUnit[] {
  const tum = getStokListesi()
  if (k.hedefStok.ids?.length) {
    const set = new Set(k.hedefStok.ids)
    return tum.filter(u => set.has(u.id))
  }
  return tum.filter(u =>
    (!k.hedefStok.proje || u.proje === k.hedefStok.proje) &&
    (!k.hedefStok.gruplar || k.hedefStok.gruplar.includes(u.grup)) &&
    u.satilabilir,
  )
}

// ════════════════════════════════════════════════════════════════════════════
//  Store (module-level, session-level in-memory)
// ════════════════════════════════════════════════════════════════════════════

// Demo başlangıç verisi (§7) — 1–2 kampanya YAYINDA başlar ki Broker OS boş olmasın.
// Hedef stokları gerçek Lagoon/Central dairelerinden çözülür.
const SEED: KampanyaKaydi[] = [
  {
    id: 'seed-2gun-komisyon',
    baslik: '2 Günde Komisyon',
    segment: ['yurtdisi_broker', 'yerli_acente'],
    audience: 'broker',
    kaldirac: ['komisyon', 'referans'],
    teklifOzeti: 'Kapanışta 48 saatte komisyon + exclusive inventory önceliği',
    mesaj: 'Lagoon C blok için brokerlara özel: hızlı kapanışta 48 saatte komisyon, VIP lansman erişimi. Portföyünüze açalım mı?',
    hedefStok: { proje: 'Lagoon', gruplar: ['C', 'D'] },
    status: 'published',
    brokerYayin: true,
    yayinTarihi: '2026-07-01T09:00:00.000Z',
  },
  {
    id: 'seed-altinini-getir',
    baslik: 'Altınını Getir',
    segment: ['turk_yatirimci', 'gurbetci'],
    audience: 'both',
    kaldirac: ['kitlik', 'deneyim'],
    teklifOzeti: 'Altını değere çevir — sınırlı sayıda daire, döviz avantajlı ödeme',
    mesaj: 'Altın yükselirken değeri gayrimenkulde sakla: Central B blok, sınırlı sayıda, döviz avantajlı ödeme. Detay için yaz.',
    hedefStok: { proje: 'Central', gruplar: ['B'] },
    status: 'published',
    brokerYayin: true,
    yayinTarihi: '2026-07-01T09:00:00.000Z',
  },
]

// Modül state — SEED'in kopyası (mutasyon SEED'i bozmasın; test tekrar edilebilir).
const KAMPANYALAR: KampanyaKaydi[] = SEED.map(k => ({ ...k }))

export function getKampanyalar(): KampanyaKaydi[] {
  return KAMPANYALAR
}
export function getKampanya(id: string): KampanyaKaydi | undefined {
  return KAMPANYALAR.find(k => k.id === id)
}

// Kampanya ekle/güncelle (id varsa üzerine yaz).
export function kampanyaUpsert(k: KampanyaKaydi): KampanyaKaydi {
  const i = KAMPANYALAR.findIndex(x => x.id === k.id)
  if (i >= 0) KAMPANYALAR[i] = { ...KAMPANYALAR[i], ...k }
  else KAMPANYALAR.push(k)
  return getKampanya(k.id)!
}

// Broker OS'a yayınla: brokerYayin=true, status='published', yayinTarihi=now (§6).
export function yayinla(id: string, tarih: string): KampanyaKaydi | undefined {
  const k = getKampanya(id)
  if (!k) return undefined
  k.brokerYayin = true
  k.status = 'published'
  k.yayinTarihi = tarih
  return k
}

// Broker OS'tan kaldır: brokerYayin=false (§6).
export function yayindanKaldir(id: string): KampanyaKaydi | undefined {
  const k = getKampanya(id)
  if (!k) return undefined
  k.brokerYayin = false
  return k
}

// ── Broker OS okuma fonksiyonları (Broker OS UI bunları çağırır, §5) ──────────
export function getBrokerKampanyalari(): KampanyaKaydi[] {
  return getKampanyalar().filter(k =>
    k.brokerYayin && (k.audience === 'broker' || k.audience === 'both'))
}

// "Avantajlı Stoklar" = yayında broker kampanyalarının hedeflediği GERÇEK stoklar.
export function getBrokerStoklari(): AdaptedUnit[] {
  const ids = new Set(getBrokerKampanyalari().flatMap(k => kampanyaStoklari(k).map(u => u.id)))
  return getStokListesi().filter(u => ids.has(u.id))
}

// ── Kampanya Motoru kartından (CampaignRec) yayınlanabilir kayıt üretir ────────
// Motor kartı ephemeral öneri; yayınlanınca GERÇEK stok bağıyla store'a düşer.
export function engineCardId(proje: string, grup: StockGroup, segment: Segment): string {
  return `motor:${proje}:${grup}:${segment}`
}
export interface EngineYayinGirdi {
  proje: Proje
  grup: StockGroup
  segment: Segment
  baslik: string
  kaldirac: Lever[]
  teklifOzeti: string
  mesaj: string
}
export function engineKaydiKur(g: EngineYayinGirdi): KampanyaKaydi {
  return {
    id: engineCardId(g.proje, g.grup, g.segment),
    baslik: g.baslik,
    segment: [g.segment],
    audience: 'broker',
    kaldirac: g.kaldirac,
    teklifOzeti: g.teklifOzeti,
    mesaj: g.mesaj,
    hedefStok: { proje: g.proje, gruplar: [g.grup] },
    status: 'approved',
    brokerYayin: false,
  }
}
