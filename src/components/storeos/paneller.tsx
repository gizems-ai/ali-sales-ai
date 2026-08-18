// ════════════════════════════════════════════════════════════════════════════
//  Store OS — pano panelleri (kamera · öneri · görev · kuyruk · stok · satış ·
//  kasa · hızlı işlemler).
//
//  Hepsi aptal: veri props ile gelir, hiçbiri kendi isteğini atmaz.
//
//  ── VERİSİ OLMAYAN PANEL NE YAPAR ──────────────────────────────────────────
//  Uydurmaz. Kasa bazlı bekleme kırılımı, canlı video ve hızlı işlem uçları
//  henüz yok; bu paneller SABİT yükseklikli bir boş durum ya da devre dışı
//  ("yakında") döşeme gösterir. Ekranı doldurmak için sahte sayı basmak, jüri
//  tek soru sorduğunda demoyu bitirir.
// ════════════════════════════════════════════════════════════════════════════

import type {
  AlarmSatiri, Dagilim, GorevOzeti, GorevSatiri, KameraSatiri, KpiKarti,
  MagazaOzeti, Seri,
} from '@/lib/storeos/dashboard/tipler'
import {
  gorevDurumEtiketi, oncelikEtiketi, oncelikSinifi, severityEtiketi,
} from '@/lib/storeos/tema'
import { SikisikSeri } from './grafikler'
import { KameraKaresi } from './kamera-karesi'
import {
  BosDurum, Iskelet, Kart, degerYaz, gecenSure, saatYaz, sayiYaz, sureYaz,
  tarihSaatYaz,
} from './temel'

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

function kpiBul(kpiler: KpiKarti[] | null, anahtar: string): KpiKarti | undefined {
  return kpiler?.find(k => k.anahtar === anahtar)
}

function veriTipiOzeti(kayitlar: { veriTipi: string }[]): 'demo' | 'gercek' {
  return kayitlar.some(k => k.veriTipi === 'demo') ? 'demo' : 'gercek'
}

// ─── Kamera ──────────────────────────────────────────────────────────────────
//
// Canlı RTSP akışı demoda YOK. Kutular gerçek kamera kaydının adını, bölgesini
// ve durumunu gösterir; görüntü alanı DEMO GÖRÜNTÜ etiketli tepeden görünüm
// şemasıdır (bkz. kamera-karesi.tsx) — canlı yayın gibi sunulmaz. Kamera
// ızgarası üç kareden aşağı düşmez (kesme listesi ④).
//
// 18 Ağu 2026: eski hal boş bir kutuda "GÖRÜNTÜ YOK · YER TUTUCU" yazıyordu;
// dürüsttü ama jüri ekranında bozuk görünüyordu. Şema aynı bilgiyi verir
// (yayın yok, bu bir demodur) ve kameranın ne ürettiğini de gösterir.

/** Kamera ID'sinden kısa HUD kodu: "0178-kasa" → "CAM · KASA". */
function kameraKodu(kameraId: string): string {
  const son = kameraId.split('-').pop() ?? kameraId
  return `CAM · ${son.toLocaleUpperCase('tr-TR')}`
}

export function KameraPaneli({
  kameralar, kuyrukKisi,
}: {
  kameralar: KameraSatiri[] | null
  /** Kuyruk şeridinde çizilecek kişi sayısı — GERÇEK KPI'dan gelir. */
  kuyrukKisi?: number | null
}) {
  if (kameralar === null) {
    return <Kart baslik="Canlı Mağaza İzleme"><Iskelet yukseklik={200} /></Kart>
  }
  if (kameralar.length === 0) {
    return (
      <Kart baslik="Canlı Mağaza İzleme">
        <BosDurum
          sabit
          baslik="Kamera tanımlı değil"
          metin="Mağazaya kamera kaydı eklendiğinde bölgeleriyle birlikte burada görünür."
        />
      </Kart>
    )
  }

  const [ana, ...digerleri] = kameralar
  const serit = digerleri.slice(0, 4)

  return (
    <Kart
      baslik="Canlı Mağaza İzleme"
      sag={<span className="so-nabiz">{kameralar.length} kamera</span>}
    >
      <div className="so-kamera-ana">
        <KameraKaresi kod={kameraKodu(ana.kameraId)} kuyruk={kuyrukKisi ?? 0} />
        {/* Etiket bilinçli olarak "anonim sayım" der (Gün 8 onayı): kare bir
            şema olduğu için özür dilemiyoruz, mahremiyet duruşunu ilan
            ediyoruz. Gerçek Gratis mağazası videosu yok; stok video "bu bizim
            mağazamız değil" tepkisi doğurur. */}
        <span className="so-kamera-etiket">DEMO GÖRÜNÜMÜ · anonim sayım</span>
        {/* Zaman damgası SAF CSS ile işler (bkz. globals.css → `so-sn-say`).
            Bilerek JS zamanlayıcı kurulmadı: saniye göstermek için sekme arka
            plandayken bile dönen bir interval bırakmak, panonun anket
            disiplinini bozardı. Saniye sayacı `aria-hidden` — ekran okuyucuya
            saniye saymak bilgi değil gürültüdür. */}
        <span className="so-kamera-saat" aria-hidden="true" />
        <div className="so-kamera-alt">
          <span>{ana.ad} · {ana.bolgeAdi}</span>
          <span>anonim sayım · yüz tanıma yok</span>
        </div>
      </div>
      <div className="so-kamera-serit">
        {serit.map(k => (
          <div key={k.kameraId}>
            <div className="so-kamera-kucuk"><KameraKaresi mini kod={kameraKodu(k.kameraId)} /></div>
            <div className="so-kamera-ad" title={k.ad}>{k.ad}</div>
            <div className="so-kamera-durum" data-durum={k.durum}>
              {k.durum === 'online' ? 'Bağlı' : k.durum === 'degraded' ? 'Bozuk' : 'Çevrimdışı'}
            </div>
          </div>
        ))}
      </div>
    </Kart>
  )
}

// ─── Ali Asistan · öneriler (alarm akışından) ────────────────────────────────
//
// Bu kartlar SEED DEĞİL: olay → kural motoru zincirinden gerçek gelir.
// Bu yüzden köşede örnek-veri noktası taşımazlar.

const ONERI_SINIFI: Record<string, string> = {
  critical: 'so-oneri-kritik', high: 'so-oneri-kritik', medium: 'so-oneri-dikkat',
  low: 'so-oneri-bilgi', info: 'so-oneri-bilgi',
}
const ONERI_IKONU: Record<string, string> = {
  critical: '🔥', high: '⚠', medium: '⚠', low: '◉', info: '◉',
}

export function OneriPaneli({
  alarmlar, simdiMs,
}: {
  alarmlar: AlarmSatiri[] | null
  simdiMs: number
}) {
  if (alarmlar === null) {
    return <Kart baslik="Ali Asistan · Öneriler"><Iskelet yukseklik={132} /></Kart>
  }
  if (alarmlar.length === 0) {
    return (
      <Kart baslik="Ali Asistan · Öneriler">
        <BosDurum
          sabit
          baslik="Şu an öneri yok"
          metin="Kameralardan olay ulaştığında kural motoru burada bir aksiyon önerir. Boş liste hata değildir."
        />
      </Kart>
    )
  }

  const ilk = alarmlar.slice(0, 3)
  return (
    <Kart
      baslik="Ali Asistan · Öneriler"
      sag={<a className="so-detay-link" href="/storeos/alarmlar">Tümü ({alarmlar.length}) →</a>}
    >
      {ilk.map(a => (
        <div key={a.olayId} className={`so-oneri ${ONERI_SINIFI[a.severity] ?? 'so-oneri-bilgi'}`}>
          <div className="so-oneri-ikon" aria-hidden="true">{ONERI_IKONU[a.severity] ?? '◉'}</div>
          <div className="so-oneri-govde">
            <div className="so-oneri-baslik">{a.baslik}</div>
            <div className="so-oneri-alt">
              {severityEtiketi(a.severity)} · {a.kameraAdi ?? 'kamera bilgisi yok'} ·{' '}
              {a.gorevUretti ? 'görev açıldı' : 'kural yok'} · {gecenSure(a.olustu, simdiMs)}
            </div>
          </div>
          <div className="so-oneri-sag">
            <span className="so-oneri-saat" title={tarihSaatYaz(a.olustu)}>{saatYaz(a.olustu)}</span>
            <a className="so-dugme so-dugme-kucuk" href="/storeos/alarmlar">İncele</a>
          </div>
        </div>
      ))}
      {alarmlar.length > ilk.length && (
        <div className="so-kart-not">{alarmlar.length - ilk.length} olay daha var.</div>
      )}
    </Kart>
  )
}

// ─── Görevler ────────────────────────────────────────────────────────────────
//
// Kutucuk şimdilik GÖSTERGE: tamamlama yazma yolu (madde 4) görev ekranında
// açılacak. Tıklanabilir görünen ama hiçbir şey yapmayan bir onay kutusu
// koymuyoruz; `<input>` değil `<span>`.

export function GorevPaneli({
  gorevler, ozet,
}: {
  gorevler: GorevSatiri[] | null
  ozet: GorevOzeti | null
}) {
  if (gorevler === null) {
    return <Kart baslik="Görevler & Aksiyonlar"><Iskelet yukseklik={132} /></Kart>
  }
  if (gorevler.length === 0) {
    return (
      <Kart baslik="Görevler & Aksiyonlar">
        <BosDurum
          sabit
          baslik="Açık görev yok"
          metin="Bir kural eşleştiğinde görev otomatik oluşur ve ilgili kişiye WhatsApp'tan gider."
        />
      </Kart>
    )
  }

  const sag = (
    <a className="so-detay-link" href="/storeos/gorevler">
      Tümü ({ozet ? ozet.acik : gorevler.length}) →
    </a>
  )
  return (
    <Kart baslik="Görevler & Aksiyonlar" sag={sag}>
      {gorevler.slice(0, 4).map(g => (
        <div key={g.gorevNo} className="so-gorev-satir">
          <span
            className="so-kutucuk"
            data-tamam={g.durum === 'tamamlandi' ? '1' : undefined}
            role="img"
            aria-label={gorevDurumEtiketi(g.durum)}
          />
          <div className="so-gorev-govde">
            <div className="so-gorev-ad" title={g.baslik}>{g.baslik}</div>
            <div className="so-gorev-atanan">
              {g.atananAd ?? g.atananRol} · son teslim {tarihSaatYaz(g.sonTeslim)}
              {g.gecikti && ' · gecikti'}
            </div>
          </div>
          <span className={`so-oncelik so-rozet ${oncelikSinifi(g.oncelik)}`}>
            {oncelikEtiketi(g.oncelik)}
          </span>
        </div>
      ))}
      {ozet && (
        <div className="so-kart-not">
          {ozet.acik} açık · {ozet.gecikmis} gecikmiş · {ozet.tamamlandi} tamamlandı
        </div>
      )}
    </Kart>
  )
}

// ─── Kuyruk analizi ──────────────────────────────────────────────────────────

export function KuyrukPaneli({
  seri, kpiler,
}: {
  seri: Seri | null
  kpiler: KpiKarti[] | null
}) {
  if (seri === null) return <Kart baslik="Kuyruk Analizi"><Iskelet yukseklik={132} /></Kart>
  if (seri.noktalar.length < 2) {
    return (
      <Kart baslik={seri.baslik}>
        <BosDurum sabit baslik="Kuyruk verisi yok" metin="Kasa kuyruğu ölçümü için en az iki nokta gerekiyor." />
      </Kart>
    )
  }

  const ortalama = kpiBul(kpiler, 'kasa_bekleme_sn')
  // Zirve saat SERİDEN gelir, ayrı bir metrik uydurulmaz.
  const zirve = seri.noktalar.reduce(
    (e, p) => ((p.ikincil ?? p.birincil) > (e.ikincil ?? e.birincil) ? p : e),
    seri.noktalar[0],
  )

  return (
    <Kart
      baslik={seri.baslik}
      ornek={seri.veriTipi}
      sag={<a className="so-detay-link" href="/storeos/alarmlar">Detaylı →</a>}
    >
      <div className="so-ikili">
        <div>
          <div className="so-mini-kutu">
            <div className="so-mini-etiket">Ortalama Bekleme</div>
            <div className="so-mini-deger">
              {ortalama ? degerYaz(ortalama.deger, ortalama.birim) : '—'}
            </div>
            <div className="so-mini-alt">{seri.birincilAd}</div>
          </div>
          <div className="so-mini-kutu">
            <div className="so-mini-etiket">Zirve Bekleme</div>
            <div className="so-mini-deger">{sureYaz(zirve.ikincil ?? zirve.birincil)} dk</div>
            <div className="so-mini-alt">{zirve.etiket} civarında</div>
          </div>
        </div>
        <SikisikSeri seri={seri} />
      </div>
    </Kart>
  )
}

// ─── Raf & stok ──────────────────────────────────────────────────────────────

/** Doluluk eşikleri — tek yerde, ekranda üç ayrı yorumu olmasın. */
function stokRozeti(doluluk: number): { sinif: string; metin: string } {
  if (doluluk >= 70) return { sinif: 'so-sev-low', metin: `%${sayiYaz(doluluk)} dolu` }
  if (doluluk >= 40) return { sinif: 'so-sev-medium', metin: `%${sayiYaz(doluluk)} · azalıyor` }
  return { sinif: 'so-sev-critical', metin: `%${sayiYaz(doluluk)} · stok az` }
}

export function StokPaneli({ rafDoluluk }: { rafDoluluk: Dagilim | null }) {
  if (rafDoluluk === null) return <Kart baslik="Raf & Stok Durumu"><Iskelet yukseklik={132} /></Kart>
  if (rafDoluluk.dilimler.length === 0) {
    return (
      <Kart baslik={rafDoluluk.baslik}>
        <BosDurum sabit baslik="Raf ölçümü yok" metin="Reyon doluluk verisi ulaştığında burada listelenir." />
      </Kart>
    )
  }
  return (
    <Kart baslik={rafDoluluk.baslik} ornek={rafDoluluk.veriTipi}>
      {rafDoluluk.dilimler.map(d => {
        const r = stokRozeti(d.deger)
        return (
          <div key={d.etiket} className="so-stok-satir">
            <span>{d.etiket}</span>
            <span className={`so-stok-rozet so-rozet ${r.sinif}`}>{r.metin}</span>
          </div>
        )
      })}
    </Kart>
  )
}

// ─── Günlük satış ────────────────────────────────────────────────────────────

export function SatisPaneli({
  seri, kpiler,
}: {
  seri: Seri | null
  kpiler: KpiKarti[] | null
}) {
  if (seri === null) return <Kart baslik="Günlük Satış Performansı"><Iskelet yukseklik={132} /></Kart>
  if (seri.noktalar.length < 2) {
    return (
      <Kart baslik={seri.baslik}>
        <BosDurum sabit baslik="Satış verisi yok" metin="POS kayıtları ulaştığında saatlik eğri burada çizilir." />
      </Kart>
    )
  }
  const toplam = kpiBul(kpiler, 'satis_tutari')
  return (
    <Kart baslik={seri.baslik} ornek={seri.veriTipi}>
      <div className="so-ikili so-ikili-dar">
        <div className="so-mini-kutu">
          <div className="so-mini-etiket">Bugünkü Satış</div>
          <div className="so-mini-deger">{toplam ? degerYaz(toplam.deger, toplam.birim) : '—'}</div>
          <div className="so-mini-alt">{seri.ikincilAd ? `kesikli çizgi: ${seri.ikincilAd}` : seri.birincilAd}</div>
        </div>
        <SikisikSeri seri={seri} />
      </div>
    </Kart>
  )
}

// ─── Kasa performansı ────────────────────────────────────────────────────────
//
// Kasa BAZINDA bekleme kırılımı POS entegrasyonu ister; demo bunu taşımıyor.
// Dört sahte kasa kutusu çizmek yerine gerçek üç toplam gösteriliyor ve
// eksiğin ne olduğu ekranda yazıyor.

export function KasaPaneli({
  magaza, kpiler,
}: {
  magaza: MagazaOzeti | null
  kpiler: KpiKarti[] | null
}) {
  if (kpiler === null) return <Kart baslik="Kasa Performansı"><Iskelet yukseklik={132} /></Kart>

  const kasaAcik = magaza?.kasaAcik ?? kpiBul(kpiler, 'kasa_acik')?.deger ?? null
  const kuyruk = kpiBul(kpiler, 'kuyruk_kisi')
  const bekleme = kpiBul(kpiler, 'kasa_bekleme_sn')

  if (kasaAcik === null && !kuyruk && !bekleme) {
    return (
      <Kart baslik="Kasa Performansı">
        <BosDurum sabit baslik="Kasa verisi yok" metin="Kasa ve kuyruk ölçümü ulaştığında burada özetlenir." />
      </Kart>
    )
  }

  const hucreler = [
    kasaAcik !== null && magaza
      ? { ad: 'Açık kasa', deger: `${sayiYaz(kasaAcik)} / ${sayiYaz(magaza.kasaToplam)}`, alt: 'şu an', durum: 'acik' }
      : null,
    kuyruk ? { ad: 'Kuyrukta', deger: sayiYaz(kuyruk.deger), alt: 'kişi', durum: undefined } : null,
    bekleme ? { ad: 'Ortalama bekleme', deger: sureYaz(bekleme.deger), alt: 'dk', durum: undefined } : null,
  ].filter((h): h is { ad: string; deger: string; alt: string; durum: string | undefined } => h !== null)

  return (
    <Kart baslik="Kasa Performansı" ornek={veriTipiOzeti(kpiler)}>
      <div className="so-kasa-izgara">
        {hucreler.map(h => (
          <div key={h.ad} className="so-kasa-hucre" data-durum={h.durum}>
            <div className="so-kasa-ad">{h.ad}</div>
            <div className="so-mini-deger">{h.deger}</div>
            <div className="so-kasa-alt">{h.alt}</div>
          </div>
        ))}
      </div>
      <div className="so-kart-not">
        Kasa bazında bekleme kırılımı POS entegrasyonuyla gelir; bu panel şu an
        mağaza toplamlarını gösterir.
      </div>
    </Kart>
  )
}

// ─── Hızlı işlemler ──────────────────────────────────────────────────────────
//
// Altısı da HENÜZ YOK. Devre dışı döşeme, çalışmayan düğmeden dürüsttür:
// jüri tıklarsa hiçbir şey olmaz ve "yakında" etiketi bunu zaten söylüyor.

const HIZLI = [
  { ikon: '📣', ad: 'Anons Gönder' },
  { ikon: '▤',  ad: 'Kasa Aç / Kapat' },
  { ikon: '✎',  ad: 'Görev Oluştur' },
  { ikon: '◔',  ad: 'Rapor Oluştur' },
  { ikon: '🏷', ad: 'Etiket Kontrolü' },
  { ikon: '🔧', ad: 'Bakım Talebi' },
]

export function HizliIslemler() {
  return (
    <Kart baslik="Hızlı İşlemler" sag={<span className="so-yakinda">yakında</span>}>
      <div className="so-hizli-izgara">
        {HIZLI.map(h => (
          <button key={h.ad} type="button" className="so-hizli" disabled title="Bu işlem demoda henüz açık değil">
            <span className="so-hizli-ikon" aria-hidden="true">{h.ikon}</span>
            <span className="so-hizli-ad">{h.ad}</span>
          </button>
        ))}
      </div>
    </Kart>
  )
}
