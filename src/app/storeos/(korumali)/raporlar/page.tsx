// ════════════════════════════════════════════════════════════════════════════
//  /storeos/raporlar — RAPORLAR (derinleştirildi · 19 Ağu 2026)
//
//  Gün sonu raporu (A4 önizleme), haftalık karşılaştırma ve zamanlanmış rapor
//  listesi.
//
//  ── NEDEN A4 ÖNİZLEME ──────────────────────────────────────────────────────
//  Panelin tamamı ekran içindir; mağaza müdürünün gün sonunda elinde tuttuğu
//  şey ise bir sayfadır. Bu ekran o sayfayı gösteriyor: Ali'nin dört cümlelik
//  notu, günün ölçüleri, tamamlanan görevler ve kritik olaylar. Tarayıcının
//  yazdır komutu (⌘P) yalnız bu sayfayı basar — yan menü ve düğmeler kâğıda
//  gitmez, örnek-veri bandı ile salt-okunur dipnotu BİLEREK gider.
//
//  ── ALİ'NİN NOTU ───────────────────────────────────────────────────────────
//  Kural motorunun çıktı biçiminde (durum → neden → etki → öneri) ama bu
//  ekranda örnek veriden derleniyor; canlı motora bağlı değil. Cümlelerdeki
//  her sayı hemen altındaki ölçü kutularıyla aynı kaynaktan gelir.
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
  ModulA4Rapor, ModulEkrani, ModulTablo, ModulYakindaDugmeler,
} from '@/components/storeos/modul-sablonu'
import { raporModulu } from '@/lib/storeos/depo/demo-metrikler'

export const dynamic = 'force-dynamic'

export default function RaporlarSayfasi() {
  const gun = new Date().toISOString().slice(0, 10)
  const { gunluk, gunSonu, haftalik, zamanlanmis } = raporModulu(gun)

  return (
    <Kabuk aktif="/storeos/raporlar">
      <ModulEkrani
        baslik="Raporlar"
        aciklama="Gün sonu raporu, haftalık karşılaştırma ve zamanlanmış rapor dağıtımı."
        kpiler={[]}
        ustSag={<span className="so-nabiz">gün sonu raporu · {gun}</span>}
      >
        <ModulA4Rapor
          baslik="Gün sonu mağaza raporu"
          ustBilgi="Gratis Store OS · Mağaza 0178 — İzmir Forum Bornova"
          gun={gun}
          aliNotu={gunSonu.aliNotu}
          olculer={gunluk}
          tamamlanan={gunSonu.tamamlanan}
          kritikOlaylar={gunSonu.kritikOlaylar}
          altBilgi={
            'Bu rapor Store OS tarafından gün sonunda otomatik üretilir. Bu önizlemedeki '
            + 'sayılar örnek (seed) veridir; pilotta mağazanın kendi ölçümleriyle dolar. '
            + 'Ali\'nin notu kural motorunun çıktı biçiminde derlenmiştir.'
          }
          altEk={
            <ModulYakindaDugmeler
              dugmeler={['PDF indir', 'Excel indir', 'E-posta gönder']}
              not="Rapor dosyası üretimi ve dağıtımı Faz 2'de açılıyor. Bu demoda düğmeler bilerek devre dışı: boş dosya üreten bir düğme koymuyoruz. Sayfanın kendisi tarayıcıdan yazdırılabilir."
            />
          }
        />

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
