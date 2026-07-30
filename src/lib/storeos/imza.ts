// ════════════════════════════════════════════════════════════════════════════
//  Store OS — HMAC-SHA256 istek imzası (partner → /api/storeos/olay)
//
//  Sözleşme `X-StoreOS-Signature` başlığında HMAC-SHA256 taahhüt ediyor.
//  Bu dosya İKİ biçimi de kabul eder:
//
//    1) t=<unix_sn>,v1=<hex>      ← TERCİH EDİLEN. Zaman damgası imzaya dahil,
//                                    replay penceresi uygulanabilir.
//    2) <hex>  |  sha256=<hex>    ← GERİYE UYUM. Yalnız gövde imzalanır.
//                                    Replay koruması YOK (aynı gövde sonsuza
//                                    dek geçerli imzayla tekrar gönderilebilir).
//                                    Idempotency bunu zararsızlaştırır ama
//                                    kriptografik koruma değildir.
//
//  Biçim 1 ilan edilen sözleşmeyi BOZMAZ (başlık adı ve algoritma aynı), sadece
//  içeriğini zenginleştirir. Gökhan'a giden dokümana eklenmesi gerekiyor —
//  Gün 2 raporunda soru olarak duruyor.
//
//  İmzalanan metin:
//    biçim 1 → `${zamanDamgasi}.${hamGovde}`
//    biçim 2 → `${hamGovde}`
//  HAM GÖVDE imzalanır — JSON.parse/stringify round-trip'i imzayı bozar.
// ════════════════════════════════════════════════════════════════════════════

import { createHmac, timingSafeEqual } from 'node:crypto'

/** Zaman damgası toleransı. Dışında kalan istek reddedilir. */
export const VARSAYILAN_TOLERANS_SN = 300

export interface ImzaDogrulamaSonucu {
  gecerli: boolean
  /** Reddedildiyse partnere dönecek sebep. */
  sebep?: string
  /** Kullanılan biçim — denetim kaydına yazılır. */
  bicim?: 'zaman-damgali' | 'ham'
}

function hmac(sir: string, metin: string): string {
  return createHmac('sha256', sir).update(metin, 'utf8').digest('hex')
}

/** Uzunluktan sızıntı olmadan sabit zamanlı hex karşılaştırma. */
function esitMi(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  if (ab.length !== bb.length) {
    // timingSafeEqual farklı uzunlukta fırlatır. Uzunluk zaten gizli değil
    // (hex uzunluğu sabit), yine de erken dönüşü tek noktada tutuyoruz.
    return false
  }
  return timingSafeEqual(ab, bb)
}

/**
 * İmza üretir. Simülatör ve testler bunu kullanır; partner kendi tarafında
 * aynı algoritmayı uygular.
 * @param zamanDamgasiSn  verilmezse biçim 2 (ham) üretilir.
 */
export function imzaUret(hamGovde: string, sir: string, zamanDamgasiSn?: number): string {
  if (zamanDamgasiSn === undefined) return hmac(sir, hamGovde)
  const t = Math.floor(zamanDamgasiSn)
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
  /** Ham biçim (zaman damgasız imza) kabul edilsin mi? */
  hamBicimeIzinVer?: boolean
}

export function imzaDogrula(g: ImzaDogrulaGirdi): ImzaDogrulamaSonucu {
  const tolerans = g.toleransSn ?? VARSAYILAN_TOLERANS_SN
  const hamIzin = g.hamBicimeIzinVer ?? true

  if (!g.sir) {
    // Yapılandırma hatası — partnerin suçu değil. Çağıran bunu 500'e çevirir.
    return { gecerli: false, sebep: 'Sunucuda imza sırrı yapılandırılmamış.' }
  }
  if (!g.baslik || g.baslik.trim() === '') {
    return { gecerli: false, sebep: 'X-StoreOS-Signature başlığı eksik.' }
  }

  const baslik = g.baslik.trim()
  const zd = zamanDamgaliAyristir(baslik)

  if (zd) {
    const fark = Math.abs(g.simdiSn - zd.t)
    if (fark > tolerans) {
      return {
        gecerli: false,
        bicim: 'zaman-damgali',
        sebep: `İmza zaman damgası tolerans dışı (${fark} sn, sınır ${tolerans} sn). Sunucu saatinizi kontrol edin.`,
      }
    }
    const beklenen = hmac(g.sir, `${zd.t}.${g.hamGovde}`)
    if (!esitMi(beklenen, zd.v1.toLowerCase())) {
      return { gecerli: false, bicim: 'zaman-damgali', sebep: 'İmza doğrulanamadı.' }
    }
    return { gecerli: true, bicim: 'zaman-damgali' }
  }

  // Ham biçim
  if (!hamIzin) {
    return { gecerli: false, sebep: "İmza biçimi 't=<unix>,v1=<hex>' olmalı." }
  }
  const hex = baslik.startsWith('sha256=') ? baslik.slice(7) : baslik
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    return { gecerli: false, sebep: "İmza biçimi tanınmadı. Beklenen: 't=<unix>,v1=<hex>' veya 64 karakterlik hex." }
  }
  if (!esitMi(hmac(g.sir, g.hamGovde), hex.toLowerCase())) {
    return { gecerli: false, bicim: 'ham', sebep: 'İmza doğrulanamadı.' }
  }
  return { gecerli: true, bicim: 'ham' }
}
