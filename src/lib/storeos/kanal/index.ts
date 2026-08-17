// ════════════════════════════════════════════════════════════════════════════
//  Store OS — kanal seçici.
//  İş mantığı YALNIZ `kanal()` çağırır; hangi uygulamanın döndüğünü bilmez.
//  `depo/index.ts` ile birebir aynı desen.
// ════════════════════════════════════════════════════════════════════════════

import { env } from '../env'
import { KonsolKanali } from './konsol'
import { kilitle } from './telefon-kilidi'
import { WhatsAppKanali } from './whatsapp'
import type { KanalArayuzu } from './tipler'

export type { GelenYanit, GidenButon, GidenMesaj, GonderimSonucu, KanalArayuzu, ButonAksiyonu } from './tipler'
export { BUTON_AKSIYONLARI, butonAksiyonuMu } from './tipler'
export { butonIdCoz, butonIdUret, BUTON_ETIKETLERI } from './buton'

const KUTU = globalThis as unknown as {
  __storeosKonsolKanal?: KanalArayuzu
  __storeosWaKanal?: KanalArayuzu
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
      KUTU.__storeosWaKanal = kilitle(new WhatsAppKanali(env.n8nGidenWebhookVarsa))
    }
    return KUTU.__storeosWaKanal
  }
  return konsolKanaliniZorla()
}

/**
 * Testler ve zincir demosu için: kanalı açıkça konsol yap.
 *
 * Bu da kilidin arkasından geçer. Konsol dışarı çıkmadığı için kilit burada
 * gönderimi ENGELLEMEZ, ama hedefin ezildiğini logda gösterir — jüri önünde
 * konsol kanalıyla koşarken de "bu mesaj demo numarasına giderdi" görünür.
 */
export function konsolKanaliniZorla(): KanalArayuzu {
  if (!KUTU.__storeosKonsolKanal) KUTU.__storeosKonsolKanal = kilitle(new KonsolKanali())
  return KUTU.__storeosKonsolKanal
}
