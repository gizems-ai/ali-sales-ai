import { type NextRequest } from 'next/server'
import { getPipelineKolonu } from '@/lib/airtable'
import { getKullanicıProfili, yetkiVar, izolasyonBelirle, getTenantConfig } from '@/lib/yetki'

export async function GET(req: NextRequest) {
  const profil = await getKullanicıProfili()
  if (!profil) return Response.json({ error: 'Yetkisiz' }, { status: 401 })
  if (!yetkiVar(profil, 'satis_sureci', 'görüntüle')) {
    return Response.json({ error: 'Yetki yok' }, { status: 403 })
  }

  const izolasyon = izolasyonBelirle(profil)
  const temsilciFilter = izolasyon.tip === 'temsilci' ? izolasyon.ad : undefined

  const asama = req.nextUrl.searchParams.get('asama')
  const offset = req.nextUrl.searchParams.get('offset') ?? undefined

  if (!asama) return Response.json({ error: 'asama gerekli' }, { status: 400 })

  const cfg = getTenantConfig(profil)

  try {
    const result = await getPipelineKolonu(asama, offset, temsilciFilter, cfg)
    return Response.json(result)
  } catch {
    return Response.json({ error: 'Airtable hatası' }, { status: 500 })
  }
}
