// ════════════════════════════════════════════════════════════════════════════
//  /storeos — Mağaza Özeti panosu.
//
//  Sunucu bileşeni yalnız kabuğu çizer; veri istemcide `<Pano />` içinden tek
//  toplu uç noktadan (`/api/storeos/dashboard`) gelir. Sunucuda ön-yükleme
//  YAPILMIYOR: aynı veri iki kez (SSR + ilk anket) çekilirse Airtable istek
//  bütçesi boşa gider ve iki kaynak arasında tutarsızlık ihtimali doğar.
// ════════════════════════════════════════════════════════════════════════════

import { Kabuk } from '@/components/storeos/kabuk'
import { Pano } from '@/components/storeos/pano'

export const dynamic = 'force-dynamic'

export default function StoreOsAnaSayfa() {
  return (
    <Kabuk aktif="/storeos">
      <Pano />
    </Kabuk>
  )
}
