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

// ─── Sıkışık seri (kart içinde, başlıksız) ───────────────────────────────────
//
// `SeriGrafigi` kendi kartını çizer ve 150px yer kaplar. Pano düzeninde grafik
// bir metin kutusunun yanında 96–108px'lik bir alanda duruyor; aynı bileşeni
// zorlamak yerine eksensiz, sıkışık bir sürüm.

const S_G = 260
const S_Y = 104

/**
 * @param esik Yatay eşik çizgisi (ör. kuyruk için 180 sn). Verilmezse çizilmez —
 *   panodaki mevcut iki kullanım bu prop'u geçmiyor, davranışları değişmedi.
 */
export function SikisikSeri({ seri, esik = null }: { seri: Seri | null; esik?: number | null }) {
  if (!seri || seri.noktalar.length < 2) {
    return <Iskelet yukseklik={S_Y} />
  }
  const n = seri.noktalar.length
  const tumu = seri.noktalar.flatMap(p => [p.birincil, ...(p.ikincil === null ? [] : [p.ikincil])])
  if (esik !== null) tumu.push(esik)
  const enB = Math.max(...tumu)
  const enK = Math.min(...tumu, 0)
  const aralik = enB - enK || 1

  const x = (i: number) => 6 + (i / (n - 1)) * (S_G - 12)
  const y = (v: number) => 6 + (1 - (v - enK) / aralik) * (S_Y - 24)

  const ikincil = seri.noktalar.every(p => p.ikincil !== null)
    ? seri.noktalar.map(p => p.ikincil as number)
    : null

  // En çok dört saat etiketi — 260px'e daha fazlası sığmaz.
  const adim = Math.max(1, Math.floor((n - 1) / 3))

  return (
    <svg viewBox={`0 0 ${S_G} ${S_Y}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label={seri.baslik}>
      {ikincil && (
        <path d={yol(ikincil, x, y)} fill="none" stroke={DEGISKEN.metinSilik} strokeWidth="1.6" strokeDasharray="4 4" />
      )}
      {esik !== null && (
        <>
          <path d={`M6 ${y(esik).toFixed(1)} H${S_G - 6}`} stroke={DEGISKEN.critical} strokeWidth="1.2" strokeDasharray="5 3" fill="none" />
          <text x={S_G - 6} y={y(esik) - 3} fontSize="7.5" fill={DEGISKEN.critical} textAnchor="end">eşik</text>
        </>
      )}
      <path d={yol(seri.noktalar.map(p => p.birincil), x, y)} fill="none" stroke={DEGISKEN.marka} strokeWidth="2.2" strokeLinejoin="round" />
      {seri.noktalar.map((p, i) => (
        i % adim === 0 || i === n - 1
          ? <text key={p.etiket} x={x(i)} y={S_Y - 2} fontSize="8" fill={DEGISKEN.metinSilik} textAnchor="middle">{p.etiket}</text>
          : null
      ))}
    </svg>
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
