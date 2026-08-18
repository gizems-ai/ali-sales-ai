// ════════════════════════════════════════════════════════════════════════════
//  Store OS — OPERASYONEL KAYIP KARTI (pano)
//
//  Panodaki diğer her kart "ne oldu" der. Bu kart "bunun parası ne" der ve
//  panonun tek MODEL çıktısıdır. Bu yüzden iki şey zorunlu tutuldu:
//
//   1. Modelin adı sayının altında, kartın içinde yazılı — silik dipnotta
//      değil. Kart kırpılsa bile uyarı sayının yanından ayrılmaz.
//   2. Sayı burada HESAPLANMAZ; `kayipModulu` tek kaynaktır. Kart ile
//      `/storeos/kayip-satis` ekranı aynı fonksiyondan beslendiği için
//      matematiksel olarak çelişemezler.
//
//  Kart seed'den beslenir ve HİÇ istek atmaz: panonun anket bütçesine
//  dokunmaz, Airtable'a tek çağrı eklemez.
// ════════════════════════════════════════════════════════════════════════════

import { kayipModulu } from '@/lib/storeos/depo/demo-metrikler'
import { DagilimCubugu } from './grafikler'
import { Kart } from './temel'

/** Ekranda ve dipnotta birebir aynı cümle — iki yerde ayrışmasın. */
export const KAYIP_MODEL_UYARISI =
  'Modellenmiş tahmin. Gerçek rakam POS entegrasyonu ve pilot baseline’ı ile hesaplanır.'

export function KayipKarti() {
  const gun = new Date().toISOString().slice(0, 10)
  const k = kayipModulu(gun)
  const artti = k.fark > 0

  return (
    <>
      <Kart
        baslik="Bugün tahmini operasyonel kayıp"
        ornek="demo"
        sag={<a className="so-kart-not so-kayip-link" href="/storeos/kayip-satis">Detay →</a>}
      >
        <div className="so-buyuk">
          <div className="so-buyuk-sayi">₺{k.toplam.toLocaleString('tr-TR')}</div>
          <div className="so-buyuk-alt">{k.etkilenenKisi} ziyaretçi etkilendi</div>
          <div className="so-buyuk-fark" data-yon={artti ? 'kotu' : 'iyi'}>
            Düne göre {artti ? '↑' : '↓'} %{Math.abs(k.fark)} (dün ₺{k.dunToplam.toLocaleString('tr-TR')})
          </div>
        </div>
        <p className="so-buyuk-uyari">{KAYIP_MODEL_UYARISI}</p>
      </Kart>

      <DagilimCubugu
        dagilim={{
          baslik: 'Kaybın sebebi',
          birim: 'TL',
          dilimler: k.dagilim,
          veriTipi: 'demo',
        }}
      />
    </>
  )
}
