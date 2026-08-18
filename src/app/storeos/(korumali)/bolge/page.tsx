// ════════════════════════════════════════════════════════════════════════════
//  /storeos/bolge — BÖLGE KARŞILAŞTIRMA (19 Ağu 2026)
//
//  Mağaza listesinin bir üst katmanı: bölge müdürünün ekranı.
//
//  TEK KAYNAK: buradaki hiçbir sayı ayrıca tohumlanmadı — `bolgeModulu`
//  `magazaModulu`nun çıktısını toplar. "Mağazalar ekranında Ege 78 diyordu,
//  burada 74" diye bir çelişki çıkması mümkün değil.
//
//  SALT OKUNUR · seed.
// ════════════════════════════════════════════════════════════════════════════

import { Kabuk } from '@/components/storeos/kabuk'
import {
  ModulDagilim, ModulEkrani, ModulIkili, ModulTablo, ModulVurguSerit,
} from '@/components/storeos/modul-sablonu'
import { sayiYaz, sureYaz } from '@/components/storeos/temel'
import { bolgeModulu } from '@/lib/storeos/depo/demo-metrikler'

export const dynamic = 'force-dynamic'

export default function BolgeSayfasi() {
  const gun = new Date().toISOString().slice(0, 10)
  const { kpiler, bolgeler, skorCubuklari, enIyi, enKotu } = bolgeModulu(gun)

  return (
    <Kabuk aktif="/storeos/bolge">
      <ModulEkrani
        baslik="Bölge Karşılaştırma"
        aciklama="Bölge bazlı sağlık skoru, metrik karşılaştırması ve uçlar — bölge müdürünün ekranı."
        kpiler={kpiler}
        ustSag={<span className="so-nabiz">{bolgeler.length} bölge · {bolgeler.reduce((t, b) => t + b.magazaSayisi, 0)} mağaza</span>}
      >
        <ModulVurguSerit
          baslik="Uçlar"
          not="skor farkı kapatılabilir alandır"
          kartlar={[
            {
              anahtar: 'iyi',
              ust: 'En iyi performans',
              ana: `${enIyi.bolge} — skor ${enIyi.skor}`,
              alt: `Raf bulunurluğu %${enIyi.rafUygunluk} · görev tamamlama %${enIyi.gorevTamamlama} · ortalama bekleme ${sureYaz(enIyi.kuyrukSn)}`,
              vurgu: 'iyi' as const,
            },
            {
              anahtar: 'kotu',
              ust: 'En düşük performans',
              ana: `${enKotu.bolge} — skor ${enKotu.skor}`,
              alt: `Raf bulunurluğu %${enKotu.rafUygunluk} · görev tamamlama %${enKotu.gorevTamamlama} · ortalama bekleme ${sureYaz(enKotu.kuyrukSn)}`,
              vurgu: enKotu.skor < 70 ? ('kritik' as const) : ('dikkat' as const),
            },
            {
              anahtar: 'fark',
              ust: 'Aradaki fark',
              ana: `${enIyi.skor - enKotu.skor} puan`,
              alt: `${enKotu.bolge} bölgesini ağ ortalamasına çekmek, en büyük tek kazanç kalemi.`,
              vurgu: 'dikkat' as const,
            },
          ]}
        />

        <ModulIkili>
          <ModulDagilim
            baslik="Bölge sağlık skoru"
            birim="yuzde"
            dilimler={skorCubuklari}
          />
          <ModulTablo
            baslik="Bölge dağılımı"
            basliklar={['Bölge', 'Mağaza', 'Skor', 'Açık alarm']}
            sutunlar="1.3fr .7fr .6fr .9fr"
            satirlar={bolgeler.map(b => ({
              anahtar: b.bolge,
              hucreler: [b.bolge, String(b.magazaSayisi), String(b.skor), String(b.acikAlarm)],
              vurgu: b.skor >= 80 ? ('iyi' as const) : b.skor >= 70 ? ('dikkat' as const) : ('kritik' as const),
            }))}
          />
        </ModulIkili>

        <ModulTablo
          baslik="Metrik karşılaştırması"
          sag={<span className="so-kart-not">bölge ortalamaları</span>}
          basliklar={['Bölge', 'Dönüşüm', 'Ort. kasa beklemesi', 'Raf uygunluk', 'Görev tamamlama', 'Skor']}
          sutunlar="1.2fr .8fr 1.2fr .9fr 1.1fr .6fr"
          satirlar={bolgeler.map(b => ({
            anahtar: b.bolge,
            hucreler: [
              b.bolge,
              `%${sayiYaz(b.donusum)}`,
              `${sureYaz(b.kuyrukSn)}${b.kuyrukSn > 180 ? ' ⚠' : ''}`,
              `%${b.rafUygunluk}`,
              `%${b.gorevTamamlama}`,
              String(b.skor),
            ],
            vurgu: b.skor >= 80 ? ('iyi' as const) : b.skor >= 70 ? ('dikkat' as const) : ('kritik' as const),
          }))}
        />

        <p className="so-modul-dipnot">
          Bu ekrandaki bölge sayıları ayrıca üretilmez: Mağazalar ekranındaki on iki mağazanın
          ortalamasıdır. Kasa beklemesi {sureYaz(180)} kural eşiğine göre işaretlenir — eşiği aşan
          bölge ⚠ ile gösterilir. Gerçek kurulumda aynı hesap ~800 mağaza üzerinde çalışır;
          formül ve zincir değişmez, yalnız kayıt sayısı büyür.
        </p>
      </ModulEkrani>
    </Kabuk>
  )
}
