// ════════════════════════════════════════════════════════════════════════════
//  /storeos/kasa-kuyruk — KASA & KUYRUK (kapsam gösterisi · 18 Ağu 2026)
//
//  Kasa başına bekleme, saat bazlı kuyruk eğrisi ve kasa açma önerisi.
//  Eşik çizgisi (180 sn) grafiğe KESİKLİ olarak çizilir — bu, kural motorunun
//  gerçekten kullandığı eşiktir (`store.queue.threshold_exceeded`), süs değil.
//
//  SALT OKUNUR · seed. Bu ekran ne olay üretir ne görev; zincire dokunmaz.
// ════════════════════════════════════════════════════════════════════════════

import { Kabuk } from '@/components/storeos/kabuk'
import {
  ModulEkrani, ModulIkili, ModulOneri, ModulSeriKarti, ModulTablo,
} from '@/components/storeos/modul-sablonu'
import { kasaModulu } from '@/lib/storeos/depo/demo-metrikler'
import { sureYaz } from '@/components/storeos/temel'

export const dynamic = 'force-dynamic'

const DURUM = { acik: 'Açık', kapali: 'Kapalı', mola: 'Molada' } as const

export default function KasaKuyrukSayfasi() {
  const gun = new Date().toISOString().slice(0, 10)
  const { kpiler, kasalar, seri, esikSn, oneri } = kasaModulu(gun)
  const acik = kasalar.filter(k => k.durum === 'acik').length

  return (
    <Kabuk aktif="/storeos/kasa-kuyruk">
      <ModulEkrani
        baslik="Kasa & Kuyruk"
        aciklama="Kasa başına bekleme süresi, kuyruk eğrisi ve kural motorunun kasa açma önerisi."
        kpiler={kpiler}
        ustSag={<span className="so-nabiz">{acik}/{kasalar.length} kasa açık · eşik {sureYaz(esikSn)}</span>}
      >
        <ModulSeriKarti
          seri={seri}
          esik={esikSn}
          esikNotu={`Kesikli çizgi kural eşiğidir: ${sureYaz(esikSn)}. Bu eşik aşıldığında store.queue.threshold_exceeded olayı görev üretir — zincirde bugün de çalışan kural budur.`}
        />

        <ModulIkili>
          <ModulTablo
            baslik="Kasa durumu"
            basliklar={['Kasa', 'Durum', 'Kasiyer', 'Bekleyen', 'Ort. süre', 'İşlem/sa']}
            sutunlar=".8fr .7fr 1fr .7fr .8fr .8fr"
            satirlar={kasalar.map(k => ({
              anahtar: k.ad,
              hucreler: [
                k.ad, DURUM[k.durum], k.kasiyer,
                k.durum === 'acik' ? `${k.bekleyen} kişi` : '—',
                k.durum === 'acik' ? sureYaz(k.ortSure) : '—',
                k.durum === 'acik' ? String(k.islemSaat) : '—',
              ],
              vurgu: k.durum !== 'acik'
                ? undefined
                : k.ortSure >= esikSn ? ('kritik' as const)
                  : k.ortSure >= esikSn * 0.75 ? ('dikkat' as const) : ('iyi' as const),
            }))}
          />

          <ModulOneri baslik={oneri.baslik} metin={oneri.metin} gerekce={oneri.gerekce} />
        </ModulIkili>
      </ModulEkrani>
    </Kabuk>
  )
}
