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
import { env } from '@/lib/storeos/env'

export const dynamic = 'force-dynamic'

export default async function StoreOsAnaSayfa({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams

  // `?goruntu=yedek` → video hiç denenmez, SVG sahnesi çizilir. Demo günü
  // sigortası: sunum sırasında görüntü takılırsa adres çubuğundan tek kelimeyle
  // yedeğe geçilir. Aynı zamanda yedek yolun canlıda çalıştığını KANITLAR.
  const yedegeZorla = (Array.isArray(sp.goruntu) ? sp.goruntu[0] : sp.goruntu) === 'yedek'

  // Gerçek mağaza kaydının adresi ortam değişkeninde; sunucudan istemciye
  // prop olarak geçer (kodda sabit URL yok, NEXT_PUBLIC_ da yok).
  return (
    <Kabuk aktif="/storeos">
      <Pano
        videoUrl={yedegeZorla ? '' : env.kameraVideoUrl}
        posterUrl={env.kameraPosterUrl}
      />
    </Kabuk>
  )
}
