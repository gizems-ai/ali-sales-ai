import { type NextRequest } from 'next/server'
import { getKullanicıProfili, yetkiVar, getTenantConfigFromRequest } from '@/lib/yetki'
import { PIPELINE_ASAMALARI } from '@/lib/airtable'
import { atTableUrl, fieldActual } from '@/lib/tenants'

const VALID_ASAMA = new Set(PIPELINE_ASAMALARI.map(a => a.value))

// UYARI: Bu endpoint canlı SB_Firmalar'ı değiştirir.
// n8n workflow'ları da aynı kaydı okur/yazar — dikkatli kullan.
export async function PATCH(req: NextRequest) {
  const profil = await getKullanicıProfili()
  if (!profil) return Response.json({ error: 'Yetkisiz' }, { status: 401 })
  if (!yetkiVar(profil, 'satis_sureci', 'düzenle')) {
    return Response.json({ error: 'Bu işlem için yetki yok' }, { status: 403 })
  }

  let body: { recordId?: string; asama?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const { recordId, asama } = body
  if (!recordId || !/^rec[A-Za-z0-9]+$/.test(recordId)) {
    return Response.json({ error: 'Geçersiz recordId' }, { status: 400 })
  }
  if (!asama || !VALID_ASAMA.has(asama)) {
    return Response.json({ error: 'Geçersiz aşama' }, { status: 400 })
  }

  const token = process.env.AIRTABLE_TOKEN
  if (!token) return Response.json({ error: 'Token eksik' }, { status: 500 })

  const cfg = await getTenantConfigFromRequest()
  if (!cfg) return Response.json({ error: 'Tenant bulunamıyor' }, { status: 403 })
  if (cfg.readOnly) return Response.json({ error: 'Demo modunda yazma devre dışı' }, { status: 403 })
  const BASE_URL = atTableUrl(cfg, 'firmalar')

  if (profil.rol === 'satış_temsilcisi') {
    let checkRes: Response
    try {
      checkRes = await fetch(`${BASE_URL}/${recordId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
    } catch {
      return Response.json({ error: 'Airtable bağlantı hatası' }, { status: 503 })
    }
    if (checkRes.status === 404) return Response.json({ error: 'Kayıt bulunamadı' }, { status: 404 })
    if (checkRes.status === 429) return Response.json({ error: 'Limit aşıldı, lütfen bekleyin' }, { status: 429 })
    if (!checkRes.ok) return Response.json({ error: 'Airtable iletişim hatası' }, { status: 502 })

    const rec = await checkRes.json()
    const atanan: string | undefined = rec.fields?.['Atanan Temsilci']

    if (atanan === cfg.airtable.sistemAdi) return Response.json({ error: 'Yetkisiz' }, { status: 403 })
    if (atanan !== profil.temsilciAdi) {
      return Response.json({ error: 'Yetkisiz: başkasının kaydı' }, { status: 403 })
    }
  }

  let res: Response
  try {
    res = await fetch(`${BASE_URL}/${recordId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: { [fieldActual(cfg, 'firmalar', 'Pipeline Aşaması')]: asama } }),
      cache: 'no-store',
    })
  } catch {
    return Response.json({ error: 'Airtable bağlantı hatası' }, { status: 503 })
  }

  if (res.status === 429) return Response.json({ error: 'Limit aşıldı, lütfen bekleyin' }, { status: 429 })
  if (!res.ok) {
    const text = await res.text()
    return Response.json({ error: `Airtable ${res.status}: ${text.slice(0, 100)}` }, { status: 502 })
  }

  return Response.json({ ok: true })
}
