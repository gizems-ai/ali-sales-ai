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

import { Fragment } from 'react'
import type { ReactNode } from 'react'
import type { Dagilim, Izgara, KpiKarti, Seri } from '@/lib/storeos/dashboard/tipler'
import type {
  DagilimDetay, IzgaraDetay, ModulKpi, ModulSatir, ModulSeri,
} from '@/lib/storeos/depo/demo-metrikler'
import { DagilimCubugu, DonutDagilimi, IzgaraHaritasi, SikisikSeri } from './grafikler'
import { KpiSeridi } from './kartlar'
import { BosDurum, Kart, OrnekBant, OrnekNokta, sayiYaz } from './temel'

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

/**
 * Tablo satırı — seed şekline sunum katmanının iki alanı eklenir.
 *
 * `yol`/`ipucu` BİLEREK burada, `demo-metrikler.ts`te değil: seed katmanı
 * URL bilmez, bilmemeli. Tıklanamayan satır `ipucu` ile SEBEBİNİ söyler
 * ("pilot kapsamı dışında") — sessizce tepkisiz kalan satır, jüriye kırık
 * ekran gibi okunur.
 */
export type TabloSatiri = ModulSatir & { yol?: string; ipucu?: string }

export function ModulTablo({
  baslik, basliklar, sutunlar, satirlar, sag, bosMetin,
}: {
  baslik: string
  basliklar: string[]
  /** CSS `grid-template-columns` değeri. Sütun sayısı `basliklar` ile aynı olmalı. */
  sutunlar: string
  satirlar: TabloSatiri[]
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
          {satirlar.map(s => {
            const hucreler = s.hucreler.map((h, i) => (
              <span key={i} className={i === 0 ? 'so-vt-ad' : undefined}>{h}</span>
            ))
            return s.yol ? (
              <a
                key={s.anahtar} href={s.yol} className="so-vt-satir so-vt-link"
                style={{ gridTemplateColumns: sutunlar }} data-vurgu={s.vurgu} title={s.ipucu}
              >
                {hucreler}
              </a>
            ) : (
              <div
                key={s.anahtar} className="so-vt-satir"
                style={{ gridTemplateColumns: sutunlar }} data-vurgu={s.vurgu}
                title={s.ipucu} data-pasif={s.ipucu ? '1' : undefined}
              >
                {hucreler}
              </div>
            )
          })}
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

/**
 * Gün sonu raporu — A4 görünümlü, yazdırılabilir sayfa.
 *
 * ── NEDEN AYRI BİR "SAYFA" GİBİ ────────────────────────────────────────────
 * Panelin geri kalanı ekran için tasarlandı; bu kutu KÂĞIT için. Mağaza
 * müdürünün elinde tuttuğu şey bir pano değil, bir sayfa olacak. Beyaz zemin,
 * dar sütun ve üst/alt künye bunu anlatıyor: "buradan bir belge çıkıyor".
 *
 * ── YAZDIRMA DÜĞMESİ YOK, YAZDIRMA VAR ─────────────────────────────────────
 * Tarayıcının kendi yazdır komutu (⌘P) bu sayfayı tek başına basar: yazdırma
 * stilleri yan menüyü, başlıkları ve düğmeleri gizler (bkz. globals.css
 * `@media print`). Düğme koymadık çünkü düğme JS ister ve "PDF indir"
 * düğmesinin çalışmadığı zaten bir alt satırda yazıyor — iki farklı vaat
 * veren iki düğme yan yana durmasın.
 */
export function ModulA4Rapor({
  baslik, ustBilgi, gun, aliNotu, olculer, tamamlanan, kritikOlaylar, altBilgi, altEk,
}: {
  baslik: string
  ustBilgi: string
  gun: string
  aliNotu: string[]
  olculer: Array<{ etiket: string; deger: string; not: string }>
  tamamlanan: Array<{ saat: string; is: string; kisi: string }>
  kritikOlaylar: Array<{ saat: string; olay: string; sonuc: string }>
  altBilgi: string
  altEk?: ReactNode
}) {
  return (
    <div className="so-a4-cerceve">
      <article className="so-a4">
        <header className="so-a4-bas">
          <div>
            <div className="so-a4-marka">{ustBilgi}</div>
            <h2 className="so-a4-baslik">{baslik}</h2>
          </div>
          <div className="so-a4-tarih">{gun}</div>
        </header>

        <section className="so-a4-not">
          <div className="so-a4-not-bas">Ali&apos;nin notu</div>
          {aliNotu.map(c => <p key={c.slice(0, 24)} className="so-a4-not-metin">{c}</p>)}
        </section>

        <section className="so-a4-olculer">
          {olculer.map(o => (
            <div key={o.etiket} className="so-a4-olcu">
              <div className="so-a4-olcu-etiket">{o.etiket}</div>
              <div className="so-a4-olcu-deger">{o.deger}</div>
              <div className="so-a4-olcu-not">{o.not}</div>
            </div>
          ))}
        </section>

        <section className="so-a4-bolum">
          <h3 className="so-a4-bolum-bas">Tamamlanan görevler</h3>
          {tamamlanan.map(t => (
            <div key={`${t.saat}-${t.is}`} className="so-a4-satir">
              <span className="so-a4-saat">{t.saat}</span>
              <span className="so-a4-metin">{t.is}</span>
              <span className="so-a4-kisi">{t.kisi}</span>
            </div>
          ))}
        </section>

        <section className="so-a4-bolum">
          <h3 className="so-a4-bolum-bas">Kritik olaylar</h3>
          {kritikOlaylar.map(o => (
            <div key={`${o.saat}-${o.olay}`} className="so-a4-satir">
              <span className="so-a4-saat">{o.saat}</span>
              <span className="so-a4-metin">
                {o.olay}
                <span className="so-a4-sonuc">{o.sonuc}</span>
              </span>
            </div>
          ))}
        </section>

        <footer className="so-a4-alt">{altBilgi}</footer>
      </article>
      {altEk}
    </div>
  )
}

/**
 * Müşteri yolculuğu akışı — kutu → ok → kutu.
 *
 * ── NEDEN SVG DEĞİL ────────────────────────────────────────────────────────
 * Akış diyagramı SVG ister gibi görünüyor; istemiyor. Kutular sıradan
 * elemanlar olunca metin seçilebiliyor, ekran okuyucu sırayı doğru okuyor ve
 * dar ekranda satır kendiliğinden sarıyor. SVG'de üçü de elle çözülürdü.
 *
 * Kutu içindeki dolgu, ilk adıma göre orandır — göz, sayıyı okumadan önce
 * daralmayı görür. Ok üzerindeki yüzde ise BİR ÖNCEKİ adıma göre düşüştür;
 * ikisi farklı sorulara cevap verdiği için ekranda ikisi de duruyor.
 */
export function ModulAkis({
  baslik, adimlar, not, dipnot,
}: {
  baslik: string
  adimlar: Array<{ ad: string; kisi: number; dusus: number }>
  not?: string
  dipnot: string
}) {
  const taban = adimlar[0]?.kisi ?? 0
  return (
    <Kart baslik={baslik} ornek="demo" sag={not ? <span className="so-kart-not">{not}</span> : undefined}>
      <div className="so-akis">
        {adimlar.map((a, i) => {
          const pay = taban > 0 ? Math.round((a.kisi / taban) * 100) : 0
          return (
            <Fragment key={a.ad}>
              {i > 0 && (
                <div className="so-akis-ok" aria-hidden="true">
                  <span className="so-akis-cizgi" />
                  <span className="so-akis-dusus" data-agir={a.dusus >= 35 ? '1' : undefined}>
                    −%{a.dusus}
                  </span>
                </div>
              )}
              <div className="so-akis-adim" data-son={i === adimlar.length - 1 ? '1' : undefined}>
                <div className="so-akis-ad">{a.ad}</div>
                <div className="so-akis-kisi">{sayiYaz(a.kisi)}</div>
                <div className="so-akis-pay">%{pay}</div>
                <span className="so-akis-dolgu" style={{ width: `${pay}%` }} aria-hidden="true" />
              </div>
            </Fragment>
          )
        })}
      </div>
      <p className="so-akis-dipnot">{dipnot}</p>
    </Kart>
  )
}

/**
 * Kampanya uygulama matrisi — satır kampanya, sütun teşhir maddesi.
 *
 * ── NEDEN TABLO DEĞİL ──────────────────────────────────────────────────────
 * `ModulTablo` ile de çizilebilirdi; hücreye "✓" metni yazmak yeterdi. Ayrı
 * bileşen olmasının tek sebebi EYLEM sütunu: eksik maddesi olan satırda
 * "Görev oluştur" düğmesi duruyor ve düğmenin neden pasif olduğunu ipucu
 * söylüyor. Tablo satırı bir düğme taşıyamaz (satırın kendisi link olabiliyor).
 *
 * ── DÜĞME NEDEN PASİF, NEDEN "yakında" ROZETİ YOK ──────────────────────────
 * Görev açma yolu ÇALIŞIYOR — ama Görevler ekranından, kural motoru üzerinden.
 * Buradan açmak yeni bir yazma yolu demekti; kural "zincire dokunma". Rozet
 * yok çünkü eksik olan yetenek değil, bu ekrandaki kısayol: ürün genelinde
 * "yakında" rozeti sayısı iki ile sınırlı ve ikisi de dolu.
 */
export function ModulUygunlukMatrisi({
  baslik, sutunlar, satirlar, not, eylemIpucu,
}: {
  baslik: string
  /** Teşhir maddeleri; `satirlar[].isaretler` ile sıra birebir aynı olmalı. */
  sutunlar: readonly string[]
  satirlar: Array<{
    anahtar: string
    ad: string
    alt: string
    isaretler: boolean[]
    uygunluk: number
    eksik: readonly string[]
  }>
  not: string
  eylemIpucu: string
}) {
  const izgara = `minmax(180px, 1.7fr) repeat(${sutunlar.length}, 62px) 66px 128px`
  return (
    <Kart baslik={baslik} ornek="demo" sag={<span className="so-kart-not">{not}</span>}>
      <div className="so-mtx">
        <div className="so-mtx-satir so-mtx-bas" style={{ gridTemplateColumns: izgara }} aria-hidden="true">
          <span>Kampanya</span>
          {sutunlar.map(b => <span key={b} className="so-mtx-orta">{b}</span>)}
          <span className="so-mtx-orta">Uygunluk</span>
          <span />
        </div>
        {satirlar.map(s => (
          <div key={s.anahtar} className="so-mtx-satir" style={{ gridTemplateColumns: izgara }}>
            <div className="so-mtx-ad">
              <div className="so-mtx-ad-ust">{s.ad}</div>
              <div className="so-mtx-ad-alt">{s.alt}</div>
            </div>
            {s.isaretler.map((tamam, i) => (
              <span
                key={sutunlar[i]}
                className="so-mtx-isaret so-mtx-orta"
                data-tamam={tamam ? '1' : undefined}
                role="img"
                aria-label={`${sutunlar[i]} · ${tamam ? 'tamam' : 'eksik'}`}
                title={`${sutunlar[i]} · ${tamam ? 'tamam' : 'eksik'}`}
              >
                {tamam ? '✓' : '✗'}
              </span>
            ))}
            <span
              className="so-mtx-yuzde so-mtx-orta"
              data-vurgu={s.uygunluk === 100 ? 'iyi' : s.uygunluk >= 75 ? 'dikkat' : 'kritik'}
            >
              %{s.uygunluk}
            </span>
            <span className="so-mtx-eylem">
              {s.eksik.length === 0 ? (
                <span className="so-mtx-tam">teşhir tam</span>
              ) : (
                <button
                  type="button" className="so-dugme so-dugme-kucuk" disabled
                  title={`Eksik: ${s.eksik.join(' · ')} — ${eylemIpucu}`}
                >
                  Görev oluştur
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
    </Kart>
  )
}

/**
 * Üç kutuluk uyarı şeridi ("Dikkat gerektiren mağazalar").
 *
 * Yeni bileşen değil: `.so-kart` görsel dilinin şerit yerleşimi. Kutu sayısı
 * bilerek üç ile sınırlı — "dikkat gerektiren" listesi uzarsa hiçbiri dikkat
 * çekmez.
 */
export function ModulVurguSerit({
  baslik, kartlar, not,
}: {
  baslik: string
  kartlar: Array<{
    anahtar: string; ust: string; ana: string; alt: string
    vurgu: 'iyi' | 'dikkat' | 'kritik'; yol?: string
  }>
  not?: string
}) {
  if (kartlar.length === 0) return null
  return (
    <Kart baslik={baslik} ornek="demo" sag={not ? <span className="so-kart-not">{not}</span> : undefined}>
      <div className="so-serit">
        {kartlar.slice(0, 3).map(k => {
          const govde = (
            <>
              <div className="so-serit-ust">{k.ust}</div>
              <div className="so-serit-ana">{k.ana}</div>
              <div className="so-serit-alt">{k.alt}</div>
            </>
          )
          return k.yol
            ? <a key={k.anahtar} className="so-serit-kutu" data-vurgu={k.vurgu} href={k.yol}>{govde}</a>
            : <div key={k.anahtar} className="so-serit-kutu" data-vurgu={k.vurgu}>{govde}</div>
        })}
      </div>
    </Kart>
  )
}

/** Şablonun köşe noktası — kart içi küçük etiket. */
/**
 * Tek büyük sayı + gerekçesi. Operasyonel kayıp kartının omurgası.
 *
 * `uyari` ZORUNLU: bu bileşenin gösterdiği her sayı bir MODEL çıktısıdır ve
 * modelin adı sayının hemen altında yazmak zorundadır. İsteğe bağlı olsaydı
 * bir ekran unutur, kart "ölçüm" gibi okunurdu — jüri önünde geri alınamaz
 * bir iddia. Tipin kendisi bunu imkânsız kılıyor.
 */
export function ModulBuyukSayi({
  ustBaslik, sayi, altMetin, karsilastirma, uyari, sag,
}: {
  ustBaslik: string
  sayi: string
  altMetin: string
  karsilastirma?: { metin: string; yon: 'iyi' | 'kotu' | 'notr' }
  uyari: string
  sag?: ReactNode
}) {
  return (
    <Kart baslik={ustBaslik} sag={sag} ornek="demo">
      <div className="so-buyuk">
        <div className="so-buyuk-sayi">{sayi}</div>
        <div className="so-buyuk-alt">{altMetin}</div>
        {karsilastirma && (
          <div className="so-buyuk-fark" data-yon={karsilastirma.yon}>{karsilastirma.metin}</div>
        )}
      </div>
      <p className="so-buyuk-uyari">{uyari}</p>
    </Kart>
  )
}

export function ModulNokta() {
  return <OrnekNokta veriTipi="demo" />
}
