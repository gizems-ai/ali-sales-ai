import { getKullanicıProfili, izolasyonBelirle } from '@/lib/yetki'
import { resolveTenant, fieldActual, type TenantConfig } from '@/lib/tenants'

export type MusterilerIzin =
  | { tip: 'yönetici' }
  | { tip: 'temsilci'; temsilci: string }
  | { tip: 'yok' }

export interface MusterilerFiltreler {
  sektor?: string; asama?: string; temsilci?: string; oncelik?: string
  durum?: string; vade?: string; bugun?: boolean; q?: string
}

const VALID_SEKTOR = new Set([
  'Üretim & Sanayi', 'Lojistik & Nakliyat', 'Sağlık Kuruluşu', 'Bilişim & Yazılım',
  'Profesyonel Hizmet', 'Finans & Sigorta', 'Perakende & E-ticaret',
  'İnşaat & Müteahhitlik', 'Toptan Ticaret & İthalat-İhracat', 'Gıda & İçecek',
  'Otomotiv & Yan Sanayi', 'Eğitim & Danışmanlık', 'Diğer',
  'Turizm & Konaklama', 'Reklam & Medya',
])
const VALID_ASAMA = new Set([
  'Ulaşılamadı', 'Yanıt Alındı', 'Randevu', 'Teklif', 'Müzakere', 'Kazanıldı', 'Kaybedildi',
])
const VALID_ONCELIK = new Set(['Normal', 'Yüksek', 'Düşük'])
const VALID_DURUM   = new Set(['Soğuk', 'Ilık', 'Sıcak'])
const VALID_VADE    = new Set([
  'Bilinmiyor', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
])

export async function getMusterilerIzni(): Promise<MusterilerIzin> {
  const profil = await getKullanicıProfili()
  if (!profil) return { tip: 'yok' }
  const izolasyon = izolasyonBelirle(profil)
  switch (izolasyon.tip) {
    case 'tümü':        return { tip: 'yönetici' }
    case 'temsilci':    return { tip: 'temsilci', temsilci: izolasyon.ad }
    case 'ortak_havuz': return { tip: 'yönetici' }
  }
}

export function buildMusterilerFormula(
  izin: Exclude<MusterilerIzin, { tip: 'yok' }>,
  f: MusterilerFiltreler = {},
  cfg: TenantConfig = resolveTenant(),
): string {
  const validTemsilci = new Set(cfg.temsilciler.map(t => t.ad))
  const conds: string[] = []

  // Alan adlarını tenant config'inden al
  const atanan   = fieldActual(cfg, 'firmalar', 'Atanan Temsilci')
  const pipeline = fieldActual(cfg, 'firmalar', 'Pipeline Aşaması')
  const sektor   = fieldActual(cfg, 'firmalar', 'Sektör')
  const oncelik  = fieldActual(cfg, 'firmalar', 'Öncelik')
  const durum    = fieldActual(cfg, 'firmalar', 'Durum')
  const vade     = fieldActual(cfg, 'firmalar', 'Vade Ayı Grubu')
  const bugunAr  = fieldActual(cfg, 'firmalar', 'Bugün Aranacak')
  const firmaAdi = fieldActual(cfg, 'firmalar', 'Firma Adı')

  const { sistemAdi } = cfg.airtable
  if (izin.tip === 'temsilci') {
    conds.push(`{${atanan}}='${izin.temsilci}'`)
  } else if (sistemAdi) {
    conds.push(`{${atanan}}!='${sistemAdi}'`)
  }

  if (f.sektor   && VALID_SEKTOR.has(f.sektor))   conds.push(`{${sektor}}='${f.sektor}'`)
  if (f.asama    && VALID_ASAMA.has(f.asama))     conds.push(`{${pipeline}}='${f.asama}'`)
  if (f.temsilci && validTemsilci.has(f.temsilci) && izin.tip === 'yönetici') {
    conds.push(`{${atanan}}='${f.temsilci}'`)
  }
  if (f.oncelik  && VALID_ONCELIK.has(f.oncelik)) conds.push(`{${oncelik}}='${f.oncelik}'`)
  if (f.durum    && VALID_DURUM.has(f.durum))     conds.push(`{${durum}}='${f.durum}'`)
  if (f.vade     && VALID_VADE.has(f.vade))       conds.push(`{${vade}}='${f.vade}'`)
  if (f.bugun) conds.push(`{${bugunAr}}=1`)
  if (f.q && f.q.trim()) {
    const safe = f.q.replace(/['"\\]/g, '').trim().slice(0, 100)
    if (safe) {
      const upper = safe.toLocaleUpperCase('tr-TR')
      conds.push(`OR(SEARCH("${upper}",{${firmaAdi}}),SEARCH("${safe}",{${firmaAdi}}))`)
    }
  }
  return conds.length === 1 ? conds[0] : conds.length > 1 ? `AND(${conds.join(',')})` : 'TRUE()'
}
