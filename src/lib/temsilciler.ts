import { resolveTenant, type TenantConfig } from './tenants'

const _cfg = resolveTenant()

// Backward-compat exports — değerler artık default tenant config'inden geliyor.
// Client component'lar bu statik export'ları kullanmaya devam edebilir.
export const TEMSILCILER: readonly string[] = _cfg.temsilciler.map(t => t.ad)
export type Temsilci = string

export const TEMSILCI_RENK: Record<string, string> = Object.fromEntries(
  _cfg.temsilciler.map(t => [t.ad, t.renk])
)
export const TEMSILCI_RENK_FALLBACK = '#9CA3AF'

// Tenant-aware helpers (server code için)
export function getTenantTemsilciler(cfg: TenantConfig = resolveTenant()): readonly string[] {
  return cfg.temsilciler.map(t => t.ad)
}

export function getTenantTemsilciRenk(cfg: TenantConfig = resolveTenant()): Record<string, string> {
  return Object.fromEntries(cfg.temsilciler.map(t => [t.ad, t.renk]))
}
