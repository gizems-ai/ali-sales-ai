import { resolveTenant, type TenantConfig } from './tenants'

const AT_BASE = 'https://api.airtable.com/v0'

function getToken() {
  const t = process.env.AIRTABLE_TOKEN
  if (!t) throw new Error('AIRTABLE_TOKEN eksik')
  return t
}

interface AirtableRecord<T = Record<string, unknown>> {
  id: string
  createdTime: string
  fields: T
}

interface AirtableResponse<T> {
  records: AirtableRecord<T>[]
  offset?: string
}

export interface FirmaKart {
  'Firma Adı'?: string
  'Sektör'?: string
  'Sıcaklık Skoru'?: number
  'Öncelik'?: string
  'Branş'?: string[]
  'Vade Ayı Grubu'?: string
  'Atanan Temsilci'?: string
}

export interface PipelineSayfa {
  records: AirtableRecord<FirmaKart>[]
  offset?: string
}

export const PIPELINE_ASAMALARI: {
  value: string
  label: string
  color: string
  muted?: boolean
}[] = [
  { value: 'Ulaşılamadı',  label: 'Ulaşılamadı',  color: '#9CA3AF' },
  { value: 'Yanıt Alındı', label: 'Yanıt Alındı', color: '#6366F1' },
  { value: 'Randevu',      label: 'Randevu',       color: '#5B47E0' },
  { value: 'Teklif',       label: 'Teklif',        color: '#8B5CF6' },
  { value: 'Müzakere',     label: 'Müzakere',      color: '#A855F7' },
  { value: 'Kazanıldı',    label: 'Kazanıldı',     color: '#22C55E' },
  { value: 'Kaybedildi',   label: 'Kaybedildi',    color: '#9CA3AF', muted: true },
]

const FIRMA_KART_FIELDS = [
  'Firma Adı',
  'Sektör',
  'Sıcaklık Skoru',
  'Öncelik',
  'Branş',
  'Vade Ayı Grubu',
  'Atanan Temsilci',
]

async function fetchPage<T>(
  tableId: string,
  params: Record<string, string | string[]>,
  revalidate = 60,
  cfg = resolveTenant(),
): Promise<AirtableResponse<T>> {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach(val => qs.append(k, val))
    else qs.set(k, v)
  }
  const url = `${AT_BASE}/${cfg.airtable.baseId}/${tableId}?${qs}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${getToken()}` },
    next: { revalidate },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Airtable ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
}

export async function fetchAllRecords<T>(
  tableId: string,
  params: Record<string, string | string[]> = {},
  revalidate = 60,
  cfg = resolveTenant(),
): Promise<AirtableRecord<T>[]> {
  const all: AirtableRecord<T>[] = []
  let offset: string | undefined

  do {
    const page = await fetchPage<T>(tableId, {
      ...params,
      pageSize: '100',
      ...(offset ? { offset } : {}),
    }, revalidate, cfg)
    all.push(...page.records)
    offset = page.offset
    if (offset) await new Promise(r => setTimeout(r, 220))
  } while (offset)

  return all
}

export async function fetchRecords<T>(
  tableId: string,
  params: Record<string, string | string[]> = {},
  revalidate = 60,
  cfg = resolveTenant(),
): Promise<AirtableRecord<T>[]> {
  const page = await fetchPage<T>(tableId, { pageSize: '100', ...params }, revalidate, cfg)
  return page.records
}

export async function getPipelineKolonu(
  asama: string,
  offset?: string,
  temsilciFilter?: string,
  cfg = resolveTenant(),
): Promise<PipelineSayfa> {
  const { sistemAdi, tables } = cfg.airtable
  const formula = temsilciFilter
    ? `AND({Pipeline Aşaması}='${asama}',{Atanan Temsilci}='${temsilciFilter}')`
    : `AND({Pipeline Aşaması}='${asama}',{Atanan Temsilci}!='${sistemAdi}')`
  const params: Record<string, string | string[]> = {
    filterByFormula: formula,
    'sort[0][field]': 'Sıcaklık Skoru',
    'sort[0][direction]': 'desc',
    pageSize: '50',
    'fields[]': FIRMA_KART_FIELDS,
    ...(offset ? { offset } : {}),
  }
  const page = await fetchPage<FirmaKart>(tables.firmalar, params, 60, cfg)
  return { records: page.records, offset: page.offset }
}

export async function getPipelineKolonuSayisi(
  asama: string,
  temsilciFilter?: string,
  cfg = resolveTenant(),
): Promise<number> {
  const { sistemAdi, tables } = cfg.airtable
  const formula = temsilciFilter
    ? `AND({Pipeline Aşaması}='${asama}',{Atanan Temsilci}='${temsilciFilter}')`
    : `AND({Pipeline Aşaması}='${asama}',{Atanan Temsilci}!='${sistemAdi}')`
  const all = await fetchAllRecords<{ 'Firma Adı'?: string }>(
    tables.firmalar,
    { filterByFormula: formula, 'fields[]': 'Firma Adı' },
    300,
    cfg,
  )
  return all.length
}

export interface Firsat {
  firsat_adi?: string
  urun?: string
  sicaklik?: string
  asama?: string
  notlar?: string
  olusturma_tarihi?: string
  firma?: string[]
  sinyal?: string[]
}

export async function getFiresatlar(cfg = resolveTenant()): Promise<AirtableRecord<Firsat>[]> {
  const records = await fetchAllRecords<Firsat>(
    cfg.airtable.tables.opportunities,
    {
      'fields[]': [
        'firsat_adi',
        'urun',
        'sicaklik',
        'asama',
        'notlar',
        'olusturma_tarihi',
      ],
    },
    300,
    cfg,
  )
  return records.sort(
    (a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
  )
}

export interface FirmaDetay {
  'Firma Adı'?: string
  'Sektör'?: string
  'Atanan Temsilci'?: string
  'Sıcaklık Skoru'?: number
  'Genel Telefon'?: string
  'Genel Mail'?: string
  'Web Sitesi'?: string
  'LinkedIn URL'?: string
  'İl / İlçe'?: string
  'Adres'?: string
  'Son İletişim Kanalı'?: string
  'Son İletişim Tarihi'?: string
  'Branş'?: string[]
  'Vade Ayı Grubu'?: string
  'Sağlık Poliçe Türü'?: string
  'Sağlık Vade Tarihi'?: string
  'Elementer Ürün'?: string
  'Elementer Vade'?: string
  'Mevcut Aracı Kurum'?: string
  'Kişi Sayısı'?: number
  'Ürün'?: string
  'Branş Onaylandı'?: boolean
  'Cross-Sell İmkânı'?: boolean
  'Global Anlaşma'?: boolean
  'Pipeline Aşaması'?: string
  'Öncelik'?: string
  'Durum'?: string
  'Bugün Aranacak'?: boolean
  '2026 Arandı mı'?: boolean
  '2026 Ulaşıldı mı'?: boolean
  'Sonra Ara Tarihi'?: string
  'Kaynak'?: string
  'Data Sahibi'?: string
  'Analiz Katmanı'?: string
  'Ali Özeti'?: string
  'Birikimli Görüşme Notları'?: string
  'Son Durum 2026'?: string
  'Kaybedilme Nedeni'?: string
  'Google Puanı'?: number
  'Google Yorum Sayısı'?: number
  'Oluşturma Tarihi'?: string
  'Son Not Tarihi'?: string
  'Veri Kaynağı'?: string
}

export interface FirmaListeItem {
  'Firma Adı'?: string
  'Sektör'?: string
  'Atanan Temsilci'?: string
  'Sıcaklık Skoru'?: number
  'Pipeline Aşaması'?: string
  'Genel Telefon'?: string
  'Genel Mail'?: string
  'Öncelik'?: string
  'Vade Ayı Grubu'?: string
  'Durum'?: string
  'Bugün Aranacak'?: boolean
  'İl / İlçe'?: string
  'Son İletişim Tarihi'?: string
  'Ali Özeti'?: string
}

export interface FirmalarSayfasi {
  records: AirtableRecord<FirmaListeItem>[]
  offset?: string
}

const FIRMA_LISTE_FIELDS = [
  'Firma Adı', 'Sektör', 'Atanan Temsilci', 'Sıcaklık Skoru',
  'Pipeline Aşaması', 'Genel Telefon', 'Genel Mail', 'Öncelik',
  'Vade Ayı Grubu', 'Durum', 'Bugün Aranacak', 'İl / İlçe',
  'Son İletişim Tarihi', 'Ali Özeti',
]

export async function getFirmalarSayfasi(
  filterByFormula: string,
  offset?: string,
  revalidate = 60,
  cfg = resolveTenant(),
): Promise<FirmalarSayfasi> {
  const params: Record<string, string | string[]> = {
    filterByFormula,
    'sort[0][field]': 'Sıcaklık Skoru',
    'sort[0][direction]': 'desc',
    pageSize: '50',
    'fields[]': FIRMA_LISTE_FIELDS,
    ...(offset ? { offset } : {}),
  }
  const page = await fetchPage<FirmaListeItem>(cfg.airtable.tables.firmalar, params, revalidate, cfg)
  return { records: page.records, offset: page.offset }
}

export type { AirtableRecord }

export interface DashboardCounts {
  sessizlesenler: number
  crossSellUygun: number
  yenilemeriski: number
  teklifSessiz: number
  bugunAranacak: number
  yanitBekleyen: number
}

export async function getDashboardCounts(
  temsilciFilter?: string,
  cfg = resolveTenant(),
): Promise<DashboardCounts> {
  const { sistemAdi, tables } = cfg.airtable
  const zero: DashboardCounts = {
    sessizlesenler: 0, crossSellUygun: 0, yenilemeriski: 0,
    teklifSessiz: 0, bugunAranacak: 0, yanitBekleyen: 0,
  }
  try {
    const today = new Date()
    const toISO = (d: Date) => d.toISOString().slice(0, 10)
    const daysAgo = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return toISO(d) }
    const daysAhead = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return toISO(d) }
    const baseFormula = temsilciFilter
      ? `{Atanan Temsilci}='${temsilciFilter}'`
      : `{Atanan Temsilci}!='${sistemAdi}'`
    const formulas: Record<keyof DashboardCounts, string> = {
      sessizlesenler: `AND(${baseFormula},OR({Pipeline Aşaması}='Yanıt Alındı',{Pipeline Aşaması}='Randevu',{Pipeline Aşaması}='Teklif',{Pipeline Aşaması}='Müzakere'),NOT({Son İletişim Tarihi}=''),{Son İletişim Tarihi}<'${daysAgo(30)}')`,
      crossSellUygun: `AND(${baseFormula},{Cross-Sell İmkânı}=TRUE())`,
      yenilemeriski:  `AND(${baseFormula},NOT({Sağlık Vade Tarihi}=''),{Sağlık Vade Tarihi}>='${toISO(today)}',{Sağlık Vade Tarihi}<='${daysAhead(30)}',{Sıcaklık Skoru}<5)`,
      teklifSessiz:   `AND(${baseFormula},{Pipeline Aşaması}='Teklif',NOT({Son İletişim Tarihi}=''),{Son İletişim Tarihi}<'${daysAgo(14)}')`,
      bugunAranacak:  `AND(${baseFormula},{Bugün Aranacak}=TRUE())`,
      yanitBekleyen:  `AND(${baseFormula},{Pipeline Aşaması}='Yanıt Alındı')`,
    }
    const entries = await Promise.all(
      (Object.keys(formulas) as (keyof DashboardCounts)[]).map(async (key) => {
        const records = await fetchRecords<{ 'Firma Adı'?: string }>(
          tables.firmalar,
          { filterByFormula: formulas[key], 'fields[]': 'Firma Adı', maxRecords: '100' },
          300,
          cfg,
        )
        return [key, records.length] as const
      })
    )
    const result = { ...zero }
    for (const [key, count] of entries) result[key] = count
    return result
  } catch {
    return zero
  }
}
