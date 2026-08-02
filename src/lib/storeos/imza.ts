// ════════════════════════════════════════════════════════════════════════════
//  Store OS — HMAC-SHA256 istek imzası (partner → /api/storeos/olay)
//
//  TEK KABUL EDİLEN BİÇİM:
//
//      X-StoreOS-Signature: t=<unix_saniye>,v1=<hex>
//      imzalanan metin    : `${unix_saniye}.${ham_govde}`
//
//  Zaman damgası ±300 sn toleransın dışındaysa istek reddedilir (replay).
//
//  ── DÜZ HEX BİÇİMİ KALDIRILDI (Gün 3) ──────────────────────────────────────
//  Gün 2'de geriye uyum için `<hex>` / `sha256=<hex>` de kabul ediliyordu.
//  KALDIRILDI. Gerekçe: düz hex'te zaman damgası imzaya dahil olmadığı için
//  aynı gövde süresiz geçerli kalıyordu; saldırgan `t=` kısmını atarak eski
//  biçime düşüp replay penceresini KALICI OLARAK bypass edebilirdi. Henüz
//  kimse entegre olmadığı için kırdığımız tek istemci kendi simülatörümüzdü.
//
//  HAM GÖVDE imzalanır — JSON.parse/stringify round-trip'i imzayı bozar.
// ════════════════════════════════════════════════════════════════════════════

import { createHmac, timingSafeEqual } from 'node:crypto'

/** Zaman damgası toleransı (±). Dışında kalan istek reddedilir. */
export const VARSAYILAN_TOLERANS_SN = 300

export interface ImzaDogrulamaSonucu {
  gecerli: boolean
  /** Reddedildiyse partnere dönecek sebep. */
  sebep?: string
  /** Denetim kaydına yazılır. Tek biçim var; alan ileride yeni sürüm için. */
  bicim?: 'zaman-damgali'
}

function hmac(sir: string, metin: string): string {
  return createHmac('sha256', sir).update(metin, 'utf8').digest('hex')
}

/** Uzunluktan sızıntı olmadan sabit zamanlı hex karşılaştırma. */
function esitMi(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  if (ab.length !== bb.length) {
    // timingSafeEqual farklı uzunlukta fırlatır. Hex uzunluğu zaten sabit ve
    // gizli değil; erken dönüşü tek noktada tutuyoruz.
    return false
  }
  return timingSafeEqual(ab, bb)
}

/**
 * İmza üretir. Simülatör ve testler bunu kullanır; partner kendi tarafında
 * aynı algoritmayı uygular.
 * @param zamanDamgasiSn unix saniye. Verilmezse `Date.now()` kullanılır.
 */
export function imzaUret(hamGovde: string, sir: string, zamanDamgasiSn?: number): string {
  const t = Math.floor(zamanDamgasiSn ?? Date.now() / 1000)
  return `t=${t},v1=${hmac(sir, `${t}.${hamGovde}`)}`
}

/** `t=123,v1=abc` → { t: 123, v1: 'abc' }. Tanınmayan biçimde null. */
function zamanDamgaliAyristir(baslik: string): { t: number; v1: string } | null {
  const parcalar = baslik.split(',').map(p => p.trim())
  let t: number | null = null
  let v1: string | null = null
  for (const p of parcalar) {
    const esit = p.indexOf('=')
    if (esit < 0) continue
    const anahtar = p.slice(0, esit)
    const deger = p.slice(esit + 1)
    if (anahtar === 't') {
      const n = Number(deger)
      if (Number.isFinite(n)) t = n
    } else if (anahtar === 'v1') {
      v1 = deger
    }
  }
  if (t === null || v1 === null) return null
  return { t, v1 }
}

export interface ImzaDogrulaGirdi {
  hamGovde: string
  /** `X-StoreOS-Signature` başlığının ham değeri. */
  baslik: string | null | undefined
  sir: string
  /** Şimdi (unix saniye). Test edilebilirlik için parametre. */
  simdiSn: number
  toleransSn?: number
}

const BICIM_METNI = "İmza biçimi 't=<unix_saniye>,v1=<hex>' olmalı."

export function imzaDogrula(g: ImzaDogrulaGirdi): ImzaDogrulamaSonucu {
  const tolerans = g.toleransSn ?? VARSAYILAN_TOLERANS_SN

  if (!g.sir) {
    // Yapılandırma hatası — partnerin suçu değil. Çağıran bunu 500'e çevirir.
    return { gecerli: false, sebep: 'Sunucuda imza sırrı yapılandırılmamış.' }
  }
  if (!g.baslik || g.baslik.trim() === '') {
    return { gecerli: false, sebep: `X-StoreOS-Signature başlığı eksik. ${BICIM_METNI}` }
  }

  const zd = zamanDamgaliAyristir(g.baslik.trim())
  if (!zd) {
    // Düz hex artık BURADA biter — sessizce eski biçime düşmek yok.
    return { gecerli: false, sebep: `İmza biçimi tanınmadı. ${BICIM_METNI}` }
  }

  if (!/^[0-9a-fA-F]{64}$/.test(zd.v1)) {
    return { gecerli: false, bicim: 'zaman-damgali', sebep: 'v1 64 karakterlik hex olmalı (HMAC-SHA256).' }
  }

  const fark = Math.abs(g.simdiSn - zd.t)
  if (fark > tolerans) {
    return {
      gecerli: false,
      bicim: 'zaman-damgali',
      sebep: `İmza zaman damgası tolerans dışı (${fark} sn, sınır ${tolerans} sn). Sunucu saatinizi kontrol edin.`,
    }
  }

  if (!esitMi(hmac(g.sir, `${zd.t}.${g.hamGovde}`), zd.v1.toLowerCase())) {
    return { gecerli: false, bicim: 'zaman-damgali', sebep: 'İmza doğrulanamadı.' }
  }

  return { gecerli: true, bicim: 'zaman-damgali' }
}
