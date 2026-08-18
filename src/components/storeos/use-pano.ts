'use client'

// ════════════════════════════════════════════════════════════════════════════
//  Store OS — İKİ KADEMELİ ANKET (polling)
//
//  SSE KURULMAYACAK (madde: açık talimat). Bunun yerine iki kademe:
//    canli  →  4 sn  · alarmlar + görevler   ("15 sn içinde görünür" kriteri)
//    yavas  → 30 sn  · KPI, grafikler, ekip  (dakikada bir değişen veriler)
//  İlk yükleme tek 'tam' isteğidir — açılışta iki istek atılmaz.
//
//  ── DEPO-BAĞIMSIZLIK ───────────────────────────────────────────────────────
//  Yeni yanıt eskisinin ÜZERİNE yazılmaz, ALANLARI birleştirilir: `null` gelen
//  alan "bu istekte taşınmadı" demektir, elde olan korunur. Böylece canlı anket
//  KPI'ları silmez. Ayrıca hiçbir yerde "POST ettiğim olay bir sonraki ankette
//  MUTLAKA vardır" varsayımı yok — Airtable'da olmayabilir, ekran bunu hata
//  saymaz, bir sonraki turda gelir.
//
//  Bütçe koruması: sekme arka plandayken anket DURUR (Airtable base başına
//  ~5 istek/sn). Sekmeye dönüldüğünde hemen bir 'tam' istek atılır.
// ════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react'
import { PANO_ARALIK } from '@/lib/storeos/anket'
import type { DashboardVerisi, Katman, PanoHatasi } from '@/lib/storeos/dashboard/tipler'

// 2 sn → 4 sn (17 Ağu 2026, ölçümle). Airtable transportu 4 istek/sn ile
// kendini sınırlıyor ve anket bu bütçeyi zincirle PAYLAŞIYOR. 2 sn'de pano
// tek başına 2.17 istek/sn yiyordu; olay→telefon gecikmesi ~13 sn'ye çıkıyordu.
// 4 sn kabul kriterindeki 15 sn tavanının çok altında kalır, bütçeyi zincire
// bırakır. Ölçüm: `scripts/storeos/istek-butcesi.ts`.
export const ARALIK = PANO_ARALIK

/** Ardışık hatada geri çekilme (ms). Son değer tekrarlanır. */
const GERI_CEKILME = [4_000, 10_000, 30_000, 60_000]

export interface PanoDurumu {
  veri: DashboardVerisi | null
  hata: PanoHatasi | null
  /** İlk veri henüz gelmedi — iskelet gösterilir. */
  yukleniyor: boolean
  /** Sekme arka planda olduğu için anket duraklatıldı. */
  duraklatildi: boolean
  /** Son BAŞARILI yanıtın alındığı an (ms). "az önce güncellendi" için. */
  sonGuncelleme: number | null
  yenile: () => void
}

/** `null` alanlar öncekini korur — kademe birleşimi tek yerde. */
function birlestir(eski: DashboardVerisi | null, yeni: DashboardVerisi): DashboardVerisi {
  if (!eski) return yeni
  const al = <T,>(y: T | null, e: T | null): T | null => (y === null ? e : y)
  return {
    ...yeni,
    alarmlar:         al(yeni.alarmlar, eski.alarmlar),
    gorevler:         al(yeni.gorevler, eski.gorevler),
    gorevOzeti:       al(yeni.gorevOzeti, eski.gorevOzeti),
    magaza:           al(yeni.magaza, eski.magaza),
    kpiler:           al(yeni.kpiler, eski.kpiler),
    kuyrukSerisi:     al(yeni.kuyrukSerisi, eski.kuyrukSerisi),
    satisSerisi:      al(yeni.satisSerisi, eski.satisSerisi),
    yogunlukIzgarasi: al(yeni.yogunlukIzgarasi, eski.yogunlukIzgarasi),
    rafDoluluk:       al(yeni.rafDoluluk, eski.rafDoluluk),
    personelDagilimi: al(yeni.personelDagilimi, eski.personelDagilimi),
    kameralar:        al(yeni.kameralar, eski.kameralar),
    personel:         al(yeni.personel, eski.personel),
    // Dürüstlük etiketi taşınan katmanın verisinden gelir; birleşimde
    // 'demo' baskındır — bir kademe demo ise pano demo sayılır.
    veriTipi: yeni.veriTipi === 'demo' || eski.veriTipi === 'demo' ? 'demo' : 'gercek',
    // Birleşik nesnede "boş" yalnız iki kademe de boşsa doğrudur.
    bos: yeni.bos && eski.bos,
  }
}

export function usePano(): PanoDurumu {
  const [veri, setVeri] = useState<DashboardVerisi | null>(null)
  const [hata, setHata] = useState<PanoHatasi | null>(null)
  const [duraklatildi, setDuraklatildi] = useState(false)
  const [sonGuncelleme, setSonGuncelleme] = useState<number | null>(null)

  const hataSayaci = useRef(0)
  const surenIstek = useRef<AbortController | null>(null)

  const cek = useCallback(async (katman: Katman) => {
    // Aynı anda iki istek olmasın: yavaş yanıt gelmeden 2 sn'lik tur atarsa
    // istekler birikir. Öncekini iptal et.
    surenIstek.current?.abort()
    const kontrol = new AbortController()
    surenIstek.current = kontrol

    try {
      const y = await fetch(`/api/storeos/dashboard?katman=${katman}`, {
        signal: kontrol.signal,
        cache: 'no-store',
      })
      if (!y.ok) {
        const govde = (await y.json().catch(() => null)) as PanoHatasi | null
        hataSayaci.current += 1
        setHata(govde ?? { hata: `Sunucu ${y.status}`, tekrarDenenebilir: y.status >= 500 })
        return
      }
      const d = (await y.json()) as DashboardVerisi
      hataSayaci.current = 0
      setHata(null)
      setVeri(e => birlestir(e, d))
      setSonGuncelleme(Date.now())
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      hataSayaci.current += 1
      setHata({ hata: 'Sunucuya ulaşılamadı', tekrarDenenebilir: true })
    }
  }, [])

  const yenile = useCallback(() => { hataSayaci.current = 0; void cek('tam') }, [cek])

  useEffect(() => {
    let canliZ: ReturnType<typeof setTimeout> | null = null
    let yavasZ: ReturnType<typeof setTimeout> | null = null
    let bitti = false

    const gecikme = (temel: number) => {
      const h = hataSayaci.current
      if (h === 0) return temel
      return Math.max(temel, GERI_CEKILME[Math.min(h - 1, GERI_CEKILME.length - 1)])
    }

    const tur = (katman: 'canli' | 'yavas') => {
      if (bitti) return
      const calistir = async () => {
        if (bitti) return
        if (document.visibilityState === 'visible') await cek(katman)
        if (bitti) return
        const z = setTimeout(calistir, gecikme(ARALIK[katman]))
        if (katman === 'canli') canliZ = z; else yavasZ = z
      }
      const z = setTimeout(calistir, ARALIK[katman])
      if (katman === 'canli') canliZ = z; else yavasZ = z
    }

    // İlk yükleme: tek 'tam' istek, sonra iki kademe kendi ritmine geçer.
    void cek('tam').then(() => {
      if (bitti) return
      tur('canli')
      tur('yavas')
    })

    const gorunurluk = () => {
      const gizli = document.visibilityState !== 'visible'
      setDuraklatildi(gizli)
      // Sekmeye dönüldüğünde beklemeden tazele — jüri sekme değiştirip
      // döndüğünde 30 sn eski veri görmesin.
      if (!gizli) { hataSayaci.current = 0; void cek('tam') }
    }
    document.addEventListener('visibilitychange', gorunurluk)

    return () => {
      bitti = true
      if (canliZ) clearTimeout(canliZ)
      if (yavasZ) clearTimeout(yavasZ)
      document.removeEventListener('visibilitychange', gorunurluk)
      surenIstek.current?.abort()
    }
  }, [cek])

  return {
    veri, hata,
    yukleniyor: veri === null && hata === null,
    duraklatildi,
    sonGuncelleme,
    yenile,
  }
}
