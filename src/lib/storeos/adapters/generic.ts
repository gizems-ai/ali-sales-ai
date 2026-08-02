// ════════════════════════════════════════════════════════════════════════════
//  Adapter: generic — payload ZATEN kanonik biçimde.
//  Sözleşmeye birebir uyan partnerler bunu kullanır. Dönüşüm yok, yalnız
//  doğrulama. Varsayılan adapter budur.
// ════════════════════════════════════════════════════════════════════════════

import { olayDogrula } from '../olay-sozlesmesi'
import type { Adapter, AdapterSonucu } from './tipler'

export const genericAdapter: Adapter = {
  ad: 'generic',
  aciklama: 'Kanonik sözleşmeye birebir uyan payload. Dönüşüm yapılmaz.',

  tanir(ham: unknown): boolean {
    if (typeof ham !== 'object' || ham === null || Array.isArray(ham)) return false
    const o = ham as Record<string, unknown>
    // Kanonik biçimin ayırt edici üçlüsü.
    return typeof o.eventType === 'string'
        && typeof o.storeCode === 'string'
        && typeof o.occurredAt === 'string'
  },

  cevir(ham: unknown, onek = ''): AdapterSonucu {
    const s = olayDogrula(ham, onek)
    if (!s.basarili) return { basarili: false, hatalar: s.hatalar }
    return { basarili: true, olay: s.veri, uyarilar: s.uyarilar, uyariKodlari: s.uyariKodlari }
  },
}
