import { getMusterilerIzni } from '@/lib/musteriler-izin'
import { getTenantConfigFromRequest } from '@/lib/yetki'
import { atTableUrl } from '@/lib/tenants'

const PIPELINE_ORDER = [
  'Ulaşılamadı', 'Bilinmiyor', 'Yanıt Alındı', 'Randevu',
  'Teklif', 'Kazanıldı', 'Kaybedildi',
]
const AY_ORDER = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

function normalizeBrans(b: string | string[]): string {
  const s = Array.isArray(b) ? b.join(' ') : b
  if (s.includes('Acıbadem')) return 'Acıbadem Ürünleri'
  if (s.includes('Elementer')) return 'Elementer'
  if (s.includes('Sağlık')) return 'Sağlık'
  return 'Diğer'
}

// ── 5-dakikalık in-memory cache (per tenant + izin) ──────────────────────────
const _cache = new Map<string, { data: object; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000

export async function GET() {
  const [izin, cfg] = await Promise.all([getMusterilerIzni(), getTenantConfigFromRequest()])
  if (izin.tip === 'yok') return Response.json({ error: 'Yetkisiz' }, { status: 403 })
  if (!cfg) return Response.json({ error: 'Tenant bulunamıyor' }, { status: 403 })

  const token = process.env.AIRTABLE_TOKEN
  if (!token) return Response.json({ error: 'Token eksik' }, { status: 500 })

  const temsilciAdi = izin.tip === 'temsilci' ? izin.temsilci : ''
  const cacheKey = `${cfg.id}|${izin.tip}|${temsilciAdi}`
  const hit = _cache.get(cacheKey)
  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    return Response.json(hit.data)
  }

  const FIRMALAR_URL = atTableUrl(cfg, 'firmalar')
  const izolasyon =
    izin.tip === 'temsilci'
      ? `{Atanan Temsilci}='${izin.temsilci}'`
      : `{Atanan Temsilci}!='${cfg.airtable.sistemAdi}'`

  const pipeline: Record<string, number> = {}
  const vade: Record<string, number> = {}
  const brans: Record<string, number> = {}
  const sektor: Record<string, number> = {}
  const temsilciToplam: Record<string, number> = {}
  const temsilciSicak: Record<string, number> = {}
  let sicakHot = 0, sicakWarm = 0, sicakCold = 0
  let toplam = 0

  let pageOffset: string | undefined
  try {
    do {
      const qs = new URLSearchParams()
      qs.set('filterByFormula', izolasyon)
      qs.append('fields[]', 'Pipeline Aşaması')
      qs.append('fields[]', 'Vade Ayı Grubu')
      qs.append('fields[]', 'Branş')
      qs.append('fields[]', 'Atanan Temsilci')
      qs.append('fields[]', 'Sıcaklık Skoru')
      qs.append('fields[]', 'Sektör')
      qs.set('pageSize', '100')
      if (pageOffset) qs.set('offset', pageOffset)

      const res = await fetch(`${FIRMALAR_URL}?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`Airtable ${res.status}`)

      const data = await res.json()
      for (const r of data.records ?? []) {
        const f = r.fields as Record<string, unknown>
        toplam++

        // Pipeline — null/undefined → 'Bilinmiyor', Müzakere → Teklif
        const a = f['Pipeline Aşaması'] as string | undefined
        const pKey = a === 'Müzakere' ? 'Teklif' : (a ?? 'Bilinmiyor')
        pipeline[pKey] = (pipeline[pKey] ?? 0) + 1

        // Vade
        const v = f['Vade Ayı Grubu'] as string | undefined
        if (v && v !== 'Bilinmiyor') vade[v] = (vade[v] ?? 0) + 1

        // Branş
        const b = f['Branş'] as string | string[] | undefined
        if (b) {
          const key = normalizeBrans(b)
          brans[key] = (brans[key] ?? 0) + 1
        }

        // Sektör
        const s = f['Sektör'] as string | undefined
        if (s) sektor[s] = (sektor[s] ?? 0) + 1

        // Sıcaklık: HOT ≥7, WARM 4-6, COLD ≤3
        const skor = ((f['Sıcaklık Skoru'] as number) ?? 0)
        if (skor >= 7) sicakHot++
        else if (skor >= 4) sicakWarm++
        else sicakCold++

        if (izin.tip === 'yönetici') {
          const t = f['Atanan Temsilci'] as string | undefined
          if (t && t !== cfg.airtable.sistemAdi) {
            temsilciToplam[t] = (temsilciToplam[t] ?? 0) + 1
            if (skor >= 7) temsilciSicak[t] = (temsilciSicak[t] ?? 0) + 1
          }
        }
      }
      pageOffset = data.offset as string | undefined
    } while (pageOffset)
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 120) : 'Hata'
    return Response.json({ error: msg }, { status: 502 })
  }

  const pipelineData = PIPELINE_ORDER.map(asama => ({ asama, sayi: pipeline[asama] ?? 0 }))
  const vadeData = AY_ORDER.map(ay => ({ ay, sayi: vade[ay] ?? 0 })).filter(v => v.sayi > 0)
  const bransData = Object.entries(brans).map(([ad, sayi]) => ({ ad, sayi })).sort((a, b) => b.sayi - a.sayi)

  // Sektör: top 5 + "Diğer" aggregate
  const sektorAll = Object.entries(sektor).sort((a, b) => b[1] - a[1])
  const top5 = sektorAll.slice(0, 5).map(([ad, sayi]) => ({ ad, sayi }))
  const digerSayi = sektorAll.slice(5).reduce((sum, [, n]) => sum + n, 0)
  if (digerSayi > 0) top5.push({ ad: 'Diğer', sayi: digerSayi })

  const result: Record<string, unknown> = {
    toplam,
    pipeline: pipelineData,
    vade: vadeData,
    brans: bransData,
    sektor: top5,
    sicaklik: { hot: sicakHot, warm: sicakWarm, cold: sicakCold },
  }

  if (izin.tip === 'yönetici') {
    result.temsilci = Object.keys(temsilciToplam).map(t => ({
      temsilci: t,
      toplam: temsilciToplam[t],
      sicak: temsilciSicak[t] ?? 0,
    }))
  }

  _cache.set(cacheKey, { data: result, ts: Date.now() })
  return Response.json(result)
}
