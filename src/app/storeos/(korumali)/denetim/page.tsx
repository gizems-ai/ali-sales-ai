// ════════════════════════════════════════════════════════════════════════════
//  /storeos/denetim — append-only denetim defteri.
//
//  Kabul kriteri 5'in EKRANDAKİ KARŞILIĞI: "zincirin her adımı denetim
//  kaydında görünür, kayıtlar silinemez". Bu sayfada okuma dışında hiçbir yol
//  yoktur ve `DenetimDeposu` arayüzünde de güncelleme/silme metodu yoktur —
//  yani bu ekrana bir "sil" düğmesi eklemek için önce sözleşmeyi değiştirmek
//  gerekir. Garanti budur.
//
//  DİKKAT: denetim satırında mağaza kodu yoktur; kayıt mağazaya değil işleme
//  bağlıdır. Tek mağazalı demoda sorun değil, çok mağazalı üründe şemaya
//  mağaza kodu eklenmesi gerekecek (backlog).
//
//  Ön-yükleme ve `searchParams` gerekçeleri için bkz. `alarmlar/page.tsx`.
// ════════════════════════════════════════════════════════════════════════════

import { ListeEkrani } from '@/components/storeos/listeler'
import { filtreCoz } from '@/lib/storeos/liste/tipler'
import { tekDeger } from '@/lib/storeos/liste/sorgu'

export const dynamic = 'force-dynamic'

export default async function DenetimSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  return <ListeEkrani gorunum="denetim" baslangic={filtreCoz(ad => tekDeger(sp[ad]))} />
}
