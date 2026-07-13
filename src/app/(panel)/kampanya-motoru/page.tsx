import { redirect } from 'next/navigation'
import { getKullanicıProfili, getTenantConfigFromRequest } from '@/lib/yetki'
import { getSegment } from '@/lib/emlak-segment'
import { KampanyaMotoru } from './_components/kampanya-motoru'
import { KurumsalGate } from './_components/kurumsal-gate'

export const dynamic = 'force-dynamic'

export default async function KampanyaMotoruPage() {
  const [profil, cfg, segment] = await Promise.all([
    getKullanicıProfili(),
    getTenantConfigFromRequest(),
    getSegment(),
  ])
  if (!profil) redirect('/login')
  if (!cfg) redirect('/login')
  if (cfg.id !== 'emlak_demo') redirect('/')  // emlak-only bölüm — diğer tenant'larda URL ile de erişilemez

  // Kampanya Motoru yalnızca Kurumsal modda açılır (Ali Satış Zekâsı gibi).
  if (segment !== 'kurumsal') return <KurumsalGate />

  return <KampanyaMotoru />
}
