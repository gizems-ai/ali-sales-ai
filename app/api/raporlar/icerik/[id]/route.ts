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

  const [izin, cfg] = await Promise.all([
    getMusterilerIzni(),
    getTenantConfigFromRequest(),
  ])
  if (izin.tip === 'yok') return Response.json({ error: 'Yetkisiz' }, { status: 403 })

  const token = process.env.AIRTABLE_TOKEN
  if (!token) return Response.json({ error: 'Token eksik' }, { status: 500 })

  const RAPORLAR_URL = atTableUrl(cfg, 'raporlar')

  const res = await fetch(`${RAPORLAR_URL}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (res.status === 404) return Response.json({ error: 'Bulunamadı' }, { status: 404 })
  if (!res.ok) return Response.json({ error: `Airtable ${res.status}` }, { status: 502 })

  const record = await res.json()
  const kullanici: string | undefined = record.fields?.['Kullanıcı']
  const aktif: boolean = record.fields?.['Aktif mi'] ?? false

  if (!aktif) return Response.json({ error: 'Yetkisiz' }, { status: 403 })

  if (izin.tip === 'temsilci') {
    const normalized = kullanici === 'R眉ya' ? 'Rüya' : kullanici
    if (normalized !== izin.temsilci) {
      return Response.json({ error: 'Yetkisiz' }, { status: 403 })
    }
  }

  const html: string = record.fields?.['HTML İçerik'] ?? ''
  return Response.json({ html, baslik: record.fields?.['Başlık'] ?? '' })
}
