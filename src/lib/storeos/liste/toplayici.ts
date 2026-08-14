// ════════════════════════════════════════════════════════════════════════════
//  Store OS — LİSTE TOPLAYICISI (Alarmlar · Görevler · Denetim)
//
//  Depo satırları → `ListeVerisi`. Panonun `dashboard/toplayici.ts`'i ile aynı
//  sözleşme: bileşen depo tipi görmez, sıralama burada, seed→gerçek geçişi tek
//  dosyada olur.
//
//  ── FİLTRELEME NEDEN BURADA, DEPODA DEĞİL ──────────────────────────────────
//  `OlayDeposu.listele` yalnız `{magazaKodu, limit}` alıyor; severity filtresi
//  yok. Arayüze parametre eklemek `bellek.ts` + `airtable.ts`'in İKİSİNİ birden
//  değiştirmek demek ve `airtable.ts` henüz canlı bir base'e karşı hiç
//  koşmadı (kimlik bilgileri bekliyor). Test edilemeyecek `filterByFormula`
//  string'leri yazmak yerine filtre burada, bellekte yapılıyor.
//
//  BEDELİ AÇIK: tavan kadar ham satır çekilir, filtre sonra uygulanır. Yani
//  "son 200 olay içinde kaç kritik var" sorusunun cevabı doğru, "tüm zamanlarda
//  kaç kritik var" sorusununki değil. Ekran bunu `tavanaUlasildi` ile söyler.
//  Airtable canlıya bağlanınca burası sunucu-taraflı filtreye döner (backlog).
//
//  ── DEPO-BAĞIMSIZLIK (pano ile aynı) ───────────────────────────────────────
//  Sıralama her listede açıkça yapılır · `limit` her çağrıda verilir · eksik
//  kayıt hata değildir · anlık tutarlılık varsayılmaz.
// ════════════════════════════════════════════════════════════════════════════

import type { Depo } from '../depo'
import { olayBasligi, rolEtiketi, veriTipiBirlesimi } from '../dashboard/toplayici'
import { NIHAI_DURUMLAR } from '../gorev'
import { gorevDurumEtiketi, severityEtiketi } from '../tema'
import type {
  DenetimSatiri, Gorev, Kamera, Kullanici, OlayKaydi, Severity, VeriTipi,
} from '../tipler'
import type {
  AlarmDetayi, DenetimGorunumu, GorevDetayi, Gorunum, ListeFiltresi,
  ListeVerisi, MetadataCifti, SecenekSayaci,
} from './tipler'
import { TAVAN } from './tipler'

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

/** ISO azalan — geçersiz/boş tarih EN SONA düşer, patlamaz (pano ile aynı). */
function isoAzalan(a: string | undefined, b: string | undefined): number {
  const x = a ? Date.parse(a) : NaN
  const y = b ? Date.parse(b) : NaN
  if (Number.isNaN(x) && Number.isNaN(y)) return 0
  if (Number.isNaN(x)) return 1
  if (Number.isNaN(y)) return -1
  return y - x
}

const ONCELIK_AGIRLIGI: Record<string, number> = {
  kritik: 0, yuksek: 1, normal: 2, dusuk: 3,
}

/** Serbest metin araması için satırın taranabilir gövdesi. */
function aranabilir(...parcalar: (string | null | undefined)[]): string {
  return parcalar.filter(Boolean).join(' ').toLocaleLowerCase('tr')
}

/**
 * Metadata JSON → ad-değer çiftleri. Bozuk JSON ekranı düşürmez: Airtable'da
 * bir hücreyi elle düzenleyen biri tüm listeyi karartmasın (pano ile aynı
 * gerekçe). İç içe nesneler JSON olarak tek satıra sıkıştırılır — metadata
 * sözleşmesi düz anahtar vaat ediyor, ama partner bozarsa ekran ayakta kalır.
 */
function metadataCiftleri(ham: string | undefined): MetadataCifti[] {
  if (!ham) return []
  let coz: unknown
  try {
    coz = JSON.parse(ham)
  } catch {
    return [{ anahtar: 'ham', deger: ham.slice(0, 200) }]
  }
  if (!coz || typeof coz !== 'object' || Array.isArray(coz)) return []
  return Object.entries(coz as Record<string, unknown>).map(([anahtar, deger]) => ({
    anahtar,
    deger:
      deger === null || deger === undefined ? '—'
      : typeof deger === 'object' ? JSON.stringify(deger)
      : String(deger),
  }))
}

/** Seçenek sayaçları — HAM kümeden sayılır, filtreden önce (bkz. tipler.ts). */
function sayaclar(
  ham: string[],
  siralama: readonly string[],
  etiketle: (d: string) => string,
  hepsiEtiketi: string,
): SecenekSayaci[] {
  const adet = new Map<string, number>()
  for (const d of ham) adet.set(d, (adet.get(d) ?? 0) + 1)
  return [
    { deger: 'hepsi', etiket: hepsiEtiketi, adet: ham.length },
    ...siralama
      .filter(d => (adet.get(d) ?? 0) > 0)
      .map(d => ({ deger: d, etiket: etiketle(d), adet: adet.get(d) ?? 0 })),
  ]
}

// ─── Alarmlar ────────────────────────────────────────────────────────────────

const SEVERITY_SIRASI: readonly Severity[] = ['critical', 'high', 'medium', 'low', 'info']

function alarmDetayi(
  o: OlayKaydi,
  kameraAdlari: Map<string, string>,
  olaydanGorev: Map<string, string>,
): AlarmDetayi {
  const kameraId = o['Kamera ID'] ?? null
  return {
    olayId: o['Olay ID'],
    olayTipi: o['Olay Tipi'],
    baslik: olayBasligi(o['Olay Tipi']),
    severity: o['Severity'],
    olustu: o['Olustu'],
    alindi: o['Alindi'],
    kameraId,
    kameraAdi: kameraId ? kameraAdlari.get(kameraId) ?? kameraId : null,
    guven: o['Guven'],
    kaynakAdapter: o['Kaynak Adapter'],
    islendi: o['Islendi'],
    // BOŞ DİZİ DEĞİL, NULL: alım katmanı hiçbir kural eşleşmediğinde bu alana
    // '' yazıyor (bkz. olay-alim.ts). Boş metni olduğu gibi taşırsak ekran
    // "kural eşleşti ama görev bulunamadı" der — kural hiç eşleşmemişken.
    eslesenKural: o['Eslesen Kural']?.trim() || null,
    gorevNo: olaydanGorev.get(o['Olay ID']) ?? null,
    metadata: metadataCiftleri(o['Metadata JSON']),
    snapshotUrl: o['Snapshot URL'] ?? null,
    veriTipi: o['Veri Tipi'],
  }
}

interface AlarmParca {
  satirlar: AlarmDetayi[]
  tarandi: number
  secenekler: SecenekSayaci[]
}

async function alarmlariTopla(
  d: Depo, magazaKodu: string, f: ListeFiltresi,
): Promise<AlarmParca> {
  const [olaylar, kameralar, gorevler] = await Promise.all([
    d.olaylar.listele({ magazaKodu, limit: TAVAN.alarmlar }),
    d.referans.kameralar(magazaKodu),
    // Olay → görev bağını kurmak için. Görev tavanı ayrı: bir olayın görevi
    // tavanın dışında kalırsa `gorevNo` null döner ve ekran bunu "kural
    // eşleşti ama görev listede yok" diye ayırt edebilsin diye `eslesenKural`
    // ayrıca taşınıyor.
    d.gorevler.listele({ magazaKodu, limit: TAVAN.gorevler }),
  ])

  const kameraAdlari = new Map<string, string>(
    (kameralar as Kamera[]).map(k => [k['Kamera ID'], k['Ad']]),
  )
  const olaydanGorev = new Map<string, string>()
  for (const g of gorevler as Gorev[]) {
    const kaynak = g['Kaynak Olay ID']
    // Aynı olaydan birden çok görev doğabilir (farklı kural). İlk eşleşen
    // kalır — liste satırı tek numara gösterir, detayı görev ekranında.
    if (kaynak && !olaydanGorev.has(kaynak)) olaydanGorev.set(kaynak, g['Gorev No'])
  }

  const ham = [...(olaylar as OlayKaydi[])]
    .sort((a, b) => isoAzalan(a['Olustu'], b['Olustu']))   // en yeni üstte
    .slice(0, TAVAN.alarmlar)
    .map(o => alarmDetayi(o, kameraAdlari, olaydanGorev))

  const q = f.q?.toLocaleLowerCase('tr') ?? null
  const satirlar = ham.filter(a => {
    if (f.severity !== 'hepsi' && a.severity !== f.severity) return false
    if (f.entity && a.olayId !== f.entity && a.gorevNo !== f.entity) return false
    if (q && !aranabilir(a.baslik, a.olayTipi, a.olayId, a.kameraAdi, a.eslesenKural, a.gorevNo).includes(q)) return false
    return true
  })

  return {
    satirlar,
    tarandi: (olaylar as OlayKaydi[]).length,
    secenekler: sayaclar(
      ham.map(a => a.severity), SEVERITY_SIRASI,
      s => severityEtiketi(s as Severity), 'Tümü',
    ),
  }
}

// ─── Görevler ────────────────────────────────────────────────────────────────

const DK = 60_000

function gorevDetayi(g: Gorev, adlar: Map<string, string>, simdi: number): GorevDetayi {
  const teslim = Date.parse(g['Son Teslim'])
  const nihai = NIHAI_DURUMLAR.includes(g['Durum'])
  return {
    gorevNo: g['Gorev No'],
    baslik: g['Baslik'],
    aciklama: g['Aciklama'],
    durum: g['Durum'],
    oncelik: g['Oncelik'],
    atananAd: g['Atanan Kullanici ID'] ? adlar.get(g['Atanan Kullanici ID']) ?? null : null,
    atananRol: rolEtiketi(g['Atanan Rol']),
    olusturuldu: g['Olusturuldu'],
    sonTeslim: g['Son Teslim'],
    goruldu: g['Goruldu'] ?? null,
    baslandi: g['Baslandi'] ?? null,
    tamamlandi: g['Tamamlandi'] ?? null,
    // Gecikme SUNUCUDA — istemci saati yanlışsa demo boyunca her görev kırmızı
    // görünürdü (pano ile birebir aynı kural).
    gecikti: !Number.isNaN(teslim) && teslim < simdi && !nihai,
    kalanDk: nihai || Number.isNaN(teslim) ? null : Math.round((teslim - simdi) / DK),
    kural: g['Kural'] ?? null,
    gerekce: g['Gerekce'],
    kaynakOlayId: g['Kaynak Olay ID'] ?? null,
    kanitGerekli: g['Kanit Gerekli'],
    kanitUrl: g['Kanit URL'] ?? null,
    veriTipi: g['Veri Tipi'],
  }
}

/** Süzgeç grubu → satır eşleşiyor mu. Durum listesi ELLE TUTULMAZ: açık olmak
 *  "nihai değil" demektir, `NIHAI_DURUMLAR` tek kaynaktır. */
function gorevSuzgeciGecer(g: GorevDetayi, suzgec: string): boolean {
  switch (suzgec) {
    case 'acik':       return !NIHAI_DURUMLAR.includes(g.durum)
    case 'gecikmis':   return g.gecikti
    case 'tamamlandi': return g.durum === 'tamamlandi'
    default:           return true
  }
}

interface GorevParca {
  satirlar: GorevDetayi[]
  tarandi: number
  secenekler: SecenekSayaci[]
}

async function gorevleriTopla(
  d: Depo, magazaKodu: string, f: ListeFiltresi, simdi: number,
): Promise<GorevParca> {
  const [gorevler, kullanicilar] = await Promise.all([
    d.gorevler.listele({ magazaKodu, limit: TAVAN.gorevler }),
    d.referans.kullanicilar(magazaKodu),
  ])

  const adlar = new Map<string, string>(
    (kullanicilar as Kullanici[]).map(u => [u['Kullanici ID'], u['Ad Soyad']]),
  )

  const ham = [...(gorevler as Gorev[])]
    .map(g => gorevDetayi(g, adlar, simdi))
    // Açık görevler önce (nihai durumlar dibe), sonra öncelik, sonra teslim
    // yakınlığı. Panodaki sıralamayla aynı — iki ekran aynı işi farklı sırada
    // gösterirse kullanıcı hangisinin doğru olduğunu bilemez.
    .sort((a, b) => {
      const an = NIHAI_DURUMLAR.includes(a.durum) ? 1 : 0
      const bn = NIHAI_DURUMLAR.includes(b.durum) ? 1 : 0
      if (an !== bn) return an - bn
      const ao = ONCELIK_AGIRLIGI[a.oncelik] ?? 9
      const bo = ONCELIK_AGIRLIGI[b.oncelik] ?? 9
      if (ao !== bo) return ao - bo
      return -isoAzalan(a.sonTeslim, b.sonTeslim)   // teslimi yakın olan üstte
    })
    .slice(0, TAVAN.gorevler)

  const q = f.q?.toLocaleLowerCase('tr') ?? null
  const satirlar = ham.filter(g => {
    if (!gorevSuzgeciGecer(g, f.durum)) return false
    if (f.entity && g.gorevNo !== f.entity && g.kaynakOlayId !== f.entity) return false
    if (q && !aranabilir(g.baslik, g.aciklama, g.gorevNo, g.atananAd, g.atananRol, g.kural, gorevDurumEtiketi(g.durum)).includes(q)) return false
    return true
  })

  // Süzgeç sayaçları GRUP bazlı — durum bazlı değil. Her satır birden çok
  // gruba girebilir (gecikmiş bir görev aynı zamanda açıktır), o yüzden
  // `sayaclar()` yerine elle sayılıyor.
  const secenekler: SecenekSayaci[] = [
    { deger: 'hepsi',      etiket: 'Tümü',       adet: ham.length },
    { deger: 'acik',       etiket: 'Açık',       adet: ham.filter(g => !NIHAI_DURUMLAR.includes(g.durum)).length },
    { deger: 'gecikmis',   etiket: 'Gecikmiş',   adet: ham.filter(g => g.gecikti).length },
    { deger: 'tamamlandi', etiket: 'Tamamlandı', adet: ham.filter(g => g.durum === 'tamamlandi').length },
  ]

  return { satirlar, tarandi: (gorevler as Gorev[]).length, secenekler }
}

// ─── Denetim ─────────────────────────────────────────────────────────────────

/** Aksiyon kodu → Türkçe. Bilinmeyen kod REDDEDİLMEZ, ham hâliyle gösterilir. */
const AKSIYON_ETIKETLERI: Record<string, string> = {
  'olay.kabul':               'Olay kabul edildi',
  'olay.yinelenen':           'Yinelenen olay',
  'olay.reddedildi':          'Olay reddedildi',
  'olay.imza_hatasi':         'İmza hatası',
  'kural.eslesti':            'Kural eşleşti',
  'kural.eslesmedi':          'Kural eşleşmedi',
  'gorev.olusturuldu':        'Görev oluşturuldu',
  'gorev.durum':              'Görev durumu değişti',
  'gorev.gecis_reddedildi':   'Geçiş reddedildi',
  'bildirim.kuyruga_alindi':  'Bildirim kuyruğa alındı',
  'bildirim.gonderildi':      'Bildirim gönderildi',
  'bildirim.yanit':           'Bildirime yanıt geldi',
  'bildirim.hata':            'Bildirim hatası',
}

function aksiyonEtiketi(a: string): string {
  return AKSIYON_ETIKETLERI[a] ?? a
}

/**
 * `Sonrasi JSON` → tek satırlık özet. Ham JSON tabloya basılmaz: denetim
 * gövdesi 8k'ya kadar çıkabiliyor ve satırı kullanılamaz hale getirir.
 * İlk üç alan gösterilir; gerisi "+N alan" olarak sayılır.
 */
function denetimOzeti(satir: DenetimSatiri): string | null {
  const ham = satir['Sonrasi JSON'] ?? satir['Oncesi JSON']
  if (!ham) return null
  let coz: unknown
  try {
    coz = JSON.parse(ham)
  } catch {
    return ham.slice(0, 120)
  }
  if (coz === null || typeof coz !== 'object') return String(coz).slice(0, 120)
  const girisler = Object.entries(coz as Record<string, unknown>)
  if (girisler.length === 0) return null
  const bas = girisler.slice(0, 3).map(([k, v]) => {
    const d = v === null || v === undefined ? '—'
      : typeof v === 'object' ? '{…}'
      : String(v)
    return `${k}: ${d.length > 40 ? `${d.slice(0, 40)}…` : d}`
  })
  const kalan = girisler.length - bas.length
  return kalan > 0 ? `${bas.join(' · ')} · +${kalan} alan` : bas.join(' · ')
}

function denetimGorunumu(s: DenetimSatiri): DenetimGorunumu {
  return {
    kayitId: s['Kayit ID'],
    zaman: s['Zaman'],
    aktor: s['Aktor'],
    aktorTipi: s['Aktor Tipi'],
    aksiyon: s['Aksiyon'],
    aksiyonEtiketi: aksiyonEtiketi(s['Aksiyon']),
    entityTipi: s['Entity Tipi'],
    entityId: s['Entity ID'],
    kaynak: s['Kaynak'],
    ozet: denetimOzeti(s),
  }
}

interface DenetimParca {
  satirlar: DenetimGorunumu[]
  tarandi: number
  secenekler: SecenekSayaci[]
}

async function denetimTopla(d: Depo, f: ListeFiltresi): Promise<DenetimParca> {
  // DİKKAT: denetim satırında mağaza kodu YOKTUR — kayıt entity'ye bağlıdır,
  // mağazaya değil. Bu ekran tek mağazalı demoda tüm kayıtları gösterir ve
  // bunu kullanıcıya söyler (bkz. ekran altbilgisi). Çok mağazalı gerçek
  // üründe denetim satırına mağaza kodu eklenmesi gerekecek — backlog.
  const ham = await d.denetim.listele({
    // `entity` filtresi arayüzde ZATEN var: tek yer, sunucu tarafında uygulanır.
    entityId: f.entity ?? undefined,
    limit: TAVAN.denetim,
  })

  const satirlarHam = [...ham]
    .sort((a, b) => isoAzalan(a['Zaman'], b['Zaman']))   // en yeni üstte
    .slice(0, TAVAN.denetim)
    .map(denetimGorunumu)

  const q = f.q?.toLocaleLowerCase('tr') ?? null
  const satirlar = satirlarHam.filter(s => {
    if (!q) return true
    return aranabilir(s.aksiyonEtiketi, s.aksiyon, s.entityId, s.entityTipi, s.aktor, s.kaynak, s.ozet).includes(q)
  })

  // Denetimde süzgeç düğmeleri aksiyon bazlı DEĞİL — 13 aksiyon çok fazla
  // düğme eder. Sayaçlar bilgi amaçlı taşınır, ekran bunları özet şerit
  // olarak çizer, tıklanabilir değildir.
  const aksiyonlar = satirlarHam.map(s => s.aksiyon)
  const benzersiz = [...new Set(aksiyonlar)].sort()
  const secenekler = sayaclar(aksiyonlar, benzersiz, aksiyonEtiketi, 'Tüm kayıtlar')

  return { satirlar, tarandi: ham.length, secenekler }
}

// ─── Giriş noktası ───────────────────────────────────────────────────────────

export interface ListeGirdi {
  depo: Depo
  magazaKodu: string
  gorunum: Gorunum
  filtre: ListeFiltresi
  /** Sunucu "şimdi"si (ms). Test edilebilirlik için dışarıdan verilebilir. */
  simdi?: number
}

export async function listeTopla(g: ListeGirdi): Promise<ListeVerisi> {
  const simdi = g.simdi ?? Date.now()
  const ortakBaz = {
    uretildi: new Date(simdi).toISOString(),
    magazaKodu: g.magazaKodu,
    filtre: g.filtre,
    tavan: TAVAN[g.gorunum],
  }

  if (g.gorunum === 'alarmlar') {
    const p = await alarmlariTopla(g.depo, g.magazaKodu, g.filtre)
    return {
      ...ortakBaz,
      gorunum: 'alarmlar',
      satirlar: p.satirlar,
      toplam: p.satirlar.length,
      tarandi: p.tarandi,
      tavanaUlasildi: p.tarandi >= TAVAN.alarmlar,
      secenekler: p.secenekler,
      veriTipi: veriTipiBirlesimi(p.satirlar.map(a => a.veriTipi)),
      bos: p.satirlar.length === 0,
    }
  }

  if (g.gorunum === 'gorevler') {
    const p = await gorevleriTopla(g.depo, g.magazaKodu, g.filtre, simdi)
    return {
      ...ortakBaz,
      gorunum: 'gorevler',
      satirlar: p.satirlar,
      toplam: p.satirlar.length,
      tarandi: p.tarandi,
      tavanaUlasildi: p.tarandi >= TAVAN.gorevler,
      secenekler: p.secenekler,
      veriTipi: veriTipiBirlesimi(p.satirlar.map(x => x.veriTipi)),
      bos: p.satirlar.length === 0,
    }
  }

  const p = await denetimTopla(g.depo, g.filtre)
  return {
    ...ortakBaz,
    gorunum: 'denetim',
    satirlar: p.satirlar,
    toplam: p.satirlar.length,
    tarandi: p.tarandi,
    tavanaUlasildi: p.tarandi >= TAVAN.denetim,
    secenekler: p.secenekler,
    // Denetim satırında `Veri Tipi` alanı YOK. Bilinmeyen köken 'gercek' diye
    // etiketlenmez (madde 11) — boş liste 'demo' döndürür.
    veriTipi: veriTipiBirlesimi([] as (VeriTipi | undefined)[]),
    bos: p.satirlar.length === 0,
  }
}
