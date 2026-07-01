import { type AirtableRecord, type FirmaListeItem, type FirmaKart } from './airtable'

// ── Bugünün Hamleleri ─────────────────────────────────────────────────────────

export type SicaklikTipi = 'hot' | 'warm' | 'cold'

export interface HamleItem {
  id: string
  ad: string
  sicaklik: SicaklikTipi
  asama: string
  il: string
  tip: string
  tel: string
  aliGerekce: string
  aksiyonTipi: 'ara' | 'whatsapp' | 'ertele'
  oncelik: number  // 1=en yüksek
}

export const BUGUNUN_HAMLELERI: HamleItem[] = [
  {
    id: 'h1', ad: 'Fatih & Ayşe Demir', sicaklik: 'hot',
    asama: 'Teklif', il: 'İstanbul / Kadıköy', tip: 'Daire',
    tel: '05321110001',
    aliGerekce: '9/10 sıcaklık skoru. Teklifi 3 gün önce gönderildi, yanıt yok. Bugün iletişime geç.',
    aksiyonTipi: 'ara', oncelik: 1,
  },
  {
    id: 'h2', ad: 'Cansu Aydın', sicaklik: 'hot',
    asama: 'Randevu', il: 'Antalya / Muratpaşa', tip: 'Rezidans',
    tel: '05429990009',
    aliGerekce: 'Randevu 2 gün sonrasına planlandı. WhatsApp\'tan bir hatırlatma göndermek müşteri deneyimini artırır.',
    aksiyonTipi: 'whatsapp', oncelik: 2,
  },
  {
    id: 'h3', ad: 'Leyla Kaya', sicaklik: 'hot',
    asama: 'Müzakere', il: 'İzmir / Bornova', tip: 'Daire',
    tel: '05353330003',
    aliGerekce: 'Fiyat müzakeresi sürecinde. 8/10 skor. Son iletişimden 4 gün geçti, momentum kaybedebilir.',
    aksiyonTipi: 'ara', oncelik: 3,
  },
  {
    id: 'h4', ad: 'Murat Şahin', sicaklik: 'warm',
    asama: 'Randevu', il: 'Ankara / Çankaya', tip: 'Villa',
    tel: '05332220002',
    aliGerekce: '7/10 skor. Randevu henüz net değil — lokasyon ve bütçe konuşuldu, bir sonraki adım netleştirme.',
    aksiyonTipi: 'whatsapp', oncelik: 4,
  },
  {
    id: 'h5', ad: 'Osman & Zeynep Yıldız', sicaklik: 'warm',
    asama: 'Yanıt Alındı', il: 'Bursa / Nilüfer', tip: 'Rezidans',
    tel: '05364440004',
    aliGerekce: 'İki kişilik karar süreci. 6/10 skor. Eşler arası fikir ayrılığı seziliyor — ayrı görüşme öner.',
    aksiyonTipi: 'ara', oncelik: 5,
  },
  {
    id: 'h6', ad: 'Kemal & Nurcan Güler', sicaklik: 'warm',
    asama: 'Teklif', il: 'İstanbul / Ataşehir', tip: 'Daire',
    tel: '05431000010',
    aliGerekce: 'Teklif aşamasında ama 6/10 skor. Rakip proje bakıyor olabilir — güçlü bir avantaj vurgusu yap.',
    aksiyonTipi: 'whatsapp', oncelik: 6,
  },
  {
    id: 'h7', ad: 'Elif Arslan', sicaklik: 'cold',
    asama: 'Teklif', il: 'İstanbul / Beşiktaş', tip: 'Daire',
    tel: '05375550005',
    aliGerekce: '5/10 skor. Son iletişim 12 gün önce. Basit bir "nasılsınız" mesajı yeterli.',
    aksiyonTipi: 'ertele', oncelik: 7,
  },
]

// ── Temsilci Skorboard fixture ─────────────────────────────────────────────────

export interface TemsilciSkor {
  ad: string
  renk: string
  leadSayisi: number
  aramaSayisi: number
  randevuSayisi: number
  satisAdedi: number
  hedefYuzde: number
  ciro: number
}

export const TEMSILCI_SKORU: TemsilciSkor[] = [
  { ad: 'Rüya', renk: '#982A49', leadSayisi: 6, aramaSayisi: 18, randevuSayisi: 4, satisAdedi: 1, hedefYuzde: 72, ciro: 8_400_000 },
  { ad: 'Sude', renk: '#5B38E8', leadSayisi: 4, aramaSayisi: 11, randevuSayisi: 2, satisAdedi: 0, hedefYuzde: 35, ciro: 0 },
]

export const LEAD_YASLANMA = [
  { etiket: '0–7 gün',  renk: '#22C55E', sayi: 3 },
  { etiket: '8–30 gün', renk: '#F59E0B', sayi: 4 },
  { etiket: '31–90 gün',renk: '#EF6B4F', sayi: 2 },
  { etiket: '90+ gün',  renk: '#94A3B8', sayi: 1 },
]

// ── Stok ısı haritası ek veriler ──────────────────────────────────────────────

export interface StokDetay {
  id: string
  goruntulenmePerhafta: number
  aktifTalep: number
  tahminiSatisSuresi: string  // örn. '~3 hafta'
  sonGosteriminGunu: number   // gün önce
  riskli: boolean
  aliOneri?: string
}

// ── Bireysel müşteri fixture (Airtable'a gitmez) ──────────────────────────

export interface StokItem {
  id: string
  proje: string
  blok: string
  kat: number
  daire: string
  metrekare: number
  fiyat: number
  durum: 'Müsait' | 'Opsiyonlu' | 'Satıldı'
  il: string
}

// Kaynak: Babacan_Stok_Analizi_TEMIZ_50TL.xlsx · "Önceliklendirme" sayfası (satılabilir stok)
export const STOK_DETAY: Record<string, StokDetay> = {
  'A-93': { id: 'A-93', goruntulenmePerhafta: 25, aktifTalep: 2, tahminiSatisSuresi: '~5 hafta', sonGosteriminGunu: 18, riskli: false },
  'C-209': { id: 'C-209', goruntulenmePerhafta: 18, aktifTalep: 2, tahminiSatisSuresi: '~5 hafta', sonGosteriminGunu: 27, riskli: false },
  'B-77': { id: 'B-77', goruntulenmePerhafta: 28, aktifTalep: 4, tahminiSatisSuresi: '~2 hafta', sonGosteriminGunu: 21, riskli: false },
  'B-151': { id: 'B-151', goruntulenmePerhafta: 13, aktifTalep: 5, tahminiSatisSuresi: '~2 hafta', sonGosteriminGunu: 22, riskli: false },
  'B-79': { id: 'B-79', goruntulenmePerhafta: 30, aktifTalep: 5, tahminiSatisSuresi: '~2 hafta', sonGosteriminGunu: 23, riskli: false },
  'A-119': { id: 'A-119', goruntulenmePerhafta: 16, aktifTalep: 1, tahminiSatisSuresi: '~10 hafta', sonGosteriminGunu: 25, riskli: true, aliOneri: 'Segment: Yatırımcı paketi / yüksek sepet. Kanal: Yatırımcı portföyü + yabancı ağ + paket satış.' },
  'B-86': { id: 'B-86', goruntulenmePerhafta: 28, aktifTalep: 4, tahminiSatisSuresi: '~2 hafta', sonGosteriminGunu: 21, riskli: false },
  'B-112': { id: 'B-112', goruntulenmePerhafta: 10, aktifTalep: 5, tahminiSatisSuresi: '~2 hafta', sonGosteriminGunu: 19, riskli: false },
  'A-37': { id: 'A-37', goruntulenmePerhafta: 23, aktifTalep: 4, tahminiSatisSuresi: '~2 hafta', sonGosteriminGunu: 16, riskli: false },
  'B-32': { id: 'B-32', goruntulenmePerhafta: 19, aktifTalep: 6, tahminiSatisSuresi: '~2 hafta', sonGosteriminGunu: 12, riskli: false },
  'A2-206': { id: 'A2-206', goruntulenmePerhafta: 7, aktifTalep: 2, tahminiSatisSuresi: '~5 hafta', sonGosteriminGunu: 32, riskli: false },
  'D-85': { id: 'D-85', goruntulenmePerhafta: 29, aktifTalep: 2, tahminiSatisSuresi: '~5 hafta', sonGosteriminGunu: 22, riskli: false },
  'B-41': { id: 'B-41', goruntulenmePerhafta: 19, aktifTalep: 6, tahminiSatisSuresi: '~2 hafta', sonGosteriminGunu: 12, riskli: false },
  'A2-3': { id: 'A2-3', goruntulenmePerhafta: 18, aktifTalep: 5, tahminiSatisSuresi: '~2 hafta', sonGosteriminGunu: 11, riskli: false },
  'B2-452-453': { id: 'B2-452-453', goruntulenmePerhafta: 16, aktifTalep: 0, tahminiSatisSuresi: '~10 hafta', sonGosteriminGunu: 37, riskli: true, aliOneri: 'Segment: 3.5+1 büyük daire, talep dar. Kanal: yatırımcı ağı + paket satış; erken alım primi vurgula.' },
  'A4-73': { id: 'A4-73', goruntulenmePerhafta: 19, aktifTalep: 3, tahminiSatisSuresi: '~5 hafta', sonGosteriminGunu: 28, riskli: false },
  'B2-200': { id: 'B2-200', goruntulenmePerhafta: 30, aktifTalep: 3, tahminiSatisSuresi: '~5 hafta', sonGosteriminGunu: 27, riskli: false },
  'B2-47': { id: 'B2-47', goruntulenmePerhafta: 19, aktifTalep: 3, tahminiSatisSuresi: '~5 hafta', sonGosteriminGunu: 28, riskli: false },
}

export const STOK_LISTESI: StokItem[] = [
  { id: 'A-93', proje: 'Central', blok: 'A', kat: 14, daire: 'A-93', metrekare: 193, fiyat: 23_550_000, durum: 'Müsait', il: 'İstanbul / Beylikdüzü' },
  { id: 'C-209', proje: 'Central', blok: 'C', kat: 15, daire: 'C-209', metrekare: 128, fiyat: 20_100_000, durum: 'Müsait', il: 'İstanbul / Beylikdüzü' },
  { id: 'B-77', proje: 'Central', blok: 'B', kat: 8, daire: 'B-77', metrekare: 134, fiyat: 15_500_000, durum: 'Müsait', il: 'İstanbul / Beylikdüzü' },
  { id: 'B-151', proje: 'Central', blok: 'B', kat: 14, daire: 'B-151', metrekare: 79, fiyat: 11_400_000, durum: 'Müsait', il: 'İstanbul / Beylikdüzü' },
  { id: 'B-79', proje: 'Central', blok: 'B', kat: 8, daire: 'B-79', metrekare: 78, fiyat: 9_550_000, durum: 'Müsait', il: 'İstanbul / Beylikdüzü' },
  { id: 'A-119', proje: 'Lagoon', blok: 'A', kat: 9, daire: 'A-119', metrekare: 326, fiyat: 31_200_000, durum: 'Müsait', il: 'İstanbul / 5. Levent' },
  { id: 'B-86', proje: 'Lagoon', blok: 'B', kat: 5, daire: 'B-86', metrekare: 143, fiyat: 15_100_000, durum: 'Müsait', il: 'İstanbul / 5. Levent' },
  { id: 'B-112', proje: 'Lagoon', blok: 'B', kat: 7, daire: 'B-112', metrekare: 75, fiyat: 10_263_158, durum: 'Müsait', il: 'İstanbul / 5. Levent' },
  { id: 'A-37', proje: 'Lagoon', blok: 'A', kat: 1, daire: 'A-37', metrekare: 73, fiyat: 9_368_421, durum: 'Müsait', il: 'İstanbul / 5. Levent' },
  { id: 'B-32', proje: 'Lagoon', blok: 'B', kat: 0, daire: 'B-32', metrekare: 73, fiyat: 8_526_316, durum: 'Müsait', il: 'İstanbul / 5. Levent' },
  { id: 'A2-206', proje: 'Port Royal', blok: 'A2', kat: 12, daire: 'A2-206', metrekare: 480, fiyat: 30_150_000, durum: 'Müsait', il: 'İstanbul / Sefaköy' },
  { id: 'D-85', proje: 'Port Royal', blok: 'D', kat: 9, daire: 'D-85', metrekare: 115, fiyat: 15_329_520, durum: 'Müsait', il: 'İstanbul / Sefaköy' },
  { id: 'B-41', proje: 'Port Royal', blok: 'B', kat: 4, daire: 'B-41', metrekare: 38, fiyat: 8_500_000, durum: 'Müsait', il: 'İstanbul / Sefaköy' },
  { id: 'A2-3', proje: 'Port Royal', blok: 'A2', kat: 0, daire: 'A2-3', metrekare: 38, fiyat: 6_050_000, durum: 'Müsait', il: 'İstanbul / Sefaköy' },
  { id: 'B2-452-453', proje: 'Premium', blok: 'B2', kat: 33, daire: 'B2-452-453', metrekare: 219, fiyat: 17_979_928, durum: 'Müsait', il: 'İstanbul / Esenyurt' },
  { id: 'A4-73', proje: 'Premium', blok: 'A4', kat: 14, daire: 'A4-73', metrekare: 133, fiyat: 10_914_294, durum: 'Müsait', il: 'İstanbul / Esenyurt' },
  { id: 'B2-200', proje: 'Premium', blok: 'B2', kat: 15, daire: 'B2-200', metrekare: 118, fiyat: 9_686_529, durum: 'Müsait', il: 'İstanbul / Esenyurt' },
  { id: 'B2-47', proje: 'Premium', blok: 'B2', kat: 4, daire: 'B2-47', metrekare: 101, fiyat: 8_293_464, durum: 'Müsait', il: 'İstanbul / Esenyurt' },
]

// ── Bireysel müşteri fixture (FirmaListeItem şeklinde) ───────────────────

function bir(
  id: string,
  ad: string,
  sektor: string,
  temsilci: 'Rüya' | 'Sude',
  skor: number,
  asama: string,
  il: string,
  tel: string,
): AirtableRecord<FirmaListeItem> {
  const now = new Date().toISOString()
  return {
    id,
    createdTime: now,
    fields: {
      'Firma Adı': ad,
      'Sektör': sektor,
      'Atanan Temsilci': temsilci,
      'Sıcaklık Skoru': skor,
      'Pipeline Aşaması': asama,
      'İl / İlçe': il,
      'Genel Telefon': tel,
      'Öncelik': skor >= 7 ? 'Yüksek' : skor >= 4 ? 'Orta' : 'Normal',
    },
  }
}

export const BIREYSEL_MUSTERILER: AirtableRecord<FirmaListeItem>[] = [
  bir('fix01', 'Fatih & Ayşe Demir',   'Daire',  'Rüya', 9, 'Teklif',       'İstanbul / Kadıköy', '0532 111 0001'),
  bir('fix02', 'Murat Şahin',          'Villa',   'Sude', 7, 'Randevu',      'Ankara / Çankaya',   '0533 222 0002'),
  bir('fix03', 'Leyla Kaya',           'Daire',   'Rüya', 8, 'Müzakere',     'İzmir / Bornova',    '0535 333 0003'),
  bir('fix04', 'Osman & Zeynep Yıldız','Rezidans', 'Sude', 6, 'Yanıt Alındı','Bursa / Nilüfer',    '0536 444 0004'),
  bir('fix05', 'Elif Arslan',          'Daire',   'Rüya', 5, 'Teklif',       'İstanbul / Beşiktaş','0537 555 0005'),
  bir('fix06', 'Hasan Çelik',          'Daire',   'Sude', 4, 'Ulaşılamadı', 'Ankara / Keçiören',  '0538 666 0006'),
  bir('fix07', 'Selin & Ali Toprak',   'Villa',   'Rüya', 9, 'Kazanıldı',   'İstanbul / Sarıyer', '0539 777 0007'),
  bir('fix08', 'Burak Özdemir',        'Daire',   'Sude', 3, 'Ulaşılamadı', 'İzmir / Konak',      '0541 888 0008'),
  bir('fix09', 'Cansu Aydın',          'Rezidans', 'Rüya', 8, 'Randevu',    'Antalya / Muratpaşa','0542 999 0009'),
  bir('fix10', 'Kemal & Nurcan Güler', 'Daire',   'Sude', 6, 'Teklif',      'İstanbul / Ataşehir','0543 100 0010'),
]

// Kanban (FirmaKart şekli) için bireysel fixture
export const BIREYSEL_KANBAN: AirtableRecord<FirmaKart>[] = BIREYSEL_MUSTERILER.map(r => ({
  id: r.id,
  createdTime: r.createdTime,
  fields: {
    'Firma Adı': r.fields['Firma Adı'],
    'Sektör': r.fields['Sektör'],
    'Sıcaklık Skoru': r.fields['Sıcaklık Skoru'],
    'Öncelik': r.fields['Öncelik'],
    'Atanan Temsilci': r.fields['Atanan Temsilci'],
  },
}))
