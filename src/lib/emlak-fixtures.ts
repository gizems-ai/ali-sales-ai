import { type AirtableRecord, type FirmaListeItem, type FirmaKart } from './airtable'
import { adaptStok, KUR } from './stok-adapter'
import { BABACAN_STOK } from '../data/babacan-stok'
import seedData from '../../seed/emlak-demo-seed.json'

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

// ── Stok (StokItem) — Raporlar panosu bu şekli okur; STOK_LISTESI adapter'dan türer ──
// Isı sinyalleri (görüntülenme/talep/…) artık burada DEĞİL → src/lib/stok-sinyal.ts.
// Envanter sayfası da bu tek kaynağı (BABACAN_STOK + adapter) kullanır.

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

// Proje → il/ilçe (BABACAN_STOK'ta konum kolonu yok — projeye sabitlenir).
const PROJE_IL: Record<string, string> = {
  Central: 'İstanbul / Beylikdüzü',
  Lagoon: 'İstanbul / 5. Levent',
  'Port Royal': 'İstanbul / Sefaköy',
  Premium: 'İstanbul / Esenyurt',
}

// STOK_LISTESI — TEK KAYNAK: gerçek 507 daire (BABACAN_STOK) → adapter → StokItem.
// Eski elle-yazılmış ~18 daire fixture'ı KALDIRILDI; Envanter sayfası ve Raporlar
// panosu artık aynı gerçekten okur. Fiyat: TL = fiyatUSD × KUR (§7 tek sabit).
// Durum: bu veride hepsi satılabilir → 'Müsait' (Opsiyonlu/Satıldı = 0).
export const STOK_LISTESI: StokItem[] = adaptStok(BABACAN_STOK).map(u => ({
  id: u.id,
  proje: u.proje,
  blok: u.blok,
  kat: u.katInt ?? 0,
  daire: u.id,
  metrekare: Math.round(u.brutM2),
  fiyat: Math.round(u.fiyatUSD * KUR),
  durum: 'Müsait',
  il: PROJE_IL[u.proje] ?? u.proje,
}))

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

// ── Müşteri fixtureları — TEK canonical kaynak: seed/emlak-demo-seed.json ──────
// Kurumsal (B2B) = Firmalar · Bireysel (B2C) = Kişiler. Airtable seed'iyle AYNI JSON.
// FirmaListeItem görünüm alanları (skor/öncelik/il/tel) JSON'dan deterministik türetilir.
const STAGE_SKOR: Record<string, number> = {
  'Kazanıldı': 9, 'Müzakere': 8, 'Teklif': 7, 'Randevu': 6,
  'Yanıt Alındı': 5, 'Ulaşılamadı': 3, 'Kaybedildi': 2,
}
const B2C_STAGES = ['Yanıt Alındı', 'Randevu', 'Teklif', 'Müzakere', 'Kazanıldı']
const ulkeIl = (u: string) => (u === 'Türkiye' ? 'İstanbul' : u)

// Kurumsal (B2B) — Firmalar
export const KURUMSAL_MUSTERILER: AirtableRecord<FirmaListeItem>[] = seedData.firmalar.map((f, i) =>
  bir(
    `kur${String(i + 1).padStart(2, '0')}`,
    f['Firma Adı'],
    f['Firma Tipi'],
    f['Atanan Temsilci'] as 'Rüya' | 'Sude',
    STAGE_SKOR[f['Pipeline Aşaması']] ?? 5,
    f['Pipeline Aşaması'],
    ulkeIl(f['Ülke']),
    `+90 212 ${String(200 + i).padStart(3, '0')} ${String(1000 + i).slice(-4)}`,
  ),
)

// Bireysel (B2C) — Kişiler
export const BIREYSEL_MUSTERILER: AirtableRecord<FirmaListeItem>[] = seedData.kisiler.map((k, i) =>
  bir(
    `bir${String(i + 1).padStart(2, '0')}`,
    k['Ad'],
    k['Persona'],
    i % 2 === 0 ? 'Rüya' : 'Sude',
    9 - (i % 6),
    B2C_STAGES[i % B2C_STAGES.length],
    ulkeIl(k['Ülke']),
    k['Telefon'],
  ),
)

// Kanban (FirmaKart şekli) — her iki segment
function toKanban(rows: AirtableRecord<FirmaListeItem>[]): AirtableRecord<FirmaKart>[] {
  return rows.map(r => ({
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
}
export const BIREYSEL_KANBAN: AirtableRecord<FirmaKart>[] = toKanban(BIREYSEL_MUSTERILER)
export const KURUMSAL_KANBAN: AirtableRecord<FirmaKart>[] = toKanban(KURUMSAL_MUSTERILER)
