// ════════════════════════════════════════════════════════════════════════════
//  /storeos/magazalar — ÇOK MAĞAZALI GÖRÜNÜM (19 Ağu 2026)
//
//  Neden bu ekran: Gratis'in ~800 mağazası var. Tek mağaza göstermek, jürinin
//  aklında "peki 800'de ne olur" sorusunu cevapsız bırakıyordu. Bu ekran o
//  soruyu mimarî düzeyde cevaplar: aynı zincir, aynı skor formülü, N mağaza.
//
//  DÜRÜSTLÜK: on iki mağazanın on biri seed'dir ve TIKLANAMAZ — "pilot kapsamı
//  dışında" ipucu satırın kendisinde durur. Yalnız 0178 (İzmir Forum Bornova)
//  gerçek pilot mağazadır ve canlı panosuna gider. 0178 satırındaki sayılar da
//  ÖRNEK özettir; ekran bunu ayrıca yazar, çünkü jüri iki ekranı yan yana
//  koyup sayı karşılaştırır ve çelişki bulursa gösteri orada biter.
//
//  SALT OKUNUR · seed. Zincire dokunmaz, tek istek atmaz.
// ════════════════════════════════════════════════════════════════════════════

import { Kabuk } from '@/components/storeos/kabuk'
import {
  ModulEkrani, ModulTablo, ModulVurguSerit,
} from '@/components/storeos/modul-sablonu'
import { sayiYaz, sureYaz } from '@/components/storeos/temel'
import { magazaModulu } from '@/lib/storeos/depo/demo-metrikler'
import type { BolgeAdi, MagazaKaydi } from '@/lib/storeos/depo/demo-metrikler'

export const dynamic = 'force-dynamic'

const BOLGE_SIRASI: BolgeAdi[] = ['Marmara', 'Ege', 'İç Anadolu', 'Akdeniz']

const DURUM_VURGU = {
  normal: 'iyi', dikkat: 'dikkat', kritik: 'kritik',
} as const

const PILOT_DISI = 'Pilot kapsamı dışında — bu mağazanın panosu kurulumla birlikte açılır.'

function satir(m: MagazaKaydi) {
  return {
    anahtar: m.kod,
    hucreler: [
      `${m.kod} · ${m.ad}`,
      m.sehir,
      String(m.skor),
      m.acikAlarm === 0 ? '—' : `${m.acikAlarm}${m.kritikAlarm > 0 ? ` (${m.kritikAlarm} kritik)` : ''}`,
      m.acikGorev === 0 ? '—' : String(m.acikGorev),
      `%${sayiYaz(m.donusum)}`,
      `${sayiYaz(m.ziyaretci)}`,
      m.pilot ? 'PİLOT · canlı' : 'Seed',
    ],
    vurgu: DURUM_VURGU[m.durum],
    yol: m.pilot ? '/storeos' : undefined,
    ipucu: m.pilot ? 'Pilot mağaza — canlı Mağaza Özeti panosuna gider.' : PILOT_DISI,
  }
}

export default function MagazalarSayfasi() {
  const gun = new Date().toISOString().slice(0, 10)
  const { kpiler, magazalar, dikkat } = magazaModulu(gun)

  return (
    <Kabuk aktif="/storeos/magazalar">
      <ModulEkrani
        baslik="Mağazalar"
        aciklama="Ağ görünümü: sağlık skoruna göre sıralı mağaza listesi, bölge kırılımı ve dikkat gerektirenler."
        kpiler={kpiler}
        ustSag={<span className="so-nabiz">{magazalar.length} mağaza · 1 pilot</span>}
      >
        <ModulVurguSerit
          baslik="Dikkat gerektiren mağazalar"
          not={dikkat.length === 0 ? 'Bugün 70 altı mağaza yok' : 'skor < 70'}
          kartlar={dikkat.map(m => ({
            anahtar: m.kod,
            ust: `${m.kod} · ${m.bolge}`,
            ana: `${m.ad} — skor ${m.skor}`,
            alt: m.sebep,
            vurgu: DURUM_VURGU[m.durum],
            yol: m.pilot ? '/storeos' : undefined,
          }))}
        />

        {BOLGE_SIRASI.map(b => {
          const uyeler = magazalar.filter(m => m.bolge === b)
          if (uyeler.length === 0) return null
          const ort = Math.round(uyeler.reduce((t, m) => t + m.skor, 0) / uyeler.length)
          return (
            <ModulTablo
              key={b}
              baslik={b}
              sag={<span className="so-kart-not">{uyeler.length} mağaza · ortalama skor {ort}</span>}
              basliklar={['Mağaza', 'Şehir', 'Skor', 'Açık alarm', 'Açık görev', 'Dönüşüm', 'Ziyaretçi', 'Pano']}
              sutunlar="1.7fr .9fr .6fr 1.1fr .8fr .8fr .9fr .9fr"
              satirlar={uyeler.map(satir)}
            />
          )
        })}

        <p className="so-modul-dipnot">
          Sağlık skoru dört alt ölçüğün ağırlıklı ortalamasıdır: kasa beklemesi (%30), raf
          bulunurluğu (%30), görev tamamlama (%25) ve açık kritik alarm (%15) — pilot mağazanın
          panosundaki skorla aynı mantık. Listedeki on iki mağazadan yalnız{' '}
          <strong>0178 · Forum Bornova</strong> pilottur ve tıklanabilir; onun bu tablodaki satırı
          da örnek özettir, canlı sayılar Mağaza Özeti ekranında durur. Kalan on bir satır
          örnek veridir ve tıklanamaz — çok mağazalı kurulumda her satır kendi panosuna açılır.
          Bekleme süreleri {sureYaz(180)} eşiğine göre değerlendirilir.
        </p>
      </ModulEkrani>
    </Kabuk>
  )
}
