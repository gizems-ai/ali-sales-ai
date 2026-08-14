// ════════════════════════════════════════════════════════════════════════════
//  Store OS — liste toplayıcısı kontrolü (Alarmlar · Görevler · Denetim).
//  `npx -y tsx src/lib/storeos/liste/liste.test.ts`
//
//  Neyi koruyor:
//   · FİLTRE ÇÖZÜMLEME — geçersiz URL parametresi ekranı KIRMAZ, varsayılana
//     düşer. Jüri demosunda adres çubuğuna dokunan biri 400 görmemeli.
//   · DEPO-BAĞIMSIZLIK — sıralama toplayıcıda; depo karışık sıra döndürse de
//     en yeni üstte. Airtable sıra garantisi vermiyor.
//   · ZİNCİR — olay → doğan görev bağı kuruluyor; "kural yok" ile "kural
//     eşleşti ama görev bulunamadı" AYRI iki durum.
//   · GRUP SÜZGEÇLERİ — durum listesi elle tutulmuyor, `NIHAI_DURUMLAR` tek
//     kaynak. Durum makinesine yeni durum eklenince süzgeç kaymamalı.
//   · SESSİZ KIRPMA YOK — tavana dayanınca `tavanaUlasildi` doğru raporlanıyor.
//   · DÜRÜSTLÜK (madde 11) — bilinmeyen köken 'gercek' diye etiketlenmiyor.
//   · BOZUK VERİ — hatalı metadata JSON ekranı düşürmüyor.
// ════════════════════════════════════════════════════════════════════════════

import { bellekDeposunuZorla } from '../depo'
import type { Depo } from '../depo'
import { denetimYaz } from '../denetim'
import { olaylariAl } from '../olay-alim'
import { listeTopla } from './toplayici'
import { BOS_FILTRE, TAVAN, filtreCoz, gorunumMu } from './tipler'
import type { ListeFiltresi } from './tipler'

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

function f(yama: Partial<ListeFiltresi> = {}): ListeFiltresi {
  return { ...BOS_FILTRE, ...yama }
}

// Görünüme göre daraltılmış üç yardımcı. `ListeVerisi` ayrık birleşim olduğu
// için satır tipi ancak `gorunum` kontrol edilerek daralır; bunu her çağrıda
// tekrarlamak yerine tek yerde yapıyoruz. Throw ASLA çalışmamalı — çalışırsa
// toplayıcı yanlış görünüm etiketiyle dönüyor demektir, o da testtir.
async function alarmlar(depo: Depo, filtre = f(), simdi = SIMDI) {
  const v = await listeTopla({ depo, magazaKodu: MAGAZA, gorunum: 'alarmlar', filtre, simdi })
  if (v.gorunum !== 'alarmlar') throw new Error(`görünüm etiketi yanlış: ${v.gorunum}`)
  return v
}
async function gorevler(depo: Depo, filtre = f(), simdi = SIMDI) {
  const v = await listeTopla({ depo, magazaKodu: MAGAZA, gorunum: 'gorevler', filtre, simdi })
  if (v.gorunum !== 'gorevler') throw new Error(`görünüm etiketi yanlış: ${v.gorunum}`)
  return v
}
async function denetim(depo: Depo, filtre = f(), simdi = SIMDI) {
  const v = await listeTopla({ depo, magazaKodu: MAGAZA, gorunum: 'denetim', filtre, simdi })
  if (v.gorunum !== 'denetim') throw new Error(`görünüm etiketi yanlış: ${v.gorunum}`)
  return v
}

/** Kurala EŞLEŞEN olay (queueLength >= 6 → kritik görev doğar). */
function kuyrukOlayi(id: string, occurredAt: string, uzunluk = 9): Record<string, unknown> {
  return {
    id, storeCode: MAGAZA, cameraId: `${MAGAZA}-kasa`,
    eventType: 'store.queue.threshold_exceeded',
    occurredAt, severity: 'high', confidence: 0.91,
    metadata: { registerId: 'kasa-2', queueLength: uzunluk, avgWaitSeconds: 252, maxWaitSeconds: 300 },
  }
}

/** Faz 2 tipi — bilinçli olarak KURALI YOK: kabul edilir, görev üretmez. */
function rafOlayi(id: string, occurredAt: string): Record<string, unknown> {
  return {
    id, storeCode: MAGAZA, cameraId: `${MAGAZA}-kozmetik`,
    eventType: 'store.shelf.stock_low',
    occurredAt, severity: 'low', confidence: 0.7,
    metadata: { shelfId: 'raf-12', fillRatio: 0.2 },
  }
}

async function main() {
  // ── [1] Filtre çözümleme — depo gerekmez ──────────────────────────────────
  console.log('\n[1] FİLTRE ÇÖZÜMLEME — geçersiz parametre ekranı kırmaz')
  const bos = filtreCoz(() => null)
  ok('parametre yokken varsayılan', bos.severity === 'hepsi' && bos.durum === 'hepsi' && bos.entity === null && bos.q === null)

  const cop = filtreCoz(ad => ({ severity: 'MAVI', durum: 'her-neyse', entity: '  ', q: '   ' }[ad] ?? null))
  ok('geçersiz severity varsayılana düştü (400 değil)', cop.severity === 'hepsi', cop.severity)
  ok('geçersiz durum varsayılana düştü', cop.durum === 'hepsi', cop.durum)
  ok('yalnız boşluktan ibaret entity null', cop.entity === null, String(cop.entity))
  ok('yalnız boşluktan ibaret q null', cop.q === null, String(cop.q))

  const gecerli = filtreCoz(ad => ({ severity: 'critical', durum: 'gecikmis', entity: ' G-1 ', q: ' kasa ' }[ad] ?? null))
  ok('geçerli severity korunuyor', gecerli.severity === 'critical')
  ok('geçerli durum korunuyor', gecerli.durum === 'gecikmis')
  ok('entity ve q kırpılıyor', gecerli.entity === 'G-1' && gecerli.q === 'kasa')

  const uzun = filtreCoz(ad => (ad === 'q' ? 'x'.repeat(500) : null))
  ok('q tavanı uygulanıyor', uzun.q?.length === 120, String(uzun.q?.length))

  ok('gorunumMu geçerliyi kabul eder', gorunumMu('alarmlar') && gorunumMu('gorevler') && gorunumMu('denetim'))
  ok('gorunumMu uyduranı reddeder', !gorunumMu('kameralar') && !gorunumMu(null) && !gorunumMu(3))

  // ── [2] Boş liste ─────────────────────────────────────────────────────────
  const d = bellekDeposunuZorla()
  await d.sifirla()

  console.log('\n[2] BOŞ LİSTE — "veri yok" bir hata değildir')
  const bosAlarm = await alarmlar(d)
  ok('satırlar boş DİZİ (null değil)', Array.isArray(bosAlarm.satirlar) && bosAlarm.satirlar.length === 0)
  ok('bos=true', bosAlarm.bos === true)
  ok('tavana ulaşılmadı', bosAlarm.tavanaUlasildi === false)
  ok('kökeni bilinmeyen veri "gercek" diye etiketlenmiyor', bosAlarm.veriTipi === 'demo')
  ok('tavan yanıtta taşınıyor (ekran yazabilsin)', bosAlarm.tavan === TAVAN.alarmlar)

  // ── [3] Sıralama + zincir ─────────────────────────────────────────────────
  console.log('\n[3] SIRALAMA VE ZİNCİR — olay → doğan görev')
  // Bilerek TERS sırada: eski olay SONRA yazılıyor. Depo ekleme sırasını
  // korusa bile toplayıcı 'Olustu'ya göre sıralamalı.
  await olaylariAl({ depo: d, govde: kuyrukOlayi('evt_yeni', '2026-08-14T14:30:00+03:00'), ...ORTAK })
  await olaylariAl({ depo: d, govde: kuyrukOlayi('evt_eski', '2026-08-14T09:00:00+03:00'), ...ORTAK })
  await olaylariAl({ depo: d, govde: rafOlayi('evt_raf', '2026-08-14T13:00:00+03:00'), ...ORTAK })

  const a = await alarmlar(d)
  ok('üç alarm listelendi', a.satirlar.length === 3, String(a.satirlar.length))
  ok('EN YENİ ÜSTTE (depo sırası değil)', a.satirlar[0]?.olayId === 'evt_yeni',
     a.satirlar.map(x => x.olayId).join(','))
  ok('olay tipi Türkçe başlığa çevrildi', a.satirlar[0]?.baslik === 'Kasa kuyruğu eşiği aşıldı', a.satirlar[0]?.baslik)
  ok('kamera ID değil ADI gösteriliyor', a.satirlar[0]?.kameraAdi === 'Kasa Alani', String(a.satirlar[0]?.kameraAdi))

  const yeni = a.satirlar.find(x => x.olayId === 'evt_yeni')
  const raf = a.satirlar.find(x => x.olayId === 'evt_raf')
  ok('kural eşleşen olay bir GÖREV NUMARASI taşıyor', Boolean(yeni?.gorevNo), String(yeni?.gorevNo))
  ok('eşleşen kuralın adı taşınıyor', Boolean(yeni?.eslesenKural), String(yeni?.eslesenKural))
  ok('KURALSIZ olayda görev no yok', raf?.gorevNo === null)
  ok('KURALSIZ olayda kural adı da yok — iki durum ayırt edilebilir',
     raf?.eslesenKural === null)
  ok('metadata ad-değer çiftlerine çözüldü',
     (yeni?.metadata ?? []).some(m => m.anahtar === 'queueLength' && m.deger === '9'),
     JSON.stringify(yeni?.metadata))
  ok('uçtan uca alan alanlar dolu (olustu + alindi)',
     Boolean(yeni?.olustu) && Boolean(yeni?.alindi))
  ok('güven skoru taşınıyor', yeni?.guven === 0.91)
  ok('her alarm veriTipi taşıyor', a.satirlar.every(x => x.veriTipi === 'demo'))

  // ── [4] Alarm süzgeçleri ──────────────────────────────────────────────────
  console.log('\n[4] ALARM SÜZGEÇLERİ')
  const yuksek = await alarmlar(d, f({ severity: 'high' }))
  ok('severity süzgeci uygulanıyor', yuksek.satirlar.length === 2, String(yuksek.satirlar.length))
  ok('süzgeç sonrası toplam = satır sayısı', yuksek.toplam === yuksek.satirlar.length)
  ok('SAYAÇLAR HAM KÜMEDEN — süzgeç seçiliyken diğerleri sıfırlanmıyor',
     yuksek.secenekler.find(s => s.deger === 'hepsi')?.adet === 3,
     JSON.stringify(yuksek.secenekler))
  ok('sayaçta yalnız var olan severity\'ler görünüyor',
     yuksek.secenekler.every(s => s.adet > 0))

  const tekKayit = await alarmlar(d, f({ entity: 'evt_raf' }))
  ok('entity süzgeci tek kaydı getiriyor (derin bağlantı)',
     tekKayit.satirlar.length === 1 && tekKayit.satirlar[0]?.olayId === 'evt_raf')

  const arama = await alarmlar(d, f({ q: 'KASA KUYRUĞU' }))
  ok('serbest metin araması büyük/küçük harf duyarsız', arama.satirlar.length === 2, String(arama.satirlar.length))

  // Türkçe küçültme: varsayılan toLowerCase 'İ' harfini 'i̇' (i + birleşen nokta)
  // yapar ve eşleşme kaçar. Süzgeç tr yerelini kullanmalı.
  const turkce = await alarmlar(d, f({ q: 'EŞİĞİ' }))
  ok('Türkçe yerelde küçültülüyor (İ harfi kaçmıyor)', turkce.satirlar.length === 2, String(turkce.satirlar.length))

  const bosSonuc = await alarmlar(d, f({ q: 'boyle-bir-sey-yok' }))
  ok('eşleşme yoksa bos=true ama tarandi>0 (hata değil, filtre)',
     bosSonuc.bos === true && bosSonuc.tarandi === 3)

  // ── [5] Görev grup süzgeçleri ─────────────────────────────────────────────
  console.log('\n[5] GÖREV GRUP SÜZGEÇLERİ — durum listesi elle tutulmuyor')
  const g = await gorevler(d)
  ok('kuyruk olaylarından görev doğdu', g.satirlar.length >= 2, String(g.satirlar.length))
  ok('atanan kişinin ADI çözüldü (ID değil)', Boolean(g.satirlar[0]?.atananAd), String(g.satirlar[0]?.atananAd))
  ok('görev gerekçesi taşınıyor — "neden açıldı" cevaplanabilir', Boolean(g.satirlar[0]?.gerekce))
  ok('kaynak olay id bağı kurulu', Boolean(g.satirlar[0]?.kaynakOlayId))
  ok('kalan dakika hesaplandı', typeof g.satirlar[0]?.kalanDk === 'number')
  ok('şu an hiçbiri gecikmemiş', g.satirlar.every(x => x.gecikti === false))

  const acik = await gorevler(d, f({ durum: 'acik' }))
  ok('açık süzgeci tümünü getiriyor (henüz kapanan yok)', acik.satirlar.length === g.satirlar.length)

  const gecikmisSimdi = await gorevler(d, f({ durum: 'gecikmis' }))
  ok('şu an gecikmiş görev yok', gecikmisSimdi.satirlar.length === 0)

  // GECİKME SUNUCU SAATİYLE: 24 saat ileri sarınca aynı görevler gecikmeli olmalı.
  const ileride = await gorevler(d, f({ durum: 'gecikmis' }), SIMDI + 1000 * 60 * 60 * 24)
  ok('24 saat sonra aynı görevler GECİKMİŞ (sunucu saatiyle)',
     ileride.satirlar.length === g.satirlar.length, String(ileride.satirlar.length))
  ok('gecikmede kalanDk negatif', (ileride.satirlar[0]?.kalanDk ?? 0) < 0, String(ileride.satirlar[0]?.kalanDk))
  ok('gecikmiş sayacı da arttı',
     (ileride.secenekler.find(s => s.deger === 'gecikmis')?.adet ?? 0) === g.satirlar.length)
  ok('gecikmiş görev HÂLÂ açık — gruplar dışlayıcı değil',
     (ileride.secenekler.find(s => s.deger === 'acik')?.adet ?? 0) >= (ileride.secenekler.find(s => s.deger === 'gecikmis')?.adet ?? 0))

  const gorevTek = await gorevler(d, f({ entity: g.satirlar[0]!.gorevNo }))
  ok('görev no ile derin bağlantı tek kaydı getiriyor', gorevTek.satirlar.length === 1)

  const olaydanGorev = await gorevler(d, f({ entity: 'evt_yeni' }))
  ok('OLAY id ile de görev bulunabiliyor (alarm ekranından geliş)',
     olaydanGorev.satirlar.length === 1 && olaydanGorev.satirlar[0]?.kaynakOlayId === 'evt_yeni')

  // ── [6] Denetim ───────────────────────────────────────────────────────────
  console.log('\n[6] DENETİM — append-only defter')
  const den = await denetim(d)
  ok('zincir denetim kaydı bıraktı', den.satirlar.length > 0, String(den.satirlar.length))
  ok('EN YENİ ÜSTTE',
     den.satirlar.every((s, i, arr) => i === 0 || Date.parse(arr[i - 1]!.zaman) >= Date.parse(s.zaman)))
  ok('aksiyon kodu Türkçe etikete çevrildi',
     den.satirlar.some(s => s.aksiyonEtiketi !== s.aksiyon), den.satirlar[0]?.aksiyonEtiketi)
  ok('olay kabul kaydı var', den.satirlar.some(s => s.aksiyon === 'olay.kabul'))
  ok('görev oluşturma kaydı var', den.satirlar.some(s => s.aksiyon === 'gorev.olusturuldu'))
  ok('denetimde veriTipi bilinmiyor → "demo" (gercek diye etiketlenmiyor)', den.veriTipi === 'demo')

  const denTek = await denetim(d, f({ entity: 'evt_yeni' }))
  ok('entity süzgeci DEPO arayüzüne iniyor (tek kaydın izi)',
     denTek.satirlar.length > 0 && denTek.satirlar.every(s => s.entityId === 'evt_yeni'),
     denTek.satirlar.map(s => s.entityId).join(','))

  await denetimYaz(d, {
    aktor: 'test', aktorTipi: 'system', aksiyon: 'gorev.durum',
    entityTipi: 'gorev', entityId: 'G-OZET', kaynak: 'panel',
    sonrasi: { durum: 'basladi', oncekiDurum: 'atandi', aktor: 'u-1', ek1: 1, ek2: 2 },
    zaman: SIMDI_ISO,
  })
  const ozetli = await denetim(d, f({ entity: 'G-OZET' }))
  const ozet = ozetli.satirlar[0]?.ozet ?? ''
  ok('ham JSON değil, insan-okur özet', ozet.includes('durum: basladi'), ozet)
  ok('üçten fazla alan sayıya iniyor', ozet.includes('+2 alan'), ozet)

  // ── [7] Bozuk veri ────────────────────────────────────────────────────────
  console.log('\n[7] BOZUK VERİ — ekran düşmüyor')
  await d.olaylar.yazIlkKez({
    'Olay ID': 'evt_bozuk', 'Magaza Kodu': MAGAZA, 'Olay Tipi': 'store.uydurma.tip',
    'Olustu': '2026-08-14T12:00:00+03:00', 'Alindi': SIMDI_ISO,
    'Severity': 'info', 'Guven': 0.5,
    'Metadata JSON': '{bu gecerli json degil',
    'Kaynak Adapter': 'generic', 'Islendi': false, 'Veri Tipi': 'demo',
  })
  const bozuk = await alarmlar(d, f({ entity: 'evt_bozuk' }))
  ok('bozuk metadata JSON toplayıcıyı düşürmedi', bozuk.satirlar.length === 1)
  ok('bozuk metadata ham olarak gösteriliyor',
     bozuk.satirlar[0]?.metadata[0]?.anahtar === 'ham', JSON.stringify(bozuk.satirlar[0]?.metadata))
  ok('BİLİNMEYEN olay tipi reddedilmiyor, ham tip gösteriliyor',
     bozuk.satirlar[0]?.baslik === 'store.uydurma.tip', bozuk.satirlar[0]?.baslik)

  // ── [8] Tavan dürüstlüğü ──────────────────────────────────────────────────
  console.log('\n[8] SESSİZ KIRPMA YOK — tavana dayanınca söyleniyor')
  const dt = bellekDeposunuZorla()
  await dt.sifirla()
  // Tavanı AŞACAK kadar olay: kurala eşleşmeyen tip seçildi ki her olay için
  // görev + bildirim zinciri koşup testi yavaşlatmasın.
  for (let i = 0; i < TAVAN.alarmlar + 5; i++) {
    await olaylariAl({
      depo: dt,
      govde: rafOlayi(`evt_${String(i).padStart(4, '0')}`, new Date(SIMDI - i * 60_000).toISOString()),
      ...ORTAK,
    })
  }
  const tavanli = await alarmlar(dt)
  ok('tavan kadar satır döndü', tavanli.satirlar.length === TAVAN.alarmlar, String(tavanli.satirlar.length))
  ok('TAVANA ULAŞILDI bayrağı açık — ekran bunu yazacak', tavanli.tavanaUlasildi === true)
  ok('tarandi ham sayıyı bildiriyor', tavanli.tarandi >= TAVAN.alarmlar, String(tavanli.tarandi))

  console.log(`\n${fail === 0 ? '✓ tüm liste toplayıcı kontrolleri geçti' : `✗ ${fail} kontrol düştü`}\n`)
  if (fail) process.exit(1)
}

main().catch(e => { console.error('HATA:', e); process.exit(1) })
