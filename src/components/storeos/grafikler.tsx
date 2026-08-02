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
import { DEGISKEN, isiRengi } from '@/lib/storeos/tema'
import { BosDurum, Iskelet, Kart, OrnekVeri, sayiYaz } from './temel'

// ─── Saatlik seri (çizgi) ────────────────────────────────────────────────────

const G = 560   // viewBox genişliği — responsive, preserveAspectRatio ile esner
const Y = 150
const PAD = { ust: 10, sag: 8, alt: 20, sol: 34 }

function yol(degerler: number[], x: (i: number) => number, y: (v: number) => number): string {
  return degerler.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
}

export function SeriGrafigi({ seri }: { seri: Seri | null }) {
  if (seri === null) {
    return <Kart baslik="Grafik"><Iskelet yukseklik={150} /></Kart>
  }
  if (seri.noktalar.length < 2) {
    return (
      <Kart baslik={seri.baslik}>
        <BosDurum baslik="Grafik için yeterli veri yok" metin="En az iki ölçüm noktası gerekiyor." />
      </Kart>
    )
  }

  const n = seri.noktalar.length
  const tumu = seri.noktalar.flatMap(p => [p.birincil, ...(p.ikincil === null ? [] : [p.ikincil])])
  const enB = Math.max(...tumu)
  const enK = Math.min(...tumu, 0)
  const aralik = enB - enK || 1

  const x = (i: number) => PAD.sol + (i / (n - 1)) * (G - PAD.sol - PAD.sag)
  const y = (v: number) => PAD.ust + (1 - (v - enK) / aralik) * (Y - PAD.ust - PAD.alt)

  const birincil = seri.noktalar.map(p => p.birincil)
  const ikincil = seri.noktalar.every(p => p.ikincil !== null)
    ? seri.noktalar.map(p => p.ikincil as number)
    : null

  // Etiket kalabalığı olmasın: en çok 6 saat etiketi.
  const adim = Math.max(1, Math.ceil(n / 6))

  return (
    <Kart
      baslik={seri.baslik}
      sag={<OrnekVeri veriTipi={seri.veriTipi} />}
    >
      <div style={{ display: 'flex', gap: 14, marginBottom: 8, fontSize: 11, color: DEGISKEN.metinSilik }}>
        <span><i style={{ display: 'inline-block', width: 9, height: 2, background: DEGISKEN.marka, marginRight: 5, verticalAlign: 'middle' }} />{seri.birincilAd}</span>
        {ikincil && seri.ikincilAd && (
          <span><i style={{ display: 'inline-block', width: 9, height: 2, background: DEGISKEN.metinSilik, marginRight: 5, verticalAlign: 'middle' }} />{seri.ikincilAd}</span>
        )}
      </div>
      <svg viewBox={`0 0 ${G} ${Y}`} width="100%" height={Y} role="img" aria-label={seri.baslik}>
        {/* yatay kılavuz */}
        {[0, 0.5, 1].map(o => (
          <line
            key={o} x1={PAD.sol} x2={G - PAD.sag}
            y1={y(enK + aralik * o)} y2={y(enK + aralik * o)}
            stroke={DEGISKEN.cizgi} strokeWidth="1"
          />
        ))}
        <text x="2" y={y(enB) + 4} fontSize="9" fill={DEGISKEN.metinSilik}>{sayiYaz(Math.round(enB))}</text>
        <text x="2" y={y(enK) + 4} fontSize="9" fill={DEGISKEN.metinSilik}>{sayiYaz(Math.round(enK))}</text>

        {ikincil && (
          <path d={yol(ikincil, x, y)} fill="none" stroke={DEGISKEN.metinSilik} strokeWidth="1.5" strokeDasharray="4 3" />
        )}
        <path d={yol(birincil, x, y)} fill="none" stroke={DEGISKEN.marka} strokeWidth="2" strokeLinejoin="round" />
        {seri.noktalar.map((p, i) => (
          i % adim === 0
            ? <text key={p.etiket} x={x(i)} y={Y - 5} fontSize="9" fill={DEGISKEN.metinSilik} textAnchor="middle">{p.etiket}</text>
            : null
        ))}
      </svg>
    </Kart>
  )
}

// ─── Yoğunluk ızgarası (ısı haritası) ────────────────────────────────────────

export function IzgaraHaritasi({ izgara }: { izgara: Izgara | null }) {
  if (izgara === null) return <Kart baslik="Yoğunluk"><Iskelet yukseklik={150} /></Kart>
  if (izgara.hucreler.length === 0) {
    return (
      <Kart baslik={izgara.baslik}>
        <BosDurum baslik="Isı haritası verisi yok" metin="Kameralardan yoğunluk anlık görüntüsü ulaşmadı." />
      </Kart>
    )
  }

  const { satir, sutun } = izgara
  return (
    <Kart baslik={izgara.baslik} sag={<OrnekVeri veriTipi={izgara.veriTipi} />}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${sutun}, 1fr)`,
          gap: 3,
        }}
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 10.5, color: DEGISKEN.metinSilik }}>
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
        <BosDurum baslik="Dağılım verisi yok" metin="Bu gösterge için ölçüm bulunamadı." />
      </Kart>
    )
  }

  const enB = Math.max(...dagilim.dilimler.map(d => d.deger), 1)
  return (
    <Kart baslik={dagilim.baslik} sag={<OrnekVeri veriTipi={dagilim.veriTipi} />}>
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
