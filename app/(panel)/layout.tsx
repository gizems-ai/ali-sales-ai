import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/panel/sidebar'
import { Topbar } from '@/components/panel/topbar'
import { MobileNav } from '@/components/panel/mobile-nav'
import { TenantProvider } from '@/lib/tenant-context'
import { getTenantConfigFromRequest } from '@/lib/yetki'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/login')

  const cfg = await getTenantConfigFromRequest()
  if (!cfg) redirect('/login')

  return (
    <TenantProvider config={cfg}>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 lg:pb-6">
            {children}
          </main>
        </div>
        <MobileNav />
      </div>
    </TenantProvider>
  )
}
