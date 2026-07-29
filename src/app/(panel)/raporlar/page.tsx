import { redirect } from 'next/navigation'
import { getMusterilerIzni } from '@/lib/musteriler-izin'
import { getTenantConfigFromRequest } from '@/lib/yetki'
import { getSegment } from '@/lib/emlak-segment'
import { getServerT } from '@/lib/i18n/server'
import { RaporlarClient } from './_components/raporlar-client'
import { EmlakRapor } from './_components/emlak-rapor'

const E = { green1: '#0E5132', green2: '#1B7A47', text: '#071B3A' }

export default async function RaporlarPage() {
  const [izin, cfg, segment, { t }] = await Promise.all([
    getMusterilerIzni(),
    getTenantConfigFromRequest(),
    getSegment(),
    getServerT(),
  ])
  if (izin.tip === 'yok') redirect('/sign-in')

  const isEmlak    = cfg?.id === 'emlak_demo'
  const isBireysel = isEmlak && segment === 'bireysel'
  const displayAdMap = Object.fromEntries(
    (cfg?.temsilciler ?? []).filter(t => t.displayAd).map(t => [t.ad, t.displayAd!])
  )

  if (isEmlak) {
    return (
      <div className="max-w-7xl mx-auto space-y-5" style={{ padding: '24px 32px 48px' }}>
        <div className="flex items-center gap-[10px]">
          <div className="h-[36px] w-[36px] rounded-full grid place-items-center text-white"
            style={{ background: `linear-gradient(135deg, ${E.green1}, ${E.green2})` }}>
            <span className="text-[16px]">📊</span>
          </div>
          <div>
            <h1 className="text-[20px] font-black" style={{ color: E.text }}>{t('rep.title')}</h1>
            <p className="text-[12px] text-slate-400">{t('rep.emlakSubtitle')}</p>
          </div>
        </div>
        <EmlakRapor />
      </div>
    )
  }

  return <RaporlarClient izin={izin} isBireysel={isBireysel} displayAdMap={displayAdMap} />
}
