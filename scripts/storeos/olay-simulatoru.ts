// ════════════════════════════════════════════════════════════════════════════
//  Store OS — OLAY SİMÜLATÖRÜ
//
//  Gerçek imzalı olay üretir. İki mod:
//
//    YEREL (varsayılan)  — süreç içinde alım hattını çağırır. Sunucu, Airtable,
//                          WhatsApp, domain GEREKMEZ. Zinciri tek komutla
//                          uçtan uca gösterir.
//    HTTP (--url=…)      — gerçek HTTP POST + X-StoreOS-Signature. Sunucu ayakta
//                          olmalı. Partnerin göreceği yolun aynısı.
//
//  Kullanım:
//    npx tsx scripts/storeos/olay-simulatoru.ts kuyruk-artisi
//    npx tsx scripts/storeos/olay-simulatoru.ts kamera-offline --tekrar
//    npx tsx scripts/storeos/olay-simulatoru.ts kuyruk-artisi --vendor
//    npx tsx scripts/storeos/olay-simulatoru.ts hepsi
//    npx tsx scripts/storeos/olay-simulatoru.ts kuyruk-artisi --url=http://localhost:3000
//
//  Bayraklar:
//    --tekrar        aynı olayı İKİ KEZ gönderir (idempotency kanıtı)
//    --vendor        ornek-vendor ham biçiminde gönderir (adapter kanıtı)
//    --bozuk         kasten geçersiz olay gönderir (4xx + sebep kanıtı)
//    --url=<taban>   HTTP moduna geçer
//    --sir=<deger>   imza sırrı (varsayılan: STOREOS_INGEST_SECRET ya da demo sırrı)
//    --sessiz        yalnız özet
// ════════════════════════════════════════════════════════════════════════════

import { bellekDeposunuZorla } from '../../src/lib/storeos/depo'
import { imzaUret } from '../../src/lib/storeos/imza'
import { olaylariAl } from '../../src/lib/storeos/olay-alim'
import { epochtanIso } from '../../src/lib/storeos/adapters/ornek-vendor'

// ─── Argümanlar ──────────────────────────────────────────────────────────────

const argv = process.argv.slice(2)
const bayrak = (ad: string) => argv.includes(`--${ad}`)
const deger = (ad: string): string | undefined => {
  const p = argv.find(a => a.startsWith(`--${ad}=`))
  return p ? p.slice(ad.length + 3) : undefined
}

const SENARYOLAR = ['kuyruk-artisi', 'raf-stok-dustu', 'kamera-offline', 'isg-islak-zemin'] as const
type Senaryo = (typeof SENARYOLAR)[number]

const istenen = argv.find(a => !a.startsWith('--')) ?? 'kuyruk-artisi'
const SIR = deger('sir') ?? process.env.STOREOS_INGEST_SECRET ?? 'demo-sir-degistir'
const TABAN_URL = deger('url')
const SESSIZ = bayrak('sessiz')

if (istenen !== 'hepsi' && !SENARYOLAR.includes(istenen as Senaryo)) {
  console.error(`Bilinmeyen senaryo '${istenen}'. Secenekler: ${SENARYOLAR.join(' · ')} · hepsi`)
  process.exit(2)
}

// ─── Deterministik id ────────────────────────────────────────────────────────
// Math.random YOK. Aynı senaryo + aynı tur = aynı id → idempotency test edilebilir.

const KOSU_DAMGASI = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
let sayac = 0
function olayId(senaryo: string): string {
  sayac += 1
  return `evt_${senaryo}_${KOSU_DAMGASI}_${String(sayac).padStart(3, '0')}`
}

// ─── Senaryolar ──────────────────────────────────────────────────────────────

const MAGAZA = '0178'
/** Kanonik olaylar da vendor hattıyla aynı saat diliminde (+03:00) üretilir. */
const TR_OFFSET_DK = 180
const simdi = () => epochtanIso(Date.now(), TR_OFFSET_DK)

interface SenaryoTanimi {
  ad: Senaryo
  aciklama: string
  faz: 1 | 2
  kanonik(id: string): Record<string, unknown>
  vendor(id: string): Record<string, unknown>
}

const TANIMLAR: Record<Senaryo, SenaryoTanimi> = {
  'kuyruk-artisi': {
    ad: 'kuyruk-artisi',
    aciklama: 'Kasa kuyrugu esigi asti (7 kisi, 252 sn bekleme)',
    faz: 1,
    kanonik: id => ({
      id, storeCode: MAGAZA, cameraId: `${MAGAZA}-kasa`,
      eventType: 'store.queue.threshold_exceeded',
      occurredAt: simdi(), severity: 'high', confidence: 0.91,
      metadata: { registerId: 'kasa-2', queueLength: 7, avgWaitSeconds: 252, maxWaitSeconds: 180 },
    }),
    vendor: id => ({
      event_uuid: id, site: { code: MAGAZA, device: `${MAGAZA}-kasa` },
      kind: 'QUEUE_THRESHOLD', ts_ms: Date.now(), tz_offset_min: 180,
      level: 4, score: 91,
      payload: { register: 'kasa-2', people: 7, wait_sec: 252, max_wait_sec: 180 },
    }),
  },
  'raf-stok-dustu': {
    ad: 'raf-stok-dustu',
    aciklama: 'Kozmetik reyonunda raf dolulugu %22 (FAZ 2 — kural yok)',
    faz: 2,
    kanonik: id => ({
      id, storeCode: MAGAZA, cameraId: `${MAGAZA}-kozmetik`,
      eventType: 'store.shelf.stock_low',
      occurredAt: simdi(), severity: 'medium', confidence: 0.78,
      // Otoriter tabloda oran DEĞİL yüzde: fillRatePercent (0-100).
      metadata: { zoneId: 'kozmetik', shelfId: 'KZ-04', fillRatePercent: 22, missingFacings: 9 },
    }),
    vendor: id => ({
      event_uuid: id, site: { code: MAGAZA, device: `${MAGAZA}-kozmetik` },
      kind: 'SHELF_LOW', ts_ms: Date.now(), tz_offset_min: 180,
      level: 3, score: 78,
      payload: { zone: 'kozmetik', shelf: 'KZ-04', fill_rate_pct: 22, missing_facings: 9 },
    }),
  },
  'kamera-offline': {
    ad: 'kamera-offline',
    aciklama: 'Depo kamerasi baglantisi koptu',
    faz: 1,
    kanonik: id => ({
      id, storeCode: MAGAZA, cameraId: `${MAGAZA}-depo`,
      eventType: 'store.camera.offline',
      occurredAt: simdi(), severity: 'high', confidence: 1,
      metadata: { reason: 'rtsp_timeout', lastSeenAt: simdi() },
    }),
    vendor: id => ({
      event_uuid: id, site: { code: MAGAZA, device: `${MAGAZA}-depo` },
      kind: 'CAMERA_DOWN', ts_ms: Date.now(), tz_offset_min: 180,
      level: 4, score: 100,
      payload: { reason: 'rtsp_timeout', last_seen: simdi() },
    }),
  },
  'isg-islak-zemin': {
    ad: 'isg-islak-zemin',
    aciklama: 'Giris bolgesinde islak zemin (FAZ 2 — kural yok)',
    faz: 2,
    kanonik: id => ({
      id, storeCode: MAGAZA, cameraId: `${MAGAZA}-giris`,
      eventType: 'store.safety.event_detected',
      occurredAt: simdi(), severity: 'critical', confidence: 0.84,
      metadata: { zoneId: 'giris', issueType: 'wet_floor' },
    }),
    vendor: id => ({
      event_uuid: id, site: { code: MAGAZA, device: `${MAGAZA}-giris` },
      kind: 'SAFETY_ALERT', ts_ms: Date.now(), tz_offset_min: 180,
      level: 5, score: 84,
      payload: { zone: 'giris', issue_type: 'wet_floor' },
    }),
  },
}

/** Kasten bozuk olay — 400 + sebep kanıtı. */
function bozukOlay(): Record<string, unknown> {
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

// ─── Gönderim ────────────────────────────────────────────────────────────────

const d = bellekDeposunuZorla()

async function gonder(
  govde: unknown,
  adapterAdi: string,
  etiket: string,
): Promise<void> {
  const metin = JSON.stringify(govde)
  const t = Math.floor(Date.now() / 1000)
  const imza = imzaUret(metin, SIR, t)

  if (TABAN_URL) {
    const url = `${TABAN_URL.replace(/\/$/, '')}/api/storeos/olay`
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-StoreOS-Signature': imza,
        'X-StoreOS-Adapter': adapterAdi,
      },
      body: metin,
    })
    const cevap = await r.text()
    console.log(`  ${etiket} → HTTP ${r.status}`)
    if (!SESSIZ) console.log(`    ${cevap.slice(0, 600)}`)
    return
  }

  // YEREL mod: imza yine üretildi (imza kodu koşuyor) ve doğrulanır.
  const { imzaDogrula } = await import('../../src/lib/storeos/imza')
  const kontrol = imzaDogrula({ hamGovde: metin, baslik: imza, sir: SIR, simdiSn: t })
  if (!kontrol.gecerli) {
    console.error(`  ${etiket} → IMZA URETIM/DOGRULAMA UYUSMAZLIGI: ${kontrol.sebep}`)
    process.exitCode = 1
    return
  }

  const sonuc = await olaylariAl({
    depo: d, govde, adapterAdi,
    aktor: 'partner:simulator', aktorTipi: 'partner', kaynak: 'simulator',
  })

  console.log(`  ${etiket} → kabul:${sonuc.kabul} yinelenen:${sonuc.yinelenen} reddedilen:${sonuc.reddedilen} (adapter:${sonuc.adapter}, imza:${kontrol.bicim})`)
  if (SESSIZ) return
  for (const s of sonuc.sonuclar) {
    if (s.durum === 'kabul') {
      console.log(`      ✓ ${s.olayId}`)
      console.log(`        kural: ${s.kuralOzeti}`)
      console.log(`        gorev: ${s.uretilenGorevler?.length ? s.uretilenGorevler.join(', ') : '(uretilmedi)'}`)
      s.uyarilar?.forEach(u => console.log(`        ⚠ ${u}`))
    } else if (s.durum === 'yinelenen') {
      console.log(`      ↺ ${s.olayId} — YINELENEN, yeni kayit/gorev YOK`)
    } else {
      console.log(`      ✗ REDDEDILDI:`)
      s.hatalar?.forEach(h => console.log(`          ${h.alan}: ${h.sebep}`))
    }
  }
}

// ─── Ana ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══ Store OS olay simulatoru ══════════════════════════════════')
  console.log(`║  mod    : ${TABAN_URL ? `HTTP → ${TABAN_URL}` : 'YEREL (surec ici, dis bagimlilik yok)'}`)
  console.log(`║  depo   : bellek`)
  console.log(`║  imza   : t=<unix>,v1=<hmac-sha256>`)
  console.log('╚══════════════════════════════════════════════════════════════\n')

  if (bayrak('bozuk')) {
    console.log('▸ BOZUK OLAY (4xx + sebep kaniti)')
    await gonder(bozukOlay(), 'generic', 'bozuk')
    console.log('')
  }

  const secilenler: Senaryo[] = istenen === 'hepsi' ? [...SENARYOLAR] : [istenen as Senaryo]
  const vendorMu = bayrak('vendor')

  for (const ad of secilenler) {
    const t = TANIMLAR[ad]
    console.log(`▸ ${t.ad}  —  ${t.aciklama}`)
    if (t.faz === 2) {
      console.log('    (Faz 2 tipi: sozlesmede TANIMLI, kural YAZILMADI. Olay kabul edilir, gorev uretmez.)')
    }
    const id = olayId(ad)
    const govde = vendorMu ? t.vendor(id) : t.kanonik(id)
    const adapterAdi = vendorMu ? 'ornek-vendor' : 'generic'

    await gonder(govde, adapterAdi, vendorMu ? 'vendor-bicimi' : 'kanonik')

    if (bayrak('tekrar')) {
      await gonder(govde, adapterAdi, 'AYNI OLAY TEKRAR')
    }
    console.log('')
  }

  if (!TABAN_URL) {
    const gorevler = await d.gorevler.listele({})
    const olaylar = await d.olaylar.listele({})
    const denetim = await d.denetim.listele({})
    console.log('── Bellek deposu ozeti ───────────────────────────────────────')
    console.log(`  olay   : ${olaylar.length}`)
    console.log(`  gorev  : ${gorevler.length}`)
    console.log(`  denetim: ${denetim.length} satir`)
    gorevler.forEach(g => console.log(`    · ${g['Gorev No']}  [${g['Durum']}]  ${g['Baslik']}`))
    console.log('')
  }
}

main().catch(e => {
  console.error('\n✗ Simulator hatasi:', e)
  process.exit(1)
})
