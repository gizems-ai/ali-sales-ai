// ════════════════════════════════════════════════════════════════════════════
//  Store OS — MODÜL EKRANI ÇİZİM kontrolü (18 Ağu 2026 · kapsam gösterisi)
//  `npx -y tsx src/components/storeos/modul-cizim.test.tsx`
//
//  On bir modül ekranı tek şablondan (`modul-sablonu.tsx`) doğuyor. Şablon
//  patlarsa on bir ekran birden patlar — bunu jüri ekranında değil burada
//  görmek gerekiyor. `tsc` yalnız tiplerin tuttuğunu söyler, çizimin
//  çalıştığını değil.
//
//  Ayrıca DÜRÜSTLÜK İŞARETLERİ burada kilitlenir: örnek-veri bandı, başlık
//  kupürü ve salt-okunur dipnotu şablonun parçasıdır; bir sayfa onları
//  kapatamaz. Bu test o sözü koda bağlar.
//
//  Göreli import gerekçesi için bkz. `pano-cizim.test.tsx` başlığı.
// ════════════════════════════════════════════════════════════════════════════

import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import {
  ALI_SENARYOLARI, analizModulu, ayarlarModulu, bakimModulu, isgModulu,
  kameraModulu, kampanyaModulu, kasaModulu, operasyonModulu, personelModulu,
  rafModulu, raporModulu,
} from '../../lib/storeos/depo/demo-metrikler'
import { MODULLER, durumSayimi } from '../../lib/storeos/moduller'
import {
  ModulDagilim, ModulDonut, ModulEkrani, ModulIkili, ModulIzgara,
  ModulKontrolListesi, ModulListe, ModulOneri, ModulSeriKarti, ModulTablo,
  ModulYakindaDugmeler,
} from './modul-sablonu'

let fail = 0
function ok(ad: string, cond: boolean, extra = '') {
  if (!cond) fail++
  console.log(`  ${cond ? '✓' : '✗ FAIL'}  ${ad}${cond ? '' : `  ${extra}`}`)
}

function ciz(ad: string, el: ReactElement): string {
  try {
    return renderToStaticMarkup(el)
  } catch (e) {
    fail++
    console.log(`  ✗ FAIL  ${ad} çizilirken patladı: ${(e as Error).message}`)
    return ''
  }
}

const GUN = '2026-08-18'

function main(): void {
  const kam = kameraModulu(GUN)
  const kas = kasaModulu(GUN)
  const raf = rafModulu(GUN)
  const ana = analizModulu(GUN)
  const per = personelModulu(GUN)
  const rap = raporModulu(GUN)
  const isg = isgModulu(GUN)
  const bak = bakimModulu(GUN)
  const kmp = kampanyaModulu(GUN)
  const ope = operasyonModulu(GUN)
  const ayr = ayarlarModulu()

  console.log('\n── şablon çerçevesi ──')
  const cerceve = ciz('ModulEkrani', (
    <ModulEkrani baslik="Test Modülü" aciklama="Tek cümlelik açıklama." kpiler={kam.kpiler}>
      <div id="icerik" />
    </ModulEkrani>
  ))
  ok('başlıkta "örnek veri" kupürü var', cerceve.includes('örnek veri'))
  ok('örnek-veri bandı çizildi', cerceve.includes('so-ornek-bant') || cerceve.includes('örnek'))
  ok('salt-okunur dipnotu var', cerceve.includes('salt okunur'))
  ok('mahremiyet cümlesi var', cerceve.includes('yüz tanıma'))
  ok('KPI şeridi çizildi', cerceve.includes('so-kpi-kart'))
  ok('çocuk içerik geçirildi', cerceve.includes('id="icerik"'))

  const bosKpi = ciz('ModulEkrani (KPI\'sız)', (
    <ModulEkrani baslik="T" aciklama="a" kpiler={[]}><div /></ModulEkrani>
  ))
  ok('KPI yoksa şerit hiç çizilmiyor', !bosKpi.includes('so-izgara-kpi'))
  ok('KPI yoksa da dürüstlük bandı duruyor', bosKpi.includes('salt okunur'))

  console.log('\n── parçalar ──')
  const tablo = ciz('ModulTablo', (
    <ModulTablo
      baslik="T" basliklar={['Ad', 'Değer']} sutunlar="1fr 1fr"
      satirlar={[{ anahtar: 'a', hucreler: ['x', 'y'], vurgu: 'kritik' }]}
    />
  ))
  ok('tablo satırı çizildi', tablo.includes('so-vt-satir'))
  ok('vurgu satıra işlendi', tablo.includes('data-vurgu="kritik"'))

  const bosTablo = ciz('ModulTablo (boş)', (
    <ModulTablo baslik="T" basliklar={['a']} sutunlar="1fr" satirlar={[]} />
  ))
  ok('boş tablo boş-durum çiziyor', bosTablo.includes('Kayıt yok'))

  const seri = ciz('ModulSeriKarti', <ModulSeriKarti seri={kas.seri} esik={kas.esikSn} esikNotu="eşik notu" />)
  ok('eşik çizgisi ve etiketi çizildi', seri.includes('eşik'))
  ok('eşik notu görünüyor', seri.includes('eşik notu'))
  ok('eşiksiz seri de çizilir', ciz('seri (eşiksiz)', <ModulSeriKarti seri={ana.ziyaretciBugunDun} />).length > 0)

  ok('dağılım çizildi', ciz('ModulDagilim', <ModulDagilim baslik="d" birim="yuzde" dilimler={raf.dagilim} />).length > 0)
  ok('donut çizildi', ciz('ModulDonut', <ModulDonut baslik="p" dilimler={per.dagilim} />).length > 0)
  ok('ısı haritası çizildi', ciz('ModulIzgara', <ModulIzgara baslik="ı" izgara={ana.izgara} />).length > 0)
  ok('öneri kutusu çizildi', ciz('ModulOneri', (
    <ModulOneri baslik={kas.oneri.baslik} metin={kas.oneri.metin} gerekce={kas.oneri.gerekce} />
  )).includes('so-oneri-kutu'))
  ok('liste çizildi', ciz('ModulListe', (
    <ModulListe baslik="l" satirlar={kam.olaylar.map((o, i) => ({
      anahtar: String(i), sol: o.saat, ana: o.metin, alt: o.kameraAdi,
    }))} />
  )).includes('so-satir-baslik'))
  ok('kontrol listesi çizildi', ciz('ModulKontrolListesi', (
    <ModulKontrolListesi baslik="k" maddeler={ope.kontrolListesi.map(m => ({
      anahtar: m.madde, metin: m.madde, tamam: m.tamam, alt: m.sorumlu,
    }))} />
  )).includes('so-kutucuk'))
  ok('yan yana yerleşim çizildi', ciz('ModulIkili', <ModulIkili><div /></ModulIkili>).includes('so-izgara-2'))

  const yakinda = ciz('ModulYakindaDugmeler', <ModulYakindaDugmeler dugmeler={['A', 'B', 'C']} not="n" />)
  ok('üç düğme de devre dışı', (yakinda.match(/disabled/g) ?? []).length === 3)
  // `so-yakinda-kutu` da desene uyar; rozeti METİNDEN sayıyoruz.
  ok('küme başına TEK "yakında" rozeti', (yakinda.match(/>yakında</g) ?? []).length === 1)

  console.log('\n── seed ──')
  const modullerinKpileri: Array<[string, number]> = [
    ['kamera', kam.kpiler.length], ['kasa', kas.kpiler.length], ['raf', raf.kpiler.length],
    ['analiz', ana.kpiler.length], ['personel', per.kpiler.length], ['isg', isg.kpiler.length],
    ['bakim', bak.kpiler.length], ['kampanya', kmp.kpiler.length], ['operasyon', ope.kpiler.length],
  ]
  ok('her modülde 3–4 KPI var',
    modullerinKpileri.every(([, n]) => n >= 3 && n <= 4),
    JSON.stringify(modullerinKpileri))
  ok('seed determinist — aynı gün aynı çıktı',
    JSON.stringify(kasaModulu(GUN)) === JSON.stringify(kas)
    && JSON.stringify(analizModulu(GUN)) === JSON.stringify(ana)
    && JSON.stringify(bakimModulu(GUN)) === JSON.stringify(bak))
  ok('gün değişince veri değişiyor (donmuş değil)',
    JSON.stringify(kasaModulu('2026-08-19')) !== JSON.stringify(kas))
  ok('6 kamera, hepsi çevrimiçi',
    kam.kameralar.length === 6 && kam.kameralar.every(k => k.durum === 'online'))
  ok('kamera varyantları farklı — altı özdeş kare yok',
    new Set(kam.kameralar.map(k => k.varyant)).size === 6)
  ok('olay akışı saat sırasında (yeni → eski)',
    kam.olaylar.every((o, i) => i === 0 || kam.olaylar[i - 1].saat >= o.saat))
  ok('haftalık rapor 7 gün', rap.haftalik.length === 7)
  ok('10 rol tanımlı', ayr.roller.length === 10)
  ok('yalnız Airtable ve WhatsApp "canlı" — Vision/POS/ERP pilot',
    ayr.entegrasyonlar.filter(e => e.durum === 'canli').length === 2
    && ayr.entegrasyonlar.filter(e => e.durum === 'pilot').length === 3)

  console.log('\n── Ali senaryoları ──')
  ok('altı hazır senaryo', ALI_SENARYOLARI.length === 6)
  ok('her cevapta durum/neden/etki/öneri dolu',
    ALI_SENARYOLARI.every(s => s.cevap.durum && s.cevap.neden && s.cevap.etki && s.cevap.oneri))
  ok('her cevapta en az bir aksiyon', ALI_SENARYOLARI.every(s => s.cevap.aksiyonlar.length > 0))
  ok('sayı içeren cevaplar yer tutucu kullanıyor — uydurma rakam yok',
    ALI_SENARYOLARI.every(s => {
      const t = `${s.cevap.durum} ${s.cevap.neden} ${s.cevap.etki}`
      // "3 açık alarm" gibi SABİT bir alarm/görev sayısı yasak: bu sayılar
      // yalnız {alarm}/{gorev}/{uyari} yer tutucusundan gelebilir.
      return !/\d+\s+(açık\s+)?(alarm|görev)/i.test(t)
    }))

  console.log('\n── menü ──')
  const sayim = durumSayimi()
  ok('on beş modülün on beşinin de ekranı var — gri madde yok',
    MODULLER.every(m => m.yol !== undefined), JSON.stringify(MODULLER.filter(m => !m.yol).map(m => m.slug)))
  ok('dört ekran hâlâ gerçek zincirden besleniyor', sayim.canli === 4, String(sayim.canli))
  ok('kalan on bir ekran "örnek veri" olarak işaretli',
    sayim['ekran-demo'] === 11, String(sayim['ekran-demo']))

  console.log(fail === 0 ? '\n✓ tüm modül ekranı çizim kontrolleri geçti' : `\n✗ ${fail} kontrol düştü`)
  process.exit(fail === 0 ? 0 : 1)
}

main()
