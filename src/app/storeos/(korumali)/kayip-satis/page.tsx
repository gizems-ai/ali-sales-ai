// ════════════════════════════════════════════════════════════════════════════
//  /storeos/kayip-satis — operasyonel kayıp satış.
//
//  Panelin geri kalanı olayı gösterir; bu ekran olayın FİYATINI koyar. Rakip
//  ürünlerde karşılığı yok, çünkü kayıp satış ölçülemez — yalnız MODELLENİR.
//  Bu ekranın tek riski de burada: modelden çıkan sayıyı ölçüm gibi sunmak.
//
//  Bu yüzden ekran modelin kendisini gösteriyor. Tabloda kişi, ortalama sepet
//  ve kaçırma katsayısı ayrı sütunlarda duruyor; üçünü çarpan biri en sağdaki
//  tutara ulaşır. "Nereden buldunuz" sorusunun cevabı ekranda yazılı.
//
//  Kaçırma katsayıları `demo-metrikler.ts`te sabit (KACIRMA_KATSAYISI) ve
//  tohumlanmıyor: modelin yargı içeren tek yeri o, dolayısıyla gün gün
//  değişmemeli.
// ════════════════════════════════════════════════════════════════════════════

import {
  ModulBuyukSayi, ModulDagilim, ModulEkrani, ModulIkili, ModulOneri,
  ModulSeriKarti, ModulTablo,
} from '@/components/storeos/modul-sablonu'
import { KACIRMA_KATSAYISI, kayipModulu } from '@/lib/storeos/depo/demo-metrikler'

export const dynamic = 'force-dynamic'

/** Bu satır ekrandan KALDIRILAMAZ — modelin adı, sayının yanında durur. */
const MODEL_UYARISI =
  'Modellenmiş tahmin. Gerçek rakam POS entegrasyonu ve pilot baseline’ı ile hesaplanır.'

export default function KayipSatisSayfasi() {
  const gun = new Date().toISOString().slice(0, 10)
  const k = kayipModulu(gun)
  const artti = k.fark > 0

  return (
    <ModulEkrani
      baslik="Operasyonel Kayıp Satış"
      aciklama="Mağazada yaşanan operasyonel aksaklıkların tahmini ciro karşılığı — kişi × ortalama sepet × kaçırma katsayısı."
      kpiler={k.kpiler}
    >
      <ModulIkili>
        <ModulBuyukSayi
          ustBaslik="Bugün tahmini operasyonel kayıp"
          sayi={`₺${k.toplam.toLocaleString('tr-TR')}`}
          altMetin={`${k.etkilenenKisi} ziyaretçi etkilendi · kişi başı ortalama ₺${Math.round(k.toplam / k.etkilenenKisi).toLocaleString('tr-TR')}`}
          karsilastirma={{
            metin: `Düne göre ${artti ? '↑' : '↓'} %${Math.abs(k.fark)} (dün ₺${k.dunToplam.toLocaleString('tr-TR')})`,
            yon: artti ? 'kotu' : 'iyi',
          }}
          uyari={MODEL_UYARISI}
        />
        <ModulDagilim
          baslik="Kaybın sebebe göre dağılımı"
          birim="TL"
          dilimler={k.dagilim}
        />
      </ModulIkili>

      <ModulTablo
        baslik="Model — kalem kalem"
        basliklar={['Sebep', 'Etkilenen', 'Ort. sepet', 'Kaçırma kats.', 'Tahmini kayıp', 'Pay']}
        sutunlar="2fr 1fr 1fr 1fr 1fr .7fr"
        satirlar={k.satirlar}
        sag={<span className="so-kart-not">kişi × sepet × katsayı</span>}
      />

      <ModulSeriKarti seri={k.saatlik} />

      <ModulOneri
        baslik="Kaybın büyük kısmı tek bir yerden geliyor"
        metin={`Tahmini kaybın %${k.kalemler[0].yuzde}’i danışman bulamayan ziyaretçiden doğuyor. Tepe bant (17:00–19:00) tek başına günün kaybının üçte birini taşıyor; bu bantta reyon personelinin kasaya kaydırılması kaybı yer değiştirmekten öteye gitmez.`}
        gerekce={`Katsayılar sabit: hizmet ${KACIRMA_KATSAYISI.hizmet} · ürün ${KACIRMA_KATSAYISI.urun} · kuyruk ${KACIRMA_KATSAYISI.kuyruk}. Katsayı, o aksaklığı yaşayan müşterinin alışverişten tamamen vazgeçme payıdır ve pilot süresince POS verisiyle kalibre edilir.`}
      />

      <p className="so-modul-dipnot">
        {MODEL_UYARISI} Etkilenen ziyaretçi sayıları kamera, raf tarama ve kuyruk sayımı
        sinyallerinden türetilir; kişi kimliklendirmesi yapılmaz. Ortalama sepet değerleri POS
        entegrasyonu bağlanana kadar örnek (seed) veridir.
      </p>
    </ModulEkrani>
  )
}
