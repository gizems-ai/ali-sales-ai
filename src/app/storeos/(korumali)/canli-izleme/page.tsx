// ════════════════════════════════════════════════════════════════════════════
//  /storeos/canli-izleme — CANLI İZLEME (kapsam gösterisi · 18 Ağu 2026)
//
//  Altı kameralı ızgara + seçili kameranın büyük görünümü + kamera sağlığı +
//  kamera başına olay akışı.
//
//  ── NE GERÇEK, NE DEĞİL ────────────────────────────────────────────────────
//  Gerçek RTSP yayını YOK. Kareler `KameraKaresi`in tepeden şemasıdır; her biri
//  "DEMO GÖRÜNÜMÜ · anonim sayım" etiketi taşır ve kaldırılamaz. Altı kare
//  birbirinin kopyası olmasın diye `varyant` propu kullanılır — bu prop yalnız
//  SABİT kişi dizisini kaydırır, veri uydurmaz.
//
//  ── BÜYÜK GÖRÜNÜM JAVASCRIPT'SİZ ───────────────────────────────────────────
//  Kareye tıklamak `?kamera=<kod>` adresine gider; sayfa sunucuda yeniden
//  çizilir. İstemci bileşeni, durum, anket YOK. Zincire (olay → kural → görev)
//  tek istek bile eklemez: tüm veri `demo-metrikler.ts` seed'inden gelir.
// ════════════════════════════════════════════════════════════════════════════

import Link from 'next/link'
import { Kabuk } from '@/components/storeos/kabuk'
import { KameraKaresi } from '@/components/storeos/kamera-karesi'
import { GercekGoruntuKare } from '@/components/storeos/gercek-goruntu'
import { env } from '@/lib/storeos/env'
import {
  ModulEkrani, ModulIkili, ModulListe, ModulTablo,
} from '@/components/storeos/modul-sablonu'
import { Kart } from '@/components/storeos/temel'
import { kameraModulu } from '@/lib/storeos/depo/demo-metrikler'

export const dynamic = 'force-dynamic'

const DURUM_ETIKETI = { online: 'Bağlı', degraded: 'Bozuk', offline: 'Çevrimdışı' } as const

export default async function CanliIzlemeSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const istenen = Array.isArray(sp.kamera) ? sp.kamera[0] : sp.kamera

  const gun = new Date().toISOString().slice(0, 10)
  const { kameralar, olaylar, kpiler } = kameraModulu(gun)

  // Bilinmeyen kod sessizce ilk kameraya düşer — adres çubuğuna elle yazılan
  // bir değer ekranı boş bırakmasın.
  const secili = kameralar.find(k => k.id === istenen) ?? kameralar[0]
  const cevrimici = kameralar.filter(k => k.durum === 'online').length

  return (
    <Kabuk aktif="/storeos/canli-izleme">
      <ModulEkrani
        baslik="Canlı İzleme"
        aciklama="Altı kamera bölgesi, anonim yoğunluk sayımı ve kamera sağlığı tek ekranda."
        kpiler={kpiler}
        ustSag={
          <span className="so-nabiz">
            {cevrimici} çevrimiçi · {kameralar.length - cevrimici} çevrimdışı
          </span>
        }
      >
        {/* Ana karede GERÇEK kayıt oynar (İzmir Forum Bornova); ızgaradaki
            diğer üç/altı kare şematik SVG olarak kalır. Video düşerse bu kare
            de sessizce eski SVG sahnesine geri döner. */}
        <Kart
          baslik={`${secili.ad} · ${secili.bolge}`}
          sag={<span className="so-gercek-rozet">GERÇEK GÖRÜNTÜ</span>}
        >
          <GercekGoruntuKare
            videoUrl={(Array.isArray(sp.goruntu) ? sp.goruntu[0] : sp.goruntu) === 'yedek' ? '' : env.kameraVideoUrl}
            posterUrl={env.kameraPosterUrl}
            yedek={
              <div className="so-kamera-ana">
                <KameraKaresi
                  kod={secili.id.toUpperCase()}
                  kuyruk={secili.kuyruk}
                  varyant={secili.varyant}
                />
                <span className="so-kamera-etiket">DEMO GÖRÜNÜMÜ · anonim sayım</span>
              </div>
            }
          />
          <div className="so-kamera-alt">
            <span>Son bağlantı {secili.sonBaglanti} · son olay {secili.sonOlay}</span>
            <span>{secili.cozunurluk} · {secili.fps} fps · anonim sayım · yüz tanıma yok</span>
          </div>
        </Kart>

        <Kart
          baslik="Kamera ızgarası"
          ornek="demo"
          sag={<span className="so-kart-not">büyütmek için kareye tıklayın</span>}
        >
          <div className="so-kam-izgara">
            {kameralar.map(k => (
              <Link
                key={k.id}
                href={`/storeos/canli-izleme?kamera=${encodeURIComponent(k.id)}`}
                className="so-kam-kart"
                aria-current={k.id === secili.id ? 'true' : undefined}
              >
                <div className="so-kam-kart-ust">
                  <div>
                    <div className="so-kam-kart-ad">{k.ad}</div>
                    <div className="so-kam-kart-bolge">{k.bolge}</div>
                  </div>
                  <span className="so-kam-cevrimici">{DURUM_ETIKETI[k.durum]}</span>
                </div>
                <div className="so-kamera-ana">
                  <KameraKaresi kod={k.id.toUpperCase()} kuyruk={k.kuyruk} varyant={k.varyant} />
                  <span className="so-kamera-etiket">DEMO GÖRÜNÜMÜ</span>
                </div>
                <div className="so-kam-kart-alt">
                  <span>son bağlantı {k.sonBaglanti}</span>
                  <span>{k.cozunurluk}</span>
                </div>
              </Link>
            ))}
          </div>
        </Kart>

        <ModulIkili>
          <ModulTablo
            baslik="Kamera sağlığı"
            basliklar={['Kamera', 'Bölge', 'Durum', 'Çözünürlük', 'Son olay']}
            sutunlar="1.4fr 1.2fr .8fr .8fr .8fr"
            satirlar={kameralar.map(k => ({
              anahtar: k.id,
              hucreler: [k.ad, k.bolge, DURUM_ETIKETI[k.durum], `${k.cozunurluk} · ${k.fps} fps`, k.sonOlay],
              vurgu: k.durum === 'online' ? ('iyi' as const) : ('kritik' as const),
            }))}
          />

          <ModulListe
            baslik="Kamera olay akışı"
            sag={<span className="so-kart-not">bugün · {olaylar.length} kayıt</span>}
            satirlar={olaylar.map((o, i) => ({
              anahtar: `${o.saat}-${i}`,
              sol: o.saat,
              ana: o.metin,
              alt: o.kameraAdi,
              vurgu: o.seviye === 'kritik' ? 'kritik' : o.seviye === 'dikkat' ? 'dikkat' : undefined,
            }))}
          />
        </ModulIkili>
      </ModulEkrani>
    </Kabuk>
  )
}
