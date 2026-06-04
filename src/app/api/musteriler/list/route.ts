import { type NextRequest } from 'next/server'
import { getMusterilerIzni, buildMusterilerFormula } from '@/lib/musteriler-izin'
import { getFirmalarSayfasi } from '@/lib/airtable'
import { getTenantConfigFromRequest } from '@/lib/yetki'

export async function GET(req: NextRequest) {
  const [izin, cfg] = await Promise.all([
    getMusterilerIzni(),
    getTenantConfigFromRequest(),
  ])
  if (izin.tip === 'yok') {
    return Response.json({ error: 'Yetkisiz' }, { status: 403 })
  }
  if (!cfg) return Response.json({ error: 'Tenant bulunamıyor' }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const branRaw = sp.get('brans')
  const brans = (branRaw === 'saglik' || branRaw === 'elementer' || branRaw === 'acibadem' || branRaw === 'crosssell')
    ? branRaw : undefined
  const formula = buildMusterilerFormula(izin, {
    sektor:   sp.get('sektor')  ?? undefined,
    asama:    sp.get('asama')   ?? undefined,
    temsilci: sp.get('temsilci') ?? undefined,
    oncelik:  sp.get('oncelik') ?? undefined,
    durum:    sp.get('durum')   ?? undefined,
    vade:     sp.get('vade')    ?? undefined,
    bugun:    sp.get('bugun') === 'true',
    q:        sp.get('q')       ?? undefined,
    brans,
  }, cfg)

  const offset = sp.get('offset') ?? undefined

  try {
    const data = await getFirmalarSayfasi(formula, offset, 0, cfg)
    return Response.json(data)
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 120) : 'Hata'
    return Response.json({ error: msg }, { status: 502 })
  }
}
