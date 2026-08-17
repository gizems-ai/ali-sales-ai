// ════════════════════════════════════════════════════════════════════════════
//  Store OS — ZİNCİR KONTROLLERİ (Gün 5)
//  `npx -y tsx src/lib/storeos/zincir.test.ts`
//
//  Neyi koruyor:
//   · BUTON ID İLERİ-GERİ — ürettiğimiz id'yi geri çözebiliyoruz, bozuk/eski
//     sürümlü id'yi çözemediğimizi BİLİYORUZ (sessizce yanlış görevi açmaz).
//   · BİLDİRİM IDEMPOTENCY — aynı görev+kademe iki mesaj DOĞURMAZ; farklı
//     kademe doğurur (yoksa eskalasyon imkânsız olurdu).
//   · DURUM GEÇİŞİ + ÇAKIŞMA — iyimser kilit: bayat ekran 'cakisma' alır,
//     geçersiz geçiş 'gecersiz_gecis'. İkisi ayrı kod, ayrı mesaj.
//   · YETKİ — Store OS'te tanımsız Clerk kullanıcısı, başka mağaza, başkasının
//     görevi: varsayılan REDDET.
//   · GELEN YÖN — yanlış telefondan gelen yanıt görevi değiştirmez; yanlış
//     bildirime ait buton kabul edilmez; tekrar basış yutulur.
//   · ESKALASYON KADEMELERİ — 5/10/20 dk eşikleri ve tekrar tetiklenmeme.
//   · DENETİM — her halka iz bırakıyor.
// ════════════════════════════════════════════════════════════════════════════

import { KADEMELER, bildirimGonder, bildirimIdUret, gorevIcinIlkBildirim } from './bildirim'
import { bellekDeposunuZorla } from './depo'
import type { Depo } from './depo'
import { eskalasyonKontrol } from './eskalasyon'
import { gecisYap, gorevErtele } from './gorev'
import { yanitiIsle } from './inbound'
import { konsolKanaliniZorla } from './kanal'
import { BUTON_ETIKETLERI, butonIdCoz, butonIdUret } from './kanal/buton'
import { sahteButonYaniti, sahteMetinYaniti } from './kanal/sahte-inbound'
import { olaylariAl } from './olay-alim'
import type { Bildirim, Gorev, Kullanici } from './tipler'
import { gorevYetkisi, normalizeTelefon, telefonEslesmesi } from './yetki'

let fail = 0
function ok(ad: string, cond: boolean, extra = '') {
  if (!cond) fail++
  console.log(`  ${cond ? '✓' : '✗ FAIL'}  ${ad}${cond ? '' : `  ${extra}`}`)
}

const MAGAZA = '0178'
const T0 = '2026-08-14T14:00:00+03:00'
const KANAL = konsolKanaliniZorla()

/** Konsol kanalı her mesajı basıyor; test çıktısı okunur kalsın. */
const gercekLog = console.log
function sessizce<T>(f: () => Promise<T>): Promise<T> {
  console.log = () => {}
  return f().finally(() => { console.log = gercekLog })
}

const KUYRUK_OLAYI = (id: string, zaman = T0) => ({
  id, storeCode: MAGAZA, cameraId: `${MAGAZA}-kasa`,
  eventType: 'store.queue.threshold_exceeded',
  occurredAt: zaman, severity: 'high', confidence: 0.91,
  metadata: { registerId: 'kasa-2', queueLength: 7, avgWaitSeconds: 252, maxWaitSeconds: 180 },
})

/** Zincirin başını koşturup görev + bildirimi döndürür. */
async function zinciriBaslat(depo: Depo, olayId = 'evt-t-001', simdi = T0) {
  const alim = await sessizce(() => olaylariAl({
    depo, kanal: KANAL, govde: KUYRUK_OLAYI(olayId, simdi), adapterAdi: 'generic',
    aktor: 'test', aktorTipi: 'partner', kaynak: 'simulator', simdi,
  }))
  const s = alim.sonuclar[0]
  const gorevNo = s?.uretilenGorevler?.[0] ?? ''
  const bildirimId = s?.bildirimler?.[0]?.bildirimId ?? ''
  const gorev = (await depo.gorevler.getir(gorevNo)) as Gorev
  const bildirim = (await depo.bildirimler.getir(bildirimId)) as Bildirim
  return { alim, gorev, bildirim }
}

/**
 * DİKKAT — `bellekDeposunuZorla()` TEK BİR örnek döndürür (süreç-içi singleton).
 * `sifirla()` o örneği temizler; yani bölüm bölüm alınan `d1..d10` aynı nesnedir.
 * Bu yüzden denetim izini bölüm SONUNDA anında fotoğraflıyoruz — sonraki bölümün
 * sıfırlaması izi silmeden.
 */
async function izAl(d: Depo): Promise<Set<string>> {
  return new Set((await d.denetim.listele({ limit: 500 })).map(s => s['Aksiyon']))
}

function kullanici(y: Partial<Kullanici>): Kullanici {
  return {
    'Kullanici ID': 'u-x', 'Ad Soyad': 'Test', 'Rol': 'personel',
    'Magaza Kodu': MAGAZA, 'Telefon': '+905551112233', 'Aktif': true, ...y,
  }
}

async function main() {
  console.log('\n── Store OS zincir kontrolleri ──────────────────────────────\n')

  // ═══ 1. BUTON ID İLERİ-GERİ ═══════════════════════════════════════════════
  console.log('1) Buton id ileri-geri çözümlemesi')
  const kimlik = { gorevNo: 'G-000042', aksiyon: 'kabul' as const, bildirimId: 'b-G-000042-ilk' }
  const id = butonIdUret(kimlik)
  ok('biçim sürüm önekiyle başlıyor', id === 'so1:gorev:G-000042:kabul:b-G-000042-ilk', id)
  const geri = butonIdCoz(id)
  ok('geri çözüldü ve birebir aynı', JSON.stringify(geri) === JSON.stringify(kimlik), JSON.stringify(geri))

  for (const a of ['kabul', 'devret', 'ertele'] as const) {
    const r = butonIdCoz(butonIdUret({ ...kimlik, aksiyon: a }))
    ok(`  '${a}' aksiyonu korunuyor (etiket: ${BUTON_ETIKETLERI[a]})`, r?.aksiyon === a)
  }

  // Çözülemeyecekler — hepsi null DÖNMELİ, tahmin ETMEMELİ.
  const bozuklar: [string, unknown][] = [
    ['boş', ''],
    ['null', null],
    ['sayı', 42],
    ['eski sürüm öneki', 'so0:gorev:G-1:kabul:b-1'],
    ['önek yok', 'gorev:G-1:kabul:b-1'],
    ['eksik parça', 'so1:gorev:G-1:kabul'],
    ['fazla parça', 'so1:gorev:G-1:kabul:b-1:ekstra'],
    ['tanınmayan aksiyon', 'so1:gorev:G-1:sil:b-1'],
    ['tanınmayan entity', 'so1:olay:G-1:kabul:b-1'],
  ]
  for (const [ad, x] of bozuklar) ok(`  reddediliyor: ${ad}`, butonIdCoz(x) === null, String(x))

  ok('boş görev no ile id üretilemez',
    (() => { try { butonIdUret({ ...kimlik, gorevNo: '' }); return false } catch { return true } })())
  ok('ayraç içeren görev no reddediliyor',
    (() => { try { butonIdUret({ ...kimlik, gorevNo: 'G:1' }); return false } catch { return true } })())

  // ═══ 2. BİLDİRİM IDEMPOTENCY ══════════════════════════════════════════════
  console.log('\n2) Bildirim idempotency')
  const d1 = bellekDeposunuZorla(); await d1.sifirla()
  const z = await zinciriBaslat(d1)
  ok('görev doğdu', !!z.gorev, z.gorev?.['Gorev No'])
  ok('bildirim üretildi ve gönderildi', z.bildirim?.['Durum'] === 'gonderildi', z.bildirim?.['Durum'])
  ok('bildirim id deterministik', z.bildirim['Bildirim ID'] === bildirimIdUret(z.gorev['Gorev No'], 'ilk'))

  // AYNI OLAY tekrar: ne yeni görev, ne yeni bildirim.
  const tekrar = await sessizce(() => olaylariAl({
    depo: d1, kanal: KANAL, govde: KUYRUK_OLAYI('evt-t-001'), adapterAdi: 'generic',
    aktor: 'test', aktorTipi: 'partner', kaynak: 'simulator', simdi: T0,
  }))
  ok('aynı olay yinelenen sayıldı', tekrar.yinelenen === 1, JSON.stringify(tekrar.sonuclar[0]))
  ok('ikinci görev doğmadı', (await d1.gorevler.listele()).length === 1)
  ok('ikinci bildirim doğmadı', (await d1.bildirimler.listele()).length === 1)

  // Aynı görev + aynı kademe doğrudan çağrılsa da tek kayıt.
  const alici = (await d1.referans.rolIcinKullanici(MAGAZA, 'magaza_muduru')) as Kullanici
  const ikinci = await sessizce(() => bildirimGonder({
    depo: d1, kanal: KANAL, gorev: z.gorev, alici, kademe: 'ilk', simdi: T0,
  }))
  ok("aynı kademe ikinci kez → 'zaten_var'", ikinci.durum === 'zaten_var', ikinci.durum)
  ok('kayıt sayısı hâlâ 1', (await d1.bildirimler.listele()).length === 1)

  // Farklı kademe MEŞRU ikinci mesajdır.
  const hatirlatma = await sessizce(() => bildirimGonder({
    depo: d1, kanal: KANAL, gorev: z.gorev, alici, kademe: 'hatirlatma', simdi: T0,
  }))
  ok('farklı kademe gönderildi (eskalasyon mümkün)', hatirlatma.durum === 'gonderildi', hatirlatma.durum)
  ok('kademe sayısı kadar ayrı anahtar var',
    new Set(KADEMELER.map(k => bildirimIdUret('G-1', k))).size === KADEMELER.length)

  // ═══ 3. DURUM GEÇİŞİ + ÇAKIŞMA ════════════════════════════════════════════
  console.log('\n3) Durum geçişi ve çakışma (409)')
  const d2 = bellekDeposunuZorla(); await d2.sifirla()
  const z2 = await zinciriBaslat(d2, 'evt-t-002')
  const no2 = z2.gorev['Gorev No']
  ok("görev 'atandi' durumunda başlıyor", z2.gorev['Durum'] === 'atandi', z2.gorev['Durum'])

  const gecersiz = await gecisYap(d2, {
    gorevNo: no2, hedef: 'tamamlandi', aktor: 'u1', aktorTipi: 'kullanici', kaynak: 'panel', simdi: T0,
  })
  ok("atandi → tamamlandi reddedildi ('gecersiz_gecis')",
    !gecersiz.basarili && gecersiz.kod === 'gecersiz_gecis', JSON.stringify(gecersiz))

  const ilkKisi = await gecisYap(d2, {
    gorevNo: no2, hedef: 'basladi', beklenenDurum: 'atandi',
    aktor: 'u1', aktorTipi: 'kullanici', kaynak: 'panel', simdi: T0,
  })
  ok('ilk kişi geçişi aldı', ilkKisi.basarili === true)

  const ikinciKisi = await gecisYap(d2, {
    gorevNo: no2, hedef: 'basladi', beklenenDurum: 'atandi',   // bayat ekran
    aktor: 'u2', aktorTipi: 'kullanici', kaynak: 'panel', simdi: T0,
  })
  ok("ikinci kişi 409 aldı ('cakisma')",
    !ikinciKisi.basarili && ikinciKisi.kod === 'cakisma', JSON.stringify(ikinciKisi))
  ok('çakışma "geçersiz geçiş" diye raporlanmadı',
    !ikinciKisi.basarili && ikinciKisi.kod !== 'gecersiz_gecis')

  const yokGorev = await gecisYap(d2, {
    gorevNo: 'G-999999', hedef: 'basladi', aktor: 'u1', aktorTipi: 'kullanici', kaynak: 'panel',
  })
  ok("olmayan görev 'bulunamadi'", !yokGorev.basarili && yokGorev.kod === 'bulunamadi')

  // Erteleme: durum DEĞİŞMEZ, son teslim ötelenir.
  const oncekiTeslim = (await d2.gorevler.getir(no2))!['Son Teslim']
  const ert = await gorevErtele(d2, {
    gorevNo: no2, aktor: 'u1', aktorTipi: 'kullanici', kaynak: 'panel', simdi: T0,
  })
  ok('erteleme başarılı', ert.basarili === true)
  ok('erteleme durumu DEĞİŞTİRMEDİ', ert.basarili && ert.gorev['Durum'] === 'basladi')
  ok('son teslim ileri gitti', ert.basarili && Date.parse(ert.yeniSonTeslim) > Date.parse(oncekiTeslim))

  // ═══ 4. YETKİ ═════════════════════════════════════════════════════════════
  console.log('\n4) Yetki (varsayılan reddet)')
  const hedefGorev = { ...z2.gorev, 'Atanan Kullanici ID': 'u-magaza_muduru-1' } as Gorev
  ok('Store OS\'te tanımsız kullanıcı reddedildi',
    gorevYetkisi(null, hedefGorev).izinli === false)
  ok('başka mağazanın kullanıcısı reddedildi',
    gorevYetkisi(kullanici({ 'Rol': 'magaza_muduru', 'Magaza Kodu': '9999' }), hedefGorev).izinli === false)
  ok('başkasının görevine personel dokunamaz',
    gorevYetkisi(kullanici({ 'Kullanici ID': 'u-baska' }), hedefGorev).izinli === false)
  ok('görevin sahibi kendi görevini yönetir',
    gorevYetkisi(kullanici({ 'Kullanici ID': 'u-magaza_muduru-1' }), hedefGorev).izinli === true)
  ok('mağaza müdürü kendi mağazasının her görevini yönetir',
    gorevYetkisi(kullanici({ 'Kullanici ID': 'u-md', 'Rol': 'magaza_muduru' }), hedefGorev).izinli === true)
  ok('bölge müdürü başka mağazada da yetkili',
    gorevYetkisi(kullanici({ 'Rol': 'bolge_muduru', 'Magaza Kodu': '9999' }), hedefGorev).izinli === true)

  ok('telefon eşleşmesi biçimden bağımsız',
    telefonEslesmesi('+90 555 111 22 33', '905551112233'))
  ok('farklı numara eşleşmiyor', !telefonEslesmesi('+905551112233', '+905559998877'))
  ok('normalize son 10 haneyi alıyor', normalizeTelefon('0090-555-111-22-33') === '5551112233')

  // ═══ 5. GELEN YÖN ═════════════════════════════════════════════════════════
  console.log('\n5) Gelen yön (buton → durum)')
  const d3 = bellekDeposunuZorla(); await d3.sifirla()
  const z3 = await zinciriBaslat(d3, 'evt-t-003')
  const mesajId = z3.bildirim['Saglayici Mesaj ID'] as string
  const telefon = z3.bildirim['Alici Telefon']

  const yanlisTelefon = await sessizce(() => yanitiIsle({
    depo: d3, kanal: KANAL, kaynak: 'simulator', simdi: T0,
    yanit: sahteButonYaniti({
      gorevNo: z3.gorev['Gorev No'], aksiyon: 'kabul', bildirimId: z3.bildirim['Bildirim ID'],
      saglayiciMesajId: mesajId, gonderenTelefon: '+905550000000',
    }),
  }))
  ok('yabancı numaradan gelen yanıt reddedildi',
    yanlisTelefon.durum === 'reddedildi' && yanlisTelefon.kod === 'telefon_uyusmuyor',
    JSON.stringify(yanlisTelefon))
  ok('görev değişmedi', (await d3.gorevler.getir(z3.gorev['Gorev No']))!['Durum'] === 'atandi')

  const yanlisBildirim = await sessizce(() => yanitiIsle({
    depo: d3, kanal: KANAL, kaynak: 'simulator', simdi: T0,
    yanit: {
      saglayiciMesajId: mesajId, gonderenTelefon: telefon, metin: null,
      butonId: butonIdUret({
        gorevNo: z3.gorev['Gorev No'], aksiyon: 'kabul', bildirimId: 'b-BASKA-ilk',
      }),
    },
  }))
  ok('başka bildirime ait buton reddedildi',
    yanlisBildirim.durum === 'reddedildi' && yanlisBildirim.kod === 'bildirim_uyusmuyor',
    JSON.stringify(yanlisBildirim))

  const bilinmeyenMesaj = await sessizce(() => yanitiIsle({
    depo: d3, kanal: KANAL, kaynak: 'simulator', simdi: T0,
    yanit: sahteButonYaniti({
      gorevNo: z3.gorev['Gorev No'], aksiyon: 'kabul', bildirimId: z3.bildirim['Bildirim ID'],
      saglayiciMesajId: 'hic-gonderilmemis-id', gonderenTelefon: telefon,
    }),
  }))
  ok('tanınmayan sağlayıcı mesaj id reddedildi',
    bilinmeyenMesaj.durum === 'reddedildi' && bilinmeyenMesaj.kod === 'bildirim_yok')

  const serbestMetin = await sessizce(() => yanitiIsle({
    depo: d3, kanal: KANAL, kaynak: 'simulator', simdi: T0,
    yanit: sahteMetinYaniti({ saglayiciMesajId: mesajId, gonderenTelefon: telefon, metin: 'tamamdır bakıyorum' }),
  }))
  ok("serbest metin görev durumunu değiştirmedi ('metin')", serbestMetin.durum === 'metin', serbestMetin.durum)
  ok('serbest metinden sonra görev hâlâ atandi',
    (await d3.gorevler.getir(z3.gorev['Gorev No']))!['Durum'] === 'atandi')

  const dogru = sahteButonYaniti({
    gorevNo: z3.gorev['Gorev No'], aksiyon: 'kabul', bildirimId: z3.bildirim['Bildirim ID'],
    saglayiciMesajId: mesajId, gonderenTelefon: telefon,
  })
  const uygulandi = await sessizce(() => yanitiIsle({ depo: d3, kanal: KANAL, yanit: dogru, kaynak: 'simulator', simdi: T0 }))
  ok('doğru yanıt uygulandı', uygulandi.durum === 'uygulandi', JSON.stringify(uygulandi))
  ok("görev 'basladi'ya geçti", (await d3.gorevler.getir(z3.gorev['Gorev No']))!['Durum'] === 'basladi')
  const bGuncel = await d3.bildirimler.getir(z3.bildirim['Bildirim ID'])
  ok("bildirim 'yanitlandi' işaretlendi", bGuncel?.['Durum'] === 'yanitlandi', bGuncel?.['Durum'])
  ok('yanıt kaydedildi', bGuncel?.['Yanit'] === 'kabul', bGuncel?.['Yanit'])

  const ikinciBasis = await sessizce(() => yanitiIsle({ depo: d3, kanal: KANAL, yanit: dogru, kaynak: 'simulator', simdi: T0 }))
  ok('ikinci basış yutuldu', ikinciBasis.durum === 'yinelenen', ikinciBasis.durum)
  const izD3 = await izAl(d3)

  // Devir: yeni kişiye geçer ve ONA bildirim gider.
  const d4 = bellekDeposunuZorla(); await d4.sifirla()
  const z4 = await zinciriBaslat(d4, 'evt-t-004')
  const devir = await sessizce(() => yanitiIsle({
    depo: d4, kanal: KANAL, kaynak: 'simulator', simdi: T0,
    yanit: sahteButonYaniti({
      gorevNo: z4.gorev['Gorev No'], aksiyon: 'devret', bildirimId: z4.bildirim['Bildirim ID'],
      saglayiciMesajId: z4.bildirim['Saglayici Mesaj ID'] as string,
      gonderenTelefon: z4.bildirim['Alici Telefon'],
    }),
  }))
  ok('devir uygulandı', devir.durum === 'uygulandi', JSON.stringify(devir))
  const devredilen = await d4.gorevler.getir(z4.gorev['Gorev No'])
  ok('görev eskalasyon rolüne (bölge müdürü) geçti',
    devredilen?.['Atanan Kullanici ID'] === 'u-bolge_muduru-2', devredilen?.['Atanan Kullanici ID'])
  ok('yeni sorumluya devir bildirimi gitti',
    !!(await d4.bildirimler.getir(bildirimIdUret(z4.gorev['Gorev No'], 'devir'))))
  const izD4 = await izAl(d4)

  // Erteleme butonu
  const d5 = bellekDeposunuZorla(); await d5.sifirla()
  const z5 = await zinciriBaslat(d5, 'evt-t-005')
  const eskiTeslim = z5.gorev['Son Teslim']
  const ertBtn = await sessizce(() => yanitiIsle({
    depo: d5, kanal: KANAL, kaynak: 'simulator', simdi: T0,
    yanit: sahteButonYaniti({
      gorevNo: z5.gorev['Gorev No'], aksiyon: 'ertele', bildirimId: z5.bildirim['Bildirim ID'],
      saglayiciMesajId: z5.bildirim['Saglayici Mesaj ID'] as string,
      gonderenTelefon: z5.bildirim['Alici Telefon'],
    }),
  }))
  ok('erteleme butonu uygulandı', ertBtn.durum === 'uygulandi', JSON.stringify(ertBtn))
  const z5son = await d5.gorevler.getir(z5.gorev['Gorev No'])
  ok('erteleme son teslimi 5 dk öteledi',
    Date.parse(z5son!['Son Teslim']) - Date.parse(eskiTeslim) === 5 * 60_000,
    `${eskiTeslim} → ${z5son!['Son Teslim']}`)
  ok('erteleme durumu değiştirmedi', z5son!['Durum'] === 'atandi', z5son!['Durum'])
  const izD5 = await izAl(d5)

  // ═══ 6. ESKALASYON KADEMELERİ ═════════════════════════════════════════════
  console.log('\n6) Eskalasyon kademeleri (5 / 10 / 20 dk)')
  const d6 = bellekDeposunuZorla(); await d6.sifirla()
  const z6 = await zinciriBaslat(d6, 'evt-t-006')
  const teslim = Date.parse(z6.gorev['Son Teslim'])
  const anda = (dk: number) => new Date(teslim + dk * 60_000).toISOString()

  const erken = await sessizce(() => eskalasyonKontrol({ depo: d6, kanal: KANAL, magazaKodu: MAGAZA, simdi: anda(3) }))
  ok('3 dk gecikmede hiçbir kademe yok', erken.tetiklenen.length === 0, JSON.stringify(erken.tetiklenen))

  const besDk = await sessizce(() => eskalasyonKontrol({ depo: d6, kanal: KANAL, magazaKodu: MAGAZA, simdi: anda(6) }))
  const b6 = besDk.tetiklenen.filter(t => t.sonuc === 'gonderildi').map(t => t.kademe)
  ok("6 dk → yalnız 'hatirlatma'", b6.length === 1 && b6[0] === 'hatirlatma', b6.join(','))

  const onDk = await sessizce(() => eskalasyonKontrol({ depo: d6, kanal: KANAL, magazaKodu: MAGAZA, simdi: anda(11) }))
  const b11 = onDk.tetiklenen.filter(t => t.sonuc === 'gonderildi').map(t => t.kademe)
  ok("11 dk → yalnız 'bolge' eklendi (hatırlatma tekrarlanmadı)",
    b11.length === 1 && b11[0] === 'bolge', b11.join(','))
  ok('bölge bildirimi bölge müdürüne gitti',
    (await d6.bildirimler.getir(bildirimIdUret(z6.gorev['Gorev No'], 'bolge')))?.['Alici Kullanici ID']
      === 'u-bolge_muduru-2')

  const yirmiDk = await sessizce(() => eskalasyonKontrol({ depo: d6, kanal: KANAL, magazaKodu: MAGAZA, simdi: anda(21) }))
  const b21 = yirmiDk.tetiklenen.filter(t => t.sonuc === 'gonderildi').map(t => t.kademe)
  ok("21 dk → yalnız 'merkez' eklendi", b21.length === 1 && b21[0] === 'merkez', b21.join(','))

  const tekrarKontrol = await sessizce(() => eskalasyonKontrol({ depo: d6, kanal: KANAL, magazaKodu: MAGAZA, simdi: anda(30) }))
  ok('30 dk → yeni gönderim yok (idempotent)',
    tekrarKontrol.tetiklenen.every(t => t.sonuc === 'zaten_var'),
    JSON.stringify(tekrarKontrol.tetiklenen.map(t => `${t.kademe}:${t.sonuc}`)))
  ok('toplam bildirim sayısı 4 (ilk + 3 kademe)',
    (await d6.bildirimler.listele()).length === 4,
    String((await d6.bildirimler.listele()).length))
  const izD6 = await izAl(d6)

  // Geç kalan görev tek koşuda tüm kademeleri hak eder.
  const d7 = bellekDeposunuZorla(); await d7.sifirla()
  const z7 = await zinciriBaslat(d7, 'evt-t-007')
  const gec = new Date(Date.parse(z7.gorev['Son Teslim']) + 25 * 60_000).toISOString()
  const hepsi = await sessizce(() => eskalasyonKontrol({ depo: d7, kanal: KANAL, magazaKodu: MAGAZA, simdi: gec }))
  ok('ilk koşuda üç kademe birden gitti',
    hepsi.tetiklenen.filter(t => t.sonuc === 'gonderildi').length === 3,
    JSON.stringify(hepsi.tetiklenen.map(t => `${t.kademe}:${t.sonuc}`)))

  // Nihai durumdaki görev eskale edilmez.
  const d8 = bellekDeposunuZorla(); await d8.sifirla()
  const z8 = await zinciriBaslat(d8, 'evt-t-008')
  await gecisYap(d8, { gorevNo: z8.gorev['Gorev No'], hedef: 'iptal', aktor: 'u1', aktorTipi: 'kullanici', kaynak: 'panel', simdi: T0 })
  const iptalli = await sessizce(() => eskalasyonKontrol({
    depo: d8, kanal: KANAL, magazaKodu: MAGAZA,
    simdi: new Date(Date.parse(z8.gorev['Son Teslim']) + 40 * 60_000).toISOString(),
  }))
  ok('iptal edilmiş görev eskale edilmedi', iptalli.tetiklenen.length === 0 && iptalli.geciken === 0)

  // ═══ 7. DENETİM İZİ ═══════════════════════════════════════════════════════
  console.log('\n7) Denetim izi')
  for (const a of [
    'olay.kabul', 'kural.eslesti', 'gorev.olusturuldu', 'gorev.durum',
    'bildirim.kuyruga_alindi', 'bildirim.gonderildi', 'bildirim.yanit',
    'bildirim.cozulemedi', 'gorev.yetki_reddedildi',
  ]) {
    ok(`  '${a}' denetimde var`, izD3.has(a))
  }
  ok("  'eskalasyon.tetiklendi' denetimde var", izD6.has('eskalasyon.tetiklendi'))
  ok("  'gorev.ertelendi' denetimde var", izD5.has('gorev.ertelendi'))
  ok("  'gorev.devredildi' denetimde var", izD4.has('gorev.devredildi'))

  // ═══ 8. GÖNDERİM HATASI ZİNCİRİ KIRMAZ ════════════════════════════════════
  console.log('\n8) Gönderim hatası görünür kalır, zinciri kırmaz')
  const d9 = bellekDeposunuZorla(); await d9.sifirla()
  const kirikKanal = {
    ad: 'whatsapp' as const,
    disaCikar: true,
    gonder: async () => ({ basarili: false as const, hata: 'n8n 502: bad gateway', tekrarDenenebilir: true }),
    gelenCoz: () => null,
  }
  const alim9 = await sessizce(() => olaylariAl({
    depo: d9, kanal: kirikKanal, govde: KUYRUK_OLAYI('evt-t-009'), adapterAdi: 'generic',
    aktor: 'test', aktorTipi: 'partner', kaynak: 'simulator', simdi: T0,
  }))
  ok('gönderim düşse de görev üretildi', (alim9.sonuclar[0]?.uretilenGorevler?.length ?? 0) === 1)
  const b9 = await d9.bildirimler.getir(
    bildirimIdUret(alim9.sonuclar[0]!.uretilenGorevler![0]!, 'ilk'))
  ok("bildirim 'hata' durumunda görünür kaldı", b9?.['Durum'] === 'hata', b9?.['Durum'])
  ok('hata metni kayıtta', (b9?.['Hata'] ?? '').includes('502'), b9?.['Hata'])

  // 'panel' kanallı kural: kayıt var, telefona mesaj yok.
  const d10 = bellekDeposunuZorla(); await d10.sifirla()
  const g10 = (await d10.gorevler.olustur({
    'Gorev No': 'G-PANEL', 'Baslik': 'Panel görevi', 'Aciklama': '—', 'Magaza Kodu': MAGAZA,
    'Gerekce': 'test', 'Atanan Rol': 'magaza_muduru', 'Oncelik': 'normal', 'Durum': 'yeni',
    'Olusturuldu': T0, 'Son Teslim': T0, 'Kanit Gerekli': false, 'Veri Tipi': 'demo',
  })) as Gorev
  const panelBildirim = await sessizce(() => gorevIcinIlkBildirim({
    depo: d10, kanal: KANAL, gorev: g10, hedefKanal: 'panel', simdi: T0,
  }))
  ok("'panel' kanallı kuralda da bildirim kaydı üretildi", panelBildirim.durum === 'gonderildi')
  ok('kayıtta kanal panel yazıyor',
    panelBildirim.durum === 'gonderildi' && panelBildirim.bildirim['Kanal'] === 'panel')

  // ═══ 9. DEMO TELEFON KİLİDİ ZİNCİRİN İÇİNDE ═══════════════════════════════
  //
  // Birim testi kapının kendisini kanıtlıyor (kanal/telefon-kilidi.test.ts).
  // Buradaki soru farklı: kilit AÇIKKEN zincir hâlâ kapanıyor mu? Kritik
  // nokta gelen yönde — mesaj demo numarasına gidiyorsa yanıt da oradan
  // gelir, ve numara kapısı görevin sahibinin numarasını beklerse zincir
  // tam da kilidi açtığımız gün kırılırdı.
  console.log('\n9) Demo telefon kilidi açıkken zincir kapanıyor')
  const oncekiDemo = process.env.STOREOS_DEMO_TELEFON
  process.env.STOREOS_DEMO_TELEFON = '+905303227450'
  const T1 = '2026-08-14T14:05:00+03:00'

  const dk1 = bellekDeposunuZorla(); await dk1.sifirla()
  const alimK1 = await sessizce(() => olaylariAl({
    depo: dk1, kanal: KANAL, govde: KUYRUK_OLAYI('evt-t-011'), adapterAdi: 'generic',
    aktor: 'test', aktorTipi: 'partner', kaynak: 'simulator', simdi: T0,
  }))
  const gNoK1 = alimK1.sonuclar[0]?.uretilenGorevler?.[0] ?? ''
  const bK1 = await dk1.bildirimler.getir(bildirimIdUret(gNoK1, 'ilk'))
  ok('görevin sahibinin numarası kayıtta korundu',
    !!bK1 && bK1['Alici Telefon'] !== '+905303227450', bK1?.['Alici Telefon'])
  ok('fiilen gönderilen numara demo telefonu',
    bK1?.['Gonderilen Telefon'] === '+905303227450', bK1?.['Gonderilen Telefon'])

  // Demo telefonundan gelen yanıt KABUL edilmeli.
  const yanitK1 = sahteButonYaniti({
    gorevNo: gNoK1, aksiyon: 'kabul',
    bildirimId: bK1!['Bildirim ID'],
    saglayiciMesajId: bK1!['Saglayici Mesaj ID'] ?? '',
    gonderenTelefon: '+905303227450',
    zaman: T1,
  })
  const sK1 = await sessizce(() => yanitiIsle({ depo: dk1, kanal: KANAL, yanit: yanitK1, kaynak: 'simulator', simdi: T1 }))
  ok('demo telefonundan gelen yanıt kabul edildi', sK1.durum === 'uygulandi', sK1.durum)

  // Üçüncü bir numaradan gelen yanıt hâlâ REDDEDİLMELİ — kilit, numara
  // kapısını gevşetmez; yalnız beklenen numarayı değiştirir.
  const dk2 = bellekDeposunuZorla(); await dk2.sifirla()
  const alimK2 = await sessizce(() => olaylariAl({
    depo: dk2, kanal: KANAL, govde: KUYRUK_OLAYI('evt-t-012'), adapterAdi: 'generic',
    aktor: 'test', aktorTipi: 'partner', kaynak: 'simulator', simdi: T0,
  }))
  const gNoK2 = alimK2.sonuclar[0]?.uretilenGorevler?.[0] ?? ''
  const bK2 = await dk2.bildirimler.getir(bildirimIdUret(gNoK2, 'ilk'))
  const sK2 = await sessizce(() => yanitiIsle({
    depo: dk2, kanal: KANAL, kaynak: 'simulator', simdi: T1,
    yanit: sahteButonYaniti({
      gorevNo: gNoK2, aksiyon: 'kabul',
      bildirimId: bK2!['Bildirim ID'],
      saglayiciMesajId: bK2!['Saglayici Mesaj ID'] ?? '',
      gonderenTelefon: '+905559998877',
      zaman: T1,
    }),
  }))
  ok('yabancı numaradan gelen yanıt hâlâ reddediliyor',
    sK2.durum === 'reddedildi' && sK2.kod === 'telefon_uyusmuyor',
    `${sK2.durum}/${sK2.durum === 'reddedildi' ? sK2.kod : ''}`)

  if (oncekiDemo === undefined) delete process.env.STOREOS_DEMO_TELEFON
  else process.env.STOREOS_DEMO_TELEFON = oncekiDemo

  console.log(`\n${fail === 0 ? '✓ tüm zincir kontrolleri geçti' : `✗ ${fail} kontrol düştü`}\n`)
  if (fail) process.exit(1)
}

main().catch(e => { console.log = gercekLog; console.error('HATA:', e); process.exit(1) })
