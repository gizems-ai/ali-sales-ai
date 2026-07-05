// ════════════════════════════════════════════════════════════════════════════
//  Tenant çözümleme GÜVENLİK SINIRI — saf fonksiyon, next/clerk bağımlılığı YOK.
//  Birim-test edilebilir olsun diye ayrı dosyada (bkz. tenant-guard.test.ts).
//  yetki.ts hem getTenantConfigFromRequest hem getKullanicıProfili'de bunu kullanır.
// ════════════════════════════════════════════════════════════════════════════

// Exact prod hostname → tenant ID. Substring match kullanma: tenant bleed riski.
// Yeni tenant eklenince buraya + tenants.ts TENANTS'a ekle.
export const PROD_HOST_MAP: Record<string, string> = {
  'sigorta.alisales.ai': 'sigortan_biz',
  'crm.alisales.ai':     'ali_genel',
  'panel.alisales.ai':   'sigortan_biz',  // legacy alias — gerekli değilse decommission et
  'emlak.alisales.ai':   'emlak_demo',    // host-mapped: emlak prod bu satırla çözülür
}

/**
 * İstekten tenant ID çözer. GÜVENLİK KURALI (tek kaynak):
 *  1) Host PROD_HOST_MAP'te tam eşleşiyorsa → o tenant. Host-mapped her zaman
 *     güvenilir; client'ın x-tenant-id/?tenant sinyali bunu ASLA değiştiremez.
 *  2) Host PROD_HOST_MAP dışıysa:
 *     - PROD deployment'ında (isProdDeploy = VERCEL_ENV==='production'; prod
 *       alias'ının ham *.vercel.app URL'i DE production'dır) → preview sinyali
 *       GÜVENİLMEZ → null. (Ham-URL ?tenant enjeksiyon açığı burada kapanır.)
 *     - Yalnız production-DIŞI deployment'ta (preview/localhost) → x-tenant-id geçerli.
 *  Not: dönen ID'nin TENANTS'ta var olup olmadığını çağıran TENANTS[id] ile doğrular.
 */
export function tenantIdForRequest(
  host: string,
  xTenantId: string | null | undefined,
  isProdDeploy: boolean,
): string | null {
  const mapped = PROD_HOST_MAP[host]
  if (mapped) return mapped
  if (isProdDeploy) return null
  return xTenantId ?? null
}
