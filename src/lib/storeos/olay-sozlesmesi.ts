// ════════════════════════════════════════════════════════════════════════════
//  Store OS — OLAY SÖZLEŞMESİ (kanonik biçim)
//
//  KİLİTLİ. Bu şema entegrasyon dokümanıyla partnere ilan edildi.
//  Alan adı / tip / davranış değiştirilmez. Değişiklik gerekirse önce doküman.
//
//  ── DOĞRULAMA KÜTÜPHANESİ NOTU ─────────────────────────────────────────────
//  Prompt "zod şeması" diyordu; `zod` bu repoda BEYAN EDİLMİŞ bir bağımlılık
//  DEĞİL. node_modules'ta var ama Next 16'nın transitive'i olarak — yani bir
//  Next yükseltmesinde sessizce kaybolabilir. package.json onaylı istisna
//  listesinde olmadığı için kuramadım.
//
//  Bu yüzden doğrulama elle yazıldı ama YÜZEYİ zod-uyumlu:
//      OlaySemasi.safeParse(x) → { basarili, veri } | { basarili:false, hatalar }
//  zod onaylanırsa değişecek TEK yer bu dosyadaki `safeParse` gövdesidir;
//  çağıran hiçbir kod değişmez. (Gün 2 raporunda soru olarak duruyor.)
// ════════════════════════════════════════════════════════════════════════════

// ─── Kanonik tip ─────────────────────────────────────────────────────────────

export const SEVERITY_DEGERLERI = ['info', 'low', 'medium', 'high', 'critical'] as const
export type OlaySeverity = (typeof SEVERITY_DEGERLERI)[number]

/**
 * Partnerden gelen olayın kanonik biçimi. Alan adları İNGİLİZCE ve camelCase —
 * entegrasyon dokümanında böyle ilan edildi. (Kod içi Türkçe adlandırma kuralı
 * bu tipin DIŞINDA geçerli; sınır tipi ilan edildiği gibi kalır.)
 */
export interface VisionEvent {
  /** Idempotency anahtarı. Aynı id iki kez gelirse tek kayıt oluşur. */
  id: string
  storeCode: string
  cameraId?: string
  eventType: string
  /** ISO 8601 — timezone offset ZORUNLU ('Z' de kabul). */
  occurredAt: string
  severity: OlaySeverity
  /** 0–1 arası. */
  confidence: number
  metadata: Record<string, unknown>
  snapshotUrl?: string
  clipUrl?: string
}

// ─── Olay tipleri ────────────────────────────────────────────────────────────

/** Faz 1 — kural yazılan tipler. */
export const FAZ1_OLAY_TIPLERI = [
  'store.person_count.updated',
  'store.queue.length_changed',
  'store.queue.threshold_exceeded',
  'store.occupancy.updated',
  'store.dwell_time.updated',
  'store.zone.person_count',
  'store.camera.offline',
  'store.camera.degraded',
] as const

/** Faz 2 — tip TANIMLI, kural YAZILMAZ. Olay kabul edilir, kaydedilir, eşleşmez. */
export const FAZ2_OLAY_TIPLERI = [
  'store.shelf.stock_low',
  'store.planogram.non_compliant',
  'store.safety.event_detected',
  'store.security.event_detected',
  'store.heatmap.snapshot',
] as const

export const BILINEN_OLAY_TIPLERI: readonly string[] = [
  ...FAZ1_OLAY_TIPLERI,
  ...FAZ2_OLAY_TIPLERI,
]

export type Faz1OlayTipi = (typeof FAZ1_OLAY_TIPLERI)[number]
export type Faz2OlayTipi = (typeof FAZ2_OLAY_TIPLERI)[number]

/**
 * Bilinmeyen tip REDDEDİLMEZ.
 * Gerekçe: partner faz 3'te yeni tip yayınlarsa entegrasyon kırılmamalı; olay
 * kaydedilir, hiçbir kurala eşleşmez, panelde "bilinmeyen tip" olarak görünür.
 * Bu bilinçli bir sözleşme kararıdır — sıkı allowlist geri dönüşü zor kırılma
 * üretir (partner 400 alır, retry eder, kuyruğu doldurur).
 */
export function bilinenTipMi(tip: string): boolean {
  return BILINEN_OLAY_TIPLERI.includes(tip)
}

/**
 * Her Faz 1 tipi için BEKLENEN metadata anahtarları.
 * Doğrulamada ZORUNLU DEĞİL (eksikse olay yine kabul edilir) — kural motoru ve
 * entegrasyon dokümanı için referans. Kural koşulları bu anahtarlara bakar.
 *
 * AÇIK KONU: Bu anahtar sözlüğü Gökhan'a giden dokümanda YOK. Sözleşme metni
 * metadata'yı serbest bırakıyor; kural motoru ise anahtar adı bilmek zorunda.
 * Rapordaki soru bu.
 */
export const METADATA_ANAHTARLARI: Record<string, readonly string[]> = {
  'store.person_count.updated':      ['count', 'zoneId'],
  'store.queue.length_changed':      ['registerId', 'queueLength', 'avgWaitSeconds'],
  'store.queue.threshold_exceeded':  ['registerId', 'queueLength', 'avgWaitSeconds', 'threshold'],
  'store.occupancy.updated':         ['occupancy', 'capacity', 'occupancyRate'],
  'store.dwell_time.updated':        ['zoneId', 'avgDwellSeconds'],
  'store.zone.person_count':         ['zoneId', 'count'],
  'store.camera.offline':            ['lastSeenAt', 'reason'],
  'store.camera.degraded':           ['reason', 'frameRate'],
  // Faz 2 — referans, kural yok
  'store.shelf.stock_low':           ['zoneId', 'shelfId', 'fillRate'],
  'store.planogram.non_compliant':   ['zoneId', 'shelfId', 'deviationRate'],
  'store.safety.event_detected':     ['zoneId', 'hazardType'],
  'store.security.event_detected':   ['zoneId', 'incidentType'],
  'store.heatmap.snapshot':          ['rows', 'cols', 'cells'],
}

// ─── Doğrulama ───────────────────────────────────────────────────────────────

export interface AlanHatasi {
  /** Nokta yolu: 'metadata' · 'occurredAt' · '[2].confidence' */
  alan: string
  /** Partnerin okuyacağı sebep. 4xx gövdesine BU yazılır. */
  sebep: string
}

export type DogrulamaSonucu<T> =
  | { basarili: true; veri: T; uyarilar: string[] }
  | { basarili: false; hatalar: AlanHatasi[] }

/** ISO 8601 + ZORUNLU offset. Offsetsiz '2026-08-14T14:35:21' REDDEDİLİR. */
const ISO_OFFSETLI = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/

/** 'store.queue.threshold_exceeded' — küçük harf, nokta ayraçlı, en az 2 parça. */
const OLAY_TIPI_BICIMI = /^[a-z][a-z0-9]*(\.[a-z0-9_]+){1,4}$/

const ID_AZAMI_UZUNLUK = 128
const TIP_AZAMI_UZUNLUK = 120
const METADATA_AZAMI_BAYT = 32 * 1024

function duzObjeMi(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

function urlGecerliMi(x: string): boolean {
  try {
    const u = new URL(x)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

const BEKLENEN_ALANLAR = new Set([
  'id', 'storeCode', 'cameraId', 'eventType', 'occurredAt',
  'severity', 'confidence', 'metadata', 'snapshotUrl', 'clipUrl',
])

/**
 * Tek olayı doğrular.
 * @param onek  dizi öğesi doğrulanırken '[3].' gibi bir yol öneki.
 */
export function olayDogrula(ham: unknown, onek = ''): DogrulamaSonucu<VisionEvent> {
  const hatalar: AlanHatasi[] = []
  const uyarilar: string[] = []
  const h = (alan: string, sebep: string) => hatalar.push({ alan: onek + alan, sebep })

  if (!duzObjeMi(ham)) {
    return { basarili: false, hatalar: [{ alan: onek.replace(/\.$/, '') || 'govde', sebep: 'Olay bir JSON nesnesi olmalı.' }] }
  }

  // ── id ──
  const id = ham.id
  if (typeof id !== 'string' || id.trim() === '') h('id', 'Zorunlu. Boş olmayan string olmalı (idempotency anahtarı).')
  else if (id.length > ID_AZAMI_UZUNLUK) h('id', `En fazla ${ID_AZAMI_UZUNLUK} karakter olabilir.`)

  // ── storeCode ──
  const storeCode = ham.storeCode
  if (typeof storeCode !== 'string' || storeCode.trim() === '') h('storeCode', 'Zorunlu. Boş olmayan string olmalı.')

  // ── eventType ──
  const eventType = ham.eventType
  if (typeof eventType !== 'string' || eventType.trim() === '') {
    h('eventType', 'Zorunlu. Boş olmayan string olmalı.')
  } else if (eventType.length > TIP_AZAMI_UZUNLUK) {
    h('eventType', `En fazla ${TIP_AZAMI_UZUNLUK} karakter olabilir.`)
  } else if (!OLAY_TIPI_BICIMI.test(eventType)) {
    h('eventType', "Biçim: küçük harf, nokta ayraçlı, en az iki parça. Örn. 'store.queue.threshold_exceeded'.")
  } else if (!bilinenTipMi(eventType)) {
    uyarilar.push(`Bilinmeyen olay tipi '${eventType}' — kabul edildi, hiçbir kurala eşleşmeyecek.`)
  }

  // ── occurredAt ──
  const occurredAt = ham.occurredAt
  if (typeof occurredAt !== 'string' || occurredAt.trim() === '') {
    h('occurredAt', 'Zorunlu. ISO 8601 string olmalı.')
  } else if (!ISO_OFFSETLI.test(occurredAt)) {
    h('occurredAt', "ISO 8601 ve TIMEZONE OFFSET zorunlu. Örn. '2026-08-14T14:35:21+03:00' veya '...Z'. Offsetsiz zaman kabul edilmez.")
  } else if (Number.isNaN(Date.parse(occurredAt))) {
    h('occurredAt', 'Geçerli bir tarih değil.')
  }

  // ── severity ──
  const severity = ham.severity
  if (typeof severity !== 'string' || !(SEVERITY_DEGERLERI as readonly string[]).includes(severity)) {
    h('severity', `Zorunlu. Şunlardan biri olmalı: ${SEVERITY_DEGERLERI.join(' | ')}.`)
  }

  // ── confidence ──
  const confidence = ham.confidence
  if (typeof confidence !== 'number' || !Number.isFinite(confidence)) {
    h('confidence', 'Zorunlu. 0 ile 1 arası bir sayı olmalı.')
  } else if (confidence < 0 || confidence > 1) {
    h('confidence', `0 ile 1 arası olmalı, gelen: ${confidence}.`)
  }

  // ── metadata ──
  const metadata = ham.metadata
  if (!duzObjeMi(metadata)) {
    h('metadata', 'Zorunlu. JSON nesnesi olmalı (dizi veya null değil). Veri yoksa {} gönder.')
  } else {
    let bayt = 0
    try {
      bayt = JSON.stringify(metadata).length
    } catch {
      h('metadata', 'Serileştirilemedi — döngüsel referans içeriyor olabilir.')
    }
    if (bayt > METADATA_AZAMI_BAYT) {
      h('metadata', `En fazla ${METADATA_AZAMI_BAYT} bayt olabilir, gelen: ${bayt}.`)
    }
  }

  // ── opsiyoneller ──
  const cameraId = ham.cameraId
  if (cameraId !== undefined && cameraId !== null && (typeof cameraId !== 'string' || cameraId.trim() === '')) {
    h('cameraId', 'Verilirse boş olmayan string olmalı.')
  }
  for (const alan of ['snapshotUrl', 'clipUrl'] as const) {
    const v = ham[alan]
    if (v === undefined || v === null) continue
    if (typeof v !== 'string' || !urlGecerliMi(v)) h(alan, 'Verilirse geçerli bir http/https URL olmalı.')
  }

  // ── fazladan alanlar: REDDETME, bildir ──
  // Sıkı reddetme partnerin alan eklemesini kırılma sebebi yapar; sessiz yutmak
  // ise hatayı gizler. Orta yol: yoksay + uyarıda listele.
  const fazladan = Object.keys(ham).filter(k => !BEKLENEN_ALANLAR.has(k))
  if (fazladan.length) uyarilar.push(`Sözleşme dışı alanlar yoksayıldı: ${fazladan.join(', ')}.`)

  if (hatalar.length) return { basarili: false, hatalar }

  const olay: VisionEvent = {
    id: (id as string).trim(),
    storeCode: (storeCode as string).trim(),
    eventType: (eventType as string).trim(),
    occurredAt: occurredAt as string,
    severity: severity as OlaySeverity,
    confidence: confidence as number,
    metadata: metadata as Record<string, unknown>,
  }
  if (typeof cameraId === 'string' && cameraId.trim()) olay.cameraId = cameraId.trim()
  if (typeof ham.snapshotUrl === 'string') olay.snapshotUrl = ham.snapshotUrl
  if (typeof ham.clipUrl === 'string') olay.clipUrl = ham.clipUrl

  return { basarili: true, veri: olay, uyarilar }
}

/** Tekil veya dizi gövdeyi normalize eder. Sözleşme her ikisini de taahhüt eder. */
export function govdeyiDiziyeCevir(ham: unknown): unknown[] {
  return Array.isArray(ham) ? ham : [ham]
}

// ─── zod-uyumlu yüzey ────────────────────────────────────────────────────────
// zod onaylanırsa yalnız bu bloğun gövdesi değişir.

export const OlaySemasi = {
  safeParse(ham: unknown): DogrulamaSonucu<VisionEvent> {
    return olayDogrula(ham)
  },
  /** Dizi doğrulaması — her öğe kendi indeksiyle raporlanır. */
  safeParseArray(ham: unknown[]): DogrulamaSonucu<VisionEvent>[] {
    return ham.map((x, i) => olayDogrula(x, `[${i}].`))
  },
}
