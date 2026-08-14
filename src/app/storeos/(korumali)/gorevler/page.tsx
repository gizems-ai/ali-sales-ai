// ════════════════════════════════════════════════════════════════════════════
//  /storeos/gorevler — kural eşleşmesinden doğan işler.
//
//  SALT OKUNUR (Gün 4 sınırı). Durum değiştiren düğme yok: geçiş bir yazma
//  yoludur ve denetim kaydı + yetki + 409 davranışı ister. Çalışmayan gri bir
//  düğme koymaktansa hiç koymamak dürüst — kabuktaki "yakında" kuralının
//  aynısı.
//
//  Ön-yükleme ve `searchParams` gerekçeleri için bkz. `alarmlar/page.tsx`.
// ════════════════════════════════════════════════════════════════════════════

import { ListeEkrani } from '@/components/storeos/listeler'
import { filtreCoz } from '@/lib/storeos/liste/tipler'
import { tekDeger } from '@/lib/storeos/liste/sorgu'

export const dynamic = 'force-dynamic'

export default async function GorevlerSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  return <ListeEkrani gorunum="gorevler" baslangic={filtreCoz(ad => tekDeger(sp[ad]))} />
}
