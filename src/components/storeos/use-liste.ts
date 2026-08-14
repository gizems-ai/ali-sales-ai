'use client'

// ════════════════════════════════════════════════════════════════════════════
//  Store OS — LİSTE EKRANI ANKETİ (Alarmlar · Görevler · Denetim)
//
//  `use-pano.ts`'in KARDEŞİ, kopyası değil. Farklar bilinçli:
//
//   · TEK KADEME. Panoda iki kademe vardı çünkü KPI'lar ile alarmlar farklı
//     hızda değişiyordu. Burada ekranın tamamı tek bir listedir; iki kademeye
//     bölecek bir şey yok. Bu yüzden birleştirme (merge) mantığı da yok:
//     yeni yanıt eskisinin yerine GEÇER. Filtre değişince eski satırların
//     kalması yanlış olurdu.
//
//   · ARALIK GÖRÜNÜME GÖRE. Alarmlar canlı akış (5 sn), görevler dakikalarca
//     değişmez (10 sn), denetim append-only bir defterdir (15 sn). Panonun
//     2 sn'lik canlı kademesi 200 satırlık listeler için gereksiz — Airtable
//     istek bütçesi (base başına ~5 istek/sn) üç ekran açıkken tükenir.
//
//  Panodan AYNEN devralınanlar: sekme arka plandayken anket DURUR · ardışık
//  hatada geri çekilme · süren istek iptal edilir · sunucuya ulaşılamaması ile
//  boş liste FARKLI durumlardır.
// ════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  Gorunum, ListeFiltresi, ListeHatasi, ListeVerisi,
} from '@/lib/storeos/liste/tipler'

/** Görünüm başına anket aralığı (ms). Gerekçe dosya başlığında. */
export const ARALIK: Record<Gorunum, number> = {
  alarmlar: 5_000,
  gorevler: 10_000,
  denetim: 15_000,
}

/** Ardışık hatada geri çekilme (ms). Son değer tekrarlanır (pano ile aynı). */
const GERI_CEKILME = [8_000, 20_000, 45_000, 90_000]

export interface ListeDurumu {
  veri: ListeVerisi | null
  hata: ListeHatasi | null
  /** İlk veri henüz gelmedi — iskelet gösterilir. */
  yukleniyor: boolean
  /** Elde veri VAR ama yeni bir istek sürüyor (filtre değişimi / anket turu). */
  yenileniyor: boolean
  /** Sekme arka planda olduğu için anket duraklatıldı. */
  duraklatildi: boolean
  filtre: ListeFiltresi
  filtreDegistir: (yama: Partial<ListeFiltresi>) => void
  yenile: () => void
}

function sorgu(gorunum: Gorunum, f: ListeFiltresi): string {
  const p = new URLSearchParams({ gorunum })
  // Varsayılan değerler URL'e YAZILMAZ: paylaşılan bağlantı okunabilir kalsın
  // ve sunucudaki normalize etme mantığı tek doğru kaynak olsun.
  if (f.severity !== 'hepsi') p.set('severity', f.severity)
  if (f.durum !== 'hepsi') p.set('durum', f.durum)
  if (f.entity) p.set('entity', f.entity)
  if (f.q) p.set('q', f.q)
  return p.toString()
}

/** Adres çubuğunu filtreyle eşitler — ekran bağlantısı paylaşılabilir olsun.
 *  `replaceState` bilinçli: her filtre tıklaması tarayıcı geçmişine girmez. */
function adresiEsitle(f: ListeFiltresi): void {
  if (typeof window === 'undefined') return
  const p = new URLSearchParams()
  if (f.severity !== 'hepsi') p.set('severity', f.severity)
  if (f.durum !== 'hepsi') p.set('durum', f.durum)
  if (f.entity) p.set('entity', f.entity)
  if (f.q) p.set('q', f.q)
  const arama = p.toString()
  window.history.replaceState(null, '', arama ? `?${arama}` : window.location.pathname)
}

export function useListe(gorunum: Gorunum, baslangic: ListeFiltresi): ListeDurumu {
  const [filtre, setFiltre] = useState<ListeFiltresi>(baslangic)
  const [veri, setVeri] = useState<ListeVerisi | null>(null)
  const [hata, setHata] = useState<ListeHatasi | null>(null)
  const [yenileniyor, setYenileniyor] = useState(false)
  const [duraklatildi, setDuraklatildi] = useState(false)

  const hataSayaci = useRef(0)
  const surenIstek = useRef<AbortController | null>(null)
  // Anket zamanlayıcısı filtreyi kapamasın: `cek` her filtre değişiminde
  // yeniden yaratılırsa effect de yeniden kurulur ve anket sıfırlanır. Filtreyi
  // ref üzerinden okuyarak zamanlayıcıyı tek sefer kuruyoruz.
  const filtreRef = useRef(filtre)
  filtreRef.current = filtre

  const cek = useCallback(async () => {
    // Aynı anda iki istek olmasın: yavaş yanıt gelmeden yeni tur atarsa
    // istekler birikir. Öncekini iptal et.
    surenIstek.current?.abort()
    const kontrol = new AbortController()
    surenIstek.current = kontrol
    setYenileniyor(true)

    try {
      const y = await fetch(`/api/storeos/liste?${sorgu(gorunum, filtreRef.current)}`, {
        signal: kontrol.signal,
        cache: 'no-store',
      })
      if (!y.ok) {
        const govde = (await y.json().catch(() => null)) as ListeHatasi | null
        hataSayaci.current += 1
        setHata(govde ?? { hata: `Sunucu ${y.status}`, tekrarDenenebilir: y.status >= 500 })
        return
      }
      const d = (await y.json()) as ListeVerisi
      hataSayaci.current = 0
      setHata(null)
      setVeri(d)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      hataSayaci.current += 1
      setHata({ hata: 'Sunucuya ulaşılamadı', tekrarDenenebilir: true })
    } finally {
      // İptal edilen istek de buraya düşer; bayrağı bırakan hep SON istektir
      // çünkü iptal edilen `abort` dalında zaten erken dönüyoruz.
      if (surenIstek.current === kontrol) setYenileniyor(false)
    }
  }, [gorunum])

  const yenile = useCallback(() => { hataSayaci.current = 0; void cek() }, [cek])

  const filtreDegistir = useCallback((yama: Partial<ListeFiltresi>) => {
    setFiltre(o => {
      const yeni = { ...o, ...yama }
      adresiEsitle(yeni)
      return yeni
    })
  }, [])

  // Filtre değişince HEMEN çek — anket turunu bekletmek, tıklamanın işe
  // yaramadığı hissi verir.
  useEffect(() => {
    hataSayaci.current = 0
    void cek()
  }, [cek, filtre])

  // Anket turu. Filtreye BAĞLI DEĞİL (filtreRef üzerinden okunuyor), yoksa her
  // tıklamada zamanlayıcı sıfırlanırdı.
  useEffect(() => {
    let zamanlayici: ReturnType<typeof setTimeout> | null = null
    let bitti = false

    const gecikme = () => {
      const h = hataSayaci.current
      if (h === 0) return ARALIK[gorunum]
      return Math.max(ARALIK[gorunum], GERI_CEKILME[Math.min(h - 1, GERI_CEKILME.length - 1)])
    }

    const tur = async () => {
      if (bitti) return
      if (document.visibilityState === 'visible') await cek()
      if (bitti) return
      zamanlayici = setTimeout(tur, gecikme())
    }
    zamanlayici = setTimeout(tur, ARALIK[gorunum])

    const gorunurluk = () => {
      const gizli = document.visibilityState !== 'visible'
      setDuraklatildi(gizli)
      // Sekmeye dönüldüğünde beklemeden tazele.
      if (!gizli) { hataSayaci.current = 0; void cek() }
    }
    document.addEventListener('visibilitychange', gorunurluk)

    return () => {
      bitti = true
      if (zamanlayici) clearTimeout(zamanlayici)
      document.removeEventListener('visibilitychange', gorunurluk)
      surenIstek.current?.abort()
    }
  }, [cek, gorunum])

  return useMemo(() => ({
    veri, hata,
    yukleniyor: veri === null && hata === null,
    yenileniyor,
    duraklatildi,
    filtre,
    filtreDegistir,
    yenile,
  }), [veri, hata, yenileniyor, duraklatildi, filtre, filtreDegistir, yenile])
}
