// ════════════════════════════════════════════════════════════════════════════
//  Store OS — OLAY SÖZLEŞMESİ (kanonik biçim)
//
//  KİLİTLİ. Bu şema entegrasyon dokümanıyla partnere ilan edildi.
//  Alan adı / tip / davranış değiştirilmez. Değişiklik gerekirse önce doküman.
//
//  ── DOĞRULAMA KÜTÜPHANESİ — KARAR VERİLDİ (Gün 3) ──────────────────────────
//  zod EKLENMEYECEK. Elle doğrulama kalıcı.
//  Gerekçe: buradaki hata mesajları partner sözleşmesinin parçası ("4xx
//  gövdesinde sebep yazılı"); zod'un üreteceği generic mesajlar bunu bozardı.
//  Ayrıca zod bu repoda beyan edilmiş bağımlılık değil (Next 16 transitive'i),
//  bir yükseltmede sessizce kaybolabilirdi.
//
//  Yüzey yine de zod-uyumlu tutuldu:
//      OlaySemasi.safeParse(x) → { basarili, veri } | { basarili:false, hatalar }
//  Karar tersine dönerse değişecek TEK yer bu dosyadaki `safeParse` gövdesidir.
//
//  Bunun bedeli: doğrulama artık hataların saklanabileceği yer. Negatif vaka
//  testleri `olay-sozlesmesi.test.ts` içinde ve sıkı tutulmalı.
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
 * Her olay tipi için BEKLENEN metadata anahtarları.
 *
 * KAYNAK: partnere ilan edilen entegrasyon dokümanı (OTORİTER, 3 Ağu).
 * Gün 2'de bu tabloyu tahmin etmiştim; tahmin yanlıştı ve otoriter tabloyla
 * DEĞİŞTİRİLDİ. Farkların dökümü Gün 3 raporunda.
 *
 * Doğrulamada ZORUNLU DEĞİL — eksik anahtar olayı reddetmez, `warnings` içine
 * `eksik_metadata_anahtari` kodu düşer. Gerekçe: eksik anahtar sessiz bir
 * kural-eşleşmemesine yol açar; partner bunu 200 yanıtında görmeli.
 */
export const METADATA_ANAHTARLARI: Record<string, readonly string[]> = {
  'store.person_count.updated':      ['count', 'zoneId', 'periodSeconds'],
  'store.queue.length_changed':      ['registerId', 'queueLength', 'avgWaitSeconds'],
  'store.queue.threshold_exceeded':  ['registerId', 'queueLength', 'avgWaitSeconds', 'maxWaitSeconds'],
  'store.occupancy.updated':         ['personCount', 'densityLevel'],
  'store.dwell_time.updated':        ['zoneId', 'avgDwellSeconds'],
  'store.zone.person_count':         ['zoneId', 'count'],
  'store.camera.offline':            ['lastSeenAt', 'reason'],
  'store.camera.degraded':           ['issue'],
  // Faz 2 — referans, kural yok
  'store.shelf.stock_low':           ['zoneId', 'shelfId', 'fillRatePercent', 'missingFacings'],
  'store.planogram.non_compliant':   ['zoneId', 'shelfId', 'issueType', 'expectedSku', 'detectedSku'],
  'store.safety.event_detected':     ['issueType', 'zoneId'],
  'store.security.event_detected':   ['issueType', 'zoneId'],
  'store.heatmap.snapshot':          ['gridWidth', 'gridHeight', 'values', 'periodMinutes'],
}

/**
 * Dokümanda enum olarak ilan edilen metadata değerleri.
 * REFERANS — doğrulama bunları zorlamaz (bilinmeyen değer olayı reddetmez).
 * Kural koşulları ve panel etiketleri bu listelere yaslanır.
 */
export const METADATA_ENUM_DEGERLERI = {
  'store.occupancy.updated': {
    densityLevel: ['low', 'medium', 'high'],
  },
  'store.camera.degraded': {
    issue: ['blur', 'obstructed', 'low_light', 'tampered'],
  },
  'store.safety.event_detected': {
    issueType: ['wet_floor', 'blocked_exit', 'improper_stacking', 'obstruction'],
  },
  'store.security.event_detected': {
    issueType: ['abandoned_object', 'unauthorized_zone', 'tampering'],
  },
} as const

// ─── Uyarı kodları ───────────────────────────────────────────────────────────
// Makine okur. Yanıt gövdesindeki `warnings` dizisi BU kodları taşır; insan
// metni ayrı alanda (`uyarilar`) döner. Partner koda göre alarm kurabilsin.

export const UYARI_KODLARI = {
  bilinmeyenOlayTipi:      'bilinmeyen_olay_tipi',
  sozlesmeDisiAlan:        'sozlesme_disi_alan',
  eksikMetadataAnahtari:   'eksik_metadata_anahtari',
} as const

export type UyariKodu = (typeof UYARI_KODLARI)[keyof typeof UYARI_KODLARI]

// ─── Doğrulama ───────────────────────────────────────────────────────────────

export interface AlanHatasi {
  /** Nokta yolu: 'metadata' · 'occurredAt' · '[2].confidence' */
  alan: string
  /** Partnerin okuyacağı sebep. 4xx gövdesine BU yazılır. */
  sebep: string
}

export type DogrulamaSonucu<T> =
  | { basarili: true; veri: T; uyarilar: string[]; uyariKodlari: UyariKodu[] }
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
  const uyariKodlari: UyariKodu[] = []
  const h = (alan: string, sebep: string) => hatalar.push({ alan: onek + alan, sebep })
  const u = (kod: UyariKodu, metin: string) => { uyariKodlari.push(kod); uyarilar.push(metin) }

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
    // Reddetmiyoruz (bkz. bilinenTipMi yorumu) ama SESSİZ de kalmıyoruz:
    // 'store.queu.length_changed' yazan partner 200 alıp haftalarca fark etmesin.
    u(UYARI_KODLARI.bilinmeyenOlayTipi,
      `Bilinmeyen olay tipi '${eventType}' — kabul edildi, hiçbir kurala eşleşmeyecek. Yazım hatası olabilir.`)
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
  if (fazladan.length) {
    u(UYARI_KODLARI.sozlesmeDisiAlan, `Sözleşme dışı alanlar yoksayıldı: ${fazladan.join(', ')}.`)
  }

  // ── eksik metadata anahtarı: REDDETME, bildir ──
  // Bilinmeyen olay tipiyle aynı sessiz kırılma sınıfı: anahtar adı yanlışsa
  // kural eşleşmez, partner 202 alır, kimse fark etmez.
  if (typeof eventType === 'string' && duzObjeMi(metadata)) {
    const beklenen = METADATA_ANAHTARLARI[eventType]
    if (beklenen) {
      const eksik = beklenen.filter(k => !(k in metadata))
      if (eksik.length) {
        u(UYARI_KODLARI.eksikMetadataAnahtari,
          `'${eventType}' için beklenen metadata anahtarları eksik: ${eksik.join(', ')}. Olay kabul edildi ama kural eşleşmeyebilir.`)
      }
    }
  }

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

  return { basarili: true, veri: olay, uyarilar, uyariKodlari }
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
