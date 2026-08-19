'use client'

// ════════════════════════════════════════════════════════════════════════════
//  Store OS — mağaza bağlamı (yan menü ile pano arasındaki tek köprü)
//
//  Yan menüdeki mağaza seçici, panonun çektiği mağazanın adını göstermeli.
//  Menünün KENDİ isteğini atması reddedildi: Airtable 4 istek/sn ve pano zaten
//  iki kademe anket yapıyor. Panonun elindeki veriyi yayınlaması → sıfır ek
//  istek. Bu dosya o köprü.
//
//  ── AMA BAŞLANGIÇ ARTIK BOŞ DEĞİL (19 Ağu 2026) ────────────────────────────
//  Bağlam eskiden `null` başlıyordu ve YALNIZCA pano yayın yapıyordu. Sonuç:
//  panonun dışındaki her ekranda menü ömür boyu "Mağaza yükleniyor… —"
//  yazıyordu — hiçbir zaman gelmeyecek bir veriyi bekleyerek.
//
//  Çözüm: kabuk, sunucuda mağaza kodunu (env) ve o kodun adını (seed tablosu)
//  bağlama TOHUMLUYOR. Bu ikinci bir veri kaynağı değil — aynı mağaza kodunun
//  statik kimliği. Panonun canlı verisi geldiğinde onun adı/durumu üstüne
//  yazar; gelmediği ekranlarda menü yine de doğru mağazayı yazar. Böylece
//  "yükleniyor" durumu ya çözülür ya da hiç doğmaz.
// ════════════════════════════════════════════════════════════════════════════

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { MagazaOzeti } from '@/lib/storeos/dashboard/tipler'

/** Sunucudan gelen statik kimlik — canlı veri yokken menünün yazdığı şey. */
export interface MagazaTohumu { kod: string; ad: string; sehir: string }

interface MagazaBaglami {
  /** Panonun yayınladığı CANLI özet. Yoksa null. */
  magaza: MagazaOzeti | null
  /** Sunucudan gelen statik kimlik. Demoda her zaman dolu. */
  tohum: MagazaTohumu | null
  yayinla: (m: MagazaOzeti | null) => void
}

const Baglam = createContext<MagazaBaglami>({ magaza: null, tohum: null, yayinla: () => {} })

export function MagazaSaglayici({
  tohum = null, children,
}: {
  tohum?: MagazaTohumu | null
  children: ReactNode
}) {
  const [magaza, setMagaza] = useState<MagazaOzeti | null>(null)
  const deger = useMemo(() => ({ magaza, tohum, yayinla: setMagaza }), [magaza, tohum])
  return <Baglam.Provider value={deger}>{children}</Baglam.Provider>
}

/** Yan menü okur. Canlı veri yoksa tohum kullanılır; ikisi de yoksa iskelet. */
export function useMagazaBaglami(): MagazaBaglami {
  return useContext(Baglam)
}

/** Canlı özet — yalnız panonun yayınladığı veri. */
export function useMagaza(): MagazaOzeti | null {
  return useContext(Baglam).magaza
}

/** Pano yazar. Sağlayıcı yoksa (liste ekranları) sessizce hiçbir şey yapmaz. */
export function useMagazaYayini(): (m: MagazaOzeti | null) => void {
  return useContext(Baglam).yayinla
}
