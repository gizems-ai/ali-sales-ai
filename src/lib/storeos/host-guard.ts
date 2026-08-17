// Kaynak: src/lib/tenant-guard.ts — Store OS için kopyalandı, senkronize değildir.
// ════════════════════════════════════════════════════════════════════════════
//  Store OS host sınırı — saf fonksiyon, next/clerk bağımlılığı YOK.
//
//  Orijinalden farkı: Store OS tek müşteriye (Gratis) hizmet eder, tenant
//  çözümlemez. Sorduğu tek soru: "bu host Store OS'i sunmaya yetkili mi?"
//  Orijinaldeki `PROD_HOST_MAP` mantığı (tam eşleşme, substring yok, client
//  sinyali asla söz sahibi değil) aynen korunmuştur.
// ════════════════════════════════════════════════════════════════════════════

/**
 * Store OS'in sunulduğu prod host'ları. Tam eşleşme — substring match YOK.
 *
 * Kalıcı domain buraya yazılır. Geçici host'lar (Vercel'in ürettiği
 * `*.vercel.app` adresleri gibi) `STOREOS_PROD_HOSTLARI` ORTAM DEĞİŞKENİNE
 * yazılır — virgülle ayrılmış liste. Gerekçe: geçici bir URL için kod
 * değiştirip yeniden deploy etmek gerekmesin; kalıcı domain gelince env
 * temizlenip buraya tek satır eklenir.
 */
export const STOREOS_PROD_HOSTLARI = new Set<string>([
  // Domain bağlanınca doldurulacak (karar: müşteri adı domain'e gömülmez):
  // 'storeos.alisales.ai',
])

/** Env'den gelen ek host'lar. Boşsa boş küme — varsayılan yine "kapalı". */
function envHostlari(): Set<string> {
  const ham = process.env.STOREOS_PROD_HOSTLARI ?? ''
  return new Set(ham.split(',').map(s => s.trim().toLowerCase()).filter(Boolean))
}

/**
 * Bu host Store OS'i sunabilir mi?
 *
 *  1) Host STOREOS_PROD_HOSTLARI'nda (kod veya env) → evet.
 *  2) Prod deployment'ında listede değilse → HAYIR. (Ham *.vercel.app URL'i de
 *     production'dır; listeye yazılmadıkça oradan Store OS açılmaz.)
 *  3) Prod-dışı (preview/localhost) → evet, geliştirme için serbest.
 *
 * Not: eşleşme küçük harfe indirgenerek yapılır (Host başlığı büyük/küçük harf
 * duyarsızdır), ama yine TAM eşleşmedir — substring/suffix eşleşmesi YOK.
 */
export function storeosHostuMu(host: string, prodDeployMi: boolean): boolean {
  const h = host.trim().toLowerCase()
  if (STOREOS_PROD_HOSTLARI.has(h)) return true
  if (envHostlari().has(h)) return true
  if (prodDeployMi) return false
  return true
}

/** localhost / 127.x tespiti — geliştirme kolaylığı. */
export function yerelMi(host: string): boolean {
  return host.startsWith('localhost') || host.startsWith('127.') || host.startsWith('[::1]')
}
