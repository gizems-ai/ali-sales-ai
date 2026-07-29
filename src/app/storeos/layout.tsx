// ════════════════════════════════════════════════════════════════════════════
//  Store OS kabuğu. Panel (emlak/sigorta) kabuğundan tamamen ayrıdır:
//  Sidebar/Topbar/TenantProvider'ın hiçbiri buraya girmez.
//  Kök layout (src/app/layout.tsx) yalnız ClerkProvider + font + globals.css
//  sağlar; onu değiştirmiyoruz.
// ════════════════════════════════════════════════════════════════════════════

import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { storeosHostuMu } from '@/lib/storeos/host-guard'

export const metadata: Metadata = {
  title: 'Gratis Store OS',
  description: 'Mağaza operasyon zekâsı — demo',
  robots: { index: false, follow: false },
}

export default async function StoreOsLayout({ children }: { children: React.ReactNode }) {
  // 1) Host sınırı — yanlış domain'den servis edilirse hiç var olmasın.
  const host = (await headers()).get('host') ?? ''
  if (!storeosHostuMu(host, process.env.VERCEL_ENV === 'production')) notFound()

  // 2) Oturum — /storeos/* Clerk zorunlu (madde 2).
  const { userId } = await auth()
  if (!userId) redirect('/login')

  return <div className="storeos-root">{children}</div>
}
