// ════════════════════════════════════════════════════════════════════════════
//  GET /api/storeos/olcum — SÜREKLİ ANKET YÜKÜ (Gün 8, kabul kriteri 1)
//
//  Soru: "panel açıkken Airtable'a saniyede kaç istek gidiyor ve 5 istek/sn
//  limitine ne kadar marj var?" Cevap TAHMİNLE verilemez; ölçülmesi gerekir
//  ve PROD'da ölçülmesi gerekir — yereldeki depo `bellek` olabilir, ağ farklı,
//  soğuk başlangıç farklı.
//
//  ── NEDEN SUNUCU TARAFINDA ÖLÇÜYORUZ ───────────────────────────────────────
//  Tarayıcıdan sayılabilecek tek şey BİZİM uçlarımıza giden istektir; asıl
//  darboğaz onların ARKASINDAKİ Airtable istekleridir (bir pano turu tek HTTP
//  isteğidir ama birden çok tablo okur). `airtable.ts` içindeki sayaç bunu
//  sayar; bu uç iki okuma arasındaki farkı raporlar.
//
//  ── SOĞUK / SICAK ──────────────────────────────────────────────────────────
//  İlk tur referans tablolarını (kullanıcılar, kurallar) da çeker. Sürekli yük
//  SICAK turdur; ikisini de raporluyoruz ki "ölçümü ısınmadan aldın" itirazı
//  kapansın.
//
//  ── SENARYOLAR ─────────────────────────────────────────────────────────────
//  Aralıklar `lib/storeos/anket.ts`'ten okunur — ekranın gerçekten kullandığı
//  sabitler. Beyan ile ölçüm ayrışamaz: aralık değişirse bu rapor da değişir.
//
//  Yetki: `yonetim-kimlik.ts` (cron token ya da yönetici oturumu).
//  Bu uç Airtable'a GERÇEK istek atar — ölçüm sırasında panel açıksa sayılar
//  ikisinin toplamıdır; script bunu uyarı olarak yazar.
// ════════════════════════════════════════════════════════════════════════════

import { istekSayaci, SANIYEDE_ISTEK_TAVANI } from '@/lib/storeos/airtable'
import { LISTE_ARALIK, PANO_ARALIK } from '@/lib/storeos/anket'
import { panoTopla } from '@/lib/storeos/dashboard/toplayici'
import { depoHazir } from '@/lib/storeos/hazirlik'
import { env } from '@/lib/storeos/env'
import { listeTopla } from '@/lib/storeos/liste/toplayici'
import type { Gorunum, ListeFiltresi } from '@/lib/storeos/liste/tipler'
import { yoneticiMi } from '@/lib/storeos/yonetim-kimlik'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Airtable'ın base başına yayınladığı sert limit. Marj buna göre hesaplanır. */
const AIRTABLE_LIMIT = 5

const BOS_FILTRE: ListeFiltresi = { severity: 'hepsi', durum: 'hepsi', entity: null, q: null }

interface Olcum {
  ad: string
  /** Bu turda Airtable'a giden istek sayısı. */
  istek: number
  /** Turun süresi (ms) — kullanıcının gördüğü gecikmenin sunucu payı. */
  ms: number
}

export async function GET(istek: Request): Promise<Response> {
  const d = await depoHazir()
  const { red } = await yoneticiMi(istek, d)
  if (red) return red

  const magazaKodu = env.magazaKodu
  const tur = Number(new URL(istek.url).searchParams.get('tur') ?? '3')
  const turSayisi = Number.isFinite(tur) ? Math.min(Math.max(Math.trunc(tur), 2), 5) : 3

  async function olc(ad: string, is: () => Promise<unknown>): Promise<Olcum> {
    const once = istekSayaci().istek
    const t0 = Date.now()
    await is()
    return { ad, istek: istekSayaci().istek - once, ms: Date.now() - t0 }
  }

  const soguk: Olcum[] = []
  const sicak: Olcum[] = []

  // Aynı işi `turSayisi` kez koş; ilki soğuk, sonuncusu sürekli hâl.
  for (let i = 0; i < turSayisi; i++) {
    const hedef = i === 0 ? soguk : sicak
    const turlar: Olcum[] = []
    turlar.push(await olc('pano:canli', () => panoTopla({ depo: d, magazaKodu, katman: 'canli' })))
    turlar.push(await olc('pano:yavas', () => panoTopla({ depo: d, magazaKodu, katman: 'yavas' })))
    for (const g of ['alarmlar', 'gorevler', 'denetim'] as Gorunum[]) {
      turlar.push(await olc(`liste:${g}`, () => listeTopla({ depo: d, magazaKodu, gorunum: g, filtre: BOS_FILTRE })))
    }
    // Soğuk turu ayrı tutuyoruz; sıcak turlarda aynı adın ortalamasını alacağız.
    hedef.push(...turlar)
  }

  /** Sıcak turların aynı ada ait ortalaması. Tek tur sapmasına güvenmiyoruz. */
  function ortalama(ad: string): Olcum {
    const hepsi = sicak.filter(o => o.ad === ad)
    if (hepsi.length === 0) return { ad, istek: 0, ms: 0 }
    const istekTop = hepsi.reduce((t, o) => t + o.istek, 0)
    const msTop = hepsi.reduce((t, o) => t + o.ms, 0)
    return {
      ad,
      istek: Math.round((istekTop / hepsi.length) * 100) / 100,
      ms: Math.round(msTop / hepsi.length),
    }
  }

  const panoCanli = ortalama('pano:canli')
  const panoYavas = ortalama('pano:yavas')
  const listeler: Record<Gorunum, Olcum> = {
    alarmlar: ortalama('liste:alarmlar'),
    gorevler: ortalama('liste:gorevler'),
    denetim: ortalama('liste:denetim'),
  }

  /** Bir sekmenin saniyelik Airtable yükü. */
  const panoYuku = panoCanli.istek / (PANO_ARALIK.canli / 1000)
                 + panoYavas.istek / (PANO_ARALIK.yavas / 1000)
  const listeYuku = (g: Gorunum) => listeler[g].istek / (LISTE_ARALIK[g] / 1000)

  const senaryolar = [
    { ad: 'yalnız pano (R-1 tek sekme kuralı)', reqSn: panoYuku },
    { ad: 'yalnız görevler', reqSn: listeYuku('gorevler') },
    { ad: 'pano + görevler', reqSn: panoYuku + listeYuku('gorevler') },
    {
      ad: 'pano + üç liste (kural ihlali — en kötü hâl)',
      reqSn: panoYuku + listeYuku('alarmlar') + listeYuku('gorevler') + listeYuku('denetim'),
    },
  ].map(s => ({
    ...s,
    reqSn: Math.round(s.reqSn * 100) / 100,
    marj: Math.round((AIRTABLE_LIMIT - s.reqSn) * 100) / 100,
    limitiAsar: s.reqSn > AIRTABLE_LIMIT,
  }))

  return Response.json({
    olculdu: new Date().toISOString(),
    ortam: {
      depo: d.ad,
      kanal: env.kanal,
      magazaKodu,
      prod: env.prodMu,
      // Vercel'de her lambda örneği kendi kuyruğunu tutar; ölçüm TEK örnektir.
      saniyedeIstekTavani: SANIYEDE_ISTEK_TAVANI,
      airtableLimiti: AIRTABLE_LIMIT,
    },
    aralik: { pano: PANO_ARALIK, liste: LISTE_ARALIK },
    soguk,
    sicak: { pano: [panoCanli, panoYavas], listeler: Object.values(listeler) },
    senaryolar,
    sayac: istekSayaci(),
    not: 'Ölçüm sırasında başka bir sekme açıksa sayaç ikisini birden sayar.',
  }, { headers: { 'Cache-Control': 'no-store' } })
}
