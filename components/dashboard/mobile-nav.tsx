'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  GitBranch, 
  Users, 
  MessageSquare, 
  Settings
} from 'lucide-react'

const mainNavigation = [
  { name: 'Ana Sayfa', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Satış Süreci', href: '/dashboard/pipeline', icon: GitBranch },
  { name: 'Müşteriler', href: '/dashboard/customers', icon: Users },
  { name: 'Mesajlar', href: '/dashboard/messages', icon: MessageSquare },
  { name: 'Ayarlar', href: '/dashboard/settings', icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 md:hidden">
      <div className="flex items-center justify-around h-16">
        {mainNavigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all',
                isActive ? 'text-[#10B981]' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.name}</span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#10B981] rounded-t-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

