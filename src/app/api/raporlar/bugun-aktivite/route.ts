import { getMusterilerIzni } from '@/lib/musteriler-izin'
import { getTenantConfigFromRequest } from '@/lib/yetki'
import { atTableUrl } from '@/lib/tenants'

export const dynamic = 'force-dynamic'

const DURUMLAR = ['Ulaşıldı', 'Cevap Yok', 'Geri Aranacak'] as const

function getWeekBounds(offsetWeeks = 0): { weekStart: string; tarih: string } {
  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' })
  const today = new Date(todayStr + 'T00:00:00')
  const day = today.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const mon = new Date(today)
  mon.setDate(today.getDate() + diffToMonday + offsetWeeks * 7)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const iso = (d: Date) => d.toLocaleDateString('sv-SE')
  return { weekStart: iso(mon), tarih: offsetWeeks === 0 ? todayStr : iso(sun) }
}

// Linked record veya plain string Firma ID'yi string'e çevir
function extractFirmaId(raw: unknown): string | undefined {
  if (Array.isArray(raw)) return raw[0] as string | undefined
  if (typeof raw === 'string') return raw
  return undefined
}

export interface TemsilciAktivite {
  ad: string
  slug: string
  renk: string
  toplam: number
  kirilim: Record<string, number>
  randevu: number
  kazanim: number
  ulasma_yuzde: number | null
  donusum_yuzde: number | null
}

type AktiviteRaw = {
  durumlar: Record<string, number>
  ulasildi_ids: string[]
}

async function fetchBugunAktiviteRaw(
  aktivitelerUrl: string,
  firmalarUrl: string,
  weekStart: string,
  tarih: string,
  temsilciFilter: string | null,
  token: string,
): Promise<Record<string, AktiviteRaw>> {
  const formulaParts: string[] = [
    `DATESTR({Tarih})>='${weekStart}'`,
    `DATESTR({Tarih})<='${tarih}'`,
  ]
  if (temsilciFilter) formulaParts.push(`{Temsilci}='${temsilciFilter}'`)
  const formula = `AND(${formulaParts.join(',')})`

  const raw: Record<string, AktiviteRaw> = {}
  let offset: string | undefined

  // 1. Aktivite log'ları
  do {
    const qs = new URLSearchParams()
    qs.set('filterByFormula', formula)
    qs.append('fields[]', 'Temsilci')
    qs.append('fields[]', 'Arama Sonucu')
    qs.append('fields[]', 'Firma ID')
    qs.set('pageSize', '100')
    if (offset) qs.set('offset', offset)

    const res = await fetch(`${aktivitelerUrl}?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`Airtable log ${res.status}`)

    const data = await res.json()
    for (const r of data.records ?? []) {
      const temsilci = (r.fields['Temsilci'] as string | undefined) ?? '?'
      const durum    = (r.fields['Arama Sonucu'] as string | undefined) ?? '?'
      const firmaId  = extractFirmaId(r.fields['Firma ID'])
      if (!raw[temsilci]) raw[temsilci] = { durumlar: {}, ulasildi_ids: [] }
      raw[temsilci].durumlar[durum] = (raw[temsilci].durumlar[durum] ?? 0) + 1
      if (durum === 'Ulaşıldı' && firmaId) raw[temsilci].ulasildi_ids.push(firmaId)
    }
    offset = data.offset
  } while (offset)

  // 2. Her temsilci için Randevu sayısı — link join (unique firm bazında)
  for (const temsilci of Object.keys(raw)) {
    const uniqueIds = [...new Set(raw[temsilci].ulasildi_ids)]
    const entry = raw[temsilci] as AktiviteRaw & { _randevu?: number; _unique_ulasildi?: number }
    entry._unique_ulasildi = uniqueIds.length
    if (!uniqueIds.length) continue

    const orFormula = 'OR(' + uniqueIds.map(id => `RECORD_ID()='${id}'`).join(',') + ')'
    const qs2 = new URLSearchParams()
    qs2.set('filterByFormula', orFormula)
    qs2.append('fields[]', 'Pipeline Aşaması')
    qs2.set('pageSize', '100')

    const res2 = await fetch(`${firmalarUrl}?${qs2}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res2.ok) continue

    const data2 = await res2.json()
    const randevu = (data2.records ?? []).filter(
      (fr: { fields: Record<string, unknown> }) =>
        fr.fields['Pipeline Aşaması'] === 'Randevu',
    ).length
    const kazanim = (data2.records ?? []).filter(
      (fr: { fields: Record<string, unknown> }) =>
        fr.fields['Pipeline Aşaması'] === 'Kazanıldı',
    ).length
    entry._randevu = randevu
    ;(entry as AktiviteRaw & { _kazanim?: number })._kazanim = kazanim
  }

  return raw
}


export async function GET(req: Request) {
  const [izin, cfg] = await Promise.all([
    getMusterilerIzni(),
    getTenantConfigFromRequest(),
  ])
  if (izin.tip === 'yok') return Response.json({ error: 'Yetkisiz' }, { status: 403 })
  if (!cfg) return Response.json({ error: 'Tenant bulunamıyor' }, { status: 403 })

  const token = process.env.AIRTABLE_TOKEN
  if (!token) return Response.json({ error: 'Token eksik' }, { status: 500 })

  const url = new URL(req.url)
  const weekOffset = Math.max(-52, Math.min(0, parseInt(url.searchParams.get('week') ?? '0', 10) || 0))
  const { weekStart, tarih } = getWeekBounds(weekOffset)
  const temsilciFilter = izin.tip === 'temsilci' ? izin.temsilci : null
  const aktivitelerUrl = atTableUrl(cfg, 'aktiviteler')
  const firmalarUrl    = atTableUrl(cfg, 'firmalar')

  let raw: Record<string, AktiviteRaw>
  try {
    raw = await fetchBugunAktiviteRaw(aktivitelerUrl, firmalarUrl, weekStart, tarih, temsilciFilter, token)
  } catch {
    return Response.json({ error: 'Aktivite verisi alınamadı' }, { status: 502 })
  }

  const visibleTemsilciler = temsilciFilter
    ? cfg.temsilciler.filter(t => t.ad === temsilciFilter)
    : cfg.temsilciler

  const temsilciler: TemsilciAktivite[] = visibleTemsilciler.map(t => {
    const entry = raw[t.ad] as (AktiviteRaw & { _randevu?: number; _kazanim?: number; _unique_ulasildi?: number }) | undefined
    const durumlar = entry?.durumlar ?? {}
    const kirilim: Record<string, number> = {}
    for (const d of DURUMLAR) kirilim[d] = durumlar[d] ?? 0

    const toplam          = Object.values(durumlar).reduce((s, n) => s + n, 0)
    const ulasildi        = durumlar['Ulaşıldı'] ?? 0
    const uniqueUlasildi  = entry?._unique_ulasildi ?? 0
    const randevu         = entry?._randevu ?? 0
    const kazanim         = entry?._kazanim ?? 0

    const ulasma_yuzde  = toplam         > 0 ? Math.round(ulasildi / toplam         * 100) : null
    const donusum_yuzde = uniqueUlasildi > 0 ? Math.round(randevu  / uniqueUlasildi * 100) : null

    return { ad: t.ad, slug: t.slug, renk: t.renk, toplam, kirilim, randevu, kazanim, ulasma_yuzde, donusum_yuzde }
  })

  return Response.json({ tarih, weekStart, temsilciler }, {
    headers: { 'Cache-Control': 'no-store, must-revalidate' },
  })
}
