// ════════════════════════════════════════════════════════════════════════════
//  /storeos/kampanyalar — KAMPANYALAR (kapsam gösterisi · 18 Ağu 2026)
//
//  Aktif kampanyalar, uygulama kontrol listesi, kampanya alanı trafiği
//  (öncesi/sonrası) ve mağaza karşılaştırması.
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
  ModulDagilim, ModulEkrani, ModulIkili, ModulKontrolListesi, ModulTablo,
} from '@/components/storeos/modul-sablonu'
import { kampanyaModulu } from '@/lib/storeos/depo/demo-metrikler'

export const dynamic = 'force-dynamic'

export default function KampanyalarSayfasi() {
  const gun = new Date().toISOString().slice(0, 10)
  const { kpiler, kampanyalar, kontrolListesi, trafik, magazalar } = kampanyaModulu(gun)
  const yayinda = kampanyalar.filter(k => k.durum === 'Yayında').length

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

        <ModulIkili>
          <ModulKontrolListesi
            baslik="Uygulama kontrol listesi"
            maddeler={kontrolListesi.map(m => ({
              anahtar: m.madde, metin: m.madde, tamam: m.tamam, alt: m.sorumlu,
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
