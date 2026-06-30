'use client'

import { usePathname } from 'next/navigation'

// Satışçı Kütüphanesi (GELİŞİM) kendi başlığını/aramasını taşır;
// global Topbar bu sayfada gizlenir (çift arama çubuğu olmasın).
export function HideOnGelisim({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname?.startsWith('/gelisim')) return null
  return <>{children}</>
}
