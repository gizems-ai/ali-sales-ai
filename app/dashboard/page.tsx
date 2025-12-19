import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/login')

  const supabase = await createClient()
  const { data: customers } = await supabase.from('customers').select('*')

  return (
    <div className="min-h-screen bg-white p-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Hoş Geldiniz! 🚀</h1>
        <p className="text-slate-500 mb-8">Panel başarıyla yüklendi ve veritabanına bağlandı.</p>
        
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
          <p className="text-sm font-medium text-slate-600">Toplam Müşteri Kaydı</p>
          <p className="text-4xl font-bold text-blue-600 mt-1">{customers?.length || 0}</p>
        </div>
      </div>
    </div>
  )
}