// Kaynak: src/lib/tenant-guard.ts — Store OS için kopyalandı, senkronize değildir.
// ════════════════════════════════════════════════════════════════════════════
//  Store OS host sınırı — saf fonksiyon, next/clerk bağımlılığı YOK.
//
//  Orijinalden farkı: Store OS tek müşteriye (Gratis) hizmet eder, tenant
//  çözümlemez. Sorduğu tek soru: "bu host Store OS'i sunmaya yetkili mi?"
//  Orijinaldeki `PROD_HOST_MAP` mantığı (tam eşleşme, substring yok, client
//  sinyali asla söz sahibi değil) aynen korunmuştur.
// ════════════════════════════════════════════════════════════════════════════

/** Store OS'in sunulduğu prod host'ları. Tam eşleşme — substring match YOK. */
export const STOREOS_PROD_HOSTLARI = new Set<string>([
  // Gün 1'de domain bağlanınca doldurulacak, örn:
  // 'gratis-storeos.alisales.ai',
])

/**
 * Bu host Store OS'i sunabilir mi?
 *
 *  1) Host STOREOS_PROD_HOSTLARI'nda → evet.
 *  2) Prod deployment'ında listede değilse → HAYIR. (Ham *.vercel.app URL'i de
 *     production'dır; oradan Store OS açılmaz.)
 *  3) Prod-dışı (preview/localhost) → evet, geliştirme için serbest.
 */
export function storeosHostuMu(host: string, prodDeployMi: boolean): boolean {
  if (STOREOS_PROD_HOSTLARI.has(host)) return true
  if (prodDeployMi) return false
  return true
}

/** localhost / 127.x tespiti — geliştirme kolaylığı. */
export function yerelMi(host: string): boolean {
  return host.startsWith('localhost') || host.startsWith('127.') || host.startsWith('[::1]')
}
