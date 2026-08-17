// ════════════════════════════════════════════════════════════════════════════
//  Store OS — KONSOL KANALI (varsayılan)
//
//  Dış bağımlılığı YOK. Mesajı stdout'a basar, sahte ama DETERMİNİSTİK bir
//  sağlayıcı mesaj id'si döndürür (Math.random yasak — madde: deterministik
//  demo). Bildirim kaydı, denetim izi, buton id'leri gerçek yolla birebir aynı
//  üretilir; farklı olan tek şey mesajın nereye gittiğidir.
//
//  Bu yüzden zincir testi WhatsApp hattı olmadan da anlamlıdır: konsol
//  kanalıyla geçen bir test, whatsapp kanalıyla da geçer — aradaki fark tek
//  bir `fetch`.
// ════════════════════════════════════════════════════════════════════════════

import { butonIdCoz } from './buton'
import type { GelenYanit, GidenMesaj, GonderimSonucu, KanalArayuzu } from './tipler'

/** FNV-1a — kısa, deterministik, çakışma olasılığı demo hacminde ihmal edilir. */
function fnv1a(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

export class KonsolKanali implements KanalArayuzu {
  readonly ad = 'konsol' as const
  /** stdout süreçten çıkmaz — telefon kilidi burada fail-closed davranmaz. */
  readonly disaCikar = false

  async gonder(m: GidenMesaj): Promise<GonderimSonucu> {
    const satirlar = [
      `[storeos:konsol] → ${m.aliciAd} <${m.aliciTelefon}>`,
      m.gorevNo ? `  görev   : ${m.gorevNo}` : null,
      m.template ? `  template: ${m.template}` : '  template: (yok — serbest mesaj)',
      `  gövde   : ${m.govde}`,
      ...m.butonlar.map(b => `  [ ${b.etiket} ]  id=${b.id}`),
    ].filter(Boolean)
    console.log(satirlar.join('\n'))

    // Sağlayıcı id'si girdiden türer: aynı bildirim iki kez gönderilirse aynı
    // id çıkar ve inbound eşleşmesi testlerde tekrarlanabilir olur.
    return { basarili: true, saglayiciMesajId: `konsol-${fnv1a(m.bildirimId)}` }
  }

  /**
   * Konsol kanalının gerçek bir gelen yönü yoktur. `sahte-inbound.ts` zaten
   * kanal-bağımsız `GelenYanit` üretiyor; yine de aynı şekli buradan da kabul
   * ediyoruz ki `STOREOS_KANAL=konsol` iken inbound uç noktası test edilebilsin.
   */
  gelenCoz(ham: unknown): GelenYanit | null {
    if (typeof ham !== 'object' || ham === null) return null
    const o = ham as Record<string, unknown>
    const butonId = typeof o.butonId === 'string' ? o.butonId : null
    const mesajId = typeof o.saglayiciMesajId === 'string' ? o.saglayiciMesajId : null
    if (!mesajId) return null
    if (butonId && !butonIdCoz(butonId)) return null
    return {
      saglayiciMesajId: mesajId,
      butonId,
      metin: typeof o.metin === 'string' ? o.metin : null,
      gonderenTelefon: typeof o.gonderenTelefon === 'string' ? o.gonderenTelefon : '',
      zaman: typeof o.zaman === 'string' ? o.zaman : undefined,
    }
  }
}
