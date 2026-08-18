// ════════════════════════════════════════════════════════════════════════════
//  /api/storeos/demo — DEMO KONTROL PANELİNİN ARKASI
//
//  GET   → sağlık: kanal, WhatsApp yapılandırması, telefon kilidi, son
//          gönderimlerin durumu, depo/tohum bilgisi
//  POST  → { eylem: 'senaryo' | 'tohum' | 'sifirla' | 'yanit' }
//
//  TEK ROUTE, TEK KAPI: dört ayrı dosya dört ayrı yetki kontrolü demekti;
//  biri unutulursa demo sıfırlama ucu herkese açık kalırdı. Kimlik
//  `yonetim-kimlik.ts`'te, burada bir kez çağrılır.
//
//  ── BU UÇ NOKTA GERÇEK ZİNCİRİ KOŞAR ───────────────────────────────────────
//  Senaryo düğmesi sahte alarm satırı YAZMAZ; olayı `olaylariAl`'a verir —
//  adapter, doğrulama, idempotency, kural motoru, görev, bildirim, denetim.
//  Yani jüri önünde tetiklenen olay, partnerin göndereceği olayla aynı yoldan
//  geçer. Tek fark imza katmanıdır (istek zaten kimlikli): imza yolunun kanıtı
//  `scripts/storeos/olay-simulatoru.ts --url=…` ve kontrol koşucusundadır.
//
//  ── SIFIRLAMA SINIRI (bilinçli) ────────────────────────────────────────────
//  Airtable deposu uygulama içinden SIFIRLANMAZ (depo/airtable.ts). Prod'da
//  'sifirla' bu yüzden 409 döner ve doğru düğmeyi söyler: "taze tohum".
//  Zaman damgası donması zaten silmeyle değil YENİ parti yazmakla çözülür;
//  denetim defteri append-only kalır.
// ════════════════════════════════════════════════════════════════════════════

import { panoyuTohumla } from '@/lib/storeos/demo-tohum'
import { env } from '@/lib/storeos/env'
import { depoHazir } from '@/lib/storeos/hazirlik'
import { yanitiIsle } from '@/lib/storeos/inbound'
import { kanal } from '@/lib/storeos/kanal'
import { sahteButonYaniti } from '@/lib/storeos/kanal/sahte-inbound'
import { butonAksiyonuMu } from '@/lib/storeos/kanal/tipler'
import type { ButonAksiyonu } from '@/lib/storeos/kanal/tipler'
import { kilitDurumu } from '@/lib/storeos/kanal/telefon-kilidi'
import { olaylariAl } from '@/lib/storeos/olay-alim'
import { TANIMLAR, olayId, senaryoMu } from '@/lib/storeos/senaryolar'
import { yoneticiMi } from '@/lib/storeos/yonetim-kimlik'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Numaranın son dört hanesi dışında hepsini gizler — ekran görüntüsü alınır. */
function maskele(t: string): string {
  const s = t.trim()
  if (s.length < 5) return s ? '••••' : ''
  return `${s.slice(0, 3)}••••${s.slice(-4)}`
}

// ─── Sağlık ──────────────────────────────────────────────────────────────────

export async function GET(istek: Request): Promise<Response> {
  const d = await depoHazir()
  const { red } = await yoneticiMi(istek, d)
  if (red) return red

  const kilit = kilitDurumu()
  const webhook = env.n8nGidenWebhookVarsa
  let webhookHost = ''
  try { webhookHost = webhook ? new URL(webhook).host : '' } catch { webhookHost = '(geçersiz URL)' }

  // Son gönderimler = hattın CANLI kanıtı. Yapılandırma "doğru görünüyor"
  // olabilir ama son beş mesaj 'hata' ise hat düşüktür; ikisini birlikte
  // gösteriyoruz çünkü yalnız yapılandırmaya bakmak prova sabahı yanıltır.
  const bildirimler = (await d.bildirimler.listele({ limit: 5 })).map(b => ({
    bildirimId: b['Bildirim ID'],
    gorevNo: b['Gorev No'] ?? null,
    kanal: b['Kanal'],
    durum: b['Durum'],
    zaman: b['Gonderim Zamani'],
    gidenTelefon: maskele(b['Gonderilen Telefon'] ?? b['Alici Telefon']),
    hata: b['Hata'] ?? null,
    yanit: b['Yanit'] ?? null,
  }))

  const sonHata = bildirimler.find(b => b.durum === 'hata') ?? null
  const sorunlar: string[] = []
  if (env.kanal === 'whatsapp' && !webhook) sorunlar.push('STOREOS_N8N_WA_WEBHOOK_URL tanımlı değil — mesaj çıkamaz.')
  if (env.kanal === 'whatsapp' && !env.n8nGidenToken) sorunlar.push('STOREOS_N8N_WA_TOKEN boş — n8n 401 döndürür.')
  if (kilit.engel) sorunlar.push(kilit.engel)
  if (!kilit.acik) sorunlar.push('DEMO TELEFON KİLİDİ KAPALI — mesajlar gerçek alıcılara gider.')
  if (sonHata) sorunlar.push(`Son gönderimlerden biri hatalı: ${sonHata.hata ?? 'sebep yazılmamış'}`)

  return Response.json({
    olculdu: new Date().toISOString(),
    kanal: env.kanal,
    depo: d.ad,
    magazaKodu: env.magazaKodu,
    whatsapp: {
      webhookTanimli: !!webhook,
      webhookHost,
      tokenTanimli: !!env.n8nGidenToken,
      inboundTokenTanimli: !!process.env.STOREOS_WA_INBOUND_TOKEN,
    },
    telefonKilidi: {
      acik: kilit.acik,
      hedef: maskele(kilit.hedef),
      engel: kilit.engel,
    },
    sonBildirimler: bildirimler,
    sorunlar,
    // Yeşil ışık: mesajın çıkabileceği YAPILANDIRILMIŞ ve son gönderim hatasız.
    saglikli: sorunlar.length === 0,
  }, { headers: { 'Cache-Control': 'no-store' } })
}

// ─── Eylemler ────────────────────────────────────────────────────────────────

export async function POST(istek: Request): Promise<Response> {
  const d = await depoHazir()
  const { red, aktor } = await yoneticiMi(istek, d)
  if (red) return red

  let govde: Record<string, unknown>
  try {
    govde = (await istek.json()) as Record<string, unknown>
  } catch {
    return Response.json({ hata: 'Gövde geçerli JSON değil.' }, { status: 400 })
  }

  const eylem = String(govde.eylem ?? '')

  // ── 1. Senaryo tetikle ──
  if (eylem === 'senaryo') {
    if (!senaryoMu(govde.senaryo)) {
      return Response.json({ hata: `Bilinmeyen senaryo: ${String(govde.senaryo)}` }, { status: 400 })
    }
    const t = TANIMLAR[govde.senaryo]
    const vendorMu = govde.vendor === true
    const ms = Date.now()
    // Panelde her tıklama YENİ olaydır: damga milisaniyelik. Idempotency'nin
    // kanıtı ayrı düğmede (aynı olayı tekrar gönder), kazara değil.
    const id = olayId(t.ad, String(ms), 1)
    const sonuc = await olaylariAl({
      depo: d,
      govde: vendorMu ? t.vendor(id, ms) : t.kanonik(id, ms),
      adapterAdi: vendorMu ? 'ornek-vendor' : 'generic',
      aktor: `panel:${aktor}`,
      aktorTipi: 'kullanici',
      kaynak: 'panel',
      kanal: kanal(),
    })
    return Response.json({
      eylem, senaryo: t.ad, faz: t.faz, bicim: vendorMu ? 'vendor' : 'kanonik',
      olayId: id, sonuc,
    })
  }

  // ── 2. Tekrar gönder (idempotency kanıtı) ──
  if (eylem === 'tekrar') {
    if (typeof govde.olayId !== 'string' || !govde.olayId) {
      return Response.json({ hata: 'olayId gerekli.' }, { status: 400 })
    }
    if (!senaryoMu(govde.senaryo)) {
      return Response.json({ hata: `Bilinmeyen senaryo: ${String(govde.senaryo)}` }, { status: 400 })
    }
    const t = TANIMLAR[govde.senaryo]
    const ms = Number(govde.ms) || Date.now()
    const sonuc = await olaylariAl({
      depo: d, govde: t.kanonik(govde.olayId, ms), adapterAdi: 'generic',
      aktor: `panel:${aktor}`, aktorTipi: 'kullanici', kaynak: 'panel', kanal: kanal(),
    })
    return Response.json({ eylem, olayId: govde.olayId, sonuc })
  }

  // ── 3. Taze tohum ──
  if (eylem === 'tohum') {
    // Etiket SUNUCU saatinden: prova sabahı iki tıklama iki farklı parti yazar,
    // aynı dakika içindeyse ikincisi "yinelenen" döner (ve bunu söyler).
    const etiket = typeof govde.etiket === 'string' && govde.etiket.trim()
      ? govde.etiket.trim().slice(0, 24).replace(/[^a-zA-Z0-9_-]/g, '')
      : `p${new Date().toISOString().slice(11, 16).replace(':', '')}`
    const sonuc = await panoyuTohumla(d, undefined, etiket)
    return Response.json({
      eylem, etiket, sonuc,
      not: sonuc.kabul === 0
        ? 'Hiç yeni kayıt yazılmadı — bu etiketle zaten yazılmış. Farklı bir etiket verin.'
        : 'Taze parti yazıldı; eski parti silinmedi (denetim defteri append-only).',
    })
  }

  // ── 4. Sıfırla (yalnız bellek deposu) ──
  if (eylem === 'sifirla') {
    try {
      await d.sifirla()
      return Response.json({ eylem, depo: d.ad, not: 'Depo sıfırlandı.' })
    } catch (e) {
      return Response.json({
        hata: e instanceof Error ? e.message : 'Sıfırlama başarısız.',
        kod: 'sifirlanamaz',
        oneri: 'Kalıcı depoda sıfırlama yoktur. Zaman damgası donmasını "Taze tohum" düğmesi çözer.',
      }, { status: 409 })
    }
  }

  // ── 5. WhatsApp yanıtını simüle et ──
  if (eylem === 'yanit') {
    const aksiyon: ButonAksiyonu = butonAksiyonuMu(govde.aksiyon) ? govde.aksiyon : 'kabul'
    const gorevNo = typeof govde.gorevNo === 'string' && govde.gorevNo ? govde.gorevNo : undefined

    // Hangi bildirime yanıt veriyoruz: verilen görevin sonuncusu, yoksa
    // sistemin en son gönderdiği bildirim. Gerçek kullanıcı da elindeki SON
    // mesajın butonuna basar.
    const adaylar = await d.bildirimler.listele(gorevNo ? { gorevNo, limit: 5 } : { limit: 5 })
    const b = adaylar.find(x => x['Saglayici Mesaj ID'] && x['Gorev No'])
    if (!b) {
      return Response.json({
        hata: gorevNo
          ? `${gorevNo} için sağlayıcı mesaj id'si olan bir bildirim yok.`
          : 'Yanıtlanacak bildirim yok — önce bir senaryo tetikleyin.',
        kod: 'bildirim_yok',
      }, { status: 409 })
    }

    const yanit = sahteButonYaniti({
      gorevNo: b['Gorev No'] as string,
      aksiyon,
      bildirimId: b['Bildirim ID'],
      saglayiciMesajId: b['Saglayici Mesaj ID'] as string,
      // Numara kapısı GERÇEKTEN gönderilen numarayla karşılaştırır: kilit
      // açıkken yanıt demo telefonundan gelir, görev sahibinin numarasından
      // değil. Burada da öyle davranıyoruz, yoksa kendi kapımıza takılırdık.
      gonderenTelefon: b['Gonderilen Telefon'] ?? b['Alici Telefon'],
    })

    const sonuc = await yanitiIsle({ depo: d, kanal: kanal(), yanit, kaynak: 'simulator' })
    return Response.json({ eylem, bildirimId: b['Bildirim ID'], gorevNo: b['Gorev No'], aksiyon, sonuc })
  }

  return Response.json(
    { hata: `Bilinmeyen eylem: ${eylem}. Geçerli: senaryo, tekrar, tohum, sifirla, yanit.` },
    { status: 400 },
  )
}
