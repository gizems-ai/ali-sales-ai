import { getMusterilerIzni } from '@/lib/musteriler-izin'
import { getTenantConfigFromRequest } from '@/lib/yetki'
import { atTableUrl } from '@/lib/tenants'

export const dynamic = 'force-dynamic'

function getWeekBounds(offsetWeeks = 0): { start: string; end: string } {
  // Türkiye saati (UTC+3) ile hesapla — sunucu UTC'de çalışıyor
  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' })
  const today = new Date(todayStr + 'T00:00:00')
  const day = today.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const mon = new Date(today)
  mon.setDate(today.getDate() + diffToMonday + offsetWeeks * 7)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const iso = (d: Date) => d.toLocaleDateString('sv-SE')
  return { start: iso(mon), end: offsetWeeks === 0 ? todayStr : iso(sun) }
}

function normalizeBrans(b: string | string[]): string {
  const s = Array.isArray(b) ? b.join(' ') : b
  if (s.includes('Acıbadem')) return 'Acıbadem Ürünleri'
  if (s.includes('Elementer')) return 'Elementer'
  if (s.includes('Sağlık')) return 'Sağlık'
  return 'Diğer'
}

function firmaIdFrom(raw: unknown): string | undefined {
  if (Array.isArray(raw)) return raw[0] as string | undefined
  if (typeof raw === 'string') return raw
  return undefined
}

interface LogEntry { temsilci: string; durum: string; firmaId?: string }
interface FirmaInfo { pipeline: string; brans: string; sektor?: string }

async function fetchLog(
  url: string, start: string, end: string, token: string,
): Promise<LogEntry[]> {
  const entries: LogEntry[] = []
  let offset: string | undefined
  do {
    const qs = new URLSearchParams()
    qs.set('filterByFormula', `AND(DATESTR({Tarih})>='${start}',DATESTR({Tarih})<='${end}')`)
    qs.append('fields[]', 'Temsilci')
    qs.append('fields[]', 'Arama Sonucu')
    qs.append('fields[]', 'Firma ID')
    qs.set('pageSize', '100')
    if (offset) qs.set('offset', offset)
    const res = await fetch(`${url}?${qs}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
    })
    if (!res.ok) throw new Error(`log ${res.status}`)
    const data = await res.json()
    for (const r of data.records ?? []) {
      entries.push({
        temsilci: (r.fields['Temsilci'] as string) ?? '?',
        durum:    (r.fields['Arama Sonucu'] as string) ?? '?',
        firmaId:  firmaIdFrom(r.fields['Firma ID']),
      })
    }
    offset = data.offset
  } while (offset)
  return entries
}

async function fetchFirmalar(
  url: string, ids: string[], token: string,
): Promise<Map<string, FirmaInfo>> {
  const map = new Map<string, FirmaInfo>()
  for (let i = 0; i < ids.length; i += 80) {
    const batch = ids.slice(i, i + 80)
    const qs = new URLSearchParams()
    qs.set('filterByFormula', 'OR(' + batch.map(id => `RECORD_ID()='${id}'`).join(',') + ')')
    qs.append('fields[]', 'Pipeline Aşaması')
    qs.append('fields[]', 'Branş')
    qs.append('fields[]', 'Sektör')
    qs.set('pageSize', '100')
    const res = await fetch(`${url}?${qs}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
    })
    if (!res.ok) continue
    const data = await res.json()
    for (const r of data.records ?? []) {
      const f = r.fields as Record<string, unknown>
      const b = f['Branş'] as string | string[] | undefined
      map.set(r.id, {
        pipeline: (f['Pipeline Aşaması'] as string) ?? 'Bilinmiyor',
        brans:    b ? normalizeBrans(b) : 'Diğer',
        sektor:   f['Sektör'] as string | undefined,
      })
    }
    if (i + 80 < ids.length) await new Promise(r => setTimeout(r, 150))
  }
  return map
}

function countArr(items: { ad: string; sayi: number }[]): { ad: string; sayi: number }[] {
  return items.sort((a, b) => b.sayi - a.sayi)
}

// ── 5-dakikalık in-memory cache ───────────────────────────────────────────────
const _cache = new Map<string, { data: object; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000

export async function GET(req: Request) {
  const [izin, cfg] = await Promise.all([getMusterilerIzni(), getTenantConfigFromRequest()])
  if (izin.tip === 'yok')       return Response.json({ error: 'Yetkisiz' },       { status: 403 })
  if (!cfg)                      return Response.json({ error: 'Tenant yok' },     { status: 403 })
  if (izin.tip !== 'yönetici') return Response.json({ error: 'Yalnızca yönetici' }, { status: 403 })

  const token = process.env.AIRTABLE_TOKEN
  if (!token) return Response.json({ error: 'Token eksik' }, { status: 500 })

  const url = new URL(req.url)
  const weekOffset = Math.max(-52, Math.min(0, parseInt(url.searchParams.get('week') ?? '0', 10) || 0))

  const cacheKey = `${cfg.id}|ekip|${weekOffset}`
  const hit = _cache.get(cacheKey)
  if (hit && Date.now() - hit.ts < CACHE_TTL) return Response.json(hit.data)

  const aktivUrl  = atTableUrl(cfg, 'aktiviteler')
  const firmUrl   = atTableUrl(cfg, 'firmalar')
  const thisWeek  = getWeekBounds(weekOffset)
  const lastWeek  = getWeekBounds(weekOffset - 1)

  // ── Fetch activity logs for both weeks in parallel ────────────────────────
  let thisLog: LogEntry[], lastLog: LogEntry[]
  try {
    ;[thisLog, lastLog] = await Promise.all([
      fetchLog(aktivUrl, thisWeek.start, thisWeek.end, token),
      fetchLog(aktivUrl, lastWeek.start, lastWeek.end, token),
    ])
  } catch {
    return Response.json({ error: 'Aktivite verisi alınamadı' }, { status: 502 })
  }

  // ── Collect firma IDs ─────────────────────────────────────────────────────
  // All this-week + ulaşıldı last-week (for trend randevu)
  const allFirmaIds = new Set<string>()
  for (const e of thisLog) if (e.firmaId) allFirmaIds.add(e.firmaId)
  for (const e of lastLog) if (e.firmaId && e.durum === 'Ulaşıldı') allFirmaIds.add(e.firmaId)

  let firmaMap = new Map<string, FirmaInfo>()
  if (allFirmaIds.size > 0) {
    firmaMap = await fetchFirmalar(firmUrl, [...allFirmaIds], token).catch(() => new Map())
  }

  // ── This week aggregations ────────────────────────────────────────────────
  const temsilciAktivite: Record<string, number> = {}
  const temsilciUlasildi: Record<string, number> = {}
  const aramaBrans:  Record<string, number> = {}
  const aramaSektor: Record<string, number> = {}

  const ulasildiIdler = new Set<string>()

  for (const e of thisLog) {
    temsilciAktivite[e.temsilci] = (temsilciAktivite[e.temsilci] ?? 0) + 1

    // Branş/Sektör from firma for ALL activities
    if (e.firmaId) {
      const firma = firmaMap.get(e.firmaId)
      if (firma) {
        aramaBrans[firma.brans] = (aramaBrans[firma.brans] ?? 0) + 1
        if (firma.sektor) aramaSektor[firma.sektor] = (aramaSektor[firma.sektor] ?? 0) + 1
      }
    }

    if (e.durum === 'Ulaşıldı') {
      temsilciUlasildi[e.temsilci] = (temsilciUlasildi[e.temsilci] ?? 0) + 1
      if (e.firmaId) ulasildiIdler.add(e.firmaId)
    }
  }

  const toplamAktivite = thisLog.length
  const toplamUlasildi = [...ulasildiIdler].length // unique firms

  // ── Funnel — pipeline stages of ulaşıldı firms ───────────────────────────
  let yanitAlindi = 0, funRandevu = 0, funTeklif = 0, funKazanim = 0
  const ileriIdler = new Set<string>()

  const randevuTemsilci: Record<string, number> = {}
  const randevuBrans:    Record<string, number> = {}
  const randevuSektor:   Record<string, number> = {}

  for (const firmaId of ulasildiIdler) {
    const firma = firmaMap.get(firmaId)
    if (!firma) continue
    const p = firma.pipeline
    if (p === 'Yanıt Alındı')                  { yanitAlindi++;  ileriIdler.add(firmaId) }
    else if (p === 'Randevu')                   { funRandevu++;   ileriIdler.add(firmaId) }
    else if (p === 'Teklif' || p === 'Müzakere') { funTeklif++;  ileriIdler.add(firmaId) }
    else if (p === 'Kazanıldı')                 { funKazanim++;  ileriIdler.add(firmaId) }
  }

  // Randevu firms → per-temsilci + branş + sektör
  const randevuFirmalar = [...ulasildiIdler].filter(id => firmaMap.get(id)?.pipeline === 'Randevu')
  // Attribute each randevu firm to first temsilci that reached it this week
  const randevuFirmaTemsilci: Record<string, string> = {}
  for (const e of thisLog) {
    if (e.durum !== 'Ulaşıldı' || !e.firmaId) continue
    if (!randevuFirmalar.includes(e.firmaId)) continue
    if (!randevuFirmaTemsilci[e.firmaId]) randevuFirmaTemsilci[e.firmaId] = e.temsilci
  }
  for (const [firmaId, t] of Object.entries(randevuFirmaTemsilci)) {
    randevuTemsilci[t] = (randevuTemsilci[t] ?? 0) + 1
    const firma = firmaMap.get(firmaId)
    if (firma) {
      randevuBrans[firma.brans] = (randevuBrans[firma.brans] ?? 0) + 1
      if (firma.sektor) randevuSektor[firma.sektor] = (randevuSektor[firma.sektor] ?? 0) + 1
    }
  }

  // ── Last week trend ───────────────────────────────────────────────────────
  const temsilciAktiviteGecen: Record<string, number> = {}
  const lastUlasildiIdler = new Set<string>()
  for (const e of lastLog) {
    temsilciAktiviteGecen[e.temsilci] = (temsilciAktiviteGecen[e.temsilci] ?? 0) + 1
    if (e.firmaId && e.durum === 'Ulaşıldı') lastUlasildiIdler.add(e.firmaId)
  }
  let lastRandevu = 0
  for (const id of lastUlasildiIdler) {
    if (firmaMap.get(id)?.pipeline === 'Randevu') lastRandevu++
  }

  // ── Build response ────────────────────────────────────────────────────────
  const visibleTemsilciler = cfg.temsilciler

  const result = {
    hafta: thisWeek,
    funnel: {
      aktivite:     toplamAktivite,
      ulasildi:     toplamUlasildi,
      yanit_alindi: yanitAlindi,
      randevu:      funRandevu,
      teklif:       funTeklif,
      kazanim:      funKazanim,
    },
    temsilciler: visibleTemsilciler.map(t => ({
      ad:             t.ad,
      slug:           t.slug,
      renk:           t.renk,
      aktivite:       temsilciAktivite[t.ad]      ?? 0,
      ulasildi:       temsilciUlasildi[t.ad]      ?? 0,
      randevu:        randevuTemsilci[t.ad]        ?? 0,
      aktivite_gecen: temsilciAktiviteGecen[t.ad] ?? 0,
    })),
    aramalar: {
      toplam:   toplamAktivite,
      temsilci: visibleTemsilciler.map(t => ({
        ad: t.ad, renk: t.renk, sayi: temsilciAktivite[t.ad] ?? 0,
      })),
      brans:  countArr(Object.entries(aramaBrans).map(([ad, sayi]) => ({ ad, sayi }))),
      sektor: countArr(Object.entries(aramaSektor).map(([ad, sayi]) => ({ ad, sayi }))).slice(0, 5),
    },
    randevular: {
      toplam:   funRandevu + funKazanim,
      temsilci: visibleTemsilciler.map(t => ({
        ad: t.ad, renk: t.renk, sayi: randevuTemsilci[t.ad] ?? 0,
      })),
      brans:  countArr(Object.entries(randevuBrans).map(([ad, sayi]) => ({ ad, sayi }))),
      sektor: countArr(Object.entries(randevuSektor).map(([ad, sayi]) => ({ ad, sayi }))),
    },
    gecen_hafta: {
      aktivite: lastLog.length,
      ulasildi: lastUlasildiIdler.size,
      randevu:  lastRandevu,
    },
    pipeline_ilerletme: {
      ileri_tasindi: ileriIdler.size,
      yeni_randevu:  funRandevu + funKazanim,
    },
  }

  _cache.set(cacheKey, { data: result, ts: Date.now() })
  return Response.json(result)
}
