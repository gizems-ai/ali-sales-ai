// ════════════════════════════════════════════════════════════════════════════
//  /storeos/ali — ALİ ASİSTAN (kapsam gösterisi · 18 Ağu 2026)
//
//  Sunucu bileşeni yalnız kabuğu ve başlığı çizer; sohbetin kendisi istemci
//  bileşenidir (`ali-sohbet.tsx`) çünkü soru seçimi etkileşim gerektirir.
//  Sunucuda ön-yükleme YOK: aynı veriyi iki kez çekmek Airtable bütçesini
//  boşa harcar (bkz. `/storeos` panosu, aynı gerekçe).
// ════════════════════════════════════════════════════════════════════════════

import { AliSohbet } from '@/components/storeos/ali-sohbet'
import { Kabuk } from '@/components/storeos/kabuk'
import { ModulEkrani } from '@/components/storeos/modul-sablonu'

export const dynamic = 'force-dynamic'

export default function AliSayfasi() {
  return (
    <Kabuk aktif="/storeos/ali">
      <ModulEkrani
        baslik="Ali Asistan"
        aciklama="Mağazanın durumunu soru–cevapla açar: durum, neden, etki, öneri ve aksiyon."
        kpiler={[]}
        ustSag={<span className="so-nabiz">6 hazır senaryo</span>}
      >
        <AliSohbet />
      </ModulEkrani>
    </Kabuk>
  )
}
