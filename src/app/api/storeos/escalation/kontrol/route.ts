// ════════════════════════════════════════════════════════════════════════════
//  POST /api/storeos/escalation/kontrol — süresi geçmiş görevleri yukarı taşı
//
//  İKİ ÇAĞIRAN, İKİ KİMLİK:
//   · Cron / makine → Authorization: Bearer <STOREOS_CRON_TOKEN>
//     (token tanımlı değilse bu yol KAPALI; sessizce açık bırakmıyoruz)
//   · Demo kontrol paneli → Clerk oturumu + Store OS kullanıcısı
//
//  Idempotent: aynı görev + aynı kademe iki kez tetiklenmez (bildirim.ts).
//  Bu yüzden uç noktayı arka arkaya çağırmak zararsızdır — jüri demosunda
//  düğmeye iki kez basılması ikinci mesajı DOĞURMAZ.
//
//  Durum kodları
//    200  kontrol koştu (hiç eskalasyon çıkmasa da 200 — "koştu ve temizdi")
//    401  makine yolu: token yanlış
//    403  panel yolu: oturum yok / Store OS'te tanımsız kullanıcı
//    500  beklenmeyen
// ════════════════════════════════════════════════════════════════════════════

import { auth } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import { depo } from '@/lib/storeos/depo'
import { env } from '@/lib/storeos/env'
import { eskalasyonKontrol } from '@/lib/storeos/eskalasyon'
import { storeosHostuMu } from '@/lib/storeos/host-guard'
import { kanal } from '@/lib/storeos/kanal'
import { clerkKullanicisi } from '@/lib/storeos/yetki'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function bearer(istek: Request): string {
  const b = istek.headers.get('authorization') ?? ''
  return b.startsWith('Bearer ') ? b.slice(7).trim() : ''
}

export async function POST(istek: Request): Promise<Response> {
  const d = depo()
  const token = bearer(istek)

  // ── Makine yolu ──
  if (token) {
    if (!env.cronToken || token !== env.cronToken) {
      return Response.json({ hata: 'Yetkisiz.' }, { status: 401 })
    }
  } else {
    // ── Panel yolu ──
    const host = (await headers()).get('host') ?? ''
    if (!storeosHostuMu(host, env.prodMu)) return Response.json({ hata: 'Not found' }, { status: 404 })
    const { userId } = await auth()
    if (!userId) return Response.json({ hata: 'Oturum gerekli' }, { status: 403 })
    const kullanici = await clerkKullanicisi(d, userId)
    if (!kullanici) {
      return Response.json(
        { hata: 'Bu hesap Store OS kullanıcı listesinde tanımlı değil.' },
        { status: 403 },
      )
    }
  }

  try {
    const rapor = await eskalasyonKontrol({
      depo: d, kanal: kanal(), magazaKodu: env.magazaKodu,
    })
    return Response.json(rapor, { status: 200 })
  } catch (e) {
    console.error('[storeos] eskalasyon kontrol hatasi', e)
    return Response.json(
      { hata: 'Eskalasyon kontrolü sırasında beklenmeyen hata.', tekrarDenenebilir: true },
      { status: 500 },
    )
  }
}

export async function GET() {
  return Response.json({ hata: 'Bu uç nokta yalnız POST kabul eder.' }, { status: 405 })
}
