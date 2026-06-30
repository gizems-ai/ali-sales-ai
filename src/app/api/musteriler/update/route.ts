import { type NextRequest } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { getMusterilerIzni } from '@/lib/musteriler-izin'
import { getTenantConfigFromRequest } from '@/lib/yetki'
import { atTableUrl, translatePatch } from '@/lib/tenants'

const EDITILEBILIR = new Set([
  'Firma Adı', 'Sektör', 'İl / İlçe', 'Adres', 'Genel Telefon', 'Genel Mail',
  'Web Sitesi', 'LinkedIn URL', 'Son İletişim Kanalı', 'Son İletişim Tarihi',
  'Branş', 'Vade Ayı Grubu', 'Sağlık Poliçe Türü', 'Sağlık Vade Tarihi',
  'Elementer Ürün', 'Elementer Vade', 'Mevcut Aracı Kurum', 'Kişi Sayısı',
  'Ürün', 'Öncelik', 'Bugün Aranacak', '2026 Arandı mı', '2026 Ulaşıldı mı',
  'Sonra Ara Tarihi', 'Son Durum 2026', 'Kaybedilme Nedeni', 'Ali Özeti',
  'Branş Onaylandı', 'Cross-Sell İmkânı', 'Global Anlaşma', 'Pipeline Aşaması',
])

const PIPELINE_ASAMALARI = new Set([
  'Potansiyel', 'İlk Temas', 'Yanıt Alındı', 'Randevu', 'Teklif',
  'Müzakere', 'Kazanıldı', 'Kaybedildi', 'Ulaşılamadı', 'Geri Aranacak',
])

const DATE_ALANLARI = [
  'Son İletişim Tarihi', 'Sağlık Vade Tarihi', 'Elementer Vade', 'Sonra Ara Tarihi',
]

export async function PATCH(req: NextRequest) {
  const [izin, cfg] = await Promise.all([
    getMusterilerIzni(),
    getTenantConfigFromRequest(),
  ])
  if (izin.tip === 'yok') return Response.json({ error: 'Yetkisiz' }, { status: 403 })
  if (!cfg) return Response.json({ error: 'Tenant bulunamıyor' }, { status: 403 })
  if (cfg.readOnly) return Response.json({ error: 'Demo modunda yazma devre dışı' }, { status: 403 })

  let body: { recordId?: string; fields?: Record<string, unknown>; notEkle?: string }
  try { body = await req.json() }
  catch { return Response.json({ error: 'Geçersiz JSON' }, { status: 400 }) }

  const { recordId, fields = {}, notEkle } = body
  if (!recordId || !/^rec[A-Za-z0-9]+$/.test(recordId)) {
    return Response.json({ error: 'Geçersiz recordId' }, { status: 400 })
  }

  const token = process.env.AIRTABLE_TOKEN
  if (!token) return Response.json({ error: 'Token eksik' }, { status: 500 })

  const BASE_URL = atTableUrl(cfg, 'firmalar')

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

  const checkRec = await checkRes.json()
  const atanan: string | undefined = checkRec.fields?.['Atanan Temsilci']
  const prevFields = {
    'Son İletişim Tarihi':   checkRec.fields?.['Son İletişim Tarihi']   ?? null,
    '2026 Arandı mı':        checkRec.fields?.['2026 Arandı mı']        ?? false,
    '2026 Ulaşıldı mı':      checkRec.fields?.['2026 Ulaşıldı mı']      ?? false,
    'Sonra Ara Tarihi':      checkRec.fields?.['Sonra Ara Tarihi']      ?? null,
    'Pipeline Aşaması':      checkRec.fields?.['Pipeline Aşaması']      ?? null,
    'Bugün Aranacak':        checkRec.fields?.['Bugün Aranacak']        ?? false,
  }

  if (atanan === cfg.airtable.sistemAdi) return Response.json({ error: 'Yetkisiz' }, { status: 403 })
  if (izin.tip === 'temsilci' && atanan !== izin.temsilci) {
    return Response.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  const patchFields: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(fields)) {
    if (key === 'Atanan Temsilci') {
      if (izin.tip !== 'yönetici') {
        return Response.json({ error: 'Atanan Temsilci: yalnızca yönetici değiştirebilir' }, { status: 403 })
      }
      patchFields[key] = value
      continue
    }
    if (EDITILEBILIR.has(key)) patchFields[key] = value
  }

  if ('Firma Adı' in patchFields) {
    const v = String(patchFields['Firma Adı'] ?? '').trim()
    if (!v) return Response.json({ error: 'Firma adı boş olamaz' }, { status: 422 })
    patchFields['Firma Adı'] = v
  }
  if (patchFields['Genel Mail']) {
    const m = String(patchFields['Genel Mail'])
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)) {
      return Response.json({ error: 'Geçersiz e-posta formatı' }, { status: 422 })
    }
  }
  for (const df of DATE_ALANLARI) {
    if (patchFields[df] && !/^\d{4}-\d{2}-\d{2}$/.test(String(patchFields[df]))) {
      return Response.json({ error: `${df}: geçersiz tarih (YYYY-MM-DD)` }, { status: 422 })
    }
  }
  if ('Pipeline Aşaması' in patchFields) {
    const pv = patchFields['Pipeline Aşaması']
    // null → alanı temizle (undo desteği); geçersiz string → sessizce at
    if (pv != null && !PIPELINE_ASAMALARI.has(String(pv))) {
      delete patchFields['Pipeline Aşaması']
    }
  }

  if (notEkle?.trim()) {
    const user = await currentUser()
    const adSoyad = user?.firstName || 'Kullanıcı'

    const mevcutNot = String(checkRec.fields?.['Birikimli Görüşme Notları'] ?? '')

    // İstanbul saat dilimi — tr-TR formatı GG.AA.YYYY döner (sunucu UTC olsa bile doğru gün)
    const tarihTR = new Date().toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' })
    const stamp = `[${tarihTR} - ${adSoyad}]`

    patchFields['Birikimli Görüşme Notları'] = mevcutNot.trim()
      ? `${stamp} ${notEkle.trim()}\n\n${mevcutNot}`
      : `${stamp} ${notEkle.trim()}`
  }

  // notEkle varsa yukarıda patchFields'a 'Birikimli Görüşme Notları' eklenmiştir;
  // bu noktada patchFields hâlâ boşsa yazılabilir hiçbir alan yok demektir.
  if (Object.keys(patchFields).length === 0) {
    return Response.json({ ok: false, error: 'no_writable_fields' }, { status: 400 })
  }

  const actualPatchFields = translatePatch(cfg, 'firmalar', patchFields)

  let patchRes: Response
  try {
    patchRes = await fetch(`${BASE_URL}/${recordId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: actualPatchFields }),
      cache: 'no-store',
    })
  } catch {
    return Response.json({ error: 'Airtable bağlantı hatası' }, { status: 503 })
  }

  if (patchRes.status === 429) return Response.json({ error: 'Limit aşıldı, lütfen bekleyin' }, { status: 429 })
  if (!patchRes.ok) {
    const text = await patchRes.text()
    return Response.json({ error: `Airtable ${patchRes.status}: ${text.slice(0, 120)}` }, { status: 502 })
  }

  const updated = await patchRes.json()
  return Response.json({ ok: true, fields: updated.fields, prev: prevFields })
}
