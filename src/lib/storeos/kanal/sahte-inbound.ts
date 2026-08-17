// ════════════════════════════════════════════════════════════════════════════
//  Store OS — SAHTE GELEN YANIT (buton simülatörü)
//
//  Gerçek 360Dialog payload'ı elimize geçene kadar zincirin GELEN yönü buradan
//  kapanır. Ürettiği şey `GelenYanit` — yani gerçek WhatsApp yanıtının indiği
//  NOKTANIN AYNISI. Zincir testi ve demo kontrol paneli bunu kullanır.
//
//  DİKKAT — bu dosya sözleşme UYDURMAZ. Sağlayıcının ham gövdesini taklit
//  etmeye çalışmıyor; taklit etseydi, gerçek payload geldiğinde yanlış bir
//  şeye karşı test yazmış olurduk. Sadece "kullanıcı şu butona bastı" olgusunu
//  kanal-bağımsız biçimde ifade ediyor.
//
//  Gerçek payload geldiğinde: `whatsapp.ts` içindeki `gelenCoz` n8n'in
//  normalize ettiği gövdeye göre güncellenir, bu dosya OLDUĞU GİBİ kalır.
// ════════════════════════════════════════════════════════════════════════════

import { butonIdUret } from './buton'
import type { ButonAksiyonu, GelenYanit } from './tipler'

export interface SahteYanitGirdi {
  gorevNo: string
  aksiyon: ButonAksiyonu
  bildirimId: string
  /** Bildirimin gönderiminde dönen sağlayıcı id — inbound eşleşmesi bununla. */
  saglayiciMesajId: string
  gonderenTelefon: string
  zaman?: string
}

/** Butona basılmış gibi kanal-bağımsız yanıt üretir. */
export function sahteButonYaniti(g: SahteYanitGirdi): GelenYanit {
  return {
    saglayiciMesajId: g.saglayiciMesajId,
    butonId: butonIdUret({ gorevNo: g.gorevNo, aksiyon: g.aksiyon, bildirimId: g.bildirimId }),
    metin: null,
    gonderenTelefon: g.gonderenTelefon,
    zaman: g.zaman,
  }
}

/** Kullanıcı butona basmak yerine düz metin yazdı. Görev durumu DEĞİŞMEZ. */
export function sahteMetinYaniti(
  g: Omit<SahteYanitGirdi, 'aksiyon' | 'gorevNo' | 'bildirimId'> & { metin: string },
): GelenYanit {
  return {
    saglayiciMesajId: g.saglayiciMesajId,
    butonId: null,
    metin: g.metin,
    gonderenTelefon: g.gonderenTelefon,
    zaman: g.zaman,
  }
}
