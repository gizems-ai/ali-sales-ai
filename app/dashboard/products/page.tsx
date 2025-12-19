import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Ana Sayfa</h1>
        <p className="text-gray-600 mt-1">Satış performansınızın genel görünümü</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-3xl shadow-sm p-6 border-l-4 border-blue-500">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-3">
            <span className="text-2xl">👥</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stages.yeni}</div>
          <div className="text-sm text-gray-600 mt-1">Yeni Lead</div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-6 border-l-4 border-cyan-500">
          <div className="w-12 h-12 bg-cyan-100 rounded-2xl flex items-center justify-center mb-3">
            <span className="text-2xl">💬</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stages.iletisim}</div>
          <div className="text-sm text-gray-600 mt-1">Aktif Konuşma</div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-6 border-l-4 border-orange-500">
          <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center mb-3">
            <span className="text-2xl">🎯</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{conversionRate}%</div>
          <div className="text-sm text-gray-600 mt-1">Dönüşüm</div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-6 border-l-4 border-green-500">
          <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mb-3">
            <span className="text-2xl">💰</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">₺{totalRevenue.toLocaleString('tr-TR')}</div>
          <div className="text-sm text-gray-600 mt-1">Kazanç</div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Satış Süreci</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="font-medium text-gray-700">Yeni</span>
            </div>
            <span className="text-gray-600">{stages.yeni} kişi</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="font-medium text-gray-700">İletişim</span>
            </div>
            <span className="text-gray-600">{stages.iletisim} kişi</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="font-medium text-gray-700">Teklif</span>
            </div>
            <span className="text-gray-600">{stages.teklif} kişi</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="font-medium text-gray-700">Müzakere</span>
            </div>
            <span className="text-gray-600">{stages.muzakere} kişi</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="font-medium text-gray-700">Kazanıldı</span>
            </div>
            <span className="text-gray-600">{stages.kazanildi} kişi</span>
          </div>
        </div>
      </div>
    </div>
  )
}