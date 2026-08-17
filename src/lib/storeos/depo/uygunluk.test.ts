// ════════════════════════════════════════════════════════════════════════════
//  Store OS — ORTAK DEPO UYGUNLUK TESTİ (conformance suite)
//
//    npx -y tsx src/lib/storeos/depo/uygunluk.test.ts              # yalnız bellek
//    npx -y tsx src/lib/storeos/depo/uygunluk.test.ts --airtable   # bellek + CANLI base
//
//  AMAÇ: `Depo` arayüzünün İKİ uygulaması da AYNI iddiaları geçsin. Bellek
//  deposu bugüne kadar zincirin tek koşan deposuydu; `airtable.ts` eksiksiz
//  yazılmıştı ama tek bir HTTP isteği bile yapmamıştı. Bu dosya o farkı kapatır:
//  aynı `iddialar()` fonksiyonu her iki depoya da uygulanır. Uygulamaya özel
//  tek istisna `sifirla()` — Airtable'da bilinçli olarak fırlatır (bkz. §6).
//
//  ⚠ --airtable CANLI BASE'E YAZAR. Yazdığı her şey `uyg-` önekli ve
//    `Veri Tipi='demo'`dur; koşu sonunda kendi kayıtlarını siler.
//    TEK İSTİSNA: DenetimKaydi. Denetim append-only'dir, silme yolu YOKTUR —
//    testin bıraktığı 2 satır kalır, bu bir sızıntı değil KANITTIR.
//
//  Emlak/sigorta base'lerine dokunmaz: yalnız STOREOS_AIRTABLE_BASE_ID kullanılır
//  ve o base'in PAT'i başka base göremez (403 ile doğrulandı, 17 Ağu).
// ════════════════════════════════════════════════════════════════════════════

import { AirtableDeposu } from './airtable'
import { BellekDeposu } from './bellek'
import { TABLO } from '../tipler'
import type { Depo } from './tipler'
import type { Bildirim, DenetimSatiri, Gorev, OlayKaydi } from '../tipler'

const AIRTABLE = process.argv.includes('--airtable')

let fail = 0
function ok(ad: string, cond: boolean, extra = '') {
  if (!cond) fail++
  console.log(`  ${cond ? '✓' : '✗ FAIL'}  ${ad}${cond ? '' : `  ${extra}`}`)
}

// ─── İstek sayacı ────────────────────────────────────────────────────────────
// Airtable'a çıkan HER isteği sayar. Madde 3'ün "istek bütçesi" ölçümü buradan
// çıkar: aşağıdaki iddia bloklarının kaç istek harcadığı koşu sonunda basılır.

const gercekFetch = globalThis.fetch
let istekSayisi = 0
globalThis.fetch = ((...a: Parameters<typeof fetch>) => {
  if (String(a[0]).includes('api.airtable.com')) istekSayisi++
  return gercekFetch(...a)
}) as typeof fetch

function sayacSifirla() { istekSayisi = 0 }

// ─── Sabit test verisi ───────────────────────────────────────────────────────
// Date.now()/Math.random() YOK: id'ler sabit, koşu tekrarlanabilir. Aynı id'ler
// ikinci koşuda da kullanılabilsin diye Airtable tarafında ÖNCE temizlik yapılır.

const ETIKET = 'uyg'
const MAGAZA = '0178'
const OLAY_ID = `${ETIKET}-olay-1`
const OLAY_ID_2 = `${ETIKET}-olay-2`
const BILDIRIM_ID = `b-${ETIKET}-G-x-ilk`
const WAMID = `wamid.${ETIKET}.TEST.0001`
const T0 = '2026-08-17T14:00:00+03:00'

function olayKaydi(id: string): OlayKaydi {
  return {
    'Olay ID': id,
    'Magaza Kodu': MAGAZA,
    'Kamera ID': `${MAGAZA}-kasa`,
    'Olay Tipi': 'store.queue.threshold_exceeded',
    'Olustu': T0,
    'Alindi': T0,
    'Severity': 'high',
    'Guven': 0.9,
    'Metadata JSON': JSON.stringify({ queueLength: 7 }),
    'Kaynak Adapter': 'generic',
    'Islendi': false,
    'Veri Tipi': 'demo',
  }
}

function gorevKaydi(no: string): Gorev {
  return {
    'Gorev No': no,
    'Baslik': 'Uygunluk testi gorevi',
    'Aciklama': 'depo/uygunluk.test.ts tarafindan uretildi',
    'Magaza Kodu': MAGAZA,
    'Kaynak Olay ID': OLAY_ID,
    'Kural': 'Kasa kuyrugu esigi',
    'Gerekce': 'uygunluk testi',
    'Atanan Rol': 'magaza_muduru',
    'Oncelik': 'normal',
    'Durum': 'yeni',
    'Olusturuldu': T0,
    'Son Teslim': '2026-08-17T14:10:00+03:00',
    'Kanit Gerekli': false,
    'Veri Tipi': 'demo',
  }
}

function bildirimKaydi(govde: string, gorevNo: string): Bildirim {
  return {
    'Bildirim ID': BILDIRIM_ID,
    'Gorev No': gorevNo,
    'Olay ID': OLAY_ID,
    'Kanal': 'whatsapp',
    'Alici Kullanici ID': 'u-magaza_muduru-1',
    'Alici Telefon': '+900000000001',
    'Gonderilen Telefon': '+905303227450',
    'Govde': govde,
    'Gonderim Zamani': T0,
    'Durum': 'gonderildi',
    'Saglayici Mesaj ID': WAMID,
  }
}

function denetimSatiri(kayitId: string, entityId: string): DenetimSatiri {
  return {
    'Kayit ID': kayitId,
    'Zaman': T0,
    'Aktor': 'uygunluk-testi',
    'Aktor Tipi': 'system',
    'Aksiyon': 'test.uygunluk',
    'Entity Tipi': 'gorev',
    'Entity ID': entityId,
    'Kaynak': 'seed',
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  ORTAK İDDİALAR — iki depo da BUNLARI geçmek zorunda.
// ════════════════════════════════════════════════════════════════════════════

async function iddialar(d: Depo) {
  const e = `[${d.ad}]`

  // ── 1. Olaylar: idempotent yazım ───────────────────────────────────────────
  ok(`${e} bilinmeyen olay için varMi=false`, (await d.olaylar.varMi(OLAY_ID)) === false)

  const ilk = await d.olaylar.yazIlkKez(olayKaydi(OLAY_ID))
  ok(`${e} yazIlkKez ilk çağrıda true`, ilk === true)

  const ikinci = await d.olaylar.yazIlkKez(olayKaydi(OLAY_ID))
  ok(`${e} yazIlkKez AYNI id'de false — çift kayıt yok`, ikinci === false)

  ok(`${e} yazımdan sonra varMi=true`, (await d.olaylar.varMi(OLAY_ID)) === true)

  const cekilen = await d.olaylar.getir(OLAY_ID)
  ok(`${e} getir kaydı döndürür`, cekilen?.['Olay ID'] === OLAY_ID)
  ok(`${e} getir alanları korur (Guven=0.9)`, cekilen?.['Guven'] === 0.9)
  ok(`${e} getir Veri Tipi='demo' taşır`, cekilen?.['Veri Tipi'] === 'demo')
  ok(`${e} bilinmeyen id'de getir=null`, (await d.olaylar.getir(`${ETIKET}-yok`)) === null)

  // ── 2. Olaylar: işaretleme + listeleme ─────────────────────────────────────
  await d.olaylar.isaretle(OLAY_ID, { 'Islendi': true, 'Eslesen Kural': 'Kasa kuyrugu esigi' })
  const isaretli = await d.olaylar.getir(OLAY_ID)
  ok(`${e} isaretle Islendi=true yazar`, isaretli?.['Islendi'] === true)
  ok(`${e} isaretle Eslesen Kural yazar`, isaretli?.['Eslesen Kural'] === 'Kasa kuyrugu esigi')

  await d.olaylar.yazIlkKez(olayKaydi(OLAY_ID_2))
  const olayListe = await d.olaylar.listele({ magazaKodu: MAGAZA })
  const idler = olayListe.map(o => o['Olay ID'])
  ok(`${e} listele mağaza filtresiyle iki olayı da getirir`,
     idler.includes(OLAY_ID) && idler.includes(OLAY_ID_2), idler.join(','))
  ok(`${e} listele başka mağazada bu olayları getirmez`,
     (await d.olaylar.listele({ magazaKodu: '9999' }))
       .every(o => o['Olay ID'] !== OLAY_ID))

  // ── 3. Kurallar ────────────────────────────────────────────────────────────
  const hepsi = await d.kurallar.hepsi()
  ok(`${e} hepsi() kural döndürür`, hepsi.length > 0, `${hepsi.length}`)

  const aktif = await d.kurallar.aktifKurallar('store.queue.threshold_exceeded')
  ok(`${e} aktifKurallar yalnız istenen olay tipini verir`,
     aktif.length > 0 && aktif.every(k => k['Olay Tipi'] === 'store.queue.threshold_exceeded'))
  ok(`${e} aktifKurallar yalnız Aktif=true verir`, aktif.every(k => k['Aktif'] === true))
  ok(`${e} aktifKurallar Sira'ya göre ARTAN sıralı`,
     aktif.every((k, i) => i === 0 || aktif[i - 1]!['Sira'] <= k['Sira']),
     aktif.map(k => k['Sira']).join('<'))
  ok(`${e} aktifKurallar(tipsiz) tüm aktifleri verir`,
     (await d.kurallar.aktifKurallar()).length >= aktif.length)

  // ── 4. Görevler ────────────────────────────────────────────────────────────
  const no1 = await d.gorevler.sonrakiNumara()
  ok(`${e} sonrakiNumara G-###### biçiminde`, /^G-\d{6}$/.test(no1), no1)

  await d.gorevler.olustur(gorevKaydi(no1))
  const no2 = await d.gorevler.sonrakiNumara()
  ok(`${e} sonrakiNumara yazımdan sonra ARTAR`,
     Number(no2.slice(2)) > Number(no1.slice(2)), `${no1} → ${no2}`)

  const g = await d.gorevler.getir(no1)
  ok(`${e} görev getir çalışır`, g?.['Gorev No'] === no1)
  ok(`${e} görev başlangıç durumu 'yeni'`, g?.['Durum'] === 'yeni')
  ok(`${e} bilinmeyen görev no'da getir=null`, (await d.gorevler.getir('G-999999')) === null)

  const guncel = await d.gorevler.guncelle(no1, { 'Durum': 'basladi', 'Baslandi': T0 })
  ok(`${e} guncelle DÖNÜŞ değerinde yeni durum var`, guncel['Durum'] === 'basladi')
  ok(`${e} guncelle KALICI (yeniden okundu)`,
     (await d.gorevler.getir(no1))?.['Durum'] === 'basladi')
  ok(`${e} guncelle dokunulmayan alanı silmez`,
     (await d.gorevler.getir(no1))?.['Baslik'] === 'Uygunluk testi gorevi')

  let guncelleHatasi = false
  try { await d.gorevler.guncelle('G-999999', { 'Durum': 'basladi' }) }
  catch { guncelleHatasi = true }
  ok(`${e} olmayan görevi guncelle FIRLATIR (sessizce yaratmaz)`, guncelleHatasi)

  ok(`${e} olayVeKuraldanVarMi eşleşmede true`,
     (await d.gorevler.olayVeKuraldanVarMi(OLAY_ID, 'Kasa kuyrugu esigi')) === true)
  ok(`${e} olayVeKuraldanVarMi farklı kuralda false`,
     (await d.gorevler.olayVeKuraldanVarMi(OLAY_ID, 'Baska kural')) === false)
  ok(`${e} olayVeKuraldanVarMi farklı olayda false`,
     (await d.gorevler.olayVeKuraldanVarMi(OLAY_ID_2, 'Kasa kuyrugu esigi')) === false)

  const gorevListe = await d.gorevler.listele({ magazaKodu: MAGAZA, durum: 'basladi' })
  ok(`${e} listele durum filtresi çalışır`,
     gorevListe.some(x => x['Gorev No'] === no1) && gorevListe.every(x => x['Durum'] === 'basladi'))

  // ── 5. Bildirimler ─────────────────────────────────────────────────────────
  const b1 = await d.bildirimler.olusturIlkKez(bildirimKaydi('ILK GOVDE', no1))
  ok(`${e} olusturIlkKez ilk çağrıda ilkKez=true`, b1.ilkKez === true)

  const b2 = await d.bildirimler.olusturIlkKez(bildirimKaydi('IKINCI GOVDE', no1))
  ok(`${e} olusturIlkKez ikinci çağrıda ilkKez=false`, b2.ilkKez === false)
  // Sözleşme: ilkKez=false ise dönen kayıt MEVCUT olandır, yeni gönderilen değil.
  // Bu, "kullanıcı ikinci mesajı almaz" garantisinin taşıyıcısıdır.
  ok(`${e} ilkKez=false MEVCUT kaydı döndürür (yeni gövdeyi değil)`,
     b2.bildirim['Govde'] === 'ILK GOVDE', b2.bildirim['Govde'])
  ok(`${e} tek bildirim kaydı var`,
     (await d.bildirimler.listele({ gorevNo: no1 })).length === 1)

  ok(`${e} saglayiciMesajIdIle wamid'den bulur`,
     (await d.bildirimler.saglayiciMesajIdIle(WAMID))?.['Bildirim ID'] === BILDIRIM_ID)
  ok(`${e} bilinmeyen wamid'de null`,
     (await d.bildirimler.saglayiciMesajIdIle('wamid.YOK')) === null)

  await d.bildirimler.guncelle(BILDIRIM_ID, { 'Yanit': 'kabul', 'Yanit Zamani': T0 })
  ok(`${e} bildirim guncelle KALICI`,
     (await d.bildirimler.getir(BILDIRIM_ID))?.['Yanit'] === 'kabul')

  // ── 6. Denetim — APPEND ONLY ───────────────────────────────────────────────
  // Yapısal iddia: arayüzde silme/güncelleme kapısı AÇILMAMIŞ olmalı.
  // Bu, yorumla değil kodla korunan tek garantidir (kabul kriteri 5).
  const yasak = ['sil', 'guncelle', 'temizle', 'duzelt', 'delete', 'update']
  const denetimAnahtarlari = Object.keys(d.denetim)
  ok(`${e} denetim'de silme/güncelleme metodu YOK`,
     yasak.every(k => !denetimAnahtarlari.includes(k)), denetimAnahtarlari.join(','))
  ok(`${e} denetim yalnız yaz+listele sunar`,
     denetimAnahtarlari.sort().join(',') === 'listele,yaz', denetimAnahtarlari.join(','))

  await d.denetim.yaz(denetimSatiri(`${ETIKET}-den-1`, no1))
  await d.denetim.yaz(denetimSatiri(`${ETIKET}-den-2`, no1))
  const denetimListe = await d.denetim.listele({ entityId: no1 })
  ok(`${e} denetim iki satırı da tutar (üzerine yazmaz)`,
     denetimListe.length >= 2, `${denetimListe.length}`)
  ok(`${e} denetim entityId filtresi çalışır`,
     denetimListe.every(s => s['Entity ID'] === no1))

  // ── 7. Referans veri ───────────────────────────────────────────────────────
  ok(`${e} magaza(0178) bulunur`, (await d.referans.magaza(MAGAZA))?.['Kod'] === MAGAZA)
  ok(`${e} bilinmeyen mağaza null`, (await d.referans.magaza('9999')) === null)
  ok(`${e} kameralar dolu`, (await d.referans.kameralar(MAGAZA)).length > 0)
  ok(`${e} kullanicilar dolu`, (await d.referans.kullanicilar(MAGAZA)).length > 0)
  ok(`${e} metrikler dolu`, (await d.referans.metrikler(MAGAZA)).length > 0)

  const mudur = await d.referans.rolIcinKullanici(MAGAZA, 'magaza_muduru')
  ok(`${e} rolIcinKullanici doğru rolü verir`, mudur?.['Rol'] === 'magaza_muduru')
  ok(`${e} rolIcinKullanici yalnız Aktif kullanıcı verir`, mudur?.['Aktif'] === true)
  ok(`${e} olmayan rolde null`, (await d.referans.rolIcinKullanici(MAGAZA, 'yok_boyle_rol')) === null)

  // ── 8. Metrikler madde 11 işaretini taşır ──────────────────────────────────
  const metrikler = await d.referans.metrikler(MAGAZA)
  ok(`${e} her metrik Veri Tipi taşır (dürüstlük işareti)`,
     metrikler.every(m => m['Veri Tipi'] === 'demo' || m['Veri Tipi'] === 'gercek'),
     metrikler.filter(m => !m['Veri Tipi']).length + ' işaretsiz')
}

// ════════════════════════════════════════════════════════════════════════════
//  Airtable temizliği
//
//  Silme YOLU BİLİNÇLİ OLARAK BURADA — `depo/airtable.ts`'e değil. Depo
//  katmanında silme metodu olsaydı denetim tablosuna da uzanabilecek bir kapı
//  açılırdı. Bu helper yalnız bu testin ürettiği kayıtları, ad ad hedefleyerek
//  siler ve DenetimKaydi'na ASLA dokunmaz (aşağıdaki tablo listesine bak).
// ════════════════════════════════════════════════════════════════════════════

const TEMIZLENECEK: { tablo: string; alan: string; degerler: string[] }[] = [
  { tablo: TABLO.olaylar,     alan: 'Olay ID',     degerler: [OLAY_ID, OLAY_ID_2] },
  { tablo: TABLO.bildirimler, alan: 'Bildirim ID', degerler: [BILDIRIM_ID] },
  // TABLO.gorevler ayrı ele alınır: numara koşuda belirlenir (Gerekce eşleşmesi).
  // TABLO.denetim YOK — append-only.
]

async function at(yol: string, init: RequestInit = {}) {
  const r = await gercekFetch(`https://api.airtable.com/v0/${process.env.STOREOS_AIRTABLE_BASE_ID}${yol}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.STOREOS_AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  if (!r.ok) throw new Error(`Airtable ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return r.json() as Promise<{ records: { id: string }[] }>
}

async function silFormulle(tablo: string, formul: string): Promise<number> {
  const { records } = await at(`/${encodeURIComponent(tablo)}?filterByFormula=${encodeURIComponent(formul)}&pageSize=100`)
  if (!records.length) return 0
  const q = records.map(r => `records[]=${r.id}`).join('&')
  await at(`/${encodeURIComponent(tablo)}?${q}`, { method: 'DELETE' })
  return records.length
}

function esitlikYada(alan: string, degerler: string[]): string {
  return `OR(${degerler.map(v => `{${alan}}='${v}'`).join(',')})`
}

async function airtableTemizle(etiket: string): Promise<number> {
  let toplam = 0
  for (const t of TEMIZLENECEK) toplam += await silFormulle(t.tablo, esitlikYada(t.alan, t.degerler))
  // Görevler: numara koşuya göre değişir, Gerekce sabittir.
  toplam += await silFormulle(TABLO.gorevler, `{Gerekce}='uygunluk testi'`)
  console.log(`  [${etiket}] ${toplam} test kaydı silindi (DenetimKaydi'na dokunulmadı)`)
  return toplam
}

// ════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n╔══ ORTAK DEPO UYGUNLUK TESTİ ══════════════════════════════════╗')

  console.log('\n[BELLEK]')
  await iddialar(new BellekDeposu())

  // sifirla() — tek uygulamaya özel davranış, bilinçli ayrım.
  const bd = new BellekDeposu()
  await bd.olaylar.yazIlkKez(olayKaydi('sifirla-testi'))
  await bd.sifirla()
  ok('[bellek] sifirla() olayları temizler',
     (await bd.olaylar.varMi('sifirla-testi')) === false)
  ok('[bellek] sifirla() referans veriyi geri yükler',
     (await bd.referans.magaza(MAGAZA)) !== null)

  if (!AIRTABLE) {
    console.log('\n[AIRTABLE] ATLANDI — çalıştırmak için: --airtable')
    console.log('           (kontroller.mjs çevrimdışı kalsın diye varsayılan kapalı)')
  } else if (!process.env.STOREOS_AIRTABLE_BASE_ID || !process.env.STOREOS_AIRTABLE_API_KEY) {
    console.log('\n✗ --airtable verildi ama STOREOS_AIRTABLE_BASE_ID/API_KEY yok')
    fail++
  } else {
    console.log(`\n[AIRTABLE] base=${process.env.STOREOS_AIRTABLE_BASE_ID}`)
    console.log('  önceki koşudan kalan varsa temizleniyor:')
    await airtableTemizle('ön-temizlik')

    sayacSifirla()
    const ad = new AirtableDeposu()
    try {
      await iddialar(ad)

      let sifirlaFirlatti = false
      try { await ad.sifirla() } catch { sifirlaFirlatti = true }
      ok('[airtable] sifirla() FIRLATIR — silme yolu uygulama içinden kapalı', sifirlaFirlatti)
    } finally {
      const harcanan = istekSayisi
      console.log(`\n  ── İSTEK BÜTÇESİ: uygunluk paketi ${harcanan} Airtable isteği harcadı`)
      console.log('  son temizlik:')
      await airtableTemizle('son-temizlik')
      console.log('  NOT: DenetimKaydi\'ndaki 2 test satırı BİLEREK duruyor — append-only kanıtı.')
    }
  }

  if (fail) { console.log(`\n✗ ${fail} uygunluk kontrolü BAŞARISIZ\n`); process.exit(1) }
  console.log('\n✓ tüm depo uygunluk kontrolleri geçti — iki uygulama da aynı sözleşmeyi tutuyor\n')
}

main().catch(e => { console.error(e); process.exit(1) })
