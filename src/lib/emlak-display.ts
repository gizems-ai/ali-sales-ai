import { type TenantTemsilci } from './tenants'

/** Airtable'daki gerçek temsilci adını → görünür display adına çevirir.
 *  displayAd tanımlanmamışsa orijinal adı döner. */
export function resolveDisplayAd(temsilciler: TenantTemsilci[], rawAd: string): string {
  return temsilciler.find(t => t.ad === rawAd)?.displayAd ?? rawAd
}

/** Temsilci listesinden { realAd → displayAd } map'i üretir. */
export function buildDisplayAdMap(temsilciler: TenantTemsilci[]): Record<string, string> {
  return Object.fromEntries(
    temsilciler.filter(t => t.displayAd).map(t => [t.ad, t.displayAd!])
  )
}
