// ════════════════════════════════════════════════════════════════════════════
//  Store OS — ortam değişkenleri. Tek okuma noktası.
//  process.env'e Store OS ağacında BAŞKA hiçbir yerden dokunulmaz.
// ════════════════════════════════════════════════════════════════════════════

function zorunlu(ad: string): string {
  const v = process.env[ad]
  if (!v) throw new Error(`[storeos] Zorunlu ortam değişkeni eksik: ${ad}`)
  return v
}

function istege(ad: string, varsayilan = ''): string {
  return process.env[ad] ?? varsayilan
}

export const env = {
  /** Airtable — Store OS'e AYRILMIŞ base. Emlak/sigorta base'leriyle ilgisi yok. */
  get airtableBaseId() { return zorunlu('STOREOS_AIRTABLE_BASE_ID') },
  get airtableApiKey() { return zorunlu('STOREOS_AIRTABLE_API_KEY') },

  /** Olay ingest HMAC paylaşılan sırrı (vision partneri ile ortak). */
  get ingestSecret() { return zorunlu('STOREOS_INGEST_SECRET') },

  /** n8n'den gelen WhatsApp inbound çağrısının bearer token'ı. */
  get inboundToken() { return zorunlu('STOREOS_WA_INBOUND_TOKEN') },

  /** Panel → n8n giden WhatsApp webhook'u. */
  get n8nGidenWebhook() { return zorunlu('STOREOS_N8N_WA_WEBHOOK_URL') },

  /** Aktif bildirim kanalı. Gerçek 360Dialog hattı bağlanana kadar 'konsol'. */
  get kanal(): 'whatsapp' | 'konsol' {
    return istege('STOREOS_KANAL', 'konsol') === 'whatsapp' ? 'whatsapp' : 'konsol'
  },

  /** Demo kontrol paneline erişebilen Clerk kullanıcı ID'leri (virgülle ayrık). */
  get adminClerkIds(): string[] {
    return istege('STOREOS_ADMIN_CLERK_IDS').split(',').map(s => s.trim()).filter(Boolean)
  },

  /** Store OS'in yayınlandığı prod host'u. Host izolasyon kontrolü bunu kullanır. */
  get host() { return istege('STOREOS_HOST') },

  /**
   * Demoda tek mağaza var. Panonun hangi mağazayı gösterdiği tek yerden okunur;
   * çoklu mağazaya geçişte burası kullanıcının mağaza atamasına bağlanacak.
   */
  get magazaKodu() { return istege('STOREOS_MAGAZA_KODU', '0178') },

  /**
   * Aktif depo. 'bellek' = süreç-içi (Gün 2 varsayılanı, dış bağımlılık yok).
   * 'airtable' = kalıcı. Airtable kimlik bilgileri tanımlıysa varsayılan
   * otomatik 'airtable' olur — yanlışlıkla prod'da bellek deposuna düşmemek için.
   */
  get depo(): 'bellek' | 'airtable' {
    const acik = istege('STOREOS_DEPO')
    if (acik === 'bellek' || acik === 'airtable') return acik
    const airtableHazir = !!process.env.STOREOS_AIRTABLE_BASE_ID && !!process.env.STOREOS_AIRTABLE_API_KEY
    return airtableHazir ? 'airtable' : 'bellek'
  },

  /** İmza zaman damgası toleransı (saniye). */
  get imzaToleransSn(): number {
    const n = Number(istege('STOREOS_IMZA_TOLERANS_SN', '300'))
    return Number.isFinite(n) && n > 0 ? n : 300
  },

  get prodMu() { return process.env.VERCEL_ENV === 'production' },
}

/** Eksik olan zorunlu değişkenleri listeler — /api/storeos/saglik bunu kullanır. */
export function eksikDegiskenler(): string[] {
  const gerekli = [
    'STOREOS_AIRTABLE_BASE_ID',
    'STOREOS_AIRTABLE_API_KEY',
    'STOREOS_INGEST_SECRET',
    'STOREOS_WA_INBOUND_TOKEN',
    'STOREOS_N8N_WA_WEBHOOK_URL',
  ]
  return gerekli.filter(a => !process.env[a])
}
