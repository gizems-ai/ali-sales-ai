// ════════════════════════════════════════════════════════════════════════════
//  Adapter: ornek-vendor — HAYALİ sağlayıcı.
//
//  Bu gerçek bir entegrasyon değildir. Amacı, sözleşmenin sağlayıcı-bağımsız
//  olduğunu KANITLAMAK: tamamen farklı alan adları, farklı severity ölçeği,
//  yüzde cinsinden güven, epoch milisaniye zaman ve iç içe payload kullanan bir
//  sağlayıcı, tek dosya yazılarak sisteme bağlanabiliyor.
//
//  Ham biçim:
//  {
//    "event_uuid": "5f1c…",
//    "site": { "code": "0178", "device": "cam-kasa-01" },
//    "kind": "QUEUE_THRESHOLD",
//    "ts_ms": 1755178521000,
//    "tz_offset_min": 180,
//    "level": 4,                  // 1..5
//    "score": 91,                 // yüzde
//    "payload": { "register": "kasa-2", "people": 7, "wait_sec": 252 },
//    "media": { "image": "https://…", "video": "https://…" }
//  }
// ════════════════════════════════════════════════════════════════════════════

import { olayDogrula } from '../olay-sozlesmesi'
import type { AlanHatasi } from '../olay-sozlesmesi'
import type { Adapter, AdapterSonucu } from './tipler'

/** Sağlayıcı tip adı → kanonik olay tipi. */
const TIP_HARITASI: Record<string, string> = {
  PERSON_COUNT:       'store.person_count.updated',
  QUEUE_LENGTH:       'store.queue.length_changed',
  QUEUE_THRESHOLD:    'store.queue.threshold_exceeded',
  OCCUPANCY:          'store.occupancy.updated',
  DWELL_TIME:         'store.dwell_time.updated',
  ZONE_COUNT:         'store.zone.person_count',
  CAMERA_DOWN:        'store.camera.offline',
  CAMERA_DEGRADED:    'store.camera.degraded',
  SHELF_LOW:          'store.shelf.stock_low',
  PLANOGRAM_FAIL:     'store.planogram.non_compliant',
  SAFETY_ALERT:       'store.safety.event_detected',
  SECURITY_ALERT:     'store.security.event_detected',
  HEATMAP:            'store.heatmap.snapshot',
}

/** 1..5 → kanonik severity. Sağlayıcının ölçeği bizimkiyle aynı değil. */
const SEVERITY_HARITASI: Record<number, string> = {
  1: 'info', 2: 'low', 3: 'medium', 4: 'high', 5: 'critical',
}

/** payload anahtarları → kanonik metadata anahtarları (METADATA_ANAHTARLARI ile aynı). */
const METADATA_HARITASI: Record<string, string> = {
  register:   'registerId',
  people:     'queueLength',
  wait_sec:   'avgWaitSeconds',
  limit:      'threshold',
  count:      'count',
  zone:       'zoneId',
  shelf:      'shelfId',
  fill_rate:  'fillRate',
  occupancy:  'occupancy',
  capacity:   'capacity',
  dwell_sec:  'avgDwellSeconds',
  reason:     'reason',
  fps:        'frameRate',
  last_seen:  'lastSeenAt',
  hazard:     'hazardType',
  incident:   'incidentType',
}

/** epoch ms + dakika cinsinden offset → offsetli ISO 8601. */
export function epochtanIso(msDeger: number, offsetDk: number): string {
  const kaydirilmis = new Date(msDeger + offsetDk * 60_000)
  const govde = kaydirilmis.toISOString().slice(0, 19) // 'YYYY-MM-DDTHH:mm:ss'
  const isaret = offsetDk >= 0 ? '+' : '-'
  const mutlak = Math.abs(offsetDk)
  const sa = String(Math.floor(mutlak / 60)).padStart(2, '0')
  const dk = String(mutlak % 60).padStart(2, '0')
  return `${govde}${isaret}${sa}:${dk}`
}

function obje(x: unknown): Record<string, unknown> {
  return (typeof x === 'object' && x !== null && !Array.isArray(x)) ? x as Record<string, unknown> : {}
}

export const ornekVendorAdapter: Adapter = {
  ad: 'ornek-vendor',
  aciklama: 'HAYALİ sağlayıcı. Sözleşmenin sağlayıcı-bağımsızlığını kanıtlayan örnek dönüşüm.',

  tanir(ham: unknown): boolean {
    if (typeof ham !== 'object' || ham === null || Array.isArray(ham)) return false
    const o = ham as Record<string, unknown>
    return typeof o.event_uuid === 'string' && typeof o.kind === 'string'
  },

  cevir(ham: unknown, onek = ''): AdapterSonucu {
    const hatalar: AlanHatasi[] = []
    const h = (alan: string, sebep: string) => hatalar.push({ alan: onek + alan, sebep })

    if (typeof ham !== 'object' || ham === null || Array.isArray(ham)) {
      return { basarili: false, hatalar: [{ alan: onek.replace(/\.$/, '') || 'govde', sebep: 'Olay bir JSON nesnesi olmalı.' }] }
    }
    const o = ham as Record<string, unknown>
    const site = obje(o.site)
    const payload = obje(o.payload)
    const media = obje(o.media)

    // ── tip ──
    const kind = typeof o.kind === 'string' ? o.kind : ''
    const eventType = TIP_HARITASI[kind]
    if (!eventType) h('kind', `Bilinmeyen sağlayıcı tipi '${kind}'. Beklenen: ${Object.keys(TIP_HARITASI).join(', ')}.`)

    // ── zaman ──
    let occurredAt = ''
    const tsMs = typeof o.ts_ms === 'number' ? o.ts_ms : Number(o.ts_ms)
    const offsetDk = typeof o.tz_offset_min === 'number' ? o.tz_offset_min : 180 // varsayılan +03:00
    if (!Number.isFinite(tsMs)) h('ts_ms', 'Epoch milisaniye sayısı olmalı.')
    else occurredAt = epochtanIso(tsMs, offsetDk)

    // ── severity ──
    const level = typeof o.level === 'number' ? o.level : Number(o.level)
    const severity = SEVERITY_HARITASI[level]
    if (!severity) h('level', `1–5 arası olmalı, gelen: ${String(o.level)}.`)

    // ── güven: yüzde → 0-1 ──
    const score = typeof o.score === 'number' ? o.score : Number(o.score)
    if (!Number.isFinite(score)) h('score', '0–100 arası yüzde olmalı.')
    const confidence = Number.isFinite(score) ? Math.round((score / 100) * 1000) / 1000 : 0

    // ── metadata: anahtar çevirisi ──
    const metadata: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(payload)) {
      metadata[METADATA_HARITASI[k] ?? k] = v
    }

    if (hatalar.length) return { basarili: false, hatalar }

    const kanonik: Record<string, unknown> = {
      id: typeof o.event_uuid === 'string' ? o.event_uuid : '',
      storeCode: typeof site.code === 'string' ? site.code : '',
      eventType,
      occurredAt,
      severity,
      confidence,
      metadata,
    }
    if (typeof site.device === 'string' && site.device) kanonik.cameraId = site.device
    if (typeof media.image === 'string' && media.image) kanonik.snapshotUrl = media.image
    if (typeof media.video === 'string' && media.video) kanonik.clipUrl = media.video

    // Dönüşüm sonrası KANONİK doğrulamadan geçer — adapter kendi çıktısına
    // güvenmez. Sözleşme tek kapıdır.
    const s = olayDogrula(kanonik, onek)
    if (!s.basarili) return { basarili: false, hatalar: s.hatalar }
    return { basarili: true, olay: s.veri, uyarilar: s.uyarilar }
  },
}
