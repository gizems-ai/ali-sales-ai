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
// Senaryolar TEK kaynaktan gelir; demo kontrol paneli de aynı dosyayı okur.
import {
  SENARYOLAR, TANIMLAR, bozukOlay, olayId,
} from '../../src/lib/storeos/senaryolar'
import type { Senaryo } from '../../src/lib/storeos/senaryolar'

// ─── Argümanlar ──────────────────────────────────────────────────────────────

const argv = process.argv.slice(2)
const bayrak = (ad: string) => argv.includes(`--${ad}`)
const deger = (ad: string): string | undefined => {
  const p = argv.find(a => a.startsWith(`--${ad}=`))
  return p ? p.slice(ad.length + 3) : undefined
}

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
const yeniOlayId = (senaryo: string) => olayId(senaryo, KOSU_DAMGASI, ++sayac)

// ─── Senaryolar ──────────────────────────────────────────────────────────────
// Tanımlar `src/lib/storeos/senaryolar.ts`'te. Buradan silindiler (Gün 8):
// demo kontrol paneli de aynı senaryoları tetikliyor ve iki kopya, jüri önünde
// terminalde denenenden BAŞKA bir olay göndermek demekti.

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
    const id = yeniOlayId(ad)
    const govde = vendorMu ? t.vendor(id, Date.now()) : t.kanonik(id, Date.now())
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
