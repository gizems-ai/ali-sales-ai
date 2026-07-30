// ════════════════════════════════════════════════════════════════════════════
//  Store OS — KURAL MOTORU
//
//  İki katı kural:
//   1) SAF DEĞERLENDİRME. Bu dosya I/O yapmaz, tarih üretmez, kayıt yazmaz.
//      Girdi: olay + kural listesi. Çıktı: karar listesi. Yan etki yok.
//      Test edilebilirliği ve "aynı olay hep aynı kararı verir" garantisi bundan gelir.
//   2) `Math.random` YOK. Bu repoda karar yollarında rastgelelik yasak
//      (bkz. src/lib/stok-sinyal.ts aynı kuralı uyguluyor). Aynı girdi → aynı çıktı.
//
//  AÇIKLANABİLİRLİK: her karar hangi kuralın, hangi koşulunun, hangi değerle
//  sağlandığını taşır. Mevcut panelin kampanya.ts'teki güven-skoru kırılımı
//  çizgisi burada da korunuyor — jüri "neden bu görev çıktı?" diye sorduğunda
//  cevap veriden okunur, anlatımdan değil.
// ════════════════════════════════════════════════════════════════════════════

import { olaydanOku } from './gorev'
import type { VisionEvent } from './olay-sozlesmesi'
import type { Kural } from './tipler'

// ─── Koşul dili ──────────────────────────────────────────────────────────────

export const OPERATORLER = [
  '=', '!=', '>', '>=', '<', '<=',
  'icerir', 'baslar', 'listede', 'var', 'yok',
] as const
export type Operator = (typeof OPERATORLER)[number]

export interface Kosul {
  /** Nokta yolu: 'metadata.queueLength' · 'severity' · 'confidence' */
  alan: string
  operator: Operator
  /** 'var' / 'yok' için kullanılmaz. */
  deger?: unknown
}

export interface KosulSonucu {
  kosul: Kosul
  saglandi: boolean
  /** Olayda bulunan gerçek değer — gerekçede gösterilir. */
  gercekDeger: unknown
  /** Sağlanmadıysa neden. */
  aciklama: string
}

export interface KuralKarari {
  kuralAdi: string
  eslesti: boolean
  /** Tip eşleşmedi mi, koşul mu tutmadı — ayırt edilebilsin. */
  neden: 'tip_eslesmedi' | 'kural_pasif' | 'kosul_saglanmadi' | 'eslesti'
  kosulSonuclari: KosulSonucu[]
  /** Denetim kaydına ve göreve yazılan insan-okur gerekçe. */
  gerekceMetni: string
}

// ─── Koşul ayrıştırma ────────────────────────────────────────────────────────

export interface KosulAyristirmaSonucu {
  kosullar: Kosul[]
  hata?: string
}

/**
 * Kurallar Airtable'da yaşıyor, koşullar JSON metni. Bozuk JSON motorun
 * tamamını düşürmemeli: hata döndürülür, kural eşleşmez, sebep gerekçede yazar.
 */
export function kosullariAyristir(ham: string | undefined | null): KosulAyristirmaSonucu {
  if (!ham || ham.trim() === '') return { kosullar: [] }
  let x: unknown
  try {
    x = JSON.parse(ham)
  } catch {
    return { kosullar: [], hata: 'Kosullar JSON ayrıştırılamadı' }
  }
  if (!Array.isArray(x)) return { kosullar: [], hata: 'Kosullar JSON bir dizi olmalı' }

  const kosullar: Kosul[] = []
  for (const [i, ogeHam] of x.entries()) {
    if (typeof ogeHam !== 'object' || ogeHam === null) {
      return { kosullar: [], hata: `Koşul[${i}] nesne değil` }
    }
    const oge = ogeHam as Record<string, unknown>
    const alan = oge.alan
    const operator = oge.operator
    if (typeof alan !== 'string' || !alan) return { kosullar: [], hata: `Koşul[${i}] 'alan' eksik` }
    if (typeof operator !== 'string' || !(OPERATORLER as readonly string[]).includes(operator)) {
      return { kosullar: [], hata: `Koşul[${i}] operatörü tanınmadı: '${String(operator)}'` }
    }
    kosullar.push({ alan, operator: operator as Operator, deger: oge.deger })
  }
  return { kosullar }
}

// ─── Tek koşul değerlendirme ─────────────────────────────────────────────────

function sayiyaCevir(x: unknown): number | null {
  if (typeof x === 'number') return Number.isFinite(x) ? x : null
  if (typeof x === 'string' && x.trim() !== '') {
    const n = Number(x)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export function kosuluDegerlendir(kosul: Kosul, olay: VisionEvent): KosulSonucu {
  const gercek = olaydanOku(olay, kosul.alan)
  const yok = gercek === undefined || gercek === null

  const sonuc = (saglandi: boolean, aciklama: string): KosulSonucu =>
    ({ kosul, saglandi, gercekDeger: gercek, aciklama })

  switch (kosul.operator) {
    case 'var':
      return sonuc(!yok, yok ? `${kosul.alan} yok` : `${kosul.alan} mevcut`)
    case 'yok':
      return sonuc(yok, yok ? `${kosul.alan} yok` : `${kosul.alan} mevcut (beklenen: yok)`)
  }

  if (yok) return sonuc(false, `${kosul.alan} olayda yok`)

  switch (kosul.operator) {
    case '=':
      return sonuc(gercek === kosul.deger, `${kosul.alan}=${JSON.stringify(gercek)} ${gercek === kosul.deger ? '=' : '≠'} ${JSON.stringify(kosul.deger)}`)
    case '!=':
      return sonuc(gercek !== kosul.deger, `${kosul.alan}=${JSON.stringify(gercek)} vs ${JSON.stringify(kosul.deger)}`)

    case '>': case '>=': case '<': case '<=': {
      const a = sayiyaCevir(gercek)
      const b = sayiyaCevir(kosul.deger)
      if (a === null || b === null) {
        return sonuc(false, `${kosul.alan} sayısal karşılaştırmaya uygun değil (${JSON.stringify(gercek)} ${kosul.operator} ${JSON.stringify(kosul.deger)})`)
      }
      const s = kosul.operator === '>' ? a > b
              : kosul.operator === '>=' ? a >= b
              : kosul.operator === '<' ? a < b
              : a <= b
      return sonuc(s, `${kosul.alan}=${a} ${kosul.operator} ${b}`)
    }

    case 'icerir': {
      const h = String(gercek).toLowerCase()
      const i = String(kosul.deger ?? '').toLowerCase()
      return sonuc(h.includes(i), `${kosul.alan}='${gercek}' içerir '${kosul.deger}'`)
    }
    case 'baslar': {
      const h = String(gercek).toLowerCase()
      const i = String(kosul.deger ?? '').toLowerCase()
      return sonuc(h.startsWith(i), `${kosul.alan}='${gercek}' başlar '${kosul.deger}'`)
    }
    case 'listede': {
      const liste = Array.isArray(kosul.deger) ? kosul.deger : []
      return sonuc(liste.includes(gercek), `${kosul.alan}=${JSON.stringify(gercek)} ∈ ${JSON.stringify(liste)}`)
    }
    default:
      return sonuc(false, `Tanınmayan operatör: ${String(kosul.operator)}`)
  }
}

// ─── Kural değerlendirme ─────────────────────────────────────────────────────

/** Tüm koşullar AND'lenir. Boş koşul listesi = tip eşleşmesi yeterli. */
export function kuraliDegerlendir(kural: Kural, olay: VisionEvent): KuralKarari {
  const ad = kural['Kural Adi']

  if (!kural['Aktif']) {
    return { kuralAdi: ad, eslesti: false, neden: 'kural_pasif', kosulSonuclari: [], gerekceMetni: `Kural '${ad}' pasif.` }
  }
  if (kural['Olay Tipi'] !== olay.eventType) {
    return {
      kuralAdi: ad, eslesti: false, neden: 'tip_eslesmedi', kosulSonuclari: [],
      gerekceMetni: `Kural '${ad}' tipi '${kural['Olay Tipi']}', olay tipi '${olay.eventType}'.`,
    }
  }

  const { kosullar, hata } = kosullariAyristir(kural['Kosullar JSON'])
  if (hata) {
    return {
      kuralAdi: ad, eslesti: false, neden: 'kosul_saglanmadi', kosulSonuclari: [],
      gerekceMetni: `Kural '${ad}' değerlendirilemedi: ${hata}. Kural yok sayıldı.`,
    }
  }

  const sonuclar = kosullar.map(k => kosuluDegerlendir(k, olay))
  const hepsiSaglandi = sonuclar.every(s => s.saglandi)

  if (!hepsiSaglandi) {
    const tutmayan = sonuclar.filter(s => !s.saglandi).map(s => s.aciklama)
    return {
      kuralAdi: ad, eslesti: false, neden: 'kosul_saglanmadi', kosulSonuclari: sonuclar,
      gerekceMetni: `Kural '${ad}' eşleşmedi — sağlanmayan koşul: ${tutmayan.join(' ; ')}.`,
    }
  }

  const gerekce = sonuclar.length
    ? `Kural '${ad}' eşleşti. Olay tipi '${olay.eventType}'. Sağlanan koşullar: ${sonuclar.map(s => s.aciklama).join(' ; ')}. Güven ${olay.confidence}.`
    : `Kural '${ad}' eşleşti. Olay tipi '${olay.eventType}' (koşulsuz kural). Güven ${olay.confidence}.`

  return { kuralAdi: ad, eslesti: true, neden: 'eslesti', kosulSonuclari: sonuclar, gerekceMetni: gerekce }
}

export interface MotorSonucu {
  /** Eşleşen kurallar — Sira'ya göre artan (küçük sıra önce). */
  eslesenler: { kural: Kural; karar: KuralKarari }[]
  /** Eşleşmeyenler dahil TÜM değerlendirmeler — açıklanabilirlik için. */
  tumKararlar: KuralKarari[]
  /** Panelde/denetimde gösterilecek tek satırlık özet. */
  ozet: string
}

/**
 * SAF. Kural listesini çağıran verir (depodan okumak motorun işi değil).
 */
export function degerlendir(olay: VisionEvent, kurallar: Kural[]): MotorSonucu {
  const sirali = [...kurallar].sort((a, b) => (Number(a['Sira']) || 0) - (Number(b['Sira']) || 0))
  const tumKararlar: KuralKarari[] = []
  const eslesenler: { kural: Kural; karar: KuralKarari }[] = []

  for (const kural of sirali) {
    const karar = kuraliDegerlendir(kural, olay)
    tumKararlar.push(karar)
    if (karar.eslesti) eslesenler.push({ kural, karar })
  }

  const ozet = eslesenler.length
    ? `${eslesenler.length} kural eşleşti: ${eslesenler.map(e => e.kural['Kural Adi']).join(', ')}.`
    : `Hiçbir kural eşleşmedi (${sirali.length} kural değerlendirildi, olay tipi '${olay.eventType}').`

  return { eslesenler, tumKararlar, ozet }
}
