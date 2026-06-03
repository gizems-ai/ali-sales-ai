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
  // slug → { toplam_portfoy, hot } — n8n döner, key'ler tenant temsilci slug'ları
  temsilci: Record<string, { toplam_portfoy: number; hot: number }>
}

export async function getBrifing(cfg: TenantConfig = resolveTenant()): Promise<BrifingData | null> {
  try {
    const url = `${cfg.n8nBaseUrl}/${cfg.n8nSlug}/aksam-brifing?format=json`
    const res = await fetch(url, {
      headers: {
        Authorization: `Basic ${process.env.BRIFING_BASIC}`,
      },
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    return (await res.json()) as BrifingData
  } catch {
    return null
  }
}
