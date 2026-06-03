const AT_BASE = 'https://api.airtable.com/v0'

export interface TenantTemsilci {
  ad: string     // Airtable'daki değer: 'Rüya'
  slug: string   // n8n / URL param: 'ruya'
  renk: string   // hex
}

export interface TenantAirtable {
  baseId: string
  tables: {
    firmalar: string
    opportunities: string
    aktiviteler: string
    raporlar: string
  }
  sistemAdi: string // bu isimli kayıtlar filtreden hariç tutulur
}

export interface TenantModules {
  dashboard: boolean
  ajanda: boolean
  firsatlar: boolean
  satis_sureci: boolean
  musteriler: boolean
  raporlar: boolean
  teklifler: boolean
  policeler: boolean
  yenilemeler: boolean
  komisyonlar: boolean
  takvim: boolean
  gorevler: boolean
  ali_asistan: boolean
}

export interface TenantConfig {
  id: string
  name: string
  airtable: TenantAirtable
  n8nBaseUrl: string  // https://n8n.alisales.ai/webhook
  n8nSlug: string     // sigortambiz
  temsilciler: TenantTemsilci[]
  modules: TenantModules
}

const ALL_ON: TenantModules = {
  dashboard: true, ajanda: true, firsatlar: true, satis_sureci: true,
  musteriler: true, raporlar: true, teklifler: true, policeler: true,
  yenilemeler: true, komisyonlar: true, takvim: true, gorevler: true,
  ali_asistan: true,
}

export const TENANTS: Record<string, TenantConfig> = {
  sigortan_biz: {
    id: 'sigortan_biz',
    name: 'Sigortan.biz',
    airtable: {
      baseId: 'appjULACncjRV48pf',
      tables: {
        firmalar:      'tblHy9njVwfkmNSMP',
        opportunities: 'tblBdnZ4dDUGroLpC',
        aktiviteler:   'tbl0ISTyEy8nvZBbn',
        raporlar:      'tblXFizKL2iTqY6Fr',
      },
      sistemAdi: 'SIGORTAN BIZ',
    },
    n8nBaseUrl: 'https://n8n.alisales.ai/webhook',
    n8nSlug: 'sigortambiz',
    temsilciler: [
      { ad: 'Rüya', slug: 'ruya', renk: '#5B47E0' },
      { ad: 'Sude', slug: 'sude', renk: '#D67BAF' },
    ],
    modules: ALL_ON,
  },
}

export const DEFAULT_TENANT_ID = 'sigortan_biz'

export function resolveTenant(id?: string | null): TenantConfig {
  return TENANTS[id ?? DEFAULT_TENANT_ID] ?? TENANTS[DEFAULT_TENANT_ID]
}

/** Tam Airtable tablo URL'si döner: https://api.airtable.com/v0/{baseId}/{tableId} */
export function atTableUrl(
  cfg: TenantConfig,
  table: keyof TenantAirtable['tables'],
): string {
  return `${AT_BASE}/${cfg.airtable.baseId}/${cfg.airtable.tables[table]}`
}
