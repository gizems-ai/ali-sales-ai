import { type NextRequest } from 'next/server'
import { getMusterilerIzni } from '@/lib/musteriler-izin'
import { getTenantConfigFromRequest } from '@/lib/yetki'
import { atTableUrl } from '@/lib/tenants'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id || !/^rec[A-Za-z0-9]+$/.test(id)) {
    return Response.json({ error: 'Geçersiz ID' }, { status: 400 })
  }

  const izin = await getMusterilerIzni()
  if (izin.tip === 'yok') {
    return Response.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  const token = process.env.AIRTABLE_TOKEN
  if (!token) return Response.json({ error: 'Token eksik' }, { status: 500 })

  const cfg = await getTenantConfigFromRequest(); if (!cfg) return Response.json({ error: "Tenant bulunamıyor" }, { status: 403 })
  const BASE_URL = atTableUrl(cfg, 'firmalar')

  let res: Response
  try {
    res = await fetch(`${BASE_URL}/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
  } catch {
    return Response.json({ error: 'Airtable bağlantı hatası' }, { status: 503 })
  }

  if (res.status === 404) return Response.json({ error: 'Kayıt bulunamadı' }, { status: 404 })
  if (res.status === 429) return Response.json({ error: 'Limit aşıldı, lütfen bekleyin' }, { status: 429 })
  if (!res.ok) return Response.json({ error: `Airtable ${res.status}` }, { status: 502 })

  const record = await res.json()
  const atanan: string | undefined = record.fields?.['Atanan Temsilci']

  if (atanan === cfg.airtable.sistemAdi) {
    return Response.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  if (izin.tip === 'temsilci' && atanan !== izin.temsilci) {
    return Response.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  return Response.json(record)
}
