import {
  resolveTenant, type TenantConfig,
  fieldActual, translateFormula, translateFieldList, untranslateRecord,
} from './tenants'

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
  value: string; label: string; color: string; muted?: boolean
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
  'Firma Adı', 'Sektör', 'Sıcaklık Skoru', 'Öncelik',
  'Branş', 'Vade Ayı Grubu', 'Atanan Temsilci',
]

const FIRMA_LISTE_FIELDS = [
  'Firma Adı', 'Sektör', 'Atanan Temsilci', 'Sıcaklık Skoru',
  'Pipeline Aşaması', 'Genel Telefon', 'Genel Mail', 'Öncelik',
  'Vade Ayı Grubu', 'Durum', 'Bugün Aranacak', 'İl / İlçe',
  'Son İletişim Tarihi', 'Ali Özeti', 'Branş',
  'Sağlık Vade Tarihi', 'Sağlık Poliçe Türü',
  'Elementer Ürün', 'Elementer Vade', 'Sonra Ara Tarihi',
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
    const page = await fetchPage<T>(tableId, { ...params, pageSize: '100', ...(offset ? { offset } : {}) }, revalidate, cfg)
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

// ─── Pipeline (Kanban) ────────────────────────────────────────────────────────

export async function getPipelineKolonu(
  asama: string,
  offset?: string,
  temsilciFilter?: string,
  cfg = resolveTenant(),
): Promise<PipelineSayfa> {
  const { sistemAdi, tables } = cfg.airtable
  const pipelineField = fieldActual(cfg, 'firmalar', 'Pipeline Aşaması')
  const atananField   = fieldActual(cfg, 'firmalar', 'Atanan Temsilci')

  const formula = temsilciFilter
    ? `AND({${pipelineField}}='${asama}',{${atananField}}='${temsilciFilter}')`
    : sistemAdi
      ? `AND({${pipelineField}}='${asama}',{${atananField}}!='${sistemAdi}')`
      : `{${pipelineField}}='${asama}'`

  const actualFields = translateFieldList(cfg, 'firmalar', FIRMA_KART_FIELDS)
  const params: Record<string, string | string[]> = {
    filterByFormula: formula,
    'sort[0][field]': fieldActual(cfg, 'firmalar', 'Sıcaklık Skoru'),
    'sort[0][direction]': 'desc',
    pageSize: '50',
    'fields[]': actualFields,
    ...(offset ? { offset } : {}),
  }
  const page = await fetchPage<FirmaKart>(tables.firmalar, params, 60, cfg)
  const records = page.records.map(r =>
    untranslateRecord(cfg, 'firmalar', r as unknown as { id: string; createdTime: string; fields: Record<string, unknown> }) as AirtableRecord<FirmaKart>
  )
  return { records, offset: page.offset }
}

export async function getPipelineKolonuSayisi(
  asama: string,
  temsilciFilter?: string,
  cfg = resolveTenant(),
): Promise<number> {
  const { sistemAdi, tables } = cfg.airtable
  const pipelineField = fieldActual(cfg, 'firmalar', 'Pipeline Aşaması')
  const atananField   = fieldActual(cfg, 'firmalar', 'Atanan Temsilci')
  const firmaAdiField = fieldActual(cfg, 'firmalar', 'Firma Adı')

  const formula = temsilciFilter
    ? `AND({${pipelineField}}='${asama}',{${atananField}}='${temsilciFilter}')`
    : sistemAdi
      ? `AND({${pipelineField}}='${asama}',{${atananField}}!='${sistemAdi}')`
      : `{${pipelineField}}='${asama}'`

  const all = await fetchAllRecords<Record<string, unknown>>(
    tables.firmalar,
    { filterByFormula: formula, 'fields[]': firmaAdiField },
    300, cfg,
  )
  return all.length
}

// ─── Fırsatlar ────────────────────────────────────────────────────────────────

export interface Firsat {
  firsat_adi?: string; urun?: string; sicaklik?: string
  asama?: string; notlar?: string; olusturma_tarihi?: string
  firma?: string[]; sinyal?: string[]
}

export async function getFiresatlar(cfg = resolveTenant()): Promise<AirtableRecord<Firsat>[]> {
  if (!cfg.airtable.tables.opportunities) return []
  const records = await fetchAllRecords<Firsat>(
    cfg.airtable.tables.opportunities,
    { 'fields[]': ['firsat_adi','urun','sicaklik','asama','notlar','olusturma_tarihi'] },
    300, cfg,
  )
  return records.sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime())
}

// ─── Firma detay / liste ──────────────────────────────────────────────────────

export interface FirmaDetay {
  'Firma Adı'?: string; 'Sektör'?: string; 'Atanan Temsilci'?: string
  'Sıcaklık Skoru'?: number; 'Genel Telefon'?: string; 'Genel Mail'?: string
  'Web Sitesi'?: string; 'LinkedIn URL'?: string; 'İl / İlçe'?: string
  'Adres'?: string; 'Son İletişim Kanalı'?: string; 'Son İletişim Tarihi'?: string
  'Branş'?: string[]; 'Vade Ayı Grubu'?: string; 'Sağlık Poliçe Türü'?: string
  'Sağlık Vade Tarihi'?: string; 'Elementer Ürün'?: string; 'Elementer Vade'?: string
  'Mevcut Aracı Kurum'?: string; 'Kişi Sayısı'?: number; 'Ürün'?: string
  'Branş Onaylandı'?: boolean; 'Cross-Sell İmkânı'?: boolean; 'Global Anlaşma'?: boolean
  'Pipeline Aşaması'?: string; 'Öncelik'?: string; 'Durum'?: string
  'Bugün Aranacak'?: boolean; '2026 Arandı mı'?: boolean; '2026 Ulaşıldı mı'?: boolean
  'Sonra Ara Tarihi'?: string; 'Kaynak'?: string; 'Data Sahibi'?: string
  'Analiz Katmanı'?: string; 'Ali Özeti'?: string; 'Birikimli Görüşme Notları'?: string
  'Son Durum 2026'?: string; 'Kaybedilme Nedeni'?: string; 'Google Puanı'?: number
  'Google Yorum Sayısı'?: number; 'Oluşturma Tarihi'?: string; 'Son Not Tarihi'?: string
  'Veri Kaynağı'?: string
}

export interface FirmaListeItem {
  'Firma Adı'?: string; 'Sektör'?: string; 'Atanan Temsilci'?: string
  'Sıcaklık Skoru'?: number; 'Pipeline Aşaması'?: string; 'Genel Telefon'?: string
  'Genel Mail'?: string; 'Öncelik'?: string; 'Vade Ayı Grubu'?: string
  'Durum'?: string; 'Bugün Aranacak'?: boolean; 'İl / İlçe'?: string
  'Son İletişim Tarihi'?: string; 'Ali Özeti'?: string; 'Branş'?: string[]
  'Sağlık Vade Tarihi'?: string; 'Sağlık Poliçe Türü'?: string
  'Elementer Ürün'?: string; 'Elementer Vade'?: string; 'Sonra Ara Tarihi'?: string
}

export interface FirmalarSayfasi {
  records: AirtableRecord<FirmaListeItem>[]
  offset?: string
}

export async function getFirmalarSayfasi(
  filterByFormula: string,
  offset?: string,
  revalidate = 60,
  cfg = resolveTenant(),
): Promise<FirmalarSayfasi> {
  const actualFields = translateFieldList(cfg, 'firmalar', FIRMA_LISTE_FIELDS)
  const params: Record<string, string | string[]> = {
    filterByFormula,
    'sort[0][field]': fieldActual(cfg, 'firmalar', 'Sıcaklık Skoru'),
    'sort[0][direction]': 'desc',
    pageSize: '50',
    'fields[]': actualFields,
    ...(offset ? { offset } : {}),
  }
  const page = await fetchPage<FirmaListeItem>(cfg.airtable.tables.firmalar, params, revalidate, cfg)
  const records = page.records.map(r =>
    untranslateRecord(cfg, 'firmalar', r as unknown as { id: string; createdTime: string; fields: Record<string, unknown> }) as AirtableRecord<FirmaListeItem>
  )
  return { records, offset: page.offset }
}

export type { AirtableRecord }

// ─── Dashboard counts ─────────────────────────────────────────────────────────

export interface DashboardCounts {
  sessizlesenler: number; crossSellUygun: number; yenilemeriski: number
  teklifSessiz: number; bugunAranacak: number; yanitBekleyen: number
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
    const daysAgo = (n: number) => { const d = new Date(today); d.setDate(d.getDate()-n); return toISO(d) }
    const daysAhead = (n: number) => { const d = new Date(today); d.setDate(d.getDate()+n); return toISO(d) }

    const atanan   = fieldActual(cfg, 'firmalar', 'Atanan Temsilci')
    const pipeline = fieldActual(cfg, 'firmalar', 'Pipeline Aşaması')
    const sonIlet  = fieldActual(cfg, 'firmalar', 'Son İletişim Tarihi')
    const bugunAr  = fieldActual(cfg, 'firmalar', 'Bugün Aranacak')

    const baseFormula = temsilciFilter
      ? `{${atanan}}='${temsilciFilter}'`
      : sistemAdi
        ? `{${atanan}}!='${sistemAdi}'`
        : 'TRUE()'

    const formulas: Record<keyof DashboardCounts, string> = {
      sessizlesenler: `AND(${baseFormula},OR({${pipeline}}='Yanıt Alındı',{${pipeline}}='Randevu',{${pipeline}}='Teklif',{${pipeline}}='Müzakere'),NOT({${sonIlet}}=''),{${sonIlet}}<'${daysAgo(30)}')`,
      crossSellUygun: `AND(${baseFormula},{Cross-Sell İmkânı}=TRUE())`,
      yenilemeriski:  `AND(${baseFormula},NOT({Sağlık Vade Tarihi}=''),{Sağlık Vade Tarihi}>='${toISO(today)}',{Sağlık Vade Tarihi}<='${daysAhead(30)}',{Sıcaklık Skoru}<5)`,
      teklifSessiz:   `AND(${baseFormula},{${pipeline}}='Teklif',NOT({${sonIlet}}=''),{${sonIlet}}<'${daysAgo(14)}')`,
      bugunAranacak:  `AND(${baseFormula},{${bugunAr}}=TRUE())`,
      yanitBekleyen:  `AND(${baseFormula},{${pipeline}}='Yanıt Alındı')`,
    }
    const entries = await Promise.all(
      (Object.keys(formulas) as (keyof DashboardCounts)[]).map(async key => {
        const records = await fetchRecords<Record<string, unknown>>(
          tables.firmalar,
          { filterByFormula: formulas[key], 'fields[]': atanan, maxRecords: '100' },
          300, cfg,
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
