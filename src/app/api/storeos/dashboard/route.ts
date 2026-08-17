// ════════════════════════════════════════════════════════════════════════════
//  GET /api/storeos/dashboard?katman=canli|yavas|tam
//
//  PANONUN TEK UÇ NOKTASI. Kartlar, grafikler, listeler kendi isteğini ATMAZ —
//  hepsi bu yanıttan beslenir. Gerekçe: on beş bileşen × iki saniyelik anket =
//  Airtable istek bütçesinin (base başına ~5 istek/sn) anında tükenmesi.
//
//  Katmanlar (madde: iki kademeli anket)
//    canli — alarmlar + görevler          → istemci 2 sn'de bir çeker
//    yavas — KPI, grafikler, personel     → istemci 30 sn'de bir çeker
//    tam   — ikisi birden                 → yalnız ilk yükleme
//
//  GÜVENLİK: /api/* middleware'de public (mevcut davranış, değiştirmiyoruz) →
//  kontrol burada. Host sınırı + Clerk oturumu. `saglik` route'uyla aynı desen.
// ════════════════════════════════════════════════════════════════════════════

import { auth } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import { panoTopla } from '@/lib/storeos/dashboard/toplayici'
import { katmanMi } from '@/lib/storeos/dashboard/tipler'
import type { PanoHatasi } from '@/lib/storeos/dashboard/tipler'
import { depoHazir } from '@/lib/storeos/hazirlik'
import { env } from '@/lib/storeos/env'
import { storeosHostuMu } from '@/lib/storeos/host-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function hata(mesaj: string, durum: number, tekrarDenenebilir: boolean): Response {
  const govde: PanoHatasi = { hata: mesaj, tekrarDenenebilir }
  return Response.json(govde, { status: durum })
}

export async function GET(istek: Request): Promise<Response> {
  const host = (await headers()).get('host') ?? ''
  if (!storeosHostuMu(host, env.prodMu)) return hata('Not found', 404, false)

  const { userId } = await auth()
  // Yetkisiz istemcinin 2 saniyede bir yeniden denemesi anlamsız — kalıcı hata.
  if (!userId) return hata('Oturum gerekli', 403, false)

  const ham = new URL(istek.url).searchParams.get('katman') ?? 'tam'
  if (!katmanMi(ham)) return hata(`Gecersiz katman: ${ham}`, 400, false)

  const magazaKodu = env.magazaKodu

  try {
    const veri = await panoTopla({ depo: await depoHazir(), magazaKodu, katman: ham })
    return Response.json(veri, {
      // Anket eden bir uç nokta; ara katman önbelleği yanıtı dondurmasın.
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (e) {
    // Airtable 429/5xx buraya düşer. İstemci geri çekilerek tekrar dener.
    const mesaj = e instanceof Error ? e.message : 'Bilinmeyen hata'
    console.error('[storeos] pano toplama hatasi:', mesaj)
    return hata('Veri alinamadi', 502, true)
  }
}
