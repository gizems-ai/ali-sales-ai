import { unstable_cache } from 'next/cache'
import { getMusterilerIzni } from '@/lib/musteriler-izin'
import { getTenantConfigFromRequest } from '@/lib/yetki'
import { atTableUrl } from '@/lib/tenants'

export const dynamic = 'force-dynamic'

const DURUMLAR = ['Ulaşıldı', 'Cevap Yok', 'Geri Aranacak'] as const

export interface TemsilciAktivite {
  ad: string
  slug: string
  renk: string
  toplam: number
  kirilim: Record<string, number>
}

async function fetchBugunAktiviteRaw(
  aktivitelerUrl: string,
  tarih: string,
  temsilciFilter: string | null,
  token: string,
): Promise<Record<string, Record<string, number>>> {
  const formulaParts = [`DATESTR({Tarih})='${tarih}'`]
  if (temsilciFilter) formulaParts.push(`{Temsilci}='${temsilciFilter}'`)
  const formula = formulaParts.length > 1
    ? `AND(${formulaParts.join(',')})`
    : formulaParts[0]

  const result: Record<string, Record<string, number>> = {}
  let offset: string | undefined

  do {
    const qs = new URLSearchParams()
    qs.set('filterByFormula', formula)
    qs.append('fields[]', 'Temsilci')
    qs.append('fields[]', 'Arama Sonucu')
    qs.set('pageSize', '100')
    if (offset) qs.set('offset', offset)

    const res = await fetch(`${aktivitelerUrl}?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`Airtable ${res.status}`)

    const data = await res.json()
    for (const r of data.records ?? []) {
      const temsilci = (r.fields['Temsilci'] as string | undefined) ?? '?'
      const durum    = (r.fields['Arama Sonucu'] as string | undefined) ?? '?'
      if (!result[temsilci]) result[temsilci] = {}
      result[temsilci][durum] = (result[temsilci][durum] ?? 0) + 1
    }
    offset = data.offset
  } while (offset)

  return result
}

const fetchCached = unstable_cache(
  fetchBugunAktiviteRaw,
  ['bugun-aktivite'],
  { revalidate: 60 },
)

export async function GET() {
  const [izin, cfg] = await Promise.all([
    getMusterilerIzni(),
    getTenantConfigFromRequest(),
  ])
  if (izin.tip === 'yok') return Response.json({ error: 'Yetkisiz' }, { status: 403 })
  if (!cfg) return Response.json({ error: 'Tenant bulunamıyor' }, { status: 403 })

  const token = process.env.AIRTABLE_TOKEN
  if (!token) return Response.json({ error: 'Token eksik' }, { status: 500 })

  const tarih = new Date().toLocaleDateString('sv-SE')
  const temsilciFilter = izin.tip === 'temsilci' ? izin.temsilci : null
  const aktivitelerUrl = atTableUrl(cfg, 'aktiviteler')

  let raw: Record<string, Record<string, number>>
  try {
    raw = await fetchCached(aktivitelerUrl, tarih, temsilciFilter, token)
  } catch {
    return Response.json({ error: 'Aktivite verisi alınamadı' }, { status: 502 })
  }

  const visibleTemsilciler = temsilciFilter
    ? cfg.temsilciler.filter(t => t.ad === temsilciFilter)
    : cfg.temsilciler

  const temsilciler: TemsilciAktivite[] = visibleTemsilciler.map(t => {
    const loglar = raw[t.ad] ?? {}
    const kirilim: Record<string, number> = {}
    for (const d of DURUMLAR) kirilim[d] = loglar[d] ?? 0
    const toplam = Object.values(loglar).reduce((s, n) => s + n, 0)
    return { ad: t.ad, slug: t.slug, renk: t.renk, toplam, kirilim }
  })

  return Response.json({ tarih, temsilciler })
}
