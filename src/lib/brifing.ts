import { unstable_cache } from 'next/cache'
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

// ─── Airtable'dan oku (hızlı yol) ────────────────────────────────────────────

async function fetchBrifingFromAirtable(
  baseId: string,
  raporlarTableId: string,
  token: string,
): Promise<BrifingData | null> {
  try {
    const filter = encodeURIComponent("{Tip}='Brifing JSON'")
    const url = `https://api.airtable.com/v0/${baseId}/${raporlarTableId}?filterByFormula=${filter}&sort%5B0%5D%5Bfield%5D=Tarih&sort%5B0%5D%5Bdirection%5D=desc&maxRecords=1&fields%5B%5D=HTML%20%C4%B0%C3%A7erik&fields%5B%5D=Tarih`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    const record = data.records?.[0]
    if (!record) return null

    const jsonStr = record.fields['HTML İçerik']
    if (!jsonStr) return null

    const parsed = JSON.parse(jsonStr) as BrifingData

    // Kayıt çok eskiyse (>48 saat) atla → webhook'tan taze al
    const tarih = parsed.tarih ?? record.fields['Tarih']
    if (tarih) {
      const yasin = Date.now() - new Date(tarih).getTime()
      if (yasin > 48 * 60 * 60 * 1000) return null
    }

    return parsed
  } catch {
    return null
  }
}

// ─── n8n webhook'tan hesapla (yavaş yol, fallback) ───────────────────────────

async function fetchBrifingFromN8n(
  n8nBaseUrl: string,
  n8nSlug: string,
  brifingBasic: string,
): Promise<BrifingData | null> {
  try {
    const url = `${n8nBaseUrl}/${n8nSlug}/aksam-brifing?format=json`
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${brifingBasic}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return (await res.json()) as BrifingData
  } catch {
    return null
  }
}

// ─── Birleşik fonksiyon: önce Airtable, sonra n8n ────────────────────────────

async function fetchBrifingCombined(
  n8nBaseUrl: string,
  n8nSlug: string,
  brifingBasic: string,
  airtableToken: string,
  baseId: string,
  raporlarTableId: string,
): Promise<BrifingData | null> {
  // 1. Önce Airtable'dan oku (milisaniye)
  const fromAirtable = await fetchBrifingFromAirtable(baseId, raporlarTableId, airtableToken)
  if (fromAirtable) return fromAirtable

  // 2. Yoksa veya eskiyse n8n'den hesapla (22s — webhook aynı zamanda Airtable'a kaydeder)
  return fetchBrifingFromN8n(n8nBaseUrl, n8nSlug, brifingBasic)
}

// ─── 60 saniye unstable_cache ─────────────────────────────────────────────────
// force-dynamic sayfalarını aşar, Vercel Data Cache'e bağlanır

const fetchBrifingCached = unstable_cache(
  fetchBrifingCombined,
  ['brifing-v2'],
  { revalidate: 60 },
)

export async function getBrifing(cfg: TenantConfig = resolveTenant()): Promise<BrifingData | null> {
  if (!cfg.modules.aksamBrifing) return null
  return fetchBrifingCached(
    cfg.n8nBaseUrl,
    cfg.n8nSlug,
    process.env.BRIFING_BASIC ?? '',
    process.env.AIRTABLE_TOKEN ?? '',
    cfg.airtable.baseId,
    cfg.airtable.tables.raporlar ?? '',
  )
}
