import { redirect } from 'next/navigation'
import { getMusterilerIzni } from '@/lib/musteriler-izin'
import { getTenantConfigFromRequest } from '@/lib/yetki'
import { getSegment } from '@/lib/emlak-segment'
import { RaporlarClient } from './_components/raporlar-client'

export default async function RaporlarPage() {
  const [izin, cfg, segment] = await Promise.all([
    getMusterilerIzni(),
    getTenantConfigFromRequest(),
    getSegment(),
  ])
  if (izin.tip === 'yok') redirect('/sign-in')

  const isBireysel = cfg?.id === 'emlak_demo' && segment === 'bireysel'
  const displayAdMap = Object.fromEntries(
    (cfg?.temsilciler ?? []).filter(t => t.displayAd).map(t => [t.ad, t.displayAd!])
  )

  return <RaporlarClient izin={izin} isBireysel={isBireysel} displayAdMap={displayAdMap} />
}
