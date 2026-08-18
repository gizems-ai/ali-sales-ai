// ════════════════════════════════════════════════════════════════════════════
//  /storeos/magaza-analizleri — MAĞAZA ANALİZLERİ (19 Ağu 2026)
//
//  Müşteri yolculuğu, ziyaretçi eğrisi (bugün/dün ve bugün/geçen hafta),
//  dönüşüm hunisi, alan ziyaretleri, bölge bazlı kalış süresi ve ısı haritası.
//
//  ── YOLCULUK EN ÜSTTE ───────────────────────────────────────────────────────
//  Ekranın en anlaşılır kutusu bu: "insanlar mağazada nereye gidiyor ve nerede
//  kaybediliyoruz". Eğriler ve ısı haritası bunu destekleyen kanıt; sıralama
//  bu yüzden yolculuk → eğri → huni/alan → harita.
//
//  ── SAYILAR TEK ZİNCİRDEN ───────────────────────────────────────────────────
//  Ziyaretçi KPI'ı, yolculuğun ilk adımı ve huninin ilk basamağı AYNI sayı;
//  dönüşüm KPI'ı da yolculuğun iki ucundan hesaplanıyor (bkz. `analizModulu`).
//  Ekranda dört yerde geçen "kaç kişi" tek kaynaktan gelmek zorunda.
//
//  Isı haritası ANONİM yoğunluktur: hücre = bölge doluluk yüzdesi. Kişi tanıma,
//  takip veya biyometri yok — Store OS'in mahremiyet duruşu ekranda da yazar.
//
//  SALT OKUNUR · seed.
// ════════════════════════════════════════════════════════════════════════════

import { Kabuk } from '@/components/storeos/kabuk'
import {
  ModulAkis, ModulDagilim, ModulEkrani, ModulIkili, ModulIzgara,
  ModulSeriKarti, ModulTablo,
} from '@/components/storeos/modul-sablonu'
import { analizModulu } from '@/lib/storeos/depo/demo-metrikler'

export const dynamic = 'force-dynamic'

export default function MagazaAnalizleriSayfasi() {
  const gun = new Date().toISOString().slice(0, 10)
  const {
    kpiler, ziyaretciBugunDun, ziyaretciGecenHafta, huni, yolculuk,
    kasaOncesiTerk, alanlar, kalisSuresi, izgara,
  } = analizModulu(gun)

  const giris = huni[0]?.deger ?? 0
  const satis = huni[huni.length - 1]?.deger ?? 0
  const oran = giris > 0 ? Math.round((satis / giris) * 100) : 0
  // En büyük düşüşün yaşandığı adım — kartın sağ üst notu bunu söyler.
  const enBuyukDusus = yolculuk.reduce((a, b) => (b.dusus > a.dusus ? b : a), yolculuk[0])
  const ugranmayan = alanlar.filter(a => a.ziyaret === 0)

  return (
    <Kabuk aktif="/storeos/magaza-analizleri">
      <ModulEkrani
        baslik="Mağaza Analizleri"
        aciklama="Müşteri yolculuğu, gün ve hafta karşılaştırması, dönüşüm hunisi, kalış süresi ve yoğunluk haritası."
        kpiler={kpiler}
        ustSag={<span className="so-nabiz">giriş → satış dönüşümü %{oran}</span>}
      >
        <ModulAkis
          baslik="Müşteri yolculuğu — en sık izlenen yol"
          adimlar={yolculuk}
          not={`en büyük düşüş: ${enBuyukDusus.ad} (−%${enBuyukDusus.dusus}) · kasa öncesi terk %${kasaOncesiTerk}`}
          dipnot={
            'Anonim bölge geçiş sayımı. Yüz tanıma, kimlik eşleştirme veya cihaz takibi '
            + 'yok; aynı kişinin iki geçişi iki geçiş olarak sayılır. Yol bir huni değildir — '
            + 'gösterilen, gün içinde en çok tekrarlanan güzergâh ve her adımda o güzergâhı '
            + 'bırakanların oranıdır.'
          }
        />

        <ModulIkili>
          <ModulSeriKarti seri={ziyaretciBugunDun} />
          <ModulSeriKarti seri={ziyaretciGecenHafta} />
        </ModulIkili>

        <ModulIkili>
          <ModulDagilim baslik="Dönüşüm hunisi" birim="kisi" dilimler={huni} />
          <ModulTablo
            baslik="Alan ziyaretleri (anonim)"
            basliklar={['Alan', 'Ziyaret', 'Ziyaretçi payı', 'Not']}
            sutunlar="1.2fr .7fr .8fr 1.3fr"
            sag={
              ugranmayan.length > 0
                ? <span className="so-kart-not">{ugranmayan.length} alana hiç uğranmadı</span>
                : undefined
            }
            satirlar={alanlar.map(a => ({
              anahtar: a.ad,
              hucreler: [a.ad, a.ziyaret > 0 ? String(a.ziyaret) : '—', `%${a.pay}`, a.not || '—'],
              vurgu: a.ziyaret === 0 ? ('kritik' as const) : a.pay >= 60 ? ('iyi' as const) : undefined,
            }))}
          />
        </ModulIkili>

        <ModulIkili>
          <ModulDagilim baslik="Bölgeye göre ortalama kalış" birim="dk" dilimler={kalisSuresi} />
          <ModulIzgara baslik="Mağaza yoğunluk haritası (anonim)" izgara={izgara} />
        </ModulIkili>
      </ModulEkrani>
    </Kabuk>
  )
}
