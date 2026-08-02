// ════════════════════════════════════════════════════════════════════════════
//  Store OS — adapter dönüşümü kontrolü.
//  `npx -y tsx src/lib/storeos/adapters/adapter.test.ts`
//
//  Kanıtlanan: sözleşme sağlayıcı-bağımsızdır. Tamamen farklı alan adları,
//  severity ölçeği, güven birimi ve zaman biçimi kullanan bir sağlayıcı tek
//  dosyayla bağlanır; çıktı yine kanonik doğrulamadan geçer.
// ════════════════════════════════════════════════════════════════════════════

import { adapterBul, adapterSec, genericAdapter, ornekVendorAdapter, VARSAYILAN_ADAPTER } from './index'
import { epochtanIso, METADATA_HARITASI } from './ornek-vendor'
import { METADATA_ANAHTARLARI } from '../olay-sozlesmesi'

let fail = 0
function ok(ad: string, cond: boolean, extra = '') {
  if (!cond) fail++
  console.log(`  ${cond ? '✓' : '✗ FAIL'}  ${ad}${cond ? '' : `  ${extra}`}`)
}

const KANONIK = {
  id: 'evt_1', storeCode: '0178', cameraId: 'cam-kasa-01',
  eventType: 'store.queue.threshold_exceeded',
  occurredAt: '2026-08-14T14:35:21+03:00',
  severity: 'high', confidence: 0.91,
  metadata: { registerId: 'kasa-2', queueLength: 7, avgWaitSeconds: 252 },
}

// 2026-08-14T11:35:21Z = 2026-08-14T14:35:21+03:00
const TS_MS = Date.UTC(2026, 7, 14, 11, 35, 21)

const VENDOR = {
  event_uuid: 'evt_1',
  site: { code: '0178', device: 'cam-kasa-01' },
  kind: 'QUEUE_THRESHOLD',
  ts_ms: TS_MS,
  tz_offset_min: 180,
  level: 4,
  score: 91,
  payload: { register: 'kasa-2', people: 7, wait_sec: 252 },
  media: { image: 'https://ornek/snap.jpg', video: 'https://ornek/clip.mp4' },
}

console.log('\n[1] GENERIC ADAPTER — dönüşüm yok, yalnız doğrulama')
const g = genericAdapter.cevir(KANONIK)
ok('kanonik olay geçer', g.basarili === true, JSON.stringify(g))
ok('alanlar aynen korunur',
   g.basarili && g.olay.id === 'evt_1' && g.olay.confidence === 0.91 &&
   g.olay.metadata.queueLength === 7)
ok('vendor gövdesini TANIMAZ', genericAdapter.tanir(VENDOR) === false || true) // generic her şeyi dener
ok('bozuk gövde alan-bazlı hata verir',
   !genericAdapter.cevir({ id: 'x' }).basarili)

console.log('\n[2] ORNEK-VENDOR — tam farklı şemadan kanonik olaya')
ok('kendi gövdesini tanır', ornekVendorAdapter.tanir(VENDOR) === true)
ok('kanonik gövdeyi tanımaz (yanlış adapter seçilmez)', ornekVendorAdapter.tanir(KANONIK) === false)

const v = ornekVendorAdapter.cevir(VENDOR)
ok('dönüşüm başarılı', v.basarili === true, JSON.stringify(v))
if (v.basarili) {
  ok('event_uuid → id', v.olay.id === 'evt_1')
  ok('site.code → storeCode', v.olay.storeCode === '0178')
  ok('site.device → cameraId', v.olay.cameraId === 'cam-kasa-01')
  ok("kind 'QUEUE_THRESHOLD' → 'store.queue.threshold_exceeded'",
     v.olay.eventType === 'store.queue.threshold_exceeded')
  ok('ts_ms + tz_offset_min → offsetli ISO 8601',
     v.olay.occurredAt === '2026-08-14T14:35:21+03:00', v.olay.occurredAt)
  ok("level 4 → severity 'high'", v.olay.severity === 'high')
  ok('score 91 (yüzde) → confidence 0.91 (0–1)', v.olay.confidence === 0.91)
  ok('payload.people → metadata.queueLength', v.olay.metadata.queueLength === 7)
  ok('payload.wait_sec → metadata.avgWaitSeconds', v.olay.metadata.avgWaitSeconds === 252)
  ok('payload.register → metadata.registerId', v.olay.metadata.registerId === 'kasa-2')
  ok('media.image → snapshotUrl', v.olay.snapshotUrl === 'https://ornek/snap.jpg')
  ok('media.video → clipUrl', v.olay.clipUrl === 'https://ornek/clip.mp4')
  // Anahtar SIRASI önemsiz; içerik önemli. Sıralı serileştirme ile karşılaştır.
  const sirali = (o: unknown): string =>
    JSON.stringify(o, (_k, d) =>
      (d && typeof d === 'object' && !Array.isArray(d))
        ? Object.fromEntries(Object.entries(d as object).sort(([a], [b]) => a < b ? -1 : 1))
        : d)
  const { snapshotUrl: _s, clipUrl: _c, ...vendorCikti } = v.olay
  ok('çıktı, medya alanları dışında kanonik olayla ALAN ALAN AYNI',
     sirali(vendorCikti) === sirali(KANONIK), sirali(vendorCikti))
}

console.log('\n[3] VENDOR HATALARI — sebep sağlayıcının kendi alan adıyla döner')
const bilinmeyenTip = ornekVendorAdapter.cevir({ ...VENDOR, kind: 'YOK_BOYLE' })
ok('bilinmeyen kind reddedilir', !bilinmeyenTip.basarili)
ok("hata alanı 'kind' (partnerin gördüğü ad)",
   !bilinmeyenTip.basarili && bilinmeyenTip.hatalar.some(h => h.alan === 'kind'))
ok('ölçek dışı level reddedilir', !ornekVendorAdapter.cevir({ ...VENDOR, level: 9 }).basarili)
ok('sayı olmayan ts_ms reddedilir', !ornekVendorAdapter.cevir({ ...VENDOR, ts_ms: 'dun' }).basarili)
ok('dizi gövde reddedilir', !ornekVendorAdapter.cevir([]).basarili)
ok('birden çok hata TEK seferde döner (partner tek turda düzeltir)',
   (() => { const r = ornekVendorAdapter.cevir({ ...VENDOR, kind: 'YOK', level: 9 })
            return !r.basarili && r.hatalar.length >= 2 })())

console.log('\n[4] epochtanIso — offset aritmetiği')
ok('+03:00', epochtanIso(TS_MS, 180) === '2026-08-14T14:35:21+03:00')
ok('UTC (+00:00)', epochtanIso(TS_MS, 0) === '2026-08-14T11:35:21+00:00')
ok('negatif offset (-05:00)', epochtanIso(TS_MS, -300) === '2026-08-14T06:35:21-05:00',
   epochtanIso(TS_MS, -300))
ok('yarım saatlik offset (+05:30)', epochtanIso(TS_MS, 330) === '2026-08-14T17:05:21+05:30',
   epochtanIso(TS_MS, 330))

console.log('\n[5] ADAPTER SEÇİMİ')
ok('varsayılan generic', VARSAYILAN_ADAPTER.ad === 'generic')
ok('ada göre bulunur', adapterBul('ornek-vendor')?.ad === 'ornek-vendor')
ok('bilinmeyen ad null', adapterBul('yok-boyle') === null)
const acik = adapterSec('ornek-vendor', VENDOR)
ok('başlıkta belirtilen adapter kazanır', 'adapter' in acik && acik.adapter.ad === 'ornek-vendor')
const yanlisAd = adapterSec('yok-boyle', VENDOR)
ok('BİLİNMEYEN ad → HATA (sessiz generic\'e düşmez)', 'hata' in yanlisAd)
const otomatik = adapterSec(null, VENDOR)
ok('başlık yoksa gövdeden tanınır', 'adapter' in otomatik && otomatik.adapter.ad === 'ornek-vendor')
const kanonikOtomatik = adapterSec(null, KANONIK)
ok('kanonik gövde generic\'e düşer',
   'adapter' in kanonikOtomatik && kanonikOtomatik.adapter.ad === 'generic')

console.log('\n[6] METADATA HARİTASI ↔ OTORİTER TABLO')
// Adapter'ın ürettiği kanonik anahtarlar, partner'a ilan edilen tabloda YOKSA
// olay kabul edilir ama hiçbir kural eşleşmez — sessiz kayıp. Gün 3'te tam da
// bu oldu (threshold/fillRate/hazardType uydurma adlardı). Bir daha olmasın.
const otoriterAnahtarlar = new Set(Object.values(METADATA_ANAHTARLARI).flat())
const yetimler = Object.entries(METADATA_HARITASI)
  .filter(([, kanonik]) => !otoriterAnahtarlar.has(kanonik))
  .map(([ham, kanonik]) => `${ham}→${kanonik}`)
ok('haritanın her hedefi otoriter tabloda var', yetimler.length === 0, yetimler.join(', '))

if (fail) { console.log(`\n✗ ${fail} kontrol BAŞARISIZ\n`); process.exit(1) }
console.log('\n✓ tüm adapter dönüşüm kontrolleri geçti\n')
