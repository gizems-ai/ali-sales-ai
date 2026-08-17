'use client'

// ════════════════════════════════════════════════════════════════════════════
//  Store OS — PANO (tek istemci bileşeni)
//
//  Buradaki TEK veri kaynağı `usePano()`; tek uç noktadan gelir. Alt bileşenler
//  aptaldır, hiçbiri kendi isteğini atmaz. Bir kart eklemek istek sayısını
//  artırmaz — `DashboardVerisi`'ne alan eklemek yeter.
//
//  DÜZEN (Gün 7, düzen referansının React karşılığı):
//    satır 1 · sağlık skoru (kahraman) + 5 KPI kartı
//    satır 2 · kamera | anlık durum | (öneriler + görevler)
//    satır 3 · kuyruk | raf & stok | ısı haritası
//    satır 4 · satış | kasa | personel donut | hızlı işlemler
//  Izgara oranları CSS'te (`.so-satir-*`); burada yalnız hangi kutunun nereye
//  düştüğü yazılı. On bir KPI'lık düz ızgara yok: ayrımı `toplayici.ts` yapar.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect } from 'react'
import { AnlikDurum, KpiSeridi, MagazaBasligi, SkorKart } from './kartlar'
import { DonutDagilimi, IzgaraHaritasi } from './grafikler'
import { useMagazaYayini } from './magaza-baglami'
import {
  GorevPaneli, HizliIslemler, KameraPaneli, KasaPaneli,
  KuyrukPaneli, OneriPaneli, SatisPaneli, StokPaneli,
} from './paneller'
import { HataDurumu, Kart, OrnekBant, gecenSure, sayiYaz, tarihUzunYaz } from './temel'
import { usePano } from './use-pano'

export function Pano() {
  const { veri, hata, yukleniyor, duraklatildi, sonGuncelleme, yenile } = usePano()

  // Yan menüdeki mağaza seçici panonun çektiği veriyi kullanır; ikinci bir
  // istek atılmaz (bkz. `magaza-baglami.tsx`). `magaza` yavaş katmanda geldiği
  // için `null` olduğu turlarda yayın yapılmaz — menüdeki ad titremesin.
  const yayinla = useMagazaYayini()
  useEffect(() => {
    if (veri?.magaza) yayinla(veri.magaza)
  }, [veri?.magaza, yayinla])

  // Elde HİÇ veri yokken hata → tam sayfa hata ekranı. Veri varken hata →
  // ekran ayakta kalır, üstte bir uyarı şeridi görünür (anket kendini toparlar).
  if (hata && !veri) {
    return (
      <div className="so-govde">
        <Kart>
          <HataDurumu
            metin={hata.hata}
            tekrarDene={hata.tekrarDenenebilir ? yenile : undefined}
          />
        </Kart>
      </div>
    )
  }

  // "Şimdi" sunucunun ürettiği andan gelir — istemci saatine göre değil.
  // Hydration uyuşmazlığını da böyle engelliyoruz (Date.now() render'da yok).
  const simdiMs = veri ? Date.parse(veri.uretildi) : 0
  const bos = yukleniyor ? null : veri ?? null
  const alarmSayisi = veri?.alarmlar?.length ?? null

  return (
    <>
      <header className="so-ust so-ust-pano">
        <MagazaBasligi magaza={veri?.magaza ?? null} />
        <div className="so-ust-sag">
          {veri && <div className="so-pilula">{tarihUzunYaz(veri.uretildi)}</div>}
          {alarmSayisi !== null && (
            <div className="so-pilula" title="Açık alarm sayısı">
              <span aria-hidden="true">🔔</span> {sayiYaz(alarmSayisi)}
            </div>
          )}
          <span className="so-nabiz" data-durum={hata ? 'hata' : 'iyi'}>
            <span className="so-nabiz-nokta" />
            {hata ? 'bağlantı sorunu'
              : duraklatildi ? 'duraklatıldı'
              : sonGuncelleme && veri ? `güncel · ${gecenSure(veri.uretildi, sonGuncelleme)}`
              : 'bağlanıyor'}
          </span>
          <button type="button" className="so-dugme" onClick={yenile}>Yenile</button>
        </div>
      </header>

      <div className="so-govde">
        {hata && veri && (
          <Kart className="so-durum-hata">
            <div style={{ fontSize: 12.5 }}>
              Son güncelleme başarısız: {hata.hata}. Ekrandaki veriler bir önceki turdan.
            </div>
          </Kart>
        )}

        {/* DÜRÜSTLÜK: ekranda TEK bant. Kart köşelerindeki sarı nokta ile
            birlikte madde 11'i karşılar; on üç ayrı rozet kaldırıldı. */}
        {veri && <OrnekBant veriTipi={veri.veriTipi} />}

        {/* ── 1 · Sağlık skoru + KPI ─────────────────────────────────────── */}
        <section className="so-satir-kpi">
          <SkorKart skor={bos?.saglikSkoru ?? null} />
          <KpiSeridi kartlar={bos?.kpiler ?? null} />
        </section>

        {/* ── 2 · Kamera | anlık durum | öneriler + görevler ──────────────── */}
        <section className="so-satir-orta">
          <KameraPaneli kameralar={bos?.kameralar ?? null} />
          <AnlikDurum kpiler={bos?.kpiler ?? null} magaza={veri?.magaza ?? null} />
          <div className="so-sutun">
            <OneriPaneli alarmlar={bos?.alarmlar ?? null} simdiMs={simdiMs} />
            <GorevPaneli gorevler={bos?.gorevler ?? null} ozet={veri?.gorevOzeti ?? null} />
          </div>
        </section>

        {/* ── 3 · Kuyruk | raf & stok | yoğunluk ──────────────────────────── */}
        <section className="so-satir-uc">
          <KuyrukPaneli seri={bos?.kuyrukSerisi ?? null} kpiler={bos?.kpiler ?? null} />
          <StokPaneli rafDoluluk={bos?.rafDoluluk ?? null} />
          <IzgaraHaritasi izgara={bos?.yogunlukIzgarasi ?? null} />
        </section>

        {/* ── 4 · Satış | kasa | personel | hızlı işlemler ────────────────── */}
        <section className="so-satir-dort">
          <SatisPaneli seri={bos?.satisSerisi ?? null} kpiler={bos?.kpiler ?? null} />
          <KasaPaneli magaza={veri?.magaza ?? null} kpiler={bos?.kpiler ?? null} />
          <DonutDagilimi dagilim={bos?.personelDagilimi ?? null} baslik="Personel Dağılımı" />
          <HizliIslemler />
        </section>

        <p style={{ fontSize: 11, color: 'var(--so-metin-silik)', margin: 0 }}>
          {/* DÜRÜSTLÜK KURALI (madde 11) — ekranın altında sabit, kaldırılmaz. */}
          &quot;örnek veri&quot; etiketli tüm değerler demo amaçlı üretilmiş seed verisidir; gerçek
          ölçüm değildir. Store OS yüz tanıma, biyometrik eşleştirme veya kişi kimliklendirmesi yapmaz.
        </p>
      </div>
    </>
  )
}
