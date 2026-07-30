// ════════════════════════════════════════════════════════════════════════════
//  POST /api/storeos/olay — vision partneri olay girişi
//
//  YETKİ: Clerk DEĞİL. Bu uç noktayı makine çağırır.
//  Kimlik = X-StoreOS-Signature (HMAC-SHA256, paylaşılan sır).
//  src/proxy.ts `/api/*`'ı public bıraktığı için route kendi kontrolünü yapar.
//
//  Durum kodları (sözleşmede ilan edildi):
//   202  en az bir olay kabul edildi
//   200  tümü yinelenen (at-least-once — partner tekrar göndermiş, sorun yok)
//   400  gövde bozuk / tüm olaylar doğrulamayı geçemedi → SEBEP gövdede
//   401  imza eksik veya geçersiz
//   413  gövde çok büyük
//   500  sunucu yapılandırması eksik veya beklenmeyen hata (partner TEKRAR DENER)
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { depo } from '@/lib/storeos/depo'
import { env } from '@/lib/storeos/env'
import { denetimYaz, DENETIM_AKSIYONLARI } from '@/lib/storeos/denetim'
import { imzaDogrula } from '@/lib/storeos/imza'
import { olaylariAl } from '@/lib/storeos/olay-alim'

export const runtime = 'nodejs'          // node:crypto gerekiyor
export const dynamic = 'force-dynamic'

/** 1 MB. Üstü reddedilir — 500 olaylık toplu gönderim bile bunun altında kalır. */
const AZAMI_GOVDE_BAYT = 1024 * 1024

function istemciIp(r: Request): string {
  const xff = r.headers.get('x-forwarded-for')
  return xff ? xff.split(',')[0]!.trim() : (r.headers.get('x-real-ip') ?? 'bilinmiyor')
}

export async function POST(req: Request) {
  const d = depo()

  // ── 0. Yapılandırma ──
  let sir: string
  try {
    sir = env.ingestSecret
  } catch {
    // Partnerin suçu değil → 500, tekrar denenebilir.
    return NextResponse.json(
      { hata: 'Sunucu yapılandırması eksik.', tekrarDenenebilir: true },
      { status: 500 },
    )
  }

  // ── 1. Ham gövde (imza ham metin üzerinden doğrulanır) ──
  let hamGovde: string
  try {
    hamGovde = await req.text()
  } catch {
    return NextResponse.json({ hata: 'İstek gövdesi okunamadı.' }, { status: 400 })
  }
  if (hamGovde.length > AZAMI_GOVDE_BAYT) {
    return NextResponse.json(
      { hata: `Gövde çok büyük (${hamGovde.length} bayt, sınır ${AZAMI_GOVDE_BAYT}). Toplu gönderimi bölün.` },
      { status: 413 },
    )
  }

  // ── 2. İmza ──
  const imza = imzaDogrula({
    hamGovde,
    baslik: req.headers.get('x-storeos-signature'),
    sir,
    simdiSn: Math.floor(Date.now() / 1000),
    toleransSn: env.imzaToleransSn,
  })
  if (!imza.gecerli) {
    await denetimYaz(d, {
      aktor: `partner:${istemciIp(req)}`, aktorTipi: 'partner',
      aksiyon: DENETIM_AKSIYONLARI.olayImzaHatasi,
      entityTipi: 'olay', entityId: '(imzasiz)',
      sonrasi: { sebep: imza.sebep, bicim: imza.bicim, govdeBayt: hamGovde.length },
      ip: istemciIp(req), kaynak: 'api',
    })
    return NextResponse.json({ hata: imza.sebep ?? 'İmza doğrulanamadı.' }, { status: 401 })
  }

  // ── 3. JSON ──
  let govde: unknown
  try {
    govde = JSON.parse(hamGovde)
  } catch (e) {
    return NextResponse.json(
      { hata: `Gövde geçerli JSON değil: ${(e as Error).message}` },
      { status: 400 },
    )
  }
  if (Array.isArray(govde) && govde.length === 0) {
    return NextResponse.json({ hata: 'Boş dizi gönderildi.' }, { status: 400 })
  }

  // ── 4. Alım hattı ──
  let sonuc
  try {
    sonuc = await olaylariAl({
      depo: d,
      govde,
      adapterAdi: req.headers.get('x-storeos-adapter'),
      aktor: `partner:${istemciIp(req)}`,
      aktorTipi: 'partner',
      kaynak: 'api',
      ip: istemciIp(req),
    })
  } catch (e) {
    console.error('[storeos] olay alim hatasi', e)
    return NextResponse.json(
      { hata: 'Olay işlenirken beklenmeyen hata. Tekrar deneyin.', tekrarDenenebilir: true },
      { status: 500 },
    )
  }

  const govdeCevap = {
    kabul: sonuc.kabul,
    yinelenen: sonuc.yinelenen,
    reddedilen: sonuc.reddedilen,
    adapter: sonuc.adapter,
    sonuclar: sonuc.sonuclar,
  }

  if (sonuc.kabul > 0) return NextResponse.json(govdeCevap, { status: 202 })
  if (sonuc.reddedilen > 0 && sonuc.yinelenen === 0) return NextResponse.json(govdeCevap, { status: 400 })
  return NextResponse.json(govdeCevap, { status: 200 })
}

/** Sözleşme dışı metotlar — partner yanlış metot kullanırsa sessiz kalmasın. */
export async function GET() {
  return NextResponse.json(
    { hata: 'Bu uç nokta yalnız POST kabul eder. Sözleşme: docs/gratis/olay-sozlesmesi.md' },
    { status: 405 },
  )
}
