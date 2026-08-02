// ════════════════════════════════════════════════════════════════════════════
//  Store OS — PANO TOPLAYICISI
//
//  Depo satırları → `DashboardVerisi`. Seed→gerçek geçişi BURADA olur; hiçbir
//  bileşen depo tipi görmez. Tek toplu uç nokta (`/api/storeos/dashboard`)
//  yalnız bu dosyayı çağırır — kartlar kendi isteğini atmaz.
//
//  ── DEPO-BAĞIMSIZLIK ───────────────────────────────────────────────────────
//  Bellek deposu bugün senkron, sıralı ve anında tutarlı. Airtable hiçbirini
//  garanti etmiyor. Bu yüzden burada:
//   · Sıralama HER listede açıkça yapılır (`sirala*` yardımcıları).
//   · `limit` her çağrıda verilir — deponun "hepsini döndürmesi"ne güvenilmez.
//   · Eksik kayıt HATA DEĞİLDİR: metrik yoksa kart listede yer almaz, mağaza
//     yoksa `magaza: null` döner. Airtable'da yarım seed her zaman mümkün.
//   · Kayıt sayıları paralel değil SIRAYLA çekilmez — Airtable'ın istek/sn
//     bütçesi için `Promise.all` yerine katman bazlı sınırlı çağrı kullanılır.
// ════════════════════════════════════════════════════════════════════════════

import type { Depo } from '../depo'
import type {
  DagilimDetay, IzgaraDetay, SaatlikNokta,
} from '../depo/demo-metrikler'
import type {
  Gorev, Kamera, Kullanici, Magaza, Metrik, OlayKaydi, VeriTipi,
} from '../tipler'
import { NIHAI_DURUMLAR } from '../gorev'
import type {
  AlarmSatiri, Dagilim, DashboardVerisi, GorevOzeti, GorevSatiri, Izgara,
  KameraSatiri, Katman, KpiKarti, MagazaOzeti, PersonelSatiri, Seri,
} from './tipler'

/** Panoda gösterilen kayıt tavanları. Airtable sayfalamasını tetiklememek için. */
export const LIMITLER = { alarm: 20, gorev: 25 } as const

// ─── Etiketler ───────────────────────────────────────────────────────────────

/**
 * Olay tipi → Türkçe başlık. Listede OLMAYAN tip reddedilmez; ham tip
 * gösterilir (bilinmeyen tip kabul kararı, Gün 3). Panelin partnerden önce
 * kırılmaması için burada bir `Record` yerine arama + geri düşme var.
 */
const OLAY_BASLIKLARI: Record<string, string> = {
  'store.person_count.updated':     'Kişi sayısı güncellendi',
  'store.queue.length_changed':     'Kuyruk uzunluğu değişti',
  'store.queue.threshold_exceeded': 'Kasa kuyruğu eşiği aşıldı',
  'store.occupancy.updated':        'Mağaza doluluğu güncellendi',
  'store.dwell_time.updated':       'Ortalama kalış süresi güncellendi',
  'store.zone.person_count':        'Bölge kişi sayısı',
  'store.camera.offline':           'Kamera çevrimdışı',
  'store.camera.degraded':          'Kamera görüntüsü bozuk',
  'store.shelf.stock_low':          'Raf stoğu azaldı',
  'store.planogram.non_compliant':  'Planogram uyumsuz',
  'store.safety.event_detected':    'İş güvenliği olayı',
  'store.security.event_detected':  'Güvenlik olayı',
  'store.heatmap.snapshot':         'Isı haritası anlık görüntüsü',
}

const KPI_ETIKETLERI: Record<string, string> = {
  ziyaretci:         'Ziyaretçi',
  satis_tutari:      'Satış',
  kasa_bekleme_sn:   'Kasa bekleme',
  donusum_orani:     'Dönüşüm',
  aktif_personel:    'Aktif personel',
  kuyruk_kisi:       'Kuyruktaki kişi',
  yogunluk:          'Yoğunluk',
  ortalama_kalis_dk: 'Ortalama kalış',
  ic_sicaklik:       'İç sıcaklık',
  etiket_uygunluk:   'Etiket uygunluğu',
  kasa_acik:         'Açık kasa',
}

/** KPI kartlarının ekrandaki sırası. Burada olmayan metrik karta dönüşmez. */
const KPI_SIRASI = [
  'ziyaretci', 'satis_tutari', 'kasa_bekleme_sn', 'kuyruk_kisi',
  'donusum_orani', 'yogunluk', 'ortalama_kalis_dk', 'aktif_personel',
  'kasa_acik', 'etiket_uygunluk', 'ic_sicaklik',
]

const ROL_ETIKETLERI: Record<string, string> = {
  magaza_muduru: 'Mağaza Müdürü',
  bolge_muduru:  'Bölge Müdürü',
  personel:      'Personel',
  guvenlik:      'Güvenlik',
  merkez:        'Merkez',
}

export function olayBasligi(tip: string): string {
  return OLAY_BASLIKLARI[tip] ?? tip
}

export function rolEtiketi(rol: string): string {
  return ROL_ETIKETLERI[rol] ?? rol
}

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

/** ISO string'leri azalan sırada — geçersiz/boş tarih EN SONA düşer, patlamaz. */
function isoAzalan(a: string | undefined, b: string | undefined): number {
  const x = a ? Date.parse(a) : NaN
  const y = b ? Date.parse(b) : NaN
  if (Number.isNaN(x) && Number.isNaN(y)) return 0
  if (Number.isNaN(x)) return 1
  if (Number.isNaN(y)) return -1
  return y - x
}

function isoArtan(a: string | undefined, b: string | undefined): number {
  return -isoAzalan(a, b)
}

const ONCELIK_AGIRLIGI: Record<string, number> = {
  kritik: 0, yuksek: 1, normal: 2, dusuk: 3,
}

/**
 * Detay JSON'u güvenle çözer. Bozuk JSON panoyu düşürmez — Airtable'da bir
 * hücreyi elle düzenleyen biri tüm ekranı karartmasın diye.
 */
function detay<T>(m: Metrik | undefined): T | null {
  if (!m?.['Detay JSON']) return null
  try {
    return JSON.parse(m['Detay JSON']) as T
  } catch {
    return null
  }
}

/**
 * Herhangi biri 'demo' ise sonuç 'demo'. Dürüstlük kuralı yukarı doğru bulaşır.
 * HİÇ kayıt yoksa da 'demo' döner: bilinmeyen köken 'gercek' diye etiketlenmez
 * (madde 11 — seed verisi asla gerçek gibi sunulmaz, boşluk da öyle).
 */
function veriTipiBirlesimi(tipler: (VeriTipi | undefined)[]): VeriTipi {
  const bilinen = tipler.filter((t): t is VeriTipi => t === 'demo' || t === 'gercek')
  if (bilinen.length === 0) return 'demo'
  return bilinen.some(t => t === 'demo') ? 'demo' : 'gercek'
}

// ─── Dönüştürücüler ──────────────────────────────────────────────────────────

function magazaOzeti(m: Magaza, kasaAcik: number | null): MagazaOzeti {
  return {
    kod: m['Kod'],
    ad: m['Ad'],
    sehir: m['Sehir'],
    bolge: m['Bolge'],
    durum: m['Durum'],
    acilis: m['Acilis Saati'],
    kapanis: m['Kapanis Saati'],
    kasaAcik,
    kasaToplam: m['Kasa Toplam'],
    // Mağaza kaydı referans veridir, `Veri Tipi` alanı yoktur; demoda tek
    // mağaza seed'den gelir. Gerçek base'e geçince burası referans satırından
    // okunacak — o güne kadar dürüst olan 'demo'dur.
    veriTipi: 'demo',
  }
}

function alarmSatiri(o: OlayKaydi, kameraAdlari: Map<string, string>): AlarmSatiri {
  return {
    olayId: o['Olay ID'],
    olayTipi: o['Olay Tipi'],
    baslik: olayBasligi(o['Olay Tipi']),
    severity: o['Severity'],
    olustu: o['Olustu'],
    kameraAdi: o['Kamera ID'] ? kameraAdlari.get(o['Kamera ID']) ?? o['Kamera ID'] : null,
    gorevUretti: Boolean(o['Eslesen Kural']),
    veriTipi: o['Veri Tipi'],
  }
}

function gorevSatiri(g: Gorev, adlar: Map<string, string>, simdi: number): GorevSatiri {
  const teslim = Date.parse(g['Son Teslim'])
  return {
    gorevNo: g['Gorev No'],
    baslik: g['Baslik'],
    durum: g['Durum'],
    oncelik: g['Oncelik'],
    atananAd: g['Atanan Kullanici ID'] ? adlar.get(g['Atanan Kullanici ID']) ?? null : null,
    atananRol: rolEtiketi(g['Atanan Rol']),
    sonTeslim: g['Son Teslim'],
    // Gecikme SUNUCUDA hesaplanır: istemci saati yanlışsa demo boyunca her
    // görev kırmızı görünür. Tek doğru saat sunucununki.
    gecikti: !Number.isNaN(teslim) && teslim < simdi && !NIHAI_DURUMLAR.includes(g['Durum']),
    veriTipi: g['Veri Tipi'],
  }
}

function kpiKarti(m: Metrik): KpiKarti {
  return {
    anahtar: m['Metrik Tipi'],
    etiket: KPI_ETIKETLERI[m['Metrik Tipi']] ?? m['Metrik Tipi'],
    deger: m['Deger'],
    birim: m['Birim'],
    veriTipi: m['Veri Tipi'],
  }
}

function seri(
  m: Metrik | undefined,
  baslik: string, birincilAd: string, ikincilAd: string | null,
): Seri | null {
  const d = detay<SaatlikNokta[]>(m)
  if (!m || !Array.isArray(d)) return null
  return {
    baslik, birincilAd, ikincilAd, birim: m['Birim'],
    noktalar: d.map(n => ({ etiket: n.saat, birincil: n.birincil, ikincil: n.ikincil ?? null })),
    veriTipi: m['Veri Tipi'],
  }
}

function izgara(m: Metrik | undefined, baslik: string): Izgara | null {
  const d = detay<IzgaraDetay>(m)
  if (!m || !d || !Array.isArray(d.hucreler)) return null
  return { baslik, satir: d.satir, sutun: d.sutun, hucreler: d.hucreler, veriTipi: m['Veri Tipi'] }
}

function dagilim(m: Metrik | undefined, baslik: string): Dagilim | null {
  const d = detay<DagilimDetay[]>(m)
  if (!m || !Array.isArray(d)) return null
  return { baslik, birim: m['Birim'], dilimler: d, veriTipi: m['Veri Tipi'] }
}

function kameraSatiri(k: Kamera): KameraSatiri {
  return {
    kameraId: k['Kamera ID'],
    ad: k['Ad'],
    bolgeAdi: k['Bolge Adi'],
    durum: k['Durum'],
    yetenekler: (k['Yetenekler'] ?? '').split(',').map(s => s.trim()).filter(Boolean),
  }
}

// ─── Katmanlar ───────────────────────────────────────────────────────────────

interface CanliParca {
  alarmlar: AlarmSatiri[]
  gorevler: GorevSatiri[]
  gorevOzeti: GorevOzeti
}

async function canliKatman(d: Depo, magazaKodu: string, simdi: number): Promise<CanliParca> {
  const [olaylar, gorevler, kameralar, kullanicilar] = await Promise.all([
    d.olaylar.listele({ magazaKodu, limit: LIMITLER.alarm }),
    d.gorevler.listele({ magazaKodu, limit: LIMITLER.gorev }),
    d.referans.kameralar(magazaKodu),
    d.referans.kullanicilar(magazaKodu),
  ])

  const kameraAdlari = new Map(kameralar.map(k => [k['Kamera ID'], k['Ad']]))
  const adlar = new Map(kullanicilar.map(u => [u['Kullanici ID'], u['Ad Soyad']]))

  const alarmlar = [...olaylar]
    .sort((a, b) => isoAzalan(a['Olustu'], b['Olustu']))   // en yeni üstte
    .slice(0, LIMITLER.alarm)
    .map(o => alarmSatiri(o, kameraAdlari))

  const satirlar = [...gorevler]
    .map(g => gorevSatiri(g, adlar, simdi))
    // Açık görevler önce (nihai durumlar dibe), sonra öncelik, sonra teslim.
    .sort((a, b) => {
      const an = NIHAI_DURUMLAR.includes(a.durum) ? 1 : 0
      const bn = NIHAI_DURUMLAR.includes(b.durum) ? 1 : 0
      if (an !== bn) return an - bn
      const ao = ONCELIK_AGIRLIGI[a.oncelik] ?? 9
      const bo = ONCELIK_AGIRLIGI[b.oncelik] ?? 9
      if (ao !== bo) return ao - bo
      return isoArtan(a.sonTeslim, b.sonTeslim)
    })
    .slice(0, LIMITLER.gorev)

  return {
    alarmlar,
    gorevler: satirlar,
    gorevOzeti: {
      acik: satirlar.filter(g => !NIHAI_DURUMLAR.includes(g.durum)).length,
      gecikmis: satirlar.filter(g => g.gecikti).length,
      tamamlandi: satirlar.filter(g => g.durum === 'tamamlandi').length,
    },
  }
}

interface YavasParca {
  magaza: MagazaOzeti | null
  kpiler: KpiKarti[]
  kuyrukSerisi: Seri | null
  satisSerisi: Seri | null
  yogunlukIzgarasi: Izgara | null
  rafDoluluk: Dagilim | null
  personelDagilimi: Dagilim | null
  kameralar: KameraSatiri[]
  personel: PersonelSatiri[]
}

async function yavasKatman(d: Depo, magazaKodu: string): Promise<YavasParca> {
  const [magaza, metrikler, kameralar, kullanicilar, gorevler] = await Promise.all([
    d.referans.magaza(magazaKodu),
    d.referans.metrikler(magazaKodu),
    d.referans.kameralar(magazaKodu),
    d.referans.kullanicilar(magazaKodu),
    d.gorevler.listele({ magazaKodu, limit: LIMITLER.gorev }),
  ])

  // Aynı metrik tipinden birden çok satır gelirse EN YENİSİ kazanır. Airtable'da
  // seed iki kez koşulursa iki satır olur; pano bunu sessizce doğru gösterir.
  const enYeni = new Map<string, Metrik>()
  for (const m of metrikler) {
    const v = enYeni.get(m['Metrik Tipi'])
    if (!v || isoAzalan(m['Zaman'], v['Zaman']) < 0) enYeni.set(m['Metrik Tipi'], m)
  }

  const kpiler = KPI_SIRASI
    .map(t => enYeni.get(t))
    .filter((m): m is Metrik => Boolean(m))
    .map(kpiKarti)

  const acikGorevSayaci = new Map<string, number>()
  for (const g of gorevler) {
    const u = g['Atanan Kullanici ID']
    if (!u || NIHAI_DURUMLAR.includes(g['Durum'])) continue
    acikGorevSayaci.set(u, (acikGorevSayaci.get(u) ?? 0) + 1)
  }

  const kasaAcik = enYeni.get('kasa_acik')?.['Deger'] ?? null

  return {
    magaza: magaza ? magazaOzeti(magaza, kasaAcik) : null,
    kpiler,
    kuyrukSerisi: seri(enYeni.get('kuyruk_saatlik'), 'Kasa bekleme süresi', 'Ortalama', 'Maksimum'),
    satisSerisi: seri(enYeni.get('satis_saatlik'), 'Saatlik satış', 'Bugün', 'Dün'),
    yogunlukIzgarasi: izgara(enYeni.get('yogunluk_grid'), 'Mağaza yoğunluk haritası'),
    rafDoluluk: dagilim(enYeni.get('raf_doluluk'), 'Reyon raf doluluğu'),
    personelDagilimi: dagilim(enYeni.get('personel_dagilimi'), 'Personel dağılımı'),
    kameralar: [...kameralar].sort((a, b) => (a['Sira'] ?? 99) - (b['Sira'] ?? 99)).map(kameraSatiri),
    personel: siralaPersonel(kullanicilar, acikGorevSayaci),
  }
}

function siralaPersonel(
  kullanicilar: Kullanici[], acikGorev: Map<string, number>,
): PersonelSatiri[] {
  return [...kullanicilar]
    .filter(u => u['Aktif'] !== false)
    .map(u => ({
      kullaniciId: u['Kullanici ID'],
      adSoyad: u['Ad Soyad'],
      rol: rolEtiketi(u['Rol']),
      acikGorev: acikGorev.get(u['Kullanici ID']) ?? 0,
    }))
    .sort((a, b) => b.acikGorev - a.acikGorev || a.adSoyad.localeCompare(b.adSoyad, 'tr'))
}

// ─── Giriş noktası ───────────────────────────────────────────────────────────

export interface ToplaGirdi {
  depo: Depo
  magazaKodu: string
  katman: Katman
  /** Sunucu "şimdi"si (ms). Test edilebilirlik için dışarıdan verilebilir. */
  simdi?: number
}

export async function panoTopla(g: ToplaGirdi): Promise<DashboardVerisi> {
  const simdi = g.simdi ?? Date.now()
  const canliMi = g.katman === 'canli' || g.katman === 'tam'
  const yavasMi = g.katman === 'yavas' || g.katman === 'tam'

  const canli = canliMi ? await canliKatman(g.depo, g.magazaKodu, simdi) : null
  const yavas = yavasMi ? await yavasKatman(g.depo, g.magazaKodu) : null

  const tipler: (VeriTipi | undefined)[] = [
    ...(canli?.alarmlar ?? []).map(a => a.veriTipi),
    ...(canli?.gorevler ?? []).map(t => t.veriTipi),
    ...(yavas?.kpiler ?? []).map(k => k.veriTipi),
    yavas?.magaza?.veriTipi,
  ]

  // "Boş" = bu katmanda gösterilecek hiçbir şey yok. Katmana göre bakılır:
  // canlı ankette metrik olmaması boşluk değildir, sadece taşınmamıştır.
  const canliBos = !canli || (canli.alarmlar.length === 0 && canli.gorevler.length === 0)
  const yavasBos = !yavas || (yavas.kpiler.length === 0 && !yavas.magaza)
  const bos = g.katman === 'canli' ? canliBos : g.katman === 'yavas' ? yavasBos : canliBos && yavasBos

  return {
    uretildi: new Date(simdi).toISOString(),
    katman: g.katman,
    magazaKodu: g.magazaKodu,

    alarmlar: canli?.alarmlar ?? null,
    gorevler: canli?.gorevler ?? null,
    gorevOzeti: canli?.gorevOzeti ?? null,

    magaza: yavas?.magaza ?? null,
    kpiler: yavas?.kpiler ?? null,
    kuyrukSerisi: yavas?.kuyrukSerisi ?? null,
    satisSerisi: yavas?.satisSerisi ?? null,
    yogunlukIzgarasi: yavas?.yogunlukIzgarasi ?? null,
    rafDoluluk: yavas?.rafDoluluk ?? null,
    personelDagilimi: yavas?.personelDagilimi ?? null,
    kameralar: yavas?.kameralar ?? null,
    personel: yavas?.personel ?? null,

    veriTipi: veriTipiBirlesimi(tipler),
    bos,
  }
}
