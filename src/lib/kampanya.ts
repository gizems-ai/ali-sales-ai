// ════════════════════════════════════════════════════════════════════════════
//  Kampanya & Gelir Motoru — kural tabanlı, deterministik, açıklanabilir
//  Faz 1: LLM YOK. Stok Zekâsı'nın A/B/C/D + persona etiketlerini girdi alır;
//  her alıcı segmenti için kampanya ÖNERİR, gerekçesini gösterir.
//  İlke: İndirim (fiyat kaldıracı) motor tarafından ASLA otomatik önerilmez.
//        Ali önerir — insan onaylar. Güvenilmez öneri, hiç öneriden kötüdür.
//  Tema: mevcut Ali Satış Zekâsı token'ları (Z) — yeni renk/hex icat edilmez.
// ════════════════════════════════════════════════════════════════════════════

import { Z } from './ali-zeka'
export { Z }   // tema token'ları tek kaynaktan (Ali Satış Zekâsı ile aynı)

// Bölüm adı/slug tek sabitte — sidebar + sayfa buradan okur.
export const SECTION_NAME = 'Kampanya Motoru'
export const SECTION_SLUG = '/kampanya-motoru'

// Güven rozeti gösterimi: '%' (yüzde) veya 'oran' ("N/4 kaldıraç eşleşti").
// Varsayılan: yüzde + kırılım. Tek yerden değiştirilebilir (§6).
export const GUVEN_GOSTERIM: 'yuzde' | 'oran' = 'yuzde'

// ── Tipler (§3) ─────────────────────────────────────────────────────────────
export type StockGroup = 'A' | 'B' | 'C' | 'D'
export type Signal = 'faiz_dusus' | 'altin_yukselis' | 'savas_kriz' | 'piyasa_yukselis' | 'none'
export type Lever =
  | 'fiyat' | 'finansman' | 'komisyon' | 'hediye' | 'deneyim'
  | 'referans' | 'prestij' | 'kitlik' | 'topluluk'
export type Defect = 'zemin' | 'buyuk_m2' | 'kuzey' | 'pahali'
export type Segment =
  | 'yurtdisi_broker' | 'yerli_acente' | 'kurumsal'          // B2B
  | 'turk_yatirimci' | 'gurbetci' | 'oturumcu' | 'ev_ofis'   // B2C
  | 'genis_aile' | 'ust_segment' | 'vatandaslik_yabanci'     // B2C
export type MarjLabel = 'Korunur' | 'Pozitif' | 'Artırır' | 'Kontrollü' | 'Kayıp'
export type Audience = 'B2B' | 'B2C'

export interface StockInput {
  id: string
  proje: string
  blok: string
  grup: StockGroup
  stokYasiGun: number
  emsalKonumu: 'altinda' | 'emsalde' | 'ustunde'
  kanalDoygun: boolean                 // mevcut kanal tıkandı mı
  defects?: Defect[]                   // D grubu için "neden problemli" (birden çok olabilir)
}

export interface EngineInput {
  stock: StockInput
  marjTabani: string                   // "92.000 ₺/m²" — floor, altına inilemez
  hedefDaire: number
  hedefGun: number
  signal: Signal
}

export interface Guven {
  score: number                        // 0–100 (dört bileşenin normalize toplamı)
  matched: string[]                    // eşleşen bileşen etiketleri (şeffaf kırılım)
  total: number                        // toplam bileşen = 4
  bilesenler: { etiket: string; eslesti: boolean }[]
}

export interface CampaignRec {
  segment: Segment
  segmentEtiket: string
  audience: Audience
  grup: StockGroup
  levers: Lever[]                      // levers[0] = birincil
  kanal: string
  teklif: string
  mesaj: string
  erimeTahminiGun: [number, number]
  marjLabel: MarjLabel
  guven: Guven
  neden: string[]                      // 3 madde — yeşil-tik listesi
  status: 'suggested' | 'approved'
  assets?: { type: 'landing' | 'whatsapp' | 'instagram' | 'email'; status: 'uretiliyor' | 'qa_bekliyor' }[]
}

// ── Etiketler ────────────────────────────────────────────────────────────────
export const SEGMENT_ETIKET: Record<Segment, string> = {
  yurtdisi_broker: 'Yurt Dışı Broker',
  yerli_acente: 'Yerli Acente',
  kurumsal: 'Kurumsal (Toplu)',
  turk_yatirimci: 'Türk Yatırımcı',
  gurbetci: 'Gurbetçi',
  oturumcu: 'Oturumcu',
  ev_ofis: 'Ev-Ofis',
  genis_aile: 'Geniş Aile',
  ust_segment: 'Üst Segment',
  vatandaslik_yabanci: 'Vatandaşlık / Yabancı',
}

export const LEVER_ETIKET: Record<Lever, string> = {
  fiyat: 'Fiyat', finansman: 'Finansman', komisyon: 'Komisyon',
  hediye: 'Hediye', deneyim: 'Deneyim', referans: 'Referans',
  prestij: 'Prestij', kitlik: 'Kıtlık', topluluk: 'Topluluk',
}

export const SIGNAL_ETIKET: Record<Signal, string> = {
  faiz_dusus: 'Faiz Düşüşü ↓',
  altin_yukselis: 'Altın Yükselişi ↑',
  savas_kriz: 'Savaş / Kriz',
  piyasa_yukselis: 'Piyasa Yükselişi ↗',
  none: 'Sinyal yok',
}

const SEGMENT_AUDIENCE: Record<Segment, Audience> = {
  yurtdisi_broker: 'B2B', yerli_acente: 'B2B', kurumsal: 'B2B',
  turk_yatirimci: 'B2C', gurbetci: 'B2C', oturumcu: 'B2C', ev_ofis: 'B2C',
  genis_aile: 'B2C', ust_segment: 'B2C', vatandaslik_yabanci: 'B2C',
}

// ── Marj etiketi renk semantiği (§9) — Z token'larından ──────────────────────
export function marjRenk(label: MarjLabel): { bg: string; fg: string } {
  switch (label) {
    case 'Korunur':
    case 'Pozitif':
    case 'Artırır':
      return { bg: '#D1FAE5', fg: '#065F46' }          // yeşil
    case 'Kontrollü':
      return { bg: '#FEF3C7', fg: '#92400E' }          // amber
    case 'Kayıp':
      return { bg: Z.coralSoft, fg: '#9a3b2a' }         // coral (yalnız kayıp/uyarı)
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  KURAL TABLOLARI (§4)
// ════════════════════════════════════════════════════════════════════════════

// Adım 1 — Segment uygunluğu (stok grubuna göre). D grubu defect'e göre çözülür.
function dSegmentler(defects: Defect[]): Segment[] {
  const segs: Segment[] = []
  if (defects.includes('zemin')) segs.push('ev_ofis')       // zemin → ev-ofis
  if (defects.includes('buyuk_m2')) segs.push('genis_aile') // büyük m² → geniş aile
  segs.push('kurumsal')                                      // her D için toplu satış
  return Array.from(new Set(segs))
}

export function uygunSegmentler(stock: StockInput): Segment[] {
  switch (stock.grup) {
    case 'A': return ['ust_segment', 'vatandaslik_yabanci']
    case 'B': return ['turk_yatirimci', 'oturumcu', 'gurbetci']
    case 'C': return ['yurtdisi_broker', 'turk_yatirimci', 'gurbetci']
    case 'D': return dSegmentler(stock.defects ?? [])
  }
}

// Adım 2 — Birincil + ikincil kaldıraç (segment → lever). fiyat ASLA yok.
const SEGMENT_LEVERS: Record<Segment, [Lever, Lever]> = {
  yurtdisi_broker: ['komisyon', 'referans'],   // exclusive / enablement
  yerli_acente: ['komisyon', 'finansman'],     // hız
  kurumsal: ['finansman', 'komisyon'],         // özel şart / toplu protokol
  turk_yatirimci: ['finansman', 'kitlik'],
  gurbetci: ['deneyim', 'referans'],           // döviz vurgusu
  oturumcu: ['topluluk', 'hediye'],
  ev_ofis: ['prestij', 'finansman'],
  genis_aile: ['topluluk', 'hediye'],
  ust_segment: ['prestij', 'kitlik'],
  vatandaslik_yabanci: ['prestij', 'kitlik'],
}

// Adım 3 — Sinyal düzenleyici: hangi segmentleri tetikler + hangi kaldıracı öne çıkarır.
const SIGNAL_SEGMENTS: Record<Signal, Segment[]> = {
  faiz_dusus: ['turk_yatirimci', 'oturumcu', 'yerli_acente', 'kurumsal'],
  altin_yukselis: ['turk_yatirimci', 'gurbetci'],
  savas_kriz: ['vatandaslik_yabanci', 'turk_yatirimci'],
  piyasa_yukselis: ['ust_segment', 'vatandaslik_yabanci'],
  none: [],
}
const SIGNAL_LEVER: Record<Signal, Lever | null> = {
  faiz_dusus: 'finansman',
  altin_yukselis: 'kitlik',
  savas_kriz: 'prestij',
  piyasa_yukselis: 'kitlik',
  none: null,
}
const SIGNAL_VURGU: Record<Signal, string> = {
  faiz_dusus: ' Kredi/taksit koşulları şu an lehte — finansman mesajını öne çıkar.',
  altin_yukselis: ' Altın yükselirken gayrimenkul, değer saklama için güçlü alternatif.',
  savas_kriz: ' Belirsizlik döneminde güvenli liman + döviz + vatandaşlık vurgusu güçlü.',
  piyasa_yukselis: ' Piyasa yükselişte — "erken pozisyon" ve kıtlık vurgusu zamanlaması doğru.',
  none: '',
}
const SIGNAL_NEDEN: Record<Signal, string> = {
  faiz_dusus: 'Faiz düşüşü finansman kaldıracını güçlendiriyor — kredi/taksit iştahı artıyor.',
  altin_yukselis: 'Altın yükselişi gayrimenkulü değer saklama alternatifi olarak öne çıkarıyor.',
  savas_kriz: 'Bölgesel risk ortamı güvenli liman + döviz + vatandaşlık talebini artırıyor.',
  piyasa_yukselis: 'Piyasa yükselişinde kıtlık + prestij mesajı erken pozisyon almayı teşvik ediyor.',
  none: 'Baz senaryo — sinyal düzenleyici yok; segment ↔ kaldıraç uyumu esas alındı.',
}

// Adım 6 — Segment içerik şablonları (kanal · teklif · mesaj · grup gerekçesi).
const SEGMENT_ICERIK: Record<Segment, { grupNeden: string; kanal: string; teklif: string; mesaj: string }> = {
  yurtdisi_broker: {
    grupNeden: 'Zor eriyen stok aracı ağıyla hacimli erir; broker kanalı doygun kanalı by-pass eder.',
    kanal: 'Yurt dışı broker ağı · WhatsApp Business + e-posta',
    teklif: 'Exclusive satış yetkisi + kademeli komisyon (hızlı kapanışta ek prim)',
    mesaj: 'Portföyünüze özel, fiyatı garantili bir parti — müşterinize erken ve ayrıcalıklı erişim.',
  },
  yerli_acente: {
    grupNeden: 'Yerel acente ağı bölge talebini hızlı toplar; komisyon kaldıracı marjı korur.',
    kanal: 'Yerel emlak acente ağı · saha + telefon',
    teklif: 'Komisyon + hızlı kapanış primi; peşinatı güçlü müşteriye öncelik',
    mesaj: 'Hazır stok, net komisyon, hızlı tapu — acentenize doğrudan akan iş.',
  },
  kurumsal: {
    grupNeden: 'Zor eriyen stok toplu alımla tek kalemde çözülür; fiyat tabanına dokunulmaz.',
    kanal: 'Kurumsal satın alma / toplu alım masası',
    teklif: 'Toplu alım protokolü: finansman kolaylığı + özel ödeme takvimi',
    mesaj: 'Blok/lot bazında kuruma özel şartlar; tek muhatap, tek sözleşme, hızlı kapanış.',
  },
  turk_yatirimci: {
    grupNeden: 'Yatırımcı iştahı finansman kaldıracıyla tetiklenir; liste fiyatı sabit kalır.',
    kanal: 'Dijital performans (Meta / Google) + yatırımcı bülteni',
    teklif: 'Uzun vadeli senetli ödeme + kira garantili dönem',
    mesaj: 'Getiri odaklı: taksitle giriş, teslimde değerlenme, kira ile amortisman.',
  },
  gurbetci: {
    grupNeden: 'Gurbetçi sezonu talebi canlandırır; deneyim + döviz vurgusu fiyatı korur.',
    kanal: 'Diaspora toplulukları + yurt dışı WhatsApp grupları',
    teklif: 'Uzaktan alım deneyimi + döviz avantajlı ödeme + referans primi',
    mesaj: 'Memlekette güvenli yatırım; her adımda uzaktan yönetim ve döviz kazancı.',
  },
  oturumcu: {
    grupNeden: 'Oturumcu talebi topluluk hikâyesiyle büyür; hediye kaldıracı marjı korur.',
    kanal: 'Yerel dijital + örnek daire etkinlikleri',
    teklif: 'Topluluk yaşamı + taşınma/dekorasyon hediye paketi',
    mesaj: 'Komşuluk, güvenli site, çocuk dostu yaşam — evinize hoş geldiniz.',
  },
  ev_ofis: {
    grupNeden: 'Zemin kat "kusuru" bağımsız girişli ev-ofis için avantaja döner; prestij fiyatı korur.',
    kanal: 'Serbest meslek / KOBİ dijital hedefleme',
    teklif: 'Prestijli adres + esnek finansman; bağımsız giriş avantajı',
    mesaj: 'Hem yaşam hem iş: bağımsız girişli, temsil gücü yüksek ofis-ev.',
  },
  genis_aile: {
    grupNeden: 'Büyük m² "fazlalığı" geniş aile için tam ihtiyaç; topluluk kaldıracı marjı korur.',
    kanal: 'Aile odaklı dijital + hafta sonu daire turları',
    teklif: 'Geniş metrekareye topluluk + eğitim/sosyal tesis hediyesi',
    mesaj: 'Her çocuğa oda, geniş salon, güvenli bahçe — büyük aileye göre kurgu.',
  },
  ust_segment: {
    grupNeden: 'A grubu prestijli stok; kıtlık + prestij fiyatı korur, hatta yükseltir.',
    kanal: 'Özel bankacılık / VIP davet + kapalı lansman',
    teklif: 'Sınırlı sayıda daire · davetli ön satış · concierge hizmet',
    mesaj: 'Az sayıda, ayrıcalıklı, değeri artan bir adres — erken pozisyon sizin.',
  },
  vatandaslik_yabanci: {
    grupNeden: 'A grubu vatandaşlık eşiğini karşılar; prestij + kıtlık fiyat gücünü artırır.',
    kanal: 'Uluslararası danışman ağı + çok dilli dijital',
    teklif: 'Vatandaşlık eşiği garantili paket + hukuki süreç desteği',
    mesaj: 'Yatırımla vatandaşlık, prestijli konum, döviz bazlı değer koruması.',
  },
}

// ════════════════════════════════════════════════════════════════════════════
//  MOTOR (deterministik)
// ════════════════════════════════════════════════════════════════════════════

// Adım 4 — Marj etiketi (birincil kaldıraca göre; A grubunda istisna).
function marjEtiketi(levers: Lever[], grup: StockGroup): MarjLabel {
  const p = levers[0]
  if (p === 'fiyat') return 'Kayıp'                                  // motor asla üretmez ama güvenlik için
  if (grup === 'A') {
    if (p === 'prestij' && levers.includes('kitlik')) return 'Artırır'
    if (p === 'referans' || p === 'topluluk') return 'Pozitif'
  }
  if (p === 'komisyon') return 'Kontrollü'
  return 'Korunur'
}

// Adım 5 — Erime tahmini (heuristik, "tahmini" etiketiyle gösterilir).
function erimeTahmini(stock: StockInput, levers: Lever[]): [number, number] {
  const taban: Record<StockGroup, [number, number]> = {
    A: [35, 55], B: [45, 70], C: [45, 75], D: [65, 95],
  }
  let [lo, hi] = taban[stock.grup]
  let d = 0
  if (stock.emsalKonumu === 'ustunde') d += 10
  if (stock.kanalDoygun) d += 10
  if (levers[0] === 'komisyon' || levers[0] === 'finansman') d -= 5
  lo = Math.max(10, lo + d)
  hi = Math.max(lo + 5, hi + d)
  return [lo, hi]
}

// §6 — Güven skoru: dört deterministik bileşen (her biri 0/1), yüzdeye normalize.
function guvenHesapla(
  stock: StockInput, segment: Segment, levers: Lever[], signal: Signal,
): Guven {
  const audience = SEGMENT_AUDIENCE[segment]
  const aged = stock.stokYasiGun >= 45
  const fastLever = levers[0] === 'komisyon' || levers[0] === 'finansman' || levers[0] === 'fiyat'

  const bilesenler = [
    // 1. Segment ↔ stok grubu uyumu (Adım 1'de eşleşti → kart üretildiği için daima doğru)
    { etiket: 'Segment ↔ stok grubu uyumu', eslesti: true },
    // 2. Sinyal ↔ kaldıraç uyumu (Adım 3 bu segmenti tetikledi mi)
    { etiket: 'Sinyal ↔ kaldıraç uyumu', eslesti: SIGNAL_SEGMENTS[signal].includes(segment) },
    // 3. Kanal erişimi mevcut (doygun kanalda B2B alternatif kanal açar)
    { etiket: 'Kanal erişimi mevcut', eslesti: !stock.kanalDoygun || audience === 'B2B' },
    // 4. Stok yaşı ↔ kaldıraç aciliyeti (yaşlı stok + hızlı kaldıraç / genç stok + değer kaldıracı)
    { etiket: 'Stok yaşı ↔ kaldıraç aciliyeti', eslesti: (aged && fastLever) || (!aged && !fastLever) },
  ]
  const matched = bilesenler.filter(b => b.eslesti).map(b => b.etiket)
  const score = Math.round((matched.length / bilesenler.length) * 100)
  return { score, matched, total: bilesenler.length, bilesenler }
}

// Adım 7 — Neden (3 madde): grup↔segment uyumu · sinyal · marj gerekçesi.
function nedenListesi(segment: Segment, signal: Signal, marj: MarjLabel, floor: string): string[] {
  const marjNeden: Record<MarjLabel, string> = {
    Korunur: `Birincil kaldıraç fiyat dışı — marj tabanı (${floor}) korunur.`,
    Kontrollü: 'Komisyon kaldıracı marjı kontrollü etkiler; fiyat tabanı korunur.',
    Pozitif: 'Referans/topluluk etkisi ek maliyet yaratmadan değeri artırır.',
    Artırır: 'Kıtlık + prestij talebi fiyat gücünü artırır; indirim gereksiz.',
    Kayıp: 'Fiyat kaldıracı marj tabanının altına iner — önerilmez.',
  }
  return [
    SEGMENT_ICERIK[segment].grupNeden,
    SIGNAL_NEDEN[signal],
    marjNeden[marj],
  ]
}

// Tek segment için kampanya kartı üretir.
function kartOlustur(input: EngineInput, segment: Segment): CampaignRec {
  const { stock, signal, marjTabani } = input
  const levers: Lever[] = [...SEGMENT_LEVERS[segment]]

  // Sinyal düzenleyici: tetiklenen segmentte sinyalin kaldıracını öne çıkar (fiyat hariç, tekrar etmeden).
  if (SIGNAL_SEGMENTS[signal].includes(segment)) {
    const sl = SIGNAL_LEVER[signal]
    if (sl && sl !== 'fiyat' && !levers.includes(sl)) levers.push(sl)
  }

  const icerik = SEGMENT_ICERIK[segment]
  const marjLabel = marjEtiketi(levers, stock.grup)
  const mesaj = icerik.mesaj + (SIGNAL_SEGMENTS[signal].includes(segment) ? SIGNAL_VURGU[signal] : '')

  return {
    segment,
    segmentEtiket: SEGMENT_ETIKET[segment],
    audience: SEGMENT_AUDIENCE[segment],
    grup: stock.grup,
    levers,
    kanal: icerik.kanal,
    teklif: icerik.teklif,
    mesaj,
    erimeTahminiGun: erimeTahmini(stock, levers),
    marjLabel,
    guven: guvenHesapla(stock, segment, levers, signal),
    neden: nedenListesi(segment, signal, marjLabel, marjTabani),
    status: 'suggested',
  }
}

export interface MotorSonuc {
  cards: CampaignRec[]
  // Kural seti hiç uygun kaldıraç üretemezse (tüm segmentler elendi) — insan kararı gerekir (§5).
  noLeverUyari?: string
}

export function kampanyaOner(input: EngineInput): MotorSonuc {
  const segments = uygunSegmentler(input.stock)
  if (segments.length === 0) {
    return {
      cards: [],
      noLeverUyari:
        'Bu stok için kural tabanlı kaldıraç bulunamadı — insan kararı / fiyat gözden geçirmesi gerekebilir.',
    }
  }
  return { cards: segments.map(s => kartOlustur(input, s)) }
}

// ── Onay → içerik üretimi (Faz 1 stub) ───────────────────────────────────────
// Gerçek içerik üretilmez; 4 placeholder asset "qa_bekliyor" bayrağıyla döner (§7).
export function onaylaVeUret(card: CampaignRec): CampaignRec {
  return {
    ...card,
    status: 'approved',
    assets: [
      { type: 'landing', status: 'qa_bekliyor' },
      { type: 'whatsapp', status: 'qa_bekliyor' },
      { type: 'instagram', status: 'qa_bekliyor' },
      { type: 'email', status: 'qa_bekliyor' },
    ],
  }
}

export const ASSET_ETIKET: Record<'landing' | 'whatsapp' | 'instagram' | 'email', string> = {
  landing: 'Landing Sayfası', whatsapp: 'WhatsApp Mesajı',
  instagram: 'Instagram Görseli', email: 'E-posta Şablonu',
}

// ════════════════════════════════════════════════════════════════════════════
//  FIXTURE — 3 senaryo (§8). Dropdown bunları döndürür; her biri farklı kart seti.
// ════════════════════════════════════════════════════════════════════════════
export interface Senaryo {
  key: 'c' | 'd' | 'a'
  baslik: string
  altBaslik: string
  input: EngineInput
  // Senaryo düzeyi bilgi/uyarı bandı (indirim-önerilmedi açıklaması vb.)
  uyari?: { tone: 'info' | 'danger'; text: string }
}

export const SENARYOLAR: Senaryo[] = [
  {
    key: 'c',
    baslik: 'Lagoon · 5. Levent · C blok',
    altBaslik: 'Yavaş eriyen stok · Faiz↓ + broker sezonu',
    input: {
      stock: { id: 'lagoon-c', proje: 'Lagoon', blok: 'C', grup: 'C', stokYasiGun: 68, emsalKonumu: 'emsalde', kanalDoygun: true },
      marjTabani: '92.000 ₺/m²',
      hedefDaire: 40,
      hedefGun: 90,
      signal: 'faiz_dusus',
    },
  },
  {
    key: 'd',
    baslik: 'Central · D grubu',
    altBaslik: 'Problemli stok · zemin + büyük m²',
    input: {
      stock: { id: 'central-d', proje: 'Central', blok: 'D', grup: 'D', stokYasiGun: 85, emsalKonumu: 'emsalde', kanalDoygun: true, defects: ['zemin', 'buyuk_m2'] },
      marjTabani: '85.000 ₺/m²',
      hedefDaire: 15,
      hedefGun: 120,
      signal: 'none',
    },
    uyari: {
      tone: 'danger',
      text: 'Ali indirim önermedi — D grubuna indirim piyasaya "bekle" sinyali verir. Sorun fiyat değil, yanlış kitle: stoku doğru segmentlere (ev-ofis · geniş aile · toplu) yeniden hedefledik.',
    },
  },
  {
    key: 'a',
    baslik: 'Meridian · Beşiktaş · A grubu',
    altBaslik: 'Premium stok · Piyasa↗',
    input: {
      stock: { id: 'meridian-a', proje: 'Meridian', blok: 'A', grup: 'A', stokYasiGun: 18, emsalKonumu: 'ustunde', kanalDoygun: false },
      marjTabani: '180.000 ₺/m²',
      hedefDaire: 8,
      hedefGun: 60,
      signal: 'piyasa_yukselis',
    },
    uyari: {
      tone: 'info',
      text: 'A grubu için indirim önerilmedi — kıtlık + prestij ile fiyatı koru, hatta yükselt. İndirim burada değer algısını düşürür.',
    },
  },
]

export const senaryoByKey = (key: string) => SENARYOLAR.find(s => s.key === key)
