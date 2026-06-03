import { type NextRequest } from 'next/server'
import { getMusterilerIzni, buildMusterilerFormula } from '@/lib/musteriler-izin'
import { getTenantConfigFromRequest } from '@/lib/yetki'
import { atTableUrl } from '@/lib/tenants'

export async function GET(req: NextRequest) {
  const [izin, cfg] = await Promise.all([
    getMusterilerIzni(),
    getTenantConfigFromRequest(),
  ])
  if (izin.tip === 'yok') return Response.json({ error: 'Yetkisiz' }, { status: 403 })
  if (!cfg) return Response.json({ error: 'Tenant bulunamıyor' }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const formula = buildMusterilerFormula(izin, {
    sektor:   sp.get('sektor')   ?? undefined,
    asama:    sp.get('asama')    ?? undefined,
    temsilci: sp.get('temsilci') ?? undefined,
    oncelik:  sp.get('oncelik') ?? undefined,
    durum:    sp.get('durum')    ?? undefined,
    vade:     sp.get('vade')     ?? undefined,
    bugun:    sp.get('bugun') === 'true',
    q:        sp.get('q')        ?? undefined,
  }, cfg)

  const token = process.env.AIRTABLE_TOKEN
  if (!token) return Response.json({ error: 'Token eksik' }, { status: 500 })

  const BASE_URL = atTableUrl(cfg, 'firmalar')

  let total = 0, sicak = 0, bugun = 0
  let pageOffset: string | undefined

  try {
    do {
      const qs = new URLSearchParams()
      qs.set('filterByFormula', formula)
      qs.append('fields[]', 'Sıcaklık Skoru')
      qs.append('fields[]', 'Bugün Aranacak')
      qs.set('pageSize', '100')
      if (pageOffset) qs.set('offset', pageOffset)

      const res = await fetch(`${BASE_URL}?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`Airtable ${res.status}`)

      const data = await res.json()
      for (const r of data.records ?? []) {
        total++
        if ((r.fields['Sıcaklık Skoru'] ?? 0) >= 7) sicak++
        if (r.fields['Bugün Aranacak']) bugun++
      }
      pageOffset = data.offset
    } while (pageOffset)

    return Response.json({ total, sicak, bugun })
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 120) : 'Hata'
    return Response.json({ error: msg }, { status: 502 })
  }
}
