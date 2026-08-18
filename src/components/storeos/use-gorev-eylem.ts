'use client'

// ════════════════════════════════════════════════════════════════════════════
//  Store OS — GÖREV EYLEMİ (İYİMSER UI)
//
//  Görev ekranındaki düğmelerin tek beyni. Üç şeyi birlikte tutar, çünkü
//  üçünü ayırmak sessiz tutarsızlık üretir:
//    1. iyimser durum   — düğmeye basar basmaz satır yeni durumda çizilir
//    2. süren istek     — aynı görevin düğmeleri kilitlenir (çift tık yok)
//    3. sunucu cevabı   — başarı sessiz, başarısızlık GERİ ALIR ve söyler
//
//  ── İYİMSERLİK NEREDE BİTER ────────────────────────────────────────────────
//  İyimser değer ekrana yalancı bir gerçek yazar; bu yüzden ömrü sınırlıdır:
//   · sunucu verisi aynı durumu gösterince SİLİNİR (gerçek yerini alır),
//   · hata dönerse ANINDA silinir,
//   · hiçbiri olmazsa ÖMÜR_MS sonunda silinir — anket düşse bile ekran sonsuza
//     kadar olmayan bir durumu göstermez.
//
//  ── 409 İKİ FARKLI ŞEYDİR ──────────────────────────────────────────────────
//  `cakisma`      → ekran bayattı, kullanıcı yanlış bir şey YAPMADI. Mesaj bunu
//                   söyler ve liste tazelenir.
//  `gecersiz_gecis` → görev o yolu kaldırmıyor (ör. başkası tamamlamış).
//  İkisini tek "hata oldu" cümlesine indirmek, jüri önünde "sistem bozuldu"
//  gibi okunur. Ayrı cümle kuruyoruz.
//
//  İYİMSER KİLİT: her istek `beklenenDurum` taşır. İki kişi aynı anda basarsa
//  ikincisi 409/cakisma alır — sunucu tarafı bunu zaten uyguluyordu, ekran
//  şimdi kullanıyor.
// ════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react'
import type { EylemFiili } from '@/lib/storeos/gorev-gecis'
import type { GorevDurumu } from '@/lib/storeos/tipler'

/** İyimser değerin en uzun ömrü (ms). Anket 3 sn; bu onun güvenlik payı. */
const OMUR_MS = 15_000

export interface EylemMesaji {
  gorevNo: string
  metin: string
  tur: 'basari' | 'cakisma' | 'hata'
}

interface IyimserKayit {
  durum: GorevDurumu
  konuldu: number
}

export interface GorevEylemDurumu {
  /** Satır çizilirken sunucu durumunun yerine bu okunur (varsa). */
  iyimserDurum: (gorevNo: string, sunucuDurumu: GorevDurumu) => GorevDurumu
  /** O görev için istek sürüyor mu — düğmeler kilitli çizilir. */
  surende: (gorevNo: string) => boolean
  mesaj: EylemMesaji | null
  mesajiKapat: () => void
  calistir: (g: { gorevNo: string; mevcutDurum: GorevDurumu; hedef: EylemFiili; etiket: string }) => void
}

/**
 * @param yenile Liste anketini hemen tetikler. Başarıda da hatada da çağrılır:
 *   başarıda gerçeği getirmek, hatada bayat ekranı düzeltmek için.
 */
export function useGorevEylem(yenile: () => void): GorevEylemDurumu {
  const [iyimser, setIyimser] = useState<Record<string, IyimserKayit>>({})
  const [suren, setSuren] = useState<Record<string, true>>({})
  const [mesaj, setMesaj] = useState<EylemMesaji | null>(null)

  // Bileşen sökülürken gelen yanıt setState çağırmasın.
  const canli = useRef(true)
  useEffect(() => () => { canli.current = false }, [])

  // Ömrü dolan iyimser kayıtları temizle. Zamanlayıcı yalnız kayıt VARKEN kurulur.
  useEffect(() => {
    if (Object.keys(iyimser).length === 0) return
    const z = setTimeout(() => {
      const simdi = Date.now()
      setIyimser(o => {
        const y = Object.fromEntries(Object.entries(o).filter(([, k]) => simdi - k.konuldu < OMUR_MS))
        return Object.keys(y).length === Object.keys(o).length ? o : y
      })
    }, OMUR_MS)
    return () => clearTimeout(z)
  }, [iyimser])

  const iyimserDurum = useCallback(
    (gorevNo: string, sunucuDurumu: GorevDurumu): GorevDurumu => {
      const k = iyimser[gorevNo]
      if (!k) return sunucuDurumu
      // Sunucu ARTIK aynı şeyi (ya da daha ilerisini) söylüyorsa iyimserlik bitti.
      if (k.durum === sunucuDurumu) return sunucuDurumu
      return k.durum
    },
    [iyimser],
  )

  const surende = useCallback((gorevNo: string) => !!suren[gorevNo], [suren])

  const calistir = useCallback((g: {
    gorevNo: string; mevcutDurum: GorevDurumu; hedef: EylemFiili; etiket: string
  }) => {
    if (suren[g.gorevNo]) return
    setSuren(o => ({ ...o, [g.gorevNo]: true }))
    setMesaj(null)

    // Erteleme DURUM DEĞİŞTİRMEZ (bkz. gorev.ts) — iyimser durum yazmıyoruz.
    // `hedef` yerele alınıyor: closure içinde `g.hedef` daralması korunmaz.
    const hedef = g.hedef
    if (hedef !== 'ertele') {
      setIyimser(o => ({ ...o, [g.gorevNo]: { durum: hedef, konuldu: Date.now() } }))
    }

    void (async () => {
      try {
        const y = await fetch(`/api/storeos/gorev/${encodeURIComponent(g.gorevNo)}/durum`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ hedef: g.hedef, beklenenDurum: g.mevcutDurum }),
        })
        const govde = (await y.json().catch(() => null)) as
          { hata?: string; kod?: string; yeniSonTeslim?: string } | null

        if (!canli.current) return

        if (y.ok) {
          if (g.hedef === 'ertele') {
            setMesaj({ gorevNo: g.gorevNo, tur: 'basari', metin: `${g.gorevNo} 5 dakika ertelendi — son teslim ötelendi, durum değişmedi.` })
          }
          yenile()
          return
        }

        // Başarısız: iyimser değeri DERHAL geri al, sonra sebebi söyle.
        setIyimser(o => { const y2 = { ...o }; delete y2[g.gorevNo]; return y2 })
        setMesaj({
          gorevNo: g.gorevNo,
          tur: y.status === 409 ? 'cakisma' : 'hata',
          metin: mesajYaz(y.status, govde?.kod, govde?.hata, g.etiket),
        })
        yenile()
      } catch {
        if (!canli.current) return
        setIyimser(o => { const y2 = { ...o }; delete y2[g.gorevNo]; return y2 })
        setMesaj({
          gorevNo: g.gorevNo, tur: 'hata',
          metin: 'Sunucuya ulaşılamadı — görev DEĞİŞMEDİ. Bağlantı gelince tekrar deneyin.',
        })
      } finally {
        if (canli.current) setSuren(o => { const y2 = { ...o }; delete y2[g.gorevNo]; return y2 })
      }
    })()
  }, [suren, yenile])

  const mesajiKapat = useCallback(() => setMesaj(null), [])

  return { iyimserDurum, surende, mesaj, mesajiKapat, calistir }
}

/**
 * Sunucu cevabını insan cümlesine çevirir. Sunucunun `hata` metni zaten
 * Türkçe ve açıklayıcı; onu EZMİYORUZ, önüne bağlam ekliyoruz.
 */
function mesajYaz(durum: number, kod: string | undefined, hata: string | undefined, etiket: string): string {
  if (durum === 409 && kod === 'cakisma') {
    return `'${etiket}' uygulanmadı: ${hata ?? 'görev arada değişmiş.'} Liste tazelendi — güncel durumu görüp tekrar deneyin.`
  }
  if (durum === 409) {
    return `'${etiket}' şu an mümkün değil: ${hata ?? 'bu geçişe izin yok.'}`
  }
  if (durum === 403) {
    return `Yetkiniz yok: ${hata ?? 'bu görevi değiştiremezsiniz.'}`
  }
  if (durum === 404) {
    return hata ?? 'Görev bulunamadı — silinmiş ya da başka mağazaya ait olabilir.'
  }
  return `Beklenmeyen hata (${durum}): ${hata ?? 'sunucu sebep bildirmedi.'} Görev DEĞİŞMEDİ.`
}
