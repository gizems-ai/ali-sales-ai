import { getMusterilerIzni, buildMusterilerFormula } from '@/lib/musteriler-izin'
import { getFirmalarSayfasi, getDashboardCounts } from '@/lib/airtable'
import { getBrifing, type BrifingData } from '@/lib/brifing'
import { getKullanicıProfili, getTenantConfigFromRequest } from '@/lib/yetki'
import { type TenantConfig } from '@/lib/tenants'
import { redirect } from 'next/navigation'
import { AjandaClient } from './_components/ajanda-client'

export const dynamic = 'force-dynamic'

function getSicakKpi(d: BrifingData | null, temsilciFilter?: string, cfg?: TenantConfig): number {
  if (!d) return 0
  if (temsilciFilter && cfg) {
    const t = cfg.temsilciler.find(x => x.ad === temsilciFilter)
    if (t) return d.temsilci[t.slug]?.hot ?? d.sicak_firsatlar
  }
  return d.sicak_firsatlar
}

export default async function AjandaPage() {
  const [izin, profil, cfg] = await Promise.all([
    getMusterilerIzni(),
    getKullanicıProfili(),
    getTenantConfigFromRequest(),
  ])
  if (!cfg) redirect('/login')

  if (izin.tip === 'yok') {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-lg font-semibold text-gray-900 mb-4">Ajanda</h1>
        <div className="rounded-xl border border-dashed border-red-200 bg-red-50 p-12 flex flex-col items-center justify-center text-center">
          <p className="text-sm font-medium text-red-600">Yetkiniz tanımlı değil</p>
          <p className="text-xs text-red-400 mt-1">Bu sayfayı görüntülemek için yöneticinizle iletişime geçin.</p>
        </div>
      </div>
    )
  }

  const temsilciFilter = izin.tip === 'temsilci' ? izin.temsilci : undefined
  // Ajanda her zaman Bugün Aranacak = TRUE ile başlar
  const formula = buildMusterilerFormula(izin, { bugun: true }, cfg)

  const [{ records, offset }, brifingData, counts] = await Promise.all([
    getFirmalarSayfasi(formula, undefined, 0, cfg),
    getBrifing(cfg),
    getDashboardCounts(temsilciFilter, cfg),
  ])
  const isAdmin = profil?.rol === 'admin'
  const sicakKpi = getSicakKpi(brifingData, temsilciFilter, cfg)

  return (
    <AjandaClient
      izin={izin}
      initialRecords={records}
      initialOffset={offset}
      brifingData={brifingData}
      counts={counts}
      sicakKpi={sicakKpi}
      isAdmin={isAdmin}
    />
  )
}
