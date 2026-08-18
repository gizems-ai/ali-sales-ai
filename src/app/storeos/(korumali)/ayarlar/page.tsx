// ════════════════════════════════════════════════════════════════════════════
//  /storeos/ayarlar — AYARLAR (kapsam gösterisi · 18 Ağu 2026)
//
//  Rol tablosu, bildirim kuralları, entegrasyon durumu ve kural eşikleri.
//
//  ── EŞİKLER GERÇEK, EKRAN SALT OKUNUR ──────────────────────────────────────
//  Tablodaki eşikler ve kanal seçimi bugün gerçekten uygulanan değerlerdir
//  (kural tablosu ve ortam değişkenleri). Ama BU EKRAN onları DEĞİŞTİREMEZ:
//  yazma ucu yok. Değiştirilebilir görünen bir alan koymak, jüri bir değeri
//  değiştirip zincirin tepkisiz kaldığını görünce demoyu bitirirdi.
//
//  Entegrasyon satırlarında "canlı" yalnız gerçekten canlı olanlar için:
//  Airtable ve WhatsApp. Vision / POS / ERP açıkça "pilot" der.
// ════════════════════════════════════════════════════════════════════════════

import { Kabuk } from '@/components/storeos/kabuk'
import { ModulEkrani, ModulIkili, ModulTablo } from '@/components/storeos/modul-sablonu'
import { ayarlarModulu } from '@/lib/storeos/depo/demo-metrikler'

export const dynamic = 'force-dynamic'

export default function AyarlarSayfasi() {
  const { roller, bildirimKurallari, entegrasyonlar, esikler } = ayarlarModulu()
  const canliN = entegrasyonlar.filter(e => e.durum === 'canli').length

  return (
    <Kabuk aktif="/storeos/ayarlar">
      <ModulEkrani
        baslik="Ayarlar"
        aciklama="Kullanıcı rolleri, bildirim kuralları, entegrasyon durumu ve kural eşikleri."
        kpiler={[]}
        ustSag={
          <span className="so-nabiz">
            {canliN} entegrasyon canlı · {entegrasyonlar.length - canliN} pilot
          </span>
        }
      >
        <ModulTablo
          baslik="Entegrasyon durumu"
          basliklar={['Entegrasyon', 'Durum', 'Not']}
          sutunlar="1.3fr .6fr 2fr"
          satirlar={entegrasyonlar.map(e => ({
            anahtar: e.ad,
            hucreler: [e.ad, e.durum === 'canli' ? 'Canlı' : 'Pilot', e.not],
            vurgu: e.durum === 'canli' ? ('iyi' as const) : ('dikkat' as const),
          }))}
        />

        <ModulIkili>
          <ModulTablo
            baslik="Kullanıcı rolleri"
            basliklar={['Rol', 'Kişi', 'Yetki']}
            sutunlar="1.1fr .5fr 1.8fr"
            satirlar={roller.map(r => ({
              anahtar: r.rol,
              hucreler: [r.rol, String(r.kisi), r.yetki],
            }))}
          />

          <ModulTablo
            baslik="Kural eşikleri"
            basliklar={['Eşik', 'Değer', 'Kaynak']}
            sutunlar="1.4fr .8fr 1.1fr"
            satirlar={esikler.map(e => ({
              anahtar: e.ad,
              hucreler: [e.ad, e.deger, e.kaynak],
            }))}
          />
        </ModulIkili>

        <ModulTablo
          baslik="Bildirim kuralları"
          basliklar={['Olay', 'Kanal', 'Alıcı', 'Kademe']}
          sutunlar="1.7fr .7fr 1.1fr 1.2fr"
          satirlar={bildirimKurallari.map(b => ({
            anahtar: `${b.olay}-${b.kademe}`,
            hucreler: [b.olay, b.kanal, b.alici, b.kademe],
          }))}
        />
      </ModulEkrani>
    </Kabuk>
  )
}
