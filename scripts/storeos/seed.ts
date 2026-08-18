// ════════════════════════════════════════════════════════════════════════════
//  Store OS — seed. Demo verisini Airtable'a yazar.
//
//    npx -y tsx scripts/storeos/seed.ts                  # KURU ÇALIŞMA (yazmaz)
//    npx -y tsx scripts/storeos/seed.ts --yaz
//    npx -y tsx scripts/storeos/seed.ts --sifirla --yaz  # demo kayıtları sil + yeniden yaz
//    npx -y tsx scripts/storeos/seed.ts --yaz --tarih=2026-08-12
//
//  KURALLAR
//   · Math.random YOK. Tüm "rastgelelik" seed'li ve tekrarlanabilir —
//     aynı --tarih ile aynı sayılar çıkar (provaları tekrar koşabilmek için).
//   · Yazılan her metrik/olay/görev `Veri Tipi = demo` işaretlenir (madde 11).
//   · --sifirla YALNIZ `Veri Tipi = demo` kayıtları siler.
// ════════════════════════════════════════════════════════════════════════════

import { varsayilanKurallar } from '../../src/lib/storeos/depo/bellek'
import { varsayilanMetrikler } from '../../src/lib/storeos/depo/demo-metrikler'
import { TABLO } from '../../src/lib/storeos/tipler'
import type {
  Magaza, Kamera, Kullanici, Kural, Metrik,
} from '../../src/lib/storeos/tipler'

const BASE = process.env.STOREOS_AIRTABLE_BASE_ID
const KEY = process.env.STOREOS_AIRTABLE_API_KEY

const YAZ = process.argv.includes('--yaz')
const SIFIRLA = process.argv.includes('--sifirla')
const TARIH = (process.argv.find(a => a.startsWith('--tarih=')) ?? '').split('=')[1]

// ─── Zaman ───────────────────────────────────────────────────────────────────

const GUN = TARIH ?? new Date().toISOString().slice(0, 10)
const iso = (saat: number, dk = 0) =>
  new Date(`${GUN}T${String(saat).padStart(2, '0')}:${String(dk).padStart(2, '0')}:00+03:00`).toISOString()

const SIMDI = iso(14, 30) // demo "şu an"ı — sabit, prova tekrarlanabilir olsun

// ─── Sabitler ────────────────────────────────────────────────────────────────

const MAGAZA = '0178'

// ─── Veri ────────────────────────────────────────────────────────────────────

const magazalar: Partial<Magaza>[] = [{
  'Kod': MAGAZA,
  'Ad': 'Izmir Forum Bornova',
  'Bolge': 'Ege',
  'Sehir': 'Izmir',
  'Adres': 'Forum Bornova AVM, Kazimdirik Mah., Bornova / Izmir',
  'Acilis Saati': '10:00',
  'Kapanis Saati': '22:00',
  'Durum': 'warning',
  'Kasa Toplam': 8,
  'Aktif': true,
}]

const kameraTanimlari: Omit<Kamera, 'Magaza Kodu'>[] = [
  { 'Kamera ID': `${MAGAZA}-giris`,    'Bolge Adi': 'Giris',          'Ad': 'Giris Kapisi',      'Demo Video': '/storeos/demo/giris.mp4',    'Yetenekler': 'kisi_sayimi,yogunluk', 'Durum': 'online',   'Sira': 1 },
  { 'Kamera ID': `${MAGAZA}-kasa`,     'Bolge Adi': 'Kasa Alani',     'Ad': 'Kasa Hatti',        'Demo Video': '/storeos/demo/kasa.mp4',     'Yetenekler': 'kuyruk,kisi_sayimi',   'Durum': 'online',   'Sira': 2 },
  { 'Kamera ID': `${MAGAZA}-kozmetik`, 'Bolge Adi': 'Kozmetik Reyon', 'Ad': 'Kozmetik Reyonu',   'Demo Video': '/storeos/demo/kozmetik.mp4', 'Yetenekler': 'raf,yogunluk',         'Durum': 'online',   'Sira': 3 },
  { 'Kamera ID': `${MAGAZA}-depo`,     'Bolge Adi': 'Depo',           'Ad': 'Depo Girisi',       'Demo Video': '/storeos/demo/depo.mp4',     'Yetenekler': 'isg',                  'Durum': 'degraded', 'Sira': 4 },
]
const kameralar: Partial<Kamera>[] = kameraTanimlari.map(k => ({ ...k, 'Magaza Kodu': MAGAZA }))

/**
 * TELEFONLAR GERÇEK E.164 (Gün 8, madde 5). Kaynak: STOREOS_DEMO_TELEFON.
 * Placeholder `+9000000000X` kaldırıldı — sağlayıcı geçersiz numarayı
 * reddediyor ve hata "zincir bozuk" gibi okunuyordu.
 *
 * Bütün roller aynı numaraya yazılır. Sebep: `telefon-kilidi.ts` açıkken her
 * gönderim zaten bu numaraya çevrilir; rol başına farklı numara yazmak kilit
 * açıkken hiçbir şeyi değiştirmez, yalnız "başkasına gidiyor" yanılsaması
 * üretir. Kilit KAPANDIĞI gün burası rol başına gerçek numarayla doldurulur.
 */
const DEMO_TELEFONU = (() => {
  const e = (process.env.STOREOS_DEMO_TELEFON ?? '').trim()
  return /^\+[1-9]\d{7,14}$/.test(e) ? e : '+905303227450'
})()

const kullaniciTanimlari: Pick<Kullanici, 'Kullanici ID' | 'Ad Soyad' | 'Rol' | 'Telefon'>[] = [
  { 'Kullanici ID': 'u-mudur-0178',   'Ad Soyad': 'Mağaza Müdürü',   'Rol': 'magaza_muduru', 'Telefon': DEMO_TELEFONU },
  { 'Kullanici ID': 'u-bolge-ege',    'Ad Soyad': 'Ege Bölge Müdürü','Rol': 'bolge_muduru',  'Telefon': DEMO_TELEFONU },
  { 'Kullanici ID': 'u-personel-1',   'Ad Soyad': 'Reyon Personeli 1','Rol': 'personel',     'Telefon': DEMO_TELEFONU },
  { 'Kullanici ID': 'u-personel-2',   'Ad Soyad': 'Reyon Personeli 2','Rol': 'personel',     'Telefon': DEMO_TELEFONU },
  { 'Kullanici ID': 'u-guvenlik-1',   'Ad Soyad': 'Güvenlik Görevlisi','Rol': 'guvenlik',    'Telefon': DEMO_TELEFONU },
  { 'Kullanici ID': 'u-merkez-1',     'Ad Soyad': 'Merkez Operasyon', 'Rol': 'merkez',       'Telefon': DEMO_TELEFONU },
]
const kullanicilar: Partial<Kullanici>[] = kullaniciTanimlari.map(u => ({
  ...u, 'Magaza Kodu': MAGAZA, 'Aktif': true,
}))

// KURAL KAYNAĞI TEK YERDE.
// Kurallar `src/lib/storeos/depo/bellek.ts` içindeki varsayilanKurallar()'dan
// gelir; seed onları Airtable'a YAZAR. Böylece bellek deposu ile Airtable
// deposu birbirinden ayrışamaz — Gün 2'de tam olarak bu ayrışma yaşandı
// (seed'de 'queue.threshold_exceeded' + 'metadata.kisi', bellekte kilitli
// sözleşmenin 'store.queue.threshold_exceeded' + 'metadata.queueLength' adları).
//
// YALNIZ FAZ 1 tipleri kuralı vardır. Faz 2 tipleri (raf, ISG, güvenlik)
// bilinçli olarak kuralsızdır: olay kabul edilir, kaydedilir, görev üretmez.
const kurallar: Partial<Kural>[] = varsayilanKurallar()

// ─── Metrikler ───────────────────────────────────────────────────────────────
// KAYNAK TEK YERDE: src/lib/storeos/depo/demo-metrikler.ts
// Bellek deposu da aynı fonksiyondan besleniyor. Kurallarda Gün 2'de yaşanan
// ayrışmanın metriklerde tekrarlanmaması için burada üretim YAPILMIYOR.
const metrikler: Partial<Metrik>[] = varsayilanMetrikler({
  magazaKodu: MAGAZA,
  gun: GUN,
  zaman: SIMDI,
  acilisSaati: 10,
  kapanisSaati: 22,
})

// ─── Airtable G/Ç ────────────────────────────────────────────────────────────

const AT = `https://api.airtable.com/v0/${BASE}`
let istekSayaci = 0

async function bekle(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function at(tablo: string, init: RequestInit, sorgu = ''): Promise<any> {
  if (istekSayaci++ > 0) await bekle(260) // ~4 istek/sn
  const r = await fetch(`${AT}/${encodeURIComponent(tablo)}${sorgu}`, {
    ...init,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  if (!r.ok) throw new Error(`${tablo} → ${r.status} ${await r.text()}`)
  return r.json()
}

async function yaz(tablo: string, kayitlar: Record<string, unknown>[]) {
  if (!YAZ) {
    console.log(`  [kuru] ${tablo.padEnd(14)} ${String(kayitlar.length).padStart(3)} kayit`)
    return
  }
  for (let i = 0; i < kayitlar.length; i += 10) {
    await at(tablo, {
      method: 'POST',
      body: JSON.stringify({ records: kayitlar.slice(i, i + 10).map(fields => ({ fields })), typecast: true }),
    })
  }
  console.log(`  [yazildi] ${tablo.padEnd(14)} ${String(kayitlar.length).padStart(3)} kayit`)
}

/**
 * Sıfırlanacak tablolar ve her birinin silme politikası.
 *
 * ⚠ TABLO.denetim BU LİSTEDE YOK ve EKLENMEYECEK — append-only (kabul kriteri 5).
 *   Silme yolu yalnız burada var; denetim buraya girerse garanti kalkar.
 *
 * `veriTipi: true`  → yalnız `Veri Tipi='demo'` satırları silinir ('gercek' korunur).
 * `veriTipi: false` → tablonun TAMAMI silinir. Bu tablolarda `Veri Tipi` alanı
 *   yok; hepsi tanımı gereği demo kurulum verisidir.
 *
 * 17 Ağu — CANLI KOŞUDA YAKALANAN İKİ HATA (bu liste onun düzeltmesidir):
 *   1. Referans tablolar sıfırlanmıyordu ama `--yaz` yine ekliyordu:
 *      Kurallar 6→12, Magazalar 1→2 oldu. Çift kural = HER OLAYDA ÇİFT GÖREV
 *      ve ÇİFT WhatsApp mesajı. Provada fark edilmesi zor, jüri önünde ölümcül.
 *   2. Bildirimler hiç silinmiyordu. `Bildirim ID` deterministiktir
 *      (`b-<GorevNo>-<kademe>`); ikinci provada aynı G-000001 doğduğunda
 *      `olusturIlkKez` "zaten var" der ve MESAJ HİÇ GİTMEZ.
 */
const SIFIRLANACAK: { tablo: string; veriTipi: boolean }[] = [
  { tablo: TABLO.metrikler,    veriTipi: true  },
  { tablo: TABLO.gorevler,     veriTipi: true  },
  { tablo: TABLO.olaylar,      veriTipi: true  },
  { tablo: TABLO.bildirimler,  veriTipi: false },
  { tablo: TABLO.magazalar,    veriTipi: false },
  { tablo: TABLO.kameralar,    veriTipi: false },
  { tablo: TABLO.kullanicilar, veriTipi: false },
  { tablo: TABLO.kurallar,     veriTipi: false },
]

async function sil(tablo: string, veriTipi: boolean) {
  const sorgu = veriTipi
    ? `?filterByFormula=${encodeURIComponent("{Veri Tipi}='demo'")}&pageSize=100`
    : '?pageSize=100'
  const etiket = veriTipi ? 'demo kaydi' : 'kayit'

  // Airtable sayfa başına en fazla 100 döner; tablo daha büyükse tur tur boşalt.
  let toplam = 0
  for (;;) {
    const { records } = await at(tablo, { method: 'GET' }, sorgu)
    if (!records.length) break
    if (!YAZ) {
      console.log(`  [kuru-sifirla] ${tablo.padEnd(14)} ${records.length} ${etiket} silinecekti`)
      return
    }
    for (let i = 0; i < records.length; i += 10) {
      const q = records.slice(i, i + 10).map((r: { id: string }) => `records[]=${r.id}`).join('&')
      await at(tablo, { method: 'DELETE' }, `?${q}`)
    }
    toplam += records.length
    if (records.length < 100) break
  }
  if (!toplam) { console.log(`  [sifirla] ${tablo.padEnd(14)} silinecek ${etiket} yok`); return }
  console.log(`  [sifirla] ${tablo.padEnd(14)} ${toplam} ${etiket} silindi`)
}

// ─── Ana akış ────────────────────────────────────────────────────────────────

async function main() {
  if (!BASE || !KEY) {
    console.error('STOREOS_AIRTABLE_BASE_ID ve STOREOS_AIRTABLE_API_KEY gerekli.')
    process.exit(2)
  }

  console.log(`Store OS seed · gun=${GUN} · mod=${YAZ ? 'YAZ' : 'KURU CALISMA'}${SIFIRLA ? ' · SIFIRLA' : ''}`)
  console.log(`Base: ${BASE.slice(0, 8)}…\n`)

  if (SIFIRLA) {
    console.log(`Sifirlama (DenetimKaydi HARIC — append-only):`)
    for (const { tablo, veriTipi } of SIFIRLANACAK) await sil(tablo, veriTipi)
    console.log('')
  } else if (YAZ) {
    // --sifirla'siz --yaz referans tablolara EKLER, uzerine yazmaz. Ikinci kez
    // kosulursa kurallar cift olur ve her olay iki gorev uretir (17 Agu'da oldu).
    console.log('UYARI: --sifirla verilmedi. Referans tablolar TEMIZLENMEDEN uzerine')
    console.log('       eklenecek. Bos olmayan bir base\'de bu KAYITLARI CIFTLER.\n')
  }

  console.log('Yazma:')
  await yaz(TABLO.magazalar, magazalar as Record<string, unknown>[])
  await yaz(TABLO.kameralar, kameralar as Record<string, unknown>[])
  await yaz(TABLO.kullanicilar, kullanicilar as Record<string, unknown>[])
  await yaz(TABLO.kurallar, kurallar as Record<string, unknown>[])
  await yaz(TABLO.metrikler, metrikler as Record<string, unknown>[])

  console.log(`\nToplam Airtable istegi: ${istekSayaci}`)
  if (!YAZ) console.log('Hicbir sey yazilmadi. Gercekten yazmak icin: --yaz')
  console.log(`\nTelefonlar: ${DEMO_TELEFONU} (tum roller ayni numara).`)
  console.log('Telefon kilidi ACIK oldugu surece her gonderim zaten bu numaraya duser.')
}

main().catch(e => { console.error('\nHATA:', e.message); process.exit(1) })
