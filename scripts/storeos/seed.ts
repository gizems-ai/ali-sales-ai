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

import { TABLO } from '../../src/lib/storeos/tipler'
import type {
  Magaza, Kamera, Kullanici, Kural, Metrik,
} from '../../src/lib/storeos/tipler'

const BASE = process.env.STOREOS_AIRTABLE_BASE_ID
const KEY = process.env.STOREOS_AIRTABLE_API_KEY

const YAZ = process.argv.includes('--yaz')
const SIFIRLA = process.argv.includes('--sifirla')
const TARIH = (process.argv.find(a => a.startsWith('--tarih=')) ?? '').split('=')[1]

// ─── Deterministik sayı üreteci ──────────────────────────────────────────────
// Kaynak fikri: src/lib/stok-sinyal.ts (seed/pick). Kopyalanmadı, yeniden yazıldı.

function tohum(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** [alt, ust] aralığında deterministik tam sayı. */
function sec(anahtar: string, alt: number, ust: number): number {
  const t = tohum(anahtar)
  return alt + (t % (ust - alt + 1))
}

/** [alt, ust] aralığında deterministik ondalık (2 basamak). */
function secOndalik(anahtar: string, alt: number, ust: number): number {
  const t = tohum(anahtar)
  return Math.round((alt + ((t % 10000) / 10000) * (ust - alt)) * 100) / 100
}

// ─── Zaman ───────────────────────────────────────────────────────────────────

const GUN = TARIH ?? new Date().toISOString().slice(0, 10)
const iso = (saat: number, dk = 0) =>
  new Date(`${GUN}T${String(saat).padStart(2, '0')}:${String(dk).padStart(2, '0')}:00+03:00`).toISOString()

const SIMDI = iso(14, 30) // demo "şu an"ı — sabit, prova tekrarlanabilir olsun

// ─── Sabitler ────────────────────────────────────────────────────────────────

const MAGAZA = '0178'
const REYONLAR = ['Kozmetik', 'Kisisel Bakim', 'Parfum', 'Sac Bakim', 'Temizlik'] as const

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

const kurallar: Partial<Kural>[] = [
  {
    'Kural Adi': 'Kasa kuyrugu esigi',
    'Olay Tipi': 'queue.threshold_exceeded',
    'Kosullar JSON': JSON.stringify([{ alan: 'metadata.kisi', operator: '>=', deger: 6 }]),
    'Severity': 'high',
    'Gorev Basligi': 'Kasa kuyrugu {kisi} kisiye ulasti — ek kasa ac',
    'Gorev Aciklamasi': '{magaza} kasa alaninda bekleme {bekleme_sn} sn. Ek kasa acilmasi gerekiyor.',
    'Hedef Rol': 'magaza_muduru', 'Oncelik': 'kritik',
    'SLA Dakika': 10, 'Eskalasyon Dakika': 5, 'Eskalasyon Rolu': 'bolge_muduru',
    'Bildirim Kanali': 'whatsapp', 'Kanit Gerekli': false, 'Sira': 10, 'Aktif': true,
  },
  {
    'Kural Adi': 'Kasa kuyrugu erken uyari',
    'Olay Tipi': 'queue.threshold_exceeded',
    'Kosullar JSON': JSON.stringify([
      { alan: 'metadata.kisi', operator: '>=', deger: 4 },
      { alan: 'metadata.kisi', operator: '<', deger: 6 },
    ]),
    'Severity': 'medium',
    'Gorev Basligi': 'Kasa kuyrugu artiyor ({kisi} kisi)',
    'Gorev Aciklamasi': 'Kuyruk esige yaklasiyor, izlemede kal.',
    'Hedef Rol': 'magaza_muduru', 'Oncelik': 'normal',
    'SLA Dakika': 20, 'Eskalasyon Dakika': 15, 'Eskalasyon Rolu': 'magaza_muduru',
    'Bildirim Kanali': 'panel', 'Kanit Gerekli': false, 'Sira': 20, 'Aktif': true,
  },
  {
    'Kural Adi': 'Raf stok dustu',
    'Olay Tipi': 'shelf.stock_low',
    'Kosullar JSON': JSON.stringify([{ alan: 'metadata.doluluk', operator: '<=', deger: 30 }]),
    'Severity': 'medium',
    'Gorev Basligi': '{reyon} rafi bosaldi (%{doluluk})',
    'Gorev Aciklamasi': '{reyon} reyonunda raf doluluğu %{doluluk}. Depodan takviye gerekiyor.',
    'Hedef Rol': 'personel', 'Oncelik': 'yuksek',
    'SLA Dakika': 30, 'Eskalasyon Dakika': 20, 'Eskalasyon Rolu': 'magaza_muduru',
    'Bildirim Kanali': 'whatsapp', 'Kanit Gerekli': true, 'Sira': 30, 'Aktif': true,
  },
  {
    'Kural Adi': 'Kamera baglantisi koptu',
    'Olay Tipi': 'camera.offline',
    'Kosullar JSON': JSON.stringify([]),
    'Severity': 'high',
    'Gorev Basligi': '{kamera} kamerasi cevrimdisi',
    'Gorev Aciklamasi': 'Kamera baglantisi koptu. Teknik ekibe bildirildi.',
    'Hedef Rol': 'merkez', 'Oncelik': 'yuksek',
    'SLA Dakika': 60, 'Eskalasyon Dakika': 30, 'Eskalasyon Rolu': 'merkez',
    'Bildirim Kanali': 'panel', 'Kanit Gerekli': false, 'Sira': 40, 'Aktif': true,
  },
  {
    'Kural Adi': 'ISG islak zemin',
    'Olay Tipi': 'safety.wet_floor',
    'Kosullar JSON': JSON.stringify([{ alan: 'confidence', operator: '>=', deger: 0.7 }]),
    'Severity': 'critical',
    'Gorev Basligi': 'Islak zemin tespit edildi — {bolge}',
    'Gorev Aciklamasi': 'Musteri guvenligi riski. Uyari levhasi koy ve temizlik cagir.',
    'Hedef Rol': 'guvenlik', 'Oncelik': 'kritik',
    'SLA Dakika': 5, 'Eskalasyon Dakika': 3, 'Eskalasyon Rolu': 'magaza_muduru',
    'Bildirim Kanali': 'whatsapp', 'Kanit Gerekli': true, 'Sira': 5, 'Aktif': true,
  },
]

// ─── Metrikler ───────────────────────────────────────────────────────────────

function metrik(tip: string, deger: number, birim: string, kaynak: Metrik['Kaynak'], detay?: unknown): Partial<Metrik> {
  return {
    'Kayit ID': `m-${MAGAZA}-${tip}-${GUN}`,
    'Magaza Kodu': MAGAZA,
    'Metrik Tipi': tip,
    'Deger': deger,
    'Birim': birim,
    'Zaman': SIMDI,
    'Kaynak': kaynak,
    'Veri Tipi': 'demo',
    ...(detay ? { 'Detay JSON': JSON.stringify(detay) } : {}),
  }
}

const acilis = 10, kapanis = 22
const saatler = Array.from({ length: kapanis - acilis }, (_, i) => acilis + i)

const kuyrukSaatlik = saatler.map(s => ({
  saat: `${String(s).padStart(2, '0')}:00`,
  ortalama: sec(`kuyruk-ort-${GUN}-${s}`, 45, 210),
  maksimum: sec(`kuyruk-max-${GUN}-${s}`, 180, 420),
}))

const satisSaatlik = saatler.map(s => ({
  saat: `${String(s).padStart(2, '0')}:00`,
  bugun: sec(`satis-b-${GUN}-${s}`, 3200, 14800),
  dun: sec(`satis-d-${GUN}-${s}`, 3000, 13900),
}))

/** 12x8 yoğunluk ızgarası — canvas/SVG ile çizilecek, statik görsel değil. */
const yogunlukGrid = {
  satir: 8,
  sutun: 12,
  hucreler: Array.from({ length: 96 }, (_, i) => sec(`grid-${GUN}-${i}`, 0, 100)),
}

const rafDoluluk = REYONLAR.map(r => ({
  reyon: r,
  doluluk: sec(`raf-${GUN}-${r}`, 22, 96),
}))

const personelDagilimi = [
  { rol: 'Kasa', adet: 3 },
  { rol: 'Reyon', adet: 4 },
  { rol: 'Depo', adet: 1 },
  { rol: 'Guvenlik', adet: 1 },
]

const metrikler: Partial<Metrik>[] = [
  metrik('ziyaretci',         sec(`ziyaretci-${GUN}`, 1150, 1980), 'kisi',  'camera'),
  metrik('satis_tutari',      sec(`satis-${GUN}`, 68000, 142000),  'TL',    'pos'),
  metrik('kasa_bekleme_sn',   sec(`bekleme-${GUN}`, 95, 260),      'sn',    'camera'),
  metrik('donusum_orani',     secOndalik(`donusum-${GUN}`, 18, 34),'yuzde', 'pos'),
  metrik('aktif_personel',    9,                                   'adet',  'manual'),
  metrik('kuyruk_kisi',       7,                                   'kisi',  'camera'),
  metrik('yogunluk',          sec(`yogunluk-${GUN}`, 55, 92),      'yuzde', 'camera'),
  metrik('ortalama_kalis_dk', sec(`kalis-${GUN}`, 9, 24),          'dk',    'camera'),
  metrik('ic_sicaklik',       secOndalik(`sicaklik-${GUN}`, 21, 26),'C',    'sensor'),
  metrik('etiket_uygunluk',   sec(`etiket-${GUN}`, 88, 99),        'yuzde', 'manual'),
  metrik('kasa_acik',         5,                                   'adet',  'pos'),
  metrik('kuyruk_saatlik',    0, 'sn',    'camera', kuyrukSaatlik),
  metrik('satis_saatlik',     0, 'TL',    'pos',    satisSaatlik),
  metrik('yogunluk_grid',     0, 'yuzde', 'camera', yogunlukGrid),
  metrik('raf_doluluk',       0, 'yuzde', 'camera', rafDoluluk),
  metrik('personel_dagilimi', 0, 'adet',  'manual', personelDagilimi),
]

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
