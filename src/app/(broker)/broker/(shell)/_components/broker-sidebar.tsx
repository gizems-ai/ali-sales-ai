'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Flame,
  LayoutGrid,
  Coins,
  Megaphone,
  Star,
  Calendar,
} from 'lucide-react'
import { TIER_LABEL, type Broker } from '@/lib/broker/types'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  pill?: number
  pillGreen?: boolean
}

interface Props {
  broker: Broker
  stokCount: number
  komisyonCount: number
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function BrokerSidebar({ broker, stokCount, komisyonCount }: Props) {
  const pathname = usePathname()

  const mainNav: NavItem[] = [
    { href: '/broker', label: 'Ana Sayfa', icon: Home },
    { href: '/broker/stoklar', label: 'Avantajlı Stoklar', icon: Flame, pill: stokCount },
    { href: '/broker/projeler', label: 'Projeler', icon: LayoutGrid },
    { href: '/broker/komisyonlar', label: 'Komisyonlarım', icon: Coins, pill: komisyonCount, pillGreen: true },
    { href: '/broker/kampanyalar', label: 'Kampanyalar', icon: Megaphone },
  ]
  const partnerNav: NavItem[] = [
    { href: '/broker/club', label: 'Broker Club', icon: Star },
    { href: '/broker/etkinlikler', label: 'Etkinlikler', icon: Calendar },
  ]

  const isActive = (href: string) =>
    href === '/broker' ? pathname === '/broker' : pathname.startsWith(href)

  const renderLink = ({ href, label, icon: Icon, pill, pillGreen }: NavItem) => (
    <Link key={href} href={href} className={isActive(href) ? 'on' : undefined}>
      <Icon className="ic" />
      {label}
      {pill !== undefined && pill > 0 && (
        <span className={pillGreen ? 'pill g' : 'pill'}>{pill}</span>
      )}
    </Link>
  )

  return (
    <aside className="side">
      <Link href="/broker" className="logo">
        <div className="mark">B</div>
        <div>
          <b>Babacan Partner</b>
          <span>BROKER PLATFORMU</span>
        </div>
      </Link>
      <nav className="nav">
        {mainNav.map(renderLink)}
        <span className="cap">Partnerlik</span>
        {partnerNav.map(renderLink)}
      </nav>
      <div className="me">
        <div className="av">{initials(broker.name)}</div>
        <div>
          <b>{broker.name}</b>
          <span>{broker.agency}</span>
        </div>
        <span className="tier">{TIER_LABEL[broker.tier].toUpperCase()}</span>
      </div>
    </aside>
  )
}
