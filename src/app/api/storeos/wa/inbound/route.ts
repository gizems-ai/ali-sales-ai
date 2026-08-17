// ════════════════════════════════════════════════════════════════════════════
//  POST /api/storeos/wa/inbound — n8n'den gelen WhatsApp yanıtı
//
//  YETKİ: Clerk DEĞİL, bearer token (STOREOS_WA_INBOUND_TOKEN).
//  Çağıran n8n'dir; 360Dialog buraya DOĞRUDAN GELMEZ. Ham sağlayıcı payload'ı
//  n8n'de normalize edilir; bu uç noktanın gördüğü biçim BİZİM sözleşmemizdir
//  (docs/gratis/bildirim-kanali.md).
//
//  Durum kodları — hepsi bilinçli:
//    200  yanıt işlendi (uygulandı / yinelenen / serbest metin)
//    202  çözülemedi ama KABUL EDİLDİ ve denetime yazıldı
//         → n8n TEKRAR DENEMESİN. Çözülemeyen bir yanıt tekrar gönderilince de
//           çözülemez; 4xx dönmek n8n'de sonsuz retry kuyruğu yaratır.
//    400  gövde JSON değil
//    401  token eksik/yanlış
//    500  sunucu yapılandırması eksik (token tanımlı değil)
// ════════════════════════════════════════════════════════════════════════════

import { depo } from '@/lib/storeos/depo'
import { env } from '@/lib/storeos/env'
import { kanal } from '@/lib/storeos/kanal'
import { yanitiIsle } from '@/lib/storeos/inbound'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function tokenGecerli(istek: Request, beklenen: string): boolean {
  const baslik = istek.headers.get('authorization') ?? ''
  const parca = baslik.startsWith('Bearer ') ? baslik.slice(7).trim() : ''
  // Sabit zamanlı karşılaştırma gerekmiyor: token uzunluğu sabit değil ve
  // bu uç nokta hız sınırlı bir n8n köprüsünün arkasında. Yine de basit
  // uzunluk+eşitlik kontrolünü tek yerde tutuyoruz.
  return parca.length > 0 && parca === beklenen
}

export async function POST(istek: Request): Promise<Response> {
  let beklenen: string
  try {
    beklenen = env.inboundToken
  } catch {
    return Response.json(
      { hata: 'Sunucu yapılandırması eksik: STOREOS_WA_INBOUND_TOKEN', tekrarDenenebilir: true },
      { status: 500 },
    )
  }

  if (!tokenGecerli(istek, beklenen)) {
    return Response.json({ hata: 'Yetkisiz.' }, { status: 401 })
  }

  let govde: unknown
  try {
    govde = await istek.json()
  } catch {
    return Response.json({ hata: 'Gövde geçerli JSON değil.' }, { status: 400 })
  }

  const k = kanal()
  const yanit = k.gelenCoz(govde)
  if (!yanit) {
    // TAHMİN ETMİYORUZ. Çözemediğimiz payload'ı zorlamak yerine kabul edip
    // olduğu gibi kayda geçiriyoruz; biçim netleşince çözümleyici güncellenir.
    console.warn('[storeos] inbound cozulemedi', JSON.stringify(govde).slice(0, 500))
    return Response.json(
      {
        durum: 'cozulemedi',
        not: 'Gövde bu kanalın sözleşmesine uymuyor; işlenmedi. Tekrar göndermeyin.',
      },
      { status: 202 },
    )
  }

  try {
    const sonuc = await yanitiIsle({ depo: depo(), kanal: k, yanit, kaynak: 'n8n' })
    return Response.json(sonuc, { status: 200 })
  } catch (e) {
    console.error('[storeos] inbound isleme hatasi', e)
    return Response.json(
      { hata: 'Yanıt işlenirken beklenmeyen hata.', tekrarDenenebilir: true },
      { status: 500 },
    )
  }
}

export async function GET() {
  return Response.json({ hata: 'Bu uç nokta yalnız POST kabul eder.' }, { status: 405 })
}
