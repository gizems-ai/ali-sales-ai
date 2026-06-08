import { type NextRequest } from 'next/server'
import { getKullanicıProfili, getTenantConfigFromRequest } from '@/lib/yetki'
import { atTableUrl } from '@/lib/tenants'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  const { logId } = await params

  if (!logId || !/^rec[A-Za-z0-9]+$/.test(logId)) {
    return Response.json({ error: 'Geçersiz ID' }, { status: 400 })
  }

  const profil = await getKullanicıProfili()
  if (!profil || profil.rol !== 'admin') {
    return Response.json({ error: 'Sadece admin silebilir' }, { status: 403 })
  }

  const token = process.env.AIRTABLE_TOKEN
  if (!token) return Response.json({ error: 'Token eksik' }, { status: 500 })

  const cfg = await getTenantConfigFromRequest()
  if (!cfg) return Response.json({ error: 'Tenant bulunamıyor' }, { status: 403 })
  const AT_URL = atTableUrl(cfg, 'aktiviteler')

  let res: Response
  try {
    res = await fetch(`${AT_URL}/${logId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    return Response.json({ error: 'Airtable bağlantı hatası' }, { status: 503 })
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    console.error('Airtable hata [aktivite/sil]:', res.status, JSON.stringify(errBody))
    if (res.status === 404) return Response.json({ error: 'Kayıt bulunamadı' }, { status: 404 })
    if (res.status === 429) return Response.json({ error: 'Çok hızlı istek, biraz bekle' }, { status: 429 })
    return Response.json({ error: `Airtable ${res.status}` }, { status: 502 })
  }

  return Response.json({ ok: true })
}
