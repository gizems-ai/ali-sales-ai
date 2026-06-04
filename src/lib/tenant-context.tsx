'use client'

import { createContext, useContext } from 'react'
import type { TenantConfig } from './tenants'

const TenantCtx = createContext<TenantConfig | null>(null)

export function TenantProvider({
  config,
  children,
}: {
  config: TenantConfig
  children: React.ReactNode
}) {
  return <TenantCtx.Provider value={config}>{children}</TenantCtx.Provider>
}

export function useTenant(): TenantConfig {
  const ctx = useContext(TenantCtx)
  if (!ctx) throw new Error('useTenant must be inside TenantProvider')
  return ctx
}
