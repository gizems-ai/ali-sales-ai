import { redirect } from 'next/navigation'
import { getKullanicıProfili, getTenantConfigFromRequest } from '@/lib/yetki'
import { getSegment } from '@/lib/emlak-segment'
import { Kutuphane } from './_components/kutuphane'

export const dynamic = 'force-dynamic'

// Satışçı Kütüphanesi — GELİŞİM merkezi açılış ekranı.
// readOnly tenant: tüm veri fixture; hiçbir yazma işlemi tetiklenmez.
export default async function GelisimPage() {
  const [profil, cfg, segment] = await Promise.all([
    getKullanicıProfili(),
    getTenantConfigFromRequest(),
    getSegment(),
  ])
  if (!profil) redirect('/login')
  if (!cfg) redirect('/login')

  // Liderlik tablosu yalnızca Kurumsal modda (skor aynası her zaman görünür)
  const isKurumsal = segment === 'kurumsal'

  return <Kutuphane isKurumsal={isKurumsal} />
}
