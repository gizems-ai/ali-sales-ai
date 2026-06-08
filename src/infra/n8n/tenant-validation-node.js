/**
 * TENANT & ORIGIN VALIDATION — Web Widget (GTOFjZkTVVTEU2L9)
 * Konum: Webhook → [bu node] → Get Tenant Config
 *
 * Üç katman:
 *   1. tenant_id allowlist
 *   2. Origin / Referer — tenant'ın kayıtlı domainleriyle tam eşleşme
 *   3. Per-tenant + per-IP rate limit (n8n static data, window: 60s)
 *
 * LOG_ONLY = true  → ihlaller loglanır, istek geçer  (Faz 1 — doğrulama)
 * LOG_ONLY = false → ihlaller bloklanır, 500 döner   (Faz 2 — enforce)
 *
 * Geçişe hazır olma kriteri (ikisi birden):
 *   ✓ Gerçek widget trafiği: logda "VALID" görünüyor
 *   ✓ Sahte POST (curl, farklı origin): logda INVALID_* görünüyor, bloklanmıyor
 * Sonra LOG_ONLY = false yap, aynı curl → 500, meşru istek → normal akış.
 *
 * Test komutu (LOG_ONLY her değerde çalışır; false'da reject beklenir):
 *   # Geçersiz origin:
 *   curl -X POST https://n8n.alisales.ai/webhook/chatbot-v2-test \
 *     -H "Content-Type: application/json" \
 *     -H "Origin: https://evil.com" \
 *     -d '{"tenant_id":"sigortan_biz","from":"905001234567","message":"test"}'
 *
 *   # Origin hiç yok:
 *   curl -X POST https://n8n.alisales.ai/webhook/chatbot-v2-test \
 *     -H "Content-Type: application/json" \
 *     -d '{"tenant_id":"sigortan_biz","from":"905001234567","message":"test"}'
 *
 *   # Geçerli origin (izin verilmeli):
 *   curl -X POST https://n8n.alisales.ai/webhook/chatbot-v2-test \
 *     -H "Content-Type: application/json" \
 *     -H "Origin: https://sigortan.biz" \
 *     -d '{"tenant_id":"sigortan_biz","from":"905001234567","message":"test"}'
 */

// ─── ENFORCE TOGGLE ────────────────────────────────────────────────────────────
const LOG_ONLY = true; // → false: enforce modu, false döndürür ve akışı durdurur

// ─── TENANT KONFİGÜRASYONU ─────────────────────────────────────────────────────
// allowedOrigins: widget'ın gömüldüğü domainin tam Origin değerleri (trailing slash YOK).
// Yeni tenant / yeni domain eklenince buraya + Airtable Tenants tablosuna ekle.
const TENANT_CONFIGS = {
  sigortan_biz: {
    allowedOrigins: [
      'https://sigorta.alisales.ai',
      'https://sigortan.biz',
      'https://www.sigortan.biz',
      // widget başka bir domaine gömülünce buraya ekle
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
      // TODO: Fiscus widget domain'ini ekle
    ],
    rateLimit: { perTenant: 30, perIp: 5, windowSec: 60 },
  },
  lbc_network: {
    allowedOrigins: [
      // TODO: LBC domain'ini ekle
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

/**
 * Origin header veya Referer'dan origin kısmını çıkar.
 * Referer: "https://sigortan.biz/sayfa" → "https://sigortan.biz"
 * Origin: "https://sigortan.biz" → "https://sigortan.biz"
 * Hiçbiri yoksa: ""
 */
function extractOrigin(headers) {
  const origin = (headers['origin'] ?? '').trim();
  if (origin) return origin;
  const referer = (headers['referer'] ?? '').trim();
  if (!referer) return '';
  try {
    const u = new URL(referer);
    return u.origin; // scheme + host + port
  } catch {
    return '';
  }
}

/** Static data tabanlı sliding-window rate limiter. true = limit dahilinde. */
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

const item       = $input.first();
const body       = item.json.body ?? {};
const reqHeaders = item.json.headers ?? {};

const tenant_id    = String(body.tenant_id ?? '').trim();
const effectiveOrigin = extractOrigin(reqHeaders);
const remoteIp     = (reqHeaders['x-forwarded-for'] ?? '').split(',')[0].trim()
                  || reqHeaders['x-real-ip']
                  || 'unknown';
const ts           = new Date().toISOString();

/** İhlali logla; enforce modunda throw at. false döndürür (early-return için). */
function reject(event, details) {
  console.error('[TenantValidation]', JSON.stringify({
    level: 'SECURITY', event, tenant_id, origin: effectiveOrigin,
    ip: remoteIp, ts, mode: LOG_ONLY ? 'LOG_ONLY' : 'ENFORCE',
    ...details,
  }));
  if (!LOG_ONLY) {
    throw new Error(`[SECURITY] ${event} | tenant:${tenant_id} | origin:${effectiveOrigin} | ip:${remoteIp}`);
  }
  return false;
}

// 1. tenant_id allowlist
if (!VALID_TENANT_IDS.has(tenant_id)) {
  reject('INVALID_TENANT_ID', { received: tenant_id || '(boş)' });
  // LOG_ONLY modunda akışa devam (tenant cfg olmadan — downstream hata verebilir, beklenen)
  return $input.all();
}

const cfg = TENANT_CONFIGS[tenant_id];

// 2. Origin / Referer doğrulaması
// Web widget her zaman bir Origin gönderir. Origin yoksa sunucu tarafı istek veya curl — reddet.
const originOk = effectiveOrigin !== ''
  && cfg.allowedOrigins.length > 0
  && cfg.allowedOrigins.includes(effectiveOrigin);

// allowedOrigins henüz doldurulmamış tenant (boş dizi) → sadece origin varlığını kontrol et
const allowedListEmpty = cfg.allowedOrigins.length === 0;

if (!effectiveOrigin) {
  // Origin hiç yok
  reject('MISSING_ORIGIN', {});
} else if (!allowedListEmpty && !originOk) {
  // Tanınan bir origin değil
  reject('INVALID_ORIGIN', {
    expected: cfg.allowedOrigins,
    got: effectiveOrigin,
    hint: allowedListEmpty ? 'allowedOrigins henüz doldurulmadı' : undefined,
  });
}

// allowedOrigins boşsa origin varlığı yeterliydi — warn bas ama geç
if (allowedListEmpty && effectiveOrigin) {
  console.warn('[TenantValidation] allowedOrigins BOŞ — tenant:', tenant_id, '| origin:', effectiveOrigin, '| doldurun!');
}

// 3. Rate limit
const store = $getWorkflowStaticData('global');
if (!store.rl) store.rl = {};

const { perTenant, perIp, windowSec } = cfg.rateLimit;

if (!checkRateLimit(store.rl, `t:${tenant_id}`, perTenant, windowSec)) {
  reject('RATE_LIMIT_TENANT', { limit: perTenant, windowSec });
}
if (!checkRateLimit(store.rl, `ip:${remoteIp}:${tenant_id}`, perIp, windowSec)) {
  reject('RATE_LIMIT_IP', { limit: perIp, windowSec });
}

// Tüm kontroller geçti — debug log (prod'da kapatılabilir)
// console.log('[TenantValidation] VALID', { tenant_id, origin: effectiveOrigin, ip: remoteIp });

return $input.all();
