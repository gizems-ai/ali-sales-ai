'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  GitBranch, 
  Users, 
  MessageSquare, 
  Calendar, 
  Package, 
  Settings,
  LogOut
} from 'lucide-react'

const ALI = {
  accent: {
    cyan: '#06B6D4',
    blue: '#3B82F6',
    emerald: '#10B981',
    amber: '#F59E0B',
    slate: '#0F172A',
  },
  ui: {
    appBg: '#F6F7FB',
    border: 'rgba(15, 23, 42, 0.08)',
  },
}

const navigation = [
  { name: 'Ana Sayfa', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Satış Süreci', href: '/dashboard/pipeline', icon: GitBranch },
  { name: 'Müşteriler', href: '/dashboard/customers', icon: Users },
  { name: 'Mesajlar', href: '/dashboard/messages', icon: MessageSquare },
  { name: 'Ajanda', href: '/dashboard/agenda', icon: Calendar },
  { name: 'Ürünler', href: '/dashboard/products', icon: Package },
  { name: 'Ayarlar', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div 
      className="hidden md:flex fixed left-0 top-0 z-40 h-screen w-64 bg-white flex-col"
      style={{ borderRight: `1px solid ${ALI.ui.border}` }}
    >
      {/* Logo */}
      <div 
        className="flex items-center gap-3 px-6 py-6"
        style={{ borderBottom: `1px solid ${ALI.ui.border}` }}
      >
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ 
            background: `linear-gradient(135deg, ${ALI.accent.cyan} 0%, ${ALI.accent.blue} 100%)` 
          }}
        >
          <span className="text-white font-bold text-lg">A</span>
        </div>
        <span className="font-semibold text-xl" style={{ color: ALI.accent.slate }}>
          ALI Sales AI
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all mb-1',
                isActive ? 'bg-emerald-50' : 'hover:bg-gray-50'
              )}
              style={{ 
                color: isActive ? ALI.accent.emerald : '#64748b'
              }}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Profile & Logout */}
      <div 
        className="px-4 py-4"
        style={{ borderTop: `1px solid ${ALI.ui.border}` }}
      >
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-3 hover:bg-gray-50"
            style={{ color: '#64748b' }}
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: ALI.accent.slate }}
            >
              <span className="text-white text-sm font-medium">N</span>
            </div>
            <span className="font-medium">Çıkış Yap</span>
          </Button>
        </form>
      </div>
    </div>
  )
}

