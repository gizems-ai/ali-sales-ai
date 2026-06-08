/**
 * TENANT VALIDATION — LOG-ONLY (Faz 1)
 *
 * Bu node Webhook → Get Tenant Config arasına girer.
 * Faz 1: Geçersiz istekler LOGLANIR ama bloklanmaz.
 * Faz 2 (geçişte): LOG_ONLY = false → geçersiz istek durdurulur.
 *
 * Workflow'lar: GTOFjZkTVVTEU2L9 (Ali Chatbot v2 Multi-tenant)
 *              50sSMwjHzon1TdRU  (360Dialog WhatsApp Echo Bot)
 *
 * Deployment adımları:
 *   1. Canlı workflow'u KLONLA (n8n UI: üç nokta → Duplicate)
 *   2. Klona bu node'u ekle, bağlantıyı güncelle (Webhook → TenantValidation → GetTenantConfig)
 *   3. Klonu aktifleştir, canlıyı kapat (aynı webhook path'i kullanmaz!)
 *      NOT: Önce path'i değiştir (ör. chatbot-v2-test), 360Dialog'u geçici olarak yönlendir.
 *   4. Gerçek WA mesajıyla test et → logda VALID görünmeli
 *   5. Sahte POST at: curl -X POST https://n8n.alisales.ai/webhook/chatbot-v2-test
 *        -H "Content-Type: application/json"
 *        -d '{"tenant_id":"__HACKER__","from":"905001234567","message":"test"}'
 *      → logda INVALID_TENANT_ID görünmeli, mesaj yine de geçmeli (LOG-ONLY)
 *   6. Onaylandıktan sonra LOG_ONLY = false yap, tekrar test et → sahte bloklanmalı
 *   7. Klonu canlı path'e taşı, orijinali devreden çıkar.
 */

// ─── Konfigürasyon ─────────────────────────────────────────────────────────────

const LOG_ONLY = true; // false = ENFORCE modu: geçersiz tenant bloklar

/**
 * Master base'deki Tenants tablosundaki page_id değerleri.
 * Yeni tenant onboard edilince buraya + Airtable'a ekle.
 */
const VALID_TENANT_IDS = new Set([
  'sigortan_biz',
  'ali_genel',
  'fiscus_ai',
  'lbc_network',
  'turkey_health',
  // buraya ekle: 'yeni_tenant_id'
]);

// ─── Validation ────────────────────────────────────────────────────────────────

const item = $input.first();
const body = item.json.body ?? {};
const reqHeaders = item.json.headers ?? {};

const tenant_id  = String(body.tenant_id ?? '').trim();
const origin     = reqHeaders['origin'] ?? reqHeaders['referer'] ?? 'unknown';
const remoteIp   = reqHeaders['x-forwarded-for'] ?? reqHeaders['x-real-ip'] ?? 'unknown';
const now        = new Date().toISOString();

const isValid = tenant_id.length > 0 && VALID_TENANT_IDS.has(tenant_id);

if (!isValid) {
  const logEntry = {
    level:    'SECURITY',
    event:    'INVALID_TENANT_ID',
    received: tenant_id || '(boş)',
    origin,
    ip:       remoteIp,
    ts:       now,
    mode:     LOG_ONLY ? 'LOG_ONLY' : 'ENFORCE',
  };
  console.error('[TenantValidation]', JSON.stringify(logEntry));

  if (!LOG_ONLY) {
    // ENFORCE modu: workflow'u durdur, 403 dön (Webhook Response node'u olmalı)
    // Bu throw'u aktifleştirmek için LOG_ONLY = false yap.
    throw new Error(`[SECURITY] Geçersiz tenant_id: "${tenant_id}" | ip: ${remoteIp}`);
  }
} else {
  // Geçerli istek — isteğe bağlı debug log
  // console.log('[TenantValidation] VALID:', tenant_id, origin);
}

// Her durumda downstream'e geç (LOG_ONLY=true iken geçersiz de geçer)
return $input.all();
