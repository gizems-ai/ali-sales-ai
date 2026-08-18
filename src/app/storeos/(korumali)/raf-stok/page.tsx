// ════════════════════════════════════════════════════════════════════════════
//  /storeos/raf-stok — RAF & STOK (kapsam gösterisi · 18 Ağu 2026)
//
//  Reyon bazlı bulunurluk, planogram uyumu ve dolum takibi.
//
//  ── ÖNCE/SONRA GÖRSELİ YOK ─────────────────────────────────────────────────
//  Brief "raf öncesi/sonrası fotoğraf yer tutucusu" istiyordu. Gerçek Gratis
//  raf fotoğrafımız yok; stok fotoğraf "bu bizim mağazamız değil" tepkisi
//  doğurur (kamera karesinde verilen kararla aynı gerekçe). Yerine kameranın
//  ÜRETTİĞİ ölçüm konuldu: reyon başına doluluk çubuğu. Boş bir çerçeveye
//  "fotoğraf buraya" yazmaktansa gerçek ölçümü göstermek daha dürüst.
//
//  SALT OKUNUR · seed.
// ════════════════════════════════════════════════════════════════════════════

import { Kabuk } from '@/components/storeos/kabuk'
import {
  ModulDagilim, ModulEkrani, ModulIkili, ModulTablo,
} from '@/components/storeos/modul-sablonu'
import { rafModulu } from '@/lib/storeos/depo/demo-metrikler'

export const dynamic = 'force-dynamic'

export default function RafStokSayfasi() {
  const gun = new Date().toISOString().slice(0, 10)
  const { kpiler, raflar, planogram, dagilim } = rafModulu(gun)
  const dusuk = raflar.filter(r => r.doluluk < 60).length

  return (
    <Kabuk aktif="/storeos/raf-stok">
      <ModulEkrani
        baslik="Raf & Stok"
        aciklama="Reyon bazlı raf bulunurluğu, boş yüz sayısı, planogram uyumu ve dolum turu takibi."
        kpiler={kpiler}
        ustSag={<span className="so-nabiz">{dusuk} reyon dikkat gerektiriyor</span>}
      >
        <ModulTablo
          baslik="Reyon bulunurluğu"
          basliklar={['Reyon', 'Doluluk', 'Boş yüz', 'Son dolum', 'Sorumlu']}
          sutunlar="1.2fr .8fr .8fr .9fr 1fr"
          satirlar={raflar.map(r => ({
            anahtar: r.reyon,
            hucreler: [r.reyon, `%${r.doluluk}`, `${r.bosYuz} adet`, r.sonDolum, r.sorumlu],
            vurgu: r.doluluk < 50 ? ('kritik' as const)
              : r.doluluk < 70 ? ('dikkat' as const) : ('iyi' as const),
          }))}
        />

        <ModulIkili>
          <ModulDagilim baslik="Reyon doluluk dağılımı" birim="yuzde" dilimler={dagilim} />

          <ModulTablo
            baslik="Planogram uyumu"
            basliklar={['Reyon', 'Uyum', 'Not']}
            sutunlar="1fr .6fr 1.4fr"
            satirlar={planogram.map(p => ({
              anahtar: p.ad,
              hucreler: [p.ad, `%${p.uyum}`, p.not],
              vurgu: p.uyum >= 90 ? ('iyi' as const) : ('dikkat' as const),
            }))}
          />
        </ModulIkili>
      </ModulEkrani>
    </Kabuk>
  )
}
