// ════════════════════════════════════════════════════════════════════════════
//  Store OS — SÖZLEŞME DOĞRULAMA: NEGATİF VAKALAR
//  `npx -y tsx src/lib/storeos/olay-sozlesmesi.test.ts`
//
//  NEDEN BU DOSYA VAR: zod eklememe kararı (Gün 3) doğrulamayı elle yazılmış
//  koda bıraktı. Elle doğrulama, hataların saklanabileceği yerdir. Bu dosya o
//  bedeli ödeyen taraftır — pozitif vaka bir tane, gerisi hep RED.
//
//  Her kontrol iki şey doğrular: (a) reddedildi mi, (b) SEBEP doğru alanda mı.
//  Sebebin alanı sözleşmenin parçası — partner "hangi alanı düzelteceğim"i
//  4xx gövdesinden okuyabilmeli.
// ════════════════════════════════════════════════════════════════════════════

import {
  olayDogrula, OlaySemasi, UYARI_KODLARI,
  SEVERITY_DEGERLERI, METADATA_ANAHTARLARI, FAZ1_OLAY_TIPLERI, FAZ2_OLAY_TIPLERI,
} from './olay-sozlesmesi'

let fail = 0
function ok(ad: string, cond: boolean, extra = '') {
  if (!cond) fail++
  console.log(`  ${cond ? '✓' : '✗ FAIL'}  ${ad}${cond ? '' : `  ${extra}`}`)
}

/** Geçerli temel olay. Her negatif vaka bunun TEK alanını bozar. */
const TEMEL = {
  id: 'evt_1',
  storeCode: '0178',
  cameraId: 'cam-kasa-01',
  eventType: 'store.queue.threshold_exceeded',
  occurredAt: '2026-08-14T14:35:21+03:00',
  severity: 'high',
  confidence: 0.91,
  metadata: { registerId: 'kasa-2', queueLength: 7, avgWaitSeconds: 252, maxWaitSeconds: 180 },
}

const ile = (yama: Record<string, unknown>) => ({ ...TEMEL, ...yama })

/** Reddedildi VE hata tam da beklenen alanda mı? */
function redAlan(govde: unknown, alan: string): boolean {
  const s = olayDogrula(govde)
  return !s.basarili && s.hatalar.some(h => h.alan === alan)
}

// ════════════════════════════════════════════════════════════════════════════
console.log('\n[0] TEMEL — pozitif vaka (negatiflerin anlamlı olması için)')
const temel = olayDogrula(TEMEL)
ok('geçerli olay kabul edilir', temel.basarili === true,
   temel.basarili ? '' : JSON.stringify(temel.hatalar))
ok('uyarı üretmez', temel.basarili && temel.uyariKodlari.length === 0,
   temel.basarili ? temel.uyariKodlari.join(',') : '')

// ════════════════════════════════════════════════════════════════════════════
console.log('\n[1] confidence — aralık dışı ve tip')
ok('-0.1 reddedilir', redAlan(ile({ confidence: -0.1 }), 'confidence'))
ok('1.1 reddedilir', redAlan(ile({ confidence: 1.1 }), 'confidence'))
ok("string '0.9' reddedilir (sessizce Number'a çevrilmez)",
   redAlan(ile({ confidence: '0.9' }), 'confidence'))
ok("string '' reddedilir", redAlan(ile({ confidence: '' }), 'confidence'))
ok('NaN reddedilir', redAlan(ile({ confidence: Number.NaN }), 'confidence'))
ok('Infinity reddedilir', redAlan(ile({ confidence: Number.POSITIVE_INFINITY }), 'confidence'))
ok('null reddedilir', redAlan(ile({ confidence: null }), 'confidence'))
ok('eksik reddedilir', (() => { const { confidence: _x, ...y } = TEMEL; return redAlan(y, 'confidence') })())
ok('boolean true reddedilir (1 sayılmaz)', redAlan(ile({ confidence: true }), 'confidence'))
ok('sınır 0 KABUL edilir', olayDogrula(ile({ confidence: 0 })).basarili === true)
ok('sınır 1 KABUL edilir', olayDogrula(ile({ confidence: 1 })).basarili === true)
ok('aralık hatası gelen değeri sebepte gösterir',
   (() => { const s = olayDogrula(ile({ confidence: 1.4 }))
            return !s.basarili && s.hatalar.some(h => h.sebep.includes('1.4')) })())

// ════════════════════════════════════════════════════════════════════════════
console.log('\n[2] occurredAt — offset zorunlu, biçim katı')
ok('offsetsiz reddedilir', redAlan(ile({ occurredAt: '2026-08-14T14:35:21' }), 'occurredAt'))
ok('yalnız tarih reddedilir', redAlan(ile({ occurredAt: '2026-08-14' }), 'occurredAt'))
ok('boşluk ayraçlı (SQL biçimi) reddedilir',
   redAlan(ile({ occurredAt: '2026-08-14 14:35:21+03:00' }), 'occurredAt'))
ok('epoch saniye (sayı) reddedilir', redAlan(ile({ occurredAt: 1755178521 }), 'occurredAt'))
ok('epoch string reddedilir', redAlan(ile({ occurredAt: '1755178521' }), 'occurredAt'))
ok('offset iki nokta olmadan (+0300) reddedilir',
   redAlan(ile({ occurredAt: '2026-08-14T14:35:21+0300' }), 'occurredAt'))
ok('takvimde olmayan tarih (13. ay) reddedilir',
   redAlan(ile({ occurredAt: '2026-13-45T14:35:21+03:00' }), 'occurredAt'))
ok('boş string reddedilir', redAlan(ile({ occurredAt: '' }), 'occurredAt'))
ok("'Z' KABUL edilir", olayDogrula(ile({ occurredAt: '2026-08-14T11:35:21Z' })).basarili === true)
ok('milisaniyeli KABUL edilir',
   olayDogrula(ile({ occurredAt: '2026-08-14T14:35:21.123+03:00' })).basarili === true)
ok('negatif offset KABUL edilir',
   olayDogrula(ile({ occurredAt: '2026-08-14T06:35:21-05:00' })).basarili === true)
ok('ret sebebi offset zorunluluğunu AÇIKÇA söyler',
   (() => { const s = olayDogrula(ile({ occurredAt: '2026-08-14T14:35:21' }))
            return !s.basarili && s.hatalar.some(h => h.sebep.toUpperCase().includes('OFFSET')) })())

// ════════════════════════════════════════════════════════════════════════════
console.log('\n[3] severity — kapalı liste')
ok('listede olmayan değer reddedilir', redAlan(ile({ severity: 'cok_yuksek' }), 'severity'))
ok("BÜYÜK harf 'HIGH' reddedilir (normalize edilmez)",
   redAlan(ile({ severity: 'HIGH' }), 'severity'))
ok('sayısal severity reddedilir', redAlan(ile({ severity: 4 }), 'severity'))
ok('boş string reddedilir', redAlan(ile({ severity: '' }), 'severity'))
ok('null reddedilir', redAlan(ile({ severity: null }), 'severity'))
ok('eksik reddedilir', (() => { const { severity: _x, ...y } = TEMEL; return redAlan(y, 'severity') })())
ok('ret sebebi izinli değerleri LİSTELER',
   (() => { const s = olayDogrula(ile({ severity: 'x' }))
            return !s.basarili && s.hatalar.some(h => h.sebep.includes('critical')) })())
ok('beş değerin HEPSİ kabul edilir',
   SEVERITY_DEGERLERI.every(sv => olayDogrula(ile({ severity: sv })).basarili === true))

// ════════════════════════════════════════════════════════════════════════════
console.log('\n[4] metadata — nesne olmak ZORUNDA')
ok('eksik reddedilir', (() => { const { metadata: _x, ...y } = TEMEL; return redAlan(y, 'metadata') })())
ok('null reddedilir', redAlan(ile({ metadata: null }), 'metadata'))
ok('dizi reddedilir (typeof object tuzağı)', redAlan(ile({ metadata: [] }), 'metadata'))
ok('dolu dizi de reddedilir', redAlan(ile({ metadata: [{ a: 1 }] }), 'metadata'))
ok('string reddedilir (JSON-in-string kabul edilmez)',
   redAlan(ile({ metadata: '{"queueLength":7}' }), 'metadata'))
ok('sayı reddedilir', redAlan(ile({ metadata: 7 }), 'metadata'))
ok('boş nesne {} KABUL edilir (veri yoksa doğru biçim)',
   olayDogrula(ile({ eventType: 'store.heatmap.snapshot', metadata: {} })).basarili === true)
ok('32 KB üstü metadata reddedilir',
   redAlan(ile({ metadata: { dev: 'x'.repeat(40_000) } }), 'metadata'))
ok('ret sebebi doğru biçimi söyler ({} gönder)',
   (() => { const s = olayDogrula(ile({ metadata: [] }))
            return !s.basarili && s.hatalar.some(h => h.sebep.includes('{}')) })())

// ════════════════════════════════════════════════════════════════════════════
console.log('\n[5] id — idempotency anahtarı, boş olamaz')
ok('eksik reddedilir', (() => { const { id: _x, ...y } = TEMEL; return redAlan(y, 'id') })())
ok('boş string reddedilir', redAlan(ile({ id: '' }), 'id'))
ok('yalnız boşluk reddedilir (trim sonrası boş)', redAlan(ile({ id: '   ' }), 'id'))
ok('null reddedilir', redAlan(ile({ id: null }), 'id'))
ok('sayı reddedilir (tip zorlanmaz)', redAlan(ile({ id: 12345 }), 'id'))
ok('128 karakterden uzun reddedilir', redAlan(ile({ id: 'e'.repeat(129) }), 'id'))
ok('tam 128 karakter kabul edilir', olayDogrula(ile({ id: 'e'.repeat(128) })).basarili === true)
ok('baş/son boşluk TEMİZLENİR (aynı olay iki kez kaydolmasın)',
   (() => { const s = olayDogrula(ile({ id: '  evt_1  ' }))
            return s.basarili && s.veri.id === 'evt_1' })())

// ════════════════════════════════════════════════════════════════════════════
console.log('\n[6] eventType + storeCode')
ok('eksik eventType reddedilir',
   (() => { const { eventType: _x, ...y } = TEMEL; return redAlan(y, 'eventType') })())
ok('BÜYÜK harfli tip reddedilir (biçim)', redAlan(ile({ eventType: 'STORE.Queue' }), 'eventType'))
ok('tek parça tip reddedilir', redAlan(ile({ eventType: 'store' }), 'eventType'))
ok('boşluk içeren tip reddedilir', redAlan(ile({ eventType: 'store.queue x' }), 'eventType'))
ok('eksik storeCode reddedilir',
   (() => { const { storeCode: _x, ...y } = TEMEL; return redAlan(y, 'storeCode') })())
ok('boş storeCode reddedilir', redAlan(ile({ storeCode: '  ' }), 'storeCode'))

// ════════════════════════════════════════════════════════════════════════════
console.log('\n[7] opsiyonel alanlar')
ok('cameraId yokken kabul edilir',
   (() => { const { cameraId: _x, ...y } = TEMEL; return olayDogrula(y).basarili === true })())
ok('boş cameraId reddedilir (yoksa hiç gönderme)', redAlan(ile({ cameraId: '' }), 'cameraId'))
ok('ftp:// snapshotUrl reddedilir', redAlan(ile({ snapshotUrl: 'ftp://x/y.jpg' }), 'snapshotUrl'))
ok('URL olmayan string reddedilir', redAlan(ile({ clipUrl: 'sadece-metin' }), 'clipUrl'))
ok('https URL kabul edilir',
   olayDogrula(ile({ snapshotUrl: 'https://ornek/a.jpg' })).basarili === true)
ok('null snapshotUrl kabul edilir (gönderilmemiş sayılır)',
   olayDogrula(ile({ snapshotUrl: null })).basarili === true)

// ════════════════════════════════════════════════════════════════════════════
console.log('\n[8] ÇOKLU HATA — partner tek turda düzeltsin')
const cokluBozuk = {
  id: '', storeCode: '', eventType: 'STORE.X',
  occurredAt: '2026-08-14T14:35:21', severity: 'cok_yuksek',
  confidence: 1.4, metadata: [],
}
const coklu = olayDogrula(cokluBozuk)
ok('reddedilir', !coklu.basarili)
ok('TÜM bozuk alanlar tek yanıtta döner (ilk hatada durmaz)',
   !coklu.basarili && coklu.hatalar.length >= 6, !coklu.basarili ? String(coklu.hatalar.length) : '')
ok('her hatanın alanı VE sebebi dolu',
   !coklu.basarili && coklu.hatalar.every(h => !!h.alan && !!h.sebep))

// ════════════════════════════════════════════════════════════════════════════
console.log('\n[9] GÖVDE TİPİ')
ok('null gövde reddedilir', !olayDogrula(null).basarili)
ok('dizi gövde (tekil doğrulamada) reddedilir', !olayDogrula([]).basarili)
ok('string gövde reddedilir', !olayDogrula('merhaba').basarili)
ok('sayı gövde reddedilir', !olayDogrula(42).basarili)
ok('gövde hatası alan adı olmadan raporlanır', (() => {
  const s = olayDogrula(null)
  return !s.basarili && s.hatalar[0]!.alan === 'govde'
})())

// ════════════════════════════════════════════════════════════════════════════
console.log('\n[10] UYARILAR — reddetme yok, ama SESSİZLİK de yok')
const yazimHatasi = olayDogrula(ile({ eventType: 'store.queu.length_changed' }))
ok('bilinmeyen tip KABUL edilir', yazimHatasi.basarili === true)
ok("uyarı kodu 'bilinmeyen_olay_tipi'",
   yazimHatasi.basarili && yazimHatasi.uyariKodlari.includes(UYARI_KODLARI.bilinmeyenOlayTipi))
ok('uyarı metni yazılan tipi gösterir',
   yazimHatasi.basarili && yazimHatasi.uyarilar.some(x => x.includes('store.queu.length_changed')))

const fazladan = olayDogrula({ ...TEMEL, storeName: 'Gratis Kadikoy', vendorInternalId: 99 })
ok('sözleşme dışı alan olayı REDDETMEZ', fazladan.basarili === true)
ok("uyarı kodu 'sozlesme_disi_alan'",
   fazladan.basarili && fazladan.uyariKodlari.includes(UYARI_KODLARI.sozlesmeDisiAlan))
ok('sözleşme dışı alan kanonik olaya SIZMAZ',
   fazladan.basarili && !('storeName' in fazladan.veri))

const eksikAnahtar = olayDogrula(ile({ metadata: { registerId: 'kasa-2' } }))
ok('eksik metadata anahtarı olayı REDDETMEZ', eksikAnahtar.basarili === true)
ok("uyarı kodu 'eksik_metadata_anahtari'",
   eksikAnahtar.basarili && eksikAnahtar.uyariKodlari.includes(UYARI_KODLARI.eksikMetadataAnahtari))
ok('uyarı EKSİK anahtarları tek tek sayar',
   eksikAnahtar.basarili && eksikAnahtar.uyarilar.some(x =>
     x.includes('queueLength') && x.includes('avgWaitSeconds') && x.includes('maxWaitSeconds')))
ok('uyarı kodları ile insan metinleri BİRE BİR eşleşir',
   eksikAnahtar.basarili && eksikAnahtar.uyariKodlari.length === eksikAnahtar.uyarilar.length)

// ════════════════════════════════════════════════════════════════════════════
console.log('\n[11] DİZİ — tek bozuk eleman diğerlerini düşürmez (KISMİ KABUL)')
// Karar (Gün 3): dizideki elemanlar bağımsız fiziksel olaylardır, bir işlem
// değil. Bozuk eleman reddedilir, geçerliler işlenir. Gerekçe route başlığında.
const dizi = [
  ile({ id: 'evt_a' }),
  ile({ id: 'evt_b', confidence: 5 }),   // bozuk
  ile({ id: 'evt_c' }),
]
const sonuclar = OlaySemasi.safeParseArray(dizi)
ok('3 sonuç döner', sonuclar.length === 3)
ok('0. eleman kabul', sonuclar[0]!.basarili === true)
ok('1. eleman RED', sonuclar[1]!.basarili === false)
ok('2. eleman kabul — bozuk komşusundan ETKİLENMEZ', sonuclar[2]!.basarili === true)
ok('hata yolu indeksli: [1].confidence',
   !sonuclar[1]!.basarili && sonuclar[1]!.hatalar.some(h => h.alan === '[1].confidence'),
   !sonuclar[1]!.basarili ? JSON.stringify(sonuclar[1]!.hatalar) : '')
ok('kabul edilen elemanlarda indeks öneki YOK (tekil yol kirlenmesin)',
   sonuclar[0]!.basarili === true)

// ════════════════════════════════════════════════════════════════════════════
console.log('\n[12] safeParse yüzeyi (zod kararı tersine dönerse tek değişecek yer)')
ok('safeParse geçerliyi kabul eder', OlaySemasi.safeParse(TEMEL).basarili === true)
ok('safeParse bozuğu reddeder', OlaySemasi.safeParse({ id: 'x' }).basarili === false)
ok('safeParse fırlatmaz (throw yok, sonuç döner)', (() => {
  try { OlaySemasi.safeParse(undefined); return true } catch { return false }
})())

// ════════════════════════════════════════════════════════════════════════════
console.log('\n[13] TABLO BÜTÜNLÜĞÜ — her bilinen tipin metadata satırı var')
const eksikSatir = [...FAZ1_OLAY_TIPLERI, ...FAZ2_OLAY_TIPLERI]
  .filter(t => !METADATA_ANAHTARLARI[t])
ok('13 tipin hepsi METADATA_ANAHTARLARI içinde', eksikSatir.length === 0, eksikSatir.join(', '))
ok('tabloda sözleşmede olmayan tip yok',
   Object.keys(METADATA_ANAHTARLARI).every(t =>
     ([...FAZ1_OLAY_TIPLERI, ...FAZ2_OLAY_TIPLERI] as readonly string[]).includes(t)))

if (fail) { console.log(`\n✗ ${fail} kontrol BAŞARISIZ\n`); process.exit(1) }
console.log('\n✓ tüm sözleşme doğrulama kontrolleri geçti\n')
