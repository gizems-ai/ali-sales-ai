// ════════════════════════════════════════════════════════════════════════════
//  /storeos/gorevler — kural eşleşmesinden doğan işler.
//
//  YAZMA YOLU (Gün 8). Gün 4'te salt okunurdu; artık durum değiştiren düğmeler
//  var. Yazma yolunun bedeli ödendi: yetki `yetki.ts`'ten, her geçiş denetim
//  defterine, çakışan iki tıklamada 409 ve anlaşılır mesaj. Düğmeler
//  `gorev-gecis.ts` tablosundan üretilir — ölü düğme derlemeden geçmez.
//
//  Anket bu ekranda 3 sn (`lib/storeos/anket.ts`): düğmeye basan kişi 10 sn
//  bekleyemez. Diğer listeler daha yavaş — Airtable bütçesi ortak.
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
