// ════════════════════════════════════════════════════════════════════════════
//  POST /api/storeos/gorev/<GorevNo>/durum — panelden görev durumu değiştirme
//
//  Gövde: { hedef: GorevDurumu, beklenenDurum?: GorevDurumu, not?: string,
//           yeniAtanan?: string }
//
//  Durum kodları
//    200  geçiş uygulandı
//    400  gövde bozuk / hedef durum tanınmıyor
//    403  Clerk oturumu yok, kullanıcı Store OS'te tanımsız, ya da yetkisiz
//    404  görev yok (yanlış host da 404 — varlığını sızdırmayız)
//    409  ÇAKIŞMA (ekran bayat) veya geçersiz geçiş — ikisi de "şu an olmaz"
//    500  beklenmeyen
//
//  409'un iki sebebi ayrı `kod` alanıyla döner (`cakisma` / `gecersiz_gecis`);
//  ekran mesajı ona göre seçer. HTTP kodunu ayırmadık çünkü istemci davranışı
//  ikisinde de aynı: tazele ve tekrar göster.
//
//  YETKİ: Clerk KİMLİK verir, yetkiyi `Kullanicilar.Rol` belirler (yetki.ts).
//  Clerk'te oturumu olan ama Store OS'te tanımlı olmayan kullanıcı REDDEDİLİR.
// ════════════════════════════════════════════════════════════════════════════

import { auth } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import { depo } from '@/lib/storeos/depo'
import { DENETIM_AKSIYONLARI, denetimYaz } from '@/lib/storeos/denetim'
import { env } from '@/lib/storeos/env'
import { gecisYap, gorevErtele } from '@/lib/storeos/gorev'
import { storeosHostuMu } from '@/lib/storeos/host-guard'
import { GOREV_DURUMLARI } from '@/lib/storeos/tipler'
import type { GorevDurumu } from '@/lib/storeos/tipler'
import { clerkKullanicisi, gorevYetkisi } from '@/lib/storeos/yetki'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function durumMu(x: unknown): x is GorevDurumu {
  return typeof x === 'string' && (GOREV_DURUMLARI as readonly string[]).includes(x)
}

export async function POST(
  istek: Request,
  ctx: { params: Promise<{ gorevNo: string }> },
): Promise<Response> {
  const host = (await headers()).get('host') ?? ''
  if (!storeosHostuMu(host, env.prodMu)) return Response.json({ hata: 'Not found' }, { status: 404 })

  const { userId } = await auth()
  if (!userId) return Response.json({ hata: 'Oturum gerekli' }, { status: 403 })

  const { gorevNo } = await ctx.params
  const d = depo()

  let govde: Record<string, unknown>
  try {
    govde = (await istek.json()) as Record<string, unknown>
  } catch {
    return Response.json({ hata: 'Gövde geçerli JSON değil.' }, { status: 400 })
  }

  const gorev = await d.gorevler.getir(gorevNo)
  if (!gorev) return Response.json({ hata: `Görev bulunamadı: ${gorevNo}` }, { status: 404 })

  // ── Yetki ──
  const kullanici = await clerkKullanicisi(d, userId)
  const yetki = gorevYetkisi(kullanici, gorev)
  if (!yetki.izinli) {
    // Reddedilen deneme de denetime yazılır: "kim neyi denedi" izi kalsın.
    await denetimYaz(d, {
      aktor: kullanici?.['Kullanici ID'] ?? `clerk:${userId}`,
      aktorTipi: 'kullanici',
      aksiyon: DENETIM_AKSIYONLARI.gorevYetkiRed,
      entityTipi: 'gorev', entityId: gorevNo,
      sonrasi: { kod: yetki.kod, sebep: yetki.sebep, istenen: govde.hedef },
      kaynak: 'panel',
    })
    return Response.json({ hata: yetki.sebep, kod: yetki.kod }, { status: 403 })
  }

  const aktor = yetki.kullanici['Kullanici ID']
  const beklenenDurum = durumMu(govde.beklenenDurum) ? govde.beklenenDurum : undefined

  // ── Erteleme ayrı bir fiil: durum değiştirmez, son teslimi öteler ──
  if (govde.hedef === 'ertele') {
    const e = await gorevErtele(d, {
      gorevNo, aktor, aktorTipi: 'kullanici', kaynak: 'panel',
    })
    if (!e.basarili) return Response.json({ hata: e.sebep, kod: e.kod }, { status: 409 })
    return Response.json({ gorev: e.gorev, yeniSonTeslim: e.yeniSonTeslim, ertelendi: true })
  }

  if (!durumMu(govde.hedef)) {
    return Response.json(
      { hata: `Tanınmayan hedef durum: ${String(govde.hedef)}. Geçerli: ${GOREV_DURUMLARI.join(', ')}, ertele.` },
      { status: 400 },
    )
  }

  const sonuc = await gecisYap(d, {
    gorevNo, hedef: govde.hedef, beklenenDurum,
    yeniAtanan: typeof govde.yeniAtanan === 'string' ? govde.yeniAtanan : undefined,
    not: typeof govde.not === 'string' ? govde.not : undefined,
    aktor, aktorTipi: 'kullanici', kaynak: 'panel',
  })

  if (!sonuc.basarili) {
    const durum = sonuc.kod === 'bulunamadi' ? 404 : 409
    return Response.json({ hata: sonuc.sebep, kod: sonuc.kod }, { status: durum })
  }

  return Response.json({ gorev: sonuc.gorev })
}

export async function GET() {
  return Response.json({ hata: 'Bu uç nokta yalnız POST kabul eder.' }, { status: 405 })
}
