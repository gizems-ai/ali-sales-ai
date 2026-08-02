// ════════════════════════════════════════════════════════════════════════════
//  Store OS — ADAPTER SÖZLEŞMESİ
//
//  Amaç: sağlayıcı bağımsızlığı. Vision partneri değişirse yalnız yeni bir
//  adapter dosyası eklenir; kural motoru, görev motoru, panel, denetim — hiçbiri
//  değişmez. Sözleşmenin stratejik değeri burada: kanonik forma çevirme noktası
//  tek ve dar.
// ════════════════════════════════════════════════════════════════════════════

import type { AlanHatasi, UyariKodu, VisionEvent } from '../olay-sozlesmesi'

export type AdapterSonucu =
  /**
   * `uyarilar` insan içindir (log, panel), `uyariKodlari` makine içindir:
   * yanıt gövdesindeki `warnings` dizisi ve partnerin kendi alarmı bunu okur.
   */
  | { basarili: true; olay: VisionEvent; uyarilar: string[]; uyariKodlari: UyariKodu[] }
  | { basarili: false; hatalar: AlanHatasi[] }

export interface Adapter {
  /** X-StoreOS-Adapter başlığında ve Olaylar.Kaynak Adapter alanında görünen ad. */
  ad: string
  aciklama: string
  /**
   * Bu ham payload bu adapter'a mı ait? Otomatik seçimde kullanılır.
   * Başlık açıkça verilmişse çağrılmaz.
   */
  tanir(ham: unknown): boolean
  /** Ham payload → kanonik VisionEvent (doğrulama dahil). */
  cevir(ham: unknown, onek?: string): AdapterSonucu
}
