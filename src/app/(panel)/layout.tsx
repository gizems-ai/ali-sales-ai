import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/panel/sidebar'
import { Topbar } from '@/components/panel/topbar'
import { HideOnGelisim } from '@/components/panel/hide-on-gelisim'
import { MobileNav } from '@/components/panel/mobile-nav'
import { TenantProvider } from '@/lib/tenant-context'
import { LanguageProvider } from '@/lib/i18n/context'
import { getLang } from '@/lib/i18n/server'
import { getTenantConfigFromRequest } from '@/lib/yetki'

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getTenantConfigFromRequest()
  const favicon = cfg?.branding.logoImage
    ? { icon: cfg.branding.logoImage }
    : { icon: '/favicon.svg' }
  return {
    title: cfg?.name ?? 'CRM Panel',
    icons: favicon,
  }
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/login')

  const cfg = await getTenantConfigFromRequest()
  if (!cfg) redirect('/login')

  const isEmlak = cfg.id === 'emlak_demo'
  const lang = await getLang()

  return (
    <TenantProvider config={cfg}>
      <LanguageProvider lang={lang}>
      <div className={isEmlak ? 'emlak-shell' : 'flex h-screen overflow-hidden bg-gray-50'}>
        <Sidebar />
        <div className={isEmlak ? 'min-w-0 flex flex-col' : 'flex flex-col flex-1 min-w-0 overflow-hidden'}>
          <HideOnGelisim><Topbar /></HideOnGelisim>
          <main className={isEmlak ? 'flex-1 overflow-y-auto' : 'flex-1 overflow-y-auto p-4 sm:p-6 pb-24 lg:pb-6'}>
            {children}
          </main>
        </div>
        {!isEmlak && <MobileNav />}
      </div>
      </LanguageProvider>
    </TenantProvider>
  )
}
