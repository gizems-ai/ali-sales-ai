// ════════════════════════════════════════════════════════════════════════════
//  /storeos/magaza-analizleri — MAĞAZA ANALİZLERİ (18 Ağu 2026)
//
//  Ziyaretçi eğrisi (bugün/dün ve bugün/geçen hafta), dönüşüm hunisi, bölge
//  bazlı kalış süresi ve büyük ısı haritası.
//
//  Isı haritası ANONİM yoğunluktur: hücre = bölge doluluk yüzdesi. Kişi tanıma,
//  takip veya biyometri yok — Store OS'in mahremiyet duruşu ekranda da yazar.
//
//  SALT OKUNUR · seed.
// ════════════════════════════════════════════════════════════════════════════

import { Kabuk } from '@/components/storeos/kabuk'
import {
  ModulDagilim, ModulEkrani, ModulIkili, ModulIzgara, ModulSeriKarti,
} from '@/components/storeos/modul-sablonu'
import { analizModulu } from '@/lib/storeos/depo/demo-metrikler'

export const dynamic = 'force-dynamic'

export default function MagazaAnalizleriSayfasi() {
  const gun = new Date().toISOString().slice(0, 10)
  const {
    kpiler, ziyaretciBugunDun, ziyaretciGecenHafta, huni, kalisSuresi, izgara,
  } = analizModulu(gun)

  const giris = huni[0]?.deger ?? 0
  const satis = huni[huni.length - 1]?.deger ?? 0
  const oran = giris > 0 ? Math.round((satis / giris) * 100) : 0

  return (
    <Kabuk aktif="/storeos/magaza-analizleri">
      <ModulEkrani
        baslik="Mağaza Analizleri"
        aciklama="Gün ve hafta karşılaştırması, dönüşüm hunisi, bölge bazlı kalış süresi ve yoğunluk haritası."
        kpiler={kpiler}
        ustSag={<span className="so-nabiz">giriş → satış dönüşümü %{oran}</span>}
      >
        <ModulIkili>
          <ModulSeriKarti seri={ziyaretciBugunDun} />
          <ModulSeriKarti seri={ziyaretciGecenHafta} />
        </ModulIkili>

        <ModulIkili>
          <ModulDagilim baslik="Dönüşüm hunisi" birim="kisi" dilimler={huni} />
          <ModulDagilim baslik="Bölgeye göre ortalama kalış" birim="dk" dilimler={kalisSuresi} />
        </ModulIkili>

        <ModulIzgara baslik="Mağaza yoğunluk haritası (anonim)" izgara={izgara} />
      </ModulEkrani>
    </Kabuk>
  )
}
