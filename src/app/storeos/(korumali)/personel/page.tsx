// ════════════════════════════════════════════════════════════════════════════
//  /storeos/personel — PERSONEL (kapsam gösterisi · 18 Ağu 2026)
//
//  Vardiya kadrosu, kişi başına açık görev/tamamlanma ve bölge dağılımı.
//  Buradaki isimler DEMO kadrodur; gerçek Gratis personeli değildir.
//
//  SALT OKUNUR · seed. Görev atama zincirde (Görevler ekranı) çalışır, burada
//  değil — bu ekran kimseye görev veremez.
// ════════════════════════════════════════════════════════════════════════════

import { Kabuk } from '@/components/storeos/kabuk'
import {
  ModulDonut, ModulEkrani, ModulIkili, ModulOneri, ModulTablo,
} from '@/components/storeos/modul-sablonu'
import { personelModulu } from '@/lib/storeos/depo/demo-metrikler'

export const dynamic = 'force-dynamic'

export default function PersonelSayfasi() {
  const gun = new Date().toISOString().slice(0, 10)
  const { kpiler, kisiler, dagilim, oneri } = personelModulu(gun)
  const acikToplam = kisiler.reduce((t, k) => t + k.acikGorev, 0)

  return (
    <Kabuk aktif="/storeos/personel">
      <ModulEkrani
        baslik="Personel"
        aciklama="Vardiya kadrosu, bölge ataması ve kişi başına görev yükü."
        kpiler={kpiler}
        ustSag={<span className="so-nabiz">{kisiler.length} kişi vardiyada · {acikToplam} açık görev</span>}
      >
        <ModulTablo
          baslik="Vardiya kadrosu"
          basliklar={['Ad', 'Rol', 'Bölge', 'Vardiya', 'Açık görev', 'Tamamlanma']}
          sutunlar="1.2fr 1.1fr 1fr 1.1fr .8fr .9fr"
          satirlar={kisiler.map(k => ({
            anahtar: k.ad,
            hucreler: [k.ad, k.rol, k.bolge, k.vardiya, String(k.acikGorev), `%${k.tamamlanma}`],
            vurgu: k.tamamlanma >= 90 ? ('iyi' as const)
              : k.tamamlanma < 70 ? ('dikkat' as const) : undefined,
          }))}
        />

        <ModulIkili>
          <ModulDonut baslik="Bölgeye göre kadro dağılımı" dilimler={dagilim} />
          <ModulOneri
            baslik={oneri.baslik}
            metin={oneri.metin}
            gerekce="Kaynak: ziyaretçi eğrisi (Mağaza Analizleri) + kasa bekleme serisi (Kasa & Kuyruk)."
          />
        </ModulIkili>
      </ModulEkrani>
    </Kabuk>
  )
}
