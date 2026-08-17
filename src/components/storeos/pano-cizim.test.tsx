// ════════════════════════════════════════════════════════════════════════════
//  Store OS — pano ÇİZİM kontrolü.
//  `npx -y tsx src/components/storeos/pano-cizim.test.tsx`
//
//  `tsc` bir bileşenin ÇALIŞTIĞINI söylemez, yalnız tiplerin tuttuğunu söyler.
//  Gün 7 düzeninde on üç kutu yeniden yazıldı; biri gerçek veriyle patlarsa
//  bunu jüri ekranında değil burada görmek gerekiyor.
//
//  Her panel ÜÇ durumda çizilir:
//    · null      → iskelet (veri henüz taşınmadı)
//    · boş       → sabit yükseklikli boş durum (ekranın ortası kaplanmaz)
//    · gerçek    → `panoTopla()`nın demo zincirden ürettiği veri
//
//  Ayrıca düzenin OMURGASI doğrulanır: dört satır sınıfı, tek örnek-veri bandı,
//  kart başına en fazla bir dürüstlük noktası.
// ════════════════════════════════════════════════════════════════════════════

import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
// Göreli yol BİLEREK: `@/` alias'ı ile aynı modül tsx altında ikinci kez
// yüklenir ve bellek deposunun tekil örneği ikiye ayrılır (depo `undefined`
// görünür). Toplayıcı da göreli import ediyor; aynı örneği paylaşmalıyız.
import { bellekDeposunuZorla } from '../../lib/storeos/depo'
import { olaylariAl } from '../../lib/storeos/olay-alim'
import { panoTopla } from '../../lib/storeos/dashboard/toplayici'
import { AnlikDurum, KpiSeridi, MagazaBasligi, SkorKart } from './kartlar'
import { DonutDagilimi, IzgaraHaritasi } from './grafikler'
import {
  GorevPaneli, HizliIslemler, KameraPaneli, KasaPaneli,
  KuyrukPaneli, OneriPaneli, SatisPaneli, StokPaneli,
} from './paneller'
import { OrnekBant } from './temel'

let fail = 0
function ok(ad: string, cond: boolean, extra = '') {
  if (!cond) fail++
  console.log(`  ${cond ? '✓' : '✗ FAIL'}  ${ad}${cond ? '' : `  ${extra}`}`)
}

/** Çizim patlarsa testi düşürür; patlamazsa HTML'i döndürür. */
function ciz(ad: string, el: ReactElement): string {
  try {
    return renderToStaticMarkup(el)
  } catch (e) {
    fail++
    console.log(`  ✗ FAIL  ${ad} çizerken hata: ${(e as Error).message}`)
    return ''
  }
}

const MAGAZA = '0178'
const SIMDI_ISO = '2026-08-17T14:35:30+03:00'
const SIMDI = Date.parse(SIMDI_ISO)

const ORTAK = {
  aktor: 'test', aktorTipi: 'partner' as const, kaynak: 'simulator' as const,
  simdi: SIMDI_ISO,
}

const OLAYLAR: Array<[string, string, Record<string, unknown>]> = [
  ['cizim-kuyruk', 'store.queue.threshold_exceeded',
   { registerId: 'kasa-2', queueLength: 9, avgWaitSeconds: 252, maxWaitSeconds: 300 }],
  ['cizim-raf', 'store.shelf.gap_detected',
   { shelfId: 'raf-A3', categoryName: 'Cilt Bakim', gapRatio: 0.42 }],
]

async function main() {
  const d = bellekDeposunuZorla()

  // İKİ olay: biri kritik kasa kuyruğu, biri raf boşluğu. Kural motoru bunlardan
  // gerçek alarm + gerçek görev üretir — öneri ve görev panelleri BOŞ değil DOLU
  // çizilsin ki test sahte bir "geçti" vermesin.
  for (const [id, tip, meta] of OLAYLAR) {
    const sonuc = await olaylariAl({
      depo: d, ...ORTAK,
      govde: {
        id, storeCode: MAGAZA, cameraId: `${MAGAZA}-kasa`,
        eventType: tip, occurredAt: '2026-08-17T14:20:00+03:00',
        severity: 'high', confidence: 0.91, metadata: meta,
      },
    })
    if (sonuc.kabul !== 1) {
      fail++
      console.log(`  ✗ FAIL  ${id} alınamadı: ${JSON.stringify(sonuc.sonuclar)}`)
    }
  }
  const v = await panoTopla({ depo: d, magazaKodu: MAGAZA, katman: 'tam', simdi: SIMDI })

  // Panellerin BOŞ hâlini test edip "geçti" demek en kolay yalan olurdu.
  ok('zincir gerçek alarm üretti', (v.alarmlar?.length ?? 0) > 0, String(v.alarmlar?.length))
  ok('zincir gerçek görev üretti', (v.gorevler?.length ?? 0) > 0, String(v.gorevler?.length))
  ok('metrikler taşındı', (v.kpiler?.length ?? 0) >= 6, String(v.kpiler?.length))
  ok('kameralar taşındı', (v.kameralar?.length ?? 0) >= 3, String(v.kameralar?.length))

  // ── 1. Gerçek veriyle her kutu çiziliyor mu ──────────────────────────────
  console.log('\n── gerçek veri ile çizim ──')
  const parcalar: Array<[string, ReactElement]> = [
    ['MagazaBasligi',  <MagazaBasligi magaza={v.magaza} />],
    ['SkorKart',       <SkorKart skor={v.saglikSkoru} />],
    ['KpiSeridi',      <KpiSeridi kartlar={v.kpiler} />],
    ['AnlikDurum',     <AnlikDurum kpiler={v.kpiler} magaza={v.magaza} />],
    ['KameraPaneli',   <KameraPaneli kameralar={v.kameralar} />],
    ['OneriPaneli',    <OneriPaneli alarmlar={v.alarmlar} simdiMs={SIMDI} />],
    ['GorevPaneli',    <GorevPaneli gorevler={v.gorevler} ozet={v.gorevOzeti} />],
    ['KuyrukPaneli',   <KuyrukPaneli seri={v.kuyrukSerisi} kpiler={v.kpiler} />],
    ['StokPaneli',     <StokPaneli rafDoluluk={v.rafDoluluk} />],
    ['IzgaraHaritasi', <IzgaraHaritasi izgara={v.yogunlukIzgarasi} />],
    ['SatisPaneli',    <SatisPaneli seri={v.satisSerisi} kpiler={v.kpiler} />],
    ['KasaPaneli',     <KasaPaneli magaza={v.magaza} kpiler={v.kpiler} />],
    ['DonutDagilimi',  <DonutDagilimi dagilim={v.personelDagilimi} baslik="Personel Dağılımı" />],
    ['HizliIslemler',  <HizliIslemler />],
  ]
  const html: Record<string, string> = {}
  for (const [ad, el] of parcalar) {
    const h = ciz(ad, el)
    html[ad] = h
    ok(`${ad} çizildi`, h.length > 0)
  }

  // ── 2. null (veri taşınmadı) → iskelet, çökme yok ────────────────────────
  console.log('\n── null durumu (iskelet) ──')
  const bosParcalar: Array<[string, ReactElement]> = [
    ['SkorKart',       <SkorKart skor={null} />],
    ['KpiSeridi',      <KpiSeridi kartlar={null} />],
    ['AnlikDurum',     <AnlikDurum kpiler={null} magaza={null} />],
    ['KameraPaneli',   <KameraPaneli kameralar={null} />],
    ['OneriPaneli',    <OneriPaneli alarmlar={null} simdiMs={SIMDI} />],
    ['GorevPaneli',    <GorevPaneli gorevler={null} ozet={null} />],
    ['KuyrukPaneli',   <KuyrukPaneli seri={null} kpiler={null} />],
    ['StokPaneli',     <StokPaneli rafDoluluk={null} />],
    ['IzgaraHaritasi', <IzgaraHaritasi izgara={null} />],
    ['SatisPaneli',    <SatisPaneli seri={null} kpiler={null} />],
    ['KasaPaneli',     <KasaPaneli magaza={null} kpiler={null} />],
    ['DonutDagilimi',  <DonutDagilimi dagilim={null} baslik="Personel" />],
  ]
  for (const [ad, el] of bosParcalar) {
    const h = ciz(`${ad} (null)`, el)
    ok(`${ad} null'da iskelet`, h.includes('so-iskelet'), h.slice(0, 80))
  }

  // ── 3. BOŞ liste → sabit yükseklikli boş durum ───────────────────────────
  // "Veri yok" hata değildir; ama boş kutu ekranın ortasını kaplamamalı.
  console.log('\n── boş liste durumu ──')
  const bosOneri = ciz('OneriPaneli (boş)', <OneriPaneli alarmlar={[]} simdiMs={SIMDI} />)
  ok('boş öneri paneli sabit yükseklikli', bosOneri.includes('so-durum so-bos'), bosOneri.slice(0, 120))
  const bosGorev = ciz('GorevPaneli (boş)', <GorevPaneli gorevler={[]} ozet={null} />)
  ok('boş görev paneli sabit yükseklikli', bosGorev.includes('so-durum so-bos'), bosGorev.slice(0, 120))

  // ── 4. DÜRÜSTLÜK (madde 11) — bant + nokta ───────────────────────────────
  console.log('\n── dürüstlük işaretleri ──')
  const bant = ciz('OrnekBant', <OrnekBant veriTipi={v.veriTipi} />)
  ok('demo veride üst bant çizildi', v.veriTipi !== 'demo' || bant.includes('so-ornek-bant'))
  ok('gerçek veride bant çizilmiyor', ciz('OrnekBant gercek', <OrnekBant veriTipi="gercek" />) === '')

  const demoKutular = Object.entries(html).filter(([, h]) => h.includes('so-ornek-nokta'))
  ok('demo besleyen kutular nokta taşıyor', demoKutular.length >= 5, `bulunan=${demoKutular.length}`)
  for (const [ad, h] of demoKutular) {
    const adet = h.split('so-ornek-nokta').length - 1
    ok(`${ad}: kart başına tek nokta`, adet <= (ad === 'KpiSeridi' ? 5 : 1), `adet=${adet}`)
  }

  // Eski 13 rozetli gösterim geri gelmesin.
  const rozetli = Object.entries(html).filter(([, h]) => h.includes('class="so-ornek"'))
  ok('kartlarda eski "örnek veri" rozeti kalmadı', rozetli.length === 0, rozetli.map(r => r[0]).join(','))

  // ── 5. Uydurma sayı yok ──────────────────────────────────────────────────
  // `onceki` taşınmayan bir KPI "%0 vs dün" yazamaz; delta ya gerçektir ya yok.
  console.log('\n── uydurma sayı yok ──')
  const oncekisiz = (v.kpiler ?? []).filter(k => k.yerlesim === 'kart' && k.onceki === null)
  const kpiHtml = html['KpiSeridi'] ?? ''
  ok('önceki değeri olmayan KPI delta yazmıyor',
    oncekisiz.length === 0 || !kpiHtml.includes('%0 vs dün'),
    `oncekisiz=${oncekisiz.length}`)
  ok('kasa paneli eksik kırılımı açıkça söylüyor', (html['KasaPaneli'] ?? '').includes('so-kart-not'))
  ok('kamera karesi yer tutucu olduğunu yazıyor', (html['KameraPaneli'] ?? '').includes('YER TUTUCU'))

  // ── 6. Yeni düzenin ASIL vaatleri gerçekten ekranda mı ───────────────────
  // Delta ve mini trend "olsa iyi olur" değil, Gün 7'nin iki maddesi. Veri
  // taşınmıyorsa kart sessizce eski hâline döner ve kimse fark etmez.
  console.log('\n── düzenin vaatleri ──')
  const kartKpi = (v.kpiler ?? []).filter(k => k.yerlesim === 'kart')
  ok('tam 5 KPI kartı var (11 değil)', kartKpi.length === 5, String(kartKpi.length))
  ok('kalan metrikler Anlık Durum listesine düştü',
    (v.kpiler ?? []).filter(k => k.yerlesim === 'durum').length === (v.kpiler ?? []).length - 5)
  ok('KPI kartları düne göre karşılaştırma taşıyor',
    kartKpi.every(k => k.onceki !== null), kartKpi.filter(k => k.onceki === null).map(k => k.anahtar).join(','))
  ok('KPI kartları mini trend taşıyor',
    kartKpi.every(k => (k.trend?.length ?? 0) >= 2), kartKpi.filter(k => !k.trend).map(k => k.anahtar).join(','))
  ok('kartlarda delta satırı çizildi', (kpiHtml.match(/so-kpi-delta/g) ?? []).length === 5)
  ok('kartlarda kıvılcım çizgisi çizildi', (kpiHtml.match(/so-kpi-trend/g) ?? []).length === 5)
  ok('sağlık skoru yarım daire gösterge çizdi',
    (html['SkorKart'] ?? '').includes('stroke-dasharray') && (html['SkorKart'] ?? '').includes('so-skor-deger'))
  ok('sağlık skoru gerekçesini yazıyor', (v.saglikSkoru?.gerekce ?? '').length > 10, v.saglikSkoru?.gerekce)

  console.log(fail === 0 ? '\n✓ tüm pano çizim kontrolleri geçti' : `\n✗ ${fail} kontrol düştü`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(1) })
