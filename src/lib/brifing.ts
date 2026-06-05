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

// Ham fetch — önbelleksiz, unstable_cache içinde çağrılır
async function fetchBrifingRaw(
  n8nBaseUrl: string,
  n8nSlug: string,
  brifingBasic: string,
): Promise<BrifingData | null> {
  try {
    const url = `${n8nBaseUrl}/${n8nSlug}/aksam-brifing?format=json`
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${brifingBasic}` },
      cache: 'no-store', // unstable_cache yönetiyor
    })
    if (!res.ok) return null
    return (await res.json()) as BrifingData
  } catch {
    return null
  }
}

// 5 dakika önbellek — force-dynamic sayfalarını aşar
const fetchBrifingCached = unstable_cache(
  fetchBrifingRaw,
  ['aksam-brifing'],
  { revalidate: 300 },
)

export async function getBrifing(cfg: TenantConfig = resolveTenant()): Promise<BrifingData | null> {
  if (!cfg.modules.aksamBrifing) return null
  const basic = process.env.BRIFING_BASIC ?? ''
  return fetchBrifingCached(cfg.n8nBaseUrl, cfg.n8nSlug, basic)
}
