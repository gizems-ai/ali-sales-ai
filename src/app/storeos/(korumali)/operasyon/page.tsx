// ════════════════════════════════════════════════════════════════════════════
//  /storeos/operasyon — OPERASYON (kapsam gösterisi · 18 Ağu 2026)
//
//  Günlük açılış/kapanış kontrol listesi, standart denetim skoru kırılımı ve
//  açık aksiyonlar.
//
//  SALT OKUNUR · seed. Kutucuklar tıklanabilir DEĞİL: işaretlemek bir yazma
//  yoludur ve bu ekranın böyle bir ucu yok. Yalanı görsel olarak da kurmuyoruz.
// ════════════════════════════════════════════════════════════════════════════

import { Kabuk } from '@/components/storeos/kabuk'
import {
  ModulDagilim, ModulEkrani, ModulIkili, ModulKontrolListesi, ModulTablo,
} from '@/components/storeos/modul-sablonu'
import { operasyonModulu } from '@/lib/storeos/depo/demo-metrikler'

export const dynamic = 'force-dynamic'

export default function OperasyonSayfasi() {
  const gun = new Date().toISOString().slice(0, 10)
  const { kpiler, kontrolListesi, denetim, acikAksiyonlar } = operasyonModulu(gun)
  const kalan = kontrolListesi.filter(m => !m.tamam).length

  return (
    <Kabuk aktif="/storeos/operasyon">
      <ModulEkrani
        baslik="Operasyon"
        aciklama="Günlük kontrol listesi, standart denetim skoru ve açık aksiyonlar."
        kpiler={kpiler}
        ustSag={<span className="so-nabiz">{kalan} madde bekliyor</span>}
      >
        <ModulIkili>
          <ModulKontrolListesi
            baslik="Günlük kontrol listesi"
            maddeler={kontrolListesi.map(m => ({
              anahtar: `${m.saat}-${m.madde}`,
              metin: `${m.saat} · ${m.madde}`,
              tamam: m.tamam,
              alt: m.sorumlu,
            }))}
          />
          <ModulDagilim baslik="Standart denetim skoru kırılımı" birim="yuzde" dilimler={denetim} />
        </ModulIkili>

        <ModulTablo
          baslik="Açık aksiyonlar"
          basliklar={['Aksiyon', 'Sorumlu', 'Son tarih']}
          sutunlar="2fr 1fr 1fr"
          satirlar={acikAksiyonlar}
        />
      </ModulEkrani>
    </Kabuk>
  )
}
