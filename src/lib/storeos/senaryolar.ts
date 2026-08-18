// ════════════════════════════════════════════════════════════════════════════
//  Store OS — DEMO SENARYOLARI (tek kaynak)
//
//  Dört senaryo iki yerden tetiklenir: terminal (`scripts/storeos/
//  olay-simulatoru.ts`) ve demo kontrol paneli (`/storeos/demo-kontrol`).
//  Tanımlar BURADA durur, iki kopya değil — jüri önünde tetiklenen olayın
//  terminalde denenen olayla aynı olduğunu ancak böyle söyleyebiliriz.
//
//  İki biçim: `kanonik` (sözleşmenin kendi dili) ve `vendor` (örnek partnerin
//  ham biçimi, adapter kanıtı). Panelde ikisi de tetiklenebilir.
//
//  FAZ 2 senaryoları BİLEREK kuralsızdır: olay kabul edilir, görev doğmaz,
//  panoda "kural yok" rozetiyle görünür. Demoda her olayın görev doğurmadığını
//  göstermek, hepsinin doğurmasından dürüsttür.
//
//  DETERMİNİZM: `Math.random` yok. Olay id'si senaryo adı + çağıranın verdiği
//  damgadan kurulur — aynı damga ile ikinci çağrı "yinelenen" döner, bu da
//  idempotency'nin canlı kanıtıdır.
// ════════════════════════════════════════════════════════════════════════════

import { epochtanIso } from './adapters/ornek-vendor'

export const SENARYOLAR = [
  'kuyruk-artisi', 'raf-stok-dustu', 'kamera-offline', 'isg-islak-zemin',
] as const
export type Senaryo = (typeof SENARYOLAR)[number]

export function senaryoMu(x: unknown): x is Senaryo {
  return typeof x === 'string' && (SENARYOLAR as readonly string[]).includes(x)
}

const MAGAZA = '0178'
/** Kanonik olaylar da vendor hattıyla aynı saat diliminde (+03:00) üretilir. */
const TR_OFFSET_DK = 180

export interface SenaryoTanimi {
  ad: Senaryo
  aciklama: string
  /** Panelde düğme üstünde görünen kısa ad. */
  etiket: string
  faz: 1 | 2
  kanonik(id: string, simdiMs: number): Record<string, unknown>
  vendor(id: string, simdiMs: number): Record<string, unknown>
}

export const TANIMLAR: Record<Senaryo, SenaryoTanimi> = {
  'kuyruk-artisi': {
    ad: 'kuyruk-artisi',
    etiket: 'Kuyruk artışı',
    aciklama: 'Kasa kuyrugu esigi asti (7 kisi, 252 sn bekleme)',
    faz: 1,
    kanonik: (id, ms) => ({
      id, storeCode: MAGAZA, cameraId: `${MAGAZA}-kasa`,
      eventType: 'store.queue.threshold_exceeded',
      occurredAt: epochtanIso(ms, TR_OFFSET_DK), severity: 'high', confidence: 0.91,
      metadata: { registerId: 'kasa-2', queueLength: 7, avgWaitSeconds: 252, maxWaitSeconds: 180 },
    }),
    vendor: (id, ms) => ({
      event_uuid: id, site: { code: MAGAZA, device: `${MAGAZA}-kasa` },
      kind: 'QUEUE_THRESHOLD', ts_ms: ms, tz_offset_min: TR_OFFSET_DK,
      level: 4, score: 91,
      payload: { register: 'kasa-2', people: 7, wait_sec: 252, max_wait_sec: 180 },
    }),
  },
  'raf-stok-dustu': {
    ad: 'raf-stok-dustu',
    etiket: 'Raf stok düştü',
    aciklama: 'Kozmetik reyonunda raf dolulugu %22 (FAZ 2 — kural yok)',
    faz: 2,
    kanonik: (id, ms) => ({
      id, storeCode: MAGAZA, cameraId: `${MAGAZA}-kozmetik`,
      eventType: 'store.shelf.stock_low',
      occurredAt: epochtanIso(ms, TR_OFFSET_DK), severity: 'medium', confidence: 0.78,
      // Otoriter tabloda oran DEĞİL yüzde: fillRatePercent (0-100).
      metadata: { zoneId: 'kozmetik', shelfId: 'KZ-04', fillRatePercent: 22, missingFacings: 9 },
    }),
    vendor: (id, ms) => ({
      event_uuid: id, site: { code: MAGAZA, device: `${MAGAZA}-kozmetik` },
      kind: 'SHELF_LOW', ts_ms: ms, tz_offset_min: TR_OFFSET_DK,
      level: 3, score: 78,
      payload: { zone: 'kozmetik', shelf: 'KZ-04', fill_rate_pct: 22, missing_facings: 9 },
    }),
  },
  'kamera-offline': {
    ad: 'kamera-offline',
    etiket: 'Kamera offline',
    aciklama: 'Depo kamerasi baglantisi koptu',
    faz: 1,
    kanonik: (id, ms) => ({
      id, storeCode: MAGAZA, cameraId: `${MAGAZA}-depo`,
      eventType: 'store.camera.offline',
      occurredAt: epochtanIso(ms, TR_OFFSET_DK), severity: 'high', confidence: 1,
      metadata: { reason: 'rtsp_timeout', lastSeenAt: epochtanIso(ms, TR_OFFSET_DK) },
    }),
    vendor: (id, ms) => ({
      event_uuid: id, site: { code: MAGAZA, device: `${MAGAZA}-depo` },
      kind: 'CAMERA_DOWN', ts_ms: ms, tz_offset_min: TR_OFFSET_DK,
      level: 4, score: 100,
      payload: { reason: 'rtsp_timeout', last_seen: epochtanIso(ms, TR_OFFSET_DK) },
    }),
  },
  'isg-islak-zemin': {
    ad: 'isg-islak-zemin',
    etiket: 'İSG · ıslak zemin',
    aciklama: 'Giris bolgesinde islak zemin (FAZ 2 — kural yok)',
    faz: 2,
    kanonik: (id, ms) => ({
      id, storeCode: MAGAZA, cameraId: `${MAGAZA}-giris`,
      eventType: 'store.safety.event_detected',
      occurredAt: epochtanIso(ms, TR_OFFSET_DK), severity: 'critical', confidence: 0.84,
      metadata: { zoneId: 'giris', issueType: 'wet_floor' },
    }),
    vendor: (id, ms) => ({
      event_uuid: id, site: { code: MAGAZA, device: `${MAGAZA}-giris` },
      kind: 'SAFETY_ALERT', ts_ms: ms, tz_offset_min: TR_OFFSET_DK,
      level: 5, score: 84,
      payload: { zone: 'giris', issue_type: 'wet_floor' },
    }),
  },
}

/** Kasten bozuk olay — 400 + sebep kanıtı. */
export function bozukOlay(): Record<string, unknown> {
  return {
    id: 'evt_bozuk_001',
    storeCode: MAGAZA,
    eventType: 'STORE.Queue.Threshold',      // biçim hatalı (büyük harf)
    occurredAt: '2026-08-14T14:35:21',       // offset YOK
    severity: 'cok_yuksek',                  // listede yok
    confidence: 1.4,                         // 0-1 dışı
    metadata: [],                            // dizi, nesne değil
  }
}

/**
 * Olay id'si. Damga çağırandan gelir:
 *  · simülatör saniye çözünürlüklü damga verir (aynı turda tekrar → yinelenen),
 *  · panel milisaniye verir (her tıklama YENİ olay; jüri önünde "yinelenen"
 *    görmek istemiyoruz, idempotency ayrı bir düğmeyle gösterilir).
 */
export function olayId(senaryo: string, damga: string, sira: number): string {
  return `evt_${senaryo}_${damga}_${String(sira).padStart(3, '0')}`
}
