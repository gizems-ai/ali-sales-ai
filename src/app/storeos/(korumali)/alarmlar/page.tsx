// ════════════════════════════════════════════════════════════════════════════
//  /storeos/alarmlar — olayların tam kaydı.
//
//  Sunucu bileşeni yalnız filtreyi çözer; veri istemcide `<ListeEkrani />`
//  içinden tek uç noktadan (`/api/storeos/liste`) gelir. Sunucuda ön-yükleme
//  YAPILMIYOR — panoyla aynı gerekçe: aynı veriyi iki kez çekmek (SSR + ilk
//  anket) Airtable istek bütçesini boşa harcar.
//
//  `searchParams` NEDEN BURADA OKUNUYOR: derin bağlantı (`?entity=evt_…`)
//  ilk render'da doğru filtreyle açılmalı. İstemcide `useSearchParams` ile
//  okumak Suspense sınırı ister ve ekran bir kare boş filtreyle çizilirdi.
// ════════════════════════════════════════════════════════════════════════════

import { ListeEkrani } from '@/components/storeos/listeler'
import { filtreCoz } from '@/lib/storeos/liste/tipler'
import { tekDeger } from '@/lib/storeos/liste/sorgu'

export const dynamic = 'force-dynamic'

export default async function AlarmlarSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  return <ListeEkrani gorunum="alarmlar" baslangic={filtreCoz(ad => tekDeger(sp[ad]))} />
}
