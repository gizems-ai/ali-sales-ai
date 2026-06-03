import { type NextRequest } from 'next/server'
import { getPipelineKolonuSayisi } from '@/lib/airtable'
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
  if (!asama) return Response.json({ error: 'asama gerekli' }, { status: 400 })

  const cfg = getTenantConfig(profil)

  try {
    const count = await getPipelineKolonuSayisi(asama, temsilciFilter, cfg)
    return Response.json({ count })
  } catch {
    return Response.json({ error: 'Airtable hatası' }, { status: 500 })
  }
}
