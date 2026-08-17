'use client'

// ════════════════════════════════════════════════════════════════════════════
//  Store OS — mağaza bağlamı (yan menü ile pano arasındaki tek köprü)
//
//  Yan menüdeki mağaza seçici, panonun çektiği mağazanın adını göstermeli.
//  Üç yol vardı:
//    · menü kendi isteğini atsın → İSTEK BÜTÇESİNİ BOZAR (Airtable 4 istek/sn,
//      pano zaten iki kademe anket yapıyor). Reddedildi.
//    · sunucuda ön-yükleme → `(korumali)/page.tsx` içinde gerekçesi yazılı
//      olarak REDDEDİLDİ (iki kaynak, iki tutarsızlık).
//    · panonun elindeki veriyi yayınlaması → bu dosya. Sıfır ek istek.
//
//  Bağlam BOŞ başlar; menü mağaza adını bilmeden de doğru çizilir.
// ════════════════════════════════════════════════════════════════════════════

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { MagazaOzeti } from '@/lib/storeos/dashboard/tipler'

interface MagazaBaglami {
  magaza: MagazaOzeti | null
  yayinla: (m: MagazaOzeti | null) => void
}

const Baglam = createContext<MagazaBaglami>({ magaza: null, yayinla: () => {} })

export function MagazaSaglayici({ children }: { children: ReactNode }) {
  const [magaza, setMagaza] = useState<MagazaOzeti | null>(null)
  const deger = useMemo(() => ({ magaza, yayinla: setMagaza }), [magaza])
  return <Baglam.Provider value={deger}>{children}</Baglam.Provider>
}

/** Yan menü okur. Veri gelmemişse `null` — menü yine de çizilir. */
export function useMagaza(): MagazaOzeti | null {
  return useContext(Baglam).magaza
}

/** Pano yazar. Sağlayıcı yoksa (liste ekranları) sessizce hiçbir şey yapmaz. */
export function useMagazaYayini(): (m: MagazaOzeti | null) => void {
  return useContext(Baglam).yayinla
}
