// ════════════════════════════════════════════════════════════════════════════
//  Adapter kayıt defteri.
//  Yeni sağlayıcı = yeni dosya + bu listeye bir satır. Başka hiçbir yer değişmez.
// ════════════════════════════════════════════════════════════════════════════

import { genericAdapter } from './generic'
import { ornekVendorAdapter } from './ornek-vendor'
import type { Adapter } from './tipler'

export type { Adapter, AdapterSonucu } from './tipler'
export { genericAdapter } from './generic'
export { ornekVendorAdapter } from './ornek-vendor'

export const ADAPTERLER: Adapter[] = [genericAdapter, ornekVendorAdapter]

export const VARSAYILAN_ADAPTER = genericAdapter

export function adapterBul(ad: string | null | undefined): Adapter | null {
  if (!ad) return null
  return ADAPTERLER.find(a => a.ad === ad.trim().toLowerCase()) ?? null
}

/**
 * Adapter seçimi:
 *  1) X-StoreOS-Adapter başlığı verilmişse O kullanılır. Bilinmeyen ad → hata
 *     (sessizce generic'e düşmek, partnerin yazım hatasını gizler).
 *  2) Başlık yoksa payload'a bakılır.
 *  3) Hiçbiri tanımazsa generic denenir — hata mesajı sözleşmeye yönlendirir.
 */
export function adapterSec(
  baslikDegeri: string | null | undefined,
  ornekPayload: unknown,
): { adapter: Adapter } | { hata: string } {
  if (baslikDegeri && baslikDegeri.trim()) {
    const a = adapterBul(baslikDegeri)
    if (!a) {
      return { hata: `Bilinmeyen adapter '${baslikDegeri}'. Tanımlı olanlar: ${ADAPTERLER.map(x => x.ad).join(', ')}.` }
    }
    return { adapter: a }
  }
  const tanidi = ADAPTERLER.find(a => a.tanir(ornekPayload))
  return { adapter: tanidi ?? VARSAYILAN_ADAPTER }
}
