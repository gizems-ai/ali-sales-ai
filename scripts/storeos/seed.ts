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
 * TELEFONLAR PLACEHOLDER'DIR. Demo öncesi gerçek numaralarla değiştirilecek —
 * WhatsApp zinciri yalnız gerçek E.164 numarayla çalışır.
 */
const kullaniciTanimlari: Pick<Kullanici, 'Kullanici ID' | 'Ad Soyad' | 'Rol' | 'Telefon'>[] = [
  { 'Kullanici ID': 'u-mudur-0178',   'Ad Soyad': 'Mağaza Müdürü',   'Rol': 'magaza_muduru', 'Telefon': '+900000000001' },
  { 'Kullanici ID': 'u-bolge-ege',    'Ad Soyad': 'Ege Bölge Müdürü','Rol': 'bolge_muduru',  'Telefon': '+900000000002' },
  { 'Kullanici ID': 'u-personel-1',   'Ad Soyad': 'Reyon Personeli 1','Rol': 'personel',     'Telefon': '+900000000003' },
  { 'Kullanici ID': 'u-personel-2',   'Ad Soyad': 'Reyon Personeli 2','Rol': 'personel',     'Telefon': '+900000000004' },
  { 'Kullanici ID': 'u-guvenlik-1',   'Ad Soyad': 'Güvenlik Görevlisi','Rol': 'guvenlik',    'Telefon': '+900000000005' },
  { 'Kullanici ID': 'u-merkez-1',     'Ad Soyad': 'Merkez Operasyon', 'Rol': 'merkez',       'Telefon': '+900000000006' },
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

/** YALNIZ Veri Tipi='demo' kayıtları siler. 'gercek' işaretliye dokunmaz. */
async function demoyuSil(tablo: string) {
  const { records } = await at(tablo, { method: 'GET' }, `?filterByFormula=${encodeURIComponent("{Veri Tipi}='demo'")}&pageSize=100`)
  if (!records.length) { console.log(`  [sifirla] ${tablo.padEnd(14)} silinecek demo kaydi yok`); return }
  if (!YAZ) { console.log(`  [kuru-sifirla] ${tablo.padEnd(14)} ${records.length} demo kaydi silinecekti`); return }
  for (let i = 0; i < records.length; i += 10) {
    const q = records.slice(i, i + 10).map((r: { id: string }) => `records[]=${r.id}`).join('&')
    await at(tablo, { method: 'DELETE' }, `?${q}`)
  }
  console.log(`  [sifirla] ${tablo.padEnd(14)} ${records.length} demo kaydi silindi`)
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
    console.log('Sifirlama (yalniz Veri Tipi=demo):')
    for (const t of [TABLO.metrikler, TABLO.gorevler, TABLO.olaylar]) await demoyuSil(t)
    console.log('')
  }

  console.log('Yazma:')
  await yaz(TABLO.magazalar, magazalar as Record<string, unknown>[])
  await yaz(TABLO.kameralar, kameralar as Record<string, unknown>[])
  await yaz(TABLO.kullanicilar, kullanicilar as Record<string, unknown>[])
  await yaz(TABLO.kurallar, kurallar as Record<string, unknown>[])
  await yaz(TABLO.metrikler, metrikler as Record<string, unknown>[])

  console.log(`\nToplam Airtable istegi: ${istekSayaci}`)
  if (!YAZ) console.log('Hicbir sey yazilmadi. Gercekten yazmak icin: --yaz')
  console.log('\nUYARI: Kullanicilar tablosundaki telefonlar PLACEHOLDER (+9000000000X).')
  console.log('WhatsApp zinciri icin demo oncesi gercek E.164 numaralarla degistir.')
}

main().catch(e => { console.error('\nHATA:', e.message); process.exit(1) })
