// ════════════════════════════════════════════════════════════════════════════
//  Store OS korumalı bölge — oturum zorunlu.
//  Route grubu (parantezli klasör) URL'i DEĞİŞTİRMEZ: /storeos yine /storeos.
//  Amaç yalnızca /storeos/giris'i bu guard'ın dışında tutmak.
// ════════════════════════════════════════════════════════════════════════════

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function KorumaliLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  // Panelin /login'ine DEĞİL, Store OS'in kendi giriş sayfasına.
  // (Aksi halde root layout'un signInFallbackRedirectUrl="/" değeri döngü yapar.)
  if (!userId) redirect('/storeos/giris')

  return <>{children}</>
}
