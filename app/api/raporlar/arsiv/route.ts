import { getMusterilerIzni } from '@/lib/musteriler-izin'
import { getTenantConfigFromRequest } from '@/lib/yetki'
import { atTableUrl } from '@/lib/tenants'

const AIRTABLE_MOJIBAKE: Record<string, string> = {
  'Rüya': 'R眉ya',
}

export async function GET() {
  const [izin, cfg] = await Promise.all([
    getMusterilerIzni(),
    getTenantConfigFromRequest(),
  ])
  if (izin.tip === 'yok') return Response.json({ error: 'Yetkisiz' }, { status: 403 })
  if (!cfg) return Response.json({ error: 'Tenant bulunamıyor' }, { status: 403 })

  const token = process.env.AIRTABLE_TOKEN
  if (!token) return Response.json({ error: 'Token eksik' }, { status: 500 })

  const RAPORLAR_URL = atTableUrl(cfg, 'raporlar')

  let formula: string
  if (izin.tip === 'yönetici') {
    formula = '{Aktif mi}=TRUE()'
  } else {
    const ad = izin.temsilci
    const altAd = AIRTABLE_MOJIBAKE[ad]
    formula = altAd
      ? `AND({Aktif mi}=TRUE(), OR({Kullanıcı}='${ad}', {Kullanıcı}='${altAd}'))`
      : `AND({Aktif mi}=TRUE(), {Kullanıcı}='${ad}')`
  }

  const qs = new URLSearchParams()
  qs.set('filterByFormula', formula)
  qs.append('fields[]', 'Başlık')
  qs.append('fields[]', 'Tarih')
  qs.append('fields[]', 'Tip')
  qs.append('fields[]', 'Kullanıcı')
  qs.set('sort[0][field]', 'Tarih')
  qs.set('sort[0][direction]', 'desc')
  qs.set('pageSize', '100')

  try {
    const res = await fetch(`${RAPORLAR_URL}?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`Airtable ${res.status}`)
    const data = await res.json()
    return Response.json({ records: data.records ?? [] })
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 120) : 'Hata'
    return Response.json({ error: msg }, { status: 502 })
  }
}
