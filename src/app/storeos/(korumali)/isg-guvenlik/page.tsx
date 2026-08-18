// ════════════════════════════════════════════════════════════════════════════
//  /storeos/isg-guvenlik — İSG & GÜVENLİK (kapsam gösterisi · 18 Ağu 2026)
//
//  Olay listesi, seviye dağılımı ve olay detayı.
//
//  ── ANLIK GÖRÜNTÜ YER TUTUCUSU DEĞİL, ŞEMA ─────────────────────────────────
//  Olay detayında fotoğraf yerine kamera şeması kullanılıyor (aynı gerekçe:
//  gerçek görüntümüz yok, stok fotoğraf yalan söyler). Şema anonimdir:
//  kişiler dairedir, yüz yoktur.
//
//  SALT OKUNUR · seed.
// ════════════════════════════════════════════════════════════════════════════

import { Kabuk } from '@/components/storeos/kabuk'
import { KameraKaresi } from '@/components/storeos/kamera-karesi'
import {
  ModulDonut, ModulEkrani, ModulIkili, ModulTablo,
} from '@/components/storeos/modul-sablonu'
import { Kart } from '@/components/storeos/temel'
import { isgModulu } from '@/lib/storeos/depo/demo-metrikler'

export const dynamic = 'force-dynamic'

export default function IsgGuvenlikSayfasi() {
  const gun = new Date().toISOString().slice(0, 10)
  const { kpiler, kayitlar, dagilim } = isgModulu(gun)
  // Detay panelinde en ağır AÇIK kayıt gösterilir — jüri "hangisi önemli"
  // diye sormadan cevabı görsün.
  const detay = kayitlar.find(k => k.seviye === 'kritik' && k.durum !== 'Kapandı') ?? kayitlar[0]

  return (
    <Kabuk aktif="/storeos/isg-guvenlik">
      <ModulEkrani
        baslik="İSG & Güvenlik"
        aciklama="İş güvenliği ve güvenlik olayları, seviye dağılımı ve olay dosyası."
        kpiler={kpiler}
        ustSag={<span className="so-nabiz">{kayitlar.filter(k => k.durum === 'Açık').length} açık kayıt</span>}
      >
        <ModulTablo
          baslik="Olay kayıtları"
          basliklar={['Kayıt', 'Saat', 'Tip', 'Bölge', 'Durum']}
          sutunlar=".9fr .6fr 1.4fr 1.1fr .7fr"
          satirlar={kayitlar.map(k => ({
            anahtar: k.no,
            hucreler: [k.no, k.saat, k.tip, k.bolge, k.durum],
            vurgu: k.seviye === 'kritik' ? ('kritik' as const)
              : k.seviye === 'dikkat' ? ('dikkat' as const) : undefined,
          }))}
        />

        <ModulIkili>
          <Kart
            baslik={`Olay dosyası · ${detay.no}`}
            ornek="demo"
            sag={<span className="so-kart-not">{detay.saat} · {detay.durum}</span>}
          >
            <div className="so-kamera-ana">
              <KameraKaresi kod={detay.no} varyant={2} />
              <span className="so-kamera-etiket">DEMO GÖRÜNÜMÜ · anonim sayım</span>
            </div>
            <div className="so-vt">
              <div className="so-vt-satir" style={{ gridTemplateColumns: '.7fr 2fr' }}>
                <span className="so-vt-ad">Tip</span><span>{detay.tip}</span>
              </div>
              <div className="so-vt-satir" style={{ gridTemplateColumns: '.7fr 2fr' }}>
                <span className="so-vt-ad">Bölge</span><span>{detay.bolge}</span>
              </div>
              <div className="so-vt-satir" style={{ gridTemplateColumns: '.7fr 2fr' }}>
                <span className="so-vt-ad">Açıklama</span><span>{detay.aciklama}</span>
              </div>
            </div>
          </Kart>

          <ModulDonut baslik="Seviye dağılımı" dilimler={dagilim} />
        </ModulIkili>
      </ModulEkrani>
    </Kabuk>
  )
}
