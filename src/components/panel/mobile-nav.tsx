'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Calendar, MessageSquare, BarChart3 } from 'lucide-react'
import { useT } from '@/lib/i18n/context'

const tabs = [
  { href: '/', labelKey: 'mnav.home', icon: LayoutDashboard },
  { href: '/musteriler', labelKey: 'mnav.musteriler', icon: Users },
  { href: '/ajanda', labelKey: 'mnav.ajanda', icon: Calendar },
  { href: '/ali-sohbet', labelKey: 'mnav.ali', icon: MessageSquare },
  { href: '/raporlar', labelKey: 'mnav.raporlar', icon: BarChart3 },
]

export function MobileNav() {
  const pathname = usePathname()
  const t = useT()
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 flex">
      {tabs.map(({ href, labelKey, icon: Icon }) => {
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
              {t(labelKey)}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
