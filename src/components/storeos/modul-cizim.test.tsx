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
  ALI_SENARYOLARI, KAMPANYA_MADDELERI, analizModulu, ayarlarModulu, bakimModulu,
  isgModulu, kameraModulu, kampanyaModulu, kasaModulu, operasyonModulu,
  personelModulu, rafModulu, raporModulu, whatsappModulu,
} from '../../lib/storeos/depo/demo-metrikler'
import { BUTON_ETIKETLERI } from '../../lib/storeos/kanal/buton'
import { BUTON_AKSIYONLARI } from '../../lib/storeos/kanal/tipler'
import { WaAkisi } from './wa-akis'
import { MODULLER, durumSayimi } from '../../lib/storeos/moduller'
import {
  ModulDagilim, ModulDonut, ModulEkrani, ModulIkili, ModulIzgara,
  ModulKontrolListesi, ModulListe, ModulOneri, ModulSeriKarti, ModulTablo,
  ModulA4Rapor, ModulAkis, ModulUygunlukMatrisi, ModulYakindaDugmeler,
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
  ok('hazır senaryo listesi dolu', ALI_SENARYOLARI.length >= 6, String(ALI_SENARYOLARI.length))
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

  // ── Gün sonu raporu ─────────────────────────────────────────────────────
  // Raporun tek riski şu: Ali'nin serbest metni ile hemen altındaki ölçü
  // kutuları farklı sayılar söylerse belge güvenilirliğini kaybeder. Test,
  // metindeki her sayının tablodan geldiğini doğruluyor.
  console.log('\n── gün sonu raporu ──')
  const rp = raporModulu(GUN)
  ok('Ali\'nin notu dört cümle', rp.gunSonu.aliNotu.length === 4, String(rp.gunSonu.aliNotu.length))
  const notMetni = rp.gunSonu.aliNotu.join(' ')
  const olcu = (e: string) => rp.gunluk.find(g => g.etiket === e)?.deger ?? '‽'
  ok('ziyaretçi sayısı metinde ve tabloda aynı', notMetni.includes(olcu('Ziyaretçi')))
  ok('dönüşüm oranı metinde ve tabloda aynı', notMetni.includes(olcu('Dönüşüm oranı')))
  ok('bekleme süresi metinde ve tabloda aynı', notMetni.includes(olcu('Ortalama bekleme')))
  ok('raf bulunurluğu metinde ve tabloda aynı', notMetni.includes(olcu('Raf bulunurluğu')))
  ok('kapanan görev açılandan fazla değil',
    Number(olcu('Kapanan görev')) <= Number(olcu('Açılan görev')),
    `${olcu('Kapanan görev')} > ${olcu('Açılan görev')}`)
  ok('tamamlanan görevler saat sırasında',
    rp.gunSonu.tamamlanan.every((t, i) => i === 0 || t.saat >= rp.gunSonu.tamamlanan[i - 1].saat))
  ok('her kritik olayın bir sonucu yazılı',
    rp.gunSonu.kritikOlaylar.every(o => o.sonuc.length > 0))
  const a4 = ciz('ModulA4Rapor', (
    <ModulA4Rapor
      baslik="b" ustBilgi="u" gun={GUN} aliNotu={rp.gunSonu.aliNotu} olculer={rp.gunluk}
      tamamlanan={rp.gunSonu.tamamlanan} kritikOlaylar={rp.gunSonu.kritikOlaylar}
      altBilgi="örnek (seed) veridir"
    />
  ))
  ok('A4 sayfası çizildi', a4.includes('so-a4-bas') && a4.includes('so-a4-olcu'))
  ok('altı ölçü kutusu', (a4.match(/so-a4-olcu-deger/g) ?? []).length === rp.gunluk.length)
  ok('künyede "örnek (seed) veridir" yazıyor — kâğıda çıkan sayfa da dürüst',
    a4.includes('örnek (seed) veridir'))

  // ── Müşteri yolculuğu ───────────────────────────────────────────────────
  // Ekranda "kaç kişi girdi" dört yerde geçiyor: KPI · yolculuk · huni ·
  // alan payları. Dördü tek zincirden gelmezse ekran kendi kendini yalanlar.
  console.log('\n── müşteri yolculuğu ──')
  ok('yolculuk altı adım', ana.yolculuk.length === 6, String(ana.yolculuk.length))
  ok('adımlar tekdüze azalıyor',
    ana.yolculuk.every((a, i) => i === 0 || a.kisi <= ana.yolculuk[i - 1].kisi))
  ok('düşüş yüzdeleri bir önceki adımdan hesaplanmış',
    ana.yolculuk.every((a, i) => i === 0
      ? a.dusus === 0
      : a.dusus === Math.round(((ana.yolculuk[i - 1].kisi - a.kisi) / ana.yolculuk[i - 1].kisi) * 100)))
  const anaGiris = ana.kpiler.find(k => k.anahtar === 'an_ziyaretci')?.deger
  ok('ziyaretçi KPI = yolculuğun ilk adımı = huninin ilk basamağı',
    anaGiris === ana.yolculuk[0].kisi && anaGiris === ana.huni[0].deger,
    `${anaGiris} · ${ana.yolculuk[0].kisi} · ${ana.huni[0].deger}`)
  ok('huninin son basamağı = satın alan adımı',
    ana.huni[ana.huni.length - 1].deger === ana.yolculuk[ana.yolculuk.length - 1].kisi)
  const anaDonusum = ana.kpiler.find(k => k.anahtar === 'an_donusum')?.deger
  ok('dönüşüm KPI\'ı yolculuğun iki ucundan geliyor',
    anaDonusum === Math.round((ana.yolculuk[5].kisi / ana.yolculuk[0].kisi) * 1000) / 10,
    String(anaDonusum))
  ok('kasa öncesi terk kasa ve çıkış adımlarından hesaplanmış',
    ana.kasaOncesiTerk
      === Math.round(((ana.yolculuk[4].kisi - ana.yolculuk[5].kisi) / ana.yolculuk[4].kisi) * 100))
  ok('alan payları ziyaretçi sayısına göre',
    ana.alanlar.every(a => a.pay === Math.round((a.ziyaret / ana.yolculuk[0].kisi) * 100)))
  ok('alanlar çoktan aza sıralı',
    ana.alanlar.every((a, i) => i === 0 || a.ziyaret <= ana.alanlar[i - 1].ziyaret))
  ok('hiç uğranmayan alan gizlenmiyor', ana.alanlar.some(a => a.ziyaret === 0))
  const akis = ciz('ModulAkis', <ModulAkis baslik="y" adimlar={ana.yolculuk} dipnot="anonim" />)
  ok('akış çizildi — altı kutu, beş ok',
    (akis.match(/so-akis-adim/g) ?? []).length === 6
    && (akis.match(/so-akis-ok/g) ?? []).length === 5)
  ok('akışta anonimlik dipnotu var', akis.includes('so-akis-dipnot'))

  // ── Kampanya uygulama matrisi ───────────────────────────────────────────
  // Bu ekranın tek iddiası: "hangi kampanyada ne eksik". İddia üç yerde
  // görünüyor (KPI · matris · mağaza karşılaştırması) ve üçü de tek hesaptan
  // gelmek zorunda. Test tam olarak bunu ölçüyor — çelişki jüri önünde değil
  // burada patlasın.
  console.log('\n── kampanya uygulama matrisi ──')
  ok('her satır dört maddeyle ölçülmüş',
    kmp.uygulamalar.every(u => u.isaretler.length === KAMPANYA_MADDELERI.length))
  ok('uygunluk yüzdesi işaretlerden hesaplanmış',
    kmp.uygulamalar.every(u =>
      u.uygunluk === Math.round((u.isaretler.filter(Boolean).length / u.isaretler.length) * 100)))
  ok('eksik listesi işaretlerle birebir',
    kmp.uygulamalar.every(u =>
      u.eksik.join('|') === KAMPANYA_MADDELERI.filter((_, j) => !u.isaretler[j]).join('|')))
  const kmpYayinda = kmp.uygulamalar.filter(u => !u.hazirlikta)
  const kmpOrt = Math.round(kmpYayinda.reduce((t, u) => t + u.uygunluk, 0) / kmpYayinda.length)
  const kmpKpi = kmp.kpiler.find(k => k.anahtar === 'kam_uygulama')
  ok('teşhir uygunluğu KPI\'ı = yayındaki kampanyaların matris ortalaması',
    kmpKpi?.deger === kmpOrt, `${kmpKpi?.deger} ≠ ${kmpOrt}`)
  ok('mağaza karşılaştırması aynı yüzdeyi okuyor',
    kmp.magazalar[0].uygulama === kmpOrt, `${kmp.magazalar[0].uygulama} ≠ ${kmpOrt}`)
  ok('hazırlıktaki kampanya ortalamaya girmiyor',
    kmpYayinda.length === kmp.uygulamalar.length - 1)
  const mtx = ciz('ModulUygunlukMatrisi', (
    <ModulUygunlukMatrisi
      baslik="u" sutunlar={KAMPANYA_MADDELERI} not="n" eylemIpucu="ipucu"
      satirlar={kmp.uygulamalar.map(u => ({
        anahtar: u.kampanya, ad: u.kampanya, alt: u.alan,
        isaretler: u.isaretler, uygunluk: u.uygunluk, eksik: u.eksik,
      }))}
    />
  ))
  ok('matris çizildi', mtx.includes('so-mtx-satir'))
  ok('eksik madde ✗ ile görünür — renk tek başına taşımıyor', mtx.includes('✗'))
  const eksikliN = kmp.uygulamalar.filter(u => u.eksik.length > 0).length
  ok('eksiği olan her satırda pasif "Görev oluştur" düğmesi',
    (mtx.match(/Görev oluştur/g) ?? []).length === eksikliN
    && (mtx.match(/disabled/g) ?? []).length === eksikliN)
  ok('düğme ipucu eksik maddeleri sayıyor', mtx.includes('Eksik: Fiyat etiketi'))
  ok('matriste "yakında" rozeti YOK — rozet sayısı ikide kalıyor',
    !mtx.includes('>yakında<'))

  // ── WhatsApp merkezi ────────────────────────────────────────────────────
  // Buradaki tek asıl kilit şu: baloncuğun gövdesi ekranda YAZILMIYOR,
  // zincirin `mesajGovdesi()` şablonundan geliyor. Şablon değişirse ekran
  // da değişmeli; ikisi ayrışırsa jüriye gösterdiğimiz metin telefondaki
  // metin olmaktan çıkar.
  console.log('\n── whatsapp merkezi ──')
  const wa = whatsappModulu(GUN)
  ok('mesaj kayıtları dolu', wa.kayitlar.length >= 3, String(wa.kayitlar.length))
  ok('kademe sözlüğü zincirinkiyle aynı',
    wa.kayitlar.every(k => ['ilk', 'hatirlatma', 'bolge'].includes(k.kademe)))
  ok('iletim durumları zincirin sözlüğünden — uydurma kelime yok',
    wa.kayitlar.every(k => ['gonderildi', 'teslim', 'okundu'].includes(k.durum)))
  ok('yanıtlı kayıtların düğmesi gerçek aksiyon',
    wa.kayitlar.every(k => !k.yanit || BUTON_AKSIYONLARI.includes(k.yanit.aksiyon)))
  ok('en az bir mesaj hâlâ yanıt bekliyor — hepsi mutlu son değil',
    wa.kayitlar.some(k => !k.yanit))
  ok('aynı göreve hem ilk bildirim hem üst kademe var — eskalasyon görünüyor',
    wa.kayitlar.some(k => k.kademe !== 'ilk'))

  const waHtml = ciz('WaAkisi', <WaAkisi kayitlar={wa.kayitlar} gun={GUN} />)
  ok('baloncuklar çizildi',
    (waHtml.match(/so-wa-balon/g) ?? []).length
      === wa.kayitlar.length + wa.kayitlar.filter(k => k.yanit).length)
  // Gerekçe metninde "<" geçiyor (doluluk < %70); React onu &lt; olarak
  // basıyor. Karşılaştırmadan önce aynı kaçışı biz de uygulamalıyız, yoksa
  // test şablonu değil HTML kaçışını ölçer.
  const kacir = (t: string) => t
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  ok('gövde şablondan geliyor — görev başlığı ve gerekçesi metinde',
    wa.kayitlar.every(k => waHtml.includes(kacir(k.baslik)) && waHtml.includes(kacir(k.gerekce))))
  ok('düğme etiketleri BUTON_ETIKETLERI\'nden',
    BUTON_AKSIYONLARI.every(a => waHtml.includes(BUTON_ETIKETLERI[a])))
  ok('her mesajın hangi göreve ait olduğu yazılı',
    wa.kayitlar.every(k => waHtml.includes(`Görev ${k.gorevNo}`)))
  ok('iletim durumu ekranda Türkçe karşılığıyla',
    waHtml.includes('telefona ulaştı') || waHtml.includes('okundu'))
  ok('dipnot ekranın sorgu atmadığını söylüyor',
    waHtml.includes('so-wa-dipnot') && waHtml.includes('Denetim Kaydı'))
  ok('örnek-veri işareti kapatılamıyor', waHtml.includes('so-ornek-nokta'))
  ok('WhatsApp arayüzü TAKLİT edilmiyor — sahte ekran görüntüsü yok',
    !waHtml.includes('✓✓') && !/wa-?tik/.test(waHtml))
  ok('şablon kademeleri tabloda listeli', wa.sablonlar.length >= 3, String(wa.sablonlar.length))

  console.log('\n── menü ──')
  const sayim = durumSayimi()
  ok('her modülün ekranı var — gri madde yok',
    MODULLER.every(m => m.yol !== undefined), JSON.stringify(MODULLER.filter(m => !m.yol).map(m => m.slug)))
  ok('dört ekran hâlâ gerçek zincirden besleniyor', sayim.canli === 4, String(sayim.canli))
  ok('kalan ekranların hepsi "örnek veri" olarak işaretli',
    sayim['ekran-demo'] === MODULLER.length - 4, String(sayim['ekran-demo']))

  console.log(fail === 0 ? '\n✓ tüm modül ekranı çizim kontrolleri geçti' : `\n✗ ${fail} kontrol düştü`)
  process.exit(fail === 0 ? 0 : 1)
}

main()
