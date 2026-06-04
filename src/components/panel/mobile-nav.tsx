'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Calendar, MessageSquare, BarChart3 } from 'lucide-react'

const tabs = [
  { href: '/', label: 'Ana Sayfa', icon: LayoutDashboard },
  { href: '/musteriler', label: 'Müşteriler', icon: Users },
  { href: '/ajanda', label: 'Ajanda', icon: Calendar },
  { href: '/ali-sohbet', label: 'Ali', icon: MessageSquare },
  { href: '/raporlar', label: 'Raporlar', icon: BarChart3 },
]

export function MobileNav() {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 flex">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = isActive(href)
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5"
            style={active ? { color: 'var(--ana-mor)' } : undefined}
          >
            <Icon size={20} className={active ? '' : 'text-gray-400'} />
            <span className={`text-[10px] ${active ? 'font-semibold' : 'text-gray-400'}`}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
