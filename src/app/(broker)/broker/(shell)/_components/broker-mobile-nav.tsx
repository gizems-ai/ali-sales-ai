'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Flame, Coins, Megaphone, Star } from 'lucide-react'

const ITEMS = [
  { href: '/broker', label: 'Ana', icon: Home },
  { href: '/broker/stoklar', label: 'Stoklar', icon: Flame },
  { href: '/broker/komisyonlar', label: 'Komisyon', icon: Coins },
  { href: '/broker/kampanyalar', label: 'Kampanya', icon: Megaphone },
  { href: '/broker/club', label: 'Club', icon: Star },
]

export function BrokerMobileNav() {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/broker' ? pathname === '/broker' : pathname.startsWith(href)

  return (
    <nav className="mobnav">
      {ITEMS.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={isActive(href) ? 'on' : undefined}>
          <Icon />
          {label}
        </Link>
      ))}
    </nav>
  )
}
