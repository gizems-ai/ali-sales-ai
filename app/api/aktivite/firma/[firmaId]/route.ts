import { type NextRequest } from 'next/server'
import { getMusterilerIzni } from '@/lib/musteriler-izin'
import { getTenantConfigFromRequest } from '@/lib/yetki'
import { atTableUrl } from '@/lib/tenants'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ firmaId: string }> }
) {
  const { firmaId } = await params

  if (!firmaId || !/^rec[A-Za-z0-9]+$/.test(firmaId)) {
    return Response.json({ error: 'Geçersiz ID' }, { status: 400 })
  }

  const izin = await getMusterilerIzni()
  if (izin.tip === 'yok') return Response.json({ error: 'Yetkisiz' }, { status: 403 })

  const token = process.env.AIRTABLE_TOKEN
  if (!token) return Response.json({ error: 'Token eksik' }, { status: 500 })

  const cfg = await getTenantConfigFromRequest()
  const AT_URL = atTableUrl(cfg, 'aktiviteler')

  const qs = new URLSearchParams({
    filterByFormula: `{Firma ID}='${firmaId}'`,
    'sort[0][field]': 'Tarih',
    'sort[0][direction]': 'desc',
    pageSize: '50',
  })

  let res: Response
  try {
    res = await fetch(`${AT_URL}?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
  } catch {
    return Response.json({ error: 'Airtable bağlantı hatası' }, { status: 503 })
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    console.error('Airtable hata [aktivite/firma]:', res.status, JSON.stringify(errBody))
    if (res.status === 429) return Response.json({ error: 'Çok hızlı istek, biraz bekle' }, { status: 429 })
    return Response.json({ error: `Airtable ${res.status}` }, { status: 502 })
  }

  const data = await res.json()
  return Response.json({ records: data.records ?? [] })
}
