import { redirect } from 'next/navigation'
import { getKullanicıProfili, getTenantConfigFromRequest } from '@/lib/yetki'
import { getSegment } from '@/lib/emlak-segment'
import { Kutuphane } from './_components/kutuphane'

export const dynamic = 'force-dynamic'

// Satış Kütüphanesi — GELİŞİM merkezi açılış ekranı.
// readOnly tenant: tüm veri fixture; hiçbir yazma işlemi tetiklenmez.
export default async function GelisimPage() {
  const [profil, cfg, segment] = await Promise.all([
    getKullanicıProfili(),
    getTenantConfigFromRequest(),
    getSegment(),
  ])
  if (!profil) redirect('/login')
  if (!cfg) redirect('/login')
  if (cfg.id !== 'emlak_demo') redirect('/')  // emlak-only bölüm — diğer tenant'larda URL ile de erişilemez

  // Liderlik tablosu yalnızca Kurumsal modda (skor aynası her zaman görünür)
  const isKurumsal = segment === 'kurumsal'

  return <Kutuphane isKurumsal={isKurumsal} />
}
