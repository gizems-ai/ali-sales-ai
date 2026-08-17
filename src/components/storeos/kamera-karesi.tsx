// ════════════════════════════════════════════════════════════════════════════
//  Store OS — DEMO KAMERA KARESİ (madde C)
//
//  Gerçek RTSP yayını demoda YOK. Önceki hal "GÖRÜNTÜ YOK · YER TUTUCU" yazan
//  boş bir kutuydu; jüri ekranında bozuk görünüyordu. Yerine kameranın NE
//  ÜRETTİĞİNİ gösteren tepeden görünüm şeması geldi: reyon sıraları, kasa
//  bantları, anonim kişi işaretleri ve kuyruk tespiti.
//
//  ── DÜRÜSTLÜK (madde 11) ───────────────────────────────────────────────────
//   · Kare "DEMO GÖRÜNTÜ" etiketi taşır — canlı yayın gibi sunulmaz.
//   · Kişiler DAİREDİR. Yüz yok, iskelet yok, kimlik yok. Store OS'in yaptığı
//     iş de zaten budur: sayım ve yoğunluk, kişi tanıma değil.
//   · Sayılar prop olarak gelir; SVG kendi verisini uydurmaz.
//
//  Renk yok: her şekil `.storeos-root .so-kam-sahne .<sınıf>` üzerinden
//  boyanır (globals.css). Konumlar SABİT dizilerdir — `Math.random` yasak.
// ════════════════════════════════════════════════════════════════════════════

/** Reyon sıraları (tepeden): x konumları. */
const RAFLAR = [26, 76, 126, 176, 226, 276]

/** Reyonlarda dolaşan anonim kişiler — sabit, deterministik konumlar. */
const GEZENLER: Array<[number, number]> = [
  [48, 40], [64, 72], [101, 34], [113, 88], [158, 48], [151, 30],
  [201, 63], [213, 28], [252, 74], [266, 41], [92, 108], [240, 104],
]

/** Tespit kutusu çizilen kişiler (GEZENLER içindeki indeksler). */
const KUTULU = [0, 4, 8, 11]

/** Kasa bantları: [x, genişlik]. */
const KASALAR: Array<[number, number]> = [[24, 60], [122, 60], [220, 62]]

export function KameraKaresi({
  kod, kuyruk = 0, mini = false,
}: {
  /** Sağ üstte yazan kamera kısa kodu (ör. "CAM 02"). */
  kod: string
  /** Kuyruk şeridinde çizilecek anonim kişi sayısı (0 = kuyruk yok). */
  kuyruk?: number
  /** Şerit küçük kareleri: HUD ve tespit kutuları çizilmez. */
  mini?: boolean
}) {
  const kuyrukN = Math.max(0, Math.min(8, Math.round(kuyruk)))
  // Kuyruk 2. kasanın önünde, kasadan yukarı doğru dizilir.
  const kuyrukNoktalari = Array.from({ length: kuyrukN }, (_, i) => 126 - i * 8)

  return (
    <svg
      className="so-kam-sahne"
      viewBox="0 0 320 180"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`${kod} demo görüntüsü — tepeden mağaza şeması, anonim kişi işaretleri`}
    >
      <rect className="zemin" x="0" y="0" width="320" height="180" />
      <rect className="kat" x="8" y="8" width="304" height="164" rx="6" />

      {/* Zemin ızgarası — mekân hissi, veri değil. */}
      <g className="cizgi">
        {[38, 68, 98, 128, 158].map(y => <path key={y} d={`M10 ${y} H310`} />)}
        {[60, 110, 160, 210, 260].map(x => <path key={x} d={`M${x} 12 V168`} />)}
      </g>

      {/* Reyon sıraları */}
      {RAFLAR.map(x => <rect key={x} className="raf" x={x} y="18" width="12" height="86" rx="3" />)}

      {/* Kasa bantları */}
      {KASALAR.map(([x, w]) => <rect key={x} className="kasa" x={x} y="140" width={w} height="12" rx="3" />)}

      {/* Anonim kişiler — reyon alanı */}
      {GEZENLER.map(([x, y], i) => (
        <g key={`g${i}`}>
          {!mini && KUTULU.includes(i) && (
            <rect className="kutu" x={x - 5.5} y={y - 5.5} width="11" height="11" rx="2" />
          )}
          <circle className="kisi" cx={x} cy={y} r="3" />
        </g>
      ))}

      {/* Kuyruk tespiti — sayı PROP'tan gelir, uydurulmaz */}
      {kuyrukN > 0 && (
        <g>
          {!mini && (
            <rect className="kutu-k" x="143" y={126 - (kuyrukN - 1) * 8 - 7} width="16" height={(kuyrukN - 1) * 8 + 14} rx="3" />
          )}
          {kuyrukNoktalari.map(y => <circle key={y} className="kisi-k" cx="151" cy={y} r="3" />)}
          {!mini && (
            <text className="hud-k" x="164" y={126 - (kuyrukN - 1) * 8 - 1}>
              KUYRUK · {kuyrukN}
            </text>
          )}
        </g>
      )}

      {!mini && (
        <>
          {/* Köşe braketleri */}
          <g className="kose">
            <path d="M14 26 V14 H26" />
            <path d="M294 14 H306 V26" />
            <path d="M306 154 V166 H294" />
            <path d="M26 166 H14 V154" />
          </g>
          <text className="hud" x="16" y="176">{kod}</text>
          <text className="hud" x="286" y="176" textAnchor="end">TEPEDEN GÖRÜNÜM</text>
          <circle className="rec" cx="303" cy="174" r="2.6" />
        </>
      )}

      {/* Tarama çizgisi — donmuş kare hissini kırar. */}
      <rect className="tarama" x="0" y="-40" width="320" height="40" />
    </svg>
  )
}
