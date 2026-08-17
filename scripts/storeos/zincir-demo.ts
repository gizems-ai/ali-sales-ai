// ════════════════════════════════════════════════════════════════════════════
//  Store OS — ZİNCİR DEMOSU (uçtan uca, tek komut)
//
//     npx -y tsx scripts/storeos/zincir-demo.ts
//     npx -y tsx scripts/storeos/zincir-demo.ts --sessiz     (mesaj gövdesi yok)
//     npx -y tsx scripts/storeos/zincir-demo.ts --gercek-wa  (GERÇEK telefona)
//
//  Koştuğu hat:
//     olay POST → kural eşleşir → görev doğar → bildirim üretilir → kanala
//     gider → buton yanıtı gelir → görev durumu değişir → denetim kaydına
//     düşer → panelde görünür
//
//  HTTP KULLANMAZ. `olaylariAl` ve `yanitiIsle` doğrudan çağrılır — sunucu
//  ayakta olmadan, Airtable olmadan, telefon olmadan koşar. Kanal 'konsol'.
//
//  `--gercek-wa` verilirse kanal env'den seçilir (STOREOS_KANAL=whatsapp ⇒
//  n8n → 360Dialog → telefon). GERÇEK MESAJ GİDER. Demo telefon kilidi açık
//  olduğu için hedef STOREOS_DEMO_TELEFON'dur; buton yanıtı hâlâ simüle
//  edilir (360Dialog gelen webhook'u echo bot'a bağlı — bkz. n8n-storeos.md).
//
//  ÇIKIŞ KODU: her halka yeşilse 0, bir halka bile kırmızıysa 1.
//  Bu yüzden hem demo hem sağlık kontrolü — kontroller.mjs bunu çalıştırır.
// ════════════════════════════════════════════════════════════════════════════

import { bellekDeposunuZorla } from '../../src/lib/storeos/depo'
import type { Depo } from '../../src/lib/storeos/depo'
import { eskalasyonKontrol } from '../../src/lib/storeos/eskalasyon'
import { yanitiIsle } from '../../src/lib/storeos/inbound'
import { kanal as kanaliSec, konsolKanaliniZorla } from '../../src/lib/storeos/kanal'
import { sahteButonYaniti } from '../../src/lib/storeos/kanal/sahte-inbound'
import { listeTopla } from '../../src/lib/storeos/liste/toplayici'
import { BOS_FILTRE } from '../../src/lib/storeos/liste/tipler'
import { olaylariAl } from '../../src/lib/storeos/olay-alim'

const SESSIZ = process.argv.includes('--sessiz')
const GERCEK_WA = process.argv.includes('--gercek-wa')
const MAGAZA = '0178'

// Sabit zaman: çıktı iki koşuda birebir aynı olsun (Math.random yok, Date.now yok).
const T0 = '2026-08-14T14:00:00+03:00'
const T1 = '2026-08-14T14:02:00+03:00'   // buton yanıtı: 2 dk sonra
const T2 = '2026-08-14T14:26:00+03:00'   // eskalasyon kontrolü: SLA(10dk)+16dk

let kirmizi = 0
const adimlar: { no: number; ad: string; yesil: boolean; not: string }[] = []

function halka(no: number, ad: string, yesil: boolean, not: string): void {
  adimlar.push({ no, ad, yesil, not })
  if (!yesil) kirmizi++
  console.log(`  ${yesil ? '✅' : '❌'} ${no}. ${ad} — ${not}`)
}

function baslik(s: string): void {
  console.log(`\n\x1b[1m${s}\x1b[0m`)
}

async function main(): Promise<void> {
  const depo: Depo = bellekDeposunuZorla()
  await depo.sifirla()
  const kanal = GERCEK_WA ? kanaliSec() : konsolKanaliniZorla()

  console.log('\n══ STORE OS — ZİNCİR DEMOSU ═══════════════════════════════════')
  console.log(`   Depo: ${depo.ad}   ·   Kanal: ${kanal.ad}   ·   Mağaza: ${MAGAZA}`)
  console.log(`   Zaman sabit: ${T0} (deterministik çıktı için)`)

  // ── 1-3. Olay → kural → görev ────────────────────────────────────────────
  baslik('① OLAY → KURAL → GÖREV')
  const olay = {
    id: 'evt-zincir-001',
    storeCode: MAGAZA,
    cameraId: `${MAGAZA}-kasa`,
    eventType: 'store.queue.threshold_exceeded',
    occurredAt: T0,
    severity: 'high',
    confidence: 0.91,
    metadata: { registerId: 'kasa-2', queueLength: 7, avgWaitSeconds: 252, maxWaitSeconds: 180 },
  }

  const alim = await olaylariAl({
    depo, kanal, govde: olay, adapterAdi: 'generic',
    aktor: 'zincir-demo', aktorTipi: 'partner', kaynak: 'simulator', simdi: T0,
  })

  halka(1, 'olay kabul edildi', alim.kabul === 1,
    `kabul=${alim.kabul} yinelenen=${alim.yinelenen} reddedilen=${alim.reddedilen}`)

  const s0 = alim.sonuclar[0]
  halka(2, 'kural eşleşti', !!s0?.kuralOzeti && (s0.uretilenGorevler?.length ?? 0) > 0,
    s0?.kuralOzeti ?? '(özet yok)')

  const gorevNo = s0?.uretilenGorevler?.[0] ?? ''
  const gorev0 = gorevNo ? await depo.gorevler.getir(gorevNo) : null
  halka(3, 'görev doğdu', !!gorev0,
    gorev0 ? `${gorev0['Gorev No']} · ${gorev0['Durum']} · ${gorev0['Baslik']}` : 'görev yok')

  // ── 4-5. Bildirim → kanal ────────────────────────────────────────────────
  baslik('② BİLDİRİM → KANAL')
  const b0 = s0?.bildirimler?.[0]
  const bildirim = b0?.bildirimId ? await depo.bildirimler.getir(b0.bildirimId) : null
  // Demo telefon kilidi açıkken mesaj alıcının kendi numarasına değil
  // STOREOS_DEMO_TELEFON'a gider; simülasyondaki yanıt da oradan gelmeli.
  const etkinTelefon = bildirim
    ? (bildirim['Gonderilen Telefon'] ?? bildirim['Alici Telefon'])
    : ''
  halka(4, 'bildirim üretildi', !!bildirim,
    bildirim
      ? `${bildirim['Bildirim ID']} → ${etkinTelefon}` +
        (bildirim['Gonderilen Telefon'] ? ` (kilit: ${bildirim['Alici Telefon']} ezildi)` : '')
      : (b0?.not ?? 'bildirim yok'))
  halka(5, 'kanala gitti', bildirim?.['Durum'] === 'gonderildi',
    bildirim ? `durum=${bildirim['Durum']} sağlayıcı id=${bildirim['Saglayici Mesaj ID'] ?? '—'}` : '—')

  if (!SESSIZ && bildirim) {
    console.log('\n  ┌─ telefona düşen mesaj ────────────────────────────────')
    for (const satir of bildirim['Govde'].split('\n')) console.log(`  │ ${satir}`)
    console.log('  │ [Kabul Et] [Başkasına Ata] [5 Dakika Ertele]')
    console.log('  └───────────────────────────────────────────────────────')
  }

  // ── 6-7. Buton → görev durumu ────────────────────────────────────────────
  baslik('③ BUTON → GELEN → DURUM DEĞİŞİMİ')
  let yanitOk = false, durumOk = false
  if (bildirim && gorev0) {
    const yanit = sahteButonYaniti({
      gorevNo: gorev0['Gorev No'],
      aksiyon: 'kabul',
      bildirimId: bildirim['Bildirim ID'],
      saglayiciMesajId: bildirim['Saglayici Mesaj ID'] ?? '',
      gonderenTelefon: etkinTelefon,
      zaman: T1,
    })
    const sonuc = await yanitiIsle({ depo, kanal, yanit, kaynak: 'simulator', simdi: T1 })
    yanitOk = sonuc.durum === 'uygulandi'
    halka(6, 'buton yanıtı çözüldü', yanitOk,
      sonuc.durum === 'uygulandi'
        ? `aksiyon=${sonuc.aksiyon} → görev ${sonuc.gorevNo}`
        : `sonuç=${sonuc.durum}`)

    const gorev1 = await depo.gorevler.getir(gorev0['Gorev No'])
    durumOk = gorev1?.['Durum'] === 'basladi'
    halka(7, 'görev durumu değişti', durumOk,
      `${gorev0['Durum']} → ${gorev1?.['Durum'] ?? '?'}`)

    // Aynı yanıt ikinci kez: görev İKİNCİ KEZ değişmemeli.
    const tekrar = await yanitiIsle({ depo, kanal, yanit, kaynak: 'simulator', simdi: T1 })
    halka(8, 'aynı yanıt tekrarı yutuldu', tekrar.durum === 'yinelenen', `sonuç=${tekrar.durum}`)
  } else {
    halka(6, 'buton yanıtı çözüldü', false, 'bildirim yok, denenmedi')
    halka(7, 'görev durumu değişti', false, 'bildirim yok, denenmedi')
    halka(8, 'aynı yanıt tekrarı yutuldu', false, 'bildirim yok, denenmedi')
  }

  // ── 9. Denetim ───────────────────────────────────────────────────────────
  baslik('④ DENETİM KAYDI')
  const denetimSatirlari = await depo.denetim.listele({ limit: 200 })
  const beklenenAksiyonlar = [
    'olay.kabul', 'kural.eslesti', 'gorev.olusturuldu', 'gorev.durum',
    'bildirim.kuyruga_alindi', 'bildirim.gonderildi', 'bildirim.yanit',
  ]
  const gorulen = new Set(denetimSatirlari.map(s => s['Aksiyon']))
  const eksik = beklenenAksiyonlar.filter(a => !gorulen.has(a))
  halka(9, 'zincirin her adımı denetimde', eksik.length === 0,
    eksik.length ? `eksik: ${eksik.join(', ')}` : `${denetimSatirlari.length} kayıt, ${gorulen.size} farklı aksiyon`)

  if (!SESSIZ) {
    console.log('')
    for (const s of denetimSatirlari.slice(0, 14)) {
      console.log(`  ${s['Zaman'].slice(11, 19)}  ${s['Aksiyon'].padEnd(26)} ${s['Entity Tipi']}:${s['Entity ID']}`)
    }
    if (denetimSatirlari.length > 14) console.log(`  … +${denetimSatirlari.length - 14} kayıt daha`)
  }

  // ── 10. Panelde yansıma ──────────────────────────────────────────────────
  baslik('⑤ PANELDE YANSIMA')
  const liste = await listeTopla({
    // listeTopla epoch ms bekler (gecikme hesabı için); zincirdeki diğer
    // çağrılar ISO metin alıyor — tek yer olduğu için burada çeviriyoruz.
    depo, magazaKodu: MAGAZA, gorunum: 'gorevler', filtre: BOS_FILTRE, simdi: Date.parse(T1),
  })
  const panelde = liste.gorunum === 'gorevler'
    && liste.satirlar.some(r => r.gorevNo === gorevNo && r.durum === 'basladi')
  halka(10, 'panelde görünüyor', panelde,
    liste.gorunum === 'gorevler'
      ? `${liste.satirlar.length} görev listelendi, ${gorevNo} durumu ekranda`
      : 'görünüm etiketi yanlış')

  // ── 11. Eskalasyon ───────────────────────────────────────────────────────
  baslik('⑥ ESKALASYON (bonus halka)')
  // Kabul edilmiş görev de gecikebilir; 14:26'da SLA 16 dk aşılmış olur.
  const rapor = await eskalasyonKontrol({ depo, kanal, magazaKodu: MAGAZA, simdi: T2 })
  const kademeler = rapor.tetiklenen.filter(t => t.sonuc === 'gonderildi').map(t => t.kademe)
  halka(11, 'gecikmede kademeler tetiklendi', kademeler.length >= 2,
    kademeler.length ? kademeler.join(' → ') : 'hiç kademe tetiklenmedi')

  const rapor2 = await eskalasyonKontrol({ depo, kanal, magazaKodu: MAGAZA, simdi: T2 })
  const yeni2 = rapor2.tetiklenen.filter(t => t.sonuc === 'gonderildi').length
  halka(12, 'ikinci kontrol tekrar mesaj atmadı', yeni2 === 0,
    `ikinci koşuda yeni gönderim=${yeni2}, atlanan=${rapor2.tetiklenen.filter(t => t.sonuc === 'zaten_var').length}`)

  // ── Özet ─────────────────────────────────────────────────────────────────
  const yesil = adimlar.length - kirmizi
  console.log('\n═══════════════════════════════════════════════════════════════')
  if (kirmizi === 0) {
    console.log(`\x1b[32m  ZİNCİR UÇTAN UCA YEŞİL — ${yesil}/${adimlar.length} halka\x1b[0m`)
  } else {
    console.log(`\x1b[31m  ZİNCİR KIRIK — ${yesil}/${adimlar.length} halka yeşil, ${kirmizi} kırmızı\x1b[0m`)
    for (const a of adimlar.filter(x => !x.yesil)) console.log(`   ✗ ${a.no}. ${a.ad}: ${a.not}`)
  }
  console.log('═══════════════════════════════════════════════════════════════\n')
  process.exit(kirmizi === 0 ? 0 : 1)
}

main().catch(e => {
  console.error('\n\x1b[31mZİNCİR ÇÖKTÜ\x1b[0m', e)
  process.exit(1)
})
