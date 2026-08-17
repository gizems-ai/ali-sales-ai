// ════════════════════════════════════════════════════════════════════════════
//  Store OS — WHATSAPP KANALI (n8n köprüsü üzerinden)
//
//  Panel 360Dialog'a DOĞRUDAN çıkmaz. Hat şu:
//
//     panel ──POST──▶ n8n webhook ──▶ 360Dialog ──▶ telefon
//     panel ◀──POST── n8n webhook ◀── 360Dialog ◀── buton
//
//  NEDEN n8n ARADA: 360Dialog anahtarı zaten n8n'de yaşıyor ve orada rotasyon
//  ediliyor; panele ikinci bir kopya koymak sır yüzeyini büyütür. Ayrıca
//  şablon onayı, 24 saat penceresi ve numara formatı gibi sağlayıcıya özgü
//  işler n8n tarafında kalır — panel bunları bilmez.
//
//  ── SÖZLEŞME SAHİPLİĞİ (önemli ayrım) ─────────────────────────────────────
//  n8n ↔ panel arasındaki iki gövdeyi BİZ tanımlıyoruz; aşağıdaki şekiller
//  tahmin değil, karardır (docs/gratis/bildirim-kanali.md).
//  Tahmin olan tek şey 360Dialog'un n8n'e attığı HAM gövdedir — onu bu dosya
//  hiç görmez, n8n normalize eder. Vision partnerinin örnek payload'ında
//  olduğu gibi: ham şekli görmeden parser yazmıyoruz.
//
//  YAPILANDIRMA: STOREOS_N8N_WA_WEBHOOK_URL (giden), STOREOS_WA_INBOUND_TOKEN
//  (gelenin bearer'ı — route doğrular, bu dosya değil).
// ════════════════════════════════════════════════════════════════════════════

import { butonIdCoz } from './buton'
import type { GelenYanit, GidenMesaj, GonderimSonucu, KanalArayuzu } from './tipler'

/** n8n yanıt vermezse zincir asılı kalmasın. Airtable yazımı zaten bitti. */
const ZAMAN_ASIMI_MS = 10_000

export class WhatsAppKanali implements KanalArayuzu {
  readonly ad = 'whatsapp' as const
  /** Gerçek telefona çıkar — demo telefon kilidi burada FAIL-CLOSED. */
  readonly disaCikar = true

  constructor(private readonly webhookUrl: string) {}

  async gonder(m: GidenMesaj): Promise<GonderimSonucu> {
    if (!this.webhookUrl) {
      // Açık hata mesajı: fetch('')'in belirsiz TypeError'ı yerine sebebi yaz.
      return {
        basarili: false,
        hata: 'STOREOS_N8N_WA_WEBHOOK_URL tanımlı değil — WhatsApp kanalı yapılandırılmamış.',
        tekrarDenenebilir: false,
      }
    }

    // GİDEN SÖZLEŞMESİ — n8n workflow'u bu alanları bekler.
    const govde = {
      bildirimId: m.bildirimId,          // idempotency anahtarı; n8n de tekrar görürse atlayabilir
      gorevNo: m.gorevNo ?? null,
      telefon: m.aliciTelefon,           // E.164
      ad: m.aliciAd,
      metin: m.govde,
      template: m.template ?? null,      // null = 24s penceresi içinde serbest mesaj
      butonlar: m.butonlar.map(b => ({ id: b.id, etiket: b.etiket })),
    }

    const iptal = new AbortController()
    const saat = setTimeout(() => iptal.abort(), ZAMAN_ASIMI_MS)
    try {
      const y = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(govde),
        signal: iptal.signal,
      })
      const metin = await y.text()
      if (!y.ok) {
        // 5xx tekrar denenebilir, 4xx bizim gövdemiz yanlış demektir.
        return {
          basarili: false,
          hata: `n8n ${y.status}: ${metin.slice(0, 300)}`,
          tekrarDenenebilir: y.status >= 500,
        }
      }
      return {
        basarili: true,
        saglayiciMesajId: saglayiciIdCikar(metin) ?? `n8n-${m.bildirimId}`,
        not: saglayiciIdCikar(metin) ? undefined : 'n8n sağlayıcı mesaj id döndürmedi; yerel id kullanıldı.',
      }
    } catch (e) {
      const iptalMi = (e as Error).name === 'AbortError'
      return {
        basarili: false,
        hata: iptalMi ? `n8n ${ZAMAN_ASIMI_MS} ms içinde yanıt vermedi` : (e as Error).message,
        tekrarDenenebilir: true,
      }
    } finally {
      clearTimeout(saat)
    }
  }

  /**
   * GELEN SÖZLEŞMESİ — n8n'in bize POST ettiği normalize gövde:
   *   { mesajId, butonId?, metin?, telefon, zaman? }
   * 360Dialog'un ham şekli buraya GELMEZ; n8n çevirir.
   */
  gelenCoz(ham: unknown): GelenYanit | null {
    if (typeof ham !== 'object' || ham === null) return null
    const o = ham as Record<string, unknown>

    const mesajId = metinAlan(o, 'mesajId')
    if (!mesajId) return null

    const butonId = metinAlan(o, 'butonId')
    // Tanımadığımız bir buton id'si gelirse yanıtı buton yanıtı SAYMAYIZ.
    // Serbest metin olarak akar, görev durumu değişmez, denetime düşer.
    const gecerliButon = butonId && butonIdCoz(butonId) ? butonId : null

    return {
      saglayiciMesajId: mesajId,
      butonId: gecerliButon,
      metin: metinAlan(o, 'metin'),
      gonderenTelefon: metinAlan(o, 'telefon') ?? '',
      zaman: metinAlan(o, 'zaman') ?? undefined,
    }
  }
}

function metinAlan(o: Record<string, unknown>, ad: string): string | null {
  const v = o[ad]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

/**
 * n8n yanıtından sağlayıcı mesaj id'sini çıkarmayı DENER. Bulamazsa null —
 * ve `gonder` yerel id'ye düşerken bunu `not` ile açıkça söyler. Sessizce
 * uydurulmuş bir sağlayıcı id'si, inbound eşleşmesini sessizce bozar.
 */
function saglayiciIdCikar(metin: string): string | null {
  if (!metin.trim()) return null
  try {
    const j = JSON.parse(metin) as Record<string, unknown>
    for (const ad of ['mesajId', 'messageId', 'id', 'wamid']) {
      const v = j[ad]
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
    return null
  } catch {
    return null
  }
}
