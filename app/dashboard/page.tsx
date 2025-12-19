import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const { userId } = await auth()
  
  // Eğer kullanıcı yoksa Clerk zaten korur ama biz de güvenliğe alalım
  if (!userId) {
    redirect('/login')
  }

  return (
    <div className="p-20 text-center">
      <h1 className="text-2xl font-bold text-green-600">Döngü Kırıldı! 🎉</h1>
      <p className="mt-2 text-gray-600">Dashboard şu an sabit duruyor olmalı.</p>
    </div>
  )
}