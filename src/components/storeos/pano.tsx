'use client'

// ════════════════════════════════════════════════════════════════════════════
//  Store OS — PANO (tek istemci bileşeni)
//
//  Buradaki TEK veri kaynağı `usePano()`; tek uç noktadan gelir. Alt bileşenler
//  aptaldır, hiçbiri kendi isteğini atmaz. Bir kart eklemek istek sayısını
//  artırmaz — `DashboardVerisi`'ne alan eklemek yeter.
// ════════════════════════════════════════════════════════════════════════════

import { AlarmListesi, GorevListesi, KameraListesi, KpiIzgarasi, MagazaBasligi, PersonelListesi } from './kartlar'
import { DagilimCubugu, IzgaraHaritasi, SeriGrafigi } from './grafikler'
import { HataDurumu, Kart, OrnekVeri, gecenSure } from './temel'
import { usePano } from './use-pano'

export function Pano() {
  const { veri, hata, yukleniyor, duraklatildi, sonGuncelleme, yenile } = usePano()

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

  return (
    <>
      <header className="so-ust">
        <MagazaBasligi magaza={veri?.magaza ?? null} />
        <div className="so-ust-sag">
          {veri?.veriTipi === 'demo' && <OrnekVeri veriTipi="demo" />}
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

        <KpiIzgarasi kartlar={yukleniyor ? null : veri?.kpiler ?? null} />

        <div className="so-izgara so-izgara-2">
          <AlarmListesi alarmlar={yukleniyor ? null : veri?.alarmlar ?? null} simdiMs={simdiMs} />
          <GorevListesi
            gorevler={yukleniyor ? null : veri?.gorevler ?? null}
            ozet={veri?.gorevOzeti ?? null}
          />
        </div>

        <div className="so-izgara so-izgara-2">
          <SeriGrafigi seri={yukleniyor ? null : veri?.kuyrukSerisi ?? null} />
          <SeriGrafigi seri={yukleniyor ? null : veri?.satisSerisi ?? null} />
        </div>

        <div className="so-izgara so-izgara-2">
          <IzgaraHaritasi izgara={yukleniyor ? null : veri?.yogunlukIzgarasi ?? null} />
          <DagilimCubugu dagilim={yukleniyor ? null : veri?.rafDoluluk ?? null} />
        </div>

        <div className="so-izgara so-izgara-2">
          <KameraListesi kameralar={yukleniyor ? null : veri?.kameralar ?? null} />
          <PersonelListesi personel={yukleniyor ? null : veri?.personel ?? null} />
        </div>

        <p style={{ fontSize: 11, color: 'var(--so-metin-silik)', margin: 0 }}>
          {/* DÜRÜSTLÜK KURALI (madde 11) — ekranın altında sabit, kaldırılmaz. */}
          &quot;örnek veri&quot; etiketli tüm değerler demo amaçlı üretilmiş seed verisidir; gerçek
          ölçüm değildir. Store OS yüz tanıma, biyometrik eşleştirme veya kişi kimliklendirmesi yapmaz.
        </p>
      </div>
    </>
  )
}
