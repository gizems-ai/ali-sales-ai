import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Search, Bell } from 'lucide-react'
import '../../broker.css'
import { brokerErisimVar } from '@/lib/yetki'
import { getAktifBroker } from '@/lib/broker/fixtures'
import { visibleHighlights, activeCommissions } from '@/lib/broker/fixtures'
import { BrokerSidebar } from './_components/broker-sidebar'
import { BrokerMobileNav } from './_components/broker-mobile-nav'

export const metadata: Metadata = {
  title: 'Babacan Partner · Broker OS',
}

export default async function BrokerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Grup-seviyesi erişim izolasyonu: broker VEYA emlak_demo kurumsal admin.
  // Broker'ın kurumsala girmesi ayrıca middleware'de (proxy.ts) engellenir.
  if (!(await brokerErisimVar())) redirect('/login')

  const broker = getAktifBroker()
  const stokCount = visibleHighlights(broker.tier).length
  const komisyonCount = activeCommissions(broker.id).length

  return (
    <div className="broker-os">
      <div className="app">
        <BrokerSidebar
          broker={broker}
          stokCount={stokCount}
          komisyonCount={komisyonCount}
        />
        <main className="main">
          <div className="topbar">
            <div className="search">
              <Search className="ic" />
              Stok, proje veya kampanya ara…
            </div>
            <div className="sp" />
            <span className="draft">◈ Taslak v0.3 · Veriler temsilidir</span>
            <div className="bell">
              <Bell className="ic" />
            </div>
          </div>
          {children}
        </main>
      </div>
      <BrokerMobileNav />
    </div>
  )
}
