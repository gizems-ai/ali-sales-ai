'use client'

// ════════════════════════════════════════════════════════════════════════════
//  Store OS — GERÇEK MAĞAZA GÖRÜNTÜSÜ (19 Ağu 2026)
//
//  Panelin geri kalanı seed verisiyle çalışıyor ve bunu her ekranda yazıyor.
//  Bu kart tek istisna: İzmir Forum Bornova'da çekilmiş GERÇEK bir kayıt.
//  Anlattığı şey de tam olarak Store OS'in var oluş sebebi — rafın önünde
//  duran, kimsenin ilgilenmediği ve hiçbir sisteme düşmeyen bir müşteri.
//
//  ── DÜRÜSTLÜK ──────────────────────────────────────────────────────────────
//   · Rozet YEŞİL ve "GERÇEK GÖRÜNTÜ" yazıyor; "örnek veri" rozetiyle aynı
//     renkte değil, çünkü aynı şey değil.
//   · Köşe etiketi yüz tanıma yapılmadığını söylüyor — görüntüdeki yüz zaten
//     kaynağında bulanıklaştırılmış.
//   · Zaman çizgisindeki üç an videonun üzerindeki yazılarla birebir aynı.
//
//  ── DEMO GÜNÜ SİGORTASI ────────────────────────────────────────────────────
//  Video Vercel Blob'dan (CDN) geliyor. Ağ takılırsa, URL boşsa veya dosya
//  düşerse `onError` sessizce mevcut SVG sahnesine geçer: ekran ASLA boş
//  kalmaz, hata metni görünmez. Yedeğe düşüldüğünde SVG kendi "DEMO GÖRÜNÜMÜ"
//  etiketini taşır — yedek, gerçek görüntü gibi sunulmaz.
// ════════════════════════════════════════════════════════════════════════════

import { useState, type ReactNode } from 'react'
import { Kart } from './temel'

/** Videonun üzerindeki köşe etiketi — her yerde aynı cümle. */
const KOSE_ETIKETI = 'GRATİS · İZMİR FORUM BORNOVA · anonim sayım · yüz tanıma yok'

/** Kayıttaki üç an. Videonun üzerine gömülü yazılarla birebir aynı. */
const ANLAR: Array<{ saat: string; metin: string; ton: 'mavi' | 'turuncu' | 'kirmizi' }> = [
  { saat: '0:07', metin: 'Müşteri rafı inceliyor',   ton: 'mavi' },
  { saat: '0:35', metin: 'Personel teması bekleniyor', ton: 'turuncu' },
  { saat: '1:14', metin: 'Temas yok — kayıp riski',  ton: 'kirmizi' },
]

/**
 * Video karesi. Yüklenemezse `yedek` düğümüne düşer.
 *
 * Kontroller GİZLİ ve otomatik oynuyor: sunumda kimsenin tıklaması gerekmiyor.
 * `poster` tanımlı, böylece ilk kare gelene kadar siyah kutu görünmüyor.
 */
export function GercekGoruntuKare({
  videoUrl, posterUrl, yedek,
}: {
  videoUrl: string
  posterUrl: string
  /** Video oynamazsa çizilecek SVG sahnesi. */
  yedek: ReactNode
}) {
  const [dustu, setDustu] = useState(false)

  if (!videoUrl || dustu) {
    // Sessiz yedek: kullanıcıya hata gösterilmez, sahne değişir.
    return <>{yedek}</>
  }

  return (
    <div className="so-gg-kare">
      <video
        className="so-gg-video"
        src={videoUrl}
        poster={posterUrl || undefined}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-label="İzmir Forum Bornova mağazasında hizmet alamayan müşteri kaydı"
        onError={() => setDustu(true)}
      />
      <span className="so-gg-etiket">{KOSE_ETIKETI}</span>
    </div>
  )
}

/**
 * Mağaza Özeti'ndeki kart: video + üç adımlık zaman çizgisi + tek cümle.
 *
 * Mevcut SVG kamera ızgarası KALDIRILMADI — o kameranın sağlığını gösteriyor,
 * bu kart bambaşka bir şey anlatıyor.
 */
export function GercekGoruntuKarti({
  videoUrl, posterUrl, yedek,
}: {
  videoUrl: string
  posterUrl: string
  yedek: ReactNode
}) {
  return (
    <Kart
      baslik="Hizmet alamayan müşteri — İzmir Forum Bornova"
      sag={<span className="so-gercek-rozet">GERÇEK GÖRÜNTÜ</span>}
    >
      <div className="so-gg-duzen">
        <GercekGoruntuKare videoUrl={videoUrl} posterUrl={posterUrl} yedek={yedek} />

        <div className="so-gg-akis">
          <ol className="so-gg-anlar">
            {ANLAR.map(a => (
              <li key={a.saat} data-ton={a.ton}>
                <i aria-hidden="true" />
                <b>{a.saat}</b>
                <span>{a.metin}</span>
              </li>
            ))}
          </ol>
          <p className="so-gg-cumle">
            Bu olay bugün hiçbir sistemde kayıtlı değil. Bizim ölçtüğümüz şey bu.
          </p>
        </div>
      </div>
    </Kart>
  )
}
