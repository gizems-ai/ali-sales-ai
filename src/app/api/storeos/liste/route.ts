// ════════════════════════════════════════════════════════════════════════════
//  GET /api/storeos/liste?gorunum=alarmlar|gorevler|denetim
//
//  ÜÇ DETAY EKRANININ TEK UÇ NOKTASI. Panonun `/api/storeos/dashboard`'ına
//  DOKUNULMADI: o sözleşme çalışıyor ve demonun ana ekranı ona bağlı. Detay
//  ekranları için oraya alan eklemek, her yeni ekranda çalışan panoyu riske
//  atmak olurdu.
//
//  Disiplin aynı: ekran başına TEK istek. Filtre düğmeleri, tablo ve altbilgi
//  ayrı ayrı istek atmaz — hepsi bu yanıttan beslenir.
//
//  Parametreler
//    gorunum   zorunlu · alarmlar | gorevler | denetim
//    severity  yalnız alarmlar · hepsi | info | low | medium | high | critical
//    durum     yalnız gorevler · hepsi | acik | gecikmis | tamamlandi
//    entity    olay id / görev no — ekranlar arası derin bağlantı
//    q         serbest metin
//
//  GEÇERSİZ FİLTRE = 400 DEĞİL, VARSAYILANA DÜŞME. Gerekçe: bu parametreler
//  URL'de taşınıyor ve jüri demosunda birinin elle URL düzenlemesi ekranı
//  kırmamalı. Görünüm adı ise ZORUNLU ve geçersizse 400 — çünkü hangi veriyi
//  döndüreceğimizi tahmin edemeyiz.
//
//  GÜVENLİK: /api/* middleware'de public (mevcut davranış, değiştirmiyoruz) →
//  kontrol burada. Host sınırı + Clerk oturumu. `dashboard` ile aynı desen.
// ════════════════════════════════════════════════════════════════════════════

import { auth } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import { depo } from '@/lib/storeos/depo'
import { env } from '@/lib/storeos/env'
import { storeosHostuMu } from '@/lib/storeos/host-guard'
import { listeTopla } from '@/lib/storeos/liste/toplayici'
import { filtreCoz, gorunumMu } from '@/lib/storeos/liste/tipler'
import type { ListeHatasi } from '@/lib/storeos/liste/tipler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function hata(mesaj: string, durum: number, tekrarDenenebilir: boolean): Response {
  const govde: ListeHatasi = { hata: mesaj, tekrarDenenebilir }
  return Response.json(govde, { status: durum })
}

export async function GET(istek: Request): Promise<Response> {
  const host = (await headers()).get('host') ?? ''
  if (!storeosHostuMu(host, env.prodMu)) return hata('Not found', 404, false)

  const { userId } = await auth()
  // Yetkisiz istemcinin tekrar denemesi anlamsız — kalıcı hata.
  if (!userId) return hata('Oturum gerekli', 403, false)

  const parametreler = new URL(istek.url).searchParams
  const gorunum = parametreler.get('gorunum')
  if (!gorunumMu(gorunum)) return hata(`Gecersiz gorunum: ${gorunum ?? '(yok)'}`, 400, false)

  try {
    const veri = await listeTopla({
      depo: depo(),
      magazaKodu: env.magazaKodu,
      gorunum,
      filtre: filtreCoz(ad => parametreler.get(ad)),
    })
    return Response.json(veri, {
      // Anket eden bir uç nokta; ara katman önbelleği yanıtı dondurmasın.
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (e) {
    // Airtable 429/5xx buraya düşer. İstemci geri çekilerek tekrar dener.
    const mesaj = e instanceof Error ? e.message : 'Bilinmeyen hata'
    console.error('[storeos] liste toplama hatasi:', { gorunum, mesaj })
    return hata('Veri alinamadi', 502, true)
  }
}
