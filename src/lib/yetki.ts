import { currentUser } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import { tenantFromHost, TENANTS, type TenantConfig } from './tenants'
import { tenantIdForRequest } from './tenant-guard'

// PROD_HOST_MAP + tenant çözümleme güvenlik kuralı tenant-guard.ts'e taşındı
// (saf, birim-test edilebilir). Buradaki her iki fonksiyon da tenantIdForRequest kullanır.

// ─── Tipler ──────────────────────────────────────────────────────────────────

export type Rol =
  | 'admin'
  | 'yönetici'
  | 'satış_temsilcisi'
  | 'operasyon_temsilcisi'

export type Ekran =
  | 'dashboard' | 'ajanda' | 'firsatlar' | 'satis_sureci'
  | 'musteriler' | 'raporlar' | 'teklifler' | 'policeler'
  | 'yenilemeler' | 'komisyonlar' | 'takvim' | 'gorevler' | 'ali_asistan'

export type Aksiyon = 'görüntüle' | 'düzenle' | 'sil'

export interface EkranYetkisi {
  görüntüle: boolean
  düzenle: boolean
  sil: boolean
}

export type RolSatiri = Record<Ekran, EkranYetkisi>

export type IzolasyonSiniri =
  | { tip: 'tümü' }
  | { tip: 'temsilci'; ad: string }
  | { tip: 'ortak_havuz' }

export interface KisiBazliOverride {
  ekran: Ekran
  aksiyon: Aksiyon
  izin: boolean
}

export interface KullanicıProfili {
  userId: string
  rol: Rol
  temsilciAdi?: string
  overrides?: KisiBazliOverride[]
}

// ─── Yetki Matrisi ────────────────────────────────────────────────────────────

const EKRANLAR: Ekran[] = [
  'dashboard', 'ajanda', 'firsatlar', 'satis_sureci',
  'musteriler', 'raporlar', 'teklifler', 'policeler',
  'yenilemeler', 'komisyonlar', 'takvim', 'gorevler', 'ali_asistan',
]

function y(g: boolean, d: boolean, s: boolean): EkranYetkisi {
  return { görüntüle: g, düzenle: d, sil: s }
}

function tumSatir(g: boolean, d: boolean, s: boolean): RolSatiri {
  return Object.fromEntries(EKRANLAR.map(e => [e, y(g, d, s)])) as RolSatiri
}

function satir(overrides: Partial<Record<Ekran, EkranYetkisi>>, base: EkranYetkisi): RolSatiri {
  return Object.fromEntries(EKRANLAR.map(e => [e, overrides[e] ?? base])) as RolSatiri
}

export const YETKI_MATRISI: Record<Rol, RolSatiri> = {
  admin:    tumSatir(true, true, true),
  yönetici: tumSatir(true, true, false),
  satış_temsilcisi: satir(
    { musteriler: y(true,true,false), satis_sureci: y(true,true,false),
      teklifler: y(true,true,false), takvim: y(true,true,false), gorevler: y(true,true,false) },
    y(true, false, false),
  ),
  operasyon_temsilcisi: satir(
    { policeler: y(true,true,false), yenilemeler: y(true,true,false),
      komisyonlar: y(true,true,false), takvim: y(true,true,false), gorevler: y(true,true,false) },
    y(true, false, false),
  ),
}

export function yetkiVar(profil: KullanicıProfili, ekran: Ekran, aksiyon: Aksiyon): boolean {
  const base = YETKI_MATRISI[profil.rol][ekran][aksiyon]
  if (!profil.overrides?.length) return base
  const ov = profil.overrides.find(o => o.ekran === ekran && o.aksiyon === aksiyon)
  return ov !== undefined ? ov.izin : base
}

export function izolasyonBelirle(profil: KullanicıProfili): IzolasyonSiniri {
  if (profil.rol === 'admin' || profil.rol === 'yönetici') return { tip: 'tümü' }
  if (profil.rol === 'satış_temsilcisi' && profil.temsilciAdi) return { tip: 'temsilci', ad: profil.temsilciAdi }
  if (profil.rol === 'operasyon_temsilcisi') return { tip: 'ortak_havuz' }
  return { tip: 'temsilci', ad: '' }
}

// ─── Tenant resolution ────────────────────────────────────────────────────────

/**
 * Tenant'ı yalnızca host'tan belirler.
 * Prod domainleri: PROD_HOST_MAP'te tam eşleşme aranır (substring yok, metadata override yok).
 * Preview / localhost: middleware'den gelen x-tenant-id QP/cookie header'ı.
 * Listede olmayan host → null → login redirect.
 */
export async function getTenantConfigFromRequest(): Promise<TenantConfig | null> {
  const hdrs = await headers()
  const host = hdrs.get('host') ?? ''
  const isProd = process.env.VERCEL_ENV === 'production'
  const xTenantId = hdrs.get('x-tenant-id')

  // Güvenlik chokepoint'i. Host PROD_HOST_MAP dışıysa VE prod deployment'ındaysak
  // (ham *.vercel.app dahil) → null. KRİTİK: middleware /api/* için erken return
  // ettiğinden, forge edilmiş x-tenant-id header'ını API route'larında YALNIZ burası reddeder.
  const tenantId = tenantIdForRequest(host, xTenantId, isProd)
  if (tenantId) return TENANTS[tenantId] ?? null

  // Prod-dışı localhost preview'i DEFAULT tenant'a düşür (mevcut davranış korunur).
  if (!isProd) return tenantFromHost(host, xTenantId)
  return null
}

// ─── Clerk'ten profil ─────────────────────────────────────────────────────────

export async function getKullanicıProfili(): Promise<KullanicıProfili | null> {
  const user = await currentUser()
  if (!user) return null

  const meta = user.publicMetadata as Record<string, unknown>

  // Broker (Broker OS) kurumsal bir profil DEĞİLDİR. emlak_demo fallback'inin
  // broker'ı yanlışlıkla kurumsal admin yapmasını engellemek için burada eler.
  // Broker erişimi ayrıca yönetilir → getBrokerRol / brokerErisimVar.
  if (meta.rol === 'broker') return null

  if (meta.rol === 'admin') return { userId: user.id, rol: 'admin' }
  if (meta.rol === 'yönetici') return { userId: user.id, rol: 'yönetici' }
  if (meta.rol === 'satış_temsilcisi' && typeof meta.temsilci === 'string' && meta.temsilci) {
    return { userId: user.id, rol: 'satış_temsilcisi', temsilciAdi: meta.temsilci }
  }
  if (meta.rol === 'operasyon_temsilcisi' && typeof meta.temsilci === 'string' && meta.temsilci) {
    return { userId: user.id, rol: 'operasyon_temsilcisi', temsilciAdi: meta.temsilci }
  }
  // Geriye dönük uyumluluk: { temsilci: "Rüya" }
  if (typeof meta.temsilci === 'string' && meta.temsilci) {
    return { userId: user.id, rol: 'satış_temsilcisi', temsilciAdi: meta.temsilci }
  }
  // emlak_demo: metadata olmayan authenticated user → admin (demo tenant, tüm data fixture)
  // DEFENSE-IN-DEPTH: tenant sinyali aynı güvenlik kuralından geçer — prod deployment'ta
  // host PROD_HOST_MAP dışıysa (ham *.vercel.app) x-tenant-id ile emlak_demo seçilemez,
  // dolayısıyla bu admin fallback ham-URL üzerinden tetiklenemez.
  const hdrs = await headers()
  const host = hdrs.get('host') ?? ''
  const tenantId = tenantIdForRequest(host, hdrs.get('x-tenant-id'), process.env.VERCEL_ENV === 'production') ?? ''
  if (tenantId === 'emlak_demo') return { userId: user.id, rol: 'admin' }
  return null
}

// ─── Broker OS rolü (kurumsal Rol'den ayrı) ──────────────────────────────────
// Broker OS, kurumsal panelden izole yeni bir persona. Clerk publicMetadata.rol
// === 'broker' ile işaretlenir. Kurumsal YETKI_MATRISI'ne DAHİL DEĞİLDİR.

/** Aktif Clerk kullanıcısı broker mı? Değilse null. */
export async function getBrokerRol(): Promise<'broker' | null> {
  const user = await currentUser()
  if (!user) return null
  const meta = user.publicMetadata as Record<string, unknown>
  return meta.rol === 'broker' ? 'broker' : null
}

/**
 * /broker/* erişim izni. İki grup girebilir:
 *  1) broker rolü (kendi platformu)
 *  2) emlak_demo kurumsal admin/yönetici (Broker Yönetimi sekmesinden önizleme)
 * Diğer herkes → false (layout redirect eder). Broker'ın kurumsala girmesi
 * ayrıca middleware'de (proxy.ts) engellenir.
 */
export async function brokerErisimVar(): Promise<boolean> {
  if ((await getBrokerRol()) === 'broker') return true
  const profil = await getKullanicıProfili()
  return profil?.rol === 'admin' || profil?.rol === 'yönetici'
}
