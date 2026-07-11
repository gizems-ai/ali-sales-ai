// ════════════════════════════════════════════════════════════════════════════
//  Ali Sohbet — Niyet sınıflandırma + filtre çıkarımı (deterministik, SAF)
//  Tahmin yok: kural tabanlı. 4 sınıfa oturmayan soru → kapsam_disi.
// ════════════════════════════════════════════════════════════════════════════

import type { Intent, StokFiltre } from './types'
import { PROJELER } from '../stok-adapter'
import { CUSTOMERS } from '../ali-zeka'

// Türkçe normalize: küçült + aksan sadeleştir (eşleştirmeyi toleranslı yap)
export function norm(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/İ/g, 'i')
    .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ö/g, 'o').replace(/ç/g, 'c')
    .trim()
}

// ── Proje adı çıkarımı ("port royal" iki kelime → normalize sonrası ara) ───────
export function projeCikar(soru: string): string | undefined {
  const n = norm(soru)
  for (const p of PROJELER) {
    if (n.includes(norm(p))) return p
  }
  return undefined
}

// ── Oda tipi çıkarımı: 1+0 · 1+1 · 2+1 · 3+1 · 3.5+1 · 4+1 ─────────────────────
export function tipCikar(soru: string): string | undefined {
  const m = soru.match(/(\d(?:[.,]\d)?)\s*\+\s*(\d)/)
  if (!m) return undefined
  return `${m[1].replace(',', '.')}+${m[2]}`
}

// ── Grup çıkarımı: "d grubu" · "a grup" · "zor satilan"→D · "avantajli"→D ──────
export function grupCikar(soru: string): string | undefined {
  const n = norm(soru)
  const m = n.match(/\b([abcd])\s*grub/)
  if (m) return m[1].toUpperCase()
  if (/zor satil|yaslanan|eriyen|elde kalan/.test(n)) return 'D'
  return undefined
}

// ── Fiyat üst/alt sınır (USD): "500 bin dolar alti" · "1 milyon usd ustu" ──────
export function fiyatCikar(soru: string): { max?: number; min?: number } {
  const n = norm(soru)
  const say = (m: RegExpMatchArray | null): number | undefined => {
    if (!m) return undefined
    let v = parseFloat(m[1].replace(',', '.'))
    if (/milyon/.test(m[0])) v *= 1_000_000
    else if (/bin/.test(m[0])) v *= 1_000
    return v
  }
  // yalnız USD/dolar bağlamında değerlendir (TL fiyat sorusu Faz 2)
  if (!/dolar|usd|\$/.test(n)) return {}
  const alt = say(n.match(/(\d+(?:[.,]\d+)?)\s*(?:milyon|bin)?\s*(?:dolar|usd|\$)[^]*?(?:alti|altinda|dusuk|max|en fazla)/))
  const ust = say(n.match(/(\d+(?:[.,]\d+)?)\s*(?:milyon|bin)?\s*(?:dolar|usd|\$)[^]*?(?:ustu|ustunde|uzeri|yukari|min|en az)/))
  return { max: alt, min: ust }
}

// ── Müşteri adı eşleştirme (fixture) → müşteri id ─────────────────────────────
export function musteriCikar(soru: string): string | undefined {
  const n = norm(soru)
  for (const c of CUSTOMERS) {
    // ad birden çok kelime olabilir ("Ahmet & Selin Yılmaz") — ilk özel ada da bak
    const parcalar = c.ad.split(/[&\s]+/).map(norm).filter(p => p.length >= 3)
    if (parcalar.some(p => n.includes(p))) return c.id
  }
  return undefined
}

// Eşleştirme fiilleri: müşteriye ünite bağlama isteği
const ESLESME_FIIL = /uyar|uygun|onerir|oneri|onersem|eslesir|eslestir|hangi daire|hangi unite|ne gosterir|hangi ev/
// Müşteri/portföy bağlamı
const MUSTERI_KELIME = /musteri|portfoy|persona|alici|lead|adayi|yatirimci|oturumcu|vatandaslik|firsatci|kararsiz/
// Kampanya bağlamı
const KAMPANYA_KELIME = /kampanya|yayinda olan kampanya|hangi kampanya|teklif paketi/
// Stok bağlamı
const STOK_KELIME = /stok|daire|unite|envanter|satilik|satilabilir|kac tane|listele|hangi.*var|fiyat|blok|oda/

export interface Siniflandirma {
  intent: Intent
  filtre: StokFiltre
  musteriId?: string
}

// ── Ana sınıflandırıcı — öncelik sırası önemli ────────────────────────────────
export function siniflandir(soru: string): Siniflandirma {
  const n = norm(soru)
  const proje = projeCikar(soru)
  const tip = tipCikar(soru)
  const grup = grupCikar(soru)
  const { max, min } = fiyatCikar(soru)
  const musteriId = musteriCikar(soru)

  const filtre: StokFiltre = {
    proje, tip, grup,
    fiyatUSDMax: max, fiyatUSDMin: min,
    sadeceSatilabilir: true,
  }

  // 1) Eşleştirme: (bir müşteri adı VE eşleştirme fiili) → eslestirme
  if (musteriId && (ESLESME_FIIL.test(n) || MUSTERI_KELIME.test(n))) {
    return { intent: 'eslestirme', filtre, musteriId }
  }
  // 2) Eşleştirme fiili var ama müşteri belirsiz → müşteri listesine düş
  if (ESLESME_FIIL.test(n) && MUSTERI_KELIME.test(n)) {
    return { intent: 'musteri', filtre }
  }
  // 3) Kampanya
  if (KAMPANYA_KELIME.test(n)) {
    return { intent: 'kampanya', filtre }
  }
  // 4) Müşteri (ad geçiyor ama eşleştirme fiili yok, ya da müşteri kelimesi)
  if (musteriId || MUSTERI_KELIME.test(n)) {
    return { intent: 'musteri', filtre, musteriId }
  }
  // 5) Stok (proje/tip/grup/fiyat sinyali veya stok kelimesi)
  if (proje || tip || grup || max || min || STOK_KELIME.test(n)) {
    return { intent: 'stok', filtre }
  }
  // 6) Hiçbirine oturmadı
  return { intent: 'kapsam_disi', filtre }
}
