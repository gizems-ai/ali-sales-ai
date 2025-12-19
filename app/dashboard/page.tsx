import { auth } from '@clerk/nextjs/server' // Clerk Auth eklendi
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  // 1. Clerk ile oturum kontrolü yap
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/login')
  }

  // 2. Supabase istemcisini oluştur (Veri çekmek için hala lazım)
  const supabase = await createClient()

  // 3. Verileri çek (Clerk userId'si ile filtreleme yapabilirsin)
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })

  const stages = {
    yeni: customers?.filter(c => c.stage === 'yeni').length || 0,
    iletisim: customers?.filter(c => c.stage === 'iletisim').length || 0,
    teklif: customers?.filter(c => c.stage === 'teklif').length || 0,
    muzakere: customers?.filter(c => c.stage === 'muzakere').length || 0,
    kazanildi: customers?.filter(c => c.stage === 'kazanildi').length || 0,
  }

  const totalRevenue = customers
    ?.filter(c => c.stage === 'kazanildi')
    .reduce((sum, c) => sum + (c.estimated_value || 0), 0) || 0

  const conversionRate = customers?.length 
    ? Math.round((stages.kazanildi / customers.length) * 100) 
    : 0

  return (
    <div className="p-8">
      {/* Mevcut UI kodların aynen kalabilir */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Ana Sayfa</h1>
        <p className="text-gray-600 mt-1">Satış performansınızın genel görünümü</p>
      </div>
      {/* ... Geri kalan div yapıların ... */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
         <div className="bg-white rounded-3xl shadow-sm p-6 border-l-4 border-blue-500">
           <div className="text-3xl font-bold text-gray-900">{stages.yeni}</div>
           <div className="text-sm text-gray-600 mt-1">Yeni Lead</div>
         </div>
         {/* Diğer kartlar buraya... */}
      </div>
    </div>
  )
}