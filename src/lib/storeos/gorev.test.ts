// ════════════════════════════════════════════════════════════════════════════
//  Store OS — görev durum makinesi kontrolü.
//  `npx -y tsx src/lib/storeos/gorev.test.ts`
//
//  Kabul kriteri: geçersiz geçiş REDDEDİLİR ve her geçiş (reddedilen dahil)
//  denetim kaydına düşer.
// ════════════════════════════════════════════════════════════════════════════

import { bellekDeposunuZorla } from './depo'
import { DENETIM_AKSIYONLARI } from './denetim'
import { GECISLER, gecisGecerliMi, gecisSebebi, gecisYap, nihaiMi, sablonDoldur } from './gorev'
import type { Depo } from './depo'
import type { Gorev, GorevDurumu } from './tipler'
import type { VisionEvent } from './olay-sozlesmesi'

let fail = 0
function ok(ad: string, cond: boolean, extra = '') {
  if (!cond) fail++
  console.log(`  ${cond ? '✓' : '✗ FAIL'}  ${ad}${cond ? '' : `  ${extra}`}`)
}

const TUM_DURUMLAR = Object.keys(GECISLER) as GorevDurumu[]

async function gorevKur(d: Depo, no: string, durum: GorevDurumu): Promise<void> {
  const g: Gorev = {
    'Gorev No': no,
    'Baslik': 'Test gorevi',
    'Aciklama': 'Kontrol script tarafindan uretildi',
    'Magaza Kodu': '0178',
    'Kaynak Olay ID': `evt_test_${no}`,
    'Kural': 'Test kurali',
    'Gerekce': 'kontrol',
    'Atanan Rol': 'personel',
    'Oncelik': 'normal',
    'Durum': durum,
    'Olusturuldu': '2026-08-14T14:00:00+03:00',
    'Son Teslim': '2026-08-14T14:30:00+03:00',
    'Kanit Gerekli': false,
    'Veri Tipi': 'demo',
  }
  await d.gorevler.olustur(g)
}

async function main() {
  console.log('\n[1] GEÇİŞ TABLOSU BÜTÜNLÜĞÜ — tek kaynak, whitelist')
  ok('sözleşmedeki 10 durumun tamamı tabloda',
     TUM_DURUMLAR.length === 10, `bulunan: ${TUM_DURUMLAR.length}`)
  ok('ana hattın her adımı mevcut', [
      ['yeni', 'atandi'], ['atandi', 'goruldu'], ['goruldu', 'basladi'],
      ['basladi', 'beklemede'], ['beklemede', 'tamamlandi'],
     ].every(([a, b]) => gecisGecerliMi(a as GorevDurumu, b as GorevDurumu)))
  ok('tablodaki her hedef bilinen bir durum (yazım hatası yok)',
     TUM_DURUMLAR.every(k => GECISLER[k].every(h => TUM_DURUMLAR.includes(h))))
  ok('tamamlandi nihai — hiçbir çıkışı yok', GECISLER.tamamlandi.length === 0 && nihaiMi('tamamlandi'))
  ok('iptal nihai — hiçbir çıkışı yok', GECISLER.iptal.length === 0 && nihaiMi('iptal'))
  ok('hiçbir durum kendine geçemez — tek istisna atandi (yeniden atama)',
     TUM_DURUMLAR.filter(k => GECISLER[k].includes(k)).join(',') === 'atandi')

  console.log('\n[2] GEÇERSİZ GEÇİŞLER REDDEDİLİR (saf fonksiyon)')
  ok("yeni → tamamlandi (adım atlama) reddedilir", !gecisGecerliMi('yeni', 'tamamlandi'))
  ok("yeni → basladi (atanmadan başlama) reddedilir", !gecisGecerliMi('yeni', 'basladi'))
  ok("tamamlandi → basladi (nihaiden geri dönüş) reddedilir", !gecisGecerliMi('tamamlandi', 'basladi'))
  ok("iptal → atandi (nihaiden geri dönüş) reddedilir", !gecisGecerliMi('iptal', 'atandi'))
  ok("goruldu → tamamlandi (başlamadan bitirme) reddedilir", !gecisGecerliMi('goruldu', 'tamamlandi'))
  ok('her reddin insan-okur sebebi var',
     !!gecisSebebi('yeni', 'tamamlandi') && !!gecisSebebi('tamamlandi', 'basladi'))
  ok('geçerli geçişte sebep null', gecisSebebi('yeni', 'atandi') === null)
  ok('nihai durum sebebi bunu açıkça söyler',
     (gecisSebebi('tamamlandi', 'basladi') ?? '').includes('nihai'))
  ok('aynı duruma geçiş ayrı bir mesaj verir',
     (gecisSebebi('tamamlandi', 'tamamlandi') ?? '').includes('zaten'))

  console.log('\n[3] DEPO ÜZERİNDEN GEÇİŞ — kabul, ret ve denetim izi')
  const d = bellekDeposunuZorla()
  await d.sifirla()
  await gorevKur(d, 'G-900001', 'yeni')

  const gecerli = await gecisYap(d, {
    gorevNo: 'G-900001', hedef: 'atandi',
    aktor: 'u-test', aktorTipi: 'kullanici', kaynak: 'panel',
    yeniAtanan: 'u-kasa-0178', simdi: '2026-08-14T14:05:00+03:00',
  })
  ok('geçerli geçiş uygulanır', gecerli.basarili === true)
  ok('atanan kullanıcı da güncellenir',
     gecerli.basarili && gecerli.gorev['Atanan Kullanici ID'] === 'u-kasa-0178')

  const gecersiz = await gecisYap(d, {
    gorevNo: 'G-900001', hedef: 'tamamlandi',
    aktor: 'u-test', aktorTipi: 'kullanici', kaynak: 'panel',
    simdi: '2026-08-14T14:06:00+03:00',
  })
  ok('geçersiz geçiş reddedilir', gecersiz.basarili === false)
  ok("ret kodu 'gecersiz_gecis'", !gecersiz.basarili && gecersiz.kod === 'gecersiz_gecis')

  const sonra = await d.gorevler.getir('G-900001')
  ok('reddedilen geçiş görevin durumunu DEĞİŞTİRMEZ', sonra?.['Durum'] === 'atandi', sonra?.['Durum'])

  const yok = await gecisYap(d, {
    gorevNo: 'G-yok', hedef: 'atandi',
    aktor: 'u-test', aktorTipi: 'kullanici', kaynak: 'panel',
  })
  ok("olmayan görev → kod 'bulunamadi'", !yok.basarili && yok.kod === 'bulunamadi')

  const iz = await d.denetim.listele({ entityId: 'G-900001' })
  ok('kabul edilen geçiş denetime yazıldı',
     iz.some(s => s['Aksiyon'] === DENETIM_AKSIYONLARI.gorevDurum),
     JSON.stringify(iz.map(s => s['Aksiyon'])))
  ok('REDDEDİLEN geçiş de denetime yazıldı ("kim neyi denedi")',
     iz.some(s => s['Aksiyon'] === DENETIM_AKSIYONLARI.gorevGecisRed))
  ok('denetim deposunda sil/guncelle metodu YOK (append-only)',
     !('sil' in d.denetim) && !('guncelle' in d.denetim) && !('temizle' in d.denetim))

  console.log('\n[4] ŞABLON DOLDURMA — demoda ham yer tutucu görünmez')
  const olay = {
    id: 'evt_1', storeCode: '0178', cameraId: 'cam-kasa-01',
    eventType: 'store.queue.threshold_exceeded',
    occurredAt: '2026-08-14T14:35:21+03:00',
    severity: 'high', confidence: 0.91,
    metadata: { queueLength: 7, avgWaitSeconds: 252 },
  } as VisionEvent
  ok('metadata alanı yerine değer basılır',
     sablonDoldur('Kuyruk {metadata.queueLength} kisi', olay) === 'Kuyruk 7 kisi')
  ok('{magaza} kısayolu çalışır',
     sablonDoldur('{magaza}', olay, 'Forum Bornova') === 'Forum Bornova')
  ok('{kamera} kısayolu çalışır', sablonDoldur('{kamera}', olay) === 'cam-kasa-01')
  ok("bulunamayan yer tutucu '—' olur, ham {} EKRANDA GÖRÜNMEZ",
     sablonDoldur('{metadata.yokBoyleBirSey}', olay) === '—')

  if (fail) { console.log(`\n✗ ${fail} kontrol BAŞARISIZ\n`); process.exit(1) }
  console.log('\n✓ tüm görev durum makinesi kontrolleri geçti\n')
}

main().catch(e => { console.error(e); process.exit(1) })
