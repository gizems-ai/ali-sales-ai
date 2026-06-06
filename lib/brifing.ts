import { resolveTenant, type TenantConfig } from './tenants'

export interface BrifingData {
  tarih: string
  firma_toplam: number
  arama_bugun: {
    toplam: number
    ruya: { arama: number; ulasilan: number }
    sude: { arama: number; ulasilan: number }
  }
  pipeline: Record<string, number>
  sicak_firsatlar: number
  sicak_dokunulmayan: Array<{ firma: string; skor: number; temsilci: string }>
  yanit_bekleyen: number
  brans_dagilimi: { saglik: number; elementer: number; acibadem: number }
  vade_takvimi: {
    bu_ay:   { sayi: number; hot: number; ay: string } & Record<string, number | string>
    vade_30: { sayi: number; hot: number } & Record<string, number>
    vade_60: { sayi: number; hot: number } & Record<string, number>
    vade_90: { sayi: number; hot: number } & Record<string, number>
  }
  temsilci: Record<string, { toplam_portfoy: number; hot: number }>
}

export async function getBrifing(cfg: TenantConfig = resolveTenant()): Promise<BrifingData | null> {
  if (!cfg.modules.aksamBrifing) return null
  const tableId = cfg.airtable.tables.raporlar
  if (!tableId) return null
  const token = process.env.AIRTABLE_TOKEN
  if (!token) return null
  try {
    const qs = new URLSearchParams({
      filterByFormula: "{Tip}='Brifing JSON'",
      'sort[0][field]': 'Tarih',
      'sort[0][direction]': 'desc',
      maxRecords: '1',
    })
    qs.append('fields[]', 'HTML İçerik')
    qs.append('fields[]', 'Tarih')
    const url = `https://api.airtable.com/v0/${cfg.airtable.baseId}/${tableId}?${qs}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const record = data.records?.[0]
    if (!record) return null
    const jsonStr: unknown = record.fields?.['HTML İçerik']
    if (!jsonStr || typeof jsonStr !== 'string') return null
    return JSON.parse(jsonStr) as BrifingData
  } catch {
    return null
  }
}
