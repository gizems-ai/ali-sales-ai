import { redirect } from 'next/navigation'
import { getKullanicıProfili, getTenantConfigFromRequest } from '@/lib/yetki'
import { getSegment } from '@/lib/emlak-segment'
import { ZekaTabs } from './_components/zeka-tabs'

export const dynamic = 'force-dynamic'

export default async function AliSatisZekasiPage() {
  const [profil, cfg, segment] = await Promise.all([
    getKullanicıProfili(),
    getTenantConfigFromRequest(),
    getSegment(),
  ])
  if (!profil) redirect('/login')
  if (!cfg) redirect('/login')

  // Yönetici görünümü yalnızca Kurumsal modda
  const isKurumsal = segment === 'kurumsal'

  return <ZekaTabs isKurumsal={isKurumsal} />
}
