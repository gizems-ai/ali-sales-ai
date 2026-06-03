import { currentUser } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import { tenantFromHost, resolveTenant, TENANTS, type TenantConfig } from './tenants'

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
  tenantId?: string        // Clerk publicMetadata.tenant — set edilmişse host'u override eder
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
 * Host + preview override ile tenant config döner.
 * Üretim domainlerinde (sigorta.*, crm.*) override YOKSAYILIR.
 * *.vercel.app / localhost'ta middleware'den gelen x-tenant-id kabul edilir.
 * Eşleşme yoksa → null.
 */
export async function getTenantConfigFromRequest(): Promise<TenantConfig | null> {
  const hdrs = await headers()
  const host = hdrs.get('host') ?? ''

  // Üretim domainleri: host'tan belirle, override YOKSAY
  if (host.includes('sigorta')) return TENANTS['sigortan_biz']
  if (host.includes('crm'))     return TENANTS['ali_genel']

  // Preview / localhost: middleware'in x-tenant-id'yi cookie/QP'den aktardığı header'ı oku
  const xTenantId = hdrs.get('x-tenant-id')

  // Clerk meta.tenant override (kullanıcı bazlı yapılandırma)
  const profil = await getKullanicıProfili()
  if (profil?.tenantId && TENANTS[profil.tenantId]) return TENANTS[profil.tenantId]

  return tenantFromHost(host, xTenantId)
}

/** Senkron: var olan profil nesnesinden tenant config döner. */
export function getTenantConfig(profil: KullanicıProfili | null | undefined): TenantConfig {
  return resolveTenant(profil?.tenantId)
}

// ─── Clerk'ten profil ─────────────────────────────────────────────────────────

export async function getKullanicıProfili(): Promise<KullanicıProfili | null> {
  const user = await currentUser()
  if (!user) return null

  const meta = user.publicMetadata as Record<string, unknown>
  // tenantId: Clerk'te açıkça set edilmişse override olarak kullan; yoksa host belirler
  const tenantId = typeof meta.tenant === 'string' && meta.tenant ? meta.tenant : undefined

  if (meta.rol === 'admin') return { userId: user.id, rol: 'admin', tenantId }
  if (meta.rol === 'yönetici') return { userId: user.id, rol: 'yönetici', tenantId }
  if (meta.rol === 'satış_temsilcisi' && typeof meta.temsilci === 'string' && meta.temsilci) {
    return { userId: user.id, rol: 'satış_temsilcisi', tenantId, temsilciAdi: meta.temsilci }
  }
  if (meta.rol === 'operasyon_temsilcisi' && typeof meta.temsilci === 'string' && meta.temsilci) {
    return { userId: user.id, rol: 'operasyon_temsilcisi', tenantId, temsilciAdi: meta.temsilci }
  }
  // Geriye dönük uyumluluk: { temsilci: "Rüya" }
  if (typeof meta.temsilci === 'string' && meta.temsilci) {
    return { userId: user.id, rol: 'satış_temsilcisi', tenantId, temsilciAdi: meta.temsilci }
  }
  return null
}
