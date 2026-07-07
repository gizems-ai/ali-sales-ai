const AT_BASE = 'https://api.airtable.com/v0'

// ─── Field mapping ─────────────────────────────────────────────────────────────
// panelFieldName → actualAirtableFieldName
// sigortan_biz için her alan identity'dir (aynı isim).
// ali_genel için panelin beklediği isimler gerçek Airtable alan isimleriyle eşlenir.

export interface TenantFields {
  firmalar?: Record<string, string>
  aktiviteler?: Record<string, string>
}

// ─── Branding ─────────────────────────────────────────────────────────────────

export interface TenantBranding {
  logo: string        // text fallback: 'alisales.ai', 'sigortan.ai'
  logoImage?: string  // /public path: '/ali-logo.png'
}

// ─── Tenant types ─────────────────────────────────────────────────────────────

export interface TenantTemsilci {
  ad: string
  slug: string
  renk: string
  displayAd?: string  // emlak demo gibi yerlerde görünür isim override'ı
}

export interface TenantAirtable {
  baseId: string
  tables: {
    firmalar: string
    opportunities: string
    aktiviteler: string
    raporlar: string
  }
  sistemAdi: string  // bu isimle kayıtlar filtreden hariç tutulur; '' = filtre yok
}

export interface TenantSecurity {
  /** Web widget'ın gömüldüğü domainler (tam Origin, trailing slash yok).
   *  n8n tenant-validation-node.js ile senkron tutulmalı.
   *  Boş dizi = widget yok / sadece panel kullanan tenant. */
  allowedOrigins: string[]
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
  aksamBrifing: boolean  // n8n aksam brifing webhook'u çağrılsın mı
  portfoy: boolean       // dashboard'da portföy/vade kartları gösterilsin mi
  stok: boolean          // gayrimenkul stok/envanter sayfası
  segmentSwitch: boolean // Kurumsal/Bireysel segment switch'i göster
}

export interface TenantConfig {
  id: string
  name: string
  airtable: TenantAirtable
  n8nBaseUrl: string
  n8nSlug: string
  temsilciler: TenantTemsilci[]
  fields?: TenantFields    // sigortan_biz'de undefined (identity), ali_genel'de dolu
  modules: TenantModules
  branding: TenantBranding
  security: TenantSecurity
  readOnly?: boolean       // true ise tüm yazma aksiyonları (aktivite/update/kanban) bloklanır
}

// ─── Field-map yardımcıları ────────────────────────────────────────────────────

/** Panel field adını → gerçek Airtable alan adına çevirir. */
export function fieldActual(
  cfg: TenantConfig,
  table: keyof TenantFields,
  panelName: string,
): string {
  return cfg.fields?.[table]?.[panelName] ?? panelName
}

/** Airtable formülündeki {PanelField} referanslarını → {AktuelField} yapar. */
export function translateFormula(
  cfg: TenantConfig,
  table: keyof TenantFields,
  formula: string,
): string {
  const map = cfg.fields?.[table]
  if (!map) return formula
  let result = formula
  for (const [panel, actual] of Object.entries(map)) {
    result = result.split(`{${panel}}`).join(`{${actual}}`)
  }
  return result
}

/** Panel field adı dizisini → gerçek alan adlarına çevirir (fields[] parametresi için). */
export function translateFieldList(
  cfg: TenantConfig,
  table: keyof TenantFields,
  fields: string[],
): string[] {
  return fields.map(f => fieldActual(cfg, table, f))
}

/** PATCH/POST body key'lerini panel isimlerinden → gerçek isimlere çevirir. */
export function translatePatch(
  cfg: TenantConfig,
  table: keyof TenantFields,
  body: Record<string, unknown>,
): Record<string, unknown> {
  const map = cfg.fields?.[table]
  if (!map) return body
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    result[map[k] ?? k] = v
  }
  return result
}

/** Airtable yanıtındaki record.fields key'lerini → panel isimlerine çevirir (READ için). */
export function untranslateRecord<T extends Record<string, unknown>>(
  cfg: TenantConfig,
  table: keyof TenantFields,
  record: { id: string; createdTime: string; fields: T },
): { id: string; createdTime: string; fields: T } {
  const map = cfg.fields?.[table]
  if (!map) return record
  const reverse: Record<string, string> = {}
  for (const [panel, actual] of Object.entries(map)) reverse[actual] = panel
  const newFields: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(record.fields)) newFields[reverse[k] ?? k] = v
  return { ...record, fields: newFields as T }
}

// ─── Tenant tanımları ──────────────────────────────────────────────────────────

const ALL_ON: TenantModules = {
  dashboard: true, ajanda: true, firsatlar: true, satis_sureci: true,
  musteriler: true, raporlar: true, teklifler: true, policeler: true,
  yenilemeler: true, komisyonlar: true, takvim: true, gorevler: true,
  ali_asistan: true, aksamBrifing: true, portfoy: true,
  stok: false, segmentSwitch: false,
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
    // fields: undefined → identity (alan isimleri birebir aynı)
    modules: ALL_ON,
    branding: { logo: 'sigortan.ai' },
    security: {
      allowedOrigins: [
        'https://sigorta.alisales.ai',
        'https://sigortan.ai',
        'https://www.sigortan.ai',
        // staging varsa ekle: 'https://staging.sigortan.ai'
      ],
    },
  },

  ali_genel: {
    id: 'ali_genel',
    name: 'Ali CRM',
    airtable: {
      baseId: 'appk2xN2YAD7qXc2n',
      tables: {
        firmalar:      'tblh2MBu4rXYhm3Zq',
        opportunities: '',  // tablo yok
        aktiviteler:   'tbl1rtozsA2LbdKpe',
        raporlar:      '',  // tablo yok
      },
      sistemAdi: '',  // sistem filtresi yok
    },
    n8nBaseUrl: 'https://n8n.alisales.ai/webhook',
    n8nSlug: 'ali_genel',  // ajanda/brifing kapalı, kullanılmaz
    temsilciler: [
      { ad: 'Gizem', slug: 'gizem', renk: '#5B47E0' },
    ],
    fields: {
      firmalar: {
        'Firma Adı':            'Ad Soyad',
        'Pipeline Aşaması':     'Aşama',
        'Genel Telefon':        'Telefon',
        'Genel Mail':           'Email',
        'Web Sitesi':           'Websitesi',
        'Son İletişim Tarihi':  'Son İletişim1',
        'Ali Özeti':            'Notlar',
      },
      aktiviteler: {
        'Not': 'Açıklama',
      },
    },
    modules: {
      dashboard: true,
      ajanda: false,
      firsatlar: false,
      satis_sureci: true,
      musteriler: true,
      raporlar: false,
      teklifler: false,
      policeler: false,
      yenilemeler: false,
      komisyonlar: false,
      takvim: false,
      gorevler: false,
      ali_asistan: false,
      aksamBrifing: false,
      portfoy: false,
      stok: false,
      segmentSwitch: false,
    },
    branding: { logo: 'alisales.ai', logoImage: '/ali-logo.png' },
    security: {
      allowedOrigins: [
        'https://crm.alisales.ai',
      ],
    },
  },
  emlak_demo: {
    id: 'emlak_demo',
    name: 'Emlak Demo',
    readOnly: true,
    airtable: {
      // Babacan GYO — Production Tenant base (gerçek 507 envanter + 5-katman yapı).
      // Sigortan'ın canlı base'inden (appjULACncjRV48pf) TAM ayrık. Müşteri/fırsat
      // tabloları KVKK gereği boş; müşteri ekranları kod fixture'ından beslenir.
      baseId: 'appGYQQR2f6wqW0lV',
      tables: {
        firmalar:      'tbljuodDnLJ73CqTQ',
        opportunities: 'tblBSMULvR1t2Jjkq',
        aktiviteler:   'tblP6b1AudCcv8L41',
        raporlar:      'tbl5wC8sBTAPBgAd9',
      },
      sistemAdi: '',  // yeni base'de sistem-kayıt filtresi yok
    },
    n8nBaseUrl: 'https://n8n.alisales.ai/webhook',
    n8nSlug: 'emlak_demo',
    // Gerçek Airtable isimleri (ad) + görünür override (displayAd)
    // Hiçbir yerde Clerk/n8n/SB_Kullanicilar değiştirilmiyor.
    temsilciler: [
      { ad: 'Rüya', slug: 'ruya', renk: '#5B47E0', displayAd: 'Hülya' },
      { ad: 'Sude', slug: 'sude', renk: '#D67BAF', displayAd: 'Ahmet' },
    ],
    modules: {
      dashboard: true,
      ajanda: false,
      firsatlar: true,
      satis_sureci: true,
      musteriler: true,
      raporlar: true,
      teklifler: false,
      policeler: false,
      yenilemeler: false,
      komisyonlar: false,
      takvim: false,
      gorevler: false,
      ali_asistan: false,
      aksamBrifing: false,
      portfoy: false,
      stok: true,
      segmentSwitch: true,
    },
    branding: { logo: 'emlak.ai' },
    security: { allowedOrigins: [] },
  },
}

export const DEFAULT_TENANT_ID = 'sigortan_biz'

export function resolveTenant(id?: string | null): TenantConfig {
  return TENANTS[id ?? DEFAULT_TENANT_ID] ?? TENANTS[DEFAULT_TENANT_ID]
}

/** Tam Airtable tablo URL'si: https://api.airtable.com/v0/{baseId}/{tableId} */
export function atTableUrl(
  cfg: TenantConfig,
  table: keyof TenantAirtable['tables'],
): string {
  return `${AT_BASE}/${cfg.airtable.baseId}/${cfg.airtable.tables[table]}`
}

/** Preview/dev için tenant resolve eder. Prod domainleri PROD_HOST_MAP (yetki.ts) ile çözülür. */
export function tenantFromHost(host: string, previewId?: string | null): TenantConfig | null {
  if (previewId && TENANTS[previewId]) return TENANTS[previewId]
  if (host.includes('localhost') || host.startsWith('127.')) return TENANTS[DEFAULT_TENANT_ID]
  return null
}
