// ════════════════════════════════════════════════════════════════════════════
//  Store OS — MODÜL EKRANI ŞABLONU (18 Ağu 2026 · kapsam gösterisi)
//
//  On bir modül ekranı tek bir desenden doğar:
//
//    [ Başlık + kısa açıklama + "örnek veri" bandı ]
//    [ 3–4 KPI kartı — panonun KpiSeridi bileşeni, kopyası değil ]
//    [ Ana içerik: tablo VEYA grafik VEYA ikisi yan yana ]
//    [ Alt: ikincil liste veya dağılım ]
//
//  ── NEDEN ŞABLON ───────────────────────────────────────────────────────────
//  On bir ekranı tek tek yazmak on bir farklı düzen, on bir farklı boşluk
//  ritmi ve on bir yerde tekrarlanan dürüstlük bandı demekti. Jüri ekranlar
//  arasında gezerken tutarsızlığı ilk fark eden şey olurdu.
//
//  ── YENİ BİLEŞEN YAZILMADI ─────────────────────────────────────────────────
//  Buradaki her şey mevcut parçaların PARAMETRELEŞTİRİLMİŞ hâli:
//    KPI       → `kartlar.tsx` · KpiSeridi
//    grafik    → `grafikler.tsx` · SikisikSeri / DagilimCubugu / DonutDagilimi
//    kart/boş  → `temel.tsx` · Kart / BosDurum / OrnekBant
//  Tek gerçek eklenti `ModulTablo`: pano tarafında ızgara tabanlı bir tablo
//  yoktu (liste ekranları `<details>` tabanlı, salt okunur modüllere uymuyor).
//
//  ── DÜRÜSTLÜK ──────────────────────────────────────────────────────────────
//  Bu şablonu kullanan HER ekran `veriTipi='demo'` taşır: üstte tek bant,
//  başlıkta "örnek veri" noktası, altta sabit dipnot. Kaldırılamaz — şablonun
//  parçası, sayfanın seçimi değil.
// ════════════════════════════════════════════════════════════════════════════

import type { ReactNode } from 'react'
import type { Dagilim, Izgara, KpiKarti, Seri } from '@/lib/storeos/dashboard/tipler'
import type {
  DagilimDetay, IzgaraDetay, ModulKpi, ModulSatir, ModulSeri,
} from '@/lib/storeos/depo/demo-metrikler'
import { DagilimCubugu, DonutDagilimi, IzgaraHaritasi, SikisikSeri } from './grafikler'
import { KpiSeridi } from './kartlar'
import { BosDurum, Kart, OrnekBant, OrnekNokta } from './temel'

// ─── Çeviriciler: seed şekli → pano sözleşmesi ───────────────────────────────
//
// Seed katmanı `dashboard/tipler.ts`i TANIMAZ (depo altında yaşıyor). Çeviri
// burada, tek yerde. Böylece bir modül ekranı kendi `veriTipi`ni uyduramaz:
// şablon hepsine 'demo' yazar.

export function kpiKartlari(kpiler: ModulKpi[]): KpiKarti[] {
  return kpiler.map(k => ({
    anahtar: k.anahtar,
    etiket: k.etiket,
    deger: k.deger,
    birim: k.birim,
    veriTipi: 'demo',
    yerlesim: 'kart',
    onceki: k.onceki,
    trend: k.trend,
    iyiYon: k.iyiYon,
  }))
}

export function seriYap(s: ModulSeri): Seri {
  return {
    baslik: s.baslik,
    birincilAd: s.birincilAd,
    ikincilAd: s.ikincilAd,
    birim: s.birim,
    noktalar: s.noktalar.map(n => ({ etiket: n.saat, birincil: n.birincil, ikincil: n.ikincil })),
    veriTipi: 'demo',
  }
}

export function dagilimYap(baslik: string, birim: string, dilimler: DagilimDetay[]): Dagilim {
  return { baslik, birim, dilimler, veriTipi: 'demo' }
}

export function izgaraYap(baslik: string, i: IzgaraDetay): Izgara {
  return { baslik, satir: i.satir, sutun: i.sutun, hucreler: i.hucreler, veriTipi: 'demo' }
}

// ─── Ekran çerçevesi ─────────────────────────────────────────────────────────

export function ModulEkrani({
  baslik, aciklama, kpiler, ustSag, children,
}: {
  baslik: string
  /** Bir cümle: modül ne yapar. Jüri başlığı okuyup geçmesin. */
  aciklama: string
  /** 3–4 KPI. Boş dizi verilirse şerit hiç çizilmez. */
  kpiler: ModulKpi[]
  ustSag?: ReactNode
  children: ReactNode
}) {
  return (
    <>
      <header className="so-ust so-ust-pano">
        <div>
          <h1>
            {baslik}
            <span className="so-modul-ornek" title="Bu ekrandaki sayılar demo (seed) verisidir.">
              örnek veri
            </span>
          </h1>
          <div className="so-ust-alt"><span>{aciklama}</span></div>
        </div>
        {ustSag && <div className="so-ust-sag">{ustSag}</div>}
      </header>

      <div className="so-govde">
        {/* Şablonun kaldırılamaz parçası — sayfa bunu kapatamaz. */}
        <OrnekBant veriTipi="demo" />

        {kpiler.length > 0 && (
          <section className="so-izgara so-izgara-kpi">
            <KpiSeridi kartlar={kpiKartlari(kpiler)} />
          </section>
        )}

        {children}

        <p className="so-modul-dipnot">
          Bu ekran salt okunurdur ve seed (örnek) veriyle beslenir. Olay akışı, kural motoru,
          görev zinciri ve denetim kaydı gerçektir — Mağaza Özeti, Alarmlar, Görevler ve Denetim
          Kaydı ekranlarında canlı çalışır. Store OS yüz tanıma, biyometrik eşleştirme veya kişi
          kimliklendirmesi yapmaz.
        </p>
      </div>
    </>
  )
}

// ─── Yerleşim yardımcıları ───────────────────────────────────────────────────

/** İki kutu yan yana (dar ekranda alt alta). */
export function ModulIkili({ children }: { children: ReactNode }) {
  return <section className="so-izgara so-izgara-2">{children}</section>
}

/** Üç kutu yan yana. */
export function ModulUclu({ children }: { children: ReactNode }) {
  return <section className="so-satir-uc">{children}</section>
}

// ─── Tablo ───────────────────────────────────────────────────────────────────

export function ModulTablo({
  baslik, basliklar, sutunlar, satirlar, sag, bosMetin,
}: {
  baslik: string
  basliklar: string[]
  /** CSS `grid-template-columns` değeri. Sütun sayısı `basliklar` ile aynı olmalı. */
  sutunlar: string
  satirlar: ModulSatir[]
  sag?: ReactNode
  bosMetin?: string
}) {
  return (
    <Kart baslik={baslik} sag={sag} ornek="demo">
      {satirlar.length === 0 ? (
        <BosDurum baslik="Kayıt yok" metin={bosMetin ?? 'Bu tablo için gösterilecek kayıt bulunamadı.'} />
      ) : (
        <div className="so-vt">
          <div className="so-vt-satir so-vt-bas" style={{ gridTemplateColumns: sutunlar }} aria-hidden="true">
            {basliklar.map(b => <span key={b}>{b}</span>)}
          </div>
          {satirlar.map(s => (
            <div key={s.anahtar} className="so-vt-satir" style={{ gridTemplateColumns: sutunlar }} data-vurgu={s.vurgu}>
              {s.hucreler.map((h, i) => (
                <span key={i} className={i === 0 ? 'so-vt-ad' : undefined}>{h}</span>
              ))}
            </div>
          ))}
        </div>
      )}
    </Kart>
  )
}

// ─── Grafik kutuları ─────────────────────────────────────────────────────────

export function ModulSeriKarti({
  seri, esik, esikNotu,
}: {
  seri: ModulSeri
  /** Yatay eşik çizgisi (ör. 180 sn kuyruk eşiği). */
  esik?: number
  esikNotu?: string
}) {
  const s = seriYap(seri)
  return (
    <Kart
      baslik={seri.baslik}
      ornek="demo"
      sag={<span className="so-kart-not">{seri.birincilAd}{seri.ikincilAd ? ` · ${seri.ikincilAd}` : ''}</span>}
    >
      <SikisikSeri seri={s} esik={esik ?? null} />
      {esikNotu && <div className="so-kart-not so-vt-esik">{esikNotu}</div>}
    </Kart>
  )
}

export function ModulDagilim({
  baslik, birim, dilimler,
}: {
  baslik: string
  birim: string
  dilimler: DagilimDetay[]
}) {
  return <DagilimCubugu dagilim={dagilimYap(baslik, birim, dilimler)} />
}

export function ModulIzgara({
  baslik, izgara,
}: {
  baslik: string
  izgara: IzgaraDetay
}) {
  // `IzgaraHaritasi` kendi `Kart`ını çizer — burada ikinci kez sarmıyoruz.
  return <IzgaraHaritasi izgara={izgaraYap(baslik, izgara)} />
}

export function ModulDonut({
  baslik, dilimler,
}: {
  baslik: string
  dilimler: DagilimDetay[]
}) {
  return <DonutDagilimi dagilim={dagilimYap(baslik, 'adet', dilimler)} baslik={baslik} />
}

// ─── İkincil parçalar ────────────────────────────────────────────────────────

/** Kural motorunun/analizin çıkardığı öneri kutusu. */
export function ModulOneri({
  baslik, metin, gerekce,
}: {
  baslik: string
  metin: string
  gerekce?: string
}) {
  return (
    <Kart baslik="Öneri" ornek="demo">
      <div className="so-oneri-kutu">
        <div className="so-oneri-kutu-baslik">{baslik}</div>
        <p className="so-oneri-kutu-metin">{metin}</p>
        {gerekce && <div className="so-oneri-kutu-gerekce">{gerekce}</div>}
      </div>
    </Kart>
  )
}

/** Zaman çizgisi / ikincil liste. */
export function ModulListe({
  baslik, satirlar, sag,
}: {
  baslik: string
  satirlar: Array<{ anahtar: string; sol: string; ana: string; alt?: string; vurgu?: 'iyi' | 'dikkat' | 'kritik' }>
  sag?: ReactNode
}) {
  return (
    <Kart baslik={baslik} sag={sag} ornek="demo">
      {satirlar.length === 0 ? (
        <BosDurum baslik="Kayıt yok" metin="Bu listede gösterilecek kayıt yok." />
      ) : (
        <div className="so-liste">
          {satirlar.map(s => (
            <div key={s.anahtar} className="so-satir">
              <span className="so-zaman">{s.sol}</span>
              <div className="so-satir-ana">
                <div className="so-satir-baslik">{s.ana}</div>
                {s.alt && <div className="so-satir-alt">{s.alt}</div>}
              </div>
              {s.vurgu && <span className="so-vt-nokta" data-vurgu={s.vurgu} aria-hidden="true" />}
            </div>
          ))}
        </div>
      )}
    </Kart>
  )
}

/** Kontrol listesi — `.so-kutucuk` panodaki hızlı işlemlerle aynı görsel dil. */
export function ModulKontrolListesi({
  baslik, maddeler,
}: {
  baslik: string
  maddeler: Array<{ anahtar: string; metin: string; tamam: boolean; alt?: string }>
}) {
  const tamamN = maddeler.filter(m => m.tamam).length
  return (
    <Kart baslik={baslik} ornek="demo" sag={<span className="so-kart-not">{tamamN}/{maddeler.length}</span>}>
      <div className="so-liste">
        {maddeler.map(m => (
          <div key={m.anahtar} className="so-satir">
            <span className="so-kutucuk" data-tamam={m.tamam ? '1' : undefined} aria-hidden="true" />
            <div className="so-satir-ana">
              <div className="so-satir-baslik">{m.metin}</div>
              {m.alt && <div className="so-satir-alt">{m.alt}</div>}
            </div>
          </div>
        ))}
      </div>
    </Kart>
  )
}

/**
 * Bilinçli olarak devre dışı düğme kümesi.
 *
 * "yakında" rozeti KÜME BAŞINA BİR TANE — düğme başına değil. Gerekçe: üç
 * düğmeye üç rozet koymak ekranı "her şey yakında" gibi okutuyordu; oysa
 * eksik olan tek bir yetenek (rapor dosyası üretimi). Rozet sayısı ürün
 * genelinde iki ile sınırlı tutuluyor.
 */
export function ModulYakindaDugmeler({
  dugmeler, not,
}: {
  dugmeler: string[]
  not: string
}) {
  return (
    <div className="so-yakinda-kutu">
      <div className="so-eylemler">
        {dugmeler.map(d => (
          <button key={d} type="button" className="so-dugme" disabled title={not}>{d}</button>
        ))}
        <span className="so-yakinda">yakında</span>
      </div>
      <div className="so-kart-not">{not}</div>
    </div>
  )
}

/** Şablonun köşe noktası — kart içi küçük etiket. */
export function ModulNokta() {
  return <OrnekNokta veriTipi="demo" />
}
