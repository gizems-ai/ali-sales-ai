/**
 * WA NUMBER VALIDATION — LOG-ONLY (Faz 1)
 *
 * Workflow: 50sSMwjHzon1TdRU (360Dialog WhatsApp Echo Bot)
 * Webhook → WA Number Validation → Get Tenant Config
 *
 * 360Dialog webhook payload'ında tenant bilgisi body'de gelmez;
 * WABA display_phone_number'dan server-side türetilir. Bu node:
 *   - display_phone_number'ın bilinen WABA listesinde olduğunu doğrular
 *   - Geçersizse loglar (LOG_ONLY=true) veya durdurur (false)
 *   - downstream'e display_phone_number'ı geçirir (zaten geçiyordu)
 */

const LOG_ONLY = true;

/**
 * Sistemde kayıtlı 360Dialog WABA numaraları (E.164 prefix'siz display format).
 * 360Dialog dashboard'dan doğrula ve güncel tut.
 * Her numara bir tenant'a karşılık gelir (Airtable Master'daki page_id = bu numara).
 */
const VALID_WABA_NUMBERS = new Set([
  // '905XXXXXXXXX',  // sigortan_biz — dashboard'dan doldurun
  // '905XXXXXXXXX',  // ali_genel    — dashboard'dan doldurun
  // format: 360Dialog'un metadata.display_phone_number değeri ne ise onu yaz
]);

const item = $input.first();
const body = item.json?.body ?? {};

let displayPhone = '';
try {
  displayPhone = body.entry?.[0]?.changes?.[0]?.value?.metadata?.display_phone_number ?? '';
} catch {
  displayPhone = '';
}

const remoteIp = (item.json?.headers ?? {})['x-forwarded-for'] ?? 'unknown';
const now = new Date().toISOString();

// VALID_WABA_NUMBERS boşsa her numaraya geç (bootstrap modu — doldurunca aktifleşir)
const skipCheck = VALID_WABA_NUMBERS.size === 0;
const isValid   = skipCheck || (displayPhone.length > 0 && VALID_WABA_NUMBERS.has(displayPhone));

if (!isValid) {
  const logEntry = {
    level:    'SECURITY',
    event:    'INVALID_WABA_NUMBER',
    received: displayPhone || '(boş)',
    ip:       remoteIp,
    ts:       now,
    mode:     LOG_ONLY ? 'LOG_ONLY' : 'ENFORCE',
  };
  console.error('[WAValidation]', JSON.stringify(logEntry));

  if (!LOG_ONLY) {
    throw new Error(`[SECURITY] Geçersiz WABA numarası: "${displayPhone}" | ip: ${remoteIp}`);
  }
}

if (skipCheck && displayPhone) {
  console.warn('[WAValidation] VALID_WABA_NUMBERS henüz doldurulmadı — geçiyor:', displayPhone);
}

return $input.all();
