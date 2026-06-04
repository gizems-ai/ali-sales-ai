import { type NextRequest } from 'next/server'
import { getMusterilerIzni } from '@/lib/musteriler-izin'
import { getTenantConfigFromRequest } from '@/lib/yetki'
import { atTableUrl, translatePatch } from '@/lib/tenants'

export async function POST(req: NextRequest) {
  const izin = await getMusterilerIzni()
  if (izin.tip === 'yok') return Response.json({ error: 'Yetkisiz' }, { status: 403 })

  const token = process.env.AIRTABLE_TOKEN
  if (!token) return Response.json({ error: 'Token eksik' }, { status: 500 })

  const cfg = await getTenantConfigFromRequest(); if (!cfg) return Response.json({ error: "Tenant bulunamıyor" }, { status: 403 })
  const AT_URL = atTableUrl(cfg, 'aktiviteler')

  let body: {
    firmaId?: string
    aramaSonucu?: string
    not?: string
    randevuAlindi?: boolean
    temsilci?: string
    tarih?: string
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Geçersiz istek' }, { status: 400 })
  }

  const { firmaId, aramaSonucu, not: notMetni, randevuAlindi, temsilci: bodyTemsilci, tarih: bodyTarih } = body

  if (!firmaId || !/^rec[A-Za-z0-9]+$/.test(firmaId)) {
    return Response.json({ error: 'Geçersiz Firma ID' }, { status: 400 })
  }

  const temsilci = izin.tip === 'temsilci' ? izin.temsilci : (bodyTemsilci ?? undefined)
  const tarih = bodyTarih ?? new Date().toISOString().slice(0, 10)
  const baslik = [aramaSonucu ?? 'Not', tarih].join(' — ')

  const fields: Record<string, unknown> = {
    'Başlık': baslik,
    'Firma': [firmaId],
    'Firma ID': firmaId,
    'Tarih': tarih,
  }
  if (aramaSonucu) fields['Arama Sonucu'] = aramaSonucu
  if (notMetni?.trim()) fields['Not'] = notMetni.trim()
  if (randevuAlindi) fields['Randevu Alındı'] = true
  if (temsilci) fields['Temsilci'] = temsilci

  let res: Response
  try {
    res = await fetch(AT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: translatePatch(cfg, 'aktiviteler', fields) }),
    })
  } catch {
    return Response.json({ error: 'Airtable bağlantı hatası' }, { status: 503 })
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    console.error('Airtable hata [aktivite/ekle]:', res.status, JSON.stringify(errBody))
    if (res.status === 422) return Response.json({ error: 'Kayıt oluşturulamadı (alan formatı). Detay log\'da.' }, { status: 422 })
    if (res.status === 429) return Response.json({ error: 'Çok hızlı istek, biraz bekle' }, { status: 429 })
    return Response.json({ error: `Airtable ${res.status}` }, { status: 502 })
  }

  const record = await res.json()
  return Response.json(record, { status: 201 })
}
