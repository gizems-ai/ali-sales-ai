/**
 * TENANT & ORIGIN VALIDATION v3 — Web Widget (GTOFjZkTVVTEU2L9)
 * Konum: Webhook → [bu node] → Validation Geçti mi? (IF) → Get Tenant Config
 *                                                         ↓ false
 *                                                       Reject 403 (respondToWebhook)
 *
 * ─── RATE LIMIT STORAGE NOTU ──────────────────────────────────────────────────
 * $getWorkflowStaticData('global') = n8n veritabanına yazılır (SQLite/Postgres).
 * JavaScript in-memory DEĞİL — execution'lar arası ve container restart'ta kalıcı.
 * Kaynak: n8n docs "Static data" → "persisted to the database after each execution".
 * Tek risk: aynı anda 2 execution yarış durumu (tek worker kurulumda önemsiz).
 *
 * ─── ENFORCE GEÇİŞ PROTOKOLÜ ──────────────────────────────────────────────────
 * 1. Klon workflow'da bu node + n8n-403-gateway.json'daki IF + Reject 403'ü ekle
 *    (bağlantı: bu node çıkışı → IF girişi)
 * 2. LOG_ONLY = true → klon aktif et.
 *    SOAK TESTİ: 5dk curl yeterli değil. GERÇEK müşteri trafiğini bekle.
 *    Minimum: birkaç saat veya bir iş günü boyunca sigortan.ai widget'tan GERÇEK mesaj gelmeli.
 *    → logda "INVALID_ORIGIN" veya "MISSING_ORIGIN" SIFIR görülünce enforce et.
 *    (sigortan.ai gerçekten widget'in gömülü olduğu origin mi? log bunu kanıtlayacak.)
 * 3. Soak onaylandıktan sonra LOG_ONLY = false yap → curl evil.com → 403, gerçek widget → OK.
 * 4. Orijinal workflow'u DEAKTİF bırak, SİLME — enforce sonrası rollback için şart.
 *    Flip'i düşük trafik saatinde (gece) yap, ertesi sabah logu kontrol et.
 *    Rollback: klonu kapat, orijinali aç — 1 dakika.
 *
 * ─── TEST KOMUTLARI ───────────────────────────────────────────────────────────
 * # Geçersiz origin (INVALID_ORIGIN loglanmalı; enforce'da 403 dönmeli)
 * curl -X POST https://n8n.alisales.ai/webhook/chatbot-v2-test \
 *   -H "Content-Type: application/json" \
 *   -H "Origin: https://evil.com" \
 *   -d '{"tenant_id":"sigortan_biz","from":"905001234567","message":"test"}'
 *
 * # Origin yok (MISSING_ORIGIN)
 * curl -X POST https://n8n.alisales.ai/webhook/chatbot-v2-test \
 *   -H "Content-Type: application/json" \
 *   -d '{"tenant_id":"sigortan_biz","from":"905001234567","message":"test"}'
 *
 * # Geçerli istek (VALID — akış devam etmeli)
 * curl -X POST https://n8n.alisales.ai/webhook/chatbot-v2-test \
 *   -H "Content-Type: application/json" \
 *   -H "Origin: https://sigortan.ai" \
 *   -d '{"tenant_id":"sigortan_biz","from":"905001234567","message":"test"}'
 */

// ─── ENFORCE TOGGLE ────────────────────────────────────────────────────────────
// true  = LOG_ONLY:  ihlaller loglanır, istek geçer (__v_ok daima true).
// false = ENFORCE:   ihlaller 403'e yönlenir (__v_ok=false → IF → Reject 403).
// IF + Reject 403 node'ları EKLENIP test edilmeden false YAPMA.
const LOG_ONLY = true;

// ─── TENANT KONFİGÜRASYONU ─────────────────────────────────────────────────────
// allowedOrigins = widget'ın POST ettiği sayfanın Origin header değeri.
// Tam eşleşme — trailing slash YOK, scheme dahil.
// tenants.ts → TenantConfig.security.allowedOrigins ile senkron tut.
const TENANT_CONFIGS = {
  sigortan_biz: {
    allowedOrigins: [
      'https://sigorta.alisales.ai',  // CRM panel (widget buradan çağrılıyorsa)
      'https://sigortan.ai',          // ana site
      'https://www.sigortan.ai',      // www (redirect öncesi JS isteği atabilir)
      // staging varsa: 'https://staging.sigortan.ai'
    ],
    rateLimit: { perTenant: 60, perIp: 10, windowSec: 60 },
  },
  ali_genel: {
    allowedOrigins: [
      'https://crm.alisales.ai',
    ],
    rateLimit: { perTenant: 120, perIp: 20, windowSec: 60 },
  },
  fiscus_ai: {
    allowedOrigins: [
      // TODO: Fiscus widget domain'ini ekle (deploy sonrası)
    ],
    rateLimit: { perTenant: 30, perIp: 5, windowSec: 60 },
  },
  lbc: {
    allowedOrigins: [
      'https://londonbridge.club',
      'https://www.londonbridge.club',
      'https://londonbridge.vercel.app',
      'https://alisales.ai',
    ],
    rateLimit: { perTenant: 60, perIp: 10, windowSec: 60 },
  },
  turkey_health: {
    allowedOrigins: [
      // TODO: TurkeyHealth domain'ini ekle
    ],
    rateLimit: { perTenant: 60, perIp: 10, windowSec: 60 },
  },
};

const VALID_TENANT_IDS = new Set(Object.keys(TENANT_CONFIGS));

// ─── YARDIMCILAR ───────────────────────────────────────────────────────────────

function extractOrigin(headers) {
  const origin = (headers['origin'] ?? '').trim();
  if (origin) return origin;
  const referer = (headers['referer'] ?? '').trim();
  if (!referer) return '';
  try { return new URL(referer).origin; } catch { return ''; }
}

/**
 * Sliding-window rate limiter — n8n static data (DB-backed, persistent).
 * true = limit dahilinde (istek geçmeli), false = limit aşıldı.
 */
function checkRateLimit(store, key, maxCount, windowSec) {
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const entry = store[key];
  if (!entry || now > entry.resetAt) {
    store[key] = { count: 1, resetAt: now + windowMs };
    return true;
  }
  entry.count += 1;
  return entry.count <= maxCount;
}

// ─── ANA DOĞRULAMA ─────────────────────────────────────────────────────────────

const item         = $input.first();
const body         = item.json.body ?? {};
const reqHeaders   = item.json.headers ?? {};

const tenant_id       = String(body.tenant_id ?? '').trim();
const effectiveOrigin = extractOrigin(reqHeaders);
const remoteIp        = (reqHeaders['x-forwarded-for'] ?? '').split(',')[0].trim()
                     || reqHeaders['x-real-ip']
                     || 'unknown';
const ts              = new Date().toISOString();

// Loglama yardımcısı — throw yok, çıktıda __v_ok=false döner (IF node yönlendirir).
function logViolation(event, extra = {}) {
  console.error('[TenantValidation]', JSON.stringify({
    level: 'SECURITY', event, tenant_id,
    origin: effectiveOrigin || '(yok)',
    ip: remoteIp, ts,
    mode: LOG_ONLY ? 'LOG_ONLY' : 'ENFORCE',
    ...extra,
  }));
}

// --- Temizlik: süresi dolmuş rate limit girdilerini sil (bellek kontrolü) ------
const staticData = $getWorkflowStaticData('global');
if (!staticData.rl) staticData.rl = {};
const nowMs = Date.now();
for (const key of Object.keys(staticData.rl)) {
  if (nowMs > staticData.rl[key].resetAt) delete staticData.rl[key];
}

// --- 1. Tenant ID allowlist ---------------------------------------------------
if (!VALID_TENANT_IDS.has(tenant_id)) {
  logViolation('INVALID_TENANT_ID', { received: tenant_id || '(boş)' });
  // Rate limit sayacını sahte tenant_id için artırma; direkt çık.
  const v_ok = LOG_ONLY; // LOG_ONLY=true → geç, false → IF node 403'e yönlendirir
  return [{ json: { ...item.json, __v_ok: v_ok } }];
}

const cfg = TENANT_CONFIGS[tenant_id];

// --- 2. Origin / Referer -------------------------------------------------------
if (!effectiveOrigin) {
  logViolation('MISSING_ORIGIN');
} else if (cfg.allowedOrigins.length > 0 && !cfg.allowedOrigins.includes(effectiveOrigin)) {
  logViolation('INVALID_ORIGIN', { expected: cfg.allowedOrigins, got: effectiveOrigin });
} else if (cfg.allowedOrigins.length === 0) {
  // allowedOrigins henüz doldurulmamış — uyar ama geçir
  console.warn('[TenantValidation] allowedOrigins BOŞ, tenant:', tenant_id,
    '| Origin:', effectiveOrigin, '| doldurun!');
}

const originOk = effectiveOrigin !== ''
  && (cfg.allowedOrigins.length === 0 || cfg.allowedOrigins.includes(effectiveOrigin));

// --- 3. Rate limit -------------------------------------------------------------
const { perTenant, perIp, windowSec } = cfg.rateLimit;
const tenantOk = checkRateLimit(staticData.rl, `t:${tenant_id}`, perTenant, windowSec);
const ipOk     = checkRateLimit(staticData.rl, `ip:${remoteIp}:${tenant_id}`, perIp, windowSec);

if (!tenantOk) logViolation('RATE_LIMIT_TENANT', { limit: perTenant, windowSec });
if (!ipOk)     logViolation('RATE_LIMIT_IP', { limit: perIp, windowSec, ip: remoteIp });

// --- Sonuç -------------------------------------------------------------------
const validationOk = originOk && tenantOk && ipOk;

// LOG_ONLY=true: tüm istekler geçer (test modu — sadece loglar yazılır)
// LOG_ONLY=false: geçersiz istek __v_ok=false → IF node → Reject 403
const v_ok = LOG_ONLY ? true : validationOk;

return [{ json: { ...item.json, __v_ok: v_ok } }];
