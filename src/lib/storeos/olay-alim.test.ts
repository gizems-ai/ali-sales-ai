// ════════════════════════════════════════════════════════════════════════════
//  Store OS — idempotency + alım zinciri kontrolü.
//  `npx -y tsx src/lib/storeos/olay-alim.test.ts`
//
//  Kabul kriteri 4: "aynı olay iki kez → tek kayıt, tek bildirim".
//  Burada zincirin tamamı koşar: doğrulama → idempotency → kural → görev → denetim.
// ════════════════════════════════════════════════════════════════════════════

import { bellekDeposunuZorla } from './depo'
import { DENETIM_AKSIYONLARI } from './denetim'
import { olaylariAl } from './olay-alim'

let fail = 0
function ok(ad: string, cond: boolean, extra = '') {
  if (!cond) fail++
  console.log(`  ${cond ? '✓' : '✗ FAIL'}  ${ad}${cond ? '' : `  ${extra}`}`)
}

const ORTAK = {
  aktor: 'test', aktorTipi: 'partner' as const, kaynak: 'simulator' as const,
  simdi: '2026-08-14T14:35:30+03:00',
}

function kuyrukOlayi(id: string, queueLength = 7): Record<string, unknown> {
  return {
    id, storeCode: '0178', cameraId: 'cam-kasa-01',
    eventType: 'store.queue.threshold_exceeded',
    occurredAt: '2026-08-14T14:35:21+03:00',
    severity: 'high', confidence: 0.91,
    metadata: { registerId: 'kasa-2', queueLength, avgWaitSeconds: 252 },
  }
}

async function main() {
  console.log('\n[1] TEK OLAY — zincir uçtan uca')
  const d = bellekDeposunuZorla()
  await d.sifirla()

  const ilk = await olaylariAl({ depo: d, govde: kuyrukOlayi('evt_a'), ...ORTAK })
  ok('kabul edildi', ilk.kabul === 1 && ilk.reddedilen === 0)
  ok('kural eşleşti ve görev üretildi',
     (ilk.sonuclar[0]?.uretilenGorevler ?? []).length === 1, ilk.sonuclar[0]?.kuralOzeti)
  ok('görev depoya yazıldı', (await d.gorevler.listele()).length === 1)
  ok('olay kaydı işlendi olarak işaretlendi',
     (await d.olaylar.getir('evt_a'))?.['Islendi'] === true)
  ok("olay kaydı Veri Tipi='demo' (dürüstlük kuralı)",
     (await d.olaylar.getir('evt_a'))?.['Veri Tipi'] === 'demo')
  const izIlk = await d.denetim.listele()
  ok('zincirin her adımı denetimde: kabul + kural + görev',
     [DENETIM_AKSIYONLARI.olayKabul, DENETIM_AKSIYONLARI.kuralEslesti, DENETIM_AKSIYONLARI.gorevOlusturuldu]
       .every(a => izIlk.some(s => s['Aksiyon'] === a)),
     JSON.stringify(izIlk.map(s => s['Aksiyon'])))

  console.log('\n[2] AYNI OLAY İKİNCİ KEZ — at-least-once teslimat')
  const gorevSayisiOnce = (await d.gorevler.listele()).length
  const ikinci = await olaylariAl({ depo: d, govde: kuyrukOlayi('evt_a'), ...ORTAK })
  ok('yinelenen olarak işaretlendi', ikinci.yinelenen === 1 && ikinci.kabul === 0)
  ok('İKİNCİ OLAY KAYDI OLUŞMADI', (await d.olaylar.listele()).length === 1)
  ok('İKİNCİ GÖREV OLUŞMADI', (await d.gorevler.listele()).length === gorevSayisiOnce)
  ok('yinelenen de denetime düştü (sessizce yutulmadı)',
     (await d.denetim.listele()).some(s => s['Aksiyon'] === DENETIM_AKSIYONLARI.olayYinelenen))
  ok('yinelenen İSTİSNA FIRLATMAZ — partner 2xx alır', ikinci.reddedilen === 0)

  console.log('\n[3] GÖVDE FARKLI OLSA BİLE AYNI ID → YİNELENEN')
  const farkli = await olaylariAl({ depo: d, govde: kuyrukOlayi('evt_a', 99), ...ORTAK })
  ok('id idempotency anahtarıdır, gövde değil', farkli.yinelenen === 1)
  ok('ilk kaydın metadata\'sı DEĞİŞMEDİ (son yazan kazanmaz)',
     (await d.olaylar.getir('evt_a'))?.['Metadata JSON']?.includes('"queueLength":7') === true)

  console.log('\n[4] DİZİ GÖNDERİMİ — kısmi başarı')
  await d.sifirla()
  const toplu = await olaylariAl({
    depo: d,
    govde: [kuyrukOlayi('evt_b'), { id: 'evt_bozuk', storeCode: '0178' }, kuyrukOlayi('evt_b')],
    ...ORTAK,
  })
  ok('geçerli olan kabul edildi', toplu.kabul === 1)
  ok('bozuk olan reddedildi', toplu.reddedilen === 1)
  ok('AYNI PAKET İÇİNDEKİ tekrar da yakalandı', toplu.yinelenen === 1)
  ok('her ret alan-bazlı sebep taşır (partner tekrar denemesin)',
     (toplu.sonuclar[1]?.hatalar ?? []).length > 0,
     JSON.stringify(toplu.sonuclar[1]))
  ok('kısmi başarı diğer olayları düşürmez', (await d.gorevler.listele()).length === 1)

  console.log('\n[5] FAZ 2 TİPİ — kabul edilir, görev üretmez')
  await d.sifirla()
  const faz2 = await olaylariAl({
    depo: d,
    govde: {
      id: 'evt_c', storeCode: '0178', eventType: 'store.shelf.stock_low',
      occurredAt: '2026-08-14T14:35:21+03:00', severity: 'medium', confidence: 0.78,
      metadata: { shelfId: 'KZ-04', fillRate: 0.22 },
    },
    ...ORTAK,
  })
  ok('olay kabul edilir', faz2.kabul === 1)
  ok('görev ÜRETİLMEZ (kural yazılmadı)', (faz2.sonuclar[0]?.uretilenGorevler ?? []).length === 0)
  ok('eşleşmeme de denetime yazılır',
     (await d.denetim.listele()).some(s => s['Aksiyon'] === DENETIM_AKSIYONLARI.kuralEslesmedi))

  if (fail) { console.log(`\n✗ ${fail} kontrol BAŞARISIZ\n`); process.exit(1) }
  console.log('\n✓ tüm idempotency / alım zinciri kontrolleri geçti\n')
}

main().catch(e => { console.error(e); process.exit(1) })
