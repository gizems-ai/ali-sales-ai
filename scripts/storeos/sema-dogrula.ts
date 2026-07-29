// ════════════════════════════════════════════════════════════════════════════
//  Store OS — Airtable şema doğrulayıcı. HİÇBİR ŞEY YAZMAZ, sadece okur.
//  Base'i kurduktan sonra çalıştır: eksik tablo / eksik alan / fazla alan söyler.
//
//    npx -y tsx scripts/storeos/sema-dogrula.ts
//
//  Gereken token kapsamı: schema.bases:read
// ════════════════════════════════════════════════════════════════════════════

import { TABLO } from '../../src/lib/storeos/tipler'

const BASE = process.env.STOREOS_AIRTABLE_BASE_ID
const KEY = process.env.STOREOS_AIRTABLE_API_KEY

if (!BASE || !KEY) {
  console.error('STOREOS_AIRTABLE_BASE_ID ve STOREOS_AIRTABLE_API_KEY gerekli.')
  process.exit(2)
}

/** docs/gratis/airtable-storeos-kurulum.md ile birebir. */
const BEKLENEN: Record<string, string[]> = {
  [TABLO.magazalar]: ['Kod', 'Ad', 'Bolge', 'Sehir', 'Adres', 'Acilis Saati', 'Kapanis Saati', 'Durum', 'Kasa Toplam', 'Aktif'],
  [TABLO.kameralar]: ['Kamera ID', 'Magaza Kodu', 'Ad', 'Bolge Adi', 'Durum', 'Demo Video', 'Yetenekler', 'Sira'],
  [TABLO.kullanicilar]: ['Kullanici ID', 'Ad Soyad', 'Rol', 'Magaza Kodu', 'Telefon', 'Clerk User ID', 'Aktif', 'WA Oturum Acildi'],
  [TABLO.olaylar]: ['Olay ID', 'Magaza Kodu', 'Kamera ID', 'Olay Tipi', 'Olustu', 'Alindi', 'Severity', 'Guven', 'Metadata JSON', 'Snapshot URL', 'Klip URL', 'Kaynak Adapter', 'Islendi', 'Eslesen Kural', 'Veri Tipi'],
  [TABLO.kurallar]: ['Kural Adi', 'Olay Tipi', 'Kosullar JSON', 'Severity', 'Gorev Basligi', 'Gorev Aciklamasi', 'Hedef Rol', 'Oncelik', 'SLA Dakika', 'Eskalasyon Dakika', 'Eskalasyon Rolu', 'Bildirim Kanali', 'Kanit Gerekli', 'Sira', 'Aktif'],
  [TABLO.gorevler]: ['Gorev No', 'Baslik', 'Aciklama', 'Magaza Kodu', 'Kaynak Olay ID', 'Kural', 'Gerekce', 'Atanan Kullanici ID', 'Atanan Rol', 'Oncelik', 'Durum', 'Olusturuldu', 'Son Teslim', 'Goruldu', 'Baslandi', 'Tamamlandi', 'Kanit Gerekli', 'Kanit URL', 'Veri Tipi'],
  [TABLO.bildirimler]: ['Bildirim ID', 'Gorev No', 'Olay ID', 'Kanal', 'Alici Kullanici ID', 'Alici Telefon', 'Template', 'Govde', 'Gonderim Zamani', 'Durum', 'Saglayici Mesaj ID', 'Yanit', 'Yanit Zamani', 'Hata'],
  [TABLO.denetim]: ['Kayit ID', 'Zaman', 'Aktor', 'Aktor Tipi', 'Aksiyon', 'Entity Tipi', 'Entity ID', 'Oncesi JSON', 'Sonrasi JSON', 'IP', 'Kaynak'],
  [TABLO.metrikler]: ['Kayit ID', 'Magaza Kodu', 'Metrik Tipi', 'Deger', 'Birim', 'Zaman', 'Kaynak', 'Veri Tipi', 'Detay JSON'],
}

/** Seçenekleri kontrol edilen alanlar — eksik seçenek demo günü sessiz bozulma yaratır. */
const BEKLENEN_SECENEKLER: Record<string, Record<string, string[]>> = {
  [TABLO.gorevler]: {
    Durum: ['yeni', 'atandi', 'goruldu', 'basladi', 'beklemede', 'tamamlandi', 'onay_bekliyor', 'reddedildi', 'suresi_gecti', 'iptal'],
  },
  [TABLO.olaylar]: {
    Severity: ['info', 'low', 'medium', 'high', 'critical'],
    'Veri Tipi': ['gercek', 'demo'],
  },
  [TABLO.bildirimler]: {
    Durum: ['kuyrukta', 'gonderildi', 'teslim', 'okundu', 'yanitlandi', 'hata'],
    Yanit: ['kabul', 'devret', 'ertele'],
  },
  [TABLO.metrikler]: {
    'Veri Tipi': ['gercek', 'demo'],
  },
}

interface AtAlan { id: string; name: string; type: string; options?: { choices?: { name: string }[] } }
interface AtTablo { id: string; name: string; fields: AtAlan[] }

async function main() {
  const r = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, {
    headers: { Authorization: `Bearer ${KEY}` },
  })
  if (!r.ok) {
    console.error(`Meta API ${r.status}: ${await r.text()}`)
    console.error("Token'da schema.bases:read kapsamı var mı?")
    process.exit(2)
  }

  const { tables } = (await r.json()) as { tables: AtTablo[] }
  const mevcut = new Map(tables.map(t => [t.name, t]))
  let hata = 0

  for (const [tabloAdi, alanlar] of Object.entries(BEKLENEN)) {
    const t = mevcut.get(tabloAdi)
    if (!t) {
      console.error(`✗ TABLO YOK: ${tabloAdi}`)
      hata++
      continue
    }

    const gercekAlanlar = new Set(t.fields.map(f => f.name))
    const eksik = alanlar.filter(a => !gercekAlanlar.has(a))
    const fazla = [...gercekAlanlar].filter(a => !alanlar.includes(a))

    // Birincil alan Airtable'da her zaman ilk alandır.
    const birincilDogru = t.fields[0]?.name === alanlar[0]

    if (!eksik.length && !fazla.length && birincilDogru) {
      console.log(`✓ ${tabloAdi.padEnd(14)} ${alanlar.length} alan tamam`)
    } else {
      console.error(`✗ ${tabloAdi}`)
      if (eksik.length) { console.error(`    eksik alan : ${eksik.join(', ')}`); hata++ }
      if (fazla.length) { console.error(`    fazla alan : ${fazla.join(', ')} (silinmeli)`); hata++ }
      if (!birincilDogru) {
        console.error(`    birincil alan '${t.fields[0]?.name}' olmalıydı '${alanlar[0]}'`)
        hata++
      }
    }

    for (const [alanAdi, secenekler] of Object.entries(BEKLENEN_SECENEKLER[tabloAdi] ?? {})) {
      const alan = t.fields.find(f => f.name === alanAdi)
      if (!alan) continue
      const mevcutSec = new Set((alan.options?.choices ?? []).map(c => c.name))
      const eksikSec = secenekler.filter(s => !mevcutSec.has(s))
      if (eksikSec.length) {
        console.error(`    ${alanAdi}: eksik seçenek → ${eksikSec.join(', ')}`)
        hata++
      }
    }
  }

  const fazlaTablo = [...mevcut.keys()].filter(n => !(n in BEKLENEN))
  if (fazlaTablo.length) console.warn(`\n! Şemada olmayan tablo: ${fazlaTablo.join(', ')}`)

  console.log(hata === 0 ? '\nŞEMA TAMAM.' : `\n${hata} sorun var — düzeltip tekrar çalıştır.`)
  process.exit(hata === 0 ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(2) })
