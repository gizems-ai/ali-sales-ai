// ════════════════════════════════════════════════════════════════════════════
//  /storeos/kampanyalar — KAMPANYALAR (derinleştirildi · 19 Ağu 2026)
//
//  Aktif kampanyalar → uygulama matrisi (afiş · stant · fiyat etiketi · ürün
//  yerleşimi) → kampanya alanı ölçümü (süre + dönüşüm) → öncesi/sonrası
//  trafik → mağaza karşılaştırması.
//
//  ── NEDEN BU EKRAN DERİNLEŞTİ ───────────────────────────────────────────────
//  Kuyruk, kişi sayımı, raf doluluk rakiplerde de var. Drogeri kampanya yoğun
//  çalışır: "afiş asıldı mı, fiyat etiketi doğru mu, teşhir kaç mağazada tam"
//  sorusu Gratis'in kendi dili. Matris bu soruyu tek ekranda cevaplıyor.
//
//  ── UYGUNLUK YÜZDESİ TEK KAYNAKTAN ──────────────────────────────────────────
//  Üstteki "Teşhir uygunluğu" KPI'ı, matrisin yayındaki kampanya ortalaması.
//  Alttaki mağaza karşılaştırması da aynı sayıyı okur. Üç yerde üç farklı
//  yüzde çıkmasın diye hepsi `kampanyaModulu()` içinde hesaplanıyor.
//
//  ── ÇOK MAĞAZA KARŞILAŞTIRMASI ─────────────────────────────────────────────
//  Tabloda tek gerçek mağaza var (0178) ve ikinci satır "Diğer mağazalar —
//  çok mağazalı kurulum pilotta" der. Uydurma on mağaza satırı yazmak, ihale
//  sonrası "hani nerede" sorusunu doğurur.
//
//  SALT OKUNUR · seed.
// ════════════════════════════════════════════════════════════════════════════

import { Kabuk } from '@/components/storeos/kabuk'
import {
  ModulDagilim, ModulEkrani, ModulIkili, ModulTablo, ModulUygunlukMatrisi,
} from '@/components/storeos/modul-sablonu'
import { KAMPANYA_MADDELERI, kampanyaModulu } from '@/lib/storeos/depo/demo-metrikler'

export const dynamic = 'force-dynamic'

export default function KampanyalarSayfasi() {
  const gun = new Date().toISOString().slice(0, 10)
  const {
    kpiler, kampanyalar, uygulamalar, alanOlcumleri, trafik, magazalar,
  } = kampanyaModulu(gun)
  const yayinda = kampanyalar.filter(k => k.durum === 'Yayında').length
  const eksikli = uygulamalar.filter(u => !u.hazirlikta && u.eksik.length > 0).length

  return (
    <Kabuk aktif="/storeos/kampanyalar">
      <ModulEkrani
        baslik="Kampanyalar"
        aciklama="Mağaza içi kampanya takibi, teşhir uygunluğu ve kampanya alanı trafiği."
        kpiler={kpiler}
        ustSag={<span className="so-nabiz">{yayinda} kampanya yayında</span>}
      >
        <ModulTablo
          baslik="Aktif kampanyalar"
          basliklar={['Kampanya', 'Dönem', 'Teşhir alanı', 'Durum', 'Alan trafiği']}
          sutunlar="1.5fr 1fr 1.1fr .8fr .9fr"
          satirlar={kampanyalar.map(k => ({
            anahtar: k.ad,
            hucreler: [k.ad, k.donem, k.alan, k.durum, k.etki > 0 ? `+%${k.etki}` : '—'],
            vurgu: k.durum === 'Yayında' ? ('iyi' as const) : undefined,
          }))}
        />

        {/* Ekranın omurgası: hangi kampanyada ne eksik. */}
        <ModulUygunlukMatrisi
          baslik="Uygulama kontrolü — teşhir uygunluğu"
          sutunlar={KAMPANYA_MADDELERI}
          satirlar={uygulamalar.map(u => ({
            anahtar: u.kampanya,
            ad: u.kampanya,
            alt: u.hazirlikta ? `${u.alan} · hazırlıkta` : `${u.alan} · sorumlu ${u.sorumlu}`,
            isaretler: u.isaretler,
            uygunluk: u.uygunluk,
            eksik: u.eksik,
          }))}
          not={
            eksikli > 0
              ? `${eksikli} yayındaki kampanyada teşhir eksiği var`
              : 'yayındaki kampanyalarda teşhir tam'
          }
          eylemIpucu="görev açma bu ekranda pilotta; bugün görevler kural motorundan ve Görevler ekranından açılıyor"
        />

        <ModulIkili>
          <ModulTablo
            baslik="Kampanya alanı: süre ve dönüşüm"
            basliklar={['Ölçü', 'Kampanya alanı', 'Mağaza ort.', 'Fark']}
            sutunlar="1.5fr .9fr .8fr .8fr"
            satirlar={alanOlcumleri.map(a => ({
              anahtar: a.etiket,
              hucreler: [a.etiket, a.kampanyaAlani, a.magazaOrtalamasi, a.fark],
              vurgu: a.vurgu,
            }))}
          />
          <ModulDagilim
            baslik="Kampanya alanı trafiği (öncesi / sonrası)"
            birim="kisi"
            dilimler={trafik}
          />
        </ModulIkili>

        <ModulTablo
          baslik="Mağaza karşılaştırması"
          basliklar={['Mağaza', 'Uygulama', 'Not']}
          sutunlar="1.4fr .7fr 1.6fr"
          satirlar={magazalar.map(m => ({
            anahtar: m.ad,
            hucreler: [m.ad, m.uygulama > 0 ? `%${m.uygulama}` : '—', m.not],
            vurgu: m.uygulama > 0 ? ('iyi' as const) : undefined,
          }))}
        />
      </ModulEkrani>
    </Kabuk>
  )
}
