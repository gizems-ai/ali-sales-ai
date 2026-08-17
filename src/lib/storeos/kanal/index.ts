// ════════════════════════════════════════════════════════════════════════════
//  Store OS — kanal seçici.
//  İş mantığı YALNIZ `kanal()` çağırır; hangi uygulamanın döndüğünü bilmez.
//  `depo/index.ts` ile birebir aynı desen.
// ════════════════════════════════════════════════════════════════════════════

import { env } from '../env'
import { KonsolKanali } from './konsol'
import { WhatsAppKanali } from './whatsapp'
import type { KanalArayuzu } from './tipler'

export type { GelenYanit, GidenButon, GidenMesaj, GonderimSonucu, KanalArayuzu, ButonAksiyonu } from './tipler'
export { BUTON_AKSIYONLARI, butonAksiyonuMu } from './tipler'
export { butonIdCoz, butonIdUret, BUTON_ETIKETLERI } from './buton'

const KUTU = globalThis as unknown as {
  __storeosKonsolKanal?: KonsolKanali
  __storeosWaKanal?: WhatsAppKanali
}

export function kanal(): KanalArayuzu {
  if (env.kanal === 'whatsapp') {
    // Webhook URL'i eksikse KONSOLA DÜŞMÜYORUZ. Sessiz düşüş, "mesaj gitti"
    // sanılan bir demoya yol açar. Yapılandırma eksikse gönderim başarısız
    // olur, bildirim kaydı 'hata' durumunda kalır ve panelde görünür.
    //
    // Fırlatmıyoruz da: env.n8nGidenWebhook zorunlu okuma yapar ve burada
    // atılan hata TÜM olay alımını 500'e çevirirdi — yapılandırma eksikliği
    // yüzünden görev üretimi de dururdu. Boş URL ile kurup gönderimi
    // başarısız bırakmak, hatayı doğru halkada tutar.
    if (!KUTU.__storeosWaKanal) {
      KUTU.__storeosWaKanal = new WhatsAppKanali(env.n8nGidenWebhookVarsa)
    }
    return KUTU.__storeosWaKanal
  }
  if (!KUTU.__storeosKonsolKanal) KUTU.__storeosKonsolKanal = new KonsolKanali()
  return KUTU.__storeosKonsolKanal
}

/** Testler için: kanalı açıkça konsol yap. */
export function konsolKanaliniZorla(): KanalArayuzu {
  if (!KUTU.__storeosKonsolKanal) KUTU.__storeosKonsolKanal = new KonsolKanali()
  return KUTU.__storeosKonsolKanal
}
