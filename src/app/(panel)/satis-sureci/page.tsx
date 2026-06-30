import { PIPELINE_ASAMALARI, getPipelineKolonu } from '@/lib/airtable'
import { getKullanicıProfili, izolasyonBelirle, getTenantConfigFromRequest } from '@/lib/yetki'
import { getMusterilerIzni } from '@/lib/musteriler-izin'
import { redirect } from 'next/navigation'
import { KanbanBoard } from './_components/kanban-board'
import { getSegment } from '@/lib/emlak-segment'
import { BIREYSEL_KANBAN } from '@/lib/emlak-fixtures'

export const revalidate = 60

type SearchParams = Promise<{ modal?: string; [k: string]: string | undefined }>

export default async function SatisSureciPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const [profil, cfg, segment] = await Promise.all([
    getKullanicıProfili(),
    getTenantConfigFromRequest(),
    getSegment(),
  ])
  if (!profil) redirect('/login')

  const sp = await searchParams
  const initialModalId =
    sp.modal && /^rec[A-Za-z0-9]+$/.test(sp.modal) ? sp.modal : undefined

  const izolasyon = izolasyonBelirle(profil)
  const temsilciFilter = izolasyon.tip === 'temsilci' ? izolasyon.ad : undefined

  const isEmlak = cfg?.id === 'emlak_demo'
  const isBireysel = isEmlak && segment === 'bireysel'

  const izin = await getMusterilerIzni()

  let initialColumns
  if (isEmlak) {
    initialColumns = PIPELINE_ASAMALARI.map(col => ({
      ...col,
      records: BIREYSEL_KANBAN.filter(r => r.fields['Atanan Temsilci'] !== undefined).filter((_, i) =>
        i % PIPELINE_ASAMALARI.length === PIPELINE_ASAMALARI.findIndex(a => a.value === col.value)
      ),
      offset: undefined,
    }))
  } else {
    const cfgResolved = cfg ?? undefined
    const results = await Promise.all(
      PIPELINE_ASAMALARI.map(col => getPipelineKolonu(col.value, undefined, temsilciFilter, cfgResolved))
    )
    initialColumns = PIPELINE_ASAMALARI.map((col, i) => ({
      ...col,
      records: results[i].records,
      offset:  results[i].offset,
    }))
  }

  const izinProp = izin.tip !== 'yok' ? izin : undefined
  const isAdmin = profil.rol === 'admin'

  return (
    <div className="space-y-0" style={isEmlak ? { padding: '24px 32px 0' } : {}}>
      {isBireysel && (
        <div className="mx-4 sm:mx-6 mt-4 mb-0 flex items-center gap-[8px] rounded-[10px] border border-amber-200 bg-amber-50 px-[14px] py-[8px]">
          <span className="text-[12px] font-bold text-amber-700">Örnek veri</span>
          <span className="text-[12px] text-amber-600">Bireysel segment — yerel fixture, Airtable bağlantısı yok.</span>
        </div>
      )}
      <KanbanBoard
        initialColumns={initialColumns}
        izin={izinProp}
        initialModalId={initialModalId}
        isAdmin={isAdmin}
      />
    </div>
  )
}
