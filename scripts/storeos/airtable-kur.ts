// ════════════════════════════════════════════════════════════════════════════
//  Store OS — Airtable base'ini Meta API ile kurar.
//
//    npx -y tsx scripts/storeos/airtable-kur.ts            # KURU KOŞU (yazmaz)
//    npx -y tsx scripts/storeos/airtable-kur.ts --uygula   # base'i GERÇEKTEN açar
//
//  Gereken token kapsamı: schema.bases:write + workspace erişimi.
//  Kurulumdan SONRA bu token kullanılmaya devam ETMEMELİ: yalnız yeni base'e
//  kapsanmış dar bir PAT üretilip `STOREOS_AIRTABLE_API_KEY` onunla
//  değiştirilmeli (Airtable PAT üretimini API'den vermiyor, panelden yapılır).
//
//  ── TEK GERÇEK KAYNAK ─────────────────────────────────────────────────────
//  Seçenek listeleri `src/lib/storeos/tipler.ts`'ten IMPORT edilir, burada
//  yeniden yazılmaz. Bir enum'a değer eklendiği gün Airtable şeması da
//  otomatik doğru olur; kopyalasaydık sessizce kayarlardı.
//
//  ── AIRTABLE TUZAĞI: `precision` ONDALIK BASAMAK SAYISIDIR ────────────────
//  Kurulum dokümanı tam sayı alanlar için "precision 1" yazıyor; bu UI dilidir.
//  API'de tam sayı = `precision: 0`. 1 yazsaydık `Kasa Toplam` 12.0 gibi
//  görünürdü. Doküman düzeltildi.
// ════════════════════════════════════════════════════════════════════════════

import {
  AKTOR_TIPI, BILDIRIM_DURUMU, GOREV_DURUMLARI, KAMERA_DURUMU, KANAL,
  MAGAZA_DURUMU, METRIK_KAYNAGI, ONCELIK, ROLLER, SEVERITY, TABLO, VERI_TIPI,
} from '../../src/lib/storeos/tipler'

const UYGULA = process.argv.includes('--uygula')
const KEY = process.env.STOREOS_AIRTABLE_API_KEY
const WORKSPACE = process.env.STOREOS_AIRTABLE_WORKSPACE_ID ?? 'wspC94cHFBBg2TZKc'
const BASE_ADI = 'Ali Store OS'

/** Bu base'e ait olmayan hiçbir şeye dokunmayacağımızın script içindeki kaydı. */
const DOKUNULMAYACAK = ['appGYQQR2f6wqW0lV', 'appjULACncjRV48pf', 'appU51BpE3zDLumLV']

// ─── Alan kısayolları ───────────────────────────────────────────────────────

type Alan = { name: string; type: string; options?: Record<string, unknown> }

const yazi = (name: string): Alan => ({ name, type: 'singleLineText' })
const uzun = (name: string): Alan => ({ name, type: 'multilineText' })
const url = (name: string): Alan => ({ name, type: 'url' })
const telefon = (name: string): Alan => ({ name, type: 'phoneNumber' })
const kutu = (name: string): Alan =>
  ({ name, type: 'checkbox', options: { icon: 'check', color: 'greenBright' } })
const sayi = (name: string, basamak: 0 | 2): Alan =>
  ({ name, type: 'number', options: { precision: basamak } })
/** Saat dilimi SABİT: aksi halde API'den yazdığımız ISO değerler UI'da kayar. */
const tarih = (name: string): Alan => ({
  name, type: 'dateTime',
  options: {
    dateFormat: { name: 'iso' },
    timeFormat: { name: '24hour' },
    timeZone: 'Europe/Istanbul',
  },
})
const secim = (name: string, secenekler: readonly string[]): Alan => ({
  name, type: 'singleSelect',
  options: { choices: secenekler.map(s => ({ name: s })) },
})

// Yalnız bu dosyada geçen, tipler.ts'te enum karşılığı olmayan listeler.
const BOLGELER = ['Ege', 'Marmara', 'Ic Anadolu', 'Akdeniz'] as const
const KAMERA_BOLGELERI = ['Giris', 'Kasa Alani', 'Kozmetik Reyon', 'Depo'] as const
const BIRIMLER = ['kisi', 'TL', 'sn', 'yuzde', 'adet', 'C', 'dk'] as const
const DENETIM_KAYNAKLARI = ['api', 'panel', 'n8n', 'cron', 'seed'] as const

// ─── Şema — docs/gratis/airtable-storeos-kurulum.md ile birebir ─────────────
// İlk alan Airtable'ın birincil alanıdır; sıra dokümandaki sıradır.

const SEMA: { name: string; description: string; fields: Alan[] }[] = [
  {
    name: TABLO.magazalar,
    description: 'Magaza kunyeleri. Demoda tek magaza (0178) var.',
    fields: [
      yazi('Kod'), yazi('Ad'), secim('Bolge', BOLGELER), yazi('Sehir'), uzun('Adres'),
      yazi('Acilis Saati'), yazi('Kapanis Saati'), secim('Durum', MAGAZA_DURUMU),
      sayi('Kasa Toplam', 0), kutu('Aktif'),
    ],
  },
  {
    name: TABLO.kameralar,
    description: 'Kamera envanteri. Demo videolari public/storeos altindan servis edilir.',
    fields: [
      yazi('Kamera ID'), yazi('Magaza Kodu'), yazi('Ad'),
      secim('Bolge Adi', KAMERA_BOLGELERI), secim('Durum', KAMERA_DURUMU),
      yazi('Demo Video'), yazi('Yetenekler'), sayi('Sira', 0),
    ],
  },
  {
    name: TABLO.kullanicilar,
    description: 'Gorev sahipleri. Telefon E.164. Demo telefon kilidi acikken gercek numaralara mesaj GITMEZ.',
    fields: [
      yazi('Kullanici ID'), yazi('Ad Soyad'), secim('Rol', ROLLER), yazi('Magaza Kodu'),
      telefon('Telefon'), yazi('Clerk User ID'), kutu('Aktif'), tarih('WA Oturum Acildi'),
    ],
  },
  {
    name: TABLO.olaylar,
    description: 'Vision partneri olay girisi. Olay ID = idempotency anahtari.',
    fields: [
      yazi('Olay ID'), yazi('Magaza Kodu'), yazi('Kamera ID'),
      // Olay Tipi bilerek TEXT: partner haber vermeden yeni tip gonderebilir,
      // select olsaydi typecast sessizce yeni secenek yaratirdi.
      yazi('Olay Tipi'),
      tarih('Olustu'), tarih('Alindi'), secim('Severity', SEVERITY), sayi('Guven', 2),
      uzun('Metadata JSON'), url('Snapshot URL'), url('Klip URL'), yazi('Kaynak Adapter'),
      kutu('Islendi'), yazi('Eslesen Kural'), secim('Veri Tipi', VERI_TIPI),
    ],
  },
  {
    name: TABLO.kurallar,
    description: 'Olay -> gorev kural motoru. Sira kucuk olan once degerlendirilir.',
    fields: [
      yazi('Kural Adi'), yazi('Olay Tipi'), uzun('Kosullar JSON'), secim('Severity', SEVERITY),
      yazi('Gorev Basligi'), uzun('Gorev Aciklamasi'), secim('Hedef Rol', ROLLER),
      secim('Oncelik', ONCELIK), sayi('SLA Dakika', 0), sayi('Eskalasyon Dakika', 0),
      secim('Eskalasyon Rolu', ROLLER), secim('Bildirim Kanali', KANAL),
      kutu('Kanit Gerekli'), sayi('Sira', 0), kutu('Aktif'),
    ],
  },
  {
    name: TABLO.gorevler,
    description: 'Gorev kayitlari. Durum makinesi gorev-makinesi.ts icinde.',
    fields: [
      yazi('Gorev No'), yazi('Baslik'), uzun('Aciklama'), yazi('Magaza Kodu'),
      yazi('Kaynak Olay ID'), yazi('Kural'), uzun('Gerekce'), yazi('Atanan Kullanici ID'),
      secim('Atanan Rol', ROLLER), secim('Oncelik', ONCELIK),
      secim('Durum', GOREV_DURUMLARI),
      tarih('Olusturuldu'), tarih('Son Teslim'), tarih('Goruldu'), tarih('Baslandi'),
      tarih('Tamamlandi'), kutu('Kanit Gerekli'), url('Kanit URL'),
      secim('Veri Tipi', VERI_TIPI),
    ],
  },
  {
    name: TABLO.bildirimler,
    description: 'Giden WhatsApp bildirimleri. Saglayici Mesaj ID = inbound eslesmesi.',
    fields: [
      yazi('Bildirim ID'), yazi('Gorev No'), yazi('Olay ID'), secim('Kanal', KANAL),
      yazi('Alici Kullanici ID'), telefon('Alici Telefon'),
      // Gonderilen Telefon: mesajin GERCEKTEN gittigi numara. Demo telefon
      // kilidi acikken 'Alici Telefon'dan farklidir; inbound kapi 4 buna bakar.
      telefon('Gonderilen Telefon'),
      yazi('Template'), uzun('Govde'), tarih('Gonderim Zamani'),
      secim('Durum', BILDIRIM_DURUMU), yazi('Saglayici Mesaj ID'),
      secim('Yanit', ['kabul', 'devret', 'ertele']), tarih('Yanit Zamani'), uzun('Hata'),
    ],
  },
  {
    name: TABLO.denetim,
    description: 'APPEND-ONLY. denetim.ts icinde yalnizca yaz() vardir; sil/guncelle yoktur.',
    fields: [
      yazi('Kayit ID'), tarih('Zaman'), yazi('Aktor'), secim('Aktor Tipi', AKTOR_TIPI),
      yazi('Aksiyon'), yazi('Entity Tipi'), yazi('Entity ID'),
      uzun('Oncesi JSON'), uzun('Sonrasi JSON'), yazi('IP'),
      secim('Kaynak', DENETIM_KAYNAKLARI),
    ],
  },
  {
    name: TABLO.metrikler,
    description: 'Pano metrikleri. Veri Tipi durustluk kuralinin (madde 11) tasiyicisidir.',
    fields: [
      yazi('Kayit ID'), yazi('Magaza Kodu'), yazi('Metrik Tipi'), sayi('Deger', 2),
      secim('Birim', BIRIMLER), tarih('Zaman'), secim('Kaynak', METRIK_KAYNAGI),
      secim('Veri Tipi', VERI_TIPI), uzun('Detay JSON'),
    ],
  },
]

// ─── Kuru koşu çıktısı ──────────────────────────────────────────────────────

function ozet(a: Alan): string {
  const c = (a.options?.choices as { name: string }[] | undefined)?.map(x => x.name)
  if (c) return `singleSelect(${c.length}) → ${c.join(' · ')}`
  if (a.type === 'number') return `number(precision ${a.options?.precision})`
  if (a.type === 'dateTime') return 'dateTime(iso · 24h · Europe/Istanbul)'
  return a.type
}

function bas(): void {
  console.log('\n══ AIRTABLE BASE — KURU KOŞU ═══════════════════════════════════')
  console.log(`   Base adı  : ${BASE_ADI}`)
  console.log(`   Workspace : ${WORKSPACE}`)
  console.log(`   Tablo     : ${SEMA.length}   ·   Alan: ${SEMA.reduce((n, t) => n + t.fields.length, 0)}`)
  console.log(`   Dokunulmayacak base'ler: ${DOKUNULMAYACAK.join(', ')}`)
  for (const t of SEMA) {
    console.log(`\n  ┌─ ${t.name}  (${t.fields.length} alan)`)
    t.fields.forEach((a, i) => {
      const isaret = i === 0 ? '★' : ' '
      console.log(`  │ ${isaret} ${String(i + 1).padStart(2)}. ${a.name.padEnd(22)} ${ozet(a)}`)
    })
    console.log('  └─')
  }
  console.log('\n  ★ = birincil alan (Airtable ilk alanı birincil yapar)')
}

// ─── Uygulama ───────────────────────────────────────────────────────────────

async function kur(): Promise<void> {
  const y = await fetch('https://api.airtable.com/v0/meta/bases', {
    method: 'POST',
    headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ name: BASE_ADI, workspaceId: WORKSPACE, tables: SEMA }),
  })
  const govde = await y.text()
  if (!y.ok) {
    console.error(`\n  ✗ Base oluşturulamadı — HTTP ${y.status}\n${govde.slice(0, 800)}`)
    process.exit(1)
  }
  const j = JSON.parse(govde) as { id: string; tables: { id: string; name: string }[] }
  console.log(`\n  ✓ Base oluşturuldu: ${j.id}`)
  for (const t of j.tables) console.log(`     ${t.id}  ${t.name}`)
  console.log('\n  Sıradaki iki adım:')
  console.log(`     1) .env.local → STOREOS_AIRTABLE_BASE_ID=${j.id}`)
  console.log('     2) YALNIZ bu base\'e kapsanmış yeni bir PAT üret ve')
  console.log('        STOREOS_AIRTABLE_API_KEY\'i onunla değiştir.')
}

async function main(): Promise<void> {
  bas()
  if (!UYGULA) {
    console.log('\n  KURU KOŞU — hiçbir şey oluşturulmadı.')
    console.log('  Gerçekten kurmak için: --uygula\n')
    return
  }
  if (!KEY) {
    console.error('\n  ✗ STOREOS_AIRTABLE_API_KEY tanımlı değil.\n')
    process.exit(2)
  }
  await kur()
}

void main()
