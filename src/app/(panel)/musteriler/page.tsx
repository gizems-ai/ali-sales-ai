import { getMusterilerIzni, buildMusterilerFormula } from '@/lib/musteriler-izin'
import { getFirmalarSayfasi, getDashboardCounts } from '@/lib/airtable'
import { getBrifing, type BrifingData } from '@/lib/brifing'
import { getKullanicıProfili, getTenantConfigFromRequest } from '@/lib/yetki'
import { type TenantConfig } from '@/lib/tenants'
import { MusterilerClient } from './_components/musteriler-client'
import { getSegment } from '@/lib/emlak-segment'
import { BIREYSEL_MUSTERILER } from '@/lib/emlak-fixtures'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ modal?: string; oncelik?: string; bugun?: string; asama?: string; brans?: string; [k: string]: string | undefined }>

function getSicakKpi(d: BrifingData | null, temsilciFilter?: string, cfg?: TenantConfig): number {
  if (!d) return 0
  if (temsilciFilter && cfg) {
    const t = cfg.temsilciler.find(x => x.ad === temsilciFilter)
    if (t) return d.temsilci[t.slug]?.hot ?? d.sicak_firsatlar
  }
  return d.sicak_firsatlar
}

export default async function MusterilerPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const initialModalId =
    sp.modal && /^rec[A-Za-z0-9]+$/.test(sp.modal) ? sp.modal : undefined

  const GECERLI_ONCELIK = ['Yüksek', 'Orta', 'Normal', 'Düşük']
  const GECERLI_ASAMA   = ['Ulaşılamadı', 'Yanıt Alındı', 'Randevu', 'Teklif', 'Müzakere', 'Kazanıldı', 'Kaybedildi']
  const GECERLI_BRANS   = ['saglik', 'elementer', 'acibadem', 'crosssell'] as const
  const initialFilters = {
    oncelik: sp.oncelik && GECERLI_ONCELIK.includes(sp.oncelik) ? sp.oncelik : undefined,
    bugun:   sp.bugun === 'true' ? true : undefined,
    asama:   sp.asama && GECERLI_ASAMA.includes(sp.asama) ? sp.asama : undefined,
    brans:   sp.brans && GECERLI_BRANS.includes(sp.brans as typeof GECERLI_BRANS[number]) ? sp.brans : undefined,
  }

  const [izin, profil, cfg, segment] = await Promise.all([
    getMusterilerIzni(),
    getKullanicıProfili(),
    getTenantConfigFromRequest(),
    getSegment(),
  ])
  if (!cfg) return null

  if (izin.tip === 'yok') {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-lg font-semibold text-gray-900 mb-4">Müşteriler</h1>
        <div className="rounded-xl border border-dashed border-red-200 bg-red-50 p-12 flex flex-col items-center justify-center text-center">
          <p className="text-sm font-medium text-red-600">Yetkiniz tanımlı değil</p>
          <p className="text-xs text-red-400 mt-1">Bu sayfayı görüntülemek için yöneticinizle iletişime geçin.</p>
        </div>
      </div>
    )
  }

  const isEmlak = cfg.id === 'emlak_demo'
  const isBireysel = isEmlak && segment === 'bireysel'

  const temsilciFilter = izin.tip === 'temsilci' ? izin.temsilci : undefined

  // Bireysel segmentte fixture verisi kullanılır — Airtable'a hiç gidilmez
  let records, offset: string | undefined, brifingData, counts
  if (isBireysel) {
    records = BIREYSEL_MUSTERILER
    offset = undefined
    brifingData = null
    counts = {
      sessizlesenler: 1, crossSellUygun: 2, yenilemeriski: 0,
      teklifSessiz: 1, bugunAranacak: 3, yanitBekleyen: 2,
    }
  } else {
    const formula = buildMusterilerFormula(izin, {}, cfg)
    ;([{ records, offset }, brifingData, counts] = await Promise.all([
      getFirmalarSayfasi(formula, undefined, 0, cfg),
      getBrifing(cfg),
      getDashboardCounts(temsilciFilter, cfg),
    ]))
  }

  const isAdmin = profil?.rol === 'admin'
  const sicakKpi = getSicakKpi(brifingData, temsilciFilter, cfg)

  return (
    <MusterilerClient
      izin={izin}
      initialRecords={records}
      initialOffset={offset}
      brifingData={brifingData}
      counts={counts}
      sicakKpi={sicakKpi}
      initialModalId={initialModalId}
      initialFilters={initialFilters}
      isAdmin={isAdmin}
      isEmlak={isEmlak}
      isBireysel={isBireysel}
      displayAdMap={Object.fromEntries(cfg.temsilciler.filter(t => t.displayAd).map(t => [t.ad, t.displayAd!]))}
    />
  )
}
