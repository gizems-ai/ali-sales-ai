// ════════════════════════════════════════════════════════════════════════════
//  Store OS — üst satır: sağlık skoru (kahraman) + KPI kartları + anlık durum.
//
//  Gün 6'da on bir metrik düz bir ızgaradaydı; hiçbiri diğerinden önemli
//  görünmüyordu. Gün 7 düzeni ikiye ayırdı: BEŞ büyük kart (her biri mini trend
//  ve düne göre karşılaştırma taşır) + kalanlar "Anlık Durum" listesinde.
//  Ayrımı `toplayici.ts` yapar (`yerlesim`), bileşen yalnız filtreler.
//
//  Aptal bileşenler: veri props ile gelir, hiçbiri kendi isteğini atmaz.
// ════════════════════════════════════════════════════════════════════════════

import type {
  KpiKarti, MagazaOzeti, SaglikSkoru,
} from '@/lib/storeos/dashboard/tipler'
import { DEGISKEN, kpiCipRengi, kpiIkonu, skorRengi } from '@/lib/storeos/tema'
import { MiniTrend, YarimGosterge } from './grafikler'
import {
  BosDurum, Iskelet, Kart, OrnekNokta, degerYaz, sayiYaz,
} from './temel'

// ─── Düne göre karşılaştırma ─────────────────────────────────────────────────

interface Delta { metin: string; sinif: string }

/**
 * `onceki` YOKSA hiçbir şey çizilmez — uydurulmuş bir "%0 vs dün" gösterilmez.
 * Renk kararı işaretin yönünden değil `iyiYon`dan gelir: kasa bekleme süresinin
 * düşmesi yeşildir, ziyaretçi sayısının düşmesi değil.
 */
function delta(k: KpiKarti): Delta | null {
  if (k.onceki === null) return null
  const fark = k.deger - k.onceki
  if (fark === 0) return { metin: 'dün ile aynı', sinif: '' }

  const arttiIyi = fark > 0 === (k.iyiYon === 'artis')
  const sinif = arttiIyi ? 'so-yukari' : 'so-asagi'
  const ok = fark > 0 ? '↑' : '↓'
  const mutlak = Math.abs(fark)

  // Oran anlamlı olmayan birimlerde MUTLAK fark yazılır: yüzde bir metrikte
  // "%18'den %21'e" bir "%16 artış" değil, "3 puan"dır.
  if (k.birim === 'yuzde') return { metin: `${ok} ${sayiYaz(mutlak)} puan vs dün`, sinif }
  if (k.birim === 'sn' || k.birim === 'C') return { metin: `${ok} ${degerYaz(mutlak, k.birim)} vs dün`, sinif }
  if (k.onceki === 0) return { metin: `${ok} ${sayiYaz(mutlak)} vs dün`, sinif }

  const oran = Math.round((fark / k.onceki) * 100)
  return { metin: `${ok} %${sayiYaz(Math.abs(oran))} vs dün`, sinif }
}

// ─── Sağlık skoru — kahraman öğe ─────────────────────────────────────────────

export function SkorKart({ skor }: { skor: SaglikSkoru | null }) {
  if (skor === null) {
    return (
      <div className="so-kart so-skor-kart">
        <Iskelet yukseklik={74} genislik="132px" />
      </div>
    )
  }
  return (
    <div className="so-kart so-skor-kart">
      <OrnekNokta veriTipi={skor.veriTipi} />
      <div className="so-skor-etiket">Mağaza Sağlık Skoru</div>
      <YarimGosterge deger={skor.deger} renk={skorRengi(skor.deger)} />
      <div className="so-skor-deger">{sayiYaz(skor.deger)}</div>
      <div className="so-skor-sinif">{skor.sinif}</div>
      <div className="so-skor-alt">{skor.gerekce}</div>
    </div>
  )
}

// ─── Beş KPI kartı ───────────────────────────────────────────────────────────

export function KpiSeridi({ kartlar }: { kartlar: KpiKarti[] | null }) {
  if (kartlar === null) {
    return (
      <>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="so-kart"><Iskelet yukseklik={78} /></div>
        ))}
      </>
    )
  }
  const kart = kartlar.filter(k => k.yerlesim === 'kart')
  if (kart.length === 0) {
    return (
      <Kart>
        <BosDurum
          sabit
          baslik="Henüz metrik yok"
          metin="Bu mağaza için gösterge verisi bulunamadı. Seed çalıştırıldıysa birkaç saniye içinde görünür."
        />
      </Kart>
    )
  }
  return (
    <>
      {kart.map(k => {
        const d = delta(k)
        // MADDE C: trend serisi yoksa kart ızgara gerdirmesinden çıkar
        // (`align-self: start`) — kocaman beyaz boşluk bırakmak yerine küçülür.
        const trendVar = Boolean(k.trend && k.trend.length >= 2)
        return (
          <div
            key={k.anahtar}
            className="so-kart so-kpi-kart"
            data-trendsiz={trendVar ? undefined : '1'}
          >
            <div className="so-kpi-ust">
              <span className="so-kpi-etiket">{k.etiket}</span>
              <OrnekNokta veriTipi={k.veriTipi} />
              {/* Renkli ikon çipi — emlak `EKpiCard` deseni. Renk adı
                  `tema.ts`'ten, renk DEĞERİ `.storeos-root` token'ından. */}
              <span className="so-kpi-cip" data-renk={kpiCipRengi(k.anahtar)} aria-hidden="true">
                {kpiIkonu(k.anahtar)}
              </span>
            </div>
            <div className="so-kpi-deger">{degerYaz(k.deger, k.birim)}</div>
            {d && <div className={`so-kpi-delta ${d.sinif}`.trim()}>{d.metin}</div>}
            {trendVar && k.trend && (
              <MiniTrend
                noktalar={k.trend}
                renk={d?.sinif === 'so-asagi' ? DEGISKEN.medium : DEGISKEN.marka}
              />
            )}
          </div>
        )
      })}
    </>
  )
}

// ─── Anlık durum ─────────────────────────────────────────────────────────────

/**
 * Eşikler burada, tek yerde. Yalnız savunulabilir iki metrik renklenir:
 * yoğunluk (mağaza doluluğu) ve etiket uygunluğu. Gerisi nötr kalır —
 * her satırı renklendirmek "her şey acil" demektir, hiçbir şey demektir.
 */
function vurgu(anahtar: string, deger: number): string | undefined {
  if (anahtar === 'yogunluk') {
    if (deger >= 85) return 'kritik'
    if (deger >= 70) return 'dikkat'
    return 'iyi'
  }
  if (anahtar === 'etiket_uygunluk') {
    if (deger >= 95) return 'iyi'
    if (deger >= 85) return 'dikkat'
    return 'kritik'
  }
  return undefined
}

export function AnlikDurum({
  kpiler, magaza,
}: {
  kpiler: KpiKarti[] | null
  magaza: MagazaOzeti | null
}) {
  if (kpiler === null) {
    return <Kart baslik="Anlık Durum"><Iskelet yukseklik={132} /></Kart>
  }
  const satirlar = kpiler.filter(k => k.yerlesim === 'durum' && k.anahtar !== 'kasa_acik')
  const kasaKpi = kpiler.find(k => k.anahtar === 'kasa_acik')
  const kasaAcik = magaza?.kasaAcik ?? kasaKpi?.deger ?? null

  if (satirlar.length === 0 && kasaAcik === null) {
    return (
      <Kart baslik="Anlık Durum">
        <BosDurum sabit baslik="Ölçüm yok" metin="Sensör ve kasa verisi ulaştığında bu liste dolar." />
      </Kart>
    )
  }

  const ornek = kpiler.some(k => k.veriTipi === 'demo') ? 'demo' : 'gercek'
  return (
    <Kart baslik="Anlık Durum" ornek={ornek}>
      {kasaAcik !== null && magaza && (
        <div className="so-durum-satir">
          <span aria-hidden="true">{kpiIkonu('kasa_acik')}</span>
          <span className="so-durum-ad">Kasalar</span>
          <span className="so-durum-deger">
            {sayiYaz(kasaAcik)} / {sayiYaz(magaza.kasaToplam)} açık
          </span>
        </div>
      )}
      {satirlar.map(k => (
        <div key={k.anahtar} className="so-durum-satir">
          <span aria-hidden="true">{kpiIkonu(k.anahtar)}</span>
          <span className="so-durum-ad">{k.etiket}</span>
          <span className="so-durum-deger" data-vurgu={vurgu(k.anahtar, k.deger)}>
            {degerYaz(k.deger, k.birim)}
          </span>
        </div>
      ))}
    </Kart>
  )
}

// ─── Üst bar başlığı ─────────────────────────────────────────────────────────

const MAGAZA_ROZETI: Record<string, { sinif: string; etiket: string }> = {
  online:  { sinif: 'so-sev-low',      etiket: 'Normal' },
  warning: { sinif: 'so-sev-medium',   etiket: 'Dikkat' },
  offline: { sinif: 'so-sev-critical', etiket: 'Kapalı' },
}

export function MagazaBasligi({ magaza }: { magaza: MagazaOzeti | null }) {
  if (!magaza) {
    return (
      <div>
        <h1>Store OS</h1>
        <div className="so-ust-alt"><Iskelet yukseklik={12} genislik="240px" /></div>
      </div>
    )
  }
  const rozet = MAGAZA_ROZETI[magaza.durum] ?? { sinif: 'so-notr', etiket: magaza.durum }
  const kasa = magaza.kasaAcik === null
    ? `${sayiYaz(magaza.kasaToplam)} kasa`
    : `${sayiYaz(magaza.kasaAcik)} / ${sayiYaz(magaza.kasaToplam)} kasa açık`
  return (
    <div>
      <h1>
        {magaza.ad}
        {magaza.durum === 'online'
          ? <span className="so-rozet-canli">CANLI</span>
          : <span className={`so-rozet ${rozet.sinif}`}>{rozet.etiket}</span>}
      </h1>
      <div className="so-ust-alt">
        <span>{magaza.kod} · {magaza.sehir}, {magaza.bolge}</span>
        <span>Açılış {magaza.acilis} · Kapanış {magaza.kapanis}</span>
        <span>{kasa}</span>
      </div>
    </div>
  )
}
