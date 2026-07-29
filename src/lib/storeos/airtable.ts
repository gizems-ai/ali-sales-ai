// Kaynak: src/lib/airtable.ts — Store OS için kopyalandı, senkronize değildir.
// ════════════════════════════════════════════════════════════════════════════
//  Store OS Airtable istemcisi. Domain'siz: tablo/alan bilgisi taşımaz,
//  yalnız taşıma katmanıdır. Orijinalden farkları:
//    · tenant/field-mapping YOK (tek base, tek müşteri)
//    · sabit 220 ms uyku yerine token-bucket hız sınırlayıcı
//    · 429/5xx'te üstel geri çekilme + jitter (orijinalde yok — hata kullanıcıya dönüyordu)
//    · maxRecords kırpması YOK (orijinalde sayımlar sessizce 100'de kapanıyordu)
// ════════════════════════════════════════════════════════════════════════════

import { env } from './env'
import type { TabloAdi } from './tipler'

const AT_BASE = 'https://api.airtable.com/v0'

export interface ATKayit<T> {
  id: string
  createdTime: string
  fields: Partial<T>
}

// ─── Hız sınırlayıcı ─────────────────────────────────────────────────────────
// Airtable: base başına ~5 istek/sn. 4'te tutuyoruz (emniyet payı).
// Not: Bu kuyruk lambda örneği başınadır. Vercel'de eşzamanlı örnekler ortak
// bütçeyi paylaşmaz — bu yüzden geri çekilme mantığı da şart, tek başına yetmez.

const SANIYEDE_ISTEK = 4
const ARALIK_MS = Math.ceil(1000 / SANIYEDE_ISTEK)
let sonIstek = 0
let kuyruk: Promise<unknown> = Promise.resolve()

function bekle(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms))
}

async function sirala<T>(is: () => Promise<T>): Promise<T> {
  const calistir = async (): Promise<T> => {
    const gecen = Date.now() - sonIstek
    if (gecen < ARALIK_MS) await bekle(ARALIK_MS - gecen)
    sonIstek = Date.now()
    return is()
  }
  const sonuc = kuyruk.then(calistir, calistir)
  kuyruk = sonuc.then(() => undefined, () => undefined)
  return sonuc
}

// ─── Temel istek ─────────────────────────────────────────────────────────────

const MAX_DENEME = 4

export class AirtableHatasi extends Error {
  constructor(readonly durum: number, readonly govde: string) {
    super(`Airtable ${durum}: ${govde.slice(0, 200)}`)
    this.name = 'AirtableHatasi'
  }
}

async function istek<T>(
  tablo: TabloAdi,
  init: RequestInit & { arama?: URLSearchParams; yol?: string },
): Promise<T> {
  const { arama, yol = '', ...rest } = init
  const url = `${AT_BASE}/${env.airtableBaseId}/${encodeURIComponent(tablo)}${yol}` +
              (arama && [...arama.keys()].length ? `?${arama}` : '')

  let sonHata: AirtableHatasi | null = null

  for (let deneme = 0; deneme < MAX_DENEME; deneme++) {
    if (deneme > 0) {
      // üstel geri çekilme + jitter. Jitter deterministik değil ama KARAR
      // yolunda değil (madde 5'teki "Math.random kullanma" kuralı kural
      // motoru içindir); yine de sabit tabanlı tutuyoruz.
      const taban = 250 * 2 ** (deneme - 1)
      await bekle(taban + (deneme * 37) % 120)
    }

    const r = await sirala(() => fetch(url, {
      ...rest,
      headers: {
        Authorization: `Bearer ${env.airtableApiKey}`,
        'Content-Type': 'application/json',
        ...(rest.headers ?? {}),
      },
      cache: 'no-store',
    }))

    if (r.ok) return r.json() as Promise<T>

    const govde = await r.text().catch(() => '')
    sonHata = new AirtableHatasi(r.status, govde)

    // 429 ve 5xx yeniden denenir; 4xx (403/404/422) denenmez.
    if (r.status !== 429 && r.status < 500) throw sonHata
  }

  throw sonHata ?? new AirtableHatasi(0, 'bilinmeyen')
}

// ─── Okuma ───────────────────────────────────────────────────────────────────

export interface ListeSecenek {
  formul?: string
  alanlar?: string[]
  sirala?: { alan: string; yon?: 'asc' | 'desc' }[]
  limit?: number          // toplam kayıt tavanı; verilmezse TÜMÜ çekilir
  sayfaBoyu?: number      // Airtable max 100
}

/** Tüm sayfaları dolaşır. Sessiz kırpma YOK — limit verilmediyse hepsi gelir. */
export async function listele<T>(tablo: TabloAdi, s: ListeSecenek = {}): Promise<ATKayit<T>[]> {
  const toplam: ATKayit<T>[] = []
  let offset: string | undefined

  do {
    const q = new URLSearchParams()
    q.set('pageSize', String(Math.min(s.sayfaBoyu ?? 100, 100)))
    if (s.formul) q.set('filterByFormula', s.formul)
    if (offset) q.set('offset', offset)
    s.alanlar?.forEach(a => q.append('fields[]', a))
    s.sirala?.forEach((o, i) => {
      q.set(`sort[${i}][field]`, o.alan)
      q.set(`sort[${i}][direction]`, o.yon ?? 'asc')
    })

    const sayfa = await istek<{ records: ATKayit<T>[]; offset?: string }>(tablo, { arama: q })
    toplam.push(...sayfa.records)
    offset = sayfa.offset

    if (s.limit && toplam.length >= s.limit) return toplam.slice(0, s.limit)
  } while (offset)

  return toplam
}

export async function tekil<T>(tablo: TabloAdi, formul: string): Promise<ATKayit<T> | null> {
  const r = await listele<T>(tablo, { formul, limit: 1 })
  return r[0] ?? null
}

// ─── Yazma ───────────────────────────────────────────────────────────────────

/** Airtable tek istekte en fazla 10 kayıt kabul eder. */
export async function olustur<T>(tablo: TabloAdi, kayitlar: Partial<T>[]): Promise<ATKayit<T>[]> {
  const cikti: ATKayit<T>[] = []
  for (let i = 0; i < kayitlar.length; i += 10) {
    const dilim = kayitlar.slice(i, i + 10)
    const y = await istek<{ records: ATKayit<T>[] }>(tablo, {
      method: 'POST',
      body: JSON.stringify({ records: dilim.map(fields => ({ fields })), typecast: true }),
    })
    cikti.push(...y.records)
  }
  return cikti
}

export async function guncelle<T>(
  tablo: TabloAdi,
  kayitlar: { id: string; fields: Partial<T> }[],
): Promise<ATKayit<T>[]> {
  const cikti: ATKayit<T>[] = []
  for (let i = 0; i < kayitlar.length; i += 10) {
    const y = await istek<{ records: ATKayit<T>[] }>(tablo, {
      method: 'PATCH',
      body: JSON.stringify({ records: kayitlar.slice(i, i + 10), typecast: true }),
    })
    cikti.push(...y.records)
  }
  return cikti
}

/** Airtable formül string'i için güvenli tırnaklama. */
export function alintila(deger: string): string {
  return `'${deger.split('\\').join('\\\\').split("'").join("\\'")}'`
}
