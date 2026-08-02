// ════════════════════════════════════════════════════════════════════════════
//  Store OS — pano toplayıcısı kontrolü.
//  `npx -y tsx src/lib/storeos/dashboard/pano.test.ts`
//
//  Neyi koruyor:
//   · Katman sözleşmesi — `canli` istekte yavaş alanlar `null` (taşınmadı),
//     `[]` DEĞİL (veri yok). İstemcinin birleştirme mantığı buna yaslanıyor.
//   · DEPO-BAĞIMSIZLIK — sıralama toplayıcıda yapılıyor; depo karışık sıra
//     döndürse de pano doğru sıralıyor. Airtable sıra garantisi vermiyor.
//   · DÜRÜSTLÜK KURALI (madde 11) — her taşıyıcı `veriTipi` taşıyor ve
//     bilinmeyen köken 'gercek' diye etiketlenmiyor.
//   · Gecikme SUNUCU saatiyle hesaplanıyor (istemci saati değil).
// ════════════════════════════════════════════════════════════════════════════

import { bellekDeposunuZorla } from '../depo'
import { olaylariAl } from '../olay-alim'
import { panoTopla } from './toplayici'

let fail = 0
function ok(ad: string, cond: boolean, extra = '') {
  if (!cond) fail++
  console.log(`  ${cond ? '✓' : '✗ FAIL'}  ${ad}${cond ? '' : `  ${extra}`}`)
}

const MAGAZA = '0178'
const SIMDI_ISO = '2026-08-14T14:35:30+03:00'
const SIMDI = Date.parse(SIMDI_ISO)

const ORTAK = {
  aktor: 'test', aktorTipi: 'partner' as const, kaynak: 'simulator' as const,
  simdi: SIMDI_ISO,
}

function kuyrukOlayi(id: string, occurredAt: string): Record<string, unknown> {
  return {
    id, storeCode: MAGAZA, cameraId: `${MAGAZA}-kasa`,
    eventType: 'store.queue.threshold_exceeded',
    occurredAt,
    severity: 'high', confidence: 0.91,
    metadata: { registerId: 'kasa-2', queueLength: 9, avgWaitSeconds: 252, maxWaitSeconds: 300 },
  }
}

async function main() {
  const d = bellekDeposunuZorla()
  await d.sifirla()

  console.log('\n[1] BOŞ PANO — "veri yok" bir hata değildir')
  const bos = await panoTopla({ depo: d, magazaKodu: MAGAZA, katman: 'tam', simdi: SIMDI })
  ok('alarm listesi boş dizi (null değil)', Array.isArray(bos.alarmlar) && bos.alarmlar.length === 0)
  ok('görev listesi boş dizi', Array.isArray(bos.gorevler) && bos.gorevler.length === 0)
  ok('KPI kartları seed metriklerinden geldi', (bos.kpiler ?? []).length > 0)
  ok('mağaza özeti dolu', bos.magaza?.kod === MAGAZA)
  ok('olay/görev yokken bile bos=false (metrikler var)', bos.bos === false)
  ok("kökeni bilinmeyen veri 'gercek' diye etiketlenmiyor", bos.veriTipi === 'demo')

  console.log('\n[2] OLAY GİRDİKTEN SONRA — zincir panoya yansıyor')
  // Bilerek TERS sırada gönderiliyor: eski olay ÖNCE değil SONRA yazılıyor.
  // Depo ekleme sırasını korusa bile toplayıcı 'Olustu'ya göre sıralamalı.
  await olaylariAl({ depo: d, govde: kuyrukOlayi('evt_yeni', '2026-08-14T14:30:00+03:00'), ...ORTAK })
  await olaylariAl({ depo: d, govde: kuyrukOlayi('evt_eski', '2026-08-14T09:00:00+03:00'), ...ORTAK })

  const p = await panoTopla({ depo: d, magazaKodu: MAGAZA, katman: 'tam', simdi: SIMDI })
  ok('iki alarm listelendi', p.alarmlar?.length === 2, String(p.alarmlar?.length))
  ok('EN YENİ ÜSTTE (depo sırası değil, Olustu sırası)',
     p.alarmlar?.[0]?.olayId === 'evt_yeni', p.alarmlar?.map(a => a.olayId).join(','))
  ok('olay tipi Türkçe başlığa çevrildi',
     p.alarmlar?.[0]?.baslik === 'Kasa kuyruğu eşiği aşıldı', p.alarmlar?.[0]?.baslik)
  ok('kamera ID değil kamera ADI gösteriliyor',
     p.alarmlar?.[0]?.kameraAdi === 'Kasa Alani', String(p.alarmlar?.[0]?.kameraAdi))
  ok('kural eşleştiği için "görev açıldı" işareti var', p.alarmlar?.[0]?.gorevUretti === true)
  ok('görev üretildi ve panoda', (p.gorevler ?? []).length >= 1)
  ok('görev atanan kişinin ADI çözüldü (ID değil)',
     Boolean(p.gorevler?.[0]?.atananAd), String(p.gorevler?.[0]?.atananAd))
  ok('görev özeti açık görevi sayıyor', (p.gorevOzeti?.acik ?? 0) >= 1)
  ok('her alarm veriTipi taşıyor', (p.alarmlar ?? []).every(a => a.veriTipi === 'demo'))

  console.log('\n[3] GECİKME — sunucu saatiyle, istemci saatiyle değil')
  const gorevNo = p.gorevler?.[0]?.gorevNo
  ok('şu an teslim süresi geçmemiş', p.gorevler?.[0]?.gecikti === false)
  const ileride = await panoTopla({
    depo: d, magazaKodu: MAGAZA, katman: 'canli',
    simdi: SIMDI + 1000 * 60 * 60 * 24, // 24 saat sonra
  })
  const ayniGorev = ileride.gorevler?.find(g => g.gorevNo === gorevNo)
  ok('24 saat sonra aynı görev gecikmiş görünüyor', ayniGorev?.gecikti === true)
  ok('gecikmiş sayacı da arttı', (ileride.gorevOzeti?.gecikmis ?? 0) >= 1)

  console.log('\n[4] KATMAN SÖZLEŞMESİ — null "taşınmadı", [] "veri yok"')
  const canli = await panoTopla({ depo: d, magazaKodu: MAGAZA, katman: 'canli', simdi: SIMDI })
  ok('canli: alarmlar taşındı', Array.isArray(canli.alarmlar))
  ok('canli: görevler taşındı', Array.isArray(canli.gorevler))
  ok('canli: KPI TAŞINMADI (null)', canli.kpiler === null)
  ok('canli: grafikler TAŞINMADI', canli.kuyrukSerisi === null && canli.satisSerisi === null)
  ok('canli: mağaza TAŞINMADI', canli.magaza === null)

  const yavas = await panoTopla({ depo: d, magazaKodu: MAGAZA, katman: 'yavas', simdi: SIMDI })
  ok('yavas: alarmlar TAŞINMADI (null)', yavas.alarmlar === null)
  ok('yavas: görevler TAŞINMADI', yavas.gorevler === null && yavas.gorevOzeti === null)
  ok('yavas: KPI taşındı', Array.isArray(yavas.kpiler))
  ok('yavas: kameralar taşındı', Array.isArray(yavas.kameralar))
  ok('yavas: personel taşındı', Array.isArray(yavas.personel))

  console.log('\n[5] GRAFİK VERİSİ — Detay JSON şekilleri bileşenin beklediği gibi')
  ok('kuyruk serisi noktaları var', (yavas.kuyrukSerisi?.noktalar.length ?? 0) >= 2)
  ok('seri noktası {etiket, birincil, ikincil}',
     typeof yavas.kuyrukSerisi?.noktalar[0]?.etiket === 'string'
     && typeof yavas.kuyrukSerisi?.noktalar[0]?.birincil === 'number')
  ok('satış serisinin ikinci çizgisi (dün) dolu',
     yavas.satisSerisi?.noktalar.every(n => typeof n.ikincil === 'number') === true)
  ok('yoğunluk ızgarası satır*sütun kadar hücre',
     (yavas.yogunlukIzgarasi?.hucreler.length ?? 0)
       === (yavas.yogunlukIzgarasi?.satir ?? 0) * (yavas.yogunlukIzgarasi?.sutun ?? 0))
  ok('ızgara hücreleri 0-100 aralığında',
     (yavas.yogunlukIzgarasi?.hucreler ?? []).every(h => h >= 0 && h <= 100))
  ok('raf doluluğu dağılımı dolu', (yavas.rafDoluluk?.dilimler.length ?? 0) > 0)
  ok('grafiklerin hepsi veriTipi taşıyor',
     yavas.kuyrukSerisi?.veriTipi === 'demo' && yavas.yogunlukIzgarasi?.veriTipi === 'demo'
     && yavas.rafDoluluk?.veriTipi === 'demo')

  console.log('\n[6] KPI KARTLARI')
  const anahtarlar = (yavas.kpiler ?? []).map(k => k.anahtar)
  ok('ziyaretçi kartı ilk sırada', anahtarlar[0] === 'ziyaretci', anahtarlar.join(','))
  ok('grafik metrikleri KPI kartı olmuyor',
     !anahtarlar.includes('kuyruk_saatlik') && !anahtarlar.includes('yogunluk_grid'))
  ok('her kartın Türkçe etiketi var', (yavas.kpiler ?? []).every(k => k.etiket !== k.anahtar))
  ok('her kart veriTipi taşıyor', (yavas.kpiler ?? []).every(k => k.veriTipi === 'demo'))
  ok('mağaza kartındaki açık kasa metrikten geldi', yavas.magaza?.kasaAcik === 5)

  console.log('\n[7] SIRALAMA — depo sırasına güvenilmiyor')
  const sirali = (yavas.kameralar ?? []).map(k => k.kameraId)
  ok('kameralar Sira alanına göre', sirali[0] === `${MAGAZA}-giris`, sirali.join(','))
  ok('personel açık görev sayısına göre azalan',
     (yavas.personel ?? []).every((p2, i, a) => i === 0 || a[i - 1]!.acikGorev >= p2.acikGorev))

  console.log(`\n${fail === 0 ? '✓ tüm pano toplayıcı kontrolleri geçti' : `✗ ${fail} kontrol düştü`}\n`)
  if (fail) process.exit(1)
}

main().catch(e => { console.error('HATA:', e); process.exit(1) })
