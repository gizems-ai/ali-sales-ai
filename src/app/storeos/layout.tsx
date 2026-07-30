// ════════════════════════════════════════════════════════════════════════════
//  Store OS dış kabuğu. Panel (emlak/sigorta) kabuğundan tamamen ayrıdır:
//  Sidebar/Topbar/TenantProvider'ın hiçbiri buraya girmez.
//  Kök layout (src/app/layout.tsx) yalnız ClerkProvider + font + globals.css
//  sağlar; onu değiştirmiyoruz.
//
//  BU KATMAN YALNIZ HOST SINIRI UYGULAR — oturum kontrolü YOK.
//  Gerekçe: /storeos/giris de bu ağacın altında ve oturumsuz erişilebilir
//  olmalı. Oturum zorunluluğu bir alt katmanda: (korumali)/layout.tsx.
// ════════════════════════════════════════════════════════════════════════════

import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { storeosHostuMu } from '@/lib/storeos/host-guard'

export const metadata: Metadata = {
  title: 'Store OS',
  description: 'Mağaza operasyon zekâsı — demo',
  robots: { index: false, follow: false },
}

export default async function StoreOsLayout({ children }: { children: React.ReactNode }) {
  // Host sınırı — yanlış domain'den servis edilirse hiç var olmasın.
  const host = (await headers()).get('host') ?? ''
  if (!storeosHostuMu(host, process.env.VERCEL_ENV === 'production')) notFound()

  return <div className="storeos-root">{children}</div>
}
