import { type AirtableRecord, type FirmaListeItem, type FirmaKart } from './airtable'

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

export const STOK_LISTESI: StokItem[] = [
  { id: 's1',  proje: 'Mavi Konutlar',   blok: 'A', kat: 3,  daire: 'A-304', metrekare: 110, fiyat: 4_850_000, durum: 'Müsait',    il: 'İstanbul / Başakşehir' },
  { id: 's2',  proje: 'Mavi Konutlar',   blok: 'A', kat: 5,  daire: 'A-502', metrekare: 135, fiyat: 5_900_000, durum: 'Opsiyonlu', il: 'İstanbul / Başakşehir' },
  { id: 's3',  proje: 'Mavi Konutlar',   blok: 'B', kat: 2,  daire: 'B-201', metrekare: 90,  fiyat: 3_650_000, durum: 'Satıldı',   il: 'İstanbul / Başakşehir' },
  { id: 's4',  proje: 'Yeşilvadi Evleri',blok: 'C', kat: 1,  daire: 'C-102', metrekare: 75,  fiyat: 2_800_000, durum: 'Müsait',    il: 'Ankara / Çankaya' },
  { id: 's5',  proje: 'Yeşilvadi Evleri',blok: 'C', kat: 4,  daire: 'C-405', metrekare: 120, fiyat: 4_100_000, durum: 'Müsait',    il: 'Ankara / Çankaya' },
  { id: 's6',  proje: 'Yeşilvadi Evleri',blok: 'D', kat: 6,  daire: 'D-603', metrekare: 150, fiyat: 5_200_000, durum: 'Opsiyonlu', il: 'Ankara / Çankaya' },
  { id: 's7',  proje: 'Liman Residence', blok: 'E', kat: 8,  daire: 'E-801', metrekare: 180, fiyat: 8_400_000, durum: 'Müsait',    il: 'İzmir / Alsancak' },
  { id: 's8',  proje: 'Liman Residence', blok: 'E', kat: 10, daire: 'E-1002',metrekare: 210, fiyat: 11_200_000,durum: 'Satıldı',   il: 'İzmir / Alsancak' },
  { id: 's9',  proje: 'Güneş Park',      blok: 'F', kat: 2,  daire: 'F-204', metrekare: 95,  fiyat: 3_100_000, durum: 'Müsait',    il: 'Bursa / Nilüfer' },
  { id: 's10', proje: 'Güneş Park',      blok: 'F', kat: 3,  daire: 'F-307', metrekare: 115, fiyat: 3_750_000, durum: 'Opsiyonlu', il: 'Bursa / Nilüfer' },
  { id: 's11', proje: 'Palmiye Sitesi',  blok: 'G', kat: 1,  daire: 'G-101', metrekare: 68,  fiyat: 2_200_000, durum: 'Müsait',    il: 'Antalya / Konyaaltı' },
  { id: 's12', proje: 'Palmiye Sitesi',  blok: 'G', kat: 4,  daire: 'G-412', metrekare: 130, fiyat: 4_600_000, durum: 'Satıldı',   il: 'Antalya / Konyaaltı' },
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
