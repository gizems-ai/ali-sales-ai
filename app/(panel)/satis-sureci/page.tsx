import { PIPELINE_ASAMALARI, getPipelineKolonu } from '@/lib/airtable'
import { getKullanicıProfili, izolasyonBelirle, getTenantConfig } from '@/lib/yetki'
import { getMusterilerIzni } from '@/lib/musteriler-izin'
import { redirect } from 'next/navigation'
import { KanbanBoard } from './_components/kanban-board'

export const revalidate = 60

type SearchParams = Promise<{ modal?: string; [k: string]: string | undefined }>

export default async function SatisSureciPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const profil = await getKullanicıProfili()
  if (!profil) redirect('/login')

  const sp = await searchParams
  const initialModalId =
    sp.modal && /^rec[A-Za-z0-9]+$/.test(sp.modal) ? sp.modal : undefined

  const izolasyon = izolasyonBelirle(profil)
  const temsilciFilter = izolasyon.tip === 'temsilci' ? izolasyon.ad : undefined

  const cfg = getTenantConfig(profil)
  const [results, izin] = await Promise.all([
    Promise.all(PIPELINE_ASAMALARI.map(col => getPipelineKolonu(col.value, undefined, temsilciFilter, cfg))),
    getMusterilerIzni(),
  ])

  const initialColumns = PIPELINE_ASAMALARI.map((col, i) => ({
    ...col,
    records: results[i].records,
    offset:  results[i].offset,
  }))

  const izinProp = izin.tip !== 'yok' ? izin : undefined
  const isAdmin = profil.rol === 'admin'

  return (
    <KanbanBoard
      initialColumns={initialColumns}
      izin={izinProp}
      initialModalId={initialModalId}
      isAdmin={isAdmin}
    />
  )
}
