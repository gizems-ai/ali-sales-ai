// ════════════════════════════════════════════════════════════════════════════
//  Store OS — grafikler. Saf SVG, kütüphanesiz.
//
//  Gerekçe: grafik kütüphaneleri istemci-only'dir ve ilk boyanmada yerleşimi
//  zıplatır; iki saniyelik ankette bu göze batar. SVG sunucuda da istemcide de
//  aynı çıktıyı verir, hydration uyuşmazlığı üretmez.
//
//  Renk gömülü DEĞİL — `tema.ts` üzerinden CSS değişkenleri.
// ════════════════════════════════════════════════════════════════════════════

import type { Dagilim, Izgara, Seri } from '@/lib/storeos/dashboard/tipler'
import { DEGISKEN, dilimRengi, isiRengi } from '@/lib/storeos/tema'
import { BosDurum, Iskelet, Kart, sayiYaz } from './temel'

// ─── Ortak yol yardımcısı ────────────────────────────────────────────────────

function yol(degerler: number[], x: (i: number) => number, y: (v: number) => number): string {
  return degerler.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
}

// ─── Mini trend (KPI kartındaki kıvılcım çizgisi) ────────────────────────────
//
// Kart içinde eksen, kılavuz, etiket YOK: sekiz noktalı bir yön işareti.
// `preserveAspectRatio="none"` + `vector-effect` ile kart ne kadar dar olursa
// olsun çizgi kalınlığı sabit kalır.

const T_G = 100
const T_Y = 26
const T_PAD = 4

export function MiniTrend({ noktalar, renk }: { noktalar: number[]; renk: string }) {
  if (noktalar.length < 2) return null
  const enB = Math.max(...noktalar)
  const enK = Math.min(...noktalar)
  const aralik = enB - enK || 1
  const n = noktalar.length
  const p = noktalar
    .map((v, i) => {
      const x = (i / (n - 1)) * T_G
      const y = T_PAD + (1 - (v - enK) / aralik) * (T_Y - T_PAD * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg className="so-kpi-trend" viewBox={`0 0 ${T_G} ${T_Y}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={p} fill="none" stroke={renk} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

// ─── Yarım daire gösterge (sağlık skoru) ─────────────────────────────────────

/** Referanstaki yay: M12 68 A54 54 0 0 1 120 68 — yarım çember, r = 54. */
const YAY = 'M12 68 A54 54 0 0 1 120 68'
const YAY_UZUNLUK = Math.PI * 54

export function YarimGosterge({ deger, renk }: { deger: number; renk: string }) {
  const oran = Math.max(0, Math.min(100, deger)) / 100
  return (
    <svg width="132" height="74" viewBox="0 0 132 74" role="img" aria-label={`Sağlık skoru ${Math.round(deger)}`}>
      <path d={YAY} fill="none" stroke={DEGISKEN.markaSoluk} strokeWidth="11" strokeLinecap="round" />
      <path
        d={YAY} fill="none" stroke={renk} strokeWidth="11" strokeLinecap="round"
        strokeDasharray={`${(YAY_UZUNLUK * oran).toFixed(1)} ${YAY_UZUNLUK.toFixed(1)}`}
      />
    </svg>
  )
}

// ─── Çizgi grafik (TEK bileşen — pano da modül ekranları da bunu kullanır) ───
//
//  ── 19 Ağu 2026'da neden yeniden yazıldı ───────────────────────────────────
//  Eski sürüm her şeyi (metin dahil) tek bir `viewBox` içine koyuyordu. SVG
//  metni viewBox ile birlikte ölçeklenir: aynı grafik dar panoda 7px, geniş
//  modül ekranında 16px yazıyordu; son saat etiketi kutunun kenarında yarıdan
//  kesilip "21:00" yerine "21:0" görünüyordu; çizgi kalınlığı da ekrandan
//  ekrana değişiyordu.
//
//  Çözüm ikiye ayırmak:
//    · GEOMETRİ  → SVG, `viewBox="0 0 100 100"` + `preserveAspectRatio="none"`.
//      Yüzde uzayında çalışır, kutu ne şekle girerse girsin nokta yerleri
//      doğru kalır. Tüm çizgilerde `vector-effect="non-scaling-stroke"` →
//      kalınlık piksel cinsinden SABİT (2px veri çizgisi, 1px kılavuz).
//    · METİN     → HTML. Eksen etiketleri, efsane ve eşik kupürü SVG'nin
//      DIŞINDA, yüzdeyle konumlanmış `<span>`lerdir. Ölçekten etkilenmezler;
//      punto CSS'te sabit (10.5px). İlk/son etiket kutunun içine yaslanır,
//      bu yüzden artık kesilmez.
//
//  Ayrıca: Y ekseni (3–4 kılavuz + değer), her grafikte efsane, ikincil seri
//  YALNIZCA adı varsa çizilir (adsız kesikli çizgi kafa karıştırıyordu).

/** Eksen etiketi — birim başına tek yerde. `degerYaz` uzun biçim, bu kısası. */
function eksenYaz(v: number, birim: string): string {
  switch (birim) {
    case 'sn':    return `${Math.round(v / 60)} dk`
    case 'dk':    return `${sayiYaz(Math.round(v))} dk`
    case 'TL':    return `₺${sayiYaz(Math.round(v))}`
    case 'yuzde': return `%${Math.round(v)}`
    default:      return sayiYaz(Math.round(v))
  }
}

/**
 * Tavanı "yuvarlak" bir sayıya çıkarır ki eksen etiketleri 1.487 değil 1.500
 * yazsın. Adım 1/2/2.5/5'in on kuvvetleriyle katları arasından seçilir.
 */
function guzelTavan(enB: number, bolme: number): number {
  if (enB <= 0) return bolme
  const ham = enB / bolme
  const us = 10 ** Math.floor(Math.log10(ham))
  const adim = [1, 2, 2.5, 5, 10].find(k => k * us >= ham) ?? 10
  return adim * us * bolme
}

/** Y ekseni: 0'dan tavana dört kılavuz (üstten alta). */
function yKilavuzlari(enB: number): number[] {
  const tavan = guzelTavan(enB, 3)
  return [3, 2, 1, 0].map(i => (tavan / 3) * i)
}

/**
 * X ekseninde en fazla beş etiket, EŞİT aralıklı. 13 noktalı (10:00–22:00)
 * bir seride 0·3·6·9·12 → 10:00 · 13:00 · 16:00 · 19:00 · 22:00.
 */
function xIndisleri(n: number): number[] {
  if (n <= 5) return Array.from({ length: n }, (_, i) => i)
  const kaba = [0, 1, 2, 3, 4].map(i => Math.round((i * (n - 1)) / 4))
  return [...new Set(kaba)]
}

/**
 * @param esik      Yatay eşik çizgisi (ör. kuyruk için 180 sn).
 * @param esikAdi   Eşik kupüründe yazan söz — verilmezse "eşik".
 * @param yukseklik Çizim alanının pikseli. Pano dar, modül ekranı geniş.
 */
export function SikisikSeri({
  seri, esik = null, esikAdi, yukseklik = 108,
}: {
  seri: Seri | null
  esik?: number | null
  esikAdi?: string
  yukseklik?: number
}) {
  if (!seri || seri.noktalar.length < 2) {
    return <Iskelet yukseklik={yukseklik + 34} />
  }
  const n = seri.noktalar.length

  // İkincil seri YALNIZCA adı varsa çizilir. Adsız bir kesikli çizgi ekranda
  // "bu ne?" sorusu doğuruyordu (kayıp eğrisinde tabanda düz duran sıfır
  // serisi); efsanede yazamıyorsak çizmiyoruz.
  const ikincil = seri.ikincilAd && seri.noktalar.every(p => p.ikincil !== null)
    ? seri.noktalar.map(p => p.ikincil as number)
    : null

  const tumu = [...seri.noktalar.map(p => p.birincil), ...(ikincil ?? [])]
  if (esik !== null) tumu.push(esik)
  const kilavuzlar = yKilavuzlari(Math.max(...tumu))
  const tavan = kilavuzlar[0] || 1

  // Yüzde uzayı: x soldan sağa, y yukarıdan aşağı (SVG yönü).
  const x = (i: number) => (i / (n - 1)) * 100
  const y = (v: number) => 100 - (v / tavan) * 100

  const esikYuzde = esik === null ? null : y(esik)

  return (
    <figure className="so-grf" style={{ ['--so-grf-boy' as string]: `${yukseklik}px` }}>
      <figcaption className="so-grf-efsane">
        <span className="so-grf-anahtar"><i data-seri="birincil" />{seri.birincilAd}</span>
        {ikincil && <span className="so-grf-anahtar"><i data-seri="ikincil" />{seri.ikincilAd}</span>}
        {esik !== null && (
          <span className="so-grf-anahtar"><i data-seri="esik" />{esikAdi ?? 'eşik'} · {eksenYaz(esik, seri.birim)}</span>
        )}
      </figcaption>

      <div className="so-grf-govde">
        <div className="so-grf-y" aria-hidden="true">
          {kilavuzlar.map(v => (
            <span key={v} style={{ top: `${y(v)}%` }}>{eksenYaz(v, seri.birim)}</span>
          ))}
        </div>

        <div className="so-grf-alan">
          <svg
            viewBox="0 0 100 100" preserveAspectRatio="none"
            role="img" aria-label={`${seri.baslik} — ${seri.birincilAd}`}
          >
            {kilavuzlar.map(v => (
              <path
                key={v} d={`M0 ${y(v).toFixed(2)} H100`} fill="none"
                stroke={DEGISKEN.cizgi} strokeWidth="1" vectorEffect="non-scaling-stroke"
              />
            ))}
            {esikYuzde !== null && (
              <path
                d={`M0 ${esikYuzde.toFixed(2)} H100`} fill="none"
                stroke={DEGISKEN.critical} strokeWidth="1.5" strokeDasharray="5 4"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {ikincil && (
              <path
                d={yol(ikincil, x, y)} fill="none" stroke={DEGISKEN.metinSilik}
                strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
            <path
              d={yol(seri.noktalar.map(p => p.birincil), x, y)} fill="none"
              stroke={DEGISKEN.marka} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Eşik kupürü çizginin SOL ucunda ve kutunun İÇİNDE — sağ kenarda
              yazınca son saat etiketiyle çakışıp kesiliyordu. */}
          {esikYuzde !== null && (
            <span className="so-grf-esik" style={{ top: `${esikYuzde}%` }}>
              {esikAdi ?? 'eşik'} {eksenYaz(esik as number, seri.birim)}
            </span>
          )}
        </div>

        <div className="so-grf-x" aria-hidden="true">
          {xIndisleri(n).map(i => (
            <span
              key={i}
              style={{ left: `${x(i)}%` }}
              data-uc={i === 0 ? 'bas' : i === n - 1 ? 'son' : undefined}
            >
              {seri.noktalar[i].etiket}
            </span>
          ))}
        </div>
      </div>
    </figure>
  )
}

// ─── Donut ───────────────────────────────────────────────────────────────────
//
// r = 15.9 → çevre ≈ 100, yani her dilimin `stroke-dasharray` değeri doğrudan
// YÜZDESİDİR. Trigonometri yok, yuvarlama hatası birikmez.

const CEVRE = 100

export function DonutDagilimi({ dagilim, baslik }: { dagilim: Dagilim | null; baslik: string }) {
  if (dagilim === null) return <Kart baslik={baslik}><Iskelet yukseklik={82} /></Kart>
  const toplam = dagilim.dilimler.reduce((t, d) => t + d.deger, 0)
  if (dagilim.dilimler.length === 0 || toplam <= 0) {
    return (
      <Kart baslik={dagilim.baslik}>
        <BosDurum sabit baslik="Dağılım verisi yok" metin="Vardiya kaydı ulaştığında burada görünür." />
      </Kart>
    )
  }

  let birikim = 0
  const dilimler = dagilim.dilimler.map((d, i) => {
    const pay = (d.deger / toplam) * CEVRE
    // Yay saat 3 yönünden başlar; çeyrek tur geri alıp tepeden başlatıyoruz.
    const kayma = CEVRE / 4 - birikim
    birikim += pay
    return { ...d, pay, kayma, renk: dilimRengi(i) }
  })

  return (
    <Kart baslik={dagilim.baslik} ornek={dagilim.veriTipi}>
      <div className="so-donut-sarmal">
        <svg width="82" height="82" viewBox="0 0 42 42" role="img" aria-label={dagilim.baslik}>
          <circle cx="21" cy="21" r="15.9" fill="none" stroke={DEGISKEN.markaSoluk} strokeWidth="6" />
          {dilimler.map(d => (
            <circle
              key={d.etiket} cx="21" cy="21" r="15.9" fill="none"
              stroke={d.renk} strokeWidth="6"
              strokeDasharray={`${d.pay.toFixed(2)} ${(CEVRE - d.pay).toFixed(2)}`}
              strokeDashoffset={d.kayma.toFixed(2)}
            />
          ))}
          <text x="21" y="20" textAnchor="middle" fontSize="8" fontWeight="700" fill={DEGISKEN.metin}>{sayiYaz(toplam)}</text>
          <text x="21" y="26" textAnchor="middle" fontSize="3.6" fill={DEGISKEN.metinSoluk}>Toplam</text>
        </svg>
        <div className="so-legend">
          {dilimler.map(d => (
            <div key={d.etiket}>
              <i style={{ background: d.renk }} />
              {d.etiket}
              <b>{sayiYaz(d.deger)}</b>
            </div>
          ))}
        </div>
      </div>
    </Kart>
  )
}

// ─── Yoğunluk ızgarası (ısı haritası) ────────────────────────────────────────
//
// Düzen referansı burada dekoratif radyal lekeler öneriyordu; ızgara KALDI:
// 12×8 hücrenin her biri gerçek ölçüm taşıyor ve hover'da değeri okunuyor.
// Süslü olan sahte olurdu.

export function IzgaraHaritasi({ izgara }: { izgara: Izgara | null }) {
  if (izgara === null) return <Kart baslik="Yoğunluk"><Iskelet yukseklik={132} /></Kart>
  if (izgara.hucreler.length === 0) {
    return (
      <Kart baslik={izgara.baslik}>
        <BosDurum sabit baslik="Isı haritası verisi yok" metin="Kameralardan yoğunluk anlık görüntüsü ulaşmadı." />
      </Kart>
    )
  }

  const { satir, sutun } = izgara
  return (
    <Kart baslik={izgara.baslik} ornek={izgara.veriTipi}>
      <div
        style={{ display: 'grid', gridTemplateColumns: `repeat(${sutun}, 1fr)`, gap: 3 }}
        role="img"
        aria-label={`${satir}x${sutun} yoğunluk haritası`}
      >
        {izgara.hucreler.slice(0, satir * sutun).map((v, i) => (
          <div
            key={i}
            title={`%${sayiYaz(v)}`}
            style={{ aspectRatio: '1 / 1', borderRadius: 3, background: isiRengi(v) }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 10, color: DEGISKEN.metinSilik }}>
        <span>düşük</span>
        <span style={{ flex: 1, height: 6, borderRadius: 3, background: `linear-gradient(90deg, ${isiRengi(0)}, ${isiRengi(100)})` }} />
        <span>yüksek</span>
      </div>
    </Kart>
  )
}

// ─── Dağılım (yatay çubuk) ───────────────────────────────────────────────────

export function DagilimCubugu({ dagilim }: { dagilim: Dagilim | null }) {
  if (dagilim === null) return <Kart baslik="Dağılım"><Iskelet yukseklik={120} /></Kart>
  if (dagilim.dilimler.length === 0) {
    return (
      <Kart baslik={dagilim.baslik}>
        <BosDurum sabit baslik="Dağılım verisi yok" metin="Bu gösterge için ölçüm bulunamadı." />
      </Kart>
    )
  }

  const enB = Math.max(...dagilim.dilimler.map(d => d.deger), 1)
  return (
    <Kart baslik={dagilim.baslik} ornek={dagilim.veriTipi}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {dagilim.dilimler.map(d => (
          <div key={d.etiket}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span>{d.etiket}</span>
              <span style={{ color: DEGISKEN.metinSoluk }}>
                {sayiYaz(d.deger)}{dagilim.birim === 'yuzde' ? '%' : ''}
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: DEGISKEN.yuzey2, overflow: 'hidden' }}>
              <div style={{ width: `${(d.deger / enB) * 100}%`, height: '100%', background: DEGISKEN.marka }} />
            </div>
          </div>
        ))}
      </div>
    </Kart>
  )
}
