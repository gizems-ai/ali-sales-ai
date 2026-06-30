// ════════════════════════════════════════════════════════════════════════════
//  Ali Satış Zekâsı — fixture verisi + kural tabanlı eşleştirme motoru
//  Faz 1: tamamen okuma + taslak. Gerçek backend yok (emlak_demo readOnly).
//  İlk müşteri: Babacan GYO · Beylikdüzü · çift kanal (vatandaşlık + oturumcu)
// ════════════════════════════════════════════════════════════════════════════

// Bölüm adı TEK sabitte tutulur — ileride tek yerden değişsin.
export const SECTION_NAME = 'Ali Satış Zekâsı'
export const SECTION_SLUG = '/ali-satis-zekasi'
export const PROJE_ADI = 'Babacan GYO'
export const PROJE_KONUM = 'Beylikdüzü, İstanbul'

// ── Tema renkleri (repo emlak glass teması — yeni token YOK) ──────────────────
export const Z = {
  green1: '#0E5132', green2: '#1B7A47', green3: '#2E9D5E',
  surface: '#EFF5EF', line: '#E7EAF2', text: '#071B3A',
  coral: '#EF6B4F', coralSoft: 'rgba(239,107,79,.12)',
  lavanta: '#5B47E0', lavSoft: '#EDE9FE', lavAccent: '#8c97d8',
  grad: 'linear-gradient(135deg,#2c8a52,#4f9f6c 44%,#8c97d8)',
  lavGrad: 'linear-gradient(135deg,#6D5BE0,#8c97d8)',
} as const

// ── Tipler ────────────────────────────────────────────────────────────────────
export type Persona = 'yatirimci' | 'oturumcu' | 'kararsiz' | 'firsatci' | 'vatandaslik'

export const PERSONA_ETIKET: Record<Persona, string> = {
  yatirimci: 'Yatırımcı',
  oturumcu: 'Oturumcu',
  kararsiz: 'Kararsız',
  firsatci: 'Fırsatçı',
  vatandaslik: 'Vatandaşlık',
}

export type TagTone = 'positive' | 'caution'
export interface Tag { label: string; tone: TagTone }

export interface Customer {
  id: string
  ad: string
  persona: Persona
  ozet: string                 // 1–2 cümle: bu müşteri kim?
  butce: number                // üst bütçe (₺)
  pesinat: number              // ₺
  krediDurumu: 'uygun' | 'sinirli' | 'nakit' | 'belirsiz'
  cocukSayisi: number
  yas: number
  lokasyonTercihi: string[]
  ulasim: boolean              // toplu ulaşım önemli mi
  okul: boolean                // okula yakınlık önemli mi
  manzara: 'deniz' | 'sehir' | 'farketmez'
  katTercihi: 'yuksek' | 'orta' | 'dusuk' | 'farketmez'
  teslimBeklentisi: 'hizli' | 'orta' | 'farketmez'
  aidatHassasiyeti: 'yuksek' | 'orta' | 'dusuk'
  kiraBeklentisi: boolean      // kira getirisi önemli mi
  yatirimSuresi: 'kisa' | 'orta' | 'uzun' | null
  oncekiGorusmeler: string[]
  itirazlar: string[]
  konusmaOnerisi: string       // bu müşteriye hangi hikâye anlatılmalı
  whatsappOzeti?: string
}

export interface Unit {
  id: string
  daire: string                // "A123"
  tip: string                  // "3+1"
  blok: string
  kat: number
  metrekare: number
  cephe: 'Güney' | 'Kuzey' | 'Doğu' | 'Batı'
  manzara: 'deniz' | 'sehir' | 'site'
  fiyat: number
  aidat: number
  teslimAy: number             // kaç ay sonra teslim (0 = hazır)
  vatandaslikUygun: boolean    // ≥ 400.000 USD karşılığı
  kiraPotansiyeli: number      // aylık ₺
  primPotansiyeli: 'yuksek' | 'orta' | 'dusuk'
  yaslanmaGunu: number         // stokta kaç gündür
  etiketler: Tag[]
  // Birim detay paneli içeriği (brief §6)
  kimlerIcin: string[]
  gucluArgumanlar: string[]
  itirazlar: { itiraz: string; yanit: string }[]
  rakipler: string[]
  nedenZor?: string
  kampanya?: string
}

export interface Match {
  customerId: string
  unitId: string
  skor: number                 // 0–100
  tier: Tier
  nedenler: string[]
  olasiItirazlar: { itiraz: string; yanit: string }[]
  alternatifler: string[]      // sıralı unit id
}

// ── Tier eşik tablosu (fixture) ───────────────────────────────────────────────
export type Tier = 'cok-guclu' | 'guclu' | 'orta' | 'zayif'

export interface TierMeta { key: Tier; label: string; bg: string; fg: string; bar: string }

export const TIERS: Record<Tier, TierMeta> = {
  'cok-guclu': { key: 'cok-guclu', label: 'Çok güçlü eşleşme', bg: '#D1FAE5', fg: '#065F46', bar: Z.green2 },
  'guclu':     { key: 'guclu',     label: 'Güçlü eşleşme',     bg: '#DCFCE7', fg: '#166534', bar: Z.green3 },
  'orta':      { key: 'orta',      label: 'Orta eşleşme',      bg: '#FEF3C7', fg: '#92400E', bar: '#F59E0B' },
  'zayif':     { key: 'zayif',     label: 'Zayıf eşleşme',     bg: '#FEE2E2', fg: '#991B1B', bar: Z.coral },
}

export function tierFor(skor: number): Tier {
  if (skor >= 90) return 'cok-guclu'
  if (skor >= 75) return 'guclu'
  if (skor >= 60) return 'orta'
  return 'zayif'
}

// ════════════════════════════════════════════════════════════════════════════
//  FIXTURE — Stok (18 bağımsız bölüm, Beylikdüzü / Babacan GYO)
// ════════════════════════════════════════════════════════════════════════════
const T = (label: string, tone: TagTone = 'positive'): Tag => ({ label, tone })

export const UNITS: Unit[] = [
  {
    id: 'A123', daire: 'A123', tip: '3+1', blok: 'A', kat: 7, metrekare: 145,
    cephe: 'Güney', manzara: 'deniz', fiyat: 14_500_000, aidat: 4_200, teslimAy: 3,
    vatandaslikUygun: true, kiraPotansiyeli: 42_000, primPotansiyeli: 'yuksek', yaslanmaGunu: 12,
    etiketler: [T('Aile'), T('Sessiz'), T('Güney cephe'), T('Deniz manzarası'), T('Vatandaşlık uygun'), T('Hızlı teslim')],
    kimlerIcin: ['Okul çağında çocuğu olan oturumcu aileler', 'Vatandaşlık + oturum isteyen yatırımcılar'],
    gucluArgumanlar: ['Güney cephe + deniz manzarası ender kombinasyon', 'Okula 5 dk yürüme, parka komşu', '3 ay içinde teslim — bekleme yok'],
    itirazlar: [{ itiraz: 'Aidat yüksek', yanit: 'Aidat sosyal tesis + 7/24 güvenlik içeriyor; m² başına emsallerin altında.' }],
    rakipler: ['Sea Pearl Ataköy', 'Marmara Park Evleri'],
    kampanya: 'Peşin alımda %4 indirim + 1 yıl aidat hediye.',
  },
  {
    id: 'A305', daire: 'A305', tip: '2+1', blok: 'A', kat: 3, metrekare: 95,
    cephe: 'Batı', manzara: 'site', fiyat: 8_900_000, aidat: 2_800, teslimAy: 0,
    vatandaslikUygun: false, kiraPotansiyeli: 28_000, primPotansiyeli: 'orta', yaslanmaGunu: 4,
    etiketler: [T('Hazır teslim'), T('Düşük aidat'), T('Yüksek kira'), T('Genç çift')],
    kimlerIcin: ['Yeni evli genç çiftler', 'Kira getirisi arayan yatırımcılar'],
    gucluArgumanlar: ['Hemen teslim, taşınmaya hazır', 'Düşük aidat — işletme maliyeti az', 'Bölgede 2+1 kira talebi yüksek'],
    itirazlar: [{ itiraz: 'Manzara yok', yanit: 'Site içi yeşil cephe; ana yoldan uzak olduğu için sessiz.' }],
    rakipler: ['Bizim Evler Beylikdüzü'],
  },
  {
    id: 'B214', daire: 'B214', tip: '3+1', blok: 'B', kat: 2, metrekare: 138,
    cephe: 'Doğu', manzara: 'site', fiyat: 12_200_000, aidat: 5_600, teslimAy: 6,
    vatandaslikUygun: true, kiraPotansiyeli: 36_000, primPotansiyeli: 'orta', yaslanmaGunu: 58,
    etiketler: [T('Aile'), T('Vatandaşlık uygun'), T('Yüksek aidat', 'caution'), T('Yavaş satılıyor', 'caution')],
    kimlerIcin: ['Bütçesi orta üstü oturumcu aileler', 'Vatandaşlık eşiğini arayan yatırımcılar'],
    gucluArgumanlar: ['Geniş plan, 138 m² kullanışlı', 'Vatandaşlık eşiğini tam karşılar'],
    itirazlar: [{ itiraz: 'Aidat yüksek', yanit: 'Yüzme havuzu + spor salonu dahil; kullanım yoğun ailede maliyeti çıkarır.' }, { itiraz: 'Alçak kat', yanit: '2. kat ama doğu cephe sabah güneşi alıyor, gürültü düşük.' }],
    rakipler: ['Marmara Park Evleri'],
    nedenZor: 'Yüksek aidat + alçak kat kombinasyonu fiyatına göre talebi yavaşlatıyor. 58 gündür stokta.',
    kampanya: 'İlk yıl aidatın %50\'si proje tarafından karşılansın kampanyası öner.',
  },
  {
    id: 'B118', daire: 'B118', tip: '4+1', blok: 'B', kat: 11, metrekare: 190,
    cephe: 'Güney', manzara: 'deniz', fiyat: 19_800_000, aidat: 6_100, teslimAy: 9,
    vatandaslikUygun: true, kiraPotansiyeli: 55_000, primPotansiyeli: 'yuksek', yaslanmaGunu: 21,
    etiketler: [T('Geniş aile'), T('Deniz manzarası'), T('Yüksek kat'), T('Vatandaşlık uygun'), T('Yüksek prim')],
    kimlerIcin: ['Kalabalık oturumcu aileler', 'Prestij + vatandaşlık arayan üst segment yatırımcı'],
    gucluArgumanlar: ['11. kat panoramik deniz manzarası', '190 m², 4+1 — bölgede ender', 'Prim potansiyeli yüksek'],
    itirazlar: [{ itiraz: 'Fiyat yüksek', yanit: 'm² başı fiyat deniz cepheli emsallerin altında; vatandaşlık + prim ile kendini amorti ediyor.' }],
    rakipler: ['Sea Pearl Ataköy', 'Bulvar 216'],
  },
  {
    id: 'C401', daire: 'C401', tip: '2+1', blok: 'C', kat: 4, metrekare: 88,
    cephe: 'Kuzey', manzara: 'site', fiyat: 7_600_000, aidat: 4_900, teslimAy: 0,
    vatandaslikUygun: false, kiraPotansiyeli: 24_000, primPotansiyeli: 'dusuk', yaslanmaGunu: 96,
    etiketler: [T('Hazır teslim'), T('Pazarlığa açık'), T('Yüksek aidat', 'caution'), T('Yaşlanan stok', 'caution')],
    kimlerIcin: ['Fiyat odaklı fırsatçılar', 'Hızlı taşınmak isteyen tek/çift'],
    gucluArgumanlar: ['Hemen teslim', 'Fiyatta pazarlık marjı var'],
    itirazlar: [{ itiraz: 'Kuzey cephe karanlık', yanit: 'Kuzey cephe yazın serin; aydınlatma çözümleriyle dengeleniyor.' }, { itiraz: 'Aidat yüksek', yanit: 'm² küçük olduğundan toplam aidat tutarı yine de makul kalıyor.' }],
    rakipler: ['Bizim Evler Beylikdüzü'],
    nedenZor: 'Kuzey cephe + yüksek aidat + düşük prim. 96 gündür stokta — en yaşlı birim.',
    kampanya: 'Fiyatı %6 indirip "hemen teslim + pazarlığa açık" vurgusuyla fırsatçı kitleye taşı.',
  },
  {
    id: 'C512', daire: 'C512', tip: '3+1', blok: 'C', kat: 5, metrekare: 142,
    cephe: 'Güney', manzara: 'sehir', fiyat: 13_100_000, aidat: 3_900, teslimAy: 3,
    vatandaslikUygun: true, kiraPotansiyeli: 38_000, primPotansiyeli: 'yuksek', yaslanmaGunu: 8,
    etiketler: [T('Aile'), T('Güney cephe'), T('Vatandaşlık uygun'), T('Hızlı teslim'), T('Okula yakın')],
    kimlerIcin: ['Okullu oturumcu aileler', 'Vatandaşlık + oturum isteyenler'],
    gucluArgumanlar: ['Güney cephe ferah plan', 'Okula yürüme mesafesi', 'Hızlı teslim + vatandaşlık eşiği'],
    itirazlar: [{ itiraz: 'Deniz görmüyor', yanit: 'Şehir/site manzarası açık ve ferah; deniz cepheli emsallere göre fiyat avantajlı.' }],
    rakipler: ['Marmara Park Evleri'],
  },
  {
    id: 'D703', daire: 'D703', tip: '1+1', blok: 'D', kat: 7, metrekare: 62,
    cephe: 'Doğu', manzara: 'sehir', fiyat: 5_400_000, aidat: 2_200, teslimAy: 0,
    vatandaslikUygun: false, kiraPotansiyeli: 19_000, primPotansiyeli: 'orta', yaslanmaGunu: 15,
    etiketler: [T('Hazır teslim'), T('Yüksek kira'), T('Düşük aidat'), T('Yatırımlık')],
    kimlerIcin: ['Düşük bütçeli yatırımcılar', 'Kira getirisi arayan ilk yatırımını yapanlar'],
    gucluArgumanlar: ['En düşük giriş bütçesi', 'Kira/fiyat oranı en yüksek birim', 'Hemen kiraya verilebilir'],
    itirazlar: [{ itiraz: 'Küçük', yanit: '1+1 bölgede en hızlı kiralanan tip; doluluk riski düşük.' }],
    rakipler: ['Bizim Evler Beylikdüzü'],
  },
  {
    id: 'D210', daire: 'D210', tip: '3+1', blok: 'D', kat: 2, metrekare: 140,
    cephe: 'Batı', manzara: 'site', fiyat: 11_900_000, aidat: 4_100, teslimAy: 6,
    vatandaslikUygun: true, kiraPotansiyeli: 34_000, primPotansiyeli: 'orta', yaslanmaGunu: 41,
    etiketler: [T('Aile'), T('Vatandaşlık uygun'), T('Sessiz'), T('Yavaş satılıyor', 'caution')],
    kimlerIcin: ['Sakinlik arayan oturumcu aileler', 'Vatandaşlık isteyen yatırımcılar'],
    gucluArgumanlar: ['Site içi en sessiz cephe', 'Geniş 3+1, vatandaşlık eşiği'],
    itirazlar: [{ itiraz: 'Alçak kat manzara yok', yanit: 'Bahçe katına yakın, çocuklu aileler için pratik; gürültü düşük.' }],
    rakipler: ['Marmara Park Evleri'],
    nedenZor: 'Alçak kat + batı cephe öğleden sonra ısınması. 41 gündür stokta.',
    kampanya: 'Çocuklu ailelere "bahçeye yakın, güvenli kat" hikâyesiyle konumlandır.',
  },
  {
    id: 'E909', daire: 'E909', tip: '4+1', blok: 'E', kat: 9, metrekare: 195,
    cephe: 'Güney', manzara: 'deniz', fiyat: 21_500_000, aidat: 6_400, teslimAy: 12,
    vatandaslikUygun: true, kiraPotansiyeli: 58_000, primPotansiyeli: 'yuksek', yaslanmaGunu: 30,
    etiketler: [T('Lüks'), T('Deniz manzarası'), T('Yüksek kat'), T('Vatandaşlık uygun'), T('Yüksek prim'), T('Geç teslim', 'caution')],
    kimlerIcin: ['Üst segment oturumcu aileler', 'Prestij + vatandaşlık + prim arayan yatırımcı'],
    gucluArgumanlar: ['Projenin en üst segment dairesi', 'Panoramik deniz + 195 m²', 'En yüksek prim beklentisi'],
    itirazlar: [{ itiraz: 'Teslim uzak', yanit: '12 ay erken alım avantajı: bugünün fiyatı, teslimde piyasa primi.' }, { itiraz: 'Fiyat', yanit: 'Erken dönem ödeme planı + prim potansiyeli ile değerlenme yüksek.' }],
    rakipler: ['Sea Pearl Ataköy', 'Bulvar 216'],
  },
  {
    id: 'E415', daire: 'E415', tip: '2+1', blok: 'E', kat: 4, metrekare: 92,
    cephe: 'Güney', manzara: 'site', fiyat: 9_200_000, aidat: 3_100, teslimAy: 3,
    vatandaslikUygun: false, kiraPotansiyeli: 29_000, primPotansiyeli: 'orta', yaslanmaGunu: 6,
    etiketler: [T('Güney cephe'), T('Genç çift'), T('Yüksek kira'), T('Hızlı teslim')],
    kimlerIcin: ['Genç çiftler', 'Orta bütçeli yatırımcılar'],
    gucluArgumanlar: ['Güney cephe aydınlık', 'İyi kira getirisi', '3 ayda teslim'],
    itirazlar: [{ itiraz: 'Vatandaşlık eşiğinin altında', yanit: 'Oturum + kira için ideal; vatandaşlık hedefi varsa üst tipe yönlendir.' }],
    rakipler: ['Bizim Evler Beylikdüzü'],
  },
  {
    id: 'F102', daire: 'F102', tip: '3+1', blok: 'F', kat: 1, metrekare: 135,
    cephe: 'Kuzey', manzara: 'site', fiyat: 10_800_000, aidat: 5_200, teslimAy: 0,
    vatandaslikUygun: true, kiraPotansiyeli: 32_000, primPotansiyeli: 'dusuk', yaslanmaGunu: 73,
    etiketler: [T('Hazır teslim'), T('Vatandaşlık uygun'), T('Yüksek aidat', 'caution'), T('Yaşlanan stok', 'caution'), T('Pazarlığa açık')],
    kimlerIcin: ['Hemen oturmak isteyen aileler', 'Fiyat/vatandaşlık dengesini arayan fırsatçı yatırımcı'],
    gucluArgumanlar: ['Hazır teslim + vatandaşlık eşiği nadir', 'Pazarlık marjı geniş'],
    itirazlar: [{ itiraz: 'Zemine yakın kat', yanit: 'Bahçe kullanımı + asansör beklemeden giriş; çocuklu aileye pratik.' }, { itiraz: 'Aidat yüksek', yanit: 'Sosyal tesis yoğun; aile kullanımı maliyeti çıkarır.' }],
    rakipler: ['Marmara Park Evleri'],
    nedenZor: 'Zemin kat + kuzey cephe + yüksek aidat. 73 gündür stokta, vatandaşlık eşiğine rağmen yavaş.',
    kampanya: 'Hazır teslim + vatandaşlık + pazarlık üçlüsünü vatandaşlık fırsatçısına paketle.',
  },
  {
    id: 'F608', daire: 'F608', tip: '3+1', blok: 'F', kat: 6, metrekare: 144,
    cephe: 'Güney', manzara: 'deniz', fiyat: 15_200_000, aidat: 4_300, teslimAy: 6,
    vatandaslikUygun: true, kiraPotansiyeli: 44_000, primPotansiyeli: 'yuksek', yaslanmaGunu: 9,
    etiketler: [T('Aile'), T('Deniz manzarası'), T('Güney cephe'), T('Vatandaşlık uygun'), T('Yüksek prim')],
    kimlerIcin: ['Manzara isteyen oturumcu aileler', 'Vatandaşlık + prim arayan yatırımcılar'],
    gucluArgumanlar: ['Güney + deniz, 6. kat ideal yükseklik', 'Yüksek prim ve kira', 'Vatandaşlık eşiği'],
    itirazlar: [{ itiraz: 'Aidat ortalama üstü', yanit: 'Deniz cepheli blokta standart; manzara + prim primi karşılıyor.' }],
    rakipler: ['Sea Pearl Ataköy'],
  },
  {
    id: 'G220', daire: 'G220', tip: '2+1', blok: 'G', kat: 2, metrekare: 90,
    cephe: 'Doğu', manzara: 'site', fiyat: 8_400_000, aidat: 2_900, teslimAy: 0,
    vatandaslikUygun: false, kiraPotansiyeli: 27_000, primPotansiyeli: 'orta', yaslanmaGunu: 19,
    etiketler: [T('Hazır teslim'), T('Düşük aidat'), T('Yüksek kira'), T('Okula yakın')],
    kimlerIcin: ['Küçük oturumcu aileler', 'Kira yatırımcısı'],
    gucluArgumanlar: ['Okula yakın + hazır teslim', 'Düşük aidat', 'Sağlam kira getirisi'],
    itirazlar: [{ itiraz: 'Manzara sade', yanit: 'Doğu cephe sabah güneşi; sessiz iç bahçe görüyor.' }],
    rakipler: ['Bizim Evler Beylikdüzü'],
  },
  {
    id: 'G811', daire: 'G811', tip: '4+1', blok: 'G', kat: 8, metrekare: 188,
    cephe: 'Batı', manzara: 'sehir', fiyat: 17_400_000, aidat: 5_800, teslimAy: 9,
    vatandaslikUygun: true, kiraPotansiyeli: 49_000, primPotansiyeli: 'orta', yaslanmaGunu: 47,
    etiketler: [T('Geniş aile'), T('Yüksek kat'), T('Vatandaşlık uygun'), T('Yavaş satılıyor', 'caution')],
    kimlerIcin: ['Kalabalık oturumcu aileler', 'Vatandaşlık + geniş yaşam arayan yatırımcı'],
    gucluArgumanlar: ['188 m² 4+1, ferah plan', 'Yüksek kat şehir manzarası', 'Vatandaşlık eşiği'],
    itirazlar: [{ itiraz: 'Batı cephe ısınıyor', yanit: 'Isı yalıtımı + cam filmi ile dengelenir; akşam manzarası avantaj.' }, { itiraz: 'Deniz yok', yanit: 'Şehir manzarası + fiyat avantajı, deniz cepheliye göre %15 uygun.' }],
    rakipler: ['Bulvar 216'],
    nedenZor: 'Geniş 4+1 talebi dar; batı cephe ön yargısı. 47 gündür stokta.',
    kampanya: 'Geniş aileye "her çocuğa oda + çalışma odası" kurgusuyla anlat.',
  },
  {
    id: 'H505', daire: 'H505', tip: '3+1', blok: 'H', kat: 5, metrekare: 141,
    cephe: 'Güney', manzara: 'site', fiyat: 12_700_000, aidat: 3_800, teslimAy: 3,
    vatandaslikUygun: true, kiraPotansiyeli: 37_000, primPotansiyeli: 'yuksek', yaslanmaGunu: 5,
    etiketler: [T('Aile'), T('Güney cephe'), T('Sessiz'), T('Vatandaşlık uygun'), T('Hızlı teslim'), T('Okula yakın')],
    kimlerIcin: ['Okullu oturumcu aileler', 'Vatandaşlık + oturum isteyenler'],
    gucluArgumanlar: ['Güney cephe + sessiz konum', 'Okula yakın', 'Hızlı teslim + vatandaşlık eşiği + yüksek prim'],
    itirazlar: [{ itiraz: 'Deniz görmüyor', yanit: 'Sessiz iç cephe; çocuklu aile için güvenlik + huzur önde.' }],
    rakipler: ['Marmara Park Evleri'],
  },
  {
    id: 'H112', daire: 'H112', tip: '1+1', blok: 'H', kat: 1, metrekare: 60,
    cephe: 'Kuzey', manzara: 'site', fiyat: 4_900_000, aidat: 2_400, teslimAy: 0,
    vatandaslikUygun: false, kiraPotansiyeli: 18_000, primPotansiyeli: 'dusuk', yaslanmaGunu: 64,
    etiketler: [T('Hazır teslim'), T('Pazarlığa açık'), T('Yaşlanan stok', 'caution'), T('Zemine yakın', 'caution')],
    kimlerIcin: ['En düşük bütçeli yatırımcı', 'Öğrenci/tek kişilik kiracı hedefleyen'],
    gucluArgumanlar: ['Projeye en ucuz giriş', 'Pazarlık marjı', 'Hemen kiralanabilir'],
    itirazlar: [{ itiraz: 'Zemin + kuzey', yanit: 'Kira odaklı; doluluk hızlı, cephe kiracı için ikincil.' }],
    rakipler: ['Bizim Evler Beylikdüzü'],
    nedenZor: 'Zemin kat + kuzey + 1+1 küçük prim. 64 gündür stokta.',
    kampanya: 'Pazarlık + hemen kira getirisi vurgusuyla yatırım fırsatçısına sun.',
  },
  {
    id: 'A810', daire: 'A810', tip: '4+1', blok: 'A', kat: 8, metrekare: 192,
    cephe: 'Güney', manzara: 'deniz', fiyat: 20_400_000, aidat: 6_200, teslimAy: 6,
    vatandaslikUygun: true, kiraPotansiyeli: 56_000, primPotansiyeli: 'yuksek', yaslanmaGunu: 14,
    etiketler: [T('Lüks'), T('Geniş aile'), T('Deniz manzarası'), T('Güney cephe'), T('Vatandaşlık uygun'), T('Yüksek prim')],
    kimlerIcin: ['Üst segment oturumcu aileler', 'Vatandaşlık + prestij + prim yatırımcısı'],
    gucluArgumanlar: ['Güney + deniz + 8. kat', '192 m² lüks 4+1', 'Yüksek prim, 6 ayda teslim'],
    itirazlar: [{ itiraz: 'Fiyat', yanit: 'Deniz cepheli 4+1 emsalleri arasında m² fiyatı rekabetçi; prim hızlı.' }],
    rakipler: ['Sea Pearl Ataköy', 'Bulvar 216'],
  },
  {
    id: 'B520', daire: 'B520', tip: '2+1', blok: 'B', kat: 5, metrekare: 94,
    cephe: 'Güney', manzara: 'deniz', fiyat: 10_100_000, aidat: 3_300, teslimAy: 3,
    vatandaslikUygun: false, kiraPotansiyeli: 31_000, primPotansiyeli: 'yuksek', yaslanmaGunu: 11,
    etiketler: [T('Güney cephe'), T('Deniz manzarası'), T('Yüksek kira'), T('Yüksek prim'), T('Hızlı teslim')],
    kimlerIcin: ['Manzaralı 2+1 isteyen genç çift', 'Prim + kira arayan yatırımcı'],
    gucluArgumanlar: ['2+1\'de ender deniz manzarası', 'Yüksek prim ve kira', 'Hızlı teslim'],
    itirazlar: [{ itiraz: 'Vatandaşlık eşiğinin altında', yanit: 'Oturum + güçlü kira/prim için ideal giriş; vatandaşlık hedefliyse 3+1\'e yönlendir.' }],
    rakipler: ['Bizim Evler Beylikdüzü'],
  },
]

// ════════════════════════════════════════════════════════════════════════════
//  FIXTURE — Müşteriler (12, 5 persona dağılımı)
// ════════════════════════════════════════════════════════════════════════════
export const CUSTOMERS: Customer[] = [
  {
    id: 'm01', ad: 'Ahmet & Selin Yılmaz', persona: 'oturumcu',
    ozet: 'İki çocuklu, okul yakınlığına önem veren bir aile; Beylikdüzü\'nde oturmak için 3+1 arıyor.',
    butce: 15_000_000, pesinat: 6_000_000, krediDurumu: 'uygun', cocukSayisi: 2, yas: 38,
    lokasyonTercihi: ['Beylikdüzü'], ulasim: true, okul: true, manzara: 'farketmez', katTercihi: 'orta',
    teslimBeklentisi: 'hizli', aidatHassasiyeti: 'orta', kiraBeklentisi: false, yatirimSuresi: null,
    oncekiGorusmeler: ['İlk görüşmede okul ve park yakınlığını vurguladı', 'Eşi güney cephe istiyor'],
    itirazlar: ['Aidat yüksek olmasın', 'Teslim çok uzak olmasın'],
    konusmaOnerisi: 'Çocukların okula yürüme mesafesi ve güvenli site yaşamı hikâyesini öne çıkar.',
    whatsappOzeti: 'Güney cephe, okula yakın 3+1 + hızlı teslim',
  },
  {
    id: 'm02', ad: 'Mehmet Demir', persona: 'yatirimci',
    ozet: 'Kira getirisi ve prim odaklı, portföyüne 2. yatırım dairesini ekleyen deneyimli yatırımcı.',
    butce: 11_000_000, pesinat: 11_000_000, krediDurumu: 'nakit', cocukSayisi: 0, yas: 45,
    lokasyonTercihi: ['Beylikdüzü'], ulasim: true, okul: false, manzara: 'farketmez', katTercihi: 'farketmez',
    teslimBeklentisi: 'farketmez', aidatHassasiyeti: 'yuksek', kiraBeklentisi: true, yatirimSuresi: 'orta',
    oncekiGorusmeler: ['Kira/fiyat oranını sordu', 'Düşük aidatlı birim tercih ediyor'],
    itirazlar: ['Aidat kira getirisini yemesin', 'Doluluk riski olmasın'],
    konusmaOnerisi: 'Kira/fiyat oranı ve düşük işletme maliyetini sayılarla göster.',
    whatsappOzeti: 'Yüksek kira getirili, düşük aidatlı yatırımlık',
  },
  {
    id: 'm03', ad: 'Karim Al-Rashid', persona: 'vatandaslik',
    ozet: 'Vatandaşlık + oturum hedefleyen yabancı yatırımcı; deniz manzarası ve prestij önemli.',
    butce: 20_000_000, pesinat: 20_000_000, krediDurumu: 'nakit', cocukSayisi: 3, yas: 42,
    lokasyonTercihi: ['Beylikdüzü', 'sahil'], ulasim: false, okul: true, manzara: 'deniz', katTercihi: 'yuksek',
    teslimBeklentisi: 'orta', aidatHassasiyeti: 'dusuk', kiraBeklentisi: true, yatirimSuresi: 'uzun',
    oncekiGorusmeler: ['Vatandaşlık sürecini ve eşik tutarını sordu', 'Deniz manzarasında ısrarcı'],
    itirazlar: ['Vatandaşlık eşiğini garanti et', 'Teslim süresi makul olsun'],
    konusmaOnerisi: 'Vatandaşlık eşiği + deniz manzarası + prim hikâyesini birlikte anlat; süreç güvencesi ver.',
    whatsappOzeti: 'Vatandaşlık uygun, deniz manzaralı yüksek kat',
  },
  {
    id: 'm04', ad: 'Zeynep Kaya', persona: 'kararsiz',
    ozet: 'İlk evini alacak, kafasında net olmayan; fiyat ile teslim arasında gidip gelen genç alıcı.',
    butce: 9_500_000, pesinat: 2_500_000, krediDurumu: 'sinirli', cocukSayisi: 0, yas: 31,
    lokasyonTercihi: ['Beylikdüzü'], ulasim: true, okul: false, manzara: 'farketmez', katTercihi: 'orta',
    teslimBeklentisi: 'hizli', aidatHassasiyeti: 'yuksek', kiraBeklentisi: false, yatirimSuresi: null,
    oncekiGorusmeler: ['İki kez randevu erteledi', 'Kredi onayından emin değil'],
    itirazlar: ['Kredi çıkar mı', 'Aidat bütçeyi zorlar mı', 'Acele etmek istemiyorum'],
    konusmaOnerisi: 'Karar baskısı yapma; hazır teslim + düşük aidat ile riski azalt, kredi senaryosunu netleştir.',
    whatsappOzeti: 'Hazır teslim, düşük aidatlı, bütçe dostu 2+1',
  },
  {
    id: 'm05', ad: 'Hakan Şahin', persona: 'firsatci',
    ozet: 'Pazarlık ve indirim peşinde; yaşlanan stoktan değerin altında almak isteyen fırsat avcısı.',
    butce: 8_500_000, pesinat: 4_000_000, krediDurumu: 'uygun', cocukSayisi: 1, yas: 40,
    lokasyonTercihi: ['Beylikdüzü'], ulasim: true, okul: false, manzara: 'farketmez', katTercihi: 'farketmez',
    teslimBeklentisi: 'farketmez', aidatHassasiyeti: 'orta', kiraBeklentisi: true, yatirimSuresi: 'kisa',
    oncekiGorusmeler: ['Her görüşmede indirim sordu', 'Hazır + pazarlığa açık birim istiyor'],
    itirazlar: ['Fiyatta indirim olmazsa ilgilenmem', 'Liste fiyatından almam'],
    konusmaOnerisi: 'Yaşlanan stok + pazarlık marjı olan birimleri sun; kampanyayı fırsat olarak çerçevele.',
    whatsappOzeti: 'Pazarlığa açık, hazır teslim fırsat dairesi',
  },
  {
    id: 'm06', ad: 'Elif & Burak Aydın', persona: 'oturumcu',
    ozet: 'Tek çocuklu çift; sessizlik ve güney cephe öncelikli, orta-üst bütçeli oturumcu.',
    butce: 13_500_000, pesinat: 5_500_000, krediDurumu: 'uygun', cocukSayisi: 1, yas: 35,
    lokasyonTercihi: ['Beylikdüzü'], ulasim: true, okul: true, manzara: 'farketmez', katTercihi: 'orta',
    teslimBeklentisi: 'hizli', aidatHassasiyeti: 'orta', kiraBeklentisi: false, yatirimSuresi: null,
    oncekiGorusmeler: ['Sessiz cephe ve okul önemli dediler', 'Güney cephe tercihleri var'],
    itirazlar: ['Gürültülü cadde cephesi istemeyiz', 'Teslim hızlı olsun'],
    konusmaOnerisi: 'Sessiz konum + güney cephe + okul üçlüsünü öne çıkar; hızlı teslimle kapat.',
    whatsappOzeti: 'Sessiz, güney cepheli, okula yakın 3+1',
  },
  {
    id: 'm07', ad: 'Omar Farouk', persona: 'vatandaslik',
    ozet: 'Vatandaşlık eşiğini en uygun maliyetle geçmek isteyen yabancı yatırımcı; oturmayacak, kiraya verecek.',
    butce: 12_500_000, pesinat: 12_500_000, krediDurumu: 'nakit', cocukSayisi: 0, yas: 50,
    lokasyonTercihi: ['Beylikdüzü'], ulasim: false, okul: false, manzara: 'farketmez', katTercihi: 'farketmez',
    teslimBeklentisi: 'farketmez', aidatHassasiyeti: 'yuksek', kiraBeklentisi: true, yatirimSuresi: 'uzun',
    oncekiGorusmeler: ['En düşük vatandaşlık eşiğini soruyor', 'Kira getirisi + aidat dengesi önemli'],
    itirazlar: ['Eşiği zar zor geçen en uygun birim hangisi', 'Aidat yüksekse kira erir'],
    konusmaOnerisi: 'Vatandaşlık eşiğini geçen en uygun, kira/aidat dengesi iyi birimi öner.',
    whatsappOzeti: 'Vatandaşlık eşiği + iyi kira/aidat dengesi',
  },
  {
    id: 'm08', ad: 'Canan Öztürk', persona: 'yatirimci',
    ozet: 'Prim odaklı, orta vadede satıp kâr etmek isteyen; deniz manzaralı yüksek kat tercih ediyor.',
    butce: 16_500_000, pesinat: 8_000_000, krediDurumu: 'uygun', cocukSayisi: 0, yas: 47,
    lokasyonTercihi: ['Beylikdüzü', 'sahil'], ulasim: false, okul: false, manzara: 'deniz', katTercihi: 'yuksek',
    teslimBeklentisi: 'orta', aidatHassasiyeti: 'orta', kiraBeklentisi: false, yatirimSuresi: 'orta',
    oncekiGorusmeler: ['Prim potansiyeli yüksek birimleri istedi', 'Erken alım indirimini sordu'],
    itirazlar: ['Prim gerçekten oluşur mu', 'Teslimde piyasa düşerse'],
    konusmaOnerisi: 'Deniz cephesi + yüksek kat + erken alım primi senaryosunu rakamlarla kur.',
    whatsappOzeti: 'Deniz manzaralı, yüksek primli yatırımlık',
  },
  {
    id: 'm09', ad: 'İbrahim & Fatma Çelik', persona: 'oturumcu',
    ozet: 'Üç çocuklu kalabalık aile; geniş 4+1 ve çok odaya ihtiyaç duyuyor, bütçesi geniş.',
    butce: 22_000_000, pesinat: 9_000_000, krediDurumu: 'uygun', cocukSayisi: 3, yas: 44,
    lokasyonTercihi: ['Beylikdüzü'], ulasim: true, okul: true, manzara: 'farketmez', katTercihi: 'yuksek',
    teslimBeklentisi: 'orta', aidatHassasiyeti: 'dusuk', kiraBeklentisi: false, yatirimSuresi: null,
    oncekiGorusmeler: ['Her çocuğa oda istediler', 'Geniş salon ve çalışma odası şart'],
    itirazlar: ['4+1 az bulunuyor', 'Teslim çok uzamasın'],
    konusmaOnerisi: 'Her çocuğa oda + çalışma odası + geniş yaşam kurgusunu anlat; 4+1 envanterini öne çıkar.',
    whatsappOzeti: 'Geniş 4+1, yüksek kat, çok odalı aile dairesi',
  },
  {
    id: 'm10', ad: 'Deniz Arslan', persona: 'kararsiz',
    ozet: 'Yatırım mı oturum mu kararsız; küçük bütçeli, hızlı kararı zor veren genç alıcı.',
    butce: 6_000_000, pesinat: 2_000_000, krediDurumu: 'sinirli', cocukSayisi: 0, yas: 29,
    lokasyonTercihi: ['Beylikdüzü'], ulasim: true, okul: false, manzara: 'farketmez', katTercihi: 'farketmez',
    teslimBeklentisi: 'hizli', aidatHassasiyeti: 'yuksek', kiraBeklentisi: true, yatirimSuresi: 'kisa',
    oncekiGorusmeler: ['Oturum mu kira mı net değil', 'Düşük giriş bütçesi vurguladı'],
    itirazlar: ['Bütçem kısıtlı', 'Aidat yükü istemiyorum'],
    konusmaOnerisi: 'Düşük giriş + yüksek kira/fiyat oranlı 1+1 ile riski düşür; "hem otur hem kirala" esnekliğini anlat.',
    whatsappOzeti: 'Düşük bütçeli, yüksek kiralı 1+1 giriş fırsatı',
  },
  {
    id: 'm11', ad: 'Yusuf Aktaş', persona: 'firsatci',
    ozet: 'Likiditesi yüksek; uzun süredir satılmayan birimi sert pazarlıkla almak isteyen fırsatçı.',
    butce: 11_500_000, pesinat: 11_500_000, krediDurumu: 'nakit', cocukSayisi: 2, yas: 48,
    lokasyonTercihi: ['Beylikdüzü'], ulasim: true, okul: true, manzara: 'farketmez', katTercihi: 'farketmez',
    teslimBeklentisi: 'hizli', aidatHassasiyeti: 'orta', kiraBeklentisi: true, yatirimSuresi: 'orta',
    oncekiGorusmeler: ['Nakit + hızlı kapanış karşılığı indirim istiyor', 'Yaşlanan stoğu soruyor'],
    itirazlar: ['Nakit veriyorum, ekstra indirim isterim', 'Liste fiyatı konuşmam'],
    konusmaOnerisi: 'En yaşlı, pazarlığa açık vatandaşlık-uygun birimi nakit + hızlı kapanış primiyle sun.',
    whatsappOzeti: 'Nakit fırsatçı için yaşlanan stok + sert pazarlık',
  },
  {
    id: 'm12', ad: 'Leyla Doğan', persona: 'vatandaslik',
    ozet: 'Vatandaşlık + oturum ikisini birlikte isteyen; aile için deniz manzaralı, okula yakın arıyor.',
    butce: 18_500_000, pesinat: 18_500_000, krediDurumu: 'nakit', cocukSayisi: 2, yas: 39,
    lokasyonTercihi: ['Beylikdüzü', 'sahil'], ulasim: true, okul: true, manzara: 'deniz', katTercihi: 'orta',
    teslimBeklentisi: 'hizli', aidatHassasiyeti: 'dusuk', kiraBeklentisi: false, yatirimSuresi: 'uzun',
    oncekiGorusmeler: ['Hem vatandaşlık hem oturum istiyor', 'Çocuklar için okul + deniz önemli'],
    itirazlar: ['Vatandaşlık eşiğini geçmeli', 'Hızlı teslim olsun, çocuklar okula başlasın'],
    konusmaOnerisi: 'Vatandaşlık + deniz manzarası + okul + hızlı teslimi tek pakette sun; aile hikâyesini kur.',
    whatsappOzeti: 'Vatandaşlık + deniz + okula yakın + hızlı teslim',
  },
]

// ════════════════════════════════════════════════════════════════════════════
//  EŞLEŞTİRME MOTORU — kural tabanlı, deterministik, gerekçeli
//  Toplam 100: bütçe 35 · persona-etiket 30 · teslim 12 · yaşam uyumu 23
// ════════════════════════════════════════════════════════════════════════════

const PERSONA_TERCIH: Record<Persona, string[]> = {
  yatirimci:   ['Yüksek kira', 'Yüksek prim', 'Düşük aidat', 'Yatırımlık', 'Hazır teslim'],
  oturumcu:    ['Aile', 'Sessiz', 'Güney cephe', 'Okula yakın', 'Geniş aile', 'Genç çift'],
  vatandaslik: ['Vatandaşlık uygun', 'Deniz manzarası', 'Yüksek prim', 'Yüksek kat', 'Lüks'],
  firsatci:    ['Pazarlığa açık', 'Yaşlanan stok', 'Hazır teslim', 'Yüksek kira'],
  kararsiz:    ['Hazır teslim', 'Düşük aidat', 'Genç çift', 'Yüksek kira'],
}

function butcePuan(c: Customer, u: Unit): { puan: number; neden?: string } {
  const r = u.fiyat / c.butce
  if (r <= 0.6) return { puan: 26, neden: 'Bütçenin oldukça altında — rahat alım' }
  if (r <= 1.0) return { puan: 35, neden: 'Fiyat bütçeye tam oturuyor' }
  if (r <= 1.1) return { puan: 20, neden: 'Bütçeyi biraz aşıyor — pazarlıkla uyabilir' }
  if (r <= 1.25) return { puan: 8 }
  return { puan: 0 }
}

function odaIhtiyaci(c: Customer): string[] {
  if (c.cocukSayisi >= 3) return ['4+1']
  if (c.cocukSayisi === 2) return ['3+1', '4+1']
  if (c.cocukSayisi === 1) return ['2+1', '3+1']
  return ['1+1', '2+1']
}

function teslimPuan(c: Customer, u: Unit): { puan: number; neden?: string } {
  if (c.teslimBeklentisi === 'hizli') {
    if (u.teslimAy <= 3) return { puan: 12, neden: u.teslimAy === 0 ? 'Hazır teslim — müşteri hızlı taşınmak istiyor' : 'Teslim 3 ay — "yakın teslim" beklentisiyle uyumlu' }
    if (u.teslimAy <= 6) return { puan: 6 }
    return { puan: 0 }
  }
  if (c.teslimBeklentisi === 'orta') {
    if (u.teslimAy <= 9) return { puan: 10 }
    return { puan: 4 }
  }
  return { puan: 8 }
}

// 0–30: persona ↔ etiket örtüşmesi
function personaPuan(c: Customer, u: Unit): { puan: number; nedenler: string[] } {
  const tercih = PERSONA_TERCIH[c.persona]
  const labels = u.etiketler.map(e => e.label)
  const eslesen = labels.filter(l => tercih.includes(l))
  const puan = Math.min(30, eslesen.length * 9)
  const nedenler = eslesen.slice(0, 3).map(l => `${PERSONA_ETIKET[c.persona]} profili: "${l}" örtüşüyor`)
  return { puan, nedenler }
}

// 0–23: yaşam/ihtiyaç uyumu (oda, manzara, okul, kat, vatandaşlık, aidat)
function yasamPuan(c: Customer, u: Unit): { puan: number; nedenler: string[] } {
  let p = 0
  const nedenler: string[] = []

  // Oda ihtiyacı
  if (odaIhtiyaci(c).includes(u.tip)) {
    p += 7
    if (c.cocukSayisi >= 1) nedenler.push(`${c.cocukSayisi} çocuk → ${u.tip} ihtiyaca uygun`)
  }
  // Vatandaşlık
  if (c.persona === 'vatandaslik') {
    if (u.vatandaslikUygun) { p += 6; nedenler.push('Vatandaşlık eşiğini karşılıyor') }
    else nedenler.push('⚠ Vatandaşlık eşiğinin altında')
  } else if (u.vatandaslikUygun && c.kiraBeklentisi) {
    p += 1
  }
  // Manzara
  if (c.manzara !== 'farketmez') {
    if (c.manzara === u.manzara) { p += 4; nedenler.push(`${c.manzara === 'deniz' ? 'Deniz' : 'Şehir'} manzarası tercihi karşılanıyor`) }
  }
  // Okul
  if (c.okul && u.etiketler.some(e => e.label === 'Okula yakın')) { p += 3; nedenler.push('Okula yürüme mesafesi') }
  // Kat
  if (c.katTercihi !== 'farketmez') {
    const yuksek = u.kat >= 7, dusuk = u.kat <= 3
    if ((c.katTercihi === 'yuksek' && yuksek) || (c.katTercihi === 'dusuk' && dusuk) || (c.katTercihi === 'orta' && !yuksek && !dusuk)) {
      p += 2; nedenler.push(`${u.kat}. kat — kat tercihiyle uyumlu`)
    }
  }
  // Aidat hassasiyeti
  if (c.aidatHassasiyeti === 'yuksek' && u.etiketler.some(e => e.label === 'Yüksek aidat')) {
    p -= 5; nedenler.push('⚠ Aidat yüksek — müşteri aidata hassas')
  } else if (c.aidatHassasiyeti !== 'dusuk' && u.etiketler.some(e => e.label === 'Düşük aidat')) {
    p += 2; nedenler.push('Düşük aidat — işletme maliyeti avantajı')
  }
  // Kira beklentisi
  if (c.kiraBeklentisi && u.etiketler.some(e => e.label === 'Yüksek kira')) {
    p += 2; nedenler.push(`Aylık ~${(u.kiraPotansiyeli / 1000).toFixed(0)}K ₺ kira potansiyeli`)
  }
  return { puan: Math.max(-5, Math.min(23, p)), nedenler }
}

export function hesaplaEslesme(c: Customer, u: Unit): Match {
  const b = butcePuan(c, u)
  const pe = personaPuan(c, u)
  const t = teslimPuan(c, u)
  const y = yasamPuan(c, u)

  const skor = Math.max(0, Math.min(100, Math.round(b.puan + pe.puan + t.puan + y.puan)))

  const nedenler: string[] = []
  if (b.neden) nedenler.push(b.neden)
  nedenler.push(...pe.nedenler)
  if (t.neden) nedenler.push(t.neden)
  nedenler.push(...y.nedenler)

  // Olası itirazlar: birimin dikkat etiketleri + müşteri itirazları → birim yanıtı
  const olasiItirazlar: { itiraz: string; yanit: string }[] = []
  for (const tag of u.etiketler.filter(e => e.tone === 'caution')) {
    const eslesen = u.itirazlar.find(i => i.itiraz.toLowerCase().includes(tag.label.toLowerCase().split(' ')[0]))
    if (eslesen) olasiItirazlar.push(eslesen)
  }
  if (olasiItirazlar.length === 0 && u.itirazlar.length > 0) olasiItirazlar.push(u.itirazlar[0])

  return {
    customerId: c.id, unitId: u.id, skor, tier: tierFor(skor),
    nedenler: nedenler.filter(Boolean).slice(0, 6),
    olasiItirazlar: olasiItirazlar.slice(0, 2),
    alternatifler: [],
  }
}

// Bir müşteri için sıralı eşleşmeler (alternatifler otomatik doldurulur)
export function eslesmelerForCustomer(c: Customer, limit = 5): Match[] {
  const sirali = UNITS.map(u => hesaplaEslesme(c, u)).sort((a, b) => b.skor - a.skor)
  const altIds = sirali.slice(1, 4).map(m => m.unitId)
  return sirali.slice(0, limit).map((m, i) => ({
    ...m,
    alternatifler: i === 0 ? altIds : sirali.slice(i + 1, i + 3).map(x => x.unitId),
  }))
}

// Bir birim için sıralı müşteri havuzu (stoktan müşteriye)
export function eslesmelerForUnit(u: Unit, limit = 5): Match[] {
  return CUSTOMERS.map(c => hesaplaEslesme(c, u)).sort((a, b) => b.skor - a.skor).slice(0, limit)
}

// ── Yardımcılar ───────────────────────────────────────────────────────────────
export const unitById = (id: string) => UNITS.find(u => u.id === id)
export const customerById = (id: string) => CUSTOMERS.find(c => c.id === id)

export function fmtFiyat(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}M ₺`
  if (n >= 1_000) return `${(n / 1_000).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}K ₺`
  return n.toLocaleString('tr-TR') + ' ₺'
}

// ── Yönetici görünümü türevleri ────────────────────────────────────────────────
export interface YoneticiOzet {
  enCokOnerilen: { unit: Unit; sayi: number }[]
  hicOnerilmeyen: Unit[]
  yanlisEslesmeler: { unit: Unit; ortSkor: number }[]
  segmentBirikme: { segment: string; sayi: number; ortYas: number }[]
  azalanPersona: { persona: Persona; talep: number }[]
  temsilciDogruluk: { ad: string; oneri: number; donusum: number }[]
}

export function yoneticiOzet(): YoneticiOzet {
  // Her müşterinin top-5 önerisindeki birimleri say
  const oneriSayaci = new Map<string, number>()
  for (const c of CUSTOMERS) {
    for (const m of eslesmelerForCustomer(c, 5)) {
      oneriSayaci.set(m.unitId, (oneriSayaci.get(m.unitId) ?? 0) + 1)
    }
  }
  const siraliOneri = UNITS
    .map(u => ({ unit: u, sayi: oneriSayaci.get(u.id) ?? 0 }))
    .sort((a, b) => b.sayi - a.sayi)

  const enCokOnerilen = siraliOneri.slice(0, 4)
  const hicOnerilmeyen = siraliOneri.filter(x => x.sayi === 0).map(x => x.unit)

  // Stoktan müşteriye en iyi eşleşmesi düşük kalan birimler (zor eşleşen)
  const yanlisEslesmeler = UNITS
    .map(u => {
      const top = eslesmelerForUnit(u, 3)
      const ort = top.reduce((s, m) => s + m.skor, 0) / Math.max(1, top.length)
      return { unit: u, ortSkor: Math.round(ort) }
    })
    .sort((a, b) => a.ortSkor - b.ortSkor)
    .slice(0, 4)

  // Segment birikmesi: tipe göre yaşlanan stok yığılması
  const tipler = Array.from(new Set(UNITS.map(u => u.tip)))
  const segmentBirikme = tipler
    .map(tip => {
      const grup = UNITS.filter(u => u.tip === tip)
      const yaslanan = grup.filter(u => u.yaslanmaGunu >= 40)
      const ortYas = Math.round(grup.reduce((s, u) => s + u.yaslanmaGunu, 0) / grup.length)
      return { segment: `${tip} (${grup.length} birim)`, sayi: yaslanan.length, ortYas }
    })
    .sort((a, b) => b.sayi - a.sayi || b.ortYas - a.ortYas)

  // Persona talebi (müşteri havuzundaki dağılım — azalan)
  const personalar: Persona[] = ['oturumcu', 'yatirimci', 'vatandaslik', 'kararsiz', 'firsatci']
  const azalanPersona = personalar
    .map(p => ({ persona: p, talep: CUSTOMERS.filter(c => c.persona === p).length }))
    .sort((a, b) => a.talep - b.talep)

  // Temsilci öneri doğruluğu (fixture — öneri sayısı vs simüle dönüşüm)
  const temsilciDogruluk = [
    { ad: 'Rüya', oneri: 34, donusum: 9 },
    { ad: 'Sude', oneri: 21, donusum: 3 },
  ]

  return { enCokOnerilen, hicOnerilmeyen, yanlisEslesmeler, segmentBirikme, azalanPersona, temsilciDogruluk }
}
