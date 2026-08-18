// ════════════════════════════════════════════════════════════════════════════
//  /storeos/whatsapp — WHATSAPP MERKEZİ (19 Ağu 2026)
//
//  Panelden çıkan mesajların akışı: giden mesaj → düğmeler → personelin yanıtı
//  → zincirdeki karşılığı. Ayrıca hangi kademede kime mesaj gittiğini anlatan
//  şablon tablosu.
//
//  ── NEDEN BU EKRAN VAR ──────────────────────────────────────────────────────
//  Zincirin en ikna edici halkası telefonda duruyordu; anlatmak için telefon
//  göstermek gerekiyordu. Bu ekran o halkayı panele taşıyor. Baloncuk metni
//  taklit değil: zincirin kendi `mesajGovdesi()` fonksiyonundan üretiliyor.
//
//  SALT OKUNUR · seed · sorgu atmaz.
// ════════════════════════════════════════════════════════════════════════════

import { Kabuk } from '@/components/storeos/kabuk'
import { ModulEkrani, ModulTablo } from '@/components/storeos/modul-sablonu'
import { WaAkisi } from '@/components/storeos/wa-akis'
import { whatsappModulu } from '@/lib/storeos/depo/demo-metrikler'

export const dynamic = 'force-dynamic'

export default function WhatsappSayfasi() {
  const gun = new Date().toISOString().slice(0, 10)
  const { kpiler, kayitlar, sablonlar } = whatsappModulu(gun)

  return (
    <Kabuk aktif="/storeos/whatsapp">
      <ModulEkrani
        baslik="WhatsApp Merkezi"
        aciklama="Panelden çıkan görev mesajları, düğme yanıtları ve iletim durumu."
        kpiler={kpiler}
        ustSag={<span className="so-nabiz">{kayitlar.length} mesaj · bugün</span>}
      >
        <WaAkisi kayitlar={kayitlar} gun={gun} />

        <ModulTablo
          baslik="Mesaj kademeleri"
          basliklar={['Kademe', 'Ne zaman gider', 'Alıcı', 'Durum']}
          sutunlar="1.2fr 1.4fr 1.1fr .6fr"
          satirlar={sablonlar}
          sag={<span className="so-kart-not">aynı görev için birden fazla meşru mesaj</span>}
        />
      </ModulEkrani>
    </Kabuk>
  )
}
