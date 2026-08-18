// ════════════════════════════════════════════════════════════════════════════
//  /storeos/raporlar — RAPORLAR (kapsam gösterisi · 18 Ağu 2026)
//
//  Günlük karne önizlemesi, haftalık karşılaştırma ve zamanlanmış rapor listesi.
//
//  ── DÜĞMELER BİLEREK ÇALIŞMIYOR ────────────────────────────────────────────
//  PDF / Excel / E-posta düğmeleri DEVRE DIŞI ve "yakında" rozeti taşır.
//  Çalışıyormuş gibi görünen ama boş dosya üreten bir düğme, jüri tıkladığı an
//  demoyu bitirir. Ayrıca e-posta gönderimi test kuralı gereği yalnız onaylı
//  alıcıya gidebilir — o kapıyı bu ekrandan açmıyoruz.
//
//  SALT OKUNUR · seed.
// ════════════════════════════════════════════════════════════════════════════

import { Kabuk } from '@/components/storeos/kabuk'
import {
  ModulEkrani, ModulTablo, ModulYakindaDugmeler,
} from '@/components/storeos/modul-sablonu'
import { Kart } from '@/components/storeos/temel'
import { raporModulu } from '@/lib/storeos/depo/demo-metrikler'

export const dynamic = 'force-dynamic'

export default function RaporlarSayfasi() {
  const gun = new Date().toISOString().slice(0, 10)
  const { gunluk, haftalik, zamanlanmis } = raporModulu(gun)

  return (
    <Kabuk aktif="/storeos/raporlar">
      <ModulEkrani
        baslik="Raporlar"
        aciklama="Günlük mağaza karnesi, haftalık karşılaştırma ve zamanlanmış rapor dağıtımı."
        kpiler={[]}
        ustSag={<span className="so-nabiz">günlük karne · {gun}</span>}
      >
        <Kart
          baslik="Günlük mağaza karnesi"
          ornek="demo"
          sag={<span className="so-kart-not">{gun} · gün sonu önizleme</span>}
        >
          <div className="so-vt">
            {gunluk.map(s => (
              <div key={s.etiket} className="so-vt-satir" style={{ gridTemplateColumns: '1.4fr .8fr 1fr' }}>
                <span className="so-vt-ad">{s.etiket}</span>
                <span>{s.deger}</span>
                <span>{s.not}</span>
              </div>
            ))}
          </div>
          <ModulYakindaDugmeler
            dugmeler={['PDF indir', 'Excel indir', 'E-posta gönder']}
            not="Rapor üretimi ve dağıtımı Faz 2'de açılıyor. Bu demoda düğmeler bilerek devre dışı: boş dosya üreten bir düğme koymuyoruz."
          />
        </Kart>

        <ModulTablo
          baslik="Haftalık karşılaştırma"
          basliklar={['Gün', 'Ziyaretçi', 'Dönüşüm', 'Açılan görev', 'Raf bulunurluğu']}
          sutunlar="1fr .9fr .8fr .9fr 1fr"
          satirlar={haftalik}
        />

        <ModulTablo
          baslik="Zamanlanmış raporlar"
          basliklar={['Rapor', 'Sıklık', 'Alıcı', 'Durum']}
          sutunlar="1.4fr 1fr 1fr .7fr"
          satirlar={zamanlanmis.map(z => ({
            anahtar: z.ad,
            hucreler: [z.ad, z.siklik, z.alici, z.durum],
          }))}
        />
      </ModulEkrani>
    </Kabuk>
  )
}
