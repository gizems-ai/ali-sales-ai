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

/**
 * Demo telefon kilidini kapatan TEK kabul edilen değer. Bilerek uzun ve
 * bilerek ne yaptığını söylüyor; `.env`'de bunu gören biri sonucunu bilir.
 */
export const KILIT_KAPATMA_SOZU = 'kapali-gercek-alicilara-gonder'

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

  /**
   * Aynı değişkenin FIRLATMAYAN okuması. Kanal kurucusu bunu kullanır:
   * yapılandırma eksikliği gönderimi başarısız yapmalı, olay alımını değil.
   */
  get n8nGidenWebhookVarsa() { return istege('STOREOS_N8N_WA_WEBHOOK_URL') },

  /**
   * Panel → n8n paylaşılan sırrı. n8n webhook'u genel internete açıktır;
   * bu token olmadan orası "herkesin WhatsApp gönderebildiği bir uç" olurdu.
   * Boşsa header gönderilmez ve n8n 401 döner — sessizce açık kalmaz.
   */
  get n8nGidenToken() { return istege('STOREOS_N8N_WA_TOKEN').trim() },

  /**
   * Eskalasyon kontrolünü makineden (cron) tetiklemek için token.
   * ZORUNLU DEĞİL: tanımlı değilse makine yolu KAPALIDIR ve uç nokta yalnız
   * Clerk oturumuyla çağrılabilir. "Tanımsızsa herkese açık" davranışı
   * bilinçli olarak yok.
   */
  get cronToken() { return istege('STOREOS_CRON_TOKEN') },

  /**
   * DEMO TELEFON KİLİDİ — güvenlik kapısı, bağlantı kolaylığı değil.
   *
   * Kilit AÇIKKEN dışarı çıkan her mesajın hedef numarası bu numarayla
   * değiştirilir. Amaç: `Kullanicilar` tablosuna gerçek numaralar girildiği
   * gün, demo/prova sırasında hiçbir mesajın yanlışlıkla gerçek bir Gratis
   * çalışanına gitmemesi.
   *
   * VARSAYILAN AÇIK. Kapatmak için `STOREOS_TELEFON_KILIDI` değişkeninin
   * TAM OLARAK aşağıdaki cümleye eşit olması gerekir — 'false'/'0'/'kapali'
   * kabul edilmez. Yanlışlıkla yazılamayacak kadar uzun olması bilinçli:
   * kilidi kapatmak bir karardır, bir yazım hatası değil.
   */
  get demoTelefon() { return istege('STOREOS_DEMO_TELEFON').trim() },
  get telefonKilidiAcik(): boolean {
    return istege('STOREOS_TELEFON_KILIDI').trim() !== KILIT_KAPATMA_SOZU
  },

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
