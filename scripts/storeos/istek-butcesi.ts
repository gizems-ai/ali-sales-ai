// ════════════════════════════════════════════════════════════════════════════
//  Store OS — AIRTABLE İSTEK BÜTÇESİ ÖLÇÜMÜ
//
//    set -a; . ./.env.local; set +a
//    npx -y tsx scripts/storeos/istek-butcesi.ts
//
//  SORU: Airtable base başına ~5 istek/sn veriyor. Jüri demosunda ekranlar
//  anket atarken, olay akarken ve butonlara basılırken bu tavana çarpar mıyız?
//
//  YÖNTEM: tahmin YOK. `globalThis.fetch` sarılır, api.airtable.com'a giden
//  her istek sayılır ve GERÇEK kod yolları (panoTopla / listeTopla /
//  olaylariAl / yanitiIsle) canlı base'e karşı koşturulur.
//
//  ⚠ CANLI BASE'E YAZAR. Yazdığı her kayıt `btc-` önekli ve Veri Tipi='demo';
//    koşu sonunda silinir. DenetimKaydi silinmez (append-only) — orada
//    ölçüm başına birkaç satır kalır.
// ════════════════════════════════════════════════════════════════════════════

import { AirtableDeposu } from '../../src/lib/storeos/depo/airtable'
import { panoTopla } from '../../src/lib/storeos/dashboard/toplayici'
import { listeTopla } from '../../src/lib/storeos/liste/toplayici'
import { olaylariAl } from '../../src/lib/storeos/olay-alim'
import { yanitiIsle } from '../../src/lib/storeos/inbound'
import { konsolKanaliniZorla } from '../../src/lib/storeos/kanal'
import { butonIdUret } from '../../src/lib/storeos/kanal'
import { TABLO } from '../../src/lib/storeos/tipler'

const BASE = process.env.STOREOS_AIRTABLE_BASE_ID
const KEY = process.env.STOREOS_AIRTABLE_API_KEY
if (!BASE || !KEY) {
  console.error('STOREOS_AIRTABLE_BASE_ID ve STOREOS_AIRTABLE_API_KEY gerekli.')
  process.exit(1)
}

// ─── Sayaç ───────────────────────────────────────────────────────────────────

const gercekFetch = globalThis.fetch
let sayac = 0
globalThis.fetch = ((...a: Parameters<typeof fetch>) => {
  if (String(a[0]).includes('api.airtable.com')) sayac++
  return gercekFetch(...a)
}) as typeof fetch

const olcumler: { ad: string; istek: number; not?: string }[] = []

async function olc(ad: string, is: () => Promise<unknown>, not?: string) {
  sayac = 0
  const t0 = Date.now()
  await is()
  const gecen = Date.now() - t0
  olcumler.push({ ad, istek: sayac, not: not ?? `${gecen} ms` })
  console.log(`  ${String(sayac).padStart(3)} istek  ${ad}  (${gecen} ms)`)
}

// ─── Temizlik (bu scriptin kendi kayıtları) ──────────────────────────────────

async function at(yol: string, init: RequestInit = {}) {
  const r = await gercekFetch(`https://api.airtable.com/v0/${BASE}${yol}`, {
    ...init,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  if (!r.ok) throw new Error(`Airtable ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return r.json() as Promise<{ records: { id: string }[] }>
}

async function silFormulle(tablo: string, formul: string): Promise<number> {
  const { records } = await at(`/${encodeURIComponent(tablo)}?filterByFormula=${encodeURIComponent(formul)}&pageSize=100`)
  if (!records.length) return 0
  await at(`/${encodeURIComponent(tablo)}?${records.map(r => `records[]=${r.id}`).join('&')}`, { method: 'DELETE' })
  return records.length
}

/** DenetimKaydi bilinçli olarak LİSTEDE YOK — append-only. */
async function temizle(etiket: string) {
  let n = 0
  n += await silFormulle(TABLO.olaylar, "FIND('btc-', {Olay ID}) > 0")
  n += await silFormulle(TABLO.bildirimler, "FIND('btc-', {Olay ID}) > 0")
  n += await silFormulle(TABLO.gorevler, "FIND('btc-', {Kaynak Olay ID}) > 0")
  console.log(`  [${etiket}] ${n} ölçüm kaydı silindi`)
}

// ─── Ölçüm ───────────────────────────────────────────────────────────────────

const MAGAZA = process.env.STOREOS_MAGAZA_KODU || '0178'
const OLAY_ID = 'btc-olay-1'
const T0 = '2026-08-17T14:00:00+03:00'
const SIMDI_MS = new Date(T0).getTime()

const HAM_FILTRE = { severity: 'hepsi', durum: 'hepsi', entity: null, q: null } as const

async function main() {
  console.log(`\nStore OS — Airtable istek bütçesi · base=${BASE}\n`)
  await temizle('ön-temizlik')

  const d = new AirtableDeposu()
  const kanal = konsolKanaliniZorla()   // gerçek WhatsApp'a çıkma; ölçtüğümüz Airtable

  console.log('\n── A. EKRAN ANKETLERİ (okuma) ────────────────────────────────')
  await olc('pano · katman=canli   (2 sn arayla)', () =>
    panoTopla({ depo: d, magazaKodu: MAGAZA, katman: 'canli', simdi: SIMDI_MS }))
  await olc('pano · katman=yavas   (30 sn arayla)', () =>
    panoTopla({ depo: d, magazaKodu: MAGAZA, katman: 'yavas', simdi: SIMDI_MS }))
  await olc('pano · katman=tam     (ilk yükleme)', () =>
    panoTopla({ depo: d, magazaKodu: MAGAZA, katman: 'tam', simdi: SIMDI_MS }))
  await olc('liste · alarmlar      (5 sn arayla)', () =>
    listeTopla({ depo: d, magazaKodu: MAGAZA, gorunum: 'alarmlar', filtre: { ...HAM_FILTRE }, simdi: SIMDI_MS }))
  await olc('liste · gorevler      (10 sn arayla)', () =>
    listeTopla({ depo: d, magazaKodu: MAGAZA, gorunum: 'gorevler', filtre: { ...HAM_FILTRE }, simdi: SIMDI_MS }))
  await olc('liste · denetim       (15 sn arayla)', () =>
    listeTopla({ depo: d, magazaKodu: MAGAZA, gorunum: 'denetim', filtre: { ...HAM_FILTRE }, simdi: SIMDI_MS }))

  console.log('\n── B. YAZMA ZİNCİRİ ──────────────────────────────────────────')
  let uretilen: { gorevNo: string; bildirimId?: string } | undefined
  await olc('olay alımı → kural → görev → bildirim (1 olay)', async () => {
    const s = await olaylariAl({
      depo: d, kanal, aktor: 'olcum', aktorTipi: 'system', kaynak: 'simulator', simdi: T0,
      adapterAdi: 'generic',
      govde: {
        id: OLAY_ID, storeCode: MAGAZA, cameraId: `${MAGAZA}-kasa`,
        eventType: 'store.queue.threshold_exceeded', occurredAt: T0,
        severity: 'high', confidence: 0.91,
        metadata: { queueLength: 7, avgWaitSeconds: 252 },
      },
    })
    uretilen = s.sonuclar[0]?.bildirimler?.[0]
  })

  await olc('aynı olay TEKRAR (idempotency reddi)', () =>
    olaylariAl({
      depo: d, kanal, aktor: 'olcum', aktorTipi: 'system', kaynak: 'simulator', simdi: T0,
      adapterAdi: 'generic',
      govde: {
        id: OLAY_ID, storeCode: MAGAZA, cameraId: `${MAGAZA}-kasa`,
        eventType: 'store.queue.threshold_exceeded', occurredAt: T0,
        severity: 'high', confidence: 0.91,
        metadata: { queueLength: 7, avgWaitSeconds: 252 },
      },
    }))

  // Buton yanıtını ölçmek için üretilen bildirimin sağlayıcı mesaj id'si gerek.
  // Görev/bildirim id'lerini ALIM SONUCUNDAN alıyoruz, listeden değil: Airtable
  // list uçları yeni yazılan kaydı bir tur geç gösterebiliyor (17 Ağu'da bu
  // script'in ilk koşusunda Gorev No boş geldi).
  const hedef = uretilen ? await d.bildirimler.getir(uretilen.bildirimId ?? '') : null
  if (!uretilen || !hedef) {
    console.log('  ! bildirim üretilmedi — buton yanıtı ölçülemiyor')
  } else {
    const gorevNo = uretilen.gorevNo
    const butonId = butonIdUret({ gorevNo, aksiyon: 'kabul', bildirimId: hedef['Bildirim ID'] })
    const mesajId = hedef['Saglayici Mesaj ID'] ?? `konsol-${hedef['Bildirim ID']}`
    await olc('buton yanıtı → görev durumu + denetim', () =>
      yanitiIsle({
        depo: d, kanal, kaynak: 'simulator', simdi: T0,
        yanit: { saglayiciMesajId: mesajId, butonId, metin: 'Kabul Et', gonderenTelefon: '+905303227450', zaman: T0 },
      }))
  }

  console.log('\n── C. TOPLAM ─────────────────────────────────────────────────')

  const bul = (ad: string) => olcumler.find(o => o.ad.startsWith(ad))?.istek ?? 0
  const panoCanli = bul('pano · katman=canli')
  const panoYavas = bul('pano · katman=yavas')
  const listeAlarm = bul('liste · alarmlar')
  const listeGorev = bul('liste · gorevler')
  const zincir = bul('olay alımı')
  const yanit = bul('buton yanıtı')

  // İKİ KADEMELİ ANKET, sürekli yük (istek/sn):
  //   pano canlı 2 sn · pano yavaş 30 sn · liste alarmlar 5 sn · liste görevler 10 sn
  const panoYuk = panoCanli / 2 + panoYavas / 30
  const listeYuk = listeAlarm / 5 + listeGorev / 10

  const senaryolar: [string, number][] = [
    ['1 sekme: yalnız pano', panoYuk],
    ['1 sekme: yalnız liste (alarmlar)', listeAlarm / 5],
    ['2 sekme: pano + alarm listesi (demo düzeni)', panoYuk + listeAlarm / 5],
    ['3 sekme: pano + alarmlar + görevler (en kötü)', panoYuk + listeYuk],
  ]

  const LIMIT = 5
  console.log(`\n  Airtable tavanı: ${LIMIT} istek/sn (base başına)\n`)
  for (const [ad, yuk] of senaryolar) {
    const marj = LIMIT - yuk
    const bayrak = marj < 0 ? '✗ AŞIYOR' : marj < 1 ? '⚠ DAR' : '✓'
    console.log(`  ${bayrak}  ${ad.padEnd(46)} ${yuk.toFixed(2)} istek/sn · marj ${marj.toFixed(2)}`)
  }

  console.log(`\n  Ani yük (anketlerin üstüne binen):`)
  console.log(`    tam zincir (olay→görev→bildirim) : ${zincir} istek`)
  console.log(`    buton yanıtı                     : ${yanit} istek`)
  console.log(`    → aynı saniyede ikisi birden     : ${zincir + yanit} istek`)
  console.log(`    Not: airtable.ts kendi içinde 4 istek/sn'de kuyruğa alır,`)
  console.log(`         yani ani yük tavanı aşmaz — SÜREYE yayılır (${((zincir + yanit) / 4).toFixed(1)} sn).`)

  await temizle('son-temizlik')
  console.log('')
}

main().catch(e => { console.error(e); process.exit(1) })
